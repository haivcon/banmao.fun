import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAG_CORPUS_FILES = [
  "docs/ai/README.md",
  "docs/ai/PRIVACY.md",
  "docs/ai/THREAT_MODEL.md",
  "docs/ai/RAG_SOURCES.md",
  "docs/ai/OPERATIONS.md",
  "docs/ai/ROLLOUT.md",
  "docs/ai/BANMAO_PERSONA.md",
  "docs/ai/DOMAIN_KNOWLEDGE.md",
  "README.md",
  "contracts/README.md",
  "app/gamefi/banmaoslots/PROJECT_DOCUMENTATION.md",
];
const missingRagCorpusFiles = RAG_CORPUS_FILES.filter((file) => !existsSync(path.join(__dirname, file)));

console.info(`[rag-corpus] build check: ${RAG_CORPUS_FILES.length - missingRagCorpusFiles.length}/${RAG_CORPUS_FILES.length} source files found`);
if (missingRagCorpusFiles.length > 0) console.warn("[rag-corpus] missing source files:", missingRagCorpusFiles);

const EMPTY_MODULE = "@/lib/emptyModule.ts";

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
  "thread-stream": "@/lib/threadStreamStub.ts",
  pino: "pino/browser",
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Route keys match public URLs, not App Router filesystem paths.
  outputFileTracingIncludes: {
    "/api/ai/chat": RAG_CORPUS_FILES,
  },
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
    root: __dirname,
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
