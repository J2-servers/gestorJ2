import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

function BrandMark({ branding }) {
  return (
    <div
      className={`login-mark ${branding.loginLogoUrl ? "has-logo" : ""}`}
      style={{ "--login-logo-fit": branding.loginLogoFit || "contain" }}
    >
      {branding.loginLogoUrl
        ? <img src={branding.loginLogoUrl} alt={branding.companyName || "Gestor J2"} />
        : <Zap size={29} strokeWidth={2.6} />}
    </div>
  );
}

const loginBrandDefaults = {
  companyName: "Gestor J2",
  loginBrandSubtitle: "Central de creditos",
  loginHeroEyebrow: "Operacao profissional",
  loginHeroTitle: "Controle de recargas com presenca de central.",
  loginHeroText: "Pedidos, creditos, revendedores, servidores, notificacoes e fila de atendimento em uma experiencia unica.",
  loginPanelEyebrow: "Acesso seguro",
  loginPanelTitle: "Entrar no sistema",
  loginLoginTabText: "Entrar",
  loginRegisterTabText: "Novo revendedor",
  loginSubmitText: "Entrar agora",
  loginRegisterSubmitText: "Criar acesso",
  loginStatusText: "Online",
  loginLogoFit: "contain",
  loginBackgroundPosition: "center",
};

function textOr(value, fallback) {
  return String(value || "").trim() || fallback;
}

function setFavicon(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

function LoginField({ icon: Icon, children, label }) {
  return (
    <label className="login-field">
      <span>{Icon && <Icon size={15} />} {label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ onChange, placeholder, value }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="login-password-wrap">
      <input
        minLength={6}
        onChange={onChange}
        placeholder={placeholder}
        required
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function ErrorBox({ children }) {
  if (!children) return null;
  return (
    <div className="login-error" role="alert">
      {children}
    </div>
  );
}

function StatLine({ icon: Icon, label, value }) {
  return (
    <div className="login-stat-line">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Login() {
  const { checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [error, setError] = useState("");

  const [branding, setBranding] = useState({ ...loginBrandDefaults, loginLogoUrl: null, loginBackgroundUrl: null, faviconUrl: null });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [setupForm, setSetupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    recoveryEmail: "",
    recoveryPassword: "",
    confirmRecoveryPassword: "",
  });

  useEffect(() => {
    let alive = true;
    remoteClient.auth.bootstrapStatus()
      .then((status) => {
        if (alive) setCanBootstrap(Boolean(status?.canBootstrap));
      })
      .catch(() => {
        if (alive) setCanBootstrap(false);
      })
      .finally(() => {
        if (alive) setBootstrapLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    remoteClient.settings.branding()
      .then((b) => {
        if (alive && b) setBranding((current) => ({ ...current, ...b }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.title = textOr(branding.companyName, "Gestor J2");
    setFavicon(branding.faviconUrl);
  }, [branding.companyName, branding.faviconUrl]);

  const copy = useMemo(() => {
    if (canBootstrap) {
      return {
        eyebrow: "Primeira ativação",
        title: "Fundação segura para o Gestor J2.",
        text: "Crie o admin operacional e a conta de recuperação. Depois disso, a criação de novos administradores fica bloqueada.",
      };
    }
    return {
      eyebrow: textOr(branding.loginHeroEyebrow, loginBrandDefaults.loginHeroEyebrow),
      title: textOr(branding.loginHeroTitle, loginBrandDefaults.loginHeroTitle),
      text: textOr(branding.loginHeroText, loginBrandDefaults.loginHeroText),
    };
  }, [branding.loginHeroEyebrow, branding.loginHeroText, branding.loginHeroTitle, canBootstrap]);

  const handleBootstrap = async (event) => {
    event.preventDefault();
    setError("");

    if (setupForm.password !== setupForm.confirmPassword) {
      setError("A senha do admin operacional não confere.");
      return;
    }
    if (setupForm.recoveryPassword !== setupForm.confirmRecoveryPassword) {
      setError("A senha da conta de recuperação não confere.");
      return;
    }
    if (setupForm.email === setupForm.recoveryEmail) {
      setError("Use emails diferentes para as duas contas administrativas.");
      return;
    }

    setLoading(true);
    try {
      await remoteClient.auth.bootstrap({
        name: setupForm.name,
        email: setupForm.email,
        password: setupForm.password,
        recoveryEmail: setupForm.recoveryEmail,
        recoveryPassword: setupForm.recoveryPassword,
      });
      await checkUserAuth();
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      setError(err.message || "Não foi possível criar os administradores iniciais.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await remoteClient.auth.login(loginForm.email, loginForm.password);
      await checkUserAuth();
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      setError(err.message || "Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await remoteClient.auth.register({
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
      });
      await checkUserAuth();
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      setError(err.message || "Erro ao criar conta de revendedor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className={`login-shell ${canBootstrap ? "setup" : ""}`}>
        <section
          className="login-showcase"
          style={{
            "--login-image": branding.loginBackgroundUrl
              ? `url(${branding.loginBackgroundUrl})`
              : "linear-gradient(135deg, rgba(255,75,18,.10), transparent)",
            "--login-bg-position": branding.loginBackgroundPosition || "center",
          }}
        >
          <header className="login-showcase-top">
            <div className="login-brand-row">
              <BrandMark branding={branding} />
              <div>
                <strong>{branding.companyName || "Gestor J2"}</strong>
                <span>{textOr(branding.loginBrandSubtitle, loginBrandDefaults.loginBrandSubtitle)}</span>
              </div>
            </div>
            <div className="login-health-pill">
              <CheckCircle2 size={14} />
              {textOr(branding.loginStatusText, loginBrandDefaults.loginStatusText)}
            </div>
          </header>

          <div className="login-copy">
            <span>{copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
          </div>

          <div className="login-command-center" aria-hidden="true">
            <div className="login-chart-panel">
              <div className="login-chart-head">
                <span>Fluxo de pedidos</span>
                <strong>Hoje</strong>
              </div>
              <div className="login-chart-bars">
                {[36, 54, 42, 72, 88, 63, 49, 30].map((height, index) => (
                  <i key={index} style={{ "--bar": `${height}%` }} />
                ))}
              </div>
            </div>

            <div className="login-stack">
              <StatLine icon={Activity} label="Fila ativa" value="12" />
              <StatLine icon={MessageCircle} label="Avisos WA" value="OK" />
              <StatLine icon={Layers} label="Servidores" value="Sincronizados" />
            </div>

            <div className="login-radar">
              <Gauge size={24} />
              <strong>98%</strong>
              <span>operação estável</span>
            </div>
          </div>
        </section>

        <section className="login-panel" aria-label="Acesso ao sistema">
          <div className="login-panel-head">
            <div>
              <span>{canBootstrap ? "Configuração inicial" : textOr(branding.loginPanelEyebrow, loginBrandDefaults.loginPanelEyebrow)}</span>
              <h2>{canBootstrap ? "Criar administradores" : tab === "login" ? textOr(branding.loginPanelTitle, loginBrandDefaults.loginPanelTitle) : "Cadastrar revendedor"}</h2>
            </div>
            <div className="login-secure-mark">
              <ShieldCheck size={20} />
            </div>
          </div>

          {bootstrapLoading ? (
            <div className="login-loading">
              <Loader2 className="login-spin" size={27} />
              <strong>Verificando instalação</strong>
              <span>Preparando a entrada correta para este ambiente.</span>
            </div>
          ) : canBootstrap ? (
            <form className="login-form" onSubmit={handleBootstrap}>
              <div className="login-setup-grid">
                <section className="login-setup-section">
                  <div className="login-section-title">
                    <ShieldCheck size={17} />
                    Admin operacional
                  </div>
                  <input
                    onChange={(event) => setSetupForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nome do admin"
                    required
                    type="text"
                    value={setupForm.name}
                  />
                  <input
                    onChange={(event) => setSetupForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email do admin"
                    required
                    type="email"
                    value={setupForm.email}
                  />
                  <PasswordInput
                    onChange={(event) => setSetupForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Senha do admin"
                    value={setupForm.password}
                  />
                  <PasswordInput
                    onChange={(event) => setSetupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    placeholder="Confirmar senha"
                    value={setupForm.confirmPassword}
                  />
                </section>

                <section className="login-setup-section">
                  <div className="login-section-title">
                    <KeyRound size={17} />
                    Conta de recuperação
                  </div>
                  <input
                    onChange={(event) => setSetupForm((current) => ({ ...current, recoveryEmail: event.target.value }))}
                    placeholder="Email de recuperação"
                    required
                    type="email"
                    value={setupForm.recoveryEmail}
                  />
                  <PasswordInput
                    onChange={(event) => setSetupForm((current) => ({ ...current, recoveryPassword: event.target.value }))}
                    placeholder="Senha de recuperação"
                    value={setupForm.recoveryPassword}
                  />
                  <PasswordInput
                    onChange={(event) => setSetupForm((current) => ({ ...current, confirmRecoveryPassword: event.target.value }))}
                    placeholder="Confirmar senha"
                    value={setupForm.confirmRecoveryPassword}
                  />
                </section>
              </div>

              <ErrorBox>{error}</ErrorBox>

              <button className="login-submit" disabled={loading} type="submit">
                {loading ? <Loader2 className="login-spin" size={17} /> : <ShieldCheck size={17} />}
                <span>{loading ? "Criando administradores..." : "Criar os 2 administradores"}</span>
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>
          ) : (
            <>
              <div className="login-tabs">
                <button className={tab === "login" ? "active" : ""} onClick={() => { setTab("login"); setError(""); }} type="button">
                  {textOr(branding.loginLoginTabText, loginBrandDefaults.loginLoginTabText)}
                </button>
                <button className={tab === "register" ? "active" : ""} onClick={() => { setTab("register"); setError(""); }} type="button">
                  {textOr(branding.loginRegisterTabText, loginBrandDefaults.loginRegisterTabText)}
                </button>
              </div>

              <ErrorBox>{error}</ErrorBox>

              {tab === "login" ? (
                <form className="login-form" onSubmit={handleLogin}>
                  <LoginField icon={Mail} label="Email">
                    <input
                      autoComplete="email"
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="seuemail@dominio.com"
                      required
                      type="email"
                      value={loginForm.email}
                    />
                  </LoginField>
                  <LoginField icon={Lock} label="Senha">
                    <PasswordInput
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Sua senha"
                      value={loginForm.password}
                    />
                  </LoginField>
                  <button className="login-submit" disabled={loading} type="submit">
                    {loading ? <Loader2 className="login-spin" size={17} /> : <KeyRound size={17} />}
                    <span>{loading ? "Entrando..." : textOr(branding.loginSubmitText, loginBrandDefaults.loginSubmitText)}</span>
                    {!loading && <ArrowRight size={17} />}
                  </button>
                </form>
              ) : (
                <form className="login-form" onSubmit={handleRegister}>
                  <LoginField icon={UserPlus} label="Nome">
                    <input
                      autoComplete="name"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Nome completo"
                      required
                      type="text"
                      value={registerForm.name}
                    />
                  </LoginField>
                  <LoginField icon={Mail} label="Email">
                    <input
                      autoComplete="email"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="seuemail@dominio.com"
                      required
                      type="email"
                      value={registerForm.email}
                    />
                  </LoginField>
                  <LoginField icon={MessageCircle} label="WhatsApp">
                    <input
                      autoComplete="tel"
                      onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="(11) 99999-9999"
                      required
                      type="tel"
                      value={registerForm.phone}
                    />
                  </LoginField>
                  <LoginField icon={Lock} label="Senha">
                    <PasswordInput
                      onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      value={registerForm.password}
                    />
                  </LoginField>
                  <button className="login-submit" disabled={loading} type="submit">
                    {loading ? <Loader2 className="login-spin" size={17} /> : <UserPlus size={17} />}
                    <span>{loading ? "Criando conta..." : textOr(branding.loginRegisterSubmitText, loginBrandDefaults.loginRegisterSubmitText)}</span>
                    {!loading && <ArrowRight size={17} />}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </main>
      <style>{loginStyles}</style>
    </div>
  );
}

const loginStyles = `
.login-page {
  --login-bg: #030404;
  --login-bg-soft: #080909;
  --login-surface: rgba(7, 8, 8, .96);
  --login-surface-2: rgba(12, 13, 13, .94);
  --login-sunken: rgba(3, 4, 4, .78);
  --login-text: #fff8f2;
  --login-muted: #a3a09b;
  --login-faint: #6f6861;
  --login-accent: #ff4b12;
  --login-accent-deep: #8f1608;
  --login-neu: 12px 16px 34px rgba(0,0,0,.58), -5px -5px 16px rgba(255,255,255,.014), inset 1px 1px 0 rgba(255,255,255,.014);
  --login-neu-soft: 7px 9px 18px rgba(0,0,0,.38), -3px -3px 10px rgba(255,255,255,.014);
  --login-inner: inset 4px 4px 12px rgba(0,0,0,.45), inset -3px -3px 9px rgba(255,255,255,.014);
  width: 100%;
  min-height: 100dvh;
  color: var(--login-text);
  background:
    linear-gradient(90deg, rgba(255,75,18,.035) 0 1px, transparent 1px 100%),
    linear-gradient(180deg, rgba(255,75,18,.024) 0 1px, transparent 1px 100%),
    linear-gradient(135deg, var(--login-bg) 0%, var(--login-bg-soft) 58%, #010202 100%);
  background-size: 64px 64px, 64px 64px, auto;
  overflow-x: hidden;
  color-scheme: dark;
}

.login-shell {
  width: min(1180px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2.8vw, 34px);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(380px, .95fr);
  gap: 18px;
  align-items: center;
}

.login-shell.setup {
  width: min(1280px, 100%);
  grid-template-columns: minmax(0, .88fr) minmax(540px, 1.12fr);
}

.login-showcase,
.login-panel {
  border: 0;
  background: var(--login-surface);
  box-shadow: var(--login-neu);
}

.login-showcase {
  position: relative;
  isolation: isolate;
  min-height: min(720px, calc(100dvh - 68px));
  border-radius: 34px;
  padding: clamp(18px, 3vw, 34px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.login-showcase::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(160deg, rgba(5,6,6,.60), rgba(1,2,2,.94)),
    var(--login-image, linear-gradient(135deg, rgba(255,75,18,.10), transparent));
  background-position: var(--login-bg-position, center);
  background-size: cover;
}

.login-showcase::after {
  content: "";
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 18px;
  height: 1px;
  z-index: -1;
  background: linear-gradient(90deg, transparent, rgba(255,75,18,.58), transparent);
}

.login-showcase-top,
.login-brand-row,
.login-health-pill,
.login-panel-head,
.login-section-title,
.login-stat-line,
.login-submit,
.login-field > span {
  display: flex;
  align-items: center;
}

.login-showcase-top {
  justify-content: space-between;
  gap: 14px;
}

.login-brand-row {
  gap: 12px;
}

.login-mark {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 19px;
  color: #fff;
  overflow: hidden;
  background: linear-gradient(135deg, var(--login-accent), var(--login-accent-deep));
  box-shadow: var(--login-neu-soft);
}

.login-mark.has-logo {
  background: var(--login-sunken);
  box-shadow: var(--login-inner);
}

.login-mark img {
  width: 100%;
  height: 100%;
  object-fit: var(--login-logo-fit, contain);
  padding: 8px;
}

.login-brand-row strong,
.login-panel-head h2,
.login-copy h1,
.login-radar strong,
.login-loading strong {
  color: var(--login-text);
}

.login-brand-row strong {
  display: block;
  font-size: 16px;
  font-weight: 950;
}

.login-brand-row span,
.login-health-pill,
.login-panel-head span,
.login-copy > span,
.login-chart-head span,
.login-loading span {
  color: var(--login-muted);
}

.login-brand-row span {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 800;
}

.login-health-pill {
  min-height: 34px;
  border-radius: 13px;
  padding: 0 12px;
  gap: 7px;
  color: #ff8a4a;
  background: var(--login-sunken);
  box-shadow: var(--login-inner);
  font-size: 11px;
  font-weight: 950;
}

.login-copy {
  max-width: 620px;
  margin: clamp(30px, 8vh, 70px) 0;
}

.login-copy > span,
.login-panel-head span {
  display: block;
  color: var(--login-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.login-copy h1 {
  margin: 8px 0 14px;
  font-size: clamp(48px, 7.8vw, 86px);
  line-height: .86;
  letter-spacing: 0;
  font-weight: 950;
}

.login-copy p {
  max-width: 520px;
  margin: 0;
  color: var(--login-muted);
  font-size: 14px;
  line-height: 1.58;
}

.login-command-center {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(190px, .85fr);
  grid-template-areas:
    "chart stack"
    "chart radar";
  gap: 13px;
}

.login-chart-panel,
.login-stack,
.login-radar,
.login-secure-mark,
.login-loading {
  border: 0;
  background: var(--login-surface-2);
  box-shadow: var(--login-neu-soft);
}

.login-chart-panel {
  grid-area: chart;
  min-height: 230px;
  border-radius: 26px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.login-chart-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  font-weight: 950;
}

.login-chart-head strong {
  color: var(--login-accent);
}

.login-chart-bars {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  align-items: end;
  gap: 11px;
  padding-top: 22px;
}

.login-chart-bars i {
  display: block;
  height: var(--bar);
  min-height: 22px;
  border-radius: 999px 999px 8px 8px;
  background: linear-gradient(180deg, #ff6a19, #8f1608);
  box-shadow: inset 1px 1px 3px rgba(255,255,255,.08), inset -3px -4px 10px rgba(0,0,0,.38);
}

.login-stack {
  grid-area: stack;
  border-radius: 24px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.login-stat-line {
  min-height: 46px;
  border-radius: 15px;
  padding: 0 11px;
  gap: 9px;
  color: var(--login-accent);
  background: var(--login-sunken);
  box-shadow: var(--login-inner);
}

.login-stat-line span {
  min-width: 0;
  flex: 1;
  color: var(--login-muted);
  font-size: 11px;
  font-weight: 850;
}

.login-stat-line strong {
  color: var(--login-text);
  font-size: 12px;
  font-weight: 950;
}

.login-radar {
  grid-area: radar;
  min-height: 126px;
  border-radius: 24px;
  padding: 16px;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--login-accent);
}

.login-radar strong {
  display: block;
  font-size: 34px;
  line-height: 1;
  font-weight: 950;
}

.login-radar span {
  color: var(--login-muted);
  font-size: 11px;
  font-weight: 850;
}

.login-panel {
  min-width: 0;
  border-radius: 34px;
  padding: clamp(18px, 3vw, 34px);
}

.login-panel-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.login-panel-head h2 {
  margin: 5px 0 0;
  font-size: clamp(28px, 4vw, 44px);
  line-height: .92;
  font-weight: 950;
}

.login-secure-mark {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 18px;
  color: var(--login-accent);
}

.login-loading {
  min-height: 260px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 9px;
  text-align: center;
}

.login-tabs {
  margin-bottom: 18px;
  border-radius: 19px;
  padding: 7px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  background: var(--login-sunken);
  box-shadow: var(--login-inner);
}

.login-tabs button {
  border: 0;
  min-height: 44px;
  border-radius: 15px;
  color: var(--login-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
  transition: transform .18s ease, color .18s ease, background .18s ease;
}

.login-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--login-accent), var(--login-accent-deep));
  box-shadow: var(--login-neu-soft);
}

.login-tabs button:active,
.login-submit:active {
  transform: translateY(1px) scale(.99);
}

.login-form {
  display: grid;
  gap: 14px;
}

.login-field {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.login-field > span {
  gap: 7px;
  color: var(--login-muted);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.login-field > span svg {
  color: var(--login-accent);
}

.login-field input,
.login-setup-section input {
  width: 100%;
  min-width: 0;
  min-height: 52px;
  border: 0;
  border-radius: 18px;
  outline: 0;
  color: var(--login-text);
  background: var(--login-sunken);
  box-shadow: var(--login-inner);
  font: inherit;
  font-size: 14px;
}

.login-field input {
  padding: 0 15px;
}

.login-field input::placeholder,
.login-setup-section input::placeholder {
  color: var(--login-faint);
}

.login-password-wrap {
  position: relative;
}

.login-password-wrap input {
  padding-right: 52px;
}

.login-password-wrap button {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--login-accent);
  background: rgba(255,255,255,.035);
  box-shadow: var(--login-neu-soft);
  cursor: pointer;
}

.login-setup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.login-setup-section {
  min-width: 0;
  border: 0;
  border-radius: 24px;
  padding: 15px;
  display: grid;
  gap: 12px;
  background: var(--login-sunken);
  box-shadow: var(--login-inner);
}

.login-section-title {
  gap: 8px;
  color: var(--login-text);
  font-size: 13px;
  font-weight: 950;
}

.login-section-title svg {
  color: var(--login-accent);
}

.login-setup-section input {
  padding: 0 13px;
  background: rgba(8, 9, 9, .84);
  box-shadow: var(--login-neu-soft);
}

.login-submit {
  border: 0;
  min-height: 54px;
  border-radius: 18px;
  justify-content: center;
  gap: 9px;
  color: #fff;
  background: linear-gradient(135deg, var(--login-accent), var(--login-accent-deep));
  box-shadow: var(--login-neu-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
  transition: transform .18s ease, opacity .18s ease;
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: .62;
}

.login-error {
  border: 0;
  border-radius: 17px;
  padding: 12px 13px;
  color: #ffb4a5;
  background: rgba(89, 18, 18, .28);
  box-shadow: var(--login-inner);
  font-size: 12px;
  line-height: 1.45;
}

.login-spin {
  animation: loginSpin .8s linear infinite;
}

@keyframes loginSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .login-shell,
  .login-shell.setup {
    min-height: 100dvh;
    grid-template-columns: 1fr;
    align-items: start;
  }

  .login-showcase {
    min-height: auto;
  }

  .login-copy {
    margin: 42px 0;
  }

  .login-command-center {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "chart"
      "stack"
      "radar";
  }

  .login-stack {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .login-radar {
    min-height: 110px;
  }
}

@media (max-width: 620px) {
  .login-shell,
  .login-shell.setup {
    padding: 10px;
    gap: 12px;
  }

  .login-showcase,
  .login-panel {
    border-radius: 26px;
  }

  .login-showcase {
    padding: 16px;
  }

  .login-showcase-top {
    align-items: flex-start;
  }

  .login-health-pill {
    display: none;
  }

  .login-copy {
    margin: 34px 0 18px;
  }

  .login-copy h1 {
    font-size: clamp(40px, 12.5vw, 58px);
  }

  .login-command-center {
    gap: 10px;
  }

  .login-chart-panel {
    min-height: 170px;
    border-radius: 22px;
  }

  .login-chart-bars {
    gap: 7px;
  }

  .login-stack {
    grid-template-columns: 1fr;
  }

  .login-panel {
    padding: 16px;
  }

  .login-panel-head {
    align-items: flex-start;
  }

  .login-panel-head h2 {
    font-size: clamp(30px, 10vw, 42px);
  }

  .login-tabs,
  .login-setup-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 380px) {
  .login-brand-row strong {
    font-size: 14px;
  }

  .login-brand-row span {
    font-size: 10px;
  }

  .login-mark,
  .login-secure-mark {
    width: 48px;
    height: 48px;
    border-radius: 16px;
  }
}
`;
