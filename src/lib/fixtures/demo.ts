import { caseBundleSchema } from "@/lib/contracts";
import fixture from "./demo.json";

// Original synthetic inputs only; no actual model invocation or verified rule.
export const demoBundle = caseBundleSchema.parse(fixture);
export const DEMO_PRODUCT_ID = demoBundle.product.id;
export const DEMO_CASE_ID = demoBundle.case.id;
export const DEMO_TEST_CONDITIONS = demoBundle.evidence[0].testConditions;
