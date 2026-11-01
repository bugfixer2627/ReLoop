import { createCaseRequestSchema } from '@/lib/contracts';
import type { z } from 'zod';

export type CaseInput = z.infer<typeof createCaseRequestSchema>;
export type CaseInputField = 'sku' | 'feedbackText' | 'merchantInstruction';

export function caseFieldIsInvalid(input: CaseInput, field: CaseInputField, value: string) {
  const result = createCaseRequestSchema.safeParse({ ...input, [field]: value });
  return !result.success && result.error.issues.some((issue) => issue.path[0] === field);
}

export function updateInvalidFields(fields: CaseInputField[], field: CaseInputField, remainsInvalid: boolean) {
  if (remainsInvalid) return fields.includes(field) ? fields : [...fields, field];
  return fields.filter((item) => item !== field);
}
