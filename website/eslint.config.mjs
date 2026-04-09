import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Relax strict rules for test infrastructure.
  // Test code routinely uses `any` for mock objects, has unused destructured
  // params, and uses CommonJS require() in setup files. Apply production-grade
  // strictness to src/ only.
  {
    files: [
      "qa-system/**/*.ts",
      "tests/**/*.ts",
      "tests/**/*.tsx",
      "src/__tests__/**/*.ts",
      "src/__tests__/**/*.tsx",
      "cypress/**/*.ts",
      "cypress.config.ts",
      "jest.setup.js",
      "jest.config.js",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-namespace": "off",
      "prefer-const": "off",
      // false positive: Playwright fixtures use a `use` callback parameter
      // that ESLint mistakes for the React `use` hook. The fixture file
      // qa-system/shared/fixtures.ts is test infra, not a React component.
      "react-hooks/rules-of-hooks": "off",
    },
  },

  globalIgnores([
    // Next.js build output
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Test output / artifacts (regenerated, never hand-edited)
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "cypress/screenshots/**",
    "cypress/videos/**",

    // Nested package: extensions/vscode-extension has its own tsconfig +
    // its own build output. It's not part of the website's source set
    // and lints ~120 errors of its own. Lint it from its own package
    // instead, not transitively from the website.
    "extensions/**",

    // Standalone scripts (not part of the Next.js app)
    "test-stripe-config.js",
    "test-payment-flow.js",
  ]),
]);

export default eslintConfig;
