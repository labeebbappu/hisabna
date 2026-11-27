export const ALLOWED = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC",
  "0BSD", "BlueOak-1.0.0", "CC0-1.0", "Python-2.0",
]);

/**
 * True when an SPDX expression is acceptable. Grammar (fails closed):
 *   or    := and ("OR" and)*
 *   and   := atom ("AND" atom)*
 *   atom  := "(" or ")" | id ["WITH" id]
 * Any malformed input, unknown token or non-allowed id yields false.
 */
export function isAllowed(expression, allowed = ALLOWED) {
  if (typeof expression !== "string") return false;
  const tokens = expression.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const isWord = (t, w) => t !== undefined && t.toUpperCase() === w;
  const isId = (t) => t !== undefined && t !== "(" && t !== ")" && !["AND", "OR", "WITH"].includes(t.toUpperCase());

  function parseOr() {
    let ok = parseAnd();
    while (isWord(peek(), "OR")) { i++; const r = parseAnd(); ok = ok || r; }
    return ok;
  }
  function parseAnd() {
    let ok = parseAtom();
    while (isWord(peek(), "AND")) { i++; const r = parseAtom(); ok = ok && r; }
    return ok;
  }
  function parseAtom() {
    const t = peek();
    if (t === "(") {
      i++;
      const ok = parseOr();
      if (peek() !== ")") throw new Error("unbalanced");
      i++;
      return ok;
    }
    if (!isId(t)) throw new Error("unexpected token");
    i++;
    let ok = allowed.has(t);
    if (isWord(peek(), "WITH")) {
      i++;
      if (!isId(peek())) throw new Error("bad WITH");
      i++;
    }
    return ok;
  }

  try {
    const ok = parseOr();
    return i === tokens.length && ok;
  } catch {
    return false;
  }
}

/** Extra licences accepted only for dev-only dependencies. */
export const DEV_ONLY_EXTRA = new Set(["MPL-2.0"]);

/** scope is "prod" or "dev"; dev-only packages may additionally use MPL-2.0. */
export function isAllowedIn(scope, expression) {
  const allowed = scope === "dev" ? new Set([...ALLOWED, ...DEV_ONLY_EXTRA]) : ALLOWED;
  return isAllowed(expression, allowed);
}
