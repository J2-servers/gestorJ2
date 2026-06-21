<script setup lang="ts">
import { computed } from 'vue'
import { Chart as ChartJS, registerables, type ChartData, type ChartOptions } from 'chart.js'
import { Line } from 'vue-chartjs'

import { withChartOptions } from '@/components/charts/chartOptions'

ChartJS.register(...registerables)

const props = withDefaults(
  defineProps<{
    data: ChartData<'line'>
    options?: ChartOptions<'line'>
    height?: string
  }>(),
  {
    height: '300px',
  },
)

const mergedOptions = computed(() => withChartOptions<'line'>(props.options))
</script>

<template>
  <div class="chart-frame" :style="{ height }">
    <Line :data="data" :options="mergedOptions" />
  </div>
</template>

<style scoped>
.chart-frame {
  position: relative;
  width: 100%;
  min-height: 180px;
}
</style>
