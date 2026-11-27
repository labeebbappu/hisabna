import { execFileSync } from "node:child_process";
import { isAllowedIn } from "./licence-expression.mjs";
import { splitScans } from "./licence-scan.mjs";

// `pnpm licenses list --json` prints { "<licence>": [{ name, versions[], ... }] }.
// -r is required: without it only the root package is scanned.
function list(extra) {
  const out = execFileSync("pnpm", ["licenses", "list", "--json", "-r", ...extra], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(out);
}

let prod;
let dev;
try {
  ({ prod, dev } = splitScans(list(["--prod"]), list([])));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
if (prod.length === 0) {
  console.log("note: no production packages found (money and ledger have no third-party runtime dependencies).");
}

const bad = [];
for (const [scope, pkgs] of [["prod", prod], ["dev", dev]]) {
  for (const p of pkgs) {
    if (isAllowedIn(scope, p.licence)) {
      if (scope === "dev" && !isAllowedIn("prod", p.licence)) {
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
