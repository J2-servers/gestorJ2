<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { creditRequestsService } from '@/services/api/creditRequests.service'
import { usersService } from '@/services/api/users.service'
import type { CreditRequest, User } from '@/types/domain'
import { formatCurrency, formatDate } from '@/utils/format'

const requests = ref<CreditRequest[]>([])
const users = ref<User[]>([])
const status = ref('all')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [reqs, allUsers] = await Promise.all([
      creditRequestsService.list(1000).then((result) => result?.data || []),
      usersService.list().catch(() => []),
    ])
    requests.value = reqs
    users.value = allUsers
  } catch {
    requests.value = []
  } finally {
    loading.value = false
  }
}

const proofRequests = computed(() =>
  requests.value.filter((item) => item.proof_url || item.payment_proof_url || item.status === 'recharged' || item.status === 'rejected'),
)
const filtered = computed(() => proofRequests.value.filter((item) => status.value === 'all' || item.status === status.value))

function resellerName(id?: string) {
  const user = users.value.find((item) => item.id === id)
  return user?.name || user?.email || 'Revendedor'
}

onMounted(load)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Comprovantes</h1>
        <p>Galeria operacional para revisar pagamentos, aprovações e rejeições vinculadas aos pedidos.</p>
      </div>
    </header>

    <div class="module-chip-row">
      <button v-for="item in ['all', 'recharged', 'rejected', 'pending']" :key="item" class="module-chip" :class="{ active: status === item }" @click="status = item">
        {{ item === 'all' ? 'Todos' : item }}
      </button>
    </div>

    <section class="module-grid">
      <article v-for="request in filtered" :key="request.id" class="module-card pad proof-card">
        <div class="proof-thumb">
          <img v-if="request.proof_url || request.payment_proof_url" :src="request.proof_url || request.payment_proof_url" alt="Comprovante" />
          <span v-else>sem imagem</span>
        </div>
        <h3>{{ request.server_snapshot?.name || 'Servidor' }}</h3>
        <small>{{ resellerName(request.reseller_id) }} • {{ formatDate(request.created_date) }}</small>
        <strong>{{ formatCurrency(request.total_value) }}</strong>
        <span class="module-pill">{{ request.status }}</span>
      </article>
    </section>
  </div>
</template>

<style scoped>
.proof-card {
  display: grid;
  gap: 10px;
}

.proof-thumb {
  aspect-ratio: 16 / 9;
  border-radius: 18px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--gj2-muted);
  background: #f1f2f0;
}

.proof-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
