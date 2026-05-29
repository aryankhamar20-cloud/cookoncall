/**
 * AdminAccountPanel — smoke test
 *
 * First test in the web repo. Establishes the Vitest + React Testing
 * Library baseline that future component specs can copy.
 *
 * What this test proves
 * ---------------------
 *   ✓ Component renders with the required props (admin identity card,
 *     change-password form, forgot-link).
 *   ✓ Submit button is disabled when any required field is empty.
 *   ✓ Client-side validation fires BEFORE the API call: mismatched
 *     confirm and too-short passwords both surface an error and DO NOT
 *     hit the network. (Mirrors the backend's ChangePasswordDto rules
 *     locked in by the backend regression spec from PR #31, so the two
 *     test layers protect the same contract from both ends.)
 *   ✓ Happy path: valid input → api.post called with the documented
 *     URL, body, and admin authHeader → success banner renders → form
 *     is cleared so an admin can immediately re-use the panel without
 *     accidentally leaking the just-changed password into the next
 *     submission.
 *   ✓ Backend error message surfaces verbatim (BadRequest /
 *     Unauthorized payload from /auth/change-password is already
 *     user-friendly; the panel shouldn't paraphrase it).
 *   ✓ Forgot-password link points to /login (the email-OTP reset
 *     flow that works for admin accounts).
 *
 * What this test deliberately does NOT cover
 * ------------------------------------------
 *   - Visual / styling assertions. Tailwind class diffs are noise.
 *   - The strength meter labels (Very weak / Weak / ...). It's a
 *     UX nicety, not load-bearing.
 *   - The eye/eye-off password visibility toggles. Same reason.
 *   - Network retry / refresh-token interception. That belongs in
 *     a test for the axios interceptor in src/lib/api.ts, not here.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminAccountPanel from "./AdminAccountPanel";
import api from "@/lib/api";

// Mock the api module. Only `default.post` is used by this component;
// everything else can be left unmocked because the import only pulls
// the default export.
vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

// Tighten the mock typing so test bodies can call mockResolvedValueOnce /
// mockRejectedValueOnce without ts-ignore.
const mockedApi = api as unknown as {
  post: ReturnType<typeof vi.fn>;
};

const ADMIN_NAME = "Aryan (Admin)";
const AUTH_HEADER = {
  headers: { Authorization: "Bearer fake-admin-jwt-for-test" },
};

function renderPanel() {
  return render(
    <AdminAccountPanel adminName={ADMIN_NAME} authHeader={AUTH_HEADER} />,
  );
}

describe("AdminAccountPanel", () => {
  beforeEach(() => {
    mockedApi.post.mockReset();
  });

  describe("rendering", () => {
    it("shows the admin identity, the change-password form, and the forgot-password link", () => {
      renderPanel();

      // Identity card
      expect(screen.getByText("Signed in as")).toBeInTheDocument();
      expect(screen.getByText(ADMIN_NAME)).toBeInTheDocument();

      // Form
      expect(
        screen.getByRole("heading", { name: /change password/i }),
      ).toBeInTheDocument();
      // The intro paragraph also contains "current password", so
      // match the bare label exactly. Same approach for the other
      // two field labels below.
      expect(screen.getByText("Current password")).toBeInTheDocument();
      expect(screen.getByText("New password")).toBeInTheDocument();
      expect(screen.getByText("Confirm new password")).toBeInTheDocument();

      // Forgot-password link goes to the email-OTP flow on /login
      const forgotLink = screen.getByRole("link", {
        name: /email-otp reset flow/i,
      });
      expect(forgotLink).toHaveAttribute("href", "/login");
    });

    it("disables the submit button while any password field is empty", () => {
      renderPanel();
      const submit = screen.getByRole("button", { name: /change password/i });
      expect(submit).toBeDisabled();
    });
  });

  describe("client-side validation (rejects before network)", () => {
    it("blocks submit when new password and confirmation don't match", async () => {
      const user = userEvent.setup();
      renderPanel();

      // RTL doesn't auto-associate label↔input here because the
      // template uses bare <label> tags rather than htmlFor. Query
      // by placeholder, which is unique per input.
      await user.type(
        screen.getByPlaceholderText(/your current password/i),
        "CurrentP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/at least 8 chars/i),
        "BrandNewP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/re-enter new password/i),
        "DifferentP@ss1",
      );

      await user.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/don'?t match/i);
      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it("blocks submit when new password is shorter than 8 chars", async () => {
      const user = userEvent.setup();
      renderPanel();

      await user.type(
        screen.getByPlaceholderText(/your current password/i),
        "CurrentP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/at least 8 chars/i),
        "Ab1", // 3 chars
      );
      await user.type(
        screen.getByPlaceholderText(/re-enter new password/i),
        "Ab1",
      );

      await user.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/at least 8 characters/i);
      expect(mockedApi.post).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("calls /auth/change-password with the admin authHeader, shows success, and clears the form", async () => {
      const user = userEvent.setup();
      mockedApi.post.mockResolvedValueOnce({
        data: { message: "Password changed successfully" },
      });

      renderPanel();

      const currentInput = screen.getByPlaceholderText(
        /your current password/i,
      );
      const newInput = screen.getByPlaceholderText(/at least 8 chars/i);
      const confirmInput = screen.getByPlaceholderText(
        /re-enter new password/i,
      );

      await user.type(currentInput, "CurrentP@ss1");
      await user.type(newInput, "BrandNewP@ss1");
      await user.type(confirmInput, "BrandNewP@ss1");

      await user.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      // Service called exactly once with the documented contract:
      // path is the relative /auth/change-password (axios baseURL
      // adds the /api/v1 prefix), body uses snake_case keys, and
      // the explicit authHeader is forwarded as the third arg
      // (NOT relying on the global cookie interceptor — admin
      // tokens live in coc_admin_token, the interceptor reads
      // coc_token).
      expect(mockedApi.post).toHaveBeenCalledTimes(1);
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/auth/change-password",
        { current_password: "CurrentP@ss1", new_password: "BrandNewP@ss1" },
        AUTH_HEADER,
      );

      // Success message rendered.
      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent(/password changed successfully/i);
      expect(status).toHaveTextContent(/sessions have been signed out/i);

      // Form cleared so a re-submit can't accidentally leak the
      // just-changed password.
      expect(currentInput).toHaveValue("");
      expect(newInput).toHaveValue("");
      expect(confirmInput).toHaveValue("");
    });
  });

  describe("backend error surfacing", () => {
    it("renders the verbatim backend message on 401 (wrong current password)", async () => {
      const user = userEvent.setup();
      mockedApi.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: "Current password is incorrect" },
        },
      });

      renderPanel();

      await user.type(
        screen.getByPlaceholderText(/your current password/i),
        "WrongP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/at least 8 chars/i),
        "BrandNewP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/re-enter new password/i),
        "BrandNewP@ss1",
      );

      await user.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/current password is incorrect/i);
      // Network was hit (this isn't a client-validation rejection).
      expect(mockedApi.post).toHaveBeenCalledTimes(1);
    });

    it("falls back to a generic message when the error has no body (e.g. network failure)", async () => {
      const user = userEvent.setup();
      mockedApi.post.mockRejectedValueOnce(new Error("Network Error"));

      renderPanel();

      await user.type(
        screen.getByPlaceholderText(/your current password/i),
        "CurrentP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/at least 8 chars/i),
        "BrandNewP@ss1",
      );
      await user.type(
        screen.getByPlaceholderText(/re-enter new password/i),
        "BrandNewP@ss1",
      );

      await user.click(
        screen.getByRole("button", { name: /change password/i }),
      );

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/could not change password/i);
    });
  });
});
