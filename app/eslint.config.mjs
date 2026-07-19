import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",

      /*
       * Web3D/R3F components intentionally drive animation through refs and
       * deterministic frame loops. React Compiler's purity/ref rules flag many
       * valid three.js animation patterns as render-time violations.
       */
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default config;