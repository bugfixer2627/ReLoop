import "server-only";

export function isAllowedOrigin(actual: string, expected: string) {
  try {
    const left = new URL(actual);
    const right = new URL(expected);
    if (left.origin === right.origin) return true;
    if (left.protocol !== right.protocol || left.port !== right.port) return false;
    const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (local.has(left.hostname) && local.has(right.hostname)) return true;
    if (process.env.NODE_ENV !== "development") return false;

    return (process.env.RELOOP_DEV_ORIGINS ?? "").split(",").some((entry) => {
      const value = entry.trim();
      if (!value) return false;
      try {
        return value.includes("://") ? new URL(value).origin === left.origin : value.toLowerCase() === left.hostname.toLowerCase();
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
