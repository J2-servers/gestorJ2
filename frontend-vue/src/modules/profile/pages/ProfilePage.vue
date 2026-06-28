<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import UiButton from '@/components/ui/UiButton.vue'
import { uploadsService } from '@/services/api/uploads.service'
import { usersService } from '@/services/api/users.service'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const form = reactive({
  name: auth.user?.name || '',
  phone: auth.user?.phone || '',
  profileImageUrl: auth.user?.profile_image_url || auth.user?.profileImageUrl || '',
})
const loading = ref(false)
const uploadingPhoto = ref(false)
const status = ref('')
const error = ref('')
const PROFILE_IMAGE_MAX_SOURCE_BYTES = 25 * 1024 * 1024
const PROFILE_IMAGE_TARGET_BYTES = 900 * 1024
const PROFILE_IMAGE_MAX_SIDE = 900

const missingPhone = computed(() => auth.user?.role === 'user' && !String(form.phone || '').trim())

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Nao foi possivel ler esta imagem. Tente outro arquivo.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Nao foi possivel preparar a foto.'))
      else resolve(blob)
    }, 'image/jpeg', quality)
  })
}

async function prepareProfileImage(file: File) {
  if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) {
    throw new Error(`Imagem muito grande (${formatBytes(file.size)}). Escolha uma foto com ate 25 MB.`)
  }

  if (file.type === 'image/gif' && file.size <= PROFILE_IMAGE_TARGET_BYTES) return file

  const image = await loadImage(file)
  const scale = Math.min(1, PROFILE_IMAGE_MAX_SIDE / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Seu navegador nao conseguiu preparar a foto.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let blob = await canvasToBlob(canvas, 0.86)
  if (blob.size > PROFILE_IMAGE_TARGET_BYTES) blob = await canvasToBlob(canvas, 0.74)
  if (blob.size > PROFILE_IMAGE_TARGET_BYTES) blob = await canvasToBlob(canvas, 0.62)

  return new File([blob], 'perfil.jpg', { type: 'image/jpeg', lastModified: Date.now() })
}

async function save() {
  loading.value = true
  status.value = ''
  error.value = ''
  try {
    auth.user = await usersService.updateMe({
      name: form.name,
      phone: form.phone,
      profile_image_url: form.profileImageUrl,
    })
    form.profileImageUrl = auth.user?.profile_image_url || auth.user?.profileImageUrl || ''
    status.value = 'Perfil atualizado.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel salvar o perfil.'
  } finally {
    loading.value = false
  }
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'Envie uma imagem em JPG, PNG ou GIF.'
    input.value = ''
    return
  }

  uploadingPhoto.value = true
  status.value = ''
  error.value = ''
  try {
    const preparedFile = await prepareProfileImage(file)
    const result = await uploadsService.upload(preparedFile) as { fileUrl?: string }
    if (!result.fileUrl) throw new Error('Upload sem URL de retorno.')
    form.profileImageUrl = result.fileUrl
    auth.user = await usersService.updateMe({
      name: form.name,
      phone: form.phone,
      profile_image_url: form.profileImageUrl,
    })
    status.value = 'Foto de perfil atualizada.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel enviar a foto.'
  } finally {
    uploadingPhoto.value = false
    input.value = ''
  }
}

async function removePhoto() {
  form.profileImageUrl = ''
  await save()
}
</script>

<template>
  <div class="module-page">
    <header class="module-hero">
      <div>
        <h1>Meu perfil</h1>
        <p>Atualize os dados usados para notificações, atendimento e criação de pedidos.</p>
      </div>
    </header>

    <section v-if="missingPhone" class="profile-warning">
      <strong>WhatsApp obrigatório</strong>
      <span>Cadastre seu número para receber avisos automáticos e liberar pedidos sem bloqueio.</span>
    </section>

    <div class="profile-layout">
      <aside class="module-card pad profile-summary">
        <div class="profile-avatar">
          <img v-if="form.profileImageUrl" :src="form.profileImageUrl" :alt="form.name || 'Foto do perfil'" />
          <span v-else>{{ (form.name || auth.user?.email || 'J').slice(0, 1).toUpperCase() }}</span>
        </div>
        <h2>{{ form.name || auth.user?.email || 'Usuario' }}</h2>
        <p>{{ auth.isAdmin ? 'Administrador' : 'Revendedor' }}</p>
        <div class="photo-actions">
          <label class="photo-button">
            {{ uploadingPhoto ? 'Enviando...' : 'Trocar foto' }}
            <input :disabled="uploadingPhoto" accept="image/*" type="file" @change="uploadPhoto" />
          </label>
          <button v-if="form.profileImageUrl" type="button" @click="removePhoto">Remover</button>
        </div>
        <div class="module-divider" />
        <small>Email</small>
        <strong>{{ auth.user?.email || '-' }}</strong>
        <small>WhatsApp</small>
        <strong>{{ form.phone || 'Nao cadastrado' }}</strong>
      </aside>

      <form class="module-card pad profile-form" @submit.prevent="save">
        <label class="module-label">
          Nome
          <input v-model="form.name" class="module-input" required />
        </label>
        <label class="module-label">
          WhatsApp
          <input v-model="form.phone" class="module-input" placeholder="11999999999" required type="tel" />
        </label>
        <label class="module-label">
          Email
          <input class="module-input" disabled :value="auth.user?.email || ''" />
        </label>

        <div v-if="status" class="profile-ok">{{ status }}</div>
        <div v-if="error" class="profile-error">{{ error }}</div>
        <UiButton type="submit" :disabled="loading">{{ loading ? 'Salvando...' : 'Salvar alteracoes' }}</UiButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(min(100%, 320px), 320px) minmax(0, 1fr);
  gap: 20px;
}

.profile-summary {
  display: grid;
  gap: 10px;
  align-content: start;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 28px;
  overflow: hidden;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, var(--gj2-green), var(--gj2-blue));
  font-size: 38px;
  font-weight: 900;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), max-content));
  gap: 8px;
}

.photo-button,
.photo-actions button {
  min-height: 36px;
  border: 1px solid rgba(42, 52, 57, .12);
  border-radius: 999px;
  padding: 0 14px;
  display: inline-grid;
  place-items: center;
  color: #244034;
  background: #fff;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.photo-button input {
  display: none;
}

.photo-actions button {
  color: #9b342d;
  background: #fff2ef;
}

.profile-summary p,
.profile-summary small {
  color: var(--gj2-muted);
}

.profile-form {
  display: grid;
  gap: 16px;
}

.profile-warning,
.profile-ok,
.profile-error {
  padding: 16px 18px;
  border-radius: 20px;
  font-weight: 820;
}

.profile-warning {
  display: grid;
  gap: 4px;
  color: #7a5814;
  background: #fff1c2;
}

.profile-ok {
  color: #426c55;
  background: #e8f7ee;
}

.profile-error {
  color: #a42f2b;
  background: #ffe3e0;
}

@media (max-width: 860px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }

  .photo-actions {
    grid-template-columns: 1fr;
  }

  .photo-button,
  .photo-actions button,
  .profile-form :deep(.ui-button) {
    width: 100%;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .photo-button {
  background: var(--gj2-surface-muted);
  border-color: var(--gj2-line);
  color: var(--gj2-ink);
}

html[data-theme="dark"] .photo-actions button {
  background: rgba(255, 72, 64, .1);
  color: #ff9086;
}

html[data-theme="dark"] .profile-warning {
  background: rgba(212, 165, 20, .12);
  color: #d4a514;
}

html[data-theme="dark"] .profile-ok {
  background: rgba(93, 148, 120, .12);
  color: #7fbfa0;
}

html[data-theme="dark"] .profile-error {
  background: rgba(255, 72, 64, .1);
  color: #ff9086;
}
</style>
