import type { AISurface } from "../contracts";

export type ToolDescriptor<T = unknown> = {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  contexts: readonly AISurface[];
  auth: "public" | "required";
  timeoutMs: number;
  maxBytes: number;
  parse: (value: unknown) => T;
  execute: (args: T, context?: { signal?: AbortSignal }) => Promise<unknown>;
};

export class ToolExecutionError extends Error {
  constructor(readonly code: "UNKNOWN_TOOL" | "TOOL_NOT_ALLOWED" | "INVALID_TOOL_ARGUMENTS" | "TOOL_TIMEOUT" | "TOOL_RESULT_TOO_LARGE") {
    super({
      UNKNOWN_TOOL: "Unknown tool",
      TOOL_NOT_ALLOWED: "Tool not allowed",
      INVALID_TOOL_ARGUMENTS: "Invalid tool arguments",
      TOOL_TIMEOUT: "Tool timeout",
      TOOL_RESULT_TOO_LARGE: "Tool result too large",
    }[code]);
    this.name = "ToolExecutionError";
  }
}

export function createToolRegistry(input: ToolDescriptor[]) {
  const descriptors = Object.freeze([...input]);
  const byName = new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]));
  return Object.freeze({
    descriptors,
    async execute(name: string, args: unknown, context: { surface: AISurface; authenticated: boolean; signal?: AbortSignal }) {
      const descriptor = byName.get(name);
      if (!descriptor) throw new ToolExecutionError("UNKNOWN_TOOL");
      if (!descriptor.contexts.includes(context.surface) || (descriptor.auth === "required" && !context.authenticated)) {
        throw new ToolExecutionError("TOOL_NOT_ALLOWED");
      }
      let parsed: unknown;
      try {
        parsed = descriptor.parse(args);
      } catch {
        throw new ToolExecutionError("INVALID_TOOL_ARGUMENTS");
      }
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), descriptor.timeoutMs);
      const signal = context.signal
        ? AbortSignal.any([context.signal, timeoutController.signal])
        : timeoutController.signal;
      try {
        const result = await Promise.race([
          descriptor.execute(parsed, { signal }),
          new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(new ToolExecutionError("TOOL_TIMEOUT")), { once: true })),
        ]);
        if (Buffer.byteLength(JSON.stringify(result)) > descriptor.maxBytes) {
          throw new ToolExecutionError("TOOL_RESULT_TOO_LARGE");
        }
        return result;
      } finally {
        clearTimeout(timer);
      }
    },
  });
}
