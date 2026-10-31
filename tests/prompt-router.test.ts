import { describe, expect, it } from "vitest";
import { classifyPrompt, escalationRoutes, evaluateOutput, hasEvaluationCriteria, routeFor } from "../src/lib/prompt-router.mjs";

describe("prompt router", () => {
  it("routes short everyday prompts to the fast model", () => {
    expect(routeFor("Rewrite this sentence clearly.", { PROMPT_ROUTER_FAST_MODEL: "fast-model" }))
      .toEqual({ tier: "fast", model: "fast-model", effort: undefined });
  });

  it("routes implementation and high-risk prompts to progressively stronger tiers", () => {
    expect(classifyPrompt("Implement a small parser." )).toBe("standard");
    expect(routeFor("Review this production database migration for safety.", { PROMPT_ROUTER_STRONG_MODEL: "strong-model" }).tier).toBe("strong");
  });

  it("requires explicitly configured, account-enabled models", () => {
    expect(() => routeFor("Hi", {})).toThrow("PROMPT_ROUTER_FAST_MODEL");
  });

  it("honors model overrides and escalates effort before upgrading the model", () => {
    const initial = routeFor("What is 2 + 2?", { PROMPT_ROUTER_FAST_MODEL: "fast-custom", PROMPT_ROUTER_STRONG_MODEL: "strong-custom", PROMPT_ROUTER_FAST_EFFORT: "low", PROMPT_ROUTER_STRONG_EFFORT: "high" });
    expect(initial.model).toBe("fast-custom");
    expect(escalationRoutes(initial, { PROMPT_ROUTER_STRONG_MODEL: "strong-custom", PROMPT_ROUTER_STRONG_EFFORT: "high" }).map(({ model, effort }) => [model, effort]))
      .toEqual([["fast-custom", "low"], ["fast-custom", "medium"], ["strong-custom", "high"]]);
  });

  it("checks required/forbidden text, word limits, and JSON deterministically", () => {
    expect(evaluateOutput('{"ok":true,"note":"4 hours"}', {
      mustInclude: ["4 hours"], mustNotInclude: ["refund approved"], maxWords: 10, validJson: true,
    }).passed).toBe(true);
    expect(evaluateOutput("Refund approved", { mustNotInclude: ["refund approved"], validJson: true }).failures)
      .toEqual(["Contains forbidden text: refund approved", "Output is not valid JSON"]);
    expect(hasEvaluationCriteria({})).toBe(false);
    expect(hasEvaluationCriteria({ mustInclude: ["source"] })).toBe(true);
  });
});
