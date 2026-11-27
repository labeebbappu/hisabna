export const ALLOWED = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC",
  "0BSD", "BlueOak-1.0.0", "CC0-1.0", "Python-2.0",
]);

/**
 * True when an SPDX expression is acceptable: OR passes if any alternative
 * passes, AND needs every part to pass. OR binds looser than AND.
 */
export function isAllowed(expression, allowed = ALLOWED) {
  const cleaned = expression.replace(/[()]/g, " ").trim();
  if (!cleaned) return false;
  return cleaned
    .split(/\s+OR\s+/i)
    .some((alt) => alt.split(/\s+AND\s+/i).every((id) => allowed.has(id.trim())));
}

/** Extra licences accepted only for dev-only dependencies. */
export const DEV_ONLY_EXTRA = new Set(["MPL-2.0"]);

/** scope is "prod" or "dev"; dev-only packages may additionally use MPL-2.0. */
export function isAllowedIn(scope, expression) {
  const allowed = scope === "dev" ? new Set([...ALLOWED, ...DEV_ONLY_EXTRA]) : ALLOWED;
  return isAllowed(expression, allowed);
}
