<script setup lang="ts">
export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

defineProps<{
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  rowKey?: string
  emptyText?: string
}>()
</script>

<template>
  <div class="ui-table-wrap">
    <table class="ui-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :class="column.align ? `align-${column.align}` : undefined"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="String(row[rowKey || 'id'] ?? index)">
          <td
            v-for="column in columns"
            :key="column.key"
            :class="column.align ? `align-${column.align}` : undefined"
          >
            <slot :name="column.key" :row="row" :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td class="empty-cell" :colspan="columns.length">{{ emptyText || 'Nenhum registro encontrado.' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ui-table-wrap {
  width: 100%;
  overflow: auto;
  border-radius: 22px;
  border: 1px solid var(--gj2-table-border);
  background: var(--gj2-table-bg);
  box-shadow:
    inset 0 1px 0 var(--gj2-modal-border),
    0 16px 38px rgba(87, 98, 106, .11);
  scrollbar-width: none;
  overscroll-behavior: contain;
  transition: background .3s var(--gj2-ease);
}

.ui-table-wrap::-webkit-scrollbar {
  display: none;
}

.ui-table {
  width: 100%;
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0;
}

.ui-table th,
.ui-table td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--gj2-table-divider);
  text-align: left;
}

.ui-table th {
  position: sticky;
  top: 0;
  z-index: var(--gj2-z-base);
  color: var(--gj2-table-th-color);
  font-size: 11px;
  font-weight: 930;
  letter-spacing: .04em;
  text-transform: uppercase;
  background: var(--gj2-table-th-bg);
  backdrop-filter: blur(10px);
}

.ui-table td {
  color: var(--gj2-table-td-color);
  font-size: 13px;
  font-weight: 720;
  background: var(--gj2-table-td-bg);
  transition: background .16s var(--gj2-ease), color .16s var(--gj2-ease);
}

.ui-table tbody tr:last-child td {
  border-bottom: 0;
}

.ui-table tbody tr:nth-child(even) td {
  background: var(--gj2-table-td-even);
}

@media (hover: hover) {
  .ui-table tbody tr:hover td {
    background: var(--gj2-table-td-hover);
  }
}

.align-center {
  text-align: center !important;
}

.align-right {
  text-align: right !important;
}

.empty-cell {
  min-height: 120px;
  color: var(--gj2-muted) !important;
  text-align: center !important;
  padding: 34px 16px !important;
  font-weight: 820 !important;
}

@media (max-width: 720px) {
  .ui-table {
    min-width: 620px;
  }
}
</style>
