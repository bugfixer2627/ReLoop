#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateOutput, escalationRoutes, hasEvaluationCriteria, makeRetryInstructions, routeFor } from "../src/lib/prompt-router.mjs";

function argsOf(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) throw new Error(`Unexpected argument: ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

async function requestResponse(prompt, route, priorFailures, apiKey) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: route.model,
      ...(route.effort ? { reasoning: { effort: route.effort } } : {}),
      instructions: `Answer the user's request accurately and follow its requested format.${makeRetryInstructions(priorFailures)}`,
      input: prompt,
      max_output_tokens: 3000,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI API returned HTTP ${response.status}`);
  const text = (payload.output || []).flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text").map((item) => item.text).join("\n");
  if (!text) throw new Error("The model returned no text output");
  return text;
}

async function main() {
  const args = argsOf(process.argv.slice(2));
  if (!args.file) throw new Error("Usage: npm run prompt:run -- --file evals/prompts.json");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Set OPENAI_API_KEY in your environment before running live prompts.");
  const suite = JSON.parse(await readFile(resolve(args.file), "utf8"));
  if (!Array.isArray(suite.cases) || suite.cases.length === 0) throw new Error("Eval file must contain a non-empty cases array.");

  const results = [];
  for (const testCase of suite.cases) {
    if (typeof testCase.prompt !== "string" || !testCase.prompt.trim() || !testCase.expect || !hasEvaluationCriteria(testCase.expect)) {
      throw new Error(`Each case needs a non-empty prompt and at least one explicit acceptance check (${testCase.id || "unknown id"}).`);
    }
    const initial = routeFor(testCase.prompt);
    const attempts = [];
    let priorFailures = [];
    for (const route of escalationRoutes(initial)) {
      const output = await requestResponse(testCase.prompt, route, priorFailures, apiKey);
      const evaluation = evaluateOutput(output, testCase.expect);
      attempts.push({ model: route.model, effort: route.effort, reason: route.reason, evaluation, output });
      if (evaluation.passed) break;
      priorFailures = evaluation.failures;
    }
    const finalAttempt = attempts.at(-1);
    const id = testCase.id || `case-${results.length + 1}`;
    results.push({ id, tier: initial.tier, passed: finalAttempt.evaluation.passed, attempts });
    process.stdout.write(`${finalAttempt.evaluation.passed ? "PASS" : "FAIL"} ${id} (${attempts.length} attempt${attempts.length === 1 ? "" : "s"})\n`);
    for (const attempt of attempts) process.stdout.write(`  ${attempt.model} / ${attempt.effort}: ${attempt.evaluation.passed ? "passed" : attempt.evaluation.failures.join("; ")}\n`);
    process.stdout.write(`${finalAttempt.output}\n\n`);
  }
  await mkdir("prompt-runs", { recursive: true });
  const createdAt = new Date().toISOString();
  const reportPath = resolve("prompt-runs", `${createdAt.replaceAll(":", "-")}.json`);
  await writeFile(reportPath, `${JSON.stringify({ createdAt, results }, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`Report: ${reportPath}\n`);
  if (results.some((result) => !result.passed)) process.exitCode = 1;
}

main().catch((error) => {
  const cause = error.cause?.code || error.cause?.message;
  process.stderr.write(`prompt-router: ${error.message}${cause ? ` (${cause})` : ""}\n`);
  process.exitCode = 1;
});
