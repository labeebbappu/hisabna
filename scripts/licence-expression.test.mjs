import test from "node:test";
import assert from "node:assert/strict";
import { isAllowed, isAllowedIn } from "./licence-expression.mjs";

test("single allowed", () => assert.equal(isAllowed("MIT"), true));
test("single disallowed", () => assert.equal(isAllowed("GPL-3.0-only"), false));
test("OR with an allowed alternative passes", () => {
  assert.equal(isAllowed("(MIT OR GPL-3.0-only)"), true);
  assert.equal(isAllowed("MIT OR Apache-2.0"), true);
});
test("AND needs all allowed", () => {
  assert.equal(isAllowed("(MIT AND GPL-3.0-only)"), false);
  assert.equal(isAllowed("(MIT AND ISC)"), true);
});
test("unknown or empty fails", () => {
  assert.equal(isAllowed("Unknown"), false);
  assert.equal(isAllowed(""), false);
});

test("dev/prod split", () => {
  assert.equal(isAllowedIn("prod", "MPL-2.0"), false);
  assert.equal(isAllowedIn("dev", "MPL-2.0"), true);
  assert.equal(isAllowedIn("dev", "GPL-3.0-only"), false);
  assert.equal(isAllowedIn("dev", "(MPL-2.0 AND MIT)"), true);
  assert.equal(isAllowedIn("prod", "MIT"), true);
});
