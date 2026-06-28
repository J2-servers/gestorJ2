<script setup lang="ts">
import { computed, ref } from 'vue'

import type { CreditRequest, User } from '@/types/domain'

import RequestActionPanel from './RequestActionPanel.vue'
import RequestAuditDialog from './RequestAuditDialog.vue'
import RequestMessagesDialog from './RequestMessagesDialog.vue'
import RequestProofDialog from './RequestProofDialog.vue'
import RequestStatusBadge from './RequestStatusBadge.vue'

const props = defineProps<{
  request: CreditRequest
  isAdmin: boolean
  busy?: boolean
  currentUser?: User | null
}>()

const emit = defineEmits<{
  analyze: [id: string]
  approve: [id: string, notes?: string]
  reject: [id: string, reason: string, rejectionImageUrl?: string]
  cancel: [id: string]
}>()

const showChat = ref(false)
const showAudit = ref(false)
const proofUrl = ref('')

const serverName = computed(() => props.request.server_snapshot?.name || 'Servidor')
const resellerName = computed(
  () => props.request.reseller?.name || props.request.reseller?.full_name || props.request.reseller?.email || 'Revendedor',
)

const valueLabel = computed(() =>
  (Number(props.request.total_value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
)

const creditsLabel = computed(() => `${(props.request.requested_credits || 0).toLocaleString('pt-BR')} creditos`)

const dateLabel = computed(() => {
  if (!props.request.created_date) return ''
  const date = new Date(props.request.created_date)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
})

const shortId = computed(() => `#${props.request.id.slice(-8).toUpperCase()}`)
const paymentLabel = computed(() => (props.request.payment_type === 'postpaid' ? 'Pos-pago' : 'Pre-pago'))
const proofLink = computed(
  () => props.request.proof_of_payment_url || props.request.payment_proof_url || props.request.proof_url || '',
)
const rejectionImage = computed(() => props.request.rejection_image_url || props.request.rejectionImageUrl || '')
const requestNotes = computed(() => props.request.notes || props.request.admin_notes || '')

function openProof(url: string) {
  proofUrl.value = url
}
</script>

<template>
  <article class="request-card">
    <div class="request-main">
      <div class="request-icon" aria-hidden="true">{{ serverName.slice(0, 1).toUpperCase() }}</div>
      <div class="request-info">
        <div class="request-top">
          <h3>{{ serverName }}</h3>
          <RequestStatusBadge :status="request.status" />
        </div>
        <p class="request-sub">{{ resellerName }}<span v-if="request.login"> - {{ request.login }}</span></p>
        <p class="request-date">
          <span>{{ shortId }}</span>
          <span v-if="dateLabel">{{ dateLabel }}</span>
          <span>{{ paymentLabel }}</span>
        </p>
      </div>
    </div>

    <div class="request-numbers">
      <div>
        <span>Creditos</span>
        <strong>{{ creditsLabel }}</strong>
      </div>
      <div>
        <span>Valor</span>
        <strong class="value">{{ valueLabel }}</strong>
      </div>
    </div>

    <div class="request-tools">
      <button type="button" @click="showChat = true">Chat</button>
      <button type="button" @click="showAudit = true">Historico</button>
      <button v-if="proofLink" type="button" @click="openProof(proofLink)">Comprovante</button>
      <button v-if="rejectionImage" type="button" @click="openProof(rejectionImage)">Anexo rejeicao</button>
    </div>

    <div v-if="requestNotes || request.rejection_reason" class="request-alerts">
      <p v-if="requestNotes"><strong>Obs.</strong> {{ requestNotes }}</p>
      <p v-if="request.rejection_reason" class="danger"><strong>Rejeicao</strong> {{ request.rejection_reason }}</p>
    </div>

    <RequestActionPanel
      :status="request.status"
      :is-admin="isAdmin"
      :busy="busy"
      @analyze="emit('analyze', request.id)"
      @approve="(notes) => emit('approve', request.id, notes)"
      @reject="(reason, imageUrl) => emit('reject', request.id, reason, imageUrl)"
      @cancel="emit('cancel', request.id)"
    />

    <RequestMessagesDialog
      v-if="showChat"
      :request="request"
      :user="currentUser"
      @close="showChat = false"
    />
    <RequestAuditDialog v-if="showAudit" :request="request" @close="showAudit = false" />
    <RequestProofDialog v-if="proofUrl" :url="proofUrl" @close="proofUrl = ''" />
  </article>
</template>

<style scoped>
.request-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 230px minmax(220px, .8fr);
  align-items: center;
  gap: 18px;
  padding: 20px 24px;
  border-radius: var(--gj2-radius-md);
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
  box-shadow: var(--gj2-shadow-card);
  transition: background .3s var(--gj2-ease);
}

.request-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.request-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  font-weight: 850;
  font-size: 18px;
  background: linear-gradient(145deg, var(--gj2-green), var(--gj2-blue));
}

.request-info {
  min-width: 0;
}

.request-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.request-top h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 830;
  color: var(--gj2-ink);
}

.request-sub {
  margin: 4px 0 0;
  color: var(--gj2-muted);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-date {
  margin: 5px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--gj2-muted);
  font-size: 12px;
}

.request-date span {
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--gj2-surface-muted);
}

.request-numbers {
  display: flex;
  gap: 26px;
}

.request-numbers span {
  display: block;
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.request-numbers strong {
  display: block;
  margin-top: 4px;
  font-size: 16px;
  font-weight: 850;
  color: var(--gj2-ink);
}

.request-numbers .value {
  color: var(--gj2-green-deep);
}

.request-tools {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, max-content));
  gap: 8px;
}

.request-tools button {
  max-width: 100%;
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 13px;
  cursor: pointer;
  color: var(--gj2-ink);
  background: var(--gj2-surface-muted);
  font-size: 12px;
  font-weight: 820;
  text-align: center;
  overflow-wrap: anywhere;
  transition: background .18s var(--gj2-ease), color .18s var(--gj2-ease);
}

.request-tools button:hover {
  color: #fff;
  background: var(--gj2-sidebar);
}

.request-alerts {
  grid-column: 1 / -1;
  display: grid;
  gap: 8px;
}

.request-alerts p {
  margin: 0;
  padding: 11px 13px;
  border-radius: 15px;
  color: var(--gj2-muted);
  background: var(--gj2-surface-muted);
  font-size: 13px;
  line-height: 1.45;
}

.request-alerts p.danger {
  color: var(--gj2-red);
  background: rgba(255, 72, 64, .1);
}

.request-alerts strong {
  color: var(--gj2-ink);
}

.request-card > :deep(.action-panel) {
  grid-column: 1 / -1;
}

@media (max-width: 1080px) {
  .request-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .request-numbers {
    gap: 32px;
  }
}

@media (max-width: 520px) {
  .request-card {
    padding: 15px;
  }

  .request-main {
    align-items: flex-start;
  }

  .request-icon {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .request-numbers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .request-tools {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 128px), 1fr));
  }
}

@media (max-width: 360px) {
  .request-tools,
  .request-numbers {
    grid-template-columns: 1fr;
  }
}
</style>
