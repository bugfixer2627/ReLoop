import Link from 'next/link';
import { casePickerHref, type CaseDestination } from '@/lib/frontend/case-navigation';

export function CaseLoadProblem({ message, locale, destination, retry }: {
  message: string; locale: string; destination: CaseDestination; retry: () => void;
}) {
  return <div className="card card-pad api-error" role="alert">
    <p>{message}</p>
    <div className="case-recovery-actions">
      <button className="btn btn-soft btn-sm" type="button" onClick={retry}>{locale === 'zh-CN' ? '重试' : 'Retry'}</button>
      <Link className="btn btn-soft btn-sm" href={casePickerHref(destination)}>{locale === 'zh-CN' ? '选择其他案例' : 'Choose another case'}</Link>
    </div>
  </div>;
}
