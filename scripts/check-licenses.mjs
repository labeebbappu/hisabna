import { execFileSync } from "node:child_process";
import { isAllowedIn } from "./licence-expression.mjs";

// `pnpm licenses list --json` prints { "<licence>": [{ name, versions[], ... }] }.
// -r is required: without it only the root package is scanned.
function list(extra) {
  const out = execFileSync("pnpm", ["licenses", "list", "--json", "-r", ...extra], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(out);
}

const flatten = (byLicence) =>
  Object.entries(byLicence).flatMap(([licence, pkgs]) =>
    pkgs.flatMap((p) => (p.versions ?? ["?"]).map((v) => ({ id: `${p.name}@${v}`, licence }))),
  );

const prod = flatten(list(["--prod"]));
const prodIds = new Set(prod.map((p) => p.id));
const dev = flatten(list([])).filter((p) => !prodIds.has(p.id));

const bad = [];
for (const [scope, pkgs] of [["prod", prod], ["dev", dev]]) {
  for (const p of pkgs) {
    if (isAllowedIn(scope, p.licence)) {
      if (scope === "dev" && p.licence.includes("MPL-2.0")) {
        console.log(`note: accepted dev-only MPL-2.0 exception: ${p.id}`);
      }
    } else {
      bad.push(`[${scope}] ${p.id}  ${p.licence}`);
    }
  }
}

if (bad.length > 0) {
  console.error("Disallowed licences found:\n" + bad.join("\n"));
  process.exit(1);
}
console.log(`Licence check passed (${prod.length} prod, ${dev.length} dev-only packages).`);
