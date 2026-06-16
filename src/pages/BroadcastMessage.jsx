import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Send, Users, CheckCircle, XCircle, AlertTriangle, RefreshCw, MessageSquare, ChevronDown, ChevronUp, Search, X } from 'lucide-react';

const S = {
  page: { minHeight: "100vh", background: "#0a0a0a", padding: "1.25rem", paddingBottom: "6rem" },
  card: { background: "#141414", border: "1px solid rgba(167,139,250,0.18)", borderRadius: 12, padding: "1.25rem", marginBottom: 14 },
  label: { fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 },
  textarea: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, color: "#fff", fontSize: "0.85rem", padding: "12px 14px", width: "100%", outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 140, fontFamily: "inherit", lineHeight: 1.6 },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, color: "#fff", fontSize: "0.82rem", padding: "9px 12px", width: "100%", outline: "none", boxSizing: "border-box" },
};

export default function BroadcastMessage() {
  const [user, setUser] = useState(null);
  const [resellers, setResellers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // vazio = todos
  const [selectMode, setSelectMode] = useState('all'); // 'all' | 'custom'
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await remoteClient.auth.me();
      setUser(me);
      if (me.role !== 'admin') { setLoading(false); return; }
      const allUsers = await remoteClient.users.list();
      setResellers((allUsers||[]).filter(u => u.role === 'user'));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!user && !loading) return null;
  if (user && user.role !== 'admin') return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.3)" }}>Acesso negado.</p>
    </div>
  );

  const withPhone = resellers.filter(r => r.phone);
  const withoutPhone = resellers.filter(r => !r.phone);
  const filteredResellers = withPhone.filter(r =>
    !search || (r.full_name || r.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const effectiveTarget = selectMode === 'all'
    ? withPhone
    : withPhone.filter(r => selectedIds.includes(r.id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredResellers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResellers.map(r => r.id));
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    if (effectiveTarget.length === 0) return;

    const confirmMsg = `Enviar mensagem para ${effectiveTarget.length} revendedor(es)?`;
    if (!window.confirm(confirmMsg)) return;

    setSending(true);
    setResult(null);

    try {
      const payload = {
        message: message.trim(),
        reseller_ids: selectMode === 'custom' ? selectedIds : [],
      };
      const res = await remoteClient.whatsapp.broadcast(payload);
      setResult(res || {});
      setShowDetails(false);
    } catch (err) {
      setResult({ error: err.message || 'Erro ao enviar.', sent: 0, failed: 0, total: 0 });
    }

    setSending(false);
  };

  const charCount = message.length;
  const charWarning = charCount > 1500;

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare style={{ width: 18, height: 18, color: "#a78bfa" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
              Envio em Massa
            </h1>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Envie uma mensagem WhatsApp para todos os revendedores
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(167,139,250,0.2)", borderTopColor: "#a78bfa", animation: "spin 0.7s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Total de revendas", value: resellers.length, color: "#a78bfa" },
              { label: "Com WhatsApp", value: withPhone.length, color: "#34d399" },
              { label: "Sem WhatsApp", value: withoutPhone.length, color: "#f87171" },
              { label: "Alvo atual", value: effectiveTarget.length, color: "#22d3ee" },
            ].map(st => (
              <div key={st.label} style={{ background: "#141414", border: `1px solid ${st.color}22`, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 2px" }}>{st.label}</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: st.color, margin: 0 }}>{st.value}</p>
              </div>
            ))}
          </div>

          {/* Destinatários */}
          <div style={S.card}>
            <label style={S.label}>Destinatários</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { key: 'all', label: `Todos (${withPhone.length})` },
                { key: 'custom', label: 'Selecionar manualmente' },
              ].map(opt => (
                <button key={opt.key} onClick={() => { setSelectMode(opt.key); setSelectedIds([]); }}
                  style={{ padding: "7px 16px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                    background: selectMode === opt.key ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                    borderColor: selectMode === opt.key ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)",
                    color: selectMode === opt.key ? "#a78bfa" : "rgba(255,255,255,0.4)" }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {selectMode === 'custom' && (
              <div>
                {/* Search */}
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgba(255,255,255,0.25)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar revendedor..."
                    style={{ ...S.input, paddingLeft: 30 }} />
                  {search && (
                    <button onClick={() => setSearch('')} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", padding: 0, display: "flex" }}>
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  )}
                </div>

                {/* Toggle all */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
                    {selectedIds.length} selecionado(s)
                  </span>
                  <button onClick={toggleAll} style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    {selectedIds.length === filteredResellers.length ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                </div>

                {/* List */}
                <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {filteredResellers.length === 0 ? (
                    <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "1rem 0" }}>Nenhum revendedor com WhatsApp cadastrado.</p>
                  ) : filteredResellers.map(r => {
                    const sel = selectedIds.includes(r.id);
                    return (
                      <div key={r.id} onClick={() => toggleSelect(r.id)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, cursor: "pointer", transition: "all 0.12s",
                          background: sel ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${sel ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.06)"}` }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? "#a78bfa" : "rgba(255,255,255,0.2)"}`, background: sel ? "#a78bfa" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {sel && <span style={{ color: "#0a0a0a", fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.full_name || r.email}</p>
                          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>{r.phone}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {withoutPhone.length > 0 && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0 }} />
                <p style={{ fontSize: "0.72rem", color: "rgba(248,113,113,0.8)", margin: 0 }}>
                  {withoutPhone.length} revendedor(es) sem WhatsApp cadastrado não receberão a mensagem.
                </p>
              </div>
            )}
          </div>

          {/* Mensagem */}
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ ...S.label, marginBottom: 0 }}>Mensagem</label>
              <span style={{ fontSize: "0.68rem", fontWeight: 600, color: charWarning ? "#f87171" : "rgba(255,255,255,0.25)" }}>
                {charCount}/2000
              </span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={2000}
              placeholder={"Olá! Temos um comunicado importante para todos os revendedores...\n\nVocê pode usar *negrito*, _itálico_ e emojis 🎉"}
              style={S.textarea}
              onFocus={e => { e.target.style.borderColor = "rgba(167,139,250,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(167,139,250,0.08)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(167,139,250,0.25)"; e.target.style.boxShadow = "none"; }}
            />
            <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", margin: "6px 0 0" }}>
              Suporta formatação WhatsApp: *negrito*, _itálico_, ~tachado~
            </p>
          </div>

          {/* Preview */}
          {message.trim() && (
            <div style={S.card}>
              <label style={S.label}>Pré-visualização</label>
              <div style={{ background: "rgba(37,211,102,0.06)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 10, padding: "14px 16px", position: "relative" }}>
                <div style={{ position: "absolute", top: -1, left: 16, background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)", borderRadius: "0 0 6px 6px", padding: "1px 8px" }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#34d399" }}>WhatsApp</span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#e2e8f0", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6, paddingTop: 8 }}>{message}</p>
              </div>
            </div>
          )}

          {/* Resultado */}
          {result && (
            <div style={{ ...S.card, border: result.error ? "1px solid rgba(248,113,113,0.35)" : "1px solid rgba(52,211,153,0.35)" }}>
              {result.error ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <XCircle style={{ width: 20, height: 20, color: "#f87171", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f87171", margin: 0 }}>Erro no envio</p>
                    <p style={{ fontSize: "0.75rem", color: "rgba(248,113,113,0.7)", margin: "2px 0 0" }}>{result.error}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <CheckCircle style={{ width: 20, height: 20, color: "#34d399", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#34d399", margin: 0 }}>Envio concluído!</p>
                      <p style={{ fontSize: "0.72rem", color: "rgba(52,211,153,0.7)", margin: "2px 0 0" }}>
                        {result.sent} enviado(s) · {result.failed} falha(s) · {result.total} total
                      </p>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg,#34d399,#22d3ee)", borderRadius: 99, width: `${result.total > 0 ? (result.sent / result.total) * 100 : 0}%`, transition: "width 0.5s" }} />
                  </div>

                  {/* Detalhes */}
                  {result.details?.length > 0 && (
                    <>
                      <button onClick={() => setShowDetails(v => !v)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", fontWeight: 600, padding: 0, marginBottom: showDetails ? 10 : 0 }}>
                        {showDetails ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                        {showDetails ? "Ocultar detalhes" : "Ver detalhes por revendedor"}
                      </button>

                      {showDetails && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
                          {result.details.map((d, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: d.success ? "rgba(52,211,153,0.05)" : "rgba(248,113,113,0.06)", border: `1px solid ${d.success ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}` }}>
                              {d.success
                                ? <CheckCircle style={{ width: 13, height: 13, color: "#34d399", flexShrink: 0 }} />
                                : <XCircle style={{ width: 13, height: 13, color: "#f87171", flexShrink: 0 }} />}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</p>
                                <p style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>{d.phone}{d.error ? ` · ${d.error}` : ''}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Botão enviar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || effectiveTarget.length === 0}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 24px", borderRadius: 12, fontSize: "0.9rem", fontWeight: 800,
                background: sending || !message.trim() || effectiveTarget.length === 0
                  ? "rgba(255,255,255,0.05)"
                  : "linear-gradient(135deg,#a78bfa,#7c3aed)",
                border: sending || !message.trim() || effectiveTarget.length === 0
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(167,139,250,0.5)",
                color: sending || !message.trim() || effectiveTarget.length === 0
                  ? "rgba(255,255,255,0.25)"
                  : "#fff",
                cursor: sending || !message.trim() || effectiveTarget.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: sending || !message.trim() || effectiveTarget.length === 0 ? "none" : "0 0 24px rgba(167,139,250,0.35)",
              }}>
              {sending ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                  Enviando para {effectiveTarget.length} revendedor(es)...
                </>
              ) : (
                <>
                  <Send style={{ width: 16, height: 16 }} />
                  Enviar para {effectiveTarget.length} revendedor(es)
                </>
              )}
            </button>

            {result && !sending && (
              <button onClick={() => { setResult(null); setMessage(''); setSelectedIds([]); setSelectMode('all'); }}
                style={{ padding: "13px 16px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <RefreshCw style={{ width: 14, height: 14 }} /> Novo envio
              </button>
            )}
          </div>

          {effectiveTarget.length === 0 && selectMode === 'custom' && (
            <p style={{ fontSize: "0.75rem", color: "#f87171", margin: "8px 0 0", textAlign: "center" }}>
              Selecione pelo menos um revendedor para enviar.
            </p>
          )}
        </>
      )}
    </div>
  );
}