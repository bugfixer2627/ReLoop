import type { Rule } from "@/lib/contracts";

export function applicableReviewRules(
  rules: Rule[], scope: { market: string; platform: Rule["platform"]; segment: string }, synthetic: boolean,
) {
  return rules.filter((rule) => rule.category !== "merchant_policy"
    && rule.market === scope.market && (rule.platform === null || rule.platform === scope.platform)
    && (rule.segment === "all" || rule.segment === scope.segment) && (synthetic || rule.status === "verified"));
}
