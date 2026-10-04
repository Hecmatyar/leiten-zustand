import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "cdn-bundle/**"] },
  js.configs.recommended,
  ...tsPlugin.configs["flat/recommended"],
  prettierRecommended,
  {
    files: ["**/*.{ts,tsx,js}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
      "react-hooks": reactHooks,
    },
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "no-console": "error",
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/explicit-module-boundary-types": 0,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "all",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
];
