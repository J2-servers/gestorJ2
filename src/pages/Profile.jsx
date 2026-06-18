import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Loader2, Mail, Phone, Save, User as UserIcon } from "lucide-react";

function Field({ children, hint, icon: Icon, label }) {
  return (
    <label className="profile-field">
      <span>{Icon && <Icon size={13} />} {label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function PageState() {
  return (
    <div className="profile-page">
      <section className="profile-state">
        <Loader2 className="profile-spin" size={30} />
        <strong>Carregando perfil</strong>
        <p>Buscando seus dados de conta.</p>
      </section>
      <style>{profileStyles}</style>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const currentUser = await remoteClient.auth.me();
        if (!alive) return;
        setUser(currentUser);
        setFormData({ name: currentUser.name || "", phone: currentUser.phone || "" });
      } catch (error) {
        console.warn("[Profile] Falha ao carregar perfil:", error);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!formData.phone?.trim()) {
      toast({
        title: "Telefone obrigatorio",
        description: "Cadastre seu WhatsApp para continuar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await remoteClient.users.updateMe(formData);
      const updatedUser = await remoteClient.auth.me();
      setUser(updatedUser);
      toast({ title: "Perfil atualizado" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageState />;

  const missingPhone = !user?.phone && user?.role === "user";

  return (
    <div className="profile-page">
      <main className="profile-shell">
        <section className="profile-hero">
          <div className="profile-avatar">
            {(formData.name || user?.email || "J").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span>Conta</span>
            <h1>Meu Perfil</h1>
            <p>Atualize os dados usados para notificacoes, contato e operacao dos pedidos.</p>
          </div>
        </section>

        <section className="profile-grid">
          <aside className="profile-summary">
            <div className="profile-icon">
              <UserIcon size={18} />
            </div>
            <strong>{formData.name || user?.email || "Usuario"}</strong>
            <span>{user?.role === "admin" || user?.role === "dev" ? "Administrador" : "Revendedor"}</span>
            <div className="profile-summary-data">
              <div>
                <small>Email</small>
                <p>{user?.email || "-"}</p>
              </div>
              <div>
                <small>WhatsApp</small>
                <p>{formData.phone || "Nao cadastrado"}</p>
              </div>
            </div>
          </aside>

          <section className="profile-panel">
            {missingPhone && (
              <div className="profile-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>WhatsApp obrigatorio</strong>
                  <span>Cadastre seu numero para receber avisos e criar pedidos sem bloqueios.</span>
                </div>
              </div>
            )}

            <form className="profile-form" onSubmit={handleUpdate}>
              <Field label="Nome" icon={UserIcon}>
                <input
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  required
                  value={formData.name}
                />
              </Field>

              <Field
                hint="Usado para notificacoes de pedidos via WhatsApp."
                label="WhatsApp"
                icon={Phone}
              >
                <input
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  placeholder="(11) 99999-9999"
                  required
                  type="tel"
                  value={formData.phone}
                />
              </Field>

              <Field hint="O email nao pode ser alterado por aqui." label="Email" icon={Mail}>
                <input disabled value={user?.email || ""} />
              </Field>

              <div className="profile-actions">
                <button className="profile-save" disabled={saving} type="submit">
                  {saving ? <Loader2 className="profile-spin" size={16} /> : <Save size={16} />}
                  {saving ? "Salvando..." : "Salvar alteracoes"}
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>

      <style>{profileStyles}</style>
    </div>
  );
}

const profileStyles = `
.profile-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.profile-shell {
  width: min(1120px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-hero,
.profile-summary,
.profile-panel,
.profile-state {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.profile-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  gap: 18px;
}

.profile-avatar {
  width: clamp(70px, 10vw, 116px);
  height: clamp(70px, 10vw, 116px);
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 28px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--j2-neu-soft);
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 950;
}

.profile-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.profile-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(38px, 6vw, 68px);
  line-height: .9;
  font-weight: 950;
}

.profile-hero p {
  max-width: 720px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.profile-summary,
.profile-panel {
  min-width: 0;
  border-radius: 26px;
  padding: 18px;
}

.profile-summary {
  display: grid;
  gap: 12px;
}

.profile-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 17px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.profile-summary > strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.profile-summary > span {
  color: var(--j2-muted);
  font-size: 13px;
}

.profile-summary-data {
  display: grid;
  gap: 9px;
}

.profile-summary-data div,
.profile-warning,
.profile-field input {
  border: 0;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.profile-summary-data div {
  border-radius: 17px;
  padding: 12px;
}

.profile-summary-data small,
.profile-field > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.profile-summary-data p {
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-warning {
  border-radius: 18px;
  padding: 13px;
  display: flex;
  gap: 10px;
  color: #ffb4b4;
}

.profile-warning strong {
  display: block;
  color: #ffb4b4;
  font-size: 13px;
  font-weight: 950;
}

.profile-warning span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.profile-form {
  display: grid;
  gap: 16px;
}

.profile-field {
  display: grid;
  gap: 7px;
}

.profile-field input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  border-radius: 16px;
  padding: 0 13px;
  color: var(--j2-text);
  outline: 0;
  font: inherit;
  font-size: 14px;
}

.profile-field input:disabled {
  color: var(--j2-faint);
  cursor: not-allowed;
}

.profile-field small {
  color: var(--j2-faint);
  font-size: 11px;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
}

.profile-save {
  border: 0;
  min-height: 46px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
}

.profile-save:disabled {
  cursor: not-allowed;
  opacity: .6;
}

.profile-state {
  width: min(430px, calc(100vw - 28px));
  min-height: 320px;
  margin: 18dvh auto 0;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.profile-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.profile-state p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.profile-spin {
  animation: profileSpin .8s linear infinite;
}

@keyframes profileSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 760px) {
  .profile-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .profile-hero {
    align-items: flex-start;
    flex-direction: column;
    border-radius: 24px;
  }

  .profile-hero h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .profile-save {
    width: 100%;
  }
}
`;
