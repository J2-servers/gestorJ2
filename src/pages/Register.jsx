import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Mail, Phone, UserPlus } from "lucide-react";
import { remoteClient } from "@/api/remoteClient";

function RegisterField({ icon: Icon, label, ...props }) {
  return (
    <label className="register-field">
      <span>
        <Icon size={14} />
        {label}
      </span>
      <input {...props} />
    </label>
  );
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [parentUserId, setParentUserId] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");

    const params = new URLSearchParams(window.location.search);
    const parentId = params.get("parent");
    if (parentId) setParentUserId(parentId);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await remoteClient.auth.register({
        ...formData,
        parentId: parentUserId || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Erro ao registrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="register-page">
      <main className="register-shell">
        <section className="register-panel">
          {success ? (
            <div className="register-success">
              <div className="register-mark">
                <CheckCircle2 size={34} />
              </div>
              <span>Solicitacao enviada</span>
              <h1>Registro recebido</h1>
              <p>Seu cadastro foi enviado. Aguarde o administrador ativar sua conta para acessar o painel.</p>
              <button className="register-submit" onClick={goHome} type="button">
                <ArrowLeft size={17} />
                Voltar ao inicio
              </button>
            </div>
          ) : (
            <>
              <header className="register-head">
                <div className="register-mark">
                  <UserPlus size={34} />
                </div>
                <span>Gestor J2</span>
                <h1>Cadastro de revendedor</h1>
                <p>Informe seus dados para entrar na fila de ativacao.</p>
              </header>

              <form className="register-form" onSubmit={handleSubmit}>
                {error && <div className="register-error">{error}</div>}

                <RegisterField
                  icon={UserPlus}
                  label="Nome completo"
                  onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Seu nome completo"
                  required
                  value={formData.name}
                />
                <RegisterField
                  icon={Mail}
                  label="E-mail"
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  placeholder="seu@email.com"
                  required
                  type="email"
                  value={formData.email}
                />
                <RegisterField
                  icon={Phone}
                  label="Telefone"
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="(11) 99999-9999"
                  required
                  value={formData.phone}
                />

                <button className="register-submit" disabled={loading} type="submit">
                  {loading ? <Loader2 className="register-spin" size={17} /> : <UserPlus size={17} />}
                  {loading ? "Enviando..." : "Quero ser revendedor"}
                </button>

                <button className="register-link" onClick={goHome} type="button">
                  Ja tenho conta, ir para login
                </button>
              </form>
            </>
          )}
        </section>
      </main>
      <style>{registerStyles}</style>
    </div>
  );
}

const registerStyles = `
.register-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.register-shell {
  width: min(520px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 4vw, 28px);
  display: grid;
  place-items: center;
}

.register-panel {
  width: 100%;
  border: 0;
  border-radius: 30px;
  padding: clamp(20px, 5vw, 34px);
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.register-head,
.register-success {
  text-align: center;
}

.register-mark {
  width: 78px;
  height: 78px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 25px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 8px 9px 20px rgba(0, 0, 0, .38), -2px -2px 8px rgba(255, 255, 255, .014);
}

.register-head span,
.register-success span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.register-head h1,
.register-success h1 {
  margin: 6px 0 8px;
  color: var(--j2-text);
  font-size: clamp(31px, 9vw, 44px);
  line-height: .95;
  font-weight: 950;
}

.register-head p,
.register-success p {
  margin: 0 auto;
  max-width: 360px;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.55;
}

.register-form {
  margin-top: 24px;
  display: grid;
  gap: 14px;
}

.register-field {
  display: grid;
  gap: 7px;
}

.register-field span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--j2-muted);
  font-size: 12px;
  font-weight: 900;
}

.register-field svg {
  color: var(--j2-accent);
}

.register-field input {
  width: 100%;
  min-height: 50px;
  border: 0;
  outline: 0;
  border-radius: 17px;
  padding: 0 15px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 14px;
}

.register-field input::placeholder {
  color: var(--j2-faint);
}

.register-submit,
.register-link {
  border: 0;
  min-height: 50px;
  border-radius: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
}

.register-submit {
  width: 100%;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 5px 6px 14px rgba(0, 0, 0, .32), -2px -2px 8px rgba(255, 255, 255, .014);
}

.register-submit:disabled {
  cursor: not-allowed;
  opacity: .62;
}

.register-link {
  min-height: 40px;
  color: var(--j2-muted);
  background: transparent;
}

.register-link:hover {
  color: var(--j2-accent);
}

.register-error {
  border: 0;
  border-radius: 16px;
  padding: 12px;
  color: #ffb4a5;
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  line-height: 1.45;
}

.register-success {
  display: grid;
  gap: 10px;
}

.register-success .register-submit {
  margin-top: 14px;
}

.register-spin {
  animation: registerSpin .8s linear infinite;
}

@keyframes registerSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .register-shell {
    align-items: start;
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .register-panel {
    border-radius: 26px;
  }
}
`;
