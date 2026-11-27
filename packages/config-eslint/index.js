import tseslint from "typescript-eslint";

export default [...tseslint.configs.recommended];

const bannedModules = [
  "fs", "path", "crypto", "os", "child_process", "http", "https", "net",
  "stream", "util", "buffer", "events", "url", "zlib",
  "react", "react-native", "next", "fastify", "expo",
];

/** Extra restrictions for the pure packages (money, ledger). Apply to src only. */
export const purePackageRules = {
  files: ["src/**/*.ts"],
  rules: {
    "no-restricted-globals": [
      "error",
      { name: "parseFloat", message: "Use integer minor-unit parsing, not floats." },
      { name: "parseInt", message: "Use integer minor-unit parsing (BigInt of a validated string), not parseInt." },
      { name: "Math", message: "Math is banned in pure money logic; use integer/bigint arithmetic." },
    ],
    "no-restricted-properties": [
      "error",
      { object: "Math", message: "Math.* is banned in pure money logic; use integer/bigint arithmetic." },
      { object: "Number", property: "parseFloat", message: "Float parsing is banned in pure money logic." },
      { object: "Number", property: "parseInt", message: "parseInt is banned in pure money logic; use BigInt on a validated string." },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.name='Number']",
        message: "Number(...) coercion is banned; parse explicitly.",
      },
      {
        selector: "MemberExpression[object.name='globalThis'][property.name=/^(Math|parseFloat|parseInt)$/]",
        message: "globalThis.Math / parseFloat / parseInt are banned in pure money logic.",
      },
      {
        selector: "MemberExpression[object.name='globalThis'][computed=true][property.value=/^(Math|parseFloat|parseInt)$/]",
        message: "globalThis.Math / parseFloat / parseInt are banned in pure money logic.",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: bannedModules.map((name) => ({ name, message: "Pure packages must not import runtime or framework modules." })),
        patterns: [
          { group: ["node:*"], message: "No Node-only imports in pure packages." },
          { group: ["next/*", "expo/*"], message: "No framework imports in pure packages." },
        ],
      },
    ],
  },
};
