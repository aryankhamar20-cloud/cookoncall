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
import api from "./api";
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
