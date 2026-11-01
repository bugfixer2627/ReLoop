/** @param {string | undefined} value */
function baseUrl(value) {
  try {
    const url = new URL(value || "https://api.openai.com/v1");
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) return null;
    return url.href.replace(/\/$/, "");
  } catch { return null; }
}
/** @param {Record<string, string | undefined>} env */
export function generationConfig(env) {
  const url = baseUrl(env.LLM_BASE_URL);
  if (!url || (env.LLM_PROVIDER && env.LLM_PROVIDER !== "openai_compatible")) return null;
  const official = new URL(url).origin === "https://api.openai.com";
  // Never send a fallback OpenAI key to an unrelated compatible provider.
  const apiKey = env.LLM_API_KEY || (official ? env.OPENAI_API_KEY : undefined);
  const model = env.LLM_MODEL || (official ? "gpt-4o-mini" : undefined);
  return apiKey && model ? { apiKey, model, baseUrl: url } : null;
}
/** @param {Record<string, string | undefined>} env */
export function transcriptionConfig(env) {
  const url = baseUrl(env.TRANSCRIPTION_BASE_URL || env.LLM_BASE_URL);
  const provider = env.TRANSCRIPTION_PROVIDER || env.LLM_PROVIDER || "openai_compatible";
  if (!url || provider !== "openai_compatible") return null;
  const generationUrl = baseUrl(env.LLM_BASE_URL);
  const sameProvider = generationUrl && new URL(url).origin === new URL(generationUrl).origin;
  const official = new URL(url).origin === "https://api.openai.com";
  const apiKey = env.TRANSCRIPTION_API_KEY || (sameProvider ? env.LLM_API_KEY : undefined) || (official ? env.OPENAI_API_KEY : undefined);
  const model = env.TRANSCRIPTION_MODEL || (official ? "whisper-1" : undefined);
  return apiKey && model ? { apiKey, model, baseUrl: url } : null;
}
