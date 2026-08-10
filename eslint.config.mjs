import nextConfig from "eslint-config-next";

const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".agent/**",
      "1/**",
      "api_docs/**",
      "local-only/**",
      "node_modules/**",
      "public/**/*.zip",
      "data/**/*.db-*",
    ],
  },
  {
    ...nextConfig[0],
    rules: {
      ...nextConfig[0].rules,
      "react-hooks/set-state-in-effect": "off",

      /*
       * Existing violations are reported as warnings so the legacy baseline
       * remains visible without blocking unrelated CI changes. New code should
       * comply; these can return to errors as the affected files are migrated.
       */
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react/no-unescaped-entities": "warn",

      /*
       * Web3D/R3F components intentionally drive animation through refs and
       * deterministic frame loops. React Compiler's purity/ref rules flag many
       * valid three.js animation patterns as render-time violations.
       */
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
  ...nextConfig.slice(1),
];

export default config;
