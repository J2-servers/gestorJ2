<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, registerables, type ChartData, type ChartOptions } from 'chart.js'

import { withChartOptions } from '@/components/charts/chartOptions'

ChartJS.register(...registerables)

const props = withDefaults(
  defineProps<{
    data: ChartData<'bar'>
    options?: ChartOptions<'bar'>
    height?: string
  }>(),
  {
    height: '300px',
  },
)

const mergedOptions = computed(() => withChartOptions<'bar'>(props.options))
</script>

<template>
  <div class="chart-frame" :style="{ height }">
    <Bar :data="data" :options="mergedOptions" />
  </div>
</template>

<style scoped>
.chart-frame {
  position: relative;
  width: 100%;
  min-height: 180px;
}
</style>
