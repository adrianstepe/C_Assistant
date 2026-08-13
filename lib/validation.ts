/**
 * Shared field validators.
 *
 * Used by the demo's contact card and the onboarding form. Deliberately
 * forgiving: the job is to catch obvious mistakes, not to police what a real
 * business might legitimately type.
 */

/** Pragmatic check: shape only. Deliverability is not knowable client-side. */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/** Accepts UK and international formats. Empty counts as valid — use with a
 *  separate required check when the field is mandatory. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const digits = trimmed.replace(/[^\d]/g, "");
  return /^[\d\s()+-]+$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}

export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

/** Non-empty after trimming, within a sensible length. */
export function isFilled(value: string, max = 200): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= max;
}

/**
 * Accepts a bare domain or a full URL, since owners type both.
 * Empty is valid; require it separately if the field is mandatory.
 */
export function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (trimmed.length > 200 || /\s/.test(trimmed)) return false;
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(trimmed);
}
