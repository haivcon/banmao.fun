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
      "api_docs/**",
      "node_modules/**",
      "public/**/*.zip",
      "data/**/*.db-*",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",

      /*
       * Web3D/R3F components intentionally drive animation through refs and
       * deterministic frame loops. React Compiler's purity/ref rules flag many
       * valid three.js animation patterns as render-time violations. Keep the
       * standard Hooks rules active while disabling these compiler-only checks
       * so production lint can focus on actionable issues.
       */
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default config;
