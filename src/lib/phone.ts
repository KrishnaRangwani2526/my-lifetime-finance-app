/**
 * The app signs in with a mobile number. Auth itself always needs an email, so we
 * derive a deterministic, internal-only address from the normalised number.
 * This keeps the service completely free (no SMS/OTP costs).
 */
export const PHONE_EMAIL_DOMAIN = "myledger.app";

/** Keep digits only and drop a leading country code / zero. */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidPhone(input: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(input));
}

export function phoneToEmail(input: string): string {
  return `${normalizePhone(input)}@${PHONE_EMAIL_DOMAIN}`;
}

/** Turn an internal auth email back into the number the user typed. */
export function emailToPhone(email?: string | null): string {
  if (!email) return "";
  return email.endsWith(`@${PHONE_EMAIL_DOMAIN}`) ? email.split("@")[0]! : email;
}
