import type { ChartOptions, ChartType } from 'chart.js'

export const chartPalette = ['#89b59f', '#565a93', '#ff5a4f', '#f2d98c', '#6d7b88', '#3c2b2a']

export function withChartOptions<TType extends ChartType>(options?: ChartOptions<TType>): ChartOptions<TType> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#687079',
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          font: {
            family: 'Inter, ui-sans-serif, system-ui',
            size: 11,
            weight: 700,
          },
        },
      },
      tooltip: {
        backgroundColor: '#15191c',
        titleColor: '#fff',
        bodyColor: '#d9dedb',
        borderColor: 'rgba(255,255,255,.12)',
        borderWidth: 1,
        displayColors: true,
        padding: 12,
      },
      ...(options?.plugins || {}),
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#7a8288', font: { size: 11, weight: 700 } },
      },
      y: {
        grid: { color: 'rgba(104,112,121,.14)' },
        ticks: { color: '#7a8288', font: { size: 11, weight: 700 } },
      },
      ...(options?.scales || {}),
    },
    ...options,
  } as ChartOptions<TType>
}
