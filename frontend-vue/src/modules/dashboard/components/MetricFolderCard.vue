<script setup lang="ts">
withDefaults(
  defineProps<{
    index?: string
    title: string
    subtitle: string
    tone?: 'green' | 'blue' | 'gallery'
  }>(),
  {
    index: '',
    tone: 'green',
  },
)
</script>

<template>
  <article class="folder-card" :class="`folder-card--${tone}`">
    <div class="folder-top">
      <span>{{ index }}</span>
      <span class="dots">•••</span>
    </div>
    <div v-if="tone !== 'gallery'" class="folder-logo" aria-hidden="true">
      <i /><i /><i /><i />
    </div>
    <div class="folder-info">
      <strong>{{ title }}</strong>
      <span>{{ subtitle }}</span>
    </div>
  </article>
</template>

<style scoped>
.folder-card {
  min-height: 190px;
  padding: 25px 27px;
  border-radius: 29px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  position: relative;
  box-shadow: 0 28px 48px rgba(93, 101, 108, .22);
}

.folder-card::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 44%;
  background: linear-gradient(transparent, rgba(0,0,0,.07));
  pointer-events: none;
}

.folder-card--green {
  background: var(--gj2-green);
}

.folder-card--blue {
  background: var(--gj2-blue);
}

.folder-card--gallery {
  background:
    radial-gradient(circle at 118% 62%, #59519a 0 18%, #725cb0 19% 28%, transparent 29%),
    linear-gradient(109deg, #101b16 0 28%, transparent 29%),
    linear-gradient(107deg, transparent 0 47%, #ff3f39 48% 72%, transparent 73%),
    linear-gradient(160deg, #f0dba1 0 27%, #6a7780 28% 100%);
}

.folder-top,
.folder-info,
.folder-logo {
  position: relative;
  z-index: 1;
}

.folder-top {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 760;
}

.dots {
  font-size: 24px;
  line-height: 1;
  writing-mode: vertical-rl;
}

.folder-logo {
  width: 43px;
  height: 43px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  transform: rotate(45deg);
}

.folder-logo i {
  display: block;
  border-radius: 2px;
  background: #fff;
}

.folder-info strong {
  display: block;
  white-space: pre-line;
  font-size: 19px;
  line-height: 1.14;
  letter-spacing: .03em;
}

.folder-info span {
  display: block;
  margin-top: 5px;
  color: rgba(255,255,255,.64);
  font-size: 14px;
}
</style>
