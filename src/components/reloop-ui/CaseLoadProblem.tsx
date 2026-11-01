import Link from 'next/link';
import { Icon } from './icons';
import { casePickerHref, type CaseDestination } from '@/lib/frontend/case-navigation';

export function CaseLoadProblem({ message, locale, destination, retry }: {
  message: string; locale: string; destination: CaseDestination; retry: () => void;
}) {
  const chinese = locale === 'zh-CN';
  return <section className="card case-load-problem" aria-labelledby="case-load-title">
    <span className="case-load-mark" aria-hidden="true"><Icon name="search" size={19}/></span>
    <div className="case-load-content">
      <h2 id="case-load-title">{chinese ? '无法打开此案例' : 'Unable to open this case'}</h2>
      <p role="alert">{message}</p>
      <div className="case-recovery-actions">
        <button className="btn btn-soft btn-sm" type="button" onClick={retry}>{chinese ? '重试' : 'Retry'}</button>
        <Link className="btn btn-soft btn-sm" href={casePickerHref(destination)}>{chinese ? '选择其他案例' : 'Choose another case'}</Link>
      </div>
    </div>
  </section>;
}
