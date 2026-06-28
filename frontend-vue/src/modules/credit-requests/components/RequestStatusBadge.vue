<script setup lang="ts">
import { computed } from 'vue'

import { statusMeta, type RequestStatus } from '../types'

const props = defineProps<{
  status: RequestStatus
}>()

const meta = computed(() => statusMeta(props.status))
</script>

<template>
  <span class="status-badge" :class="`status-badge--${meta.tone}`">
    <span class="dot" aria-hidden="true" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 26px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge--yellow { color: #c79512; background: color-mix(in srgb, var(--gj2-yellow) 25%, var(--gj2-surface)); }
.status-badge--blue { color: var(--gj2-blue); background: color-mix(in srgb, var(--gj2-blue) 14%, var(--gj2-surface)); }
.status-badge--green { color: var(--gj2-green-deep); background: color-mix(in srgb, var(--gj2-green-deep) 18%, var(--gj2-surface)); }
.status-badge--red { color: var(--gj2-red); background: rgba(255, 72, 64, .12); }
.status-badge--neutral { color: var(--gj2-muted); background: var(--gj2-chip-bg); }

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .status-badge--yellow { color: #e8c55a; background: rgba(212,165,20,.18); }
html[data-theme="dark"] .status-badge--blue   { color: #9b9ae8; background: rgba(85,83,180,.2); }
html[data-theme="dark"] .status-badge--green  { color: #6abf96; background: rgba(63,125,99,.2); }
html[data-theme="dark"] .status-badge--red    { color: #ff8278; background: rgba(194,59,52,.2); }
html[data-theme="dark"] .status-badge--neutral { color: #9ca2a8; background: rgba(108,113,119,.18); }
</style>
