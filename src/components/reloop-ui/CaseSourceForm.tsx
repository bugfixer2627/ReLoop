'use client';

import { useState, type FormEvent } from 'react';
import { addCaseSource } from '@/lib/frontend/api-client';
import { localeSchema, platformSchema, type CaseBundle, type Platform } from '@/lib/contracts';
import { platformLabel } from '@/lib/config/platforms';
import { useWorkspace } from './WorkspaceProviders';

type SourceKind = 'specification' | 'support_policy' | 'listing' | 'rule';

export function CaseSourceForm({ bundle, onSaved }: { bundle: CaseBundle; onSaved: () => void }) {
  const { locale, accessToken } = useWorkspace();
  const zh = locale === 'zh-CN';
  const [kind, setKind] = useState<SourceKind>(bundle.case.synthetic ? 'rule' : 'specification');
  const [platform, setPlatform] = useState<Platform>(bundle.case.channel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '').trim();
    setError(''); setNotice(''); setBusy(true);
    try {
      if (kind === 'rule') {
        await addCaseSource(accessToken, bundle.case.id, {
          kind, platform, category: value('category') === 'market_law' ? 'market_law' : 'platform_rule',
          sourceUrl: value('sourceUrl'), excerpt: value('content'), applicability: value('applicability'), checkedDate: value('checkedDate'),
        });
      } else {
        const claim = value('runtime');
        const conditions = { brightness: value('brightness'), startingCharge: value('startingCharge'),
          ambientTemperature: value('ambientTemperature'), protocol: value('protocol') };
        if (claim && Object.values(conditions).some((condition) => !condition)) {
          setError(zh ? '填写续航时，请补齐所有测试条件。' : 'Enter all four test conditions with a runtime claim.');
          return;
        }
        const numericClaim = claim ? {
          metric: 'battery_runtime' as const, unit: 'hours' as const, value: Number(claim),
          qualifier: kind === 'listing' ? 'up_to' as const : 'maximum' as const, conditions,
        } : null;
        const source = { content: value('content'), sourceVersion: value('sourceVersion'), numericClaim };
        if (kind === 'listing') {
          await addCaseSource(accessToken, bundle.case.id, { kind, platform, ...source, title: value('title'), locale: localeSchema.parse(value('locale')) });
        } else {
          await addCaseSource(accessToken, bundle.case.id, { kind, ...source, provenance: value('provenance') });
        }
      }
      form.reset();
      setNotice(zh ? '来源已保存。' : 'Source saved.');
      onSaved();
    } catch (reason) { setError(reason instanceof Error && reason.name === 'ApiRequestError' ? reason.message : (zh ? '请核对来源资料。' : 'Check the source details and try again.')); }
    finally { setBusy(false); }
  }

  return <details className="card card-pad workflow-form">
    <summary>{zh ? '添加来源' : 'Add a source'}</summary>
    <form className="workflow-fields" onSubmit={save}>
      <label>{zh ? '来源类型' : 'Source type'}<select className="select" name="kind" value={kind} disabled={busy} onChange={(event) => { setKind(event.target.value as SourceKind); setError(''); setNotice(''); }}>
        {!bundle.case.synthetic && <>
          <option value="specification">{zh ? '商品规格' : 'Product specification'}</option>
          <option value="support_policy">{zh ? '客服政策' : 'Support policy'}</option>
          <option value="listing">{zh ? '商品快照' : 'Listing snapshot'}</option>
        </>}
        <option value="rule">{zh ? '已核实的规则' : 'Checked rule'}</option>
      </select></label>
      <fieldset className="workflow-fields" key={kind} disabled={busy}>
        {(kind === 'listing' || kind === 'rule') && <label>{zh ? '适用平台' : 'Marketplace'}<select className="select" name="platform" value={platform} onChange={(event) => setPlatform(platformSchema.parse(event.target.value))}>
          {platformSchema.options.map((id) => <option key={id} value={id}>{platformLabel(id, locale)}</option>)}
        </select></label>}
        {kind === 'rule' ? <>
          <label>{zh ? '规则类别' : 'Rule category'}<select className="select" name="category">
            <option value="market_law">{zh ? '市场法规' : 'Market law'}</option>
            <option value="platform_rule">{zh ? '平台规则' : 'Platform rule'}</option>
          </select></label>
          <label>{zh ? '官方来源链接' : 'Official source URL'}<input className="input" type="url" name="sourceUrl" required maxLength={2048} autoComplete="off"/></label>
          <label>{zh ? '核实日期' : 'Date checked'}<input className="input" type="date" name="checkedDate" required max={new Date().toISOString().slice(0, 10)}/></label>
          <label>{zh ? '适用范围及理由' : 'Where the rule applies'}<textarea className="textarea" name="applicability" rows={2} required maxLength={2000}/></label>
        </> : <>
          <label>{zh ? '来源版本' : 'Source version'}<input className="input" name="sourceVersion" required maxLength={100} autoComplete="off"/></label>
          {kind === 'listing' ? <>
            <label>{zh ? '快照标题' : 'Listing title'}<input className="input" name="title" required maxLength={500} autoComplete="off"/></label>
            <label>{zh ? '原文语言' : 'Snapshot language'}<select className="select" name="locale" defaultValue={platform === 'amazon_de' ? 'de-DE' : 'en-US'}>
              <option value="en-US">English</option><option value="de-DE">Deutsch</option><option value="zh-CN">简体中文</option><option value="ar-AE">العربية</option>
            </select></label>
          </> : <label>{zh ? '出处或文件编号' : 'Provenance or document reference'}<input className="input" name="provenance" required maxLength={500} autoComplete="off"/></label>}
        </>}
        <label>{kind === 'rule' ? (zh ? '相关原文摘录' : 'Relevant source excerpt') : (zh ? '来源内容' : 'Source text')}<textarea className="textarea" name="content" rows={4} required maxLength={10000}/></label>
        {(kind === 'specification' || kind === 'listing') && <details>
          <summary>{zh ? '记录续航测试条件（可选）' : 'Add battery runtime and test conditions (optional)'}</summary>
          <div className="workflow-fields">
            <label>{zh ? '续航小时数' : 'Runtime in hours'}<input className="input" name="runtime" type="number" min="0" step="any"/></label>
            <label>{zh ? '亮度' : 'Brightness'}<input className="input" name="brightness" maxLength={150}/></label>
            <label>{zh ? '起始电量' : 'Starting charge'}<input className="input" name="startingCharge" maxLength={150}/></label>
            <label>{zh ? '环境温度' : 'Ambient temperature'}<input className="input" name="ambientTemperature" maxLength={150}/></label>
            <label>{zh ? '测试方法' : 'Test protocol'}<input className="input" name="protocol" maxLength={150}/></label>
          </div>
        </details>}
      </fieldset>
      <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? (zh ? '正在保存…' : 'Saving…') : (zh ? '保存来源' : 'Save source')}</button>
    </form>
    {error && <p className="api-error" role="alert">{error}</p>}
    {notice && <p className="api-notice" role="status">{notice}</p>}
  </details>;
}
