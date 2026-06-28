<script setup lang="ts">
import { computed, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { uploadsService } from '@/services/api/uploads.service'

import type { RequestStatus } from '../types'

const props = defineProps<{
  status: RequestStatus
  isAdmin: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  analyze: []
  approve: [notes?: string]
  reject: [reason: string, rejectionImageUrl?: string]
  cancel: []
}>()

const approving = ref(false)
const rejecting = ref(false)
const reason = ref('')
const approvalNotes = ref('')
const rejectionImageUrl = ref('')
const rejectionImageName = ref('')
const uploading = ref(false)
const localError = ref('')

const isOpen = computed(() => props.status === 'pending' || props.status === 'analyzing')

function confirmApprove() {
  emit('approve', approvalNotes.value.trim() || undefined)
  approving.value = false
  approvalNotes.value = ''
}

function cancelApprove() {
  approving.value = false
  approvalNotes.value = ''
  localError.value = ''
}

function confirmReject() {
  const text = reason.value.trim()
  if (!text) return
  emit('reject', text, rejectionImageUrl.value || undefined)
  rejecting.value = false
  reason.value = ''
  rejectionImageUrl.value = ''
  rejectionImageName.value = ''
}

function cancelReject() {
  rejecting.value = false
  reason.value = ''
  rejectionImageUrl.value = ''
  rejectionImageName.value = ''
  localError.value = ''
}

async function uploadRejectionImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  localError.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    localError.value = 'Selecione apenas imagem para o anexo da rejeicao.'
    input.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    localError.value = 'Imagem muito grande. Limite maximo: 5 MB.'
    input.value = ''
    return
  }

  uploading.value = true
  try {
    const uploaded = (await uploadsService.upload(file)) as Record<string, string>
    rejectionImageUrl.value = uploaded.fileUrl || uploaded.file_url || uploaded.url || ''
    rejectionImageName.value = file.name
    if (!rejectionImageUrl.value) localError.value = 'Upload concluido, mas a URL nao foi retornada.'
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Falha ao enviar imagem.'
  } finally {
    uploading.value = false
  }
}

function removeRejectionImage() {
  rejectionImageUrl.value = ''
  rejectionImageName.value = ''
}
</script>

<template>
  <div class="action-panel">
    <div v-if="approving" class="decision-box approve-box">
      <label>
        <span>Observacao da aprovacao</span>
        <textarea
          v-model="approvalNotes"
          class="decision-input"
          placeholder="Ex: Recarga conferida no painel do fornecedor."
          rows="3"
          maxlength="500"
        />
      </label>
      <div class="decision-actions">
        <button class="line-btn" type="button" :disabled="busy" @click="cancelApprove">Voltar</button>
        <button class="success-btn" type="button" :disabled="busy" @click="confirmApprove">
          Confirmar aprovacao
        </button>
      </div>
    </div>

    <div v-else-if="rejecting" class="decision-box reject-box">
      <label>
        <span>Motivo da rejeicao</span>
        <textarea
          v-model="reason"
          class="decision-input"
          placeholder="Ex: Comprovante invalido ou valor divergente."
          rows="3"
          maxlength="500"
        />
      </label>

      <div class="upload-control">
        <label class="upload-drop">
          <input type="file" accept="image/*" :disabled="uploading || busy" @change="uploadRejectionImage" />
          <strong>{{ uploading ? 'Enviando imagem...' : 'Anexar imagem opcional' }}</strong>
          <span>{{ rejectionImageName || 'PNG/JPG ate 5 MB para explicar a rejeicao.' }}</span>
        </label>
        <button v-if="rejectionImageUrl" class="line-btn compact" type="button" @click="removeRejectionImage">
          Remover anexo
        </button>
      </div>

      <p v-if="localError" class="local-error">{{ localError }}</p>

      <div class="decision-actions">
        <button class="line-btn" type="button" :disabled="busy" @click="cancelReject">Voltar</button>
        <button class="danger-btn" type="button" :disabled="busy || uploading || !reason.trim()" @click="confirmReject">
          Confirmar rejeicao
        </button>
      </div>
    </div>

    <div v-else-if="isOpen" class="action-row">
      <template v-if="isAdmin">
        <UiButton v-if="status === 'pending'" variant="soft" :disabled="busy" @click="emit('analyze')">
          Analisar
        </UiButton>
        <UiButton variant="primary" :disabled="busy" @click="approving = true">Aprovar</UiButton>
        <button class="danger-btn" type="button" :disabled="busy" @click="rejecting = true">Rejeitar</button>
      </template>
      <template v-else>
        <button class="danger-btn" type="button" :disabled="busy" @click="emit('cancel')">Cancelar pedido</button>
      </template>
    </div>

    <p v-else class="closed-note">Pedido finalizado - sem acoes disponiveis.</p>
  </div>
</template>

<style scoped>
.action-panel {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.action-row {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-row :deep(.ui-button) {
  min-height: 42px;
  padding: 0 18px;
  font-size: 14px;
}

.danger-btn,
.success-btn,
.line-btn {
  max-width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 15px;
  border: 0;
  cursor: pointer;
  font-weight: 780;
  font-size: 14px;
  overflow-wrap: anywhere;
  transition: opacity .18s ease, transform .16s ease;
}

.danger-btn {
  color: #fff;
  background: var(--gj2-red);
  box-shadow: 0 12px 24px rgba(255, 72, 64, .22);
}

.success-btn {
  color: #fff;
  background: var(--gj2-green-deep);
  box-shadow: 0 12px 24px rgba(43, 151, 88, .2);
}

.line-btn {
  color: var(--gj2-muted);
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-line);
  transition: background .18s var(--gj2-ease), color .18s var(--gj2-ease);
}

.line-btn.compact {
  min-height: 36px;
  padding: 0 13px;
  font-size: 12px;
}

.danger-btn:not(:disabled):active,
.success-btn:not(:disabled):active,
.line-btn:not(:disabled):active {
  transform: translateY(1px);
}

.danger-btn:disabled,
.success-btn:disabled,
.line-btn:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.decision-box {
  min-width: 0;
  display: grid;
  gap: 10px;
  padding: 12px;
  border-radius: 18px;
  background: var(--gj2-surface-muted);
  transition: background .3s var(--gj2-ease);
}

.decision-box label {
  display: grid;
  gap: 7px;
}

.decision-box label span {
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.decision-input {
  width: 100%;
  border: 1px solid var(--gj2-line);
  border-radius: 14px;
  padding: 11px 13px;
  resize: vertical;
  outline: none;
  color: var(--gj2-ink);
  background: var(--gj2-input-bg);
  font: inherit;
  transition: border-color .18s var(--gj2-ease), background .18s var(--gj2-ease);
}

.decision-input:focus {
  border-color: var(--gj2-red);
}

.approve-box .decision-input:focus {
  border-color: var(--gj2-green-deep);
}

.upload-control {
  display: grid;
  gap: 8px;
}

.upload-drop {
  min-width: 0;
  min-height: 72px;
  padding: 13px 14px;
  border: 1px dashed var(--gj2-line-strong);
  border-radius: 16px;
  cursor: pointer;
  background: var(--gj2-input-bg);
  transition: background .18s var(--gj2-ease);
}

.upload-drop input {
  display: none;
}

.upload-drop strong,
.upload-drop span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-drop strong {
  color: var(--gj2-ink);
  font-size: 13px;
}

.upload-drop span {
  margin-top: 4px;
  color: var(--gj2-muted);
  font-size: 12px;
}

.local-error {
  margin: 0;
  color: var(--gj2-red);
  font-size: 12px;
  font-weight: 760;
}

.decision-actions {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr));
  gap: 10px;
}

.decision-actions button {
  width: 100%;
}

.closed-note {
  margin: 0;
  color: var(--gj2-muted);
  font-size: 13px;
}

@media (max-width: 560px) {
  .action-row,
  .decision-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .action-row :deep(.ui-button),
  .action-row .danger-btn {
    width: 100%;
  }
}
</style>
