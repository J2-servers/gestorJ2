<script setup lang="ts">
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, registerables, type ChartData, type ChartOptions } from 'chart.js'

import { withChartOptions } from '@/components/charts/chartOptions'

ChartJS.register(...registerables)

const props = withDefaults(
  defineProps<{
    data: ChartData<'pie'>
    options?: ChartOptions<'pie'>
    height?: string
  }>(),
  {
    height: '300px',
  },
)

const mergedOptions = computed(() => withChartOptions<'pie'>(props.options))
</script>

<template>
  <div class="chart-frame" :style="{ height }">
    <Pie :data="data" :options="mergedOptions" />
  </div>
</template>

<style scoped>
.chart-frame {
  position: relative;
  width: 100%;
  min-height: 180px;
}
</style>
