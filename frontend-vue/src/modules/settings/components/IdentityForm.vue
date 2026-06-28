<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import type { AdminSettings } from '../types'

const props = defineProps<{
  settings: AdminSettings | null
  save: (patch: Partial<AdminSettings>) => Promise<AdminSettings>
  uploadImage: (file: File) => Promise<string>
}>()

type ImageField =
  | 'favicon_url'
  | 'sidebar_logo_url'
  | 'profile_icon_url'
  | 'login_logo_url'
  | 'login_background_url'

const visualDefaults: Record<string, string> = {
  company_name: 'Gestor J2',
  sidebar_logo_fit: 'contain',
  login_logo_fit: 'contain',
  login_background_position: 'center',
  login_brand_subtitle: 'Central de creditos',
  login_hero_eyebrow: 'Operacao profissional',
  login_hero_title: 'Controle de recargas com presenca de central.',
  login_hero_text: 'Pedidos, creditos, revendedores, servidores, notificacoes e fila de atendimento em uma experiencia unica.',
  login_panel_eyebrow: 'Acesso seguro',
  login_panel_title: 'Entrar no sistema',
  login_login_tab_text: 'Entrar',
  login_register_tab_text: 'Novo revendedor',
  login_submit_text: 'Entrar agora',
  login_register_submit_text: 'Criar acesso',
  login_status_text: 'Online',
  favicon_url: '',
  sidebar_logo_url: '',
  profile_icon_url: '',
  login_logo_url: '',
  login_background_url: '',
}

const imageFields: { key: ImageField; label: string; hint: string; wide?: boolean }[] = [
  { key: 'favicon_url', label: 'Favicon', hint: 'Icone exibido na aba do navegador.' },
  { key: 'sidebar_logo_url', label: 'Logo da sidebar', hint: 'Marca exibida no menu lateral.' },
  { key: 'profile_icon_url', label: 'Icone do perfil', hint: 'Imagem padrao para usuarios sem foto.' },
  { key: 'login_logo_url', label: 'Logo do login', hint: 'Marca principal da tela publica.' },
  { key: 'login_background_url', label: 'Fundo do login', hint: 'Imagem de fundo da area visual do login.', wide: true },
]

const textFields = [
  { key: 'company_name', label: 'Nome da marca' },
  { key: 'login_brand_subtitle', label: 'Subtitulo da marca' },
  { key: 'login_status_text', label: 'Status no topo' },
  { key: 'login_hero_eyebrow', label: 'Etiqueta principal' },
  { key: 'login_hero_title', label: 'Titulo principal' },
  { key: 'login_hero_text', label: 'Texto principal', multiline: true },
  { key: 'login_panel_eyebrow', label: 'Etiqueta do painel' },
  { key: 'login_panel_title', label: 'Titulo do painel' },
  { key: 'login_login_tab_text', label: 'Aba de entrada' },
  { key: 'login_register_tab_text', label: 'Aba de cadastro' },
  { key: 'login_submit_text', label: 'Botao de entrada' },
  { key: 'login_register_submit_text', label: 'Botao de cadastro' },
]

const fitOptions = [
  { value: 'contain', label: 'Conter sem cortar' },
  { value: 'cover', label: 'Preencher recortando' },
  { value: 'scale-down', label: 'Reduzir quando precisar' },
]

const positionOptions = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Topo' },
  { value: 'bottom', label: 'Base' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
]

const form = reactive<Record<string, string>>({ ...visualDefaults })
const uploadingKey = ref<ImageField | ''>('')
const saving = ref(false)
const error = ref('')
const success = ref('')

function syncForm(settings: AdminSettings | null) {
  Object.entries(visualDefaults).forEach(([key, fallback]) => {
    form[key] = String((settings as Record<string, unknown> | null)?.[key] ?? fallback)
  })
}

watch(() => props.settings, syncForm, { immediate: true })

const preview = computed(() => ({
  company: form.company_name || visualDefaults.company_name,
  subtitle: form.login_brand_subtitle || visualDefaults.login_brand_subtitle,
  status: form.login_status_text || visualDefaults.login_status_text,
  logo: form.login_logo_url || form.sidebar_logo_url,
  logoFit: form.login_logo_fit || 'contain',
  sidebarLogo: form.sidebar_logo_url || form.login_logo_url,
  sidebarLogoFit: form.sidebar_logo_fit || 'contain',
  background: form.login_background_url,
  backgroundPosition: form.login_background_position || 'center',
  eyebrow: form.login_hero_eyebrow || visualDefaults.login_hero_eyebrow,
  title: form.login_hero_title || visualDefaults.login_hero_title,
  text: form.login_hero_text || visualDefaults.login_hero_text,
  panelEyebrow: form.login_panel_eyebrow || visualDefaults.login_panel_eyebrow,
  panelTitle: form.login_panel_title || visualDefaults.login_panel_title,
  loginTab: form.login_login_tab_text || visualDefaults.login_login_tab_text,
  registerTab: form.login_register_tab_text || visualDefaults.login_register_tab_text,
  submit: form.login_submit_text || visualDefaults.login_submit_text,
}))

function setValue(key: string, event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  form[key] = target.value
}

async function savePatch(patch: Partial<AdminSettings>, message: string) {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await props.save(patch)
    success.value = message
    window.setTimeout(() => {
      if (success.value === message) success.value = ''
    }, 3000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel salvar a identidade visual.'
  } finally {
    saving.value = false
  }
}

async function onFile(key: ImageField, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingKey.value = key
  error.value = ''
  success.value = ''
  try {
    const url = await props.uploadImage(file)
    form[key] = url
    await savePatch({ [key]: url } as Partial<AdminSettings>, 'Imagem salva e posicionada.')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao enviar a imagem.'
  } finally {
    uploadingKey.value = ''
    input.value = ''
  }
}

async function clearImage(key: ImageField) {
  form[key] = ''
  await savePatch({ [key]: '' } as Partial<AdminSettings>, 'Imagem removida.')
}

async function saveAll() {
  await savePatch({ ...form } as Partial<AdminSettings>, 'Identidade visual salva.')
}
</script>

<template>
  <div class="set-form">
    <div class="set-head">
      <div class="set-head-icon">IMG</div>
      <div>
        <h2>Identidade visual</h2>
        <p>Controle logos, favicon, textos, imagem de fundo e apresentacao completa da tela de login.</p>
      </div>
    </div>

    <div v-if="success" class="set-success">{{ success }}</div>
    <div v-if="error" class="set-error">{{ error }}</div>

    <section class="set-section">
      <h3>Logos e imagens</h3>
      <p>Cada upload salva diretamente no campo correto usado pelo sistema.</p>

      <div class="identity-grid">
        <article v-for="field in imageFields" :key="field.key" class="identity-item" :class="{ wide: field.wide }">
          <div class="identity-preview">
            <img v-if="form[field.key]" :src="form[field.key]" :alt="field.label" />
            <span v-else>Sem imagem</span>
          </div>
          <div class="identity-info">
            <h4>{{ field.label }}</h4>
            <p>{{ field.hint }}</p>
            <div class="identity-actions">
              <label class="set-btn identity-upload">
                <input type="file" accept="image/*" hidden @change="(event) => onFile(field.key, event)" />
                {{ uploadingKey === field.key ? 'Enviando...' : form[field.key] ? 'Trocar' : 'Selecionar' }}
              </label>
              <button v-if="form[field.key]" class="set-btn set-btn--danger" type="button" @click="clearImage(field.key)">
                Remover
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="set-section">
      <h3>Encaixe e posicao</h3>
      <p>Ajuste como as imagens serao renderizadas no login e na sidebar.</p>

      <div class="set-grid">
        <label class="set-field">
          <span>Encaixe da logo na sidebar</span>
          <select :value="form.sidebar_logo_fit" @change="(event) => setValue('sidebar_logo_fit', event)">
            <option v-for="option in fitOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="set-field">
          <span>Encaixe da logo no login</span>
          <select :value="form.login_logo_fit" @change="(event) => setValue('login_logo_fit', event)">
            <option v-for="option in fitOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="set-field full">
          <span>Posicao do background do login</span>
          <select :value="form.login_background_position" @change="(event) => setValue('login_background_position', event)">
            <option v-for="option in positionOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="set-section">
      <h3>Textos do login</h3>
      <p>Edite o que o visitante ve antes de entrar no sistema.</p>

      <div class="set-grid">
        <label v-for="field in textFields" :key="field.key" class="set-field" :class="{ full: field.multiline }">
          <span>{{ field.label }}</span>
          <textarea
            v-if="field.multiline"
            :value="form[field.key]"
            rows="4"
            @input="(event) => setValue(field.key, event)"
          />
          <input v-else :value="form[field.key]" @input="(event) => setValue(field.key, event)" />
        </label>
      </div>
    </section>

    <section class="visual-preview" aria-label="Previa visual do login">
      <div
        class="preview-showcase"
        :style="{
          '--preview-image': preview.background ? `url(${preview.background})` : 'linear-gradient(135deg, rgba(255, 75, 18, .14), transparent)',
          '--preview-position': preview.backgroundPosition,
        }"
      >
        <div class="preview-top">
          <div class="preview-brand">
            <div class="preview-logo">
              <img v-if="preview.logo" :src="preview.logo" :alt="preview.company" :style="`object-fit: ${preview.logoFit}`" />
              <span v-else>J2</span>
            </div>
            <div>
              <strong>{{ preview.company }}</strong>
              <small>{{ preview.subtitle }}</small>
            </div>
          </div>
          <em>{{ preview.status }}</em>
        </div>
        <div class="preview-copy">
          <span>{{ preview.eyebrow }}</span>
          <h4>{{ preview.title }}</h4>
          <p>{{ preview.text }}</p>
        </div>
      </div>

      <div class="preview-panel">
        <span>{{ preview.panelEyebrow }}</span>
        <h4>{{ preview.panelTitle }}</h4>
        <div class="preview-tabs">
          <b>{{ preview.loginTab }}</b>
          <em>{{ preview.registerTab }}</em>
        </div>
        <i />
        <i class="short" />
        <span class="preview-submit">{{ preview.submit }}</span>
      </div>

      <div class="preview-sidebar">
        <div class="preview-sidebar-logo">
          <img v-if="preview.sidebarLogo" :src="preview.sidebarLogo" :alt="preview.company" :style="`object-fit: ${preview.sidebarLogoFit}`" />
          <span v-else>J2</span>
        </div>
        <div>
          <strong>{{ preview.company }}</strong>
          <small>Logo da sidebar</small>
        </div>
      </div>
    </section>

    <div class="set-actions">
      <button class="set-btn set-btn--primary" type="button" :disabled="saving" @click="saveAll">
        {{ saving ? 'Salvando...' : 'Salvar textos e posicoes' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.identity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.identity-item {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: var(--gj2-row-bg);
  border: 1px solid var(--gj2-line);
}

.identity-item.wide {
  grid-column: 1 / -1;
}

.identity-preview {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--gj2-surface-muted);
  color: var(--gj2-muted);
  font-size: 11px;
  font-weight: 800;
}

.identity-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.identity-info {
  min-width: 0;
}

.identity-info h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 850;
  color: var(--gj2-ink);
}

.identity-info p {
  margin: 4px 0 10px;
  color: var(--gj2-muted);
  font-size: 12px;
}

.identity-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 132px), max-content));
  gap: 8px;
}

.identity-actions .set-btn {
  min-height: 38px;
  padding: 0 13px;
  font-size: 12px;
}

.identity-upload {
  cursor: pointer;
}

.visual-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(min(100%, 240px), .8fr);
  grid-template-areas:
    "showcase panel"
    "sidebar panel";
  gap: 14px;
}

.preview-showcase,
.preview-panel,
.preview-sidebar {
  border-radius: 24px;
  border: 1px solid var(--gj2-card-border);
  background: var(--gj2-card-bg);
  box-shadow: var(--gj2-shadow-card);
}

.preview-showcase {
  grid-area: showcase;
  min-height: 310px;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
  background: #07100d;
}

.preview-showcase::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: linear-gradient(135deg, rgba(0, 0, 0, .68), rgba(0, 0, 0, .86)), var(--preview-image);
  background-position: var(--preview-position);
  background-size: cover;
}

.preview-top,
.preview-brand,
.preview-tabs,
.preview-sidebar {
  display: flex;
  align-items: center;
}

.preview-top {
  justify-content: space-between;
  gap: 12px;
}

.preview-brand {
  gap: 10px;
}

.preview-logo,
.preview-sidebar-logo {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #fff;
  background: var(--gj2-sidebar);
  font-weight: 900;
}

.preview-logo img,
.preview-sidebar-logo img {
  width: 100%;
  height: 100%;
  padding: 7px;
}

.preview-brand strong,
.preview-brand small,
.preview-copy span,
.preview-copy h4,
.preview-copy p {
  display: block;
  margin: 0;
}

.preview-brand small,
.preview-copy p {
  color: rgba(255, 255, 255, .72);
}

.preview-top em {
  padding: 8px 11px;
  border-radius: 999px;
  color: #ffae87;
  background: rgba(255, 75, 18, .12);
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
}

.preview-copy {
  max-width: 460px;
}

.preview-copy span,
.preview-panel > span {
  color: var(--gj2-green);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.preview-copy h4 {
  margin-top: 8px;
  font-size: clamp(30px, 5vw, 52px);
  line-height: .92;
  font-weight: 950;
}

.preview-copy p {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.preview-panel {
  grid-area: panel;
  padding: 20px;
  display: grid;
  align-content: center;
  gap: 12px;
}

.preview-panel h4 {
  margin: 0;
  color: var(--gj2-ink);
  font-size: 28px;
  line-height: .98;
}

.preview-tabs {
  padding: 6px;
  border-radius: 16px;
  gap: 6px;
  background: var(--gj2-surface-muted);
}

.preview-tabs b,
.preview-tabs em {
  flex: 1;
  min-height: 34px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 12px;
}

.preview-tabs b {
  color: #fff;
  background: var(--gj2-sidebar);
}

.preview-tabs em {
  color: var(--gj2-muted);
  font-style: normal;
}

.preview-panel i {
  height: 42px;
  border-radius: 14px;
  background: var(--gj2-surface-muted);
}

.preview-panel i.short {
  width: 72%;
}

.preview-submit {
  min-height: 44px;
  border: 0;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--gj2-green-deep);
  font-weight: 900;
}

.preview-sidebar {
  grid-area: sidebar;
  gap: 12px;
  padding: 16px;
}

.preview-sidebar strong,
.preview-sidebar small {
  display: block;
}

.preview-sidebar strong {
  color: var(--gj2-ink);
}

.preview-sidebar small {
  color: var(--gj2-muted);
}

@media (max-width: 980px) {
  .visual-preview {
    grid-template-columns: 1fr;
    grid-template-areas:
      "showcase"
      "panel"
      "sidebar";
  }
}

@media (max-width: 720px) {
  .identity-grid {
    grid-template-columns: 1fr;
  }

  .identity-item,
  .identity-item.wide {
    grid-column: auto;
    grid-template-columns: 78px minmax(0, 1fr);
  }

  .identity-preview {
    width: 78px;
    height: 78px;
  }

  .identity-actions {
    grid-template-columns: 1fr;
  }

  .identity-actions .set-btn,
  .identity-upload {
    width: 100%;
  }

  .preview-top {
    display: grid;
  }

  .preview-top em {
    justify-self: start;
  }

  .preview-tabs {
    grid-template-columns: 1fr;
    display: grid;
  }
}

/* ── Dark mode ─────────────────────────────────────── */
html[data-theme="dark"] .identity-item {
  background: var(--gj2-surface-muted);
}

html[data-theme="dark"] .identity-preview {
  background: var(--gj2-surface);
}

html[data-theme="dark"] .preview-showcase,
html[data-theme="dark"] .preview-panel,
html[data-theme="dark"] .preview-sidebar {
  background: var(--gj2-surface);
  border: 1px solid var(--gj2-card-border);
}
</style>
