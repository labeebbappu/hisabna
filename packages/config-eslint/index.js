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
    ],
    "no-restricted-properties": [
      "error",
      { object: "Math", message: "Math.* is banned in pure money logic; use integer/bigint arithmetic." },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.name='Number']",
        message: "Number(...) coercion is banned; parse explicitly.",
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
