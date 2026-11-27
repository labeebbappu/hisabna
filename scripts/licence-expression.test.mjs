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

test("nested expressions honour parentheses", () => {
  assert.equal(isAllowed("(MIT OR GPL-3.0-only) AND GPL-2.0-only"), false);
  assert.equal(isAllowed("GPL-3.0-only AND (MIT OR ISC)"), false);
  assert.equal(isAllowed("MIT AND (ISC OR GPL-3.0-only)"), true);
  assert.equal(isAllowed("(MIT AND GPL-3.0-only) OR ISC"), true);
  assert.equal(isAllowed("((MIT))"), true);
});

test("malformed expressions fail closed", () => {
  for (const e of ["(MIT", "MIT)", "MIT OR", "OR MIT", "", "   ", "MIT ISC", "()", "MIT AND AND ISC"]) {
    assert.equal(isAllowed(e), false, e);
  }
});

import { assertScanObject, flattenScan, splitScans } from "./licence-scan.mjs";

const scan = (o) => Object.fromEntries(Object.entries(o).map(([l, v]) => [l, v.map(([name, ...versions]) => ({ name, versions }))]));

test("scan guard: non-object output is rejected", () => {
  for (const bad of [null, [], "x", 5, undefined]) assert.throws(() => assertScanObject(bad));
});
test("scan guard: entry without versions array is rejected", () => {
  assert.throws(() => flattenScan({ MIT: [{ name: "a" }] }));
});
test("scan guard: empty combined scan fails", () => {
  assert.throws(() => splitScans({}, {}), /no packages at all/);
});
test("scan guard: empty prod with a non-empty dev scan is allowed", () => {
  const { prod, dev } = splitScans({}, scan({ MIT: [["vitest", "1.0.0"]] }));
  assert.equal(prod.length, 0);
  assert.deepEqual(dev, [{ id: "vitest@1.0.0", licence: "MIT" }]);
});
test("scan guard: packages in prod are not counted as dev-only", () => {
  const prodScan = scan({ MIT: [["a", "1.0.0"]] });
  const { prod, dev } = splitScans(prodScan, scan({ MIT: [["a", "1.0.0"], ["b", "2.0.0"]] }));
  assert.equal(prod.length, 1);
  assert.deepEqual(dev.map((d) => d.id), ["b@2.0.0"]);
});
