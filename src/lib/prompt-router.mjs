export const ROUTES = {
  fast: { modelEnv: "PROMPT_ROUTER_FAST_MODEL", effortEnv: "PROMPT_ROUTER_FAST_EFFORT" },
  standard: { modelEnv: "PROMPT_ROUTER_STANDARD_MODEL", effortEnv: "PROMPT_ROUTER_STANDARD_EFFORT" },
  strong: { modelEnv: "PROMPT_ROUTER_STRONG_MODEL", effortEnv: "PROMPT_ROUTER_STRONG_EFFORT" },
};

/** @typedef {Record<string, string | undefined>} RouterEnvironment */

const riskTerms = /\b(legal|law|medical|safety|security|compliance|financial|production|migration|incident)\b/i;
const complexTerms = /\b(architecture|refactor|root cause|race condition|threat model|cross-file|multi-step|benchmark|optimize)\b/i;

export function classifyPrompt(prompt) {
  const text = prompt.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (riskTerms.test(text) || complexTerms.test(text) || wordCount > 180) return "strong";
  if (wordCount > 45 || /```|\b(test|debug|implement|analyze|compare)\b/i.test(text)) return "standard";
  return "fast";
}

/** @param {string} prompt @param {RouterEnvironment} [env] */
export function routeFor(prompt, env = process.env) {
  const tier = classifyPrompt(prompt);
  const model = env[ROUTES[tier].modelEnv];
  if (!model) throw new Error(`Set ${ROUTES[tier].modelEnv} to a model ID enabled for your API account.`);
  return { tier, model, effort: env[ROUTES[tier].effortEnv] || undefined };
}

const effortRank = ["low", "medium", "high"];

/** @param {{ tier: string, model: string, effort: string | undefined }} initial @param {RouterEnvironment} [env] */
export function escalationRoutes(initial, env = process.env) {
  const routes = [{ ...initial, reason: "initial route" }];
  const currentEffort = effortRank.indexOf(initial.effort || "");
  if (currentEffort >= 0 && currentEffort < effortRank.length - 1) {
    routes.push({ ...initial, effort: effortRank[currentEffort + 1], reason: "increase reasoning effort" });
  }
  const strongModel = env[ROUTES.strong.modelEnv];
  if (!strongModel) throw new Error(`Set ${ROUTES.strong.modelEnv} to a model ID enabled for your API account.`);
  if (initial.model !== strongModel) {
    routes.push({ tier: "strong", model: strongModel, effort: env[ROUTES.strong.effortEnv] || undefined, reason: "upgrade model" });
  }
  return routes;
}

export function evaluateOutput(output, expect = {}) {
  const failures = [];
  const normalized = output.toLocaleLowerCase();
  for (const phrase of expect.mustInclude || []) if (!normalized.includes(phrase.toLocaleLowerCase())) failures.push(`Missing required text: ${phrase}`);
  for (const phrase of expect.mustNotInclude || []) if (normalized.includes(phrase.toLocaleLowerCase())) failures.push(`Contains forbidden text: ${phrase}`);
  if (Number.isInteger(expect.maxWords)) {
    const count = output.trim().split(/\s+/).filter(Boolean).length;
    if (count > expect.maxWords) failures.push(`Word count ${count} exceeds maximum ${expect.maxWords}`);
  }
  if (expect.validJson) {
    try { JSON.parse(output); } catch { failures.push("Output is not valid JSON"); }
  }
  return { passed: failures.length === 0, failures };
}

export function hasEvaluationCriteria(expect) {
  return (expect.mustInclude?.length || 0) > 0
    || (expect.mustNotInclude?.length || 0) > 0
    || Number.isInteger(expect.maxWords)
    || expect.validJson === true;
}

export function makeRetryInstructions(failures) {
  if (!failures.length) return "";
  return `\n\nYour previous response failed these acceptance checks. Revise it to address each issue:\n- ${failures.join("\n- ")}`;
}
