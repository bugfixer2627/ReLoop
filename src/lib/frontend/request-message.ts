import { ApiRequestError } from './api-client';

export function requestMessage(reason: unknown, locale: string, context: 'case' | 'save' | 'analysis' | 'voice' | 'translation') {
  const chinese = locale === 'zh-CN';
  const code = reason instanceof ApiRequestError ? reason.code : '';
  if (context === 'case' && ['NOT_FOUND', 'INVALID_REQUEST'].includes(code)) {
    return chinese ? '此案例不存在或已不可用。请选择其他已保存案例。' : 'This case does not exist or is no longer available. Choose another saved case.';
  }
  if (code === 'UNKNOWN_SKU') return chinese ? '未找到该 SKU 对应的商品，请核对已登记的演示商品 SKU。' : 'No product matches this SKU. Check the registered demo product SKU.';
  if (code === 'UNAUTHORIZED') return chinese ? '访问令牌未被接受，请重新登录工作区。' : 'The access token was not accepted. Sign in to the workspace again.';
  if (code === 'NOT_CONFIGURED') return chinese ? '服务尚未配置，请联系团队完成配置后重试。' : 'The service is not configured. Ask the team to configure it, then retry.';
  if (code === 'NOT_IMPLEMENTED') return chinese ? '此服务尚未接入，请使用现有的文字输入或已保存案例。' : 'This service is not implemented. Use text input or the saved case.';
  if (code === 'DATABASE_UNAVAILABLE') return chinese ? '无法连接案例存储，请稍后重试。已保存的案例不会因重试而被更新。' : 'Case storage is unavailable. Retry shortly. Retrying does not update a saved case.';
  if (code === 'INVALID_REQUEST') return chinese ? '请检查必填内容与长度限制后重试。' : 'Check the required fields and length limits, then retry.';
  const messages = {
    case: chinese ? '无法读取此案例，请重试或选择其他案例。' : 'Could not load this case. Retry or choose another case.',
    save: chinese ? '无法保存案例，请检查连接和输入后重试。' : 'Could not save the case. Check the connection and inputs, then retry.',
    analysis: chinese ? '证据核对失败，请重试或打开已保存案例。' : 'Evidence checking failed. Retry or open the saved case.',
    voice: chinese ? '转写失败，录音已丢弃，请改用文字输入。' : 'Transcription failed. The recording was discarded; use text input instead.',
    translation: chinese ? '翻译失败，请重试。原文已保留。' : 'Translation failed. Retry; the original text is preserved.',
  };
  return messages[context];
}
