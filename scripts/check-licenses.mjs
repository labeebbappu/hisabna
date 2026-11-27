import { execFileSync } from "node:child_process";
import { isAllowedIn } from "./licence-expression.mjs";

// `pnpm licenses list --json` prints { "<licence>": [{ name, versions[], ... }] }.
// -r is required: without it only the root package is scanned.
function list(extra) {
  const out = execFileSync("pnpm", ["licenses", "list", "--json", "-r", ...extra], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const parsed = JSON.parse(out);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error("Unexpected `pnpm licenses` output: not a JSON object");
    process.exit(1);
  }
  return parsed;
}

function versionsOf(p) {
  if (!Array.isArray(p.versions)) {
    console.error(`Unexpected \`pnpm licenses\` output: entry ${p.name} has no versions array`);
    process.exit(1);
  }
  return p.versions;
}

const flatten = (byLicence) =>
  Object.entries(byLicence).flatMap(([licence, pkgs]) =>
    pkgs.flatMap((p) => versionsOf(p).map((v) => ({ id: `${p.name}@${v}`, licence }))),
  );

const prod = flatten(list(["--prod"]));
if (prod.length === 0) {
  console.error("Licence scan found no production packages; refusing to pass.");
  process.exit(1);
}
const prodIds = new Set(prod.map((p) => p.id));
const dev = flatten(list([])).filter((p) => !prodIds.has(p.id));

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
