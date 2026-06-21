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

.status-badge--yellow { color: #9a7b16; background: #fbf1cf; }
.status-badge--blue { color: #41407c; background: #e6e5f6; }
.status-badge--green { color: #3f7d63; background: #def0e6; }
.status-badge--red { color: #c23b34; background: #fde2e0; }
.status-badge--neutral { color: #6c7177; background: #ecedee; }
</style>
