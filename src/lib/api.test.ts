/**
 * api.ts — interceptor regression tests
 *
 * Locks in the two contracts that were broken before
 * `fix/admin-panel-auth-and-polish`:
 *
 *   1. The REQUEST interceptor must NEVER overwrite an explicit
 *      Authorization header that the caller already attached. Before
 *      the fix it always re-set the header from `coc_token`, which
 *      meant any admin-panel call (sourcing its bearer token from a
 *      separate `coc_admin_token` cookie) silently went out with the
 *      WRONG token and got 401'd. This is the root cause of the
 *      "every 3 seconds I get kicked out of the admin panel" bug.
 *
 *   2. The RESPONSE interceptor must NOT trigger the customer-side
 *      refresh flow when an admin-panel call returns 401 (admin login
 *      doesn't issue a refresh token, so the refresh always fails and
 *      the catch-block bounces to /login). Detect admin-panel calls by
 *      the presence of an explicit Authorization header on the failed
 *      request and let the panel handle the 401 itself.
 *
 * What this spec deliberately does NOT cover
 * ------------------------------------------
 *   - The full happy-path refresh flow for the customer side. That
 *     belongs in a wider api.test.ts spec; out of scope for this PR
 *     which is a focused bug-fix regression net.
 *   - The admin login itself / handleAdminError page-level handler.
 *     Covered indirectly: if the response interceptor tries to refresh,
 *     this spec fails before we ever get to handleAdminError.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// js-cookie is the only module the interceptor directly reads at
// request time. Keep it mocked across both code-under-test imports.
vi.mock("js-cookie", () => {
  const store: Record<string, string> = {};
  return {
    default: {
      get: vi.fn((key: string) => store[key]),
      set: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      remove: vi.fn((key: string) => {
        delete store[key];
      }),
      // Test helper — direct access to the underlying store for setup/cleanup.
      __store: store,
    },
  };
});

// Import AFTER the mock is set up so api.ts uses the mocked Cookies module.
import api, { adminApi } from "./api";
import Cookies from "js-cookie";

const cookieStore = (Cookies as unknown as { __store: Record<string, string> })
  .__store;

beforeEach(() => {
  for (const k of Object.keys(cookieStore)) delete cookieStore[k];
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("api.ts — request interceptor (Authorization header precedence)", () => {
  it("does NOT overwrite an explicit Authorization header (the admin-panel case)", async () => {
    cookieStore.coc_token = "customer-jwt-from-cookie";
    const config = {
      url: "/admin/stats",
      method: "get",
      headers: {
        Authorization: "Bearer admin-jwt-passed-explicitly",
      },
    } as any;

    // The interceptor is registered as a use() callback on the singleton
    // axios instance. Drive it directly via the public handlers list rather
    // than firing a real network request.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (api.interceptors.request as any).handlers as Array<{
      fulfilled?: (c: any) => any;
    }>;
    const fulfilled = handlers.find((h) => h?.fulfilled)?.fulfilled;
    expect(fulfilled).toBeDefined();

    const result = await fulfilled!(config);
    expect(result.headers.Authorization).toBe(
      "Bearer admin-jwt-passed-explicitly",
    );
    // The customer cookie token must NOT have been written over the explicit
    // header — that was the root-cause bug fixed by this PR.
    expect(result.headers.Authorization).not.toContain("customer-jwt");
  });

  it("attaches coc_token when no explicit Authorization header is set", async () => {
    cookieStore.coc_token = "customer-jwt-from-cookie";
    const config = {
      url: "/users/me",
      method: "get",
      headers: {},
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (api.interceptors.request as any).handlers as Array<{
      fulfilled?: (c: any) => any;
    }>;
    const fulfilled = handlers.find((h) => h?.fulfilled)?.fulfilled;
    const result = await fulfilled!(config);

    expect(result.headers.Authorization).toBe(
      "Bearer customer-jwt-from-cookie",
    );
  });

  it("leaves the request unauthenticated when neither cookie nor explicit header is present", async () => {
    const config = {
      url: "/cooks",
      method: "get",
      headers: {},
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (api.interceptors.request as any).handlers as Array<{
      fulfilled?: (c: any) => any;
    }>;
    const fulfilled = handlers.find((h) => h?.fulfilled)?.fulfilled;
    const result = await fulfilled!(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it("respects a lowercase 'authorization' header (axios sometimes normalizes)", async () => {
    cookieStore.coc_token = "customer-jwt-from-cookie";
    const config = {
      url: "/admin/stats",
      method: "get",
      headers: {
        authorization: "Bearer admin-jwt-explicit-lowercase",
      },
    } as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (api.interceptors.request as any).handlers as Array<{
      fulfilled?: (c: any) => any;
    }>;
    const fulfilled = handlers.find((h) => h?.fulfilled)?.fulfilled;
    const result = await fulfilled!(config);

    // We should NOT clobber it with coc_token. The lowercase header survives.
    expect(result.headers.authorization).toBe(
      "Bearer admin-jwt-explicit-lowercase",
    );
    // And we shouldn't have added the wrong-case duplicate either.
    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe("api.ts — response interceptor (admin 401 escape hatch)", () => {
  it("rejects without attempting refresh when a 401 comes from a request that supplied an explicit Authorization header", async () => {
    // No coc_refresh_token in the store — if the customer-side refresh
    // path ever fired, we'd see a redirect to /login below.
    const originalLocation = window.location;
    // Make window.location.href assignable in jsdom but trackable in this test.
    let redirectedTo: string | null = null;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        get href() {
          return originalLocation.href;
        },
        set href(value: string) {
          redirectedTo = value;
        },
      },
    });

    try {
      const error = {
        response: { status: 401 },
        config: {
          url: "/admin/users",
          headers: {
            // Crucially, the original request had its own Authorization
            // header — meaning it was a coc_admin_token call, NOT a
            // customer call.
            Authorization: "Bearer admin-jwt-passed-explicitly",
          },
        },
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (api.interceptors.response as any).handlers as Array<{
        rejected?: (e: any) => Promise<any>;
      }>;
      const rejected = handlers.find((h) => h?.rejected)?.rejected;
      expect(rejected).toBeDefined();

      // The interceptor should propagate the original 401 to the caller
      // (the admin page handles it via handleAdminError), NOT attempt
      // to refresh and certainly NOT do a hard redirect to /login.
      await expect(rejected!(error)).rejects.toBe(error);
      expect(redirectedTo).toBeNull();
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});

describe("adminApi — every method attaches the admin token via withAdminAuth()", () => {
  /**
   * The original "every 5–6 seconds I get redirected to /login" bug
   * lived here, not in the interceptor: every adminApi.* method called
   * the bare `api.<verb>` instance with no Authorization header. The
   * request interceptor saw no explicit header, fell back to coc_token
   * (the customer cookie, empty for an admin-only session), and the
   * call went out unauthenticated. Backend returned 401, the response
   * interceptor's customer-refresh path kicked in, and bounced to
   * /login.
   *
   * Fix: every adminApi method now wraps its config through
   * withAdminAuth(), which reads coc_admin_token and sets the
   * Authorization header. These tests intercept the underlying axios
   * call to verify the header is actually attached.
   *
   * Test approach
   * -------------
   * We spy on `api.get` / `api.post` / `api.patch` / `api.delete` and
   * assert the third (or second, for GETs) argument carries
   * `headers.Authorization === "Bearer <coc_admin_token>"`. The body
   * of the request and the URL are also asserted so a refactor that
   * changes the URL shape would also surface here.
   */

  beforeEach(() => {
    cookieStore.coc_admin_token = "admin-jwt-from-cookie";
  });

  it("getStats attaches the admin Authorization header", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: {} } as any);
    await adminApi.getStats();
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, config] = spy.mock.calls[0];
    expect(url).toBe("/admin/stats");
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
  });

  it("getUsers attaches admin Authorization AND forwards the params object", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: {} } as any);
    await adminApi.getUsers({ search: "alice", page: 2, limit: 50 });
    const [url, config] = spy.mock.calls[0];
    expect(url).toBe("/admin/users");
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
    expect(config?.params).toEqual({ search: "alice", page: 2, limit: 50 });
  });

  it("verifyCook (PATCH) attaches admin Authorization on a body+config call", async () => {
    const spy = vi.spyOn(api, "patch").mockResolvedValue({ data: {} } as any);
    await adminApi.verifyCook("cook-id-123", true, "ok");
    const [url, body, config] = spy.mock.calls[0];
    expect(url).toBe("/admin/cooks/cook-id-123/verify");
    expect(body).toEqual({ verified: true, rejection_reason: "ok" });
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
  });

  it("toggleUserActive (PATCH with no body) still attaches admin Authorization in the third arg", async () => {
    const spy = vi.spyOn(api, "patch").mockResolvedValue({ data: {} } as any);
    await adminApi.toggleUserActive("user-id-456");
    const [url, body, config] = spy.mock.calls[0];
    expect(url).toBe("/admin/users/user-id-456/toggle-active");
    expect(body).toBeUndefined();
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
  });

  it("promos.list attaches admin Authorization (the panel that triggered the bug report)", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: {} } as any);
    await adminApi.promos.list("active");
    const [url, config] = spy.mock.calls[0];
    expect(url).toBe("/promo-codes");
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
    expect(config?.params).toEqual({ status: "active" });
  });

  it("promos.remove (DELETE) attaches admin Authorization", async () => {
    const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: {} } as any);
    await adminApi.promos.remove("promo-id-789");
    const [url, config] = spy.mock.calls[0];
    expect(url).toBe("/promo-codes/promo-id-789");
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
  });

  it("sendBroadcast (POST) attaches admin Authorization in the third arg, body unchanged", async () => {
    const spy = vi.spyOn(api, "post").mockResolvedValue({ data: {} } as any);
    await adminApi.sendBroadcast({
      title: "T",
      body: "B",
      audience: "all",
    });
    const [url, body, config] = spy.mock.calls[0];
    expect(url).toBe("/admin/notifications/broadcast");
    expect(body).toEqual({ title: "T", body: "B", audience: "all" });
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
  });

  it("getAnalyticsOverview (range param) attaches BOTH admin Authorization and the range param", async () => {
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: {} } as any);
    await adminApi.getAnalyticsOverview({ range: "30d" });
    const [url, config] = spy.mock.calls[0];
    expect(url).toBe("/admin/analytics/overview");
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
    expect(config?.params).toEqual({ range: "30d" });
  });

  it("exportAnalyticsCsv keeps responseType:blob AND attaches admin Authorization", async () => {
    // Most likely place for a regression: an admin downloads a CSV, the
    // helper drops responseType:'blob' while merging configs, the file
    // downloads as a parsed JSON object instead of a binary blob.
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: new Blob() } as any);
    await adminApi.exportAnalyticsCsv("bookings", { range: "7d" });
    const [, config] = spy.mock.calls[0];
    expect(config?.headers?.Authorization).toBe("Bearer admin-jwt-from-cookie");
    expect(config?.responseType).toBe("blob");
    expect(config?.params).toEqual({ range: "7d", metric: "bookings" });
  });

  it("falls back to an empty bearer when coc_admin_token is missing (will get 401 immediately, surfaced by the page)", async () => {
    delete cookieStore.coc_admin_token;
    const spy = vi.spyOn(api, "get").mockResolvedValue({ data: {} } as any);
    await adminApi.getStats();
    const [, config] = spy.mock.calls[0];
    // We send `Bearer ` (empty token) rather than no header at all so
    // the response interceptor's "explicit Authorization → escape
    // hatch" rule still applies, and the 401 reaches handleAdminError
    // (which can then show "session expired" instead of redirecting
    // to /login).
    expect(config?.headers?.Authorization).toBe("Bearer ");
  });
});
