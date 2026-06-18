import React, { useState, useEffect, useCallback } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Plus, Search, AlertTriangle, Users as UsersIcon, Edit, FileText, Phone, Mail, Link as LinkIcon, Copy, CreditCard, UserRoundCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import UserForm from "../components/users/UserForm";

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <div className="users-metric">
      <div className="users-icon-well"><Icon size={18} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

function SoftButton({ children, onClick, primary = false, disabled = false }) {
  return (
    <button type="button" className={primary ? "users-btn primary" : "users-btn"} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await remoteClient.auth.me();
      setCurrentUser(me);
      if (me.role === "dev" || me.role === "admin") {
        const all = await remoteClient.users.list();
        setUsers((all || []).filter((u) => u.role === "user"));
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const usersNoPhone = users.filter((u) => !u.phone);
  const postpaid = users.filter((u) => u.payment_type === "postpaid");
  const prepaid = users.filter((u) => u.payment_type !== "postpaid");
  const filtered = users.filter((u) => {
    const q = debounced.toLowerCase();
    return (
      (u.full_name || u.name || "").toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  const copyRegLink = async () => {
    const link = `${window.location.origin}/register?parent=${currentUser?.id}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copiado", description: "Link de cadastro copiado." });
  };

  const handleGenerateInvoice = async (reseller) => {
    if (!reseller?.id) return;
    if (reseller.payment_type !== "postpaid") {
      toast({ title: "Tipo inválido", description: "Apenas pós-pago pode ter faturas.", variant: "destructive" });
      return;
    }
    try {
      toast({ title: "Gerando fatura", description: "Buscando pedidos não faturados." });
      const invoice = await remoteClient.invoices.generate(reseller.id);
      toast({ title: "Fatura gerada", description: `${invoice.invoice_number} criada com sucesso.`, duration: 4000 });
      loadData();
    } catch (error) {
      toast({ title: "Erro", description: error?.message || "Erro ao gerar fatura.", variant: "destructive", duration: 5000 });
    }
  };

  return (
    <div className="users-rebuilt-page">
      <div className="users-shell">
        <section className="users-hero">
          <div>
            <span className="users-kicker">Equipe comercial</span>
            <h1>Revendedores</h1>
            <p>Controle cadastro, WhatsApp, tipo de pagamento e faturamento dos revendedores.</p>
          </div>
          <div className="users-hero-actions">
            <SoftButton onClick={copyRegLink}>
              <Copy size={15} />
              Link de cadastro
            </SoftButton>
            <SoftButton primary onClick={() => { setEditingUser(null); setShowForm(true); }}>
              <Plus size={15} />
              Novo revendedor
            </SoftButton>
          </div>
        </section>

        <section className="users-metrics">
          <Metric icon={UsersIcon} label="Total" value={users.length} hint="revendedores" />
          <Metric icon={CreditCard} label="Pré-pago" value={prepaid.length} hint="pagamento antecipado" />
          <Metric icon={FileText} label="Pós-pago" value={postpaid.length} hint="gera fatura" />
          <Metric icon={AlertTriangle} label="Sem WhatsApp" value={usersNoPhone.length} hint="precisa corrigir" />
        </section>

        {usersNoPhone.length > 0 && (
          <section className="users-warning">
            <div className="users-icon-well warning"><AlertTriangle size={18} /></div>
            <div>
              <strong>{usersNoPhone.length} revendedor(es) sem WhatsApp</strong>
              <p>Esses cadastros podem falhar no envio de avisos automáticos. Corrija antes de usar a fila de recarga em produção.</p>
              <div className="users-warning-list">
                {usersNoPhone.slice(0, 6).map((u) => (
                  <button key={u.id} type="button" onClick={() => { setEditingUser(u); setShowForm(true); }}>
                    <span>{u.full_name || u.name || u.email}</span>
                    <Edit size={13} />
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="users-panel">
          <div className="users-toolbar">
            <div className="users-search">
              <Search size={16} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, email ou telefone..." />
            </div>
            <div className="users-count">
              <span>Resultado</span>
              <strong>{filtered.length}</strong>
            </div>
          </div>

          {loading ? (
            <div className="users-loading"><div /></div>
          ) : filtered.length === 0 ? (
            <div className="users-empty">
              <div className="users-icon-well"><UsersIcon size={22} /></div>
              <strong>Nenhum revendedor encontrado</strong>
              <span>Tente outro termo ou cadastre um novo revendedor.</span>
            </div>
          ) : (
            <div className="users-list">
              {filtered.map((u) => {
                const name = u.full_name || u.name || "Sem nome";
                const initials = (name || u.email || "?").slice(0, 2).toUpperCase();
                const isPostpaid = u.payment_type === "postpaid";
                return (
                  <article className="users-card" key={u.id}>
                    <div className="users-avatar">{initials}</div>
                    <div className="users-info">
                      <div className="users-title-row">
                        <h3>{name}</h3>
                        <span className={isPostpaid ? "postpaid" : "prepaid"}>{isPostpaid ? "Pós-pago" : "Pré-pago"}</span>
                        {!u.phone && <span className="danger">Sem WhatsApp</span>}
                      </div>
                      <div className="users-contact">
                        <span><Mail size={13} />{u.email}</span>
                        {u.phone && <span><Phone size={13} />{u.phone}</span>}
                      </div>
                    </div>
                    <div className="users-row-actions">
                      {isPostpaid && (
                        <button type="button" onClick={() => handleGenerateInvoice(u)}>
                          <FileText size={14} />
                          Fatura
                        </button>
                      )}
                      <button type="button" onClick={() => { setEditingUser(u); setShowForm(true); }}>
                        <Edit size={14} />
                        Editar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <AnimatePresence>
          {showForm && (
            <motion.div className="users-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowForm(false); setEditingUser(null); }}>
              <motion.div className="users-modal-card" initial={{ scale: .97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .97, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
                <UserForm
                  user={editingUser}
                  currentUser={currentUser}
                  onSuccess={() => { setShowForm(false); setEditingUser(null); loadData(); }}
                  onCancel={() => { setShowForm(false); setEditingUser(null); }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style>{usersStyles}</style>
    </div>
  );
}

const usersStyles = `
@keyframes usersSpin { to { transform: rotate(360deg); } }
.users-rebuilt-page {
  --j2-bg: #030404;
  --j2-bg-soft: #080909;
  --j2-surface: rgba(6, 7, 7, .96);
  --j2-surface-2: rgba(9, 10, 10, .96);
  --j2-sunken-bg: rgba(3, 4, 4, .76);
  --j2-text: #fff8f2;
  --j2-muted: #a3a09b;
  --j2-faint: #67615c;
  --j2-accent: #ff4b12;
  --j2-accent-deep: #8f1608;
  --j2-neu: 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.016), inset 1px 1px 0 rgba(255,255,255,.014);
  --j2-sunken: inset 3px 3px 8px rgba(0,0,0,.34), inset -2px -2px 6px rgba(255,255,255,.016);
  min-height: 100dvh;
  background: linear-gradient(135deg, var(--j2-bg), var(--j2-bg-soft) 52%, #010202);
  color: var(--j2-text);
}
.users-shell {
  width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.5vw, 22px);
}
.users-hero,
.users-metric,
.users-warning,
.users-panel,
.users-card {
  background: var(--j2-surface);
  border: 0;
  box-shadow: var(--j2-neu);
}
.users-hero {
  border-radius: 26px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}
.users-kicker {
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.users-hero h1 {
  margin: 4px 0 6px;
  font-size: clamp(32px, 5vw, 58px);
  line-height: .95;
  color: var(--j2-text);
}
.users-hero p {
  margin: 0;
  color: var(--j2-muted);
  max-width: 620px;
}
.users-hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
.users-btn,
.users-row-actions button,
.users-warning-list button {
  border: 0;
  min-height: 42px;
  border-radius: 14px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--j2-surface-2);
  color: var(--j2-muted);
  box-shadow: var(--j2-neu);
  font-weight: 850;
  cursor: pointer;
}
.users-btn.primary {
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  color: #fff;
}
.users-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.users-metric {
  min-width: 0;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
}
.users-icon-well {
  width: 46px;
  height: 46px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  color: var(--j2-accent);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.users-icon-well.warning {
  color: #fbbf24;
}
.users-metric span,
.users-count span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}
.users-metric strong {
  display: block;
  margin-top: 4px;
  color: var(--j2-text);
  font-size: clamp(20px, 2.4vw, 28px);
  line-height: 1;
}
.users-metric small {
  color: var(--j2-faint);
  font-size: 11px;
}
.users-warning {
  border-radius: 22px;
  padding: 16px;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 14px;
}
.users-warning strong {
  display: block;
  color: var(--j2-text);
  font-size: 16px;
}
.users-warning p {
  margin: 5px 0 12px;
  color: var(--j2-muted);
  font-size: 13px;
}
.users-warning-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.users-warning-list button {
  min-height: 34px;
  padding: 0 10px;
  font-size: 12px;
}
.users-panel {
  border-radius: 24px;
  padding: 14px;
}
.users-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 14px;
}
.users-search {
  min-height: 48px;
  border-radius: 16px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--j2-faint);
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.users-search input {
  width: 100%;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--j2-text);
}
.users-count {
  min-width: 110px;
  border-radius: 16px;
  padding: 8px 14px;
  background: var(--j2-sunken-bg);
  box-shadow: var(--j2-sunken);
}
.users-count strong {
  display: block;
  color: var(--j2-accent);
  font-size: 20px;
  line-height: 1;
}
.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.users-card {
  border-radius: 20px;
  padding: 15px;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}
.users-avatar {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  color: #fff;
  font-weight: 950;
}
.users-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.users-title-row h3 {
  margin: 0;
  color: var(--j2-text);
  font-size: 17px;
  line-height: 1.18;
}
.users-title-row span {
  min-height: 24px;
  border-radius: 999px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  color: var(--j2-accent);
  background: rgba(255,255,255,.028);
  font-size: 11px;
  font-weight: 900;
}
.users-title-row span.prepaid {
  color: #ff8a4a;
}
.users-title-row span.danger {
  color: #f87171;
}
.users-contact {
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--j2-muted);
  font-size: 13px;
}
.users-contact span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.users-row-actions {
  display: flex;
  gap: 8px;
}
.users-row-actions button {
  min-height: 38px;
  font-size: 12px;
}
.users-row-actions svg {
  color: var(--j2-accent);
}
.users-empty,
.users-loading {
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: var(--j2-muted);
  text-align: center;
}
.users-empty strong {
  color: var(--j2-text);
  font-size: 18px;
}
.users-loading div {
  width: 44px;
  height: 44px;
  border-radius: 15px;
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu);
  animation: usersSpin 1.1s linear infinite;
}
.users-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0,0,0,.78);
}
.users-modal-card {
  width: 100%;
  max-width: 680px;
}
@media (max-width: 1120px) {
  .users-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .users-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }
  .users-hero {
    border-radius: 22px;
    flex-direction: column;
    align-items: stretch;
  }
  .users-hero h1 {
    font-size: clamp(34px, 12vw, 48px);
  }
  .users-hero-actions,
  .users-toolbar {
    grid-template-columns: 1fr;
    display: grid;
  }
  .users-metrics {
    grid-template-columns: 1fr;
  }
  .users-warning {
    grid-template-columns: 1fr;
  }
  .users-card {
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: start;
  }
  .users-avatar {
    width: 48px;
    height: 48px;
    border-radius: 16px;
  }
  .users-row-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .users-row-actions button {
    width: 100%;
  }
}
@media (max-width: 390px) {
  .users-row-actions {
    grid-template-columns: 1fr;
  }
}
`;
