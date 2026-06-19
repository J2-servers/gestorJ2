import React, { useMemo, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import {
  Upload, FileSpreadsheet, Layers, Wand2, CheckCircle2, AlertTriangle,
  Loader2, ArrowRight, DollarSign, Users, RefreshCw, ShieldAlert,
} from "lucide-react";

const A = "#ff4b12";
const fmtR = (v) => `R$ ${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ImportData() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "dev";

  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [costs, setCosts] = useState({});
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [statusMode, setStatusMode] = useState("recharged"); // 'recharged' | 'keep'

  const runPreview = async (text, map, cst) => {
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await remoteClient.imports.previewOrders(text, map, cst);
      setPreview(data);
      // inicializa o de->para com identidade (raw->raw) na primeira leitura
      if (!map || Object.keys(map).length === 0) {
        const initial = {};
        (data.rawServers || []).forEach((r) => { initial[r.raw] = r.raw; });
        setMapping(initial);
      }
    } catch (e) {
      setError(e?.message || "Falha ao analisar o CSV.");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    setCosts({});
    await runPreview(text, {}, {});
  };

  const autoGroupByBrand = () => {
    const next = {};
    (preview?.rawServers || []).forEach((r) => {
      const brand = r.raw.split(/[\s/]+/)[0];
      next[r.raw] = brand ? brand.toUpperCase() : r.raw;
    });
    setMapping(next);
    runPreview(csv, next, costs);
  };

  // Grupos canonicos com custo/margem ao vivo (custo edita sem ir ao servidor).
  const groups = useMemo(() => {
    if (!preview?.canonicalGroups) return [];
    return preview.canonicalGroups.map((g) => {
      const cost = costs[g.canonical] ?? 0;
      const margin = g.totalValue - g.totalCredits * cost;
      return { ...g, cost, margin, marginPct: g.totalValue > 0 ? (margin / g.totalValue) * 100 : 0 };
    });
  }, [preview, costs]);

  const totalMargin = useMemo(() => groups.reduce((s, g) => s + g.margin, 0), [groups]);

  const commit = async () => {
    if (!window.confirm("Importar estas movimentações para o sistema? Os servidores serão criados/unificados e os pedidos preservados. Reimportar o mesmo CSV não duplica.")) return;
    setCommitting(true); setError("");
    try {
      const res = await remoteClient.imports.commitOrders(csv, mapping, costs, statusMode);
      setResult(res);
    } catch (e) {
      setError(e?.message || "Falha ao importar.");
    } finally {
      setCommitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="imp-page">
        <div className="imp-denied"><ShieldAlert size={28} /><p>Acesso restrito a administradores.</p></div>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="imp-page">
      <header className="imp-head">
        <div className="imp-head-icon"><FileSpreadsheet size={20} /></div>
        <div>
          <h1>Importar Pedidos (CSV)</h1>
          <p>Limpe, unifique servidores e cadastre o custo — tudo de uma vez, com prévia antes de gravar.</p>
        </div>
      </header>

      {/* Upload */}
      <section className="imp-card imp-upload">
        <label className="imp-drop">
          <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          <Upload size={22} />
          <strong>{fileName || "Escolher arquivo CSV"}</strong>
          <span>Formato: ID, Data, Servidor, Login, Créditos, Valor, Status</span>
        </label>
        {loading && <div className="imp-inline"><Loader2 className="imp-spin" size={16} /> Analisando…</div>}
        {error && <div className="imp-error"><AlertTriangle size={15} /> {error}</div>}
      </section>

      {preview && (
        <>
          {/* Resumo */}
          <section className="imp-stats">
            <Stat icon={Layers} label="Servidores" value={groups.length} />
            <Stat icon={FileSpreadsheet} label="Movimentações" value={preview.totalRows} />
            <Stat icon={DollarSign} label="Receita total" value={fmtR(preview.totals?.totalValue)} accent />
            <Stat icon={DollarSign} label="Margem (com custos)" value={fmtR(totalMargin)} accent={totalMargin >= 0} danger={totalMargin < 0} />
            <Stat icon={Users} label="Revendedor casado" value={`${preview.reseller?.matched ?? 0}/${preview.totalRows}`} />
          </section>

          {preview.reseller?.unmatched > 0 && (
            <div className="imp-note">
              <AlertTriangle size={15} />
              <span>
                {preview.reseller.unmatched} pedido(s) sem revendedor casado pelo login → irão para <strong>“Histórico (Importado)”</strong>.
                {preview.reseller.sampleUnmatched?.length > 0 && <> Ex.: {preview.reseller.sampleUnmatched.slice(0, 8).join(", ")}.</>}
              </span>
            </div>
          )}

          {/* Unificação */}
          <section className="imp-card">
            <div className="imp-card-head">
              <h2><Wand2 size={16} /> Unificação de servidores</h2>
              <div className="imp-actions">
                <button className="imp-ghost" onClick={autoGroupByBrand} type="button"><Wand2 size={14} /> Agrupar pela 1ª palavra</button>
                <button className="imp-ghost" onClick={() => runPreview(csv, mapping, costs)} type="button"><RefreshCw size={14} /> Atualizar prévia</button>
              </div>
            </div>
            <p className="imp-hint">Digite o mesmo “Servidor final” em duas linhas para uni-las (ex.: BLADE ultrakill + BLADE jujunew → BLADE). Depois clique em “Atualizar prévia”.</p>
            <div className="imp-table-wrap">
              <table className="imp-table">
                <thead><tr><th>Nome no CSV</th><th></th><th>Servidor final</th><th className="r">Pedidos</th><th className="r">Receita</th></tr></thead>
                <tbody>
                  {(preview.rawServers || []).map((r) => (
                    <tr key={r.raw}>
                      <td className="mono">{r.raw}</td>
                      <td className="arrow"><ArrowRight size={14} /></td>
                      <td>
                        <input className="imp-input" value={mapping[r.raw] ?? r.raw}
                          onChange={(e) => setMapping((m) => ({ ...m, [r.raw]: e.target.value }))} />
                      </td>
                      <td className="r">{r.orders}</td>
                      <td className="r">{fmtR(r.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Custos + margem por servidor canônico */}
          <section className="imp-card">
            <div className="imp-card-head"><h2><DollarSign size={16} /> Custo e margem por servidor</h2></div>
            <div className="imp-table-wrap">
              <table className="imp-table">
                <thead><tr><th>Servidor</th><th className="r">Créditos</th><th className="r">Venda/créd.</th><th className="r">Custo/créd.</th><th className="r">Receita</th><th className="r">Margem</th></tr></thead>
                <tbody>
                  {groups.map((g) => (
                    <tr key={g.canonical}>
                      <td>
                        <strong>{g.canonical}</strong>
                        {g.variants.length > 1 && <span className="imp-variants">{g.variants.join(" + ")}</span>}
                      </td>
                      <td className="r">{g.totalCredits.toLocaleString("pt-BR")}</td>
                      <td className="r">{fmtR(g.valuePerCredit)}</td>
                      <td className="r">
                        <input className="imp-input num" type="number" min="0" step="0.01" placeholder="0,00"
                          value={costs[g.canonical] ?? ""} onChange={(e) => setCosts((c) => ({ ...c, [g.canonical]: parseFloat(e.target.value) || 0 }))} />
                      </td>
                      <td className="r">{fmtR(g.totalValue)}</td>
                      <td className={`r bold ${g.margin >= 0 ? "ok" : "bad"}`}>{fmtR(g.margin)}<small>{g.marginPct.toFixed(0)}%</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Status + Commit */}
          <section className="imp-card">
            <div className="imp-card-head"><h2><CheckCircle2 size={16} /> Status das movimentações importadas</h2></div>
            <div className="imp-statusmode">
              <label className={statusMode === "recharged" ? "on" : ""}>
                <input type="radio" name="statusmode" checked={statusMode === "recharged"} onChange={() => setStatusMode("recharged")} />
                <div>
                  <strong>Marcar como recarregadas (efetivadas)</strong>
                  <span>Contam como receita e lucro no Analytics. Recomendado para movimentações já concluídas.</span>
                </div>
              </label>
              <label className={statusMode === "keep" ? "on" : ""}>
                <input type="radio" name="statusmode" checked={statusMode === "keep"} onChange={() => setStatusMode("keep")} />
                <div>
                  <strong>Manter status do CSV</strong>
                  <span>Preserva pending/recharged/etc. Pendentes entram na fila e não contam como lucro.</span>
                </div>
              </label>
            </div>
          </section>

          <section className="imp-commit">
            {result ? (
              <div className="imp-result"><CheckCircle2 size={18} /> {result.message}</div>
            ) : (
              <button className="imp-primary" onClick={commit} disabled={committing} type="button">
                {committing ? <Loader2 className="imp-spin" size={16} /> : <Upload size={16} />}
                {committing ? "Importando…" : `Importar ${preview.totalRows} movimentações`}
              </button>
            )}
          </section>
        </>
      )}

      <style>{styles}</style>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent, danger }) {
  return (
    <div className="imp-stat">
      <div className="imp-stat-icon"><Icon size={15} /></div>
      <div>
        <small>{label}</small>
        <strong className={danger ? "bad" : accent ? "ok" : ""}>{value}</strong>
      </div>
    </div>
  );
}

const styles = `
.imp-page{ min-height:100vh; background:linear-gradient(160deg,#0b0d0d,#070808 60%,#030404); color:#fff; padding:18px 16px 120px; max-width:1200px; margin:0 auto; display:flex; flex-direction:column; gap:14px; }
.imp-denied{ min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#f87171; }
.imp-head{ display:flex; align-items:center; gap:13px; }
.imp-head-icon{ width:46px; height:46px; border-radius:14px; display:grid; place-items:center; color:#fff; background:linear-gradient(135deg,${A},#9d1b08); box-shadow:0 10px 24px rgba(255,75,18,.32); flex-shrink:0; }
.imp-head h1{ margin:0; font-size:clamp(20px,4vw,26px); font-weight:900; letter-spacing:-.02em; }
.imp-head p{ margin:2px 0 0; font-size:12.5px; color:rgba(255,255,255,.5); }
.imp-card{ background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.08); border-radius:18px; padding:16px; backdrop-filter:blur(16px); }
.imp-card-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px; }
.imp-card-head h2{ margin:0; font-size:14px; font-weight:800; display:flex; align-items:center; gap:8px; color:#fff; }
.imp-card-head h2 svg{ color:${A}; }
.imp-actions{ display:flex; gap:8px; flex-wrap:wrap; }
.imp-hint{ margin:0 0 12px; font-size:11.5px; color:rgba(255,255,255,.42); }
.imp-upload{ display:flex; flex-direction:column; gap:10px; }
.imp-drop{ display:flex; flex-direction:column; align-items:center; gap:6px; padding:26px; border:1.5px dashed rgba(255,75,18,.4); border-radius:16px; cursor:pointer; text-align:center; transition:border-color .2s,background .2s; }
.imp-drop:hover{ border-color:${A}; background:rgba(255,75,18,.05); }
.imp-drop svg{ color:${A}; }
.imp-drop strong{ font-size:14px; }
.imp-drop span{ font-size:11px; color:rgba(255,255,255,.4); }
.imp-inline{ display:flex; align-items:center; gap:8px; font-size:12.5px; color:rgba(255,255,255,.6); }
.imp-error{ display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:12px; background:rgba(248,113,113,.12); border:1px solid rgba(248,113,113,.3); color:#fca5a5; font-size:12.5px; }
.imp-note{ display:flex; align-items:flex-start; gap:9px; padding:11px 14px; border-radius:14px; background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.28); color:#fcd34d; font-size:12px; line-height:1.5; }
.imp-note svg{ flex-shrink:0; margin-top:1px; }
.imp-note strong{ color:#fff; }
.imp-stats{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
.imp-stat{ display:flex; align-items:center; gap:10px; padding:13px 14px; background:rgba(255,255,255,.035); border:1px solid rgba(255,255,255,.08); border-radius:14px; }
.imp-stat-icon{ width:32px; height:32px; border-radius:9px; display:grid; place-items:center; color:${A}; background:rgba(255,75,18,.12); flex-shrink:0; }
.imp-stat small{ display:block; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.42); font-weight:700; }
.imp-stat strong{ font-size:16px; font-weight:900; }
.imp-stat strong.ok{ color:#34d399; } .imp-stat strong.bad{ color:#f87171; }
.imp-table-wrap{ overflow-x:auto; }
.imp-table{ width:100%; border-collapse:collapse; font-size:12.5px; }
.imp-table th{ text-align:left; padding:8px 10px; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:rgba(255,255,255,.35); border-bottom:1px solid rgba(255,255,255,.08); white-space:nowrap; }
.imp-table td{ padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.05); vertical-align:middle; }
.imp-table .r{ text-align:right; }
.imp-table .arrow{ color:rgba(255,255,255,.3); width:24px; }
.imp-table .mono{ font-family:ui-monospace,monospace; color:rgba(255,255,255,.7); }
.imp-table .bold{ font-weight:800; }
.imp-table .ok{ color:#34d399; } .imp-table .bad{ color:#f87171; }
.imp-table .bold small{ display:block; font-size:9px; font-weight:600; color:rgba(255,255,255,.35); }
.imp-variants{ display:block; font-size:10px; color:rgba(255,255,255,.4); margin-top:2px; }
.imp-input{ width:100%; min-width:120px; background:rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.12); border-radius:9px; padding:7px 10px; color:#fff; font-size:12.5px; outline:none; }
.imp-input:focus{ border-color:${A}; }
.imp-input.num{ width:92px; text-align:right; }
.imp-ghost{ display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:10px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.75); font-size:11.5px; font-weight:700; cursor:pointer; }
.imp-ghost:hover{ background:rgba(255,255,255,.1); }
.imp-statusmode{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.imp-statusmode label{ display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.03); cursor:pointer; transition:border-color .15s,background .15s; }
.imp-statusmode label.on{ border-color:${A}; background:rgba(255,75,18,.08); }
.imp-statusmode input{ margin-top:3px; accent-color:${A}; flex-shrink:0; }
.imp-statusmode strong{ display:block; font-size:12.5px; }
.imp-statusmode span{ display:block; font-size:11px; color:rgba(255,255,255,.45); margin-top:2px; line-height:1.4; }
.imp-commit{ display:flex; justify-content:flex-end; }
.imp-primary{ display:inline-flex; align-items:center; gap:8px; padding:13px 26px; border-radius:14px; border:0; color:#fff; background:linear-gradient(135deg,${A},#9d1b08); box-shadow:0 10px 26px rgba(255,75,18,.34); font-size:13.5px; font-weight:900; cursor:pointer; }
.imp-primary:disabled{ opacity:.6; cursor:not-allowed; }
.imp-result{ display:flex; align-items:center; gap:9px; padding:13px 16px; border-radius:14px; background:rgba(52,211,153,.12); border:1px solid rgba(52,211,153,.3); color:#6ee7b7; font-size:13px; font-weight:700; width:100%; }
.imp-spin{ animation:impSpin .8s linear infinite; }
@keyframes impSpin{ to{ transform:rotate(360deg); } }
@media (max-width:560px){ .imp-input{ min-width:90px; } .imp-input.num{ width:74px; } }
`;
