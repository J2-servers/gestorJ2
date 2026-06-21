<script setup lang="ts">
import UiEmptyState from '@/components/feedback/UiEmptyState.vue'
import UiLoadingState from '@/components/feedback/UiLoadingState.vue'
import type { CreditRequest, User } from '@/types/domain'

import RequestCard from './RequestCard.vue'

defineProps<{
  requests: CreditRequest[]
  isAdmin: boolean
  currentUser?: User | null
  loading: boolean
  error: string
  actingId: string | null
}>()

const emit = defineEmits<{
  analyze: [id: string]
  approve: [id: string, notes?: string]
  reject: [id: string, reason: string, rejectionImageUrl?: string]
  cancel: [id: string]
  retry: []
}>()
</script>

<template>
  <UiLoadingState v-if="loading" />

  <div v-else-if="error" class="list-error" role="alert">
    <strong>Ops, algo falhou</strong>
    <p>{{ error }}</p>
    <button type="button" @click="emit('retry')">Tentar novamente</button>
  </div>

  <UiEmptyState
    v-else-if="requests.length === 0"
    title="Nenhum pedido por aqui"
    description="Quando houver pedidos de recarga, eles aparecem nesta lista para acompanhamento e ações."
  />

  <div v-else class="request-list">
    <RequestCard
      v-for="request in requests"
      :key="request.id"
      :request="request"
      :is-admin="isAdmin"
      :current-user="currentUser"
      :busy="actingId === request.id"
      @analyze="(id) => emit('analyze', id)"
      @approve="(id, notes) => emit('approve', id, notes)"
      @reject="(id, reason, imageUrl) => emit('reject', id, reason, imageUrl)"
      @cancel="(id) => emit('cancel', id)"
    />
  </div>
</template>

<style scoped>
.request-list {
  display: grid;
  gap: 14px;
}

.list-error {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  min-height: 220px;
  text-align: center;
  color: var(--gj2-muted);
}

.list-error strong {
  color: var(--gj2-ink);
  font-size: 18px;
}

.list-error button {
  margin-top: 6px;
  min-height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 14px;
  cursor: pointer;
  color: #fff;
  font-weight: 780;
  background: var(--gj2-green-deep);
}
</style>
