import type { ArtifactContent } from '@/lib/contracts';

export function artifactText(content: ArtifactContent): string {
  switch (content.format) {
    case 'investigation_summary': return [content.summary, ...content.unknowns].join('\n\n');
    case 'support_reply': return [content.subject, content.body].join('\n\n');
    case 'shopify_description': return [content.title, content.description, ...content.faq].join('\n\n');
    case 'amazon_listing': return [content.title, ...content.bullets, content.description].join('\n\n');
    case 'alibaba_b2b': return [content.title, ...Object.entries(content.specifications).map(([k, v]) => `${k}: ${v}`), ...content.benefits, content.moq, content.leadTime, ...content.claimsNotes].filter(Boolean).join('\n\n');
  }
}
