import base, { purePackageRules } from "@hisabna/config-eslint";

export default [{ ignores: ["dist/**", "node_modules/**"] }, ...base, purePackageRules];
