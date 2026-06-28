<script setup lang="ts">
interface OperationMetric {
  label: string
  value: string
  color: string
}

defineProps<{
  progress: number
  metrics: OperationMetric[]
}>()
</script>

<template>
  <section class="operation-card">
    <div class="card-title">
      Operação
      <span class="mini-more">⋮</span>
    </div>

    <div class="donut-wrap">
      <div class="donut">
        <strong>{{ progress }}%</strong>
      </div>
    </div>

    <div class="legend">
      <div v-for="metric in metrics" :key="metric.label" class="legend-item">
        <i :style="{ background: metric.color }" />
        <span>
          <strong>{{ metric.label }}</strong>
          {{ metric.value }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.operation-card {
  min-height: 330px;
  padding: 31px 34px 30px;
  border-radius: 26px;
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
  box-shadow: var(--gj2-shadow-card);
  transition: background .3s var(--gj2-ease);
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  font-size: 28px;
  font-weight: 830;
  letter-spacing: -.01em;
}

.mini-more {
  width: 24px;
  height: 24px;
  border: 1px solid var(--gj2-line);
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--gj2-muted);
  background: var(--gj2-surface-muted);
  font-size: 18px;
}

.donut-wrap {
  display: grid;
  place-items: center;
  margin-bottom: 24px;
}

.donut {
  width: 162px;
  height: 162px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle, var(--gj2-surface) 0 36%, transparent 37%),
    conic-gradient(var(--gj2-brown) 0 44%, var(--gj2-yellow) 44% 58%, var(--gj2-green) 58% 74%, var(--gj2-blue) 74% 100%);
}

.donut strong {
  font-size: 27px;
  letter-spacing: -.03em;
}

.legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 28px;
}

.legend-item {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 12px;
  color: var(--gj2-muted);
  font-size: 14px;
  line-height: 1.3;
}

.legend-item i {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
}

.legend-item strong {
  display: block;
  margin-bottom: 4px;
  color: var(--gj2-ink);
  font-size: 16px;
}
</style>
