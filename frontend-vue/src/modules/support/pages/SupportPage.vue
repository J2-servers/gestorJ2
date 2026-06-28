<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpenCheck, Headphones, LifeBuoy, MessageCircle, PlayCircle, ShieldCheck } from '@lucide/vue'

const search = ref('')
const active = ref('Todos')

const categories = ['Todos', 'Primeiros passos', 'Vendas', 'Financeiro', 'Atendimento', 'Tecnico']

const supportLinks = [
  { label: 'Suporte WhatsApp', href: 'https://wa.me/', category: 'Atendimento', detail: 'Canal direto para urgencias operacionais.' },
  { label: 'Status do WhatsApp', href: '/whatsapp', category: 'Tecnico', detail: 'Verifique conexao, QR Code, fila e logs.' },
  { label: 'Pedidos de credito', href: '/creditrequests', category: 'Vendas', detail: 'Acompanhe aprovacoes, recusas e historico.' },
  { label: 'Players IPTV', href: '/playlists', category: 'Tecnico', detail: 'Links de acesso para configurar playlists.' },
]

const tutorials = [
  {
    title: 'Como abrir um pedido pre-pago',
    category: 'Primeiros passos',
    icon: BookOpenCheck,
    steps: [
      'Confirme o servidor e o login do cliente antes de cobrar.',
      'Copie a chave PIX correta no painel.',
      'Anexe o comprovante legivel no pedido.',
      'Acompanhe o status ate recarregado ou rejeitado.',
    ],
  },
  {
    title: 'Como vender um codigo de recarga',
    category: 'Vendas',
    icon: PlayCircle,
    steps: [
      'Abra Codigos de recarga e escolha o produto com estoque disponivel.',
      'Clique em vender codigo apenas quando o cliente ja tiver confirmado pagamento.',
      'Copie o codigo entregue e envie junto com as instrucoes do produto.',
      'Nunca reutilize codigo vendido; o sistema baixa automaticamente do estoque.',
    ],
  },
  {
    title: 'Como agir quando um pedido for rejeitado',
    category: 'Atendimento',
    icon: MessageCircle,
    steps: [
      'Leia o motivo da rejeicao antes de responder ao cliente.',
      'Se for comprovante invalido, solicite novo arquivo sem cortes.',
      'Se for login incorreto, confirme o usuario no aplicativo do cliente.',
      'Abra um novo pedido somente depois de corrigir o dado errado.',
    ],
  },
  {
    title: 'Checklist para suporte tecnico',
    category: 'Tecnico',
    icon: ShieldCheck,
    steps: [
      'Pergunte qual player, servidor, login e mensagem de erro aparecem.',
      'Confirme se o cliente tem internet e se o aplicativo esta atualizado.',
      'Teste outro player quando o erro parecer local do app.',
      'Encaminhe para admin quando houver suspeita de instabilidade no servidor.',
    ],
  },
  {
    title: 'Rotina financeira do revendedor',
    category: 'Financeiro',
    icon: LifeBuoy,
    steps: [
      'Confira saldo, faturas e pedidos pendentes diariamente.',
      'Nao prometa liberacao antes da aprovacao do comprovante.',
      'Use o historico para conciliar vendas do dia.',
      'Sinalize divergencias com print do pedido e comprovante.',
    ],
  },
]

const filteredTutorials = computed(() => {
  const term = search.value.trim().toLowerCase()
  return tutorials.filter((item) => {
    const matchCategory = active.value === 'Todos' || item.category === active.value
    const matchText = !term || `${item.title} ${item.category} ${item.steps.join(' ')}`.toLowerCase().includes(term)
    return matchCategory && matchText
  })
})

const filteredLinks = computed(() =>
  supportLinks.filter((item) => active.value === 'Todos' || item.category === active.value),
)
</script>

<template>
  <div class="module-page support-page">
    <header class="module-hero">
      <div>
        <h1>Central de suporte</h1>
        <p>Tutoriais, procedimentos e links rapidos para orientar revendedores sem depender de mensagens soltas.</p>
      </div>
      <strong class="module-pill">{{ filteredTutorials.length }} tutoriais</strong>
    </header>

    <section class="support-hero module-card pad">
      <div>
        <span class="support-icon"><Headphones :size="28" /></span>
        <h2>Base operacional da equipe</h2>
        <p>Use esta pagina como manual vivo: primeiro atendimento, venda de codigos, pedidos pre-pagos, pos-pagos, comprovantes, players e diagnostico tecnico.</p>
      </div>
      <div class="support-kpis">
        <span><strong>4</strong><small>links rapidos</small></span>
        <span><strong>5</strong><small>playbooks</small></span>
        <span><strong>24h</strong><small>consulta interna</small></span>
      </div>
    </section>

    <div class="module-toolbar">
      <input v-model="search" class="module-search" placeholder="Buscar tutorial, erro ou procedimento" />
      <div class="module-chip-row">
        <button v-for="item in categories" :key="item" class="module-chip" :class="{ active: active === item }" @click="active = item">
          {{ item }}
        </button>
      </div>
    </div>

    <section class="support-grid">
      <article v-for="item in filteredTutorials" :key="item.title" class="module-card pad tutorial-card">
        <div class="tutorial-head">
          <span><component :is="item.icon" :size="22" /></span>
          <div>
            <small>{{ item.category }}</small>
            <h2>{{ item.title }}</h2>
          </div>
        </div>
        <ol>
          <li v-for="step in item.steps" :key="step">{{ step }}</li>
        </ol>
      </article>
    </section>

    <section class="module-card pad">
      <h2>Links de suporte</h2>
      <div class="support-links">
        <a v-for="link in filteredLinks" :key="link.label" class="module-row" :href="link.href">
          <span class="module-row-line">
            <strong>{{ link.label }}</strong>
            <small>{{ link.category }}</small>
          </span>
          <small>{{ link.detail }}</small>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.support-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 360px);
  gap: 18px;
  align-items: end;
}

.support-icon,
.tutorial-head span {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--gj2-orange), var(--gj2-red));
}

.support-hero h2 {
  margin: 12px 0 6px;
}

.support-hero p {
  max-width: 760px;
  color: var(--gj2-muted);
  line-height: 1.55;
}

.support-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.support-kpis span {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--gj2-card-border);
  border-radius: 18px;
  display: grid;
  gap: 4px;
  background: var(--gj2-row-bg);
  box-shadow:
    inset 0 1px 0 var(--gj2-modal-border),
    0 10px 24px rgba(74, 83, 92, .08);
}

.support-kpis strong {
  color: var(--gj2-text);
  font-size: 24px;
  font-weight: 920;
}

.support-kpis small,
.tutorial-head small {
  color: var(--gj2-muted);
  font-weight: 760;
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.tutorial-card {
  display: grid;
  gap: 16px;
}

.tutorial-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.tutorial-head h2 {
  margin: 2px 0 0;
}

.tutorial-card ol {
  margin: 0;
  padding-left: 22px;
  display: grid;
  gap: 10px;
  color: var(--gj2-muted);
  line-height: 1.45;
}

.support-links {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.support-links a {
  text-decoration: none;
}

@media (max-width: 920px) {
  .support-hero,
  .support-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .support-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .support-kpis span {
    min-height: 74px;
    padding: 10px;
    border-radius: 16px;
    align-content: center;
  }

  .support-kpis strong {
    font-size: 20px;
  }

  .support-kpis small {
    font-size: 11px;
    line-height: 1.15;
  }
}
</style>
