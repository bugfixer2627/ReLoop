type UiLocale = 'en-US' | 'zh-CN';

export function reviewStatusLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN'
    ? { draft: '草稿', pending_review: '等待审核', approved: '已批准', changes_requested: '要求修改', rejected: '已拒绝', blocked: '已阻止' }
    : { draft: 'Draft', pending_review: 'Pending review', approved: 'Approved', changes_requested: 'Changes requested', rejected: 'Rejected', blocked: 'Blocked' };
  return labels[value as keyof typeof labels] ?? value;
}

export function validationStatusLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN'
    ? { pending: '待核验', checked: '已核验', needs_evidence: '需要证据', needs_rule_verification: '需要核实规则', blocked: '已阻止' }
    : { pending: 'Pending', checked: 'Checked', needs_evidence: 'Needs evidence', needs_rule_verification: 'Needs rule verification', blocked: 'Blocked' };
  return labels[value as keyof typeof labels] ?? value;
}

export function languageStatusLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN' ? { ready: '已就绪', beta: '测试版', unavailable: '不可用' } : { ready: 'Ready', beta: 'Beta', unavailable: 'Unavailable' };
  return labels[value as keyof typeof labels] ?? value;
}

export function severityLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN' ? { info: '提示', warning: '警告', blocker: '阻断' } : { info: 'Info', warning: 'Warning', blocker: 'Blocker' };
  return labels[value as keyof typeof labels] ?? value;
}

export function findingCategoryLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN' ? { evidence: '证据核对', market_law: '目标市场法规', platform_rule: '平台规则' } : { evidence: 'Evidence check', market_law: 'Market law', platform_rule: 'Platform rule' };
  return labels[value as keyof typeof labels] ?? value;
}

export function artifactKindLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN' ? { investigation_summary: '核验摘要', support_reply: '客服回复', listing_correction: '商品修订' } : { investigation_summary: 'Investigation summary', support_reply: 'Support reply', listing_correction: 'Listing correction' };
  return labels[value as keyof typeof labels] ?? value;
}

export function roleLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN' ? { support: '客服', marketing: '营销', qa: '质量', compliance: '合规' } : { support: 'Support', marketing: 'Marketing', qa: 'QA', compliance: 'Compliance' };
  return labels[value as keyof typeof labels] ?? value;
}

export function taskStateLabel(value: string, locale: UiLocale) {
  const labels = locale === 'zh-CN' ? { open: '开放', done: '已完成' } : { open: 'Open', done: 'Done' };
  return labels[value as keyof typeof labels] ?? value;
}

export function ruleStatusLabel(value: string, locale: UiLocale) {
  return value === 'verified' ? (locale === 'zh-CN' ? '已核验' : 'Verified') : (locale === 'zh-CN' ? '需核验' : 'Needs verification');
}
