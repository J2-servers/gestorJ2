import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { useToast } from "@/components/ui/use-toast";
import TemplateForm from "../components/templates/TemplateForm";
import {
  Check,
  Copy,
  Edit,
  Loader2,
  MessageSquare,
  Plus,
  Power,
  Trash2,
  Wand2,
} from "lucide-react";

const TYPE_CONFIG = {
  queue: { label: "Fila", tone: "queue" },
  approval: { label: "Aprovacao", tone: "approval" },
  rejection: { label: "Rejeicao", tone: "rejection" },
  payment_reminder: { label: "Pagamento", tone: "payment" },
  custom: { label: "Personalizado", tone: "custom" },
};

const VARIABLES = [
  { variable: "{{resellerName}}", desc: "Nome do revendedor" },
  { variable: "{{requestId}}", desc: "ID do pedido" },
  { variable: "{{serverName}}", desc: "Nome do servidor" },
  { variable: "{{login}}", desc: "Login de recebimento" },
  { variable: "{{credits}}", desc: "Quantidade de creditos" },
  { variable: "{{value}}", desc: "Valor total" },
  { variable: "{{adminNotes}}", desc: "Observacao do admin" },
  { variable: "{{rejectionReason}}", desc: "Motivo da rejeicao" },
];

const isStaff = (user) => user?.role === "admin" || user?.role === "dev";

function PageState({ type = "loading", text }) {
  return (
    <div className="templates-page">
      <div className="templates-state">
        {type === "loading" ? <Loader2 className="templates-spin" size={28} /> : <Power size={30} />}
        <strong>{type === "loading" ? "Carregando templates" : "Acesso negado"}</strong>
        <p>{text}</p>
      </div>
      <style>{templateStyles}</style>
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <article className="templates-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function TypeBadge({ active = true, type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.custom;
  return <span className={`templates-badge ${cfg.tone} ${active ? "" : "inactive"}`}>{cfg.label}</span>;
}

function VariableCard({ copied, item, onCopy }) {
  return (
    <button className="templates-variable" onClick={() => onCopy(item.variable)} type="button">
      <code>{item.variable}</code>
      <span>{item.desc}</span>
      <i>{copied ? <Check size={14} /> : <Copy size={14} />}</i>
    </button>
  );
}

function EmptyTemplates({ onCreate }) {
  return (
    <section className="templates-empty">
      <div className="templates-empty-icon">
        <MessageSquare size={28} />
      </div>
      <strong>Nenhum template ativo</strong>
      <p>Crie mensagens padrao para fila, aprovacao, rejeicao e lembretes.</p>
      <button onClick={onCreate} type="button">
        <Plus size={15} />
        Criar template
      </button>
    </section>
  );
}

function TemplateCard({ onDelete, onEdit, template }) {
  const active = template?.is_active ?? template?.active ?? true;
  const content = template?.message_content || template?.content || "";

  return (
    <article className={`templates-card ${active ? "" : "inactive"}`}>
      <div className="templates-card-head">
        <div className="templates-card-title">
          <div className="templates-icon">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3>{template?.name || "Template sem nome"}</h3>
            <div>
              <TypeBadge active={active} type={template?.type} />
              {!active && <span className="templates-badge inactive">Inativo</span>}
            </div>
          </div>
        </div>

        <div className="templates-actions">
          <button onClick={() => onEdit(template)} type="button">
            <Edit size={14} />
            Editar
          </button>
          <button className="danger" onClick={() => onDelete(template)} type="button">
            <Trash2 size={14} />
            Desativar
          </button>
        </div>
      </div>

      <pre>{content}</pre>
    </article>
  );
}

export default function MessageTemplatesPage() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await remoteClient.auth.me();
      setUser(currentUser);
      if (isStaff(currentUser)) {
        const result = await remoteClient.templates.list();
        setTemplates(Array.isArray(result) ? result : []);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel carregar templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = useMemo(() => {
    const active = templates.filter((template) => template?.is_active ?? template?.active ?? true).length;
    const byType = new Set(templates.map((template) => template.type).filter(Boolean)).size;
    return {
      active,
      byType,
      inactive: templates.length - active,
      total: templates.length,
    };
  }, [templates]);

  const handleDelete = async (template) => {
    const ok = window.confirm(`Desativar o template "${template?.name}"?`);
    if (!ok) return;
    try {
      await remoteClient.templates.remove(template.id);
      toast({ title: "Template desativado" });
      await loadData();
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel desativar.",
        variant: "destructive",
      });
    }
  };

  const copyVariable = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast({ title: "Nao foi possivel copiar", variant: "destructive" });
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  if (loading) {
    return <PageState text="Buscando mensagens automaticas e variaveis disponiveis." />;
  }

  if (!isStaff(user)) {
    return <PageState type="denied" text="Esta area e exclusiva para administradores." />;
  }

  return (
    <div className="templates-page">
      <div className="templates-shell">
        <section className="templates-hero">
          <div>
            <span>WhatsApp</span>
            <h1>Templates</h1>
            <p>Mensagens padrao usadas no fluxo de fila, aprovacao, rejeicao e lembretes de pagamento.</p>
          </div>
          <button onClick={openCreate} type="button">
            <Plus size={16} />
            Novo template
          </button>
        </section>

        <section className="templates-metrics">
          <Metric label="Total" value={metrics.total} hint="modelos criados" />
          <Metric label="Ativos" value={metrics.active} hint="em uso" />
          <Metric label="Tipos" value={metrics.byType} hint="fluxos cobertos" />
          <Metric label="Inativos" value={metrics.inactive} hint="desativados" />
        </section>

        <section className="templates-vars">
          <div className="templates-section-head">
            <div className="templates-icon">
              <Wand2 size={16} />
            </div>
            <div>
              <strong>Variaveis disponiveis</strong>
              <span>Clique para copiar e inserir na mensagem.</span>
            </div>
          </div>
          <div className="templates-var-grid">
            {VARIABLES.map((item) => (
              <VariableCard
                copied={copiedId === item.variable}
                item={item}
                key={item.variable}
                onCopy={copyVariable}
              />
            ))}
          </div>
          <div className="templates-hint">
            Use <code>{"{{adminNotes}}"}</code> no template de aprovacao para enviar observacoes personalizadas.
          </div>
        </section>

        {templates.length === 0 ? (
          <EmptyTemplates onCreate={openCreate} />
        ) : (
          <section className="templates-list">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                onDelete={handleDelete}
                onEdit={(item) => {
                  setEditingTemplate(item);
                  setShowForm(true);
                }}
                template={template}
              />
            ))}
          </section>
        )}

        {showForm && (
          <TemplateForm
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
            onSuccess={() => {
              setShowForm(false);
              setEditingTemplate(null);
              loadData();
            }}
            template={editingTemplate}
          />
        )}
      </div>
      <style>{templateStyles}</style>
    </div>
  );
}

const templateStyles = `
.templates-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 52%, #010202 100%);
  overflow-x: hidden;
}

.templates-shell {
  width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.templates-hero,
.templates-metric,
.templates-vars,
.templates-card,
.templates-empty,
.templates-state {
  border: 0;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.templates-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.templates-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.templates-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(36px, 6vw, 66px);
  line-height: .9;
  font-weight: 950;
}

.templates-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.templates-hero button,
.templates-empty button,
.templates-actions button {
  border: 0;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.templates-hero button,
.templates-empty button {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.templates-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.templates-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
}

.templates-metric span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.templates-metric strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(24px, 2.6vw, 34px);
  line-height: 1;
  font-weight: 950;
}

.templates-metric small {
  display: block;
  margin-top: 5px;
  color: var(--j2-faint);
  font-size: 11px;
}

.templates-vars {
  border-radius: 24px;
  padding: 16px;
}

.templates-section-head,
.templates-card-head,
.templates-card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.templates-section-head {
  margin-bottom: 14px;
}

.templates-icon,
.templates-empty-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.templates-icon {
  width: 42px;
  height: 42px;
  border-radius: 15px;
}

.templates-section-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 16px;
  font-weight: 950;
}

.templates-section-head span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.templates-var-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 10px;
}

.templates-variable {
  min-width: 0;
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 3px 10px;
  border: 0;
  border-radius: 17px;
  padding: 10px 11px;
  color: inherit;
  text-align: left;
  background: rgba(3, 4, 4, .68);
  box-shadow: var(--j2-sunken);
  cursor: pointer;
}

.templates-variable code {
  min-width: 0;
  overflow: hidden;
  color: var(--j2-accent);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.templates-variable span {
  min-width: 0;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.templates-variable i {
  grid-row: 1 / 3;
  grid-column: 2;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 11px;
  color: var(--j2-muted);
  background: rgba(255, 255, 255, .035);
  font-style: normal;
  box-shadow: var(--j2-neu-soft);
}

.templates-hint {
  margin-top: 12px;
  border-radius: 17px;
  padding: 12px 13px;
  color: var(--j2-muted);
  background: rgba(3, 4, 4, .68);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
}

.templates-hint code {
  color: var(--j2-accent);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-weight: 900;
}

.templates-list {
  display: grid;
  gap: 14px;
}

.templates-card {
  min-width: 0;
  border-radius: 24px;
  padding: 16px;
  opacity: 1;
}

.templates-card.inactive {
  opacity: .58;
}

.templates-card-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.templates-card-title {
  align-items: flex-start;
}

.templates-card-title h3 {
  margin: 0;
  color: var(--j2-text);
  font-size: 17px;
  line-height: 1.2;
  font-weight: 950;
}

.templates-card-title div:last-child > div {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 7px;
}

.templates-badge {
  min-height: 25px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 9px;
  color: var(--j2-accent);
  background: rgba(255, 255, 255, .035);
  box-shadow: var(--j2-sunken);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.templates-badge.rejection,
.templates-badge.inactive {
  color: #ff5b5b;
}

.templates-badge.payment {
  color: #f5b942;
}

.templates-badge.approval {
  color: #ff8a4a;
}

.templates-actions {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.templates-actions button.danger {
  color: #ff5b5b;
  background: rgba(255, 91, 91, .08);
}

.templates-card pre {
  width: 100%;
  min-height: 96px;
  max-height: 260px;
  overflow: auto;
  margin: 0;
  border-radius: 18px;
  padding: 14px;
  color: var(--j2-muted);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.templates-empty,
.templates-state {
  min-height: 340px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.templates-empty-icon {
  width: 78px;
  height: 78px;
  border-radius: 26px;
  margin-bottom: 6px;
}

.templates-empty strong,
.templates-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.templates-empty p,
.templates-state p {
  max-width: 380px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.templates-state {
  width: min(420px, calc(100vw - 28px));
  margin: 18dvh auto 0;
}

.templates-state svg {
  color: var(--j2-accent);
}

.templates-spin {
  animation: templatesSpin .8s linear infinite;
}

@keyframes templatesSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .templates-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .templates-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .templates-hero {
    border-radius: 24px;
    align-items: stretch;
    flex-direction: column;
  }

  .templates-hero h1 {
    font-size: clamp(38px, 13vw, 54px);
  }

  .templates-hero button {
    width: 100%;
  }

  .templates-metrics,
  .templates-var-grid {
    grid-template-columns: 1fr;
  }

  .templates-card-head {
    align-items: stretch;
    flex-direction: column;
  }

  .templates-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .templates-actions button {
    width: 100%;
  }
}

@media (max-width: 400px) {
  .templates-actions {
    grid-template-columns: 1fr;
  }
}
`;
