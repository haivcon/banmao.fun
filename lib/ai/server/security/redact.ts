export function redactSensitiveText(value: unknown, sentinels: string[] = []): string {
  const source = value instanceof Error ? value.message : String(value);
  let redacted = source.replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]");
  for (const sentinel of sentinels) {
    if (sentinel) redacted = redacted.split(sentinel).join("[REDACTED]");
  }
  return redacted.slice(0, 512);
}
