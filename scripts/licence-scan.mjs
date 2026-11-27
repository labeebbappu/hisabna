// Pure helpers for scripts/check-licenses.mjs (no process or pnpm access, so they are testable).

/** Throws unless `parsed` is a plain JSON object as printed by `pnpm licenses list --json`. */
export function assertScanObject(parsed) {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Unexpected `pnpm licenses` output: not a JSON object");
  }
  return parsed;
}

/** { "<licence>": [{ name, versions[] }] } -> [{ id: "name@version", licence }] */
export function flattenScan(byLicence) {
  assertScanObject(byLicence);
  return Object.entries(byLicence).flatMap(([licence, pkgs]) =>
    pkgs.flatMap((p) => {
      if (!Array.isArray(p.versions)) {
        throw new Error(`Unexpected \`pnpm licenses\` output: entry ${p.name} has no versions array`);
      }
      return p.versions.map((v) => ({ id: `${p.name}@${v}`, licence }));
    }),
  );
}

/**
 * Splits the full scan into prod and dev-only lists and guards the combined scan:
 * an empty combined scan (nothing was scanned) is an error. An empty prod set is
 * allowed, because money and ledger have no third-party runtime dependencies.
 */
export function splitScans(prodByLicence, allByLicence) {
  const prod = flattenScan(prodByLicence);
  const all = flattenScan(allByLicence);
  if (prod.length + all.length === 0) {
    throw new Error("Licence scan found no packages at all; refusing to pass.");
  }
  const prodIds = new Set(prod.map((p) => p.id));
  const dev = all.filter((p) => !prodIds.has(p.id));
  return { prod, dev };
}
