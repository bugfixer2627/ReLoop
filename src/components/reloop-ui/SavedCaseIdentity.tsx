import type { Case, CaseBundle } from '@/lib/contracts';

export function SavedCaseIdentity({ caseRecord, product, locale }: {
  caseRecord: Pick<Case, 'id' | 'sku' | 'productId'>;
  product: Pick<CaseBundle['product'], 'name'>;
  locale: string;
}) {
  const chinese = locale === 'zh-CN';
  return (
    <section className="saved-case-identity" aria-label={chinese ? '已保存商品关联（只读）' : 'Saved product association (read only)'}>
      <p className="saved-record-note">{chinese ? '原始案例与商品关联为只读；修改新建表单并保存会创建另一个案例。' : 'The original case and product association are read only. Editing and saving a new form creates another case.'}</p>
      <dl>
        <div><dt>SKU</dt><dd translate="no">{caseRecord.sku}</dd></div>
        <div><dt>{chinese ? '商品' : 'Product'}</dt><dd>{product.name}</dd></div>
        <div><dt>{chinese ? '商品 ID' : 'Product ID'}</dt><dd translate="no">{caseRecord.productId}</dd></div>
        <div><dt>{chinese ? '案例 ID' : 'Case ID'}</dt><dd translate="no">{caseRecord.id}</dd></div>
      </dl>
    </section>
  );
}
