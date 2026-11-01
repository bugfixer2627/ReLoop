/** MOCK ONLY: supplemental examples; preserved route source remains canonical. */
import type { CaseSummary, FeedbackInput } from '../contracts/data-contracts';
export const mockOnly = true as const;
export const exampleCases: CaseSummary[] = [
  { id:'RL-2408', subject:'“The material feels much thinner…”', sku:'H2O-BTL-750', platformId:'amazon-de', platformLabel:'Amazon Germany', status:'review', updatedAt:'2025-10-14T07:42:00Z' },
  { id:'RL-2407', subject:'“Not waterproof as described”', sku:'TRVL-DRY-02', platformId:'shopify-us', platformLabel:'Shopify US', status:'risk', updatedAt:'2025-10-14T04:42:00Z' },
];
export const exampleFeedback: FeedbackInput = {
  merchantInstruction:'请检查这条客诉是否与防水宣传有关，并准备美国站点的修订建议。',
  complaint:'The bottle started leaking after a week of daily use. I expected it to be completely leak-proof as shown in the product listing.',
  sku:'H2O-BTL-750', platformId:'shopify-us',
  transcript:'The customer says the bottle started leaking after a week of daily use. They expected it to be completely leak-proof as shown in the product listing.',
  evidenceIds:[],
};
// ISO timestamps/platform IDs above illustrate adapter fields; they are not
// stored timestamps or IDs returned by the current UI, which uses display labels.
