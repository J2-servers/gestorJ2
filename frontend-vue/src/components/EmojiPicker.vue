<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{ pick: [emoji: string] }>()

// ─── categorias ───────────────────────────────────────────────────────────────
const CATS = [
  {
    id: 'rostos',
    icon: '😊',
    label: 'Rostos',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
      '🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
      '🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕',
      '😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
      '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩',
      '🤡','👹','👺','👻','👽','👾','🤖',
    ],
  },
  {
    id: 'gestos',
    icon: '👋',
    label: 'Gestos',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
      '🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️',
      '💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀',
      '👁️','👅','👄','💋','🫦',
    ],
  },
  {
    id: 'pessoas',
    icon: '👤',
    label: 'Pessoas',
    emojis: [
      '👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆',
      '💁','🙋','🧏','🙇','🤦','🤷','👮','🕵️','💂','🥷','👷','🫅','🤴','👸','👰','🤵',
      '🧑‍⚕️','👨‍⚕️','👩‍⚕️','🧑‍🎓','👨‍🎓','👩‍🎓','🧑‍💼','👨‍💼','👩‍💼','🧑‍💻','👨‍💻','👩‍💻',
    ],
  },
  {
    id: 'natureza',
    icon: '🌿',
    label: 'Natureza',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
      '🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋',
      '🐌','🐞','🌸','🌹','🌺','🌻','🌼','🌷','🌱','🌿','🍀','🍁','🍂','🍃','🌾','🍄',
      '🌴','🌵','🌲','🌳','⛰️','🌋','🏔️','🌊','🌈','⭐','🌙','☀️','⛅','🌤️','🌦️','❄️',
    ],
  },
  {
    id: 'comida',
    icon: '🍔',
    label: 'Comida',
    emojis: [
      '🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆','🥦',
      '🥕','🌽','🌶️','🫑','🧄','🧅','🥔','🍠','🍞','🥐','🧀','🍳','🥚','🥓','🍗','🍖',
      '🌮','🌯','🫔','🥙','🧆','🥗','🍲','🫕','🍜','🍝','🍛','🍣','🍱','🍤','🍙','🍚',
      '🍘','🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜',
      '🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧃','🥤','🧋','☕','🍵','🧉','🍶',
    ],
  },
  {
    id: 'viagem',
    icon: '🚀',
    label: 'Viagem',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛵','🏍️',
      '🛺','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','⛽','🚦','🚧','⚓','🛟','⛵','🛶','🚤',
      '🛳️','⛴️','🛥️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛸','🚀',
      '🛰️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏗️','🌆',
    ],
  },
  {
    id: 'objetos',
    icon: '💼',
    label: 'Objetos',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','📷','📸','📹','🎥','📽️',
      '📺','📻','🎙️','📞','☎️','📟','📠','📡','🔋','🔌','💡','🔦','🕯️','🪔','💰','💴',
      '💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','💼','📁','📂','🗂️','📋','📌',
      '📍','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔑','🗝️','🔨','🪓','⛏️',
      '⚙️','🗜️','⚖️','🔧','🔩','🪛','🔫','🪃','🛡️','🪚','🔪','🗡️','⚔️','🛠️','🪤',
    ],
  },
  {
    id: 'simbolos',
    icon: '✅',
    label: 'Símbolos',
    emojis: [
      '✅','❎','☑️','🔘','🔵','🟣','🟤','⚫','⚪','🔴','🟠','🟡','🟢','🔶','🔷','🔸',
      '🔹','🔺','🔻','💠','🔱','📛','🔰','⭕','✳️','❇️','✴️','❓','❔','❗','❕','‼️',
      '⁉️','🔅','🔆','📶','📳','📴','📵','📡','🔇','🔈','🔉','🔊','📢','📣','🔔','🔕',
      '🎵','🎶','🎼','💯','🔥','⭐','🌟','💫','✨','🎉','🎊','🎈','🎁','🎀','🏆','🥇',
      '🥈','🥉','🏅','🎖️','🎗️','🎫','🎟️','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎',
      '💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☯️','✡️',
      '🆒','🆓','🆕','🆙','🆚','🆗','🆘','🆖','🔤','🔡','🔢','🔣','🅰️','🅱️','🆎','🅾️',
      '#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟',
      '⏸️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','▶️','◀️','🔼','🔽','↩️','↪️',
      '⤴️','⤵️','🔀','🔁','🔂','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️',
    ],
  },
]

const activeTab = ref(0)
const searchQuery = ref('')

const filtered = computed(() => {
  const q = searchQuery.value.trim()
  if (!q) return CATS[activeTab.value].emojis
  // pesquisa em todas as categorias
  return CATS.flatMap((c) => c.emojis).filter((e) => {
    // filtro simples por codepoint unicode
    return e.includes(q)
  })
})

const isSearching = computed(() => searchQuery.value.trim().length > 0)

function pick(emoji: string) {
  emit('pick', emoji)
}
</script>

<template>
  <div class="ep-root" @click.stop>
    <!-- busca -->
    <div class="ep-search">
      <span class="ep-search-icon">🔍</span>
      <input
        v-model="searchQuery"
        class="ep-search-input"
        placeholder="Pesquisar emoji..."
        autofocus
      />
      <button v-if="searchQuery" class="ep-clear" type="button" @click="searchQuery = ''">✕</button>
    </div>

    <!-- abas de categoria (ocultas durante pesquisa) -->
    <div v-if="!isSearching" class="ep-tabs">
      <button
        v-for="(cat, i) in CATS"
        :key="cat.id"
        class="ep-tab"
        :class="{ active: activeTab === i }"
        :title="cat.label"
        type="button"
        @click="activeTab = i"
      >{{ cat.icon }}</button>
    </div>

    <!-- grade de emojis -->
    <div class="ep-grid">
      <button
        v-for="emoji in filtered"
        :key="emoji"
        class="ep-btn"
        type="button"
        :title="emoji"
        @click="pick(emoji)"
      >{{ emoji }}</button>
      <div v-if="filtered.length === 0" class="ep-empty">Nenhum emoji encontrado</div>
    </div>
  </div>
</template>

<style scoped>
.ep-root {
  width: 320px;
  background: var(--gj2-surface, #fff);
  border: 1px solid var(--gj2-card-border, #e4e8ec);
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  user-select: none;
}

/* busca */
.ep-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--gj2-line, #eaeef2);
}

.ep-search-icon {
  font-size: 14px;
  flex-shrink: 0;
  opacity: .55;
}

.ep-search-input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 13px;
  color: var(--gj2-ink);
  font-family: inherit;
}

.ep-search-input::placeholder { color: var(--gj2-muted); }

.ep-clear {
  border: 0;
  background: transparent;
  color: var(--gj2-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}

/* abas */
.ep-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--gj2-line, #eaeef2);
  overflow-x: auto;
  scrollbar-width: none;
}

.ep-tabs::-webkit-scrollbar { display: none; }

.ep-tab {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  font-size: 17px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .14s ease, border-color .14s ease;
  flex-shrink: 0;
}

.ep-tab:hover   { background: var(--gj2-surface-muted); }
.ep-tab.active  { background: var(--gj2-surface-muted); border-color: var(--gj2-line); }

/* grade */
.ep-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 1px;
  padding: 8px;
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,.12) transparent;
}

.ep-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .1s ease, transform .1s ease;
  line-height: 1;
}

.ep-btn:hover {
  background: var(--gj2-surface-muted);
  transform: scale(1.2);
}

.ep-empty {
  grid-column: 1 / -1;
  padding: 24px 0;
  text-align: center;
  color: var(--gj2-muted);
  font-size: 13px;
}

/* dark mode */
html[data-theme="dark"] .ep-root {
  background: var(--gj2-surface);
  border-color: var(--gj2-line);
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
}
</style>
