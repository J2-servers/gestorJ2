<script setup lang="ts">
import type { RecentOrder } from '@/modules/dashboard/types'

defineProps<{
  orders: RecentOrder[]
}>()
</script>

<template>
  <section class="orders-card">
    <div class="orders-head">
      <h2>Últimos pedidos</h2>
      <span class="mini-down">⌄</span>
    </div>

    <div class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-row">
        <div class="file-icon" :style="{ background: order.color }" aria-hidden="true">
          <span />
        </div>
        <div class="order-name">{{ order.name }}</div>
        <div class="people" aria-hidden="true">
          <span class="person" />
          <span class="person" />
          <span v-if="order.people > 2" class="more-people">+{{ order.people - 2 }}</span>
        </div>
        <div class="order-date">{{ order.value }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.orders-card {
  min-height: 330px;
  padding: 31px 34px 30px;
  border-radius: 26px;
  background: #fff;
  box-shadow: var(--gj2-shadow-card);
}

.orders-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 25px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e9e9e7;
}

.orders-head h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 830;
}

.mini-down {
  width: 24px;
  height: 24px;
  border: 1px solid #eeeeec;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #9ba0a5;
  background: #fbfbfa;
}

.order-list {
  display: grid;
  gap: 17px;
}

.order-row {
  min-height: 42px;
  display: grid;
  grid-template-columns: 44px minmax(180px, 1fr) 140px 112px;
  align-items: center;
  gap: 10px;
}

.file-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  box-shadow: inset 0 1px rgba(255,255,255,.16);
}

.file-icon span {
  width: 15px;
  height: 18px;
  border-radius: 3px;
  background: #fff;
}

.order-name {
  color: #1d1f21;
  font-size: 15px;
  font-weight: 800;
}

.people {
  display: flex;
  align-items: center;
}

.person,
.more-people {
  width: 31px;
  height: 31px;
  margin-left: -7px;
  border: 3px solid #fff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #6c7177;
  font-size: 10px;
  font-weight: 800;
  background: linear-gradient(145deg, #ceb49d, #6d7e89);
}

.person:first-child {
  margin-left: 0;
}

.person:nth-child(2) {
  background: linear-gradient(145deg, #324253, #d4b9a4);
}

.more-people {
  background: #f2f2f1;
}

.order-date {
  text-align: right;
  color: #9a9da1;
  font-size: 14px;
}

@media (max-width: 720px) {
  .order-row {
    grid-template-columns: 42px minmax(0, 1fr) 104px;
  }

  .people {
    display: none;
  }
}

@media (max-width: 520px) {
  .orders-card {
    padding: 26px 22px;
  }

  .orders-head h2 {
    font-size: 24px;
  }

  .order-row {
    grid-template-columns: 38px 1fr;
  }

  .order-date {
    grid-column: 2;
    margin-top: -8px;
    text-align: left;
  }
}
</style>
