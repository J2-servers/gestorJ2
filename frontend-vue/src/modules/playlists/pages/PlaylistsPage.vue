<script setup lang="ts">
import { computed, ref } from 'vue'

const players = [
  { category: 'Premium', name: 'ABE Player', url: 'https://abeplayertv.com/login' },
  { category: 'Premium', name: 'ALL Player', url: 'https://alltvplayer.com/login' },
  { category: 'Standard', name: 'Assist Plus +', url: 'https://smartcpp.com/#/upload-playlist' },
  { category: 'Standard', name: 'Bay IPTV', url: 'https://cms.bayip.tv/user/manage/playlist' },
  { category: 'Popular', featured: true, name: 'Bob Player', url: 'https://bobplayer.com/device/login' },
  { category: 'Premium', featured: true, name: 'Bob Premium', url: 'https://bobtvpremium.com/device/login' },
  { category: 'Premium', name: 'Bob Pro', url: 'https://bobprotv.com/mylist' },
  { category: 'Popular', featured: true, name: 'IBO Player', url: 'https://iboplayer.com/device/login' },
  { category: 'Premium', featured: true, name: 'IBO Player Pro', url: 'https://iboproapp.com/manage-playlists/login/' },
  { category: 'Popular', featured: true, name: 'SSIPTV', url: 'https://ss-iptv.com/en/users/playlist' },
]

const categories = ['Todos', 'Popular', 'Premium', 'Standard']
const search = ref('')
const category = ref('Todos')

const filtered = computed(() =>
  players.filter((player) => {
    const matchSearch = player.name.toLowerCase().includes(search.value.toLowerCase())
    const matchCategory = category.value === 'Todos' || player.category === category.value
    return matchSearch && matchCategory
  }),
)
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Players IPTV</h1>
        <p>Links rápidos para gerenciar playlists nos principais players usados pelos clientes.</p>
      </div>
      <strong class="module-pill">{{ filtered.length }} de {{ players.length }}</strong>
    </header>

    <div class="module-toolbar">
      <input v-model="search" class="module-search" placeholder="Buscar player" />
      <div class="module-chip-row">
        <button v-for="item in categories" :key="item" class="module-chip" :class="{ active: category === item }" @click="category = item">
          {{ item }}
        </button>
      </div>
    </div>

    <section class="playlist-grid">
      <a v-for="player in filtered" :key="player.name" class="module-card pad playlist-card" :href="player.url" target="_blank" rel="noopener noreferrer">
        <span class="playlist-icon">{{ player.name.slice(0, 2).toUpperCase() }}</span>
        <strong>{{ player.name }}</strong>
        <small>{{ player.category }} {{ player.featured ? '• destaque' : '' }}</small>
        <em>Abrir player →</em>
      </a>
    </section>
  </div>
</template>

<style scoped>
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.playlist-card {
  display: grid;
  gap: 8px;
  text-decoration: none;
}

.playlist-icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, var(--gj2-green), var(--gj2-blue));
  font-weight: 900;
}

.playlist-card em {
  color: var(--gj2-green-deep);
  font-style: normal;
  font-weight: 850;
}

@media (max-width: 920px) {
  .playlist-grid {
    grid-template-columns: 1fr;
  }
}
</style>
