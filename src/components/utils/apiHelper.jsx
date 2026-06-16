/**
 * apiHelper - Utilitários robustos para chamadas de API com retry automático
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

/**
 * Executa uma função async com retry automático em caso de falha de rede.
 * @param {Function} fn - Função async a executar
 * @param {number} retries - Número de tentativas restantes
 * @param {number} delay - Delay entre tentativas em ms
 */
export async function withRetry(fn, retries = MAX_RETRIES, delay = RETRY_DELAY_MS) {
  try {
    return await fn();
  } catch (err) {
    const isNetworkError = isNetworkIssue(err);
    if (retries > 0 && isNetworkError) {
      await sleep(delay);
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

/**
 * Detecta se o erro é de rede (Network Error, timeout, etc)
 */
export function isNetworkIssue(err) {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch error') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket') ||
    err.code === 'ECONNABORTED' ||
    (err.response && err.response.status >= 500) ||
    (!err.response && err.request)
  );
}

/**
 * Retorna uma mensagem de erro amigável em português
 */
export function getFriendlyError(err) {
  if (!err) return 'Erro desconhecido';
  const msg = (err.message || '').toLowerCase();
  
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch error')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  if (msg.includes('timeout')) {
    return 'Tempo limite excedido. Tente novamente.';
  }
  if (msg.includes('upload') || msg.includes('file')) {
    return 'Erro ao enviar arquivo. Verifique o tamanho e tente novamente.';
  }
  if (err.response?.status === 413) {
    return 'Arquivo muito grande para enviar.';
  }
  if (err.response?.status === 401) {
    return 'Sessão expirada. Recarregue a página.';
  }
  if (err.response?.status === 403) {
    return 'Sem permissão para esta ação.';
  }
  if (err.response?.status >= 500) {
    return 'Erro no servidor. Tente novamente em alguns instantes.';
  }
  return err.message || 'Erro inesperado. Tente novamente.';
}

/**
 * Utilitário de sleep
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica se o navegador está online
 */
export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}