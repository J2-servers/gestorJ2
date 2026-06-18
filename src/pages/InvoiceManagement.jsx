import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { useToast } from "@/components/ui/use-toast";
import { formatBrasiliaDate } from "../components/utils/dateHelper";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  TrendingUp,
  User,
} from "lucide-react";

const fmtMoney = (value = 0) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const fmtNumber = (value = 0) => Number(value || 0).toLocaleString("pt-BR");

const isStaff = (user) => user?.role === "admin" || user?.role === "dev";

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <article className="invoice-metric">
      <div className="invoice-icon">
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

function PageState({ type = "loading", text }) {
  return (
    <div className="invoice-page">
      <div className="invoice-state">
        {type === "loading" ? <Loader2 className="invoice-spin" size={28} /> : <AlertCircle size={30} />}
        <strong>{type === "loading" ? "Carregando financeiro" : "Acesso negado"}</strong>
        <p>{text}</p>
      </div>
      <style>{invoiceStyles}</style>
    </div>
  );
}

function Column({ accent = "default", children, count, icon: Icon, title }) {
  return (
    <section className={`invoice-column ${accent}`}>
      <header>
        <div className="invoice-column-icon">
          <Icon size={16} />
        </div>
        <div>
          <strong>{title}</strong>
          <span>{count} {count === 1 ? "item" : "itens"}</span>
        </div>
      </header>
      <div className="invoice-column-body">{children}</div>
    </section>
  );
}

function EmptyColumn({ text }) {
  return (
    <div className="invoice-empty-column">
      <FileText size={22} />
      <span>{text}</span>
    </div>
  );
}

function ActionButton({ children, disabled, onClick, tone = "default" }) {
  return (
    <button className={`invoice-action ${tone}`} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function PendingResellerCard({ data, busy, onGenerate }) {
  const name = data?.reseller?.full_name || data?.reseller?.name || data?.reseller?.email || "Revendedor";
  return (
    <article className="invoice-card">
      <div className="invoice-card-head">
        <div className="invoice-avatar">
          <User size={16} />
        </div>
        <div>
          <strong>{name}</strong>
          <span>{data?.requests?.length || 0} pedidos aprovados</span>
        </div>
      </div>

      <div className="invoice-data-list">
        <div>
          <span>Creditos</span>
          <strong>{fmtNumber(data?.totalCredits)}</strong>
        </div>
        <div>
          <span>Valor total</span>
          <strong>{fmtMoney(data?.totalValue)}</strong>
        </div>
      </div>

      <ActionButton disabled={busy} onClick={() => onGenerate(data)} tone="primary">
        {busy ? (
          <>
            <Loader2 className="invoice-spin" size={14} />
            Gerando
          </>
        ) : (
          <>
            <FileText size={14} />
            Gerar fatura
          </>
        )}
      </ActionButton>
    </article>
  );
}

function PendingInvoiceCard({ busy, invoice, onPaid }) {
  return (
    <article className="invoice-card">
      <div className="invoice-card-head">
        <div className="invoice-avatar warn">
          <FileText size={16} />
        </div>
        <div>
          <strong>{invoice?.invoice_number}</strong>
          <span>{invoice?.reseller_name || "Revendedor"}</span>
        </div>
      </div>

      <div className="invoice-data-list">
        <div>
          <span>Vencimento</span>
          <strong>{invoice?.due_date ? formatBrasiliaDate(invoice.due_date, "dd/MM/yyyy") : "--"}</strong>
        </div>
        <div>
          <span>Pedidos</span>
          <strong>{invoice?.request_count || 0}</strong>
        </div>
        <div>
          <span>Valor</span>
          <strong>{fmtMoney(invoice?.total_value)}</strong>
        </div>
      </div>

      <ActionButton disabled={busy} onClick={() => onPaid(invoice)} tone="soft">
        {busy ? (
          <>
            <Loader2 className="invoice-spin" size={14} />
            Processando
          </>
        ) : (
          <>
            <CheckCircle size={14} />
            Marcar como pago
          </>
        )}
      </ActionButton>
    </article>
  );
}

function PaidInvoiceCard({ busy, invoice, onResend }) {
  return (
    <article className="invoice-card paid">
      <div className="invoice-card-head">
        <div className="invoice-avatar paid">
          <CheckCircle size={16} />
        </div>
        <div>
          <strong>{invoice?.invoice_number}</strong>
          <span>{invoice?.reseller_name || "Revendedor"}</span>
        </div>
      </div>

      <div className="invoice-data-list">
        <div>
          <span>Pago em</span>
          <strong>{invoice?.paid_date ? formatBrasiliaDate(invoice.paid_date, "dd/MM/yyyy") : "--"}</strong>
        </div>
        <div>
          <span>Valor</span>
          <strong>{fmtMoney(invoice?.total_value)}</strong>
        </div>
      </div>

      <ActionButton disabled={busy} onClick={() => onResend(invoice)} tone="ghost">
        {busy ? (
          <>
            <Loader2 className="invoice-spin" size={14} />
            Enviando
          </>
        ) : (
          <>
            <Send size={14} />
            Reenviar comprovante
          </>
        )}
      </ActionButton>
    </article>
  );
}

export default function InvoiceManagement() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [resendingReceipt, setResendingReceipt] = useState(null);
  const [pendingByReseller, setPendingByReseller] = useState([]);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [paidInvoices, setPaidInvoices] = useState([]);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setRefreshing(silent);
      try {
        const currentUser = await remoteClient.auth.me();
        setUser(currentUser);
        if (!isStaff(currentUser)) return;

        const [allUsers, allReqsResult, allInvoices] = await Promise.all([
          remoteClient.users.list(),
          remoteClient.creditRequests.list(null, 1000),
          remoteClient.invoices.list(),
        ]);

        const allRequests = allReqsResult?.data || [];
        const postpaidResellers = (allUsers || []).filter(
          (item) => item?.role === "user" && item?.payment_type === "postpaid",
        );
        const resellerIds = new Set(postpaidResellers.map((item) => item.id));

        const unbilled = postpaidResellers
          .map((reseller) => {
            const requests = allRequests.filter(
              (request) =>
                request?.reseller_id === reseller?.id &&
                request?.payment_type === "postpaid" &&
                request?.status === "recharged" &&
                !request?.invoice_id,
            );

            return {
              reseller,
              requests,
              totalCredits: requests.reduce((sum, request) => sum + Number(request?.requested_credits || 0), 0),
              totalValue: requests.reduce((sum, request) => sum + Number(request?.total_value || 0), 0),
            };
          })
          .filter((item) => item.requests.length > 0)
          .sort((a, b) => b.totalValue - a.totalValue);

        setPendingByReseller(unbilled);
        setPendingInvoices((allInvoices || []).filter((invoice) => resellerIds.has(invoice?.reseller_id) && invoice?.status === "pending"));
        setPaidInvoices((allInvoices || []).filter((invoice) => resellerIds.has(invoice?.reseller_id) && invoice?.status === "paid"));
      } catch (error) {
        toast({
          title: "Erro",
          description: error?.message || "Nao foi possivel carregar o financeiro.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totals = useMemo(() => {
    const pendingValue = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice?.total_value || 0), 0);
    const paidValue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice?.total_value || 0), 0);
    const unbilledValue = pendingByReseller.reduce((sum, item) => sum + Number(item?.totalValue || 0), 0);
    const unbilledCredits = pendingByReseller.reduce((sum, item) => sum + Number(item?.totalCredits || 0), 0);
    return { paidValue, pendingValue, unbilledCredits, unbilledValue };
  }, [paidInvoices, pendingByReseller, pendingInvoices]);

  const generateInvoice = async (data) => {
    if (!data?.reseller?.id) return;
    setGeneratingInvoice(data.reseller.id);
    try {
      const invoice = await remoteClient.invoices.generate(data.reseller.id);
      toast({
        title: "Fatura gerada",
        description: `${invoice?.invoice_number || "Fatura"} com ${data?.requests?.length || 0} pedidos.`,
      });
      await loadData(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao gerar fatura.",
        variant: "destructive",
      });
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const markAsPaid = async (invoice) => {
    if (!invoice?.id || processingPayment === invoice.id) return;
    setProcessingPayment(invoice.id);
    try {
      await remoteClient.invoices.markPaid(invoice.id, null);
      toast({
        title: "Fatura paga",
        description: `${invoice?.invoice_number || "Fatura"} confirmada.`,
      });
      await loadData(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel atualizar.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const resendReceipt = async (invoice) => {
    if (!invoice?.id || resendingReceipt === invoice.id) return;
    setResendingReceipt(invoice.id);
    try {
      await remoteClient.invoices.resend(invoice.id);
      toast({ title: "Comprovante reenviado" });
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel reenviar.",
        variant: "destructive",
      });
    } finally {
      setResendingReceipt(null);
    }
  };

  if (loading) {
    return <PageState text="Buscando pedidos pos-pago, faturas abertas e historico pago." />;
  }

  if (!isStaff(user)) {
    return <PageState type="denied" text="Esta area e exclusiva para administradores do sistema." />;
  }

  return (
    <div className="invoice-page">
      <div className="invoice-shell">
        <section className="invoice-hero">
          <div>
            <span>Financeiro</span>
            <h1>Faturas pos-pago</h1>
            <p>Controle de pedidos faturaveis, cobrancas pendentes e comprovantes reenviados.</p>
          </div>
          <button className="invoice-refresh" disabled={refreshing} onClick={() => loadData(true)} type="button">
            <RefreshCw className={refreshing ? "invoice-spin" : ""} size={16} />
            Atualizar
          </button>
        </section>

        <section className="invoice-metrics">
          <Metric icon={Clock} label="A faturar" value={fmtMoney(totals.unbilledValue)} hint={`${fmtNumber(totals.unbilledCredits)} creditos`} />
          <Metric icon={AlertCircle} label="Em aberto" value={fmtMoney(totals.pendingValue)} hint={`${pendingInvoices.length} faturas`} />
          <Metric icon={CheckCircle} label="Recebido" value={fmtMoney(totals.paidValue)} hint={`${paidInvoices.length} pagas`} />
          <Metric icon={TrendingUp} label="Ciclo" value={fmtNumber(pendingByReseller.length)} hint="revendedores prontos" />
        </section>

        <section className="invoice-board">
          <Column accent="pending" count={pendingByReseller.length} icon={Clock} title="Pedidos aprovados">
            {pendingByReseller.length === 0 ? (
              <EmptyColumn text="Nenhum pedido pendente de faturamento." />
            ) : (
              pendingByReseller.map((data) => (
                <PendingResellerCard
                  busy={generatingInvoice === data?.reseller?.id}
                  data={data}
                  key={data?.reseller?.id}
                  onGenerate={generateInvoice}
                />
              ))
            )}
          </Column>

          <Column accent="open" count={pendingInvoices.length} icon={AlertCircle} title="Faturas abertas">
            {pendingInvoices.length === 0 ? (
              <EmptyColumn text="Nenhuma fatura aguardando pagamento." />
            ) : (
              pendingInvoices.map((invoice) => (
                <PendingInvoiceCard
                  busy={processingPayment === invoice?.id}
                  invoice={invoice}
                  key={invoice?.id}
                  onPaid={markAsPaid}
                />
              ))
            )}
          </Column>

          <Column accent="paid" count={paidInvoices.length} icon={CheckCircle} title="Faturas pagas">
            {paidInvoices.length === 0 ? (
              <EmptyColumn text="Nenhuma fatura paga ainda." />
            ) : (
              paidInvoices.slice(0, 14).map((invoice) => (
                <PaidInvoiceCard
                  busy={resendingReceipt === invoice?.id}
                  invoice={invoice}
                  key={invoice?.id}
                  onResend={resendReceipt}
                />
              ))
            )}
          </Column>
        </section>
      </div>
      <style>{invoiceStyles}</style>
    </div>
  );
}

const invoiceStyles = `
.invoice-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 52%, #010202 100%);
  overflow-x: hidden;
}

.invoice-shell {
  width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.invoice-hero,
.invoice-metric,
.invoice-column,
.invoice-card,
.invoice-state {
  border: 0;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.invoice-hero {
  min-width: 0;
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.invoice-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.invoice-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(32px, 5vw, 56px);
  line-height: .95;
  font-weight: 950;
}

.invoice-hero p {
  max-width: 680px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.invoice-refresh,
.invoice-action {
  border: 0;
  min-height: 44px;
  border-radius: 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 900;
  cursor: pointer;
}

.invoice-refresh {
  flex: 0 0 auto;
  padding: 0 16px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
}

.invoice-refresh svg {
  color: var(--j2-accent);
}

.invoice-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.invoice-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.invoice-icon,
.invoice-column-icon,
.invoice-avatar {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.invoice-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
}

.invoice-metric span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.invoice-metric strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(20px, 2.2vw, 28px);
  line-height: 1;
  font-weight: 950;
}

.invoice-metric small {
  display: block;
  margin-top: 5px;
  color: var(--j2-faint);
  font-size: 11px;
}

.invoice-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.invoice-column {
  min-width: 0;
  border-radius: 24px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invoice-column header {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 58px;
  padding: 10px;
  border-radius: 18px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.invoice-column-icon,
.invoice-avatar {
  width: 38px;
  height: 38px;
  border-radius: 14px;
}

.invoice-column header strong {
  display: block;
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 950;
}

.invoice-column header span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 750;
}

.invoice-column-body {
  display: grid;
  gap: 10px;
}

.invoice-card {
  min-width: 0;
  border-radius: 20px;
  padding: 14px;
}

.invoice-card-head {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  margin-bottom: 13px;
}

.invoice-avatar.warn {
  color: #f5b942;
}

.invoice-avatar.paid {
  color: #ff8a4a;
}

.invoice-card-head div:last-child {
  min-width: 0;
}

.invoice-card-head strong {
  display: block;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invoice-card-head span {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invoice-data-list {
  display: grid;
  gap: 7px;
  margin-bottom: 13px;
}

.invoice-data-list div {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  border-radius: 12px;
  background: rgba(3, 4, 4, .60);
  box-shadow: var(--j2-sunken);
}

.invoice-data-list span {
  color: var(--j2-muted);
  font-size: 12px;
}

.invoice-data-list strong {
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
  text-align: right;
}

.invoice-data-list div:last-child strong,
.invoice-card:first-child .invoice-data-list strong:last-child {
  color: var(--j2-accent);
}

.invoice-action {
  width: 100%;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  font-size: 12px;
  transition: transform .18s ease, opacity .18s ease;
}

.invoice-action:hover {
  transform: translateY(-1px);
}

.invoice-action.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.invoice-action.soft {
  color: var(--j2-accent);
  background: rgba(255, 255, 255, .035);
}

.invoice-action.ghost {
  color: #ff8a4a;
  background: rgba(255, 255, 255, .028);
}

.invoice-action:disabled {
  opacity: .55;
  cursor: not-allowed;
  transform: none;
}

.invoice-empty-column {
  min-height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  border-radius: 20px;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .66);
  box-shadow: var(--j2-sunken);
  text-align: center;
  padding: 18px;
}

.invoice-empty-column span {
  max-width: 220px;
  color: var(--j2-muted);
  font-size: 13px;
}

.invoice-state {
  width: min(420px, calc(100vw - 28px));
  min-height: 250px;
  margin: 18dvh auto 0;
  border-radius: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.invoice-state svg {
  color: var(--j2-accent);
}

.invoice-state strong {
  color: var(--j2-text);
  font-size: 20px;
}

.invoice-state p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.invoice-spin {
  animation: invoiceSpin .8s linear infinite;
}

@keyframes invoiceSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1280px) {
  .invoice-board {
    grid-template-columns: 1fr;
  }

  .invoice-column-body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .invoice-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .invoice-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .invoice-hero {
    border-radius: 24px;
    align-items: stretch;
    flex-direction: column;
  }

  .invoice-refresh {
    width: 100%;
  }

  .invoice-metrics,
  .invoice-column-body {
    grid-template-columns: 1fr;
  }

  .invoice-metric,
  .invoice-column,
  .invoice-card {
    border-radius: 20px;
  }

  .invoice-hero h1 {
    font-size: clamp(34px, 11vw, 48px);
  }
}
`;
