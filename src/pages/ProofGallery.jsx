import React, { useCallback, useEffect, useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { toast } from "@/components/ui/use-toast";
import { formatBrasiliaDate, formatFullBrasiliaDate } from "../components/utils/dateHelper";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Eye,
  Image,
  Loader2,
  Search,
  User,
  X,
} from "lucide-react";

const STATUS = {
  all: { label: "Todos", tone: "all" },
  pending: { label: "Pendente", tone: "pending" },
  analyzing: { label: "Analise", tone: "analyzing" },
  recharged: { label: "Aprovado", tone: "approved" },
  approved: { label: "Aprovado", tone: "approved" },
  rejected: { label: "Rejeitado", tone: "rejected" },
  canceled: { label: "Cancelado", tone: "cancelled" },
  cancelled: { label: "Cancelado", tone: "cancelled" },
};

const isStaff = (user) => user?.role === "admin" || user?.role === "dev";

const fmtMoney = (value = 0) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function PageState({ type = "loading", text }) {
  return (
    <div className="proof-page">
      <div className="proof-state">
        {type === "loading" ? <Loader2 className="proof-spin" size={28} /> : <AlertCircle size={30} />}
        <strong>{type === "loading" ? "Carregando comprovantes" : "Acesso negado"}</strong>
        <p>{text}</p>
      </div>
      <style>{proofStyles}</style>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return (
    <article className="proof-metric">
      <div className="proof-icon">
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

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return <span className={`proof-badge ${cfg.tone}`}>{cfg.label}</span>;
}

function EmptyGallery({ filtered }) {
  return (
    <div className="proof-empty">
      <div className="proof-empty-icon">
        <Image size={28} />
      </div>
      <strong>Nenhum comprovante encontrado</strong>
      <p>{filtered ? "Tente ajustar busca e filtros." : "Nao ha comprovantes nos ultimos 30 dias."}</p>
    </div>
  );
}

function ProofCard({ onClick, proof }) {
  return (
    <button className="proof-card" onClick={onClick} type="button">
      <div className="proof-thumb">
        {proof?.proof_of_payment_url ? (
          <img
            alt="Comprovante"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            src={proof.proof_of_payment_url}
          />
        ) : (
          <Image size={34} />
        )}
        <StatusBadge status={proof?.status} />
        <span className="proof-view">
          <Eye size={15} />
          abrir
        </span>
      </div>

      <div className="proof-card-body">
        <div className="proof-person">
          <div className="proof-avatar">
            <User size={14} />
          </div>
          <div>
            <strong>{proof?.reseller_name || "Revendedor"}</strong>
            <span>{proof?.reseller_email || "email nao informado"}</span>
          </div>
        </div>

        <div className="proof-card-info">
          <span>{proof?.server_name || "Servidor"}</span>
          <strong>{fmtMoney(proof?.total_value)}</strong>
        </div>
      </div>
    </button>
  );
}

function ProofModal({ onClose, proof }) {
  if (!proof) return null;
  const rows = [
    ["Servidor", proof?.server_name || "N/A"],
    ["Login", proof?.login || "--"],
    ["Creditos", proof?.requested_credits?.toLocaleString("pt-BR") || "0"],
    ["Valor", fmtMoney(proof?.total_value)],
    ["Data", proof?.created_date ? formatFullBrasiliaDate(proof.created_date) : "--"],
  ];

  return (
    <div className="proof-modal-backdrop" onClick={onClose}>
      <section className="proof-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <div className="proof-icon">
              <Image size={18} />
            </div>
            <div>
              <strong>Comprovante</strong>
              <span>Pedido #{String(proof?.id || "").slice(-8)}</span>
            </div>
          </div>
          <button onClick={onClose} type="button" aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="proof-modal-grid">
          <div className="proof-modal-image">
            {proof?.proof_of_payment_url ? (
              <img alt="Comprovante ampliado" src={proof.proof_of_payment_url} />
            ) : (
              <Image size={42} />
            )}
          </div>

          <aside className="proof-modal-info">
            <div className="proof-modal-status">
              <span>Status</span>
              <StatusBadge status={proof?.status} />
            </div>

            <div className="proof-person proof-modal-person">
              <div className="proof-avatar">
                <User size={14} />
              </div>
              <div>
                <strong>{proof?.reseller_name || "Revendedor"}</strong>
                <span>{proof?.reseller_email || "email nao informado"}</span>
              </div>
            </div>

            <div className="proof-detail-list">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            {proof?.notes && (
              <div className="proof-notes">
                <span>Observacao</span>
                <p>{proof.notes}</p>
              </div>
            )}
          </aside>
        </div>

        <footer>
          <button
            disabled={!proof?.proof_of_payment_url}
            onClick={() => proof?.proof_of_payment_url && window.open(proof.proof_of_payment_url, "_blank")}
            type="button"
          >
            <Download size={15} />
            Abrir imagem
          </button>
          <button className="primary" onClick={onClose} type="button">
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function ProofGallery() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofs, setProofs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProof, setSelectedProof] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await remoteClient.auth.me();
      setUser(currentUser);
      if (!isStaff(currentUser)) return;

      const [allUsers, allReqsResult] = await Promise.all([
        remoteClient.users.list(),
        remoteClient.creditRequests.list(null, 1000),
      ]);

      const resellerMap = {};
      (allUsers || [])
        .filter((item) => item?.role === "user")
        .forEach((reseller) => {
          resellerMap[reseller?.id] = {
            email: reseller?.email,
            name: reseller?.full_name || reseller?.name || reseller?.email,
          };
        });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allRequests = allReqsResult?.data || [];
      const data = allRequests
        .filter((request) => request?.proof_of_payment_url && new Date(request?.created_date) >= thirtyDaysAgo)
        .map((request) => ({
          ...request,
          reseller_email: resellerMap[request?.reseller_id]?.email || "",
          reseller_name: resellerMap[request?.reseller_id]?.name || "Revendedor",
          server_name: request?.server_snapshot?.name || "Servidor",
        }))
        .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

      setProofs(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel carregar comprovantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProofs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return proofs.filter((proof) => {
      const matchesTerm =
        !term ||
        [proof?.reseller_name, proof?.reseller_email, proof?.server_name, proof?.login]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || proof?.status === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [proofs, searchTerm, statusFilter]);

  const metrics = useMemo(
    () => ({
      approved: proofs.filter((proof) => proof.status === "recharged" || proof.status === "approved").length,
      pending: proofs.filter((proof) => proof.status === "pending" || proof.status === "analyzing").length,
      rejected: proofs.filter((proof) => proof.status === "rejected").length,
      total: proofs.length,
    }),
    [proofs],
  );

  const filters = [
    { key: "all", label: `Todos (${proofs.length})` },
    { key: "pending", label: `Pendentes (${proofs.filter((proof) => proof.status === "pending").length})` },
    { key: "analyzing", label: `Analise (${proofs.filter((proof) => proof.status === "analyzing").length})` },
    { key: "recharged", label: `Aprovados (${proofs.filter((proof) => proof.status === "recharged").length})` },
    { key: "rejected", label: `Rejeitados (${proofs.filter((proof) => proof.status === "rejected").length})` },
  ];

  if (loading) {
    return <PageState text="Buscando imagens e pedidos dos ultimos 30 dias." />;
  }

  if (!isStaff(user)) {
    return <PageState type="denied" text="Esta galeria e exclusiva para administradores." />;
  }

  return (
    <div className="proof-page">
      <div className="proof-shell">
        <section className="proof-hero">
          <div>
            <span>Comprovantes</span>
            <h1>Galeria</h1>
            <p>Visualize pagamentos enviados nos ultimos 30 dias com filtro por status, servidor e revendedor.</p>
          </div>
        </section>

        <section className="proof-metrics">
          <Metric icon={Image} label="Total" value={metrics.total} hint="comprovantes" />
          <Metric icon={AlertCircle} label="Pendentes" value={metrics.pending} hint="exigem atencao" />
          <Metric icon={CheckCircle} label="Aprovados" value={metrics.approved} hint="recargas feitas" />
          <Metric icon={X} label="Rejeitados" value={metrics.rejected} hint="corrigir pedido" />
        </section>

        <section className="proof-toolbar">
          <div className="proof-search">
            <Search size={17} />
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por revendedor, servidor ou login"
              value={searchTerm}
            />
          </div>
          <div className="proof-filters">
            {filters.map((filter) => (
              <button
                className={statusFilter === filter.key ? "active" : ""}
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {filteredProofs.length === 0 ? (
          <EmptyGallery filtered={Boolean(searchTerm || statusFilter !== "all")} />
        ) : (
          <section className="proof-grid">
            {filteredProofs.map((proof) => (
              <ProofCard key={proof?.id} onClick={() => setSelectedProof(proof)} proof={proof} />
            ))}
          </section>
        )}
      </div>

      {selectedProof && <ProofModal onClose={() => setSelectedProof(null)} proof={selectedProof} />}
      <style>{proofStyles}</style>
    </div>
  );
}

const proofStyles = `
.proof-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 52%, #010202 100%);
  overflow-x: hidden;
}

.proof-shell {
  width: 100%;
  min-height: 100dvh;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.6vw, 22px);
}

.proof-hero,
.proof-metric,
.proof-toolbar,
.proof-card,
.proof-empty,
.proof-modal,
.proof-state {
  border: 0;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.proof-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
}

.proof-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.proof-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(36px, 6vw, 66px);
  line-height: .9;
  font-weight: 950;
}

.proof-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.proof-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.proof-metric {
  min-width: 0;
  border-radius: 22px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.proof-icon,
.proof-avatar,
.proof-empty-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.proof-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
}

.proof-metric span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
}

.proof-metric strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text);
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1;
  font-weight: 950;
}

.proof-metric small {
  display: block;
  margin-top: 5px;
  color: var(--j2-faint);
  font-size: 11px;
}

.proof-toolbar {
  border-radius: 24px;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.proof-search {
  min-height: 48px;
  border-radius: 17px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.proof-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--j2-text);
  background: transparent;
}

.proof-search input::placeholder {
  color: var(--j2-faint);
}

.proof-filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.proof-filters button,
.proof-modal footer button {
  border: 0;
  min-height: 38px;
  border-radius: 14px;
  padding: 0 12px;
  color: var(--j2-muted);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
}

.proof-filters button.active,
.proof-modal footer button.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--j2-neu-soft);
}

.proof-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.proof-card {
  min-width: 0;
  overflow: hidden;
  border-radius: 22px;
  padding: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform .18s ease;
}

.proof-card:hover {
  transform: translateY(-2px);
}

.proof-thumb {
  height: 210px;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .86);
  box-shadow: var(--j2-sunken);
}

.proof-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .24s ease;
}

.proof-card:hover .proof-thumb img {
  transform: scale(1.04);
}

.proof-view {
  position: absolute;
  left: 10px;
  bottom: 10px;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 999px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .78);
  box-shadow: var(--j2-sunken);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.proof-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  min-height: 27px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .78);
  box-shadow: var(--j2-sunken);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.proof-badge.approved {
  color: #ff8a4a;
}

.proof-badge.pending,
.proof-badge.analyzing {
  color: #f5b942;
}

.proof-badge.rejected {
  color: #ff5b5b;
}

.proof-card-body {
  padding: 14px;
}

.proof-person {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.proof-avatar {
  width: 38px;
  height: 38px;
  border-radius: 14px;
}

.proof-person div:last-child {
  min-width: 0;
}

.proof-person strong {
  display: block;
  overflow: hidden;
  color: var(--j2-text);
  font-size: 14px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-person span {
  display: block;
  margin-top: 3px;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-card-info {
  margin-top: 13px;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  border-radius: 13px;
  background: rgba(3, 4, 4, .62);
  box-shadow: var(--j2-sunken);
}

.proof-card-info span {
  min-width: 0;
  overflow: hidden;
  color: var(--j2-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-card-info strong {
  flex: 0 0 auto;
  color: var(--j2-accent);
  font-size: 13px;
  font-weight: 950;
}

.proof-empty,
.proof-state {
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

.proof-empty-icon {
  width: 78px;
  height: 78px;
  border-radius: 26px;
  margin-bottom: 6px;
}

.proof-empty strong,
.proof-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.proof-empty p,
.proof-state p {
  max-width: 360px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.proof-state {
  width: min(420px, calc(100vw - 28px));
  margin: 18dvh auto 0;
}

.proof-state svg {
  color: var(--j2-accent);
}

.proof-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, .82);
}

.proof-modal {
  width: min(980px, 100%);
  max-height: min(900px, 92dvh);
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.proof-modal header,
.proof-modal footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(3, 4, 4, .68);
  box-shadow: var(--j2-sunken);
}

.proof-modal header > div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.proof-modal header strong {
  display: block;
  color: var(--j2-text);
  font-size: 15px;
  font-weight: 950;
}

.proof-modal header span {
  display: block;
  color: var(--j2-muted);
  font-size: 12px;
}

.proof-modal header button {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
}

.proof-modal-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
  gap: 16px;
  overflow-y: auto;
  padding: 16px;
}

.proof-modal-image {
  min-height: 420px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 22px;
  color: var(--j2-faint);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.proof-modal-image img {
  width: 100%;
  max-height: 70dvh;
  object-fit: contain;
}

.proof-modal-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.proof-modal-status,
.proof-modal-person,
.proof-detail-list,
.proof-notes {
  border-radius: 18px;
  padding: 12px;
  background: rgba(3, 4, 4, .68);
  box-shadow: var(--j2-sunken);
}

.proof-modal-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.proof-modal-status > span,
.proof-notes span {
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.proof-detail-list {
  display: grid;
  gap: 8px;
}

.proof-detail-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--j2-muted);
  font-size: 12px;
}

.proof-detail-list strong {
  color: var(--j2-text);
  text-align: right;
  overflow-wrap: anywhere;
}

.proof-notes p {
  margin: 8px 0 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.45;
}

.proof-modal footer {
  justify-content: flex-end;
}

.proof-modal footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 130px;
}

.proof-modal footer button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.proof-spin {
  animation: proofSpin .8s linear infinite;
}

@keyframes proofSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1120px) {
  .proof-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .proof-toolbar {
    grid-template-columns: 1fr;
  }

  .proof-filters {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .proof-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .proof-hero,
  .proof-toolbar,
  .proof-empty,
  .proof-metric {
    border-radius: 22px;
  }

  .proof-hero h1 {
    font-size: clamp(38px, 13vw, 54px);
  }

  .proof-metrics,
  .proof-grid {
    grid-template-columns: 1fr;
  }

  .proof-filters {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .proof-filters::-webkit-scrollbar {
    display: none;
  }

  .proof-filters button {
    flex: 0 0 auto;
  }

  .proof-thumb {
    height: 220px;
  }

  .proof-modal-backdrop {
    padding: 10px;
    align-items: stretch;
  }

  .proof-modal {
    max-height: calc(100dvh - 20px);
    border-radius: 24px;
  }

  .proof-modal-grid {
    grid-template-columns: 1fr;
  }

  .proof-modal-image {
    min-height: 260px;
  }

  .proof-modal footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .proof-modal footer button {
    min-width: 0;
  }
}
`;
