import { ref } from 'vue'

import { whatsappService } from '@/services/api/whatsapp.service'

interface QueueStatus {
  waiting?: number
  delayed?: number
  active?: number
  failed?: number
  throttle?: { minDelayMs?: number; maxDelayMs?: number; minSendIntervalMs?: number }
}

interface ConnStatus {
  loading?: boolean
  ok?: boolean
  message?: string
}

interface TestResult {
  success: boolean
  logId?: string
  error?: string
}

// Diagnostico do WhatsApp (Evolution): conexao, fila anti-ban e mensagens de teste.
export function useWhatsappTest() {
  const conn = ref<ConnStatus | null>(null)
  const queue = ref<QueueStatus | null>(null)
  const testing = ref('')
  const result = ref<TestResult | null>(null)

  async function loadQueue() {
    try {
      queue.value = (await whatsappService.queue()) as QueueStatus
    } catch {
      queue.value = null
    }
  }

  async function checkConnection() {
    conn.value = { loading: true }
    try {
      const status = (await whatsappService.status()) as { connected?: boolean; message?: string }
      conn.value = { ok: status.connected === true, message: status.message }
      await loadQueue()
    } catch (err) {
      conn.value = { ok: false, message: err instanceof Error ? err.message : 'Erro ao checar conexão.' }
    }
  }

  async function sendTest(type: string, phone: string, message: string) {
    testing.value = type
    result.value = null
    try {
      const res = (await whatsappService.test(phone, message)) as {
        queued?: boolean
        logId?: string
        skipped?: boolean
        reason?: string
      }
      await loadQueue()
      result.value = res.skipped
        ? { success: false, error: res.reason || 'Envios de WhatsApp estão desligados.' }
        : { success: true, logId: res.logId }
    } catch (err) {
      result.value = { success: false, error: err instanceof Error ? err.message : 'Falha no teste.' }
    } finally {
      testing.value = ''
    }
  }

  return { conn, queue, testing, result, loadQueue, checkConnection, sendTest }
}
