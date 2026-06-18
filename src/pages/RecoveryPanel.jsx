import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";

function Banner({ kind, children }) {
  if (!children) return null;
  const ok = kind === "ok";
  return (
    <div className={`recovery-banner ${ok ? "ok" : "danger"}`}>
      {ok ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
      <span>{children}</span>
    </div>
  );
}

function Field({ icon: Icon, label, ...props }) {
  return (
    <label className="recovery-field">
      <span>
        {Icon && <Icon size={14} />}
        {label}
      </span>
      <input {...props} />
    </label>
  );
}

function SubmitButton({ busy, children, icon: Icon = KeyRound, tone = "primary" }) {
  return (
    <button className={`recovery-submit ${tone}`} disabled={busy} type="submit">
      {busy ? <Loader2 className="recovery-spin" size={17} /> : <Icon size={17} />}
      {children}
    </button>
  );
}

export default function RecoveryPanel() {
  const { user, logout } = useAuth();
  const [admin, setAdmin] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const [credForm, setCredForm] = useState({ email: "", password: "", confirm: "" });
  const [credBusy, setCredBusy] = useState(false);
  const [credMsg, setCredMsg] = useState({ kind: "", text: "" });

  const [pwForm, setPwForm] = useState({ password: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState({ kind: "", text: "" });

  useEffect(() => {
    let alive = true;
    remoteClient.recovery
      .getOperationalAdmin()
      .then((operationalAdmin) => {
        if (!alive) return;
        setAdmin(operationalAdmin);
        setCredForm((current) => ({ ...current, email: operationalAdmin.email || "" }));
      })
      .catch(() => {
        if (alive) setAdmin(null);
      })
      .finally(() => {
        if (alive) setLoadingAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const submitCreds = async (event) => {
    event.preventDefault();
    setCredMsg({ kind: "", text: "" });

    const emailChanged = credForm.email && credForm.email !== admin?.email;
    const wantsPassword = Boolean(credForm.password);

    if (!emailChanged && !wantsPassword) {
      setCredMsg({ kind: "err", text: "Altere o e-mail ou informe uma nova senha." });
      return;
    }
    if (wantsPassword && credForm.password !== credForm.confirm) {
      setCredMsg({ kind: "err", text: "As senhas nao conferem." });
      return;
    }

    setCredBusy(true);
    try {
      const payload = {};
      if (emailChanged) payload.email = credForm.email;
      if (wantsPassword) payload.password = credForm.password;
      const result = await remoteClient.recovery.resetCredentials(payload);
      setAdmin(result.admin);
      setCredForm((current) => ({ ...current, email: result.admin.email || "", password: "", confirm: "" }));
      setCredMsg({ kind: "ok", text: "Credenciais do administrador atualizadas. As sessoes dele foram encerradas." });
    } catch (error) {
      setCredMsg({ kind: "err", text: error.message || "Falha ao atualizar." });
    } finally {
      setCredBusy(false);
    }
  };

  const submitOwnPassword = async (event) => {
    event.preventDefault();
    setPwMsg({ kind: "", text: "" });

    if (pwForm.password.length < 8) {
      setPwMsg({ kind: "err", text: "A senha precisa de no minimo 8 caracteres." });
      return;
    }
    if (pwForm.password !== pwForm.confirm) {
      setPwMsg({ kind: "err", text: "As senhas nao conferem." });
      return;
    }

    setPwBusy(true);
    try {
      await remoteClient.recovery.changeOwnPassword(pwForm.password);
      setPwForm({ password: "", confirm: "" });
      setPwMsg({ kind: "ok", text: "Sua senha foi alterada. Faca login novamente quando precisar." });
    } catch (error) {
      setPwMsg({ kind: "err", text: error.message || "Falha ao alterar a senha." });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="recovery-page">
      <main className="recovery-shell">
        <header className="recovery-hero">
          <div className="recovery-brand">
            <div className="recovery-mark">
              <ShieldCheck size={26} />
            </div>
            <div>
              <span>Conta de recuperacao</span>
              <h1>Seguranca</h1>
              <p>{user?.email || "Acesso restrito de emergencia"}</p>
            </div>
          </div>

          <button className="recovery-logout" onClick={() => logout()} type="button">
            <LogOut size={16} />
            Sair
          </button>
        </header>

        <section className="recovery-scope">
          <ShieldCheck size={20} />
          <p>
            Esta conta existe apenas para recuperar o administrador operacional. Ela troca login e senha do admin,
            sem abrir dados de pedidos, financeiro ou operacao.
          </p>
        </section>

        <section className="recovery-grid">
          <article className="recovery-panel">
            <div className="recovery-panel-head">
              <div className="recovery-icon">
                <KeyRound size={19} />
              </div>
              <div>
                <strong>Credenciais do administrador</strong>
                <span>Troque o acesso da conta operacional.</span>
              </div>
            </div>

            {loadingAdmin ? (
              <div className="recovery-empty">
                <Loader2 className="recovery-spin" size={24} />
                Carregando administrador...
              </div>
            ) : !admin ? (
              <Banner kind="err">Administrador operacional nao encontrado.</Banner>
            ) : (
              <form className="recovery-form" onSubmit={submitCreds}>
                <Banner kind={credMsg.kind === "ok" ? "ok" : "err"}>{credMsg.text}</Banner>
                <Field
                  icon={Mail}
                  label="Novo e-mail de login"
                  onChange={(event) => setCredForm((current) => ({ ...current, email: event.target.value }))}
                  type="email"
                  value={credForm.email}
                />
                <Field
                  icon={Lock}
                  label="Nova senha"
                  minLength={8}
                  onChange={(event) => setCredForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="deixe em branco para nao trocar"
                  type="password"
                  value={credForm.password}
                />
                <Field
                  label="Confirmar nova senha"
                  onChange={(event) => setCredForm((current) => ({ ...current, confirm: event.target.value }))}
                  type="password"
                  value={credForm.confirm}
                />
                <SubmitButton busy={credBusy}>
                  {credBusy ? "Aplicando..." : "Atualizar credenciais"}
                </SubmitButton>
              </form>
            )}
          </article>

          <article className="recovery-panel">
            <div className="recovery-panel-head">
              <div className="recovery-icon muted">
                <Lock size={19} />
              </div>
              <div>
                <strong>Minha senha</strong>
                <span>Atualize a senha desta conta de recuperacao.</span>
              </div>
            </div>

            <form className="recovery-form" onSubmit={submitOwnPassword}>
              <Banner kind={pwMsg.kind === "ok" ? "ok" : "err"}>{pwMsg.text}</Banner>
              <Field
                label="Nova senha"
                minLength={8}
                onChange={(event) => setPwForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="minimo 8 caracteres"
                type="password"
                value={pwForm.password}
              />
              <Field
                label="Confirmar nova senha"
                onChange={(event) => setPwForm((current) => ({ ...current, confirm: event.target.value }))}
                type="password"
                value={pwForm.confirm}
              />
              <SubmitButton busy={pwBusy} icon={Lock} tone="secondary">
                {pwBusy ? "Alterando..." : "Alterar minha senha"}
              </SubmitButton>
            </form>
          </article>
        </section>
      </main>
      <style>{recoveryStyles}</style>
    </div>
  );
}

const recoveryStyles = `
.recovery-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.recovery-shell {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: clamp(14px, 3vw, 32px);
  display: grid;
  gap: 16px;
}

.recovery-hero,
.recovery-scope,
.recovery-panel,
.recovery-empty {
  border: 0;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.recovery-hero {
  min-height: 170px;
  border-radius: 30px;
  padding: clamp(18px, 3vw, 30px);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.recovery-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.recovery-mark,
.recovery-icon {
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 7px 8px 18px rgba(0, 0, 0, .38), -2px -2px 8px rgba(255, 255, 255, .014);
}

.recovery-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.recovery-icon.muted {
  color: var(--j2-muted);
}

.recovery-brand span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.recovery-brand h1 {
  margin: 5px 0 6px;
  color: var(--j2-text);
  font-size: clamp(42px, 6vw, 70px);
  line-height: .88;
  font-weight: 950;
}

.recovery-brand p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.recovery-logout,
.recovery-submit {
  border: 0;
  min-height: 44px;
  border-radius: 16px;
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

.recovery-logout {
  padding: 0 16px;
}

.recovery-submit {
  width: 100%;
  margin-top: 4px;
}

.recovery-submit.secondary {
  color: var(--j2-text);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
}

.recovery-submit:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.recovery-scope {
  border-radius: 24px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.recovery-scope svg {
  flex: 0 0 auto;
  color: var(--j2-accent);
}

.recovery-scope p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.55;
}

.recovery-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr);
  gap: 16px;
  align-items: start;
}

.recovery-panel {
  min-width: 0;
  border-radius: 28px;
  padding: clamp(16px, 2vw, 24px);
}

.recovery-panel-head {
  display: flex;
  gap: 13px;
  align-items: center;
  margin-bottom: 18px;
}

.recovery-panel-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.recovery-panel-head span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.recovery-form {
  display: grid;
  gap: 13px;
}

.recovery-field {
  display: grid;
  gap: 7px;
}

.recovery-field span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--j2-muted);
  font-size: 12px;
  font-weight: 900;
}

.recovery-field svg {
  color: var(--j2-accent);
}

.recovery-field input {
  width: 100%;
  min-height: 48px;
  border: 0;
  outline: 0;
  border-radius: 16px;
  padding: 0 14px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 14px;
}

.recovery-field input::placeholder {
  color: var(--j2-faint);
}

.recovery-banner {
  border: 0;
  border-radius: 16px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  color: var(--j2-muted);
  font-size: 12px;
  line-height: 1.45;
}

.recovery-banner.ok svg,
.recovery-banner.ok {
  color: var(--j2-accent);
}

.recovery-banner.danger svg,
.recovery-banner.danger {
  color: #ffb4a5;
}

.recovery-empty {
  min-height: 170px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.recovery-spin {
  animation: recoverySpin .8s linear infinite;
}

@keyframes recoverySpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 820px) {
  .recovery-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .recovery-hero {
    min-height: auto;
    border-radius: 26px;
    flex-direction: column;
  }

  .recovery-brand {
    align-items: flex-start;
  }

  .recovery-brand h1 {
    font-size: clamp(42px, 14vw, 56px);
  }

  .recovery-logout {
    width: 100%;
  }

  .recovery-grid {
    grid-template-columns: 1fr;
  }
}
`;
