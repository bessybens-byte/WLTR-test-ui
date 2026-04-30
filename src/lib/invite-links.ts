/**
 * Must stay aligned with the WLTR API’s Invitation:AcceptPath mapping and this app’s route.
 */
export const INVITE_ACCEPT_PATH = "/accept-invite";

/**
 * Link invitees receive by email: `{Invitation:FrontendBaseUrl}{Invitation:AcceptPath}?token=<raw-token>`.
 * Matches the plaintext `rawToken` shown once after create (same token embedded in the URL).
 *
 * Prefer `NEXT_PUBLIC_WLTR_APP_URL` when the deployed **public** site URL differs from the browser origin
 * (otherwise emails and this preview could disagree).
 */
export function buildInvitationAcceptUrl(rawToken: string): string {
  const tokenQs = encodeURIComponent(rawToken);
  const path = INVITE_ACCEPT_PATH.startsWith("/") ? INVITE_ACCEPT_PATH : `/${INVITE_ACCEPT_PATH}`;
  const configured = typeof process.env.NEXT_PUBLIC_WLTR_APP_URL === "string"
    ? process.env.NEXT_PUBLIC_WLTR_APP_URL.trim().replace(/\/+$/, "")
    : "";

  const base =
    configured ||
    (typeof window !== "undefined"
      ? window.location.origin.replace(/\/+$/, "")
      : "");

  return `${base}${path}?token=${tokenQs}`;
}
