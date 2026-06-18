import React, { useEffect, useState } from "react";
import { KeyRound, Loader2, Lock, Mail, ShieldCheck, UserPlus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

function LoginField({ icon: Icon, ...props }) {
  return (
    <label className="login-field">
      <Icon size={16} />
      <input {...props} />
    </label>
  );
}

function ErrorBox({ children }) {
  if (!children) return null;
  return <div className="login-error">{children}</div>;
}

export default function Login() {
  const { checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [canBootstrap, setCanBootstrap] = useState(false);
  const [error, setError] = useState("");

  const [branding, setBranding] = useState({ companyName: "Gestor J2", loginLogoUrl: null, loginBackgroundUrl: null });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
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

  // Branding publico (logo/fundo/nome) configurado pelo admin em Configuracoes.
  useEffect(() => {
    let alive = true;
    remoteClient.settings.branding()
      .then((b) => { if (alive && b) setBranding((cur) => ({ ...cur, ...b })); })
      .catch(() => { /* mantem o padrao Gestor J2 */ });
    return () => { alive = false; };
  }, []);

  const handleBootstrap = async (event) => {
    event.preventDefault();
    setError("");

    if (setupForm.password !== setupForm.confirmPassword) {
      setError("A senha do admin operacional nao confere.");
      return;
    }
    if (setupForm.recoveryPassword !== setupForm.confirmRecoveryPassword) {
      setError("A senha da conta de recuperacao nao confere.");
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
      setError(err.message || "Nao foi possivel criar os administradores iniciais.");
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
      await remoteClient.auth.register(registerForm);
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
          className="login-brand"
          style={branding.loginBackgroundUrl ? { backgroundImage: `linear-gradient(160deg, rgba(6,7,7,.82), rgba(1,2,2,.92)), url(${branding.loginBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          <div className={`login-mark ${branding.loginLogoUrl ? "has-logo" : ""}`}>
            {branding.loginLogoUrl
              ? <img src={branding.loginLogoUrl} alt={branding.companyName || "Logo"} />
              : <Zap size={30} />}
          </div>
          <span>{branding.companyName || "Gestor J2"}</span>
          <h1>{canBootstrap ? "Criar base administrativa" : "Entrar no painel"}</h1>
          <p>
            {canBootstrap
              ? "Configure o admin operacional e a conta de recuperacao. Esse passo fecha depois de concluido."
              : "Gestao de creditos, recargas, revendedores e operacao em tempo real."}
          </p>
        </section>

        <section className="login-panel">
          {bootstrapLoading ? (
            <div className="login-loading">
              <Loader2 className="login-spin" size={26} />
              Verificando instalacao...
            </div>
          ) : canBootstrap ? (
            <form className="login-form" onSubmit={handleBootstrap}>
              <div className="login-setup-grid">
                <div className="login-setup-section">
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
                  <input
                    minLength={6}
                    onChange={(event) => setSetupForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Senha do admin"
                    required
                    type="password"
                    value={setupForm.password}
                  />
                  <input
                    minLength={6}
                    onChange={(event) => setSetupForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    placeholder="Confirmar senha do admin"
                    required
                    type="password"
                    value={setupForm.confirmPassword}
                  />
                </div>

                <div className="login-setup-section">
                  <div className="login-section-title">
                    <KeyRound size={17} />
                    Conta de recuperacao
                  </div>
                  <input
                    onChange={(event) => setSetupForm((current) => ({ ...current, recoveryEmail: event.target.value }))}
                    placeholder="Email de recuperacao"
                    required
                    type="email"
                    value={setupForm.recoveryEmail}
                  />
                  <input
                    minLength={6}
                    onChange={(event) => setSetupForm((current) => ({ ...current, recoveryPassword: event.target.value }))}
                    placeholder="Senha de recuperacao"
                    required
                    type="password"
                    value={setupForm.recoveryPassword}
                  />
                  <input
                    minLength={6}
                    onChange={(event) => setSetupForm((current) => ({ ...current, confirmRecoveryPassword: event.target.value }))}
                    placeholder="Confirmar senha de recuperacao"
                    required
                    type="password"
                    value={setupForm.confirmRecoveryPassword}
                  />
                </div>
              </div>

              <ErrorBox>{error}</ErrorBox>

              <button className="login-submit" disabled={loading} type="submit">
                {loading ? <Loader2 className="login-spin" size={17} /> : <ShieldCheck size={17} />}
                {loading ? "Criando administradores..." : "Criar os 2 administradores"}
              </button>
            </form>
          ) : (
            <>
              <div className="login-tabs">
                <button className={tab === "login" ? "active" : ""} onClick={() => { setTab("login"); setError(""); }} type="button">
                  Entrar
                </button>
                <button className={tab === "register" ? "active" : ""} onClick={() => { setTab("register"); setError(""); }} type="button">
                  Cadastrar revendedor
                </button>
              </div>

              <ErrorBox>{error}</ErrorBox>

              {tab === "login" ? (
                <form className="login-form" onSubmit={handleLogin}>
                  <LoginField
                    icon={Mail}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    required
                    type="email"
                    value={loginForm.email}
                  />
                  <LoginField
                    icon={Lock}
                    minLength={6}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Senha"
                    required
                    type="password"
                    value={loginForm.password}
                  />
                  <button className="login-submit" disabled={loading} type="submit">
                    {loading ? <Loader2 className="login-spin" size={17} /> : <KeyRound size={17} />}
                    {loading ? "Entrando..." : "Entrar"}
                  </button>
                </form>
              ) : (
                <form className="login-form" onSubmit={handleRegister}>
                  <LoginField
                    icon={UserPlus}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Nome completo"
                    required
                    type="text"
                    value={registerForm.name}
                  />
                  <LoginField
                    icon={Mail}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                    required
                    type="email"
                    value={registerForm.email}
                  />
                  <LoginField
                    icon={Lock}
                    minLength={6}
                    onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Senha (minimo 6 caracteres)"
                    required
                    type="password"
                    value={registerForm.password}
                  />
                  <button className="login-submit" disabled={loading} type="submit">
                    {loading ? <Loader2 className="login-spin" size={17} /> : <UserPlus size={17} />}
                    {loading ? "Criando conta..." : "Criar conta de revendedor"}
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
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: radial-gradient(circle at 18% 8%, rgba(255, 75, 18, .08), transparent 22%),
    linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.login-shell {
  width: min(1040px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 3vw, 34px);
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(390px, 1.05fr);
  gap: 18px;
  align-items: center;
}

.login-shell.setup {
  width: min(1180px, 100%);
  grid-template-columns: minmax(280px, .72fr) minmax(0, 1.28fr);
}

.login-brand,
.login-panel,
.login-loading {
  border: 0;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.login-brand {
  min-height: 520px;
  border-radius: 32px;
  padding: clamp(22px, 4vw, 38px);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.login-mark {
  width: 76px;
  height: 76px;
  margin-bottom: auto;
  display: grid;
  place-items: center;
  border-radius: 25px;
  color: #fff;
  overflow: hidden;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 8px 9px 20px rgba(0, 0, 0, .38), -2px -2px 8px rgba(255, 255, 255, .014);
}

/* Quando ha logo configurada, mostra a imagem em um fundo neutro escuro. */
.login-mark.has-logo {
  width: clamp(76px, 9vw, 108px);
  height: clamp(76px, 9vw, 108px);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.login-mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
}

.login-brand span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.login-brand h1 {
  margin: 7px 0 12px;
  max-width: 480px;
  color: var(--j2-text);
  font-size: clamp(45px, 7vw, 78px);
  line-height: .87;
  font-weight: 950;
}

.login-brand p {
  max-width: 440px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
  line-height: 1.55;
}

.login-panel {
  min-width: 0;
  border-radius: 32px;
  padding: clamp(20px, 3vw, 34px);
}

.login-loading {
  min-height: 230px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--j2-muted);
  font-size: 13px;
}

.login-tabs {
  margin-bottom: 18px;
  border-radius: 18px;
  padding: 7px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.login-tabs button {
  border: 0;
  min-height: 42px;
  border-radius: 14px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
}

.login-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 5px 6px 14px rgba(0, 0, 0, .32), -2px -2px 8px rgba(255, 255, 255, .014);
}

.login-form {
  display: grid;
  gap: 14px;
}

.login-field {
  min-height: 52px;
  border-radius: 18px;
  padding: 0 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.login-field input,
.login-setup-section input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
  font-size: 14px;
}

.login-field input::placeholder,
.login-setup-section input::placeholder {
  color: var(--j2-faint);
}

.login-setup-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.login-setup-section {
  min-width: 0;
  border: 0;
  border-radius: 22px;
  padding: 15px;
  display: grid;
  gap: 12px;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.login-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.login-section-title svg {
  color: var(--j2-accent);
}

.login-setup-section input {
  min-height: 48px;
  border-radius: 16px;
  padding: 0 13px;
  background: rgba(6, 7, 7, .86);
  box-shadow: var(--j2-neu-soft);
}

.login-submit {
  border: 0;
  min-height: 52px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 5px 6px 14px rgba(0, 0, 0, .32), -2px -2px 8px rgba(255, 255, 255, .014);
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: .62;
}

.login-error {
  border: 0;
  border-radius: 16px;
  padding: 12px;
  color: #ffb4a5;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  line-height: 1.45;
}

.login-spin {
  animation: loginSpin .8s linear infinite;
}

@keyframes loginSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 900px) {
  .login-shell,
  .login-shell.setup {
    min-height: 100dvh;
    grid-template-columns: 1fr;
    align-items: start;
  }

  .login-brand {
    min-height: 260px;
  }

  .login-mark {
    margin-bottom: 34px;
  }
}

@media (max-width: 560px) {
  .login-shell,
  .login-shell.setup {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
    gap: 12px;
  }

  .login-brand,
  .login-panel {
    border-radius: 26px;
  }

  .login-brand h1 {
    font-size: clamp(40px, 13vw, 54px);
  }

  .login-tabs {
    grid-template-columns: 1fr;
  }

  .login-setup-grid {
    grid-template-columns: 1fr;
  }
}
`;
