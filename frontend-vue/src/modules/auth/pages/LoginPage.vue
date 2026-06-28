<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { authService } from '@/services/api/auth.service'
import { settingsService } from '@/services/api/settings.service'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const brandDefaults = {
  companyName: 'Gestor J2',
  loginBrandSubtitle: 'Central de creditos',
  loginHeroEyebrow: 'Operacao profissional',
  loginHeroTitle: 'Controle de recargas com presenca de central.',
  loginHeroText: 'Pedidos, creditos, revendedores, servidores, notificacoes e fila de atendimento em uma experiencia unica.',
  loginPanelEyebrow: 'Acesso seguro',
  loginPanelTitle: 'Entrar no sistema',
  loginLoginTabText: 'Entrar',
  loginRegisterTabText: 'Novo revendedor',
  loginSubmitText: 'Entrar agora',
  loginRegisterSubmitText: 'Criar acesso',
  loginStatusText: 'Online',
  loginLogoFit: 'contain',
  loginBackgroundPosition: 'center',
  loginLogoUrl: '',
  loginBackgroundUrl: '',
  faviconUrl: '',
}

const branding = reactive({ ...brandDefaults })
const tab = ref<'login' | 'register'>('login')
const bootstrapLoading = ref(true)
const canBootstrap = ref(false)
const localError = ref('')

const loginForm = reactive({ email: '', password: '' })
const registerForm = reactive({ name: '', email: '', phone: '', password: '' })
const setupForm = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  recoveryEmail: '',
  recoveryPassword: '',
  confirmRecoveryPassword: '',
})

function textOr(value: string | undefined, fallback: string) {
  return String(value || '').trim() || fallback
}

function pick(raw: Record<string, unknown>, snake: string, camel: keyof typeof brandDefaults) {
  return String(raw[camel] ?? raw[snake] ?? brandDefaults[camel] ?? '')
}

function setFavicon(url: string) {
  if (!url) return
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}

async function loadBranding() {
  try {
    const raw = (await settingsService.branding()) as Record<string, unknown>
    branding.companyName = pick(raw, 'company_name', 'companyName')
    branding.loginBrandSubtitle = pick(raw, 'login_brand_subtitle', 'loginBrandSubtitle')
    branding.loginHeroEyebrow = pick(raw, 'login_hero_eyebrow', 'loginHeroEyebrow')
    branding.loginHeroTitle = pick(raw, 'login_hero_title', 'loginHeroTitle')
    branding.loginHeroText = pick(raw, 'login_hero_text', 'loginHeroText')
    branding.loginPanelEyebrow = pick(raw, 'login_panel_eyebrow', 'loginPanelEyebrow')
    branding.loginPanelTitle = pick(raw, 'login_panel_title', 'loginPanelTitle')
    branding.loginLoginTabText = pick(raw, 'login_login_tab_text', 'loginLoginTabText')
    branding.loginRegisterTabText = pick(raw, 'login_register_tab_text', 'loginRegisterTabText')
    branding.loginSubmitText = pick(raw, 'login_submit_text', 'loginSubmitText')
    branding.loginRegisterSubmitText = pick(raw, 'login_register_submit_text', 'loginRegisterSubmitText')
    branding.loginStatusText = pick(raw, 'login_status_text', 'loginStatusText')
    branding.loginLogoFit = pick(raw, 'login_logo_fit', 'loginLogoFit')
    branding.loginBackgroundPosition = pick(raw, 'login_background_position', 'loginBackgroundPosition')
    branding.loginLogoUrl = pick(raw, 'login_logo_url', 'loginLogoUrl')
    branding.loginBackgroundUrl = pick(raw, 'login_background_url', 'loginBackgroundUrl')
    branding.faviconUrl = pick(raw, 'favicon_url', 'faviconUrl')
    document.title = branding.companyName || 'Gestor J2'
    setFavicon(branding.faviconUrl)
  } catch {
    document.title = brandDefaults.companyName
  }
}

const heroCopy = computed(() => {
  if (canBootstrap.value) {
    return {
      eyebrow: 'Primeira ativacao',
      title: 'Fundacao segura para o Gestor J2.',
      text: 'Crie o admin operacional e a conta de recuperacao. Depois disso, novos administradores ficam bloqueados.',
    }
  }
  return {
    eyebrow: textOr(branding.loginHeroEyebrow, brandDefaults.loginHeroEyebrow),
    title: textOr(branding.loginHeroTitle, brandDefaults.loginHeroTitle),
    text: textOr(branding.loginHeroText, brandDefaults.loginHeroText),
  }
})

async function afterAuth() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  await router.push(redirect)
}

async function submitLogin() {
  localError.value = ''
  try {
    await auth.login(loginForm.email, loginForm.password)
    await afterAuth()
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Email ou senha incorretos.'
  }
}

async function submitRegister() {
  localError.value = ''
  try {
    await auth.register({ ...registerForm })
    await afterAuth()
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Erro ao criar conta de revendedor.'
  }
}

async function submitBootstrap() {
  localError.value = ''
  if (setupForm.password !== setupForm.confirmPassword) {
    localError.value = 'A senha do admin operacional nao confere.'
    return
  }
  if (setupForm.recoveryPassword !== setupForm.confirmRecoveryPassword) {
    localError.value = 'A senha da conta de recuperacao nao confere.'
    return
  }
  if (setupForm.email === setupForm.recoveryEmail) {
    localError.value = 'Use emails diferentes para as duas contas administrativas.'
    return
  }

  try {
    await auth.bootstrap({
      name: setupForm.name,
      email: setupForm.email,
      password: setupForm.password,
      recoveryEmail: setupForm.recoveryEmail,
      recoveryPassword: setupForm.recoveryPassword,
    })
    await afterAuth()
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Nao foi possivel criar os administradores iniciais.'
  }
}

onMounted(async () => {
  await Promise.all([
    loadBranding(),
    authService.bootstrapStatus()
      .then((status) => {
        canBootstrap.value = Boolean(status?.canBootstrap)
      })
      .catch(() => {
        canBootstrap.value = false
      })
      .finally(() => {
        bootstrapLoading.value = false
      }),
  ])
})
</script>

<template>
  <main
    class="bank-login"
    :class="{ setup: canBootstrap }"
    :style="{
      '--login-image': branding.loginBackgroundUrl ? `url(${branding.loginBackgroundUrl})` : 'linear-gradient(135deg, rgba(255,75,18,.10), transparent)',
      '--login-bg-position': branding.loginBackgroundPosition,
      '--login-logo-fit': branding.loginLogoFit,
    }"
  >
    <section class="bank-shell">
      <aside class="bank-hero">
        <header class="bank-brand">
          <div class="bank-logo" :class="{ 'has-logo': branding.loginLogoUrl }">
            <img v-if="branding.loginLogoUrl" :src="branding.loginLogoUrl" :alt="branding.companyName" />
            <span v-else>J2</span>
          </div>
          <div>
            <strong>{{ branding.companyName }}</strong>
            <small>{{ textOr(branding.loginBrandSubtitle, brandDefaults.loginBrandSubtitle) }}</small>
          </div>
          <b>{{ textOr(branding.loginStatusText, brandDefaults.loginStatusText) }}</b>
        </header>

        <div class="bank-copy">
          <span>{{ heroCopy.eyebrow }}</span>
          <h1>{{ heroCopy.title }}</h1>
          <p>{{ heroCopy.text }}</p>
        </div>

        <div class="bank-visual" aria-hidden="true">
          <section class="bank-card">
            <div>
              <span>Fila de recargas</span>
              <strong>Central J2</strong>
            </div>
            <i />
            <em>WA</em>
          </section>
          <section class="bank-metrics">
            <article><strong>12</strong><span>fila ativa</span></article>
            <article><strong>98%</strong><span>estavel</span></article>
            <article><strong>OK</strong><span>avisos WA</span></article>
          </section>
          <section class="bank-bars">
            <i v-for="height in [34, 58, 43, 77, 91, 66, 50]" :key="height" :style="{ '--bar': `${height}%` }" />
          </section>
        </div>
      </aside>

      <section class="bank-access" aria-label="Acesso ao sistema">
        <div class="access-head">
          <span>{{ canBootstrap ? 'Configuracao inicial' : textOr(branding.loginPanelEyebrow, brandDefaults.loginPanelEyebrow) }}</span>
          <h2>{{ canBootstrap ? 'Criar administradores' : tab === 'login' ? textOr(branding.loginPanelTitle, brandDefaults.loginPanelTitle) : 'Cadastrar revendedor' }}</h2>
        </div>

        <div v-if="bootstrapLoading" class="login-loading">
          <strong>Verificando instalacao</strong>
          <span>Preparando a entrada correta para este ambiente.</span>
        </div>

        <form v-else-if="canBootstrap" class="bank-form" @submit.prevent="submitBootstrap">
          <div class="setup-grid">
            <section>
              <h3>Admin operacional</h3>
              <input v-model="setupForm.name" required placeholder="Nome do admin" />
              <input v-model="setupForm.email" required type="email" placeholder="Email do admin" />
              <input v-model="setupForm.password" required minlength="6" type="password" placeholder="Senha do admin" />
              <input v-model="setupForm.confirmPassword" required minlength="6" type="password" placeholder="Confirmar senha" />
            </section>
            <section>
              <h3>Conta de recuperacao</h3>
              <input v-model="setupForm.recoveryEmail" required type="email" placeholder="Email de recuperacao" />
              <input v-model="setupForm.recoveryPassword" required minlength="6" type="password" placeholder="Senha de recuperacao" />
              <input v-model="setupForm.confirmRecoveryPassword" required minlength="6" type="password" placeholder="Confirmar senha" />
            </section>
          </div>
          <p v-if="localError || auth.error" class="login-error">{{ localError || auth.error }}</p>
          <button class="bank-submit" :disabled="auth.loading" type="submit">
            {{ auth.loading ? 'Criando...' : 'Criar os 2 administradores' }}
          </button>
        </form>

        <template v-else>
          <div class="bank-tabs">
            <button type="button" :class="{ active: tab === 'login' }" @click="tab = 'login'; localError = ''">
              {{ textOr(branding.loginLoginTabText, brandDefaults.loginLoginTabText) }}
            </button>
            <button type="button" :class="{ active: tab === 'register' }" @click="tab = 'register'; localError = ''">
              {{ textOr(branding.loginRegisterTabText, brandDefaults.loginRegisterTabText) }}
            </button>
          </div>

          <p v-if="localError || auth.error" class="login-error">{{ localError || auth.error }}</p>

          <form v-if="tab === 'login'" class="bank-form" @submit.prevent="submitLogin">
            <label>Email<input v-model="loginForm.email" required type="email" autocomplete="email" placeholder="seuemail@dominio.com" /></label>
            <label>Senha<input v-model="loginForm.password" required minlength="6" type="password" autocomplete="current-password" placeholder="Sua senha" /></label>
            <button class="bank-submit" :disabled="auth.loading" type="submit">
              {{ auth.loading ? 'Entrando...' : textOr(branding.loginSubmitText, brandDefaults.loginSubmitText) }}
            </button>
          </form>

          <form v-else class="bank-form" @submit.prevent="submitRegister">
            <label>Nome<input v-model="registerForm.name" required autocomplete="name" placeholder="Nome completo" /></label>
            <label>Email<input v-model="registerForm.email" required type="email" autocomplete="email" placeholder="seuemail@dominio.com" /></label>
            <label>WhatsApp<input v-model="registerForm.phone" required type="tel" autocomplete="tel" placeholder="(11) 99999-9999" /></label>
            <label>Senha<input v-model="registerForm.password" required minlength="6" type="password" placeholder="Minimo 6 caracteres" /></label>
            <button class="bank-submit" :disabled="auth.loading" type="submit">
              {{ auth.loading ? 'Criando...' : textOr(branding.loginRegisterSubmitText, brandDefaults.loginRegisterSubmitText) }}
            </button>
          </form>
        </template>
      </section>
    </section>
  </main>
</template>

<style scoped>
.bank-login {
  --bank-ink: #121619;
  --bank-muted: #69727a;
  --bank-soft: #f3f5f3;
  --bank-card: rgba(255, 255, 255, .88);
  --bank-orange: #ff5127;
  --bank-red: #af1d0a;
  min-height: 100dvh;
  color: var(--bank-ink);
  background:
    radial-gradient(circle at 12% 18%, rgba(255,255,255,.62), transparent 22%),
    radial-gradient(circle at 85% 76%, rgba(255,81,39,.12), transparent 28%),
    linear-gradient(135deg, #aab3b8 0%, #eef1ef 56%, #f8f8f5 100%);
  overflow-x: hidden;
}

.bank-shell {
  width: 100%;
  min-height: 100dvh;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, .82fr);
  gap: 0;
  align-items: stretch;
}

.bank-login.setup .bank-shell {
  width: 100%;
  grid-template-columns: minmax(0, .82fr) minmax(560px, 1.18fr);
}

.bank-hero,
.bank-access {
  border-radius: 0;
}

.bank-hero {
  position: relative;
  isolation: isolate;
  min-height: 100dvh;
  padding: clamp(20px, 3.4vw, 56px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  color: #fff;
}

.bank-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(155deg, rgba(96, 111, 121, .9), rgba(64, 77, 88, .94)),
    var(--login-image);
  background-position: var(--login-bg-position);
  background-size: cover;
  pointer-events: none;
}

.bank-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(circle at 18% 44%, rgba(255,81,39,.28), transparent 20%),
    linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px) 0 0 / 34px 34px,
    linear-gradient(0deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 34px 34px;
  opacity: .8;
  pointer-events: none;
}

.bank-brand {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
}

.bank-logo {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bank-orange), var(--bank-red));
  box-shadow: 0 18px 38px rgba(24, 31, 36, .22);
  font-weight: 950;
}

.bank-logo.has-logo {
  background: rgba(255,255,255,.88);
}

.bank-logo img {
  width: 100%;
  height: 100%;
  object-fit: var(--login-logo-fit);
  padding: 7px;
}

.bank-brand strong,
.bank-brand small,
.bank-brand b {
  display: block;
}

.bank-brand strong {
  font-size: 17px;
  font-weight: 950;
}

.bank-brand small {
  color: rgba(255,255,255,.7);
  font-size: 11px;
  font-weight: 800;
}

.bank-brand b {
  padding: 10px 13px;
  border-radius: 15px;
  background: rgba(255,255,255,.16);
  box-shadow: inset 1px 1px 0 rgba(255,255,255,.18);
  font-size: 11px;
}

.bank-copy {
  max-width: 650px;
  margin: clamp(34px, 8vh, 78px) 0;
}

.bank-copy span,
.access-head span {
  color: var(--bank-orange);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.bank-copy h1 {
  margin: 10px 0 16px;
  font-size: clamp(46px, 7vw, 82px);
  line-height: .88;
  font-weight: 950;
  letter-spacing: 0;
}

.bank-copy p {
  max-width: 540px;
  margin: 0;
  color: rgba(255,255,255,.76);
  font-size: 14px;
  line-height: 1.58;
}

.bank-visual {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(170px, .9fr);
  grid-template-areas: "card metrics" "bars metrics";
  gap: 13px;
}

.bank-card,
.bank-metrics,
.bank-bars {
  background: rgba(255,255,255,.14);
  box-shadow: 0 18px 38px rgba(30, 39, 45, .22), inset 1px 1px 0 rgba(255,255,255,.17);
  backdrop-filter: blur(16px);
}

.bank-card {
  grid-area: card;
  min-height: 148px;
  border-radius: 28px;
  padding: 18px;
  position: relative;
  overflow: hidden;
}

.bank-card i {
  position: absolute;
  right: -26px;
  top: -24px;
  width: 126px;
  height: 126px;
  border-radius: 34px;
  background: linear-gradient(135deg, var(--bank-orange), var(--bank-red));
  transform: rotate(18deg);
  pointer-events: none;
}

.bank-card > *:not(i) {
  position: relative;
  z-index: var(--gj2-z-base);
}

.bank-card em {
  position: absolute;
  right: 22px;
  bottom: 18px;
  font-style: normal;
  font-weight: 950;
}

.bank-card span,
.bank-metrics span {
  color: rgba(255,255,255,.68);
  font-size: 11px;
  font-weight: 820;
}

.bank-card strong {
  display: block;
  margin-top: 7px;
  font-size: 26px;
  line-height: .95;
  font-weight: 950;
}

.bank-metrics {
  grid-area: metrics;
  border-radius: 28px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.bank-metrics article {
  min-height: 74px;
  border-radius: 19px;
  padding: 12px;
  display: grid;
  align-content: center;
  background: rgba(255,255,255,.12);
}

.bank-metrics strong {
  font-size: 24px;
}

.bank-bars {
  grid-area: bars;
  min-height: 150px;
  border-radius: 28px;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: end;
  gap: 10px;
}

.bank-bars i {
  height: var(--bar);
  min-height: 24px;
  border-radius: 999px 999px 8px 8px;
  background: linear-gradient(180deg, #ff6c2f, #8f1608);
}

.bank-access {
  padding: clamp(22px, 3vw, 44px);
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

.bank-access > * {
  width: 100%;
  max-width: 440px;
  margin-inline: auto;
}

.bank-login.setup .bank-access > * {
  max-width: 620px;
}

.access-head {
  margin-bottom: 20px;
}

.access-head h2 {
  margin: 6px 0 0;
  font-size: clamp(30px, 4.8vw, 52px);
  line-height: .9;
  font-weight: 950;
}

.bank-tabs {
  margin-bottom: 18px;
  padding: 6px;
  border-radius: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #eef1ef;
  box-shadow: inset 5px 5px 12px rgba(98, 106, 112, .12), inset -5px -5px 14px rgba(255,255,255,.86);
}

.bank-tabs button {
  border: 0;
  min-height: 44px;
  border-radius: 14px;
  color: var(--bank-muted);
  background: transparent;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.bank-tabs button.active,
.bank-submit {
  color: #fff;
  background: linear-gradient(135deg, var(--bank-orange), var(--bank-red));
  box-shadow: 0 18px 32px rgba(190, 43, 12, .22);
}

.bank-form,
.setup-grid section,
.login-loading {
  display: grid;
  gap: 14px;
}

.bank-form label {
  display: grid;
  gap: 8px;
  color: var(--bank-muted);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.bank-form input {
  min-height: 54px;
  border: 0;
  border-radius: 18px;
  outline: 0;
  color: var(--bank-ink);
  background: #eef2f0;
  box-shadow: inset 5px 5px 12px rgba(98, 106, 112, .12), inset -5px -5px 14px rgba(255,255,255,.86);
  font: inherit;
  font-size: 14px;
  padding: 0 15px;
}

.bank-submit {
  border: 0;
  min-height: 56px;
  border-radius: 18px;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
}

.bank-submit:disabled {
  opacity: .62;
  cursor: not-allowed;
}

.setup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.setup-grid section,
.login-loading {
  border-radius: 24px;
  padding: 16px;
  background: #f1f4f2;
  box-shadow: inset 5px 5px 12px rgba(98, 106, 112, .11), inset -5px -5px 14px rgba(255,255,255,.9);
}

.setup-grid h3 {
  margin: 0;
  color: var(--bank-ink);
  font-size: 13px;
}

.login-loading {
  min-height: 250px;
  place-items: center;
  align-content: center;
  text-align: center;
}

.login-loading span {
  color: var(--bank-muted);
  font-size: 12px;
  font-weight: 780;
}

.login-error {
  margin: 0;
  border-radius: 16px;
  padding: 12px 13px;
  color: #7b1809;
  background: rgba(255, 81, 39, .13);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 980px) {
  .bank-shell,
  .bank-login.setup .bank-shell {
    min-height: 100dvh;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .bank-hero {
    min-height: auto;
  }

  .bank-copy {
    margin: 38px 0 26px;
  }

  .bank-visual {
    grid-template-columns: 1fr;
    grid-template-areas: "card" "metrics" "bars";
  }

  .bank-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

html[data-theme="dark"] .bank-login {
  --bank-ink: #dde1e5;
  --bank-muted: #6e7780;
  --bank-soft: #1e2226;
  --bank-card: rgba(34, 39, 45, .92);
  background:
    radial-gradient(circle at 12% 18%, rgba(255,255,255,.04), transparent 22%),
    radial-gradient(circle at 85% 76%, rgba(255,81,39,.07), transparent 28%),
    linear-gradient(135deg, #0e1012 0%, #181b1e 56%, #1c2024 100%);
}

html[data-theme="dark"] .bank-access {
  background: rgba(28, 32, 37, .96);
  backdrop-filter: blur(18px);
}

html[data-theme="dark"] .bank-tabs {
  background: rgba(13, 16, 19, .7);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
}

html[data-theme="dark"] .bank-form input {
  background: rgba(13, 16, 19, .8);
  color: var(--bank-ink);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}

html[data-theme="dark"] .setup-grid section,
html[data-theme="dark"] .login-loading {
  background: rgba(19, 23, 28, .7);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
}

html[data-theme="dark"] .bank-tabs button.active,
html[data-theme="dark"] .bank-submit {
  color: #fff;
}

html[data-theme="dark"] .login-error {
  color: #ff9086;
  background: rgba(255, 81, 39, .12);
}

html[data-theme="dark"] .bank-access {
  background: rgba(19, 22, 27, .97);
  border: 1px solid rgba(255,255,255,.1);
  box-shadow:
    0 2px 8px rgba(0,0,0,.36),
    0 24px 60px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.06);
}

@media (max-width: 620px) {
  .bank-shell,
  .bank-login.setup .bank-shell {
    padding: 10px;
    gap: 12px;
  }

  .bank-hero,
  .bank-access {
    border-radius: 28px;
  }

  .bank-hero {
    padding: 16px;
  }

  .bank-brand {
    grid-template-columns: 50px minmax(0, 1fr);
  }

  .bank-brand b {
    display: none;
  }

  .bank-logo {
    width: 50px;
    height: 50px;
    border-radius: 17px;
  }

  .bank-copy {
    margin: 28px 0 20px;
  }

  .bank-copy h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .bank-copy p {
    font-size: 13px;
  }

  .bank-card,
  .bank-bars {
    min-height: 122px;
  }

  .bank-metrics,
  .setup-grid,
  .bank-tabs {
    grid-template-columns: 1fr;
  }

  .bank-access {
    padding: 16px;
  }
}
</style>
