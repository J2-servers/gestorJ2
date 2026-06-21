<script setup lang="ts">
import UiToast from '@/components/feedback/UiToast.vue'
import InstallPrompt from '@/components/pwa/InstallPrompt.vue'
</script>

<template>
  <RouterView />
  <UiToast />
  <InstallPrompt />
</template>
