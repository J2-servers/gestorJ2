import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import {
  AlertCircle,
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatBrasiliaDate, formatFullBrasiliaDate } from "../components/utils/dateHelper";

const fmtMoney = (value = 0) => `R$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtNumber = (value = 0) => Number(value || 0).toLocaleString("pt-BR");

const statusMeta = {
  overdue: { label: "Vencida", tone: "bad" },
  paid: { label: "Pago", tone: "ok" },
  pending: { label: "Pendente", tone: "warn" },
};

function PageState({ denied }) {
  return (
    <div className="postpay-page">
      <section className="postpay-state">
        {denied ? <AlertCircle size={32} /> : <Loader2 className="postpay-spin" size={32} />}
        <strong>{denied ? "Acesso negado" : "Carregando financeiro"}</strong>
        <p>{denied ? "Pagina exclusiva para revendedores pos-pago." : "Buscando faturas, pedidos e consumo."}</p>
      </section>
      <style>{postpayStyles}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = "" }) {
  return (
    <article className={`postpay-stat ${tone}`}>
      <div className="postpay-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}

function InvoiceCard({ invoice, onClick }) {
  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status === "pending";
  const meta = statusMeta[isOverdue ? "overdue" : invoice.status] || statusMeta.pending;

  return (
    <button className="postpay-invoice" onClick={onClick} type="button">
      <div className="postpay-invoice-head">
        <div className="postpay-icon">
          <FileText size={17} />
        </div>
        <div>
          <strong>{invoice.invoice_number}</strong>
          <span>{invoice.request_count} pedidos - {fmtNumber(invoice.total_credits)} creditos</span>
        </div>
        <em className={meta.tone}>{meta.label}</em>
      </div>
      <div className="postpay-invoice-data">
        <div><span>Periodo</span><strong>{formatBrasiliaDate(invoice.period_start, "dd/MM")} - {formatBrasiliaDate(invoice.period_end, "dd/MM/yyyy")}</strong></div>
        <div><span>{invoice.status === "paid" ? "Pago em" : "Vencimento"}</span><strong>{invoice.status === "paid" ? formatBrasiliaDate(invoice.paid_date, "dd/MM/yyyy") : formatBrasiliaDate(invoice.due_date, "dd/MM/yyyy")}</strong></div>
        <div><span>Total</span><strong className="accent">{fmtMoney(invoice.total_value)}</strong></div>
      </div>
    </button>
  );
}

function ConsumptionChart({ monthlyData }) {
  const maxValue = Math.max(...(monthlyData || []).map((month) => month.value), 1);
  return (
    <section className="postpay-panel">
      <div className="postpay-panel-head">
        <div className="postpay-icon"><BarChart3 size={18} /></div>
        <div>
          <strong>Consumo mensal</strong>
          <span>{monthlyData?.length ? "Ultimos 6 meses" : "Sem dados"}</span>
        </div>
      </div>
      {!monthlyData?.length ? (
        <div className="postpay-empty-mini">Nenhum consumo.</div>
      ) : (
        <div className="postpay-bars">
          {monthlyData.map((month) => (
            <div key={month.month}>
              <div>
                <span>{month.month}</span>
                <strong>{fmtMoney(month.value)}</strong>
              </div>
              <i><b style={{ width: `${(month.value / maxValue) * 100}%` }} /></i>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DetailModal({ invoice, onClose, requests }) {
  return (
    <div className="postpay-overlay" onClick={onClose}>
      <section className="postpay-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <strong>{invoice.invoice_number}</strong>
            <span>{formatBrasiliaDate(invoice.period_start, "dd/MM/yyyy")} - {formatBrasiliaDate(invoice.period_end, "dd/MM/yyyy")}</span>
          </div>
          <button onClick={onClose} type="button"><XCircle size={18} /></button>
        </header>

        <div className="postpay-modal-stats">
          <div><span>Pedidos</span><strong>{invoice.request_count}</strong></div>
          <div><span>Creditos</span><strong>{fmtNumber(invoice.total_credits)}</strong></div>
          <div><span>{invoice.status === "paid" ? "Pago em" : "Vencimento"}</span><strong>{invoice.status === "paid" ? formatBrasiliaDate(invoice.paid_date, "dd/MM") : formatBrasiliaDate(invoice.due_date, "dd/MM")}</strong></div>
          <div><span>Total</span><strong className="accent">{fmtMoney(invoice.total_value)}</strong></div>
        </div>

        <div className="postpay-modal-list">
          <span>Pedidos incluidos ({requests.length})</span>
          {requests.map((request, index) => (
            <article key={request.id}>
              <div>
                <strong>#{index + 1} {request.server_snapshot?.name || "Servidor"}</strong>
                <small>Login: {request.login} - {formatFullBrasiliaDate(request.created_date)}</small>
              </div>
              <div>
                <span>{fmtNumber(request.requested_credits)} creditos</span>
                <strong>{fmtMoney(request.total_value)}</strong>
              </div>
            </article>
          ))}
        </div>

        <footer>
          <button onClick={onClose} type="button">Fechar</button>
        </footer>
      </section>
    </div>
  );
}

export default function FinanceiroPospago() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [allRequests, setAllRequests] = useState([]);
  const [invoiceRequests, setInvoiceRequests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [stats, setStats] = useState({
    pedidosNaoFaturados: 0,
    proximoVencimento: null,
    saldoDevedor: 0,
    tendenciaMes: 0,
    totalGastoMes: 0,
    ultimaFatura: null,
  });
  const [unbilledRequests, setUnbilledRequests] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await remoteClient.auth.me();
      setUser(currentUser);
      if (currentUser.payment_type !== "postpaid") return;

      const [invoiceResult, requestsResult] = await Promise.all([
        remoteClient.invoices.list(),
        remoteClient.creditRequests.list(null, 500),
      ]);
      const requests = requestsResult?.data || [];
      const unbilled = requests.filter((request) => request.status === "recharged" && request.payment_type === "postpaid" && !request.invoice_id);
      const pending = invoiceResult.filter((invoice) => invoice.status === "pending");
      const nextDue = pending.length > 0 ? [...pending].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] : null;
      const now = new Date();
      const monthly = [];

      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthInvoices = invoiceResult.filter((invoice) => {
          const created = new Date(invoice.created_date);
          return invoice.status === "paid" && created >= monthStart && created <= monthEnd;
        });
        monthly.push({
          month: date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          value: monthInvoices.reduce((total, invoice) => total + invoice.total_value, 0),
        });
      }

      const thisMonth = monthly[5]?.value || 0;
      const lastMonth = monthly[4]?.value || 0;
      const trend = lastMonth > 0 ? Number.parseFloat((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)) : 0;

      setAllRequests(requests);
      setInvoices(invoiceResult);
      setMonthlyData(monthly);
      setUnbilledRequests(unbilled);
      setStats({
        pedidosNaoFaturados: unbilled.length || 0,
        proximoVencimento: nextDue || null,
        saldoDevedor: pending.reduce((total, invoice) => total + invoice.total_value, 0) || 0,
        tendenciaMes: Number.isNaN(trend) ? 0 : trend,
        totalGastoMes: thisMonth || 0,
        ultimaFatura: invoiceResult[0] || null,
      });
    } catch (error) {
      console.error("[FinanceiroPospago] load error:", error);
      toast({ title: "Erro", description: "Nao foi possivel carregar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceClick = (invoice) => {
    setInvoiceRequests(allRequests.filter((request) => request.invoice_id === invoice.id));
    setSelectedInvoice(invoice);
  };

  const handleRequestInvoice = async () => {
    try {
      const publicSettings = await remoteClient.settings.getPublic();
      const adminWhatsapp = publicSettings?.admin_whatsapp;
      if (!adminWhatsapp) {
        toast({ title: "Entre em contato com o administrador para solicitar a fatura.", duration: 4000 });
        return;
      }
      const total = unbilledRequests.reduce((sum, request) => sum + request.total_value, 0);
      const message = `Ola! Gostaria de solicitar a geracao da fatura dos meus pedidos nao faturados.\n\nDados:\n- Pedidos: ${unbilledRequests.length}\n- Total: ${fmtMoney(total)}\n\nObrigado!`;
      window.open(`https://wa.me/${adminWhatsapp}?text=${encodeURIComponent(message)}`, "_blank");
      toast({ title: "WhatsApp aberto", description: "Envie a mensagem para solicitar a fatura.", duration: 3000 });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (loading) return <PageState />;
  if (!user || user.payment_type !== "postpaid") return <PageState denied />;

  const filteredInvoices = activeTab === "all" ? invoices : invoices.filter((invoice) => invoice.status === activeTab);
  const paidTotal = invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.total_value, 0);

  return (
    <div className="postpay-page">
      <main className="postpay-shell">
        <section className="postpay-hero">
          <div>
            <span>Financeiro</span>
            <h1>Pos-pago</h1>
            <p>Gerencie saldo devedor, faturas, consumo mensal e pedidos ainda nao faturados.</p>
          </div>
          <button className="postpay-action" onClick={loadData} type="button">Atualizar</button>
        </section>

        <section className="postpay-stats">
          <StatCard icon={DollarSign} label="Saldo devedor" value={fmtMoney(stats.saldoDevedor)} hint={`${invoices.filter((invoice) => invoice.status === "pending").length} faturas pendentes`} />
          <StatCard icon={Clock} label="Proximo vencimento" tone={stats.proximoVencimento ? "warn" : "ok"} value={stats.proximoVencimento ? formatBrasiliaDate(stats.proximoVencimento.due_date, "dd/MM") : "Nenhum"} hint={stats.proximoVencimento ? `Fatura ${stats.proximoVencimento.invoice_number}` : "Todas em dia"} />
          <StatCard icon={FileText} label="Ultima fatura" value={stats.ultimaFatura ? fmtMoney(stats.ultimaFatura.total_value) : "Nenhuma"} hint={stats.ultimaFatura ? formatBrasiliaDate(stats.ultimaFatura.created_date, "dd/MM/yyyy") : "Sem faturas"} />
          <StatCard icon={TrendingUp} label="Consumo este mes" value={fmtMoney(stats.totalGastoMes)} hint={`${stats.pedidosNaoFaturados} pedidos nao faturados`} />
        </section>

        <section className="postpay-workbench">
          <div className="postpay-main">
            <div className="postpay-tabs">
              {[
                ["all", "Todas"],
                ["pending", "Pendentes"],
                ["paid", "Pagas"],
              ].map(([key, label]) => (
                <button className={activeTab === key ? "active" : ""} key={key} onClick={() => setActiveTab(key)} type="button">
                  {label} ({key === "all" ? invoices.length : invoices.filter((invoice) => invoice.status === key).length})
                </button>
              ))}
            </div>

            {filteredInvoices.length === 0 ? (
              <section className="postpay-empty">
                <FileText size={28} />
                <strong>Nenhuma fatura encontrada</strong>
              </section>
            ) : (
              <div className="postpay-invoices">
                {filteredInvoices.map((invoice) => (
                  <InvoiceCard invoice={invoice} key={invoice.id} onClick={() => handleInvoiceClick(invoice)} />
                ))}
              </div>
            )}
          </div>

          <aside className="postpay-side">
            {unbilledRequests.length > 0 && (
              <section className="postpay-panel">
                <div className="postpay-panel-head">
                  <div className="postpay-icon"><Clock size={18} /></div>
                  <div>
                    <strong>Pedidos nao faturados</strong>
                    <span>Proxima fatura</span>
                  </div>
                </div>
                <div className="postpay-info">
                  <div><span>Pedidos</span><strong>{unbilledRequests.length}</strong></div>
                  <div><span>Creditos</span><strong>{fmtNumber(unbilledRequests.reduce((sum, request) => sum + request.requested_credits, 0))}</strong></div>
                  <div><span>Estimado</span><strong className="accent">{fmtMoney(unbilledRequests.reduce((sum, request) => sum + request.total_value, 0))}</strong></div>
                </div>
                <button className="postpay-action primary" onClick={handleRequestInvoice} type="button">
                  <MessageSquare size={15} />
                  Solicitar fatura
                </button>
              </section>
            )}

            <ConsumptionChart monthlyData={monthlyData} />

            <section className="postpay-panel">
              <div className="postpay-panel-head">
                <div className="postpay-icon"><BarChart3 size={18} /></div>
                <div>
                  <strong>Estatisticas</strong>
                  <span>Historico consolidado</span>
                </div>
              </div>
              <div className="postpay-info">
                <div><span>Total faturas</span><strong>{invoices.length}</strong></div>
                <div><span>Faturas pagas</span><strong className="accent">{invoices.filter((invoice) => invoice.status === "paid").length}</strong></div>
                <div><span>Total pago</span><strong>{fmtMoney(paidTotal)}</strong></div>
              </div>
            </section>
          </aside>
        </section>
      </main>

      {selectedInvoice && (
        <DetailModal
          invoice={selectedInvoice}
          onClose={() => {
            setSelectedInvoice(null);
            setInvoiceRequests([]);
          }}
          requests={invoiceRequests}
        />
      )}

      <style>{postpayStyles}</style>
    </div>
  );
}

const postpayStyles = `
.postpay-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.postpay-shell {
  width: min(1500px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.postpay-hero,
.postpay-stat,
.postpay-panel,
.postpay-invoice,
.postpay-empty,
.postpay-state,
.postpay-modal {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.postpay-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.postpay-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.postpay-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(38px, 6vw, 68px);
  line-height: .9;
  font-weight: 950;
}

.postpay-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.postpay-action {
  border: 0;
  min-height: 42px;
  padding: 0 15px;
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

.postpay-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.postpay-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.postpay-stat {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.postpay-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 16px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.postpay-stat span,
.postpay-info span,
.postpay-bars span,
.postpay-invoice-data span,
.postpay-panel-head span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.postpay-stat strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(18px, 2vw, 26px);
  line-height: 1.05;
  font-weight: 950;
}

.postpay-stat small {
  display: block;
  margin-top: 5px;
  color: var(--j2-faint);
  font-size: 11px;
}

.postpay-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}

.postpay-main,
.postpay-side,
.postpay-invoices,
.postpay-info,
.postpay-bars {
  display: grid;
  gap: 12px;
}

.postpay-tabs {
  width: fit-content;
  border-radius: 17px;
  padding: 5px;
  display: flex;
  gap: 5px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.postpay-tabs button {
  border: 0;
  min-height: 38px;
  border-radius: 13px;
  padding: 0 12px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.postpay-tabs button.active {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.postpay-panel,
.postpay-empty {
  min-width: 0;
  border-radius: 26px;
  padding: 16px;
}

.postpay-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.postpay-panel-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.postpay-invoice {
  width: 100%;
  min-width: 0;
  border-radius: 24px;
  padding: 16px;
  cursor: pointer;
  text-align: left;
}

.postpay-invoice-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.postpay-invoice-head strong {
  display: block;
  color: var(--j2-text);
  font-size: 15px;
  font-weight: 950;
}

.postpay-invoice-head span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
}

.postpay-invoice-head em {
  border-radius: 999px;
  padding: 5px 10px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
}

.postpay-invoice-head em.bad { color: #ff5b5b; }
.postpay-invoice-head em.warn { color: #f5b942; }

.postpay-invoice-data,
.postpay-modal-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.postpay-invoice-data div,
.postpay-info div,
.postpay-modal-stats div,
.postpay-modal-list article {
  border: 0;
  border-radius: 16px;
  padding: 12px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.postpay-invoice-data strong,
.postpay-info strong,
.postpay-bars strong,
.postpay-modal-stats strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.postpay-invoice-data strong.accent,
.postpay-info strong.accent,
.postpay-modal-stats strong.accent,
.postpay-modal-list article > div:last-child strong {
  color: var(--j2-accent);
}

.postpay-bars > div > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.postpay-bars i {
  display: block;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.postpay-bars b {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--j2-accent), var(--j2-accent-deep));
}

.postpay-empty,
.postpay-empty-mini {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.postpay-empty svg {
  color: var(--j2-accent);
}

.postpay-empty strong {
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.postpay-state {
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

.postpay-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.postpay-state p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.postpay-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, .78);
}

.postpay-modal {
  width: min(920px, 100%);
  max-height: min(900px, 92dvh);
  overflow: auto;
  border-radius: 26px;
  padding: 18px;
}

.postpay-modal header,
.postpay-modal footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.postpay-modal header strong {
  display: block;
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.postpay-modal header span {
  display: block;
  color: var(--j2-muted);
  font-size: 12px;
}

.postpay-modal header button,
.postpay-modal footer button {
  border: 0;
  min-height: 40px;
  border-radius: 15px;
  padding: 0 14px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.postpay-modal-stats {
  margin: 16px 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.postpay-modal-list {
  display: grid;
  gap: 9px;
}

.postpay-modal-list > span {
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.postpay-modal-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.postpay-modal-list article strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
}

.postpay-modal-list article small,
.postpay-modal-list article span {
  display: block;
  margin-top: 4px;
  color: var(--j2-muted);
  font-size: 11px;
}

.postpay-modal footer {
  margin-top: 16px;
  justify-content: flex-end;
}

.postpay-spin {
  animation: postpaySpin .8s linear infinite;
}

@keyframes postpaySpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .postpay-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .postpay-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .postpay-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .postpay-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .postpay-hero h1 {
    font-size: clamp(38px, 12vw, 54px);
  }

  .postpay-hero .postpay-action,
  .postpay-panel .postpay-action {
    width: 100%;
  }

  .postpay-stats,
  .postpay-invoice-data,
  .postpay-modal-stats,
  .postpay-modal-list article {
    grid-template-columns: 1fr;
  }

  .postpay-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .postpay-invoice-head {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .postpay-invoice-head em {
    grid-column: 1 / -1;
    width: fit-content;
  }
}
`;
