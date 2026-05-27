import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EMPTY_MODULE = path.join(__dirname, "lib", "emptyModule.ts");

const TURBO_IGNORE_ALIAS = {
  tap: EMPTY_MODULE,
  tape: EMPTY_MODULE,
  desm: EMPTY_MODULE,
  fastbench: EMPTY_MODULE,
  "pino-elasticsearch": EMPTY_MODULE,
  "why-is-node-running": EMPTY_MODULE,
  "thread-stream/test": EMPTY_MODULE,
  "thread-stream/bench": EMPTY_MODULE,
  "thread-stream/LICENSE": EMPTY_MODULE,
  "thread-stream/README.md": EMPTY_MODULE,
  "@react-native-async-storage/async-storage": EMPTY_MODULE,
};

const RESOLVE_ALIASES = {
  ...TURBO_IGNORE_ALIAS,
  "thread-stream": path.join(__dirname, "lib", "threadStreamStub.ts"),
  pino: "pino/browser",
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inject build version for cache invalidation
  env: {
    NEXT_PUBLIC_BUILD_VERSION: Date.now().toString(),
  },
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Allow Cloudinary images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dr729c6e6/**",
      },
    ],
  },
  // Turbopack (Next 16 default)
  turbopack: {
    resolveAlias: RESOLVE_ALIASES,
  },
  // Webpack fallback (in case build runs with --webpack)
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...RESOLVE_ALIASES,
    };
    // Enable async WebAssembly for @imgly/background-removal
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    };
    // Handle .onnx files as assets
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.onnx$/,
      type: 'asset/resource',
    });
    return config;
  },
};

export default nextConfig;
