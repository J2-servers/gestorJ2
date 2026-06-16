import React, { useEffect, useState, useCallback } from 'react';
import {
  Wrench, Activity, AlertTriangle, Database, Zap, Bell, ShieldCheck, RefreshCw,
  Play, Stethoscope, Trash2, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight, ServerCog,
} from 'lucide-react';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';

const C = {
  bg: '#0a0a0a', card: '#141414', border: 'rgba(255,255,255,0.08)',
  accent: '#a78bfa', accentDeep: '#7c3aed', text: '#e5e7eb', dim: '#94a3b8',
  green: '#34d399', amber: '#fbbf24', red: '#f87171',
};

const DANGER = {
  low: { c: C.green, label: 'baixo' },
  medium: { c: C.amber, label: 'médio' },
  high: { c: C.red, label: 'ALTO' },
};

const CATEGORY_LABEL = {
  dados: 'Dados', seguranca: 'Segurança', notificacoes: 'Notificações',
  fila: 'Fila / WhatsApp', config: 'Configuração', banco: 'Banco de dados',
};

const TABS = [
  { id: 'overview', label: 'Saúde', icon: Activity },
  { id: 'scripts', label: 'Scripts de correção', icon: Wrench },
  { id: 'errors', label: 'Erros', icon: AlertTriangle },
  { id: 'queue', label: 'Fila WhatsApp', icon: Zap },
  { id: 'migrations', label: 'Banco / Migrations', icon: Database },
];

const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 };
const btn = (bg, disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9,
  border: 'none', background: bg, color: '#fff', fontWeight: 700, fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
});

function Toast({ toast }) {
  if (!toast) return null;
  const ok = toast.type === 'ok';
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 1000, maxWidth: 380,
      background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
      borderRadius: 12, padding: '12px 16px', color: ok ? '#86efac' : '#fca5a5',
      fontSize: 13, whiteSpace: 'pre-wrap', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    }}>{toast.text}</div>
  );
}

function ConfirmModal({ open, script, onCancel, onConfirm, busy }) {
  if (!open || !script) return null;
  const d = DANGER[script.danger];
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, maxWidth: 440, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: d.c }} />
          <h3 style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>Confirmar correção</h3>
        </div>
        <p style={{ color: C.text, fontSize: 13, margin: '0 0 6px' }}>{script.name}</p>
        <p style={{ color: C.dim, fontSize: 12, margin: '0 0 16px' }}>{script.description}</p>
        {script.danger === 'high' && (
          <p style={{ color: C.red, fontSize: 12, fontWeight: 700, margin: '0 0 16px' }}>
            ⚠️ Ação de risco ALTO. Confirme com cuidado.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btn('rgba(255,255,255,0.1)')}>Cancelar</button>
          <button onClick={onConfirm} disabled={busy} style={btn(C.accentDeep, busy)}>
            {busy ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
            {busy ? 'Aplicando...' : 'Corrigir agora'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HealthPill({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {ok ? <CheckCircle2 style={{ width: 16, height: 16, color: C.green }} />
          : <XCircle style={{ width: 16, height: 16, color: C.red }} />}
      <span style={{ color: C.text, fontSize: 13 }}>{label}</span>
    </div>
  );
}

export default function DevDiagnostics() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);

  const [overview, setOverview] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [diagnostics, setDiagnostics] = useState({}); // id -> result
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [expandedError, setExpandedError] = useState(null);
  const [queue, setQueue] = useState(null);
  const [migrations, setMigrations] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, script: null });

  const isAdmin = user?.role === 'admin' || user?.role === 'dev';

  const flash = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 6000);
  }, []);

  const loadOverview = useCallback(async () => {
    try { setOverview(await remoteClient.maintenance.overview()); }
    catch (e) { flash('err', e.message || 'Falha ao carregar visão geral'); }
  }, [flash]);

  const loadScripts = useCallback(async () => {
    try { setScripts(await remoteClient.maintenance.scripts()); } catch { /* ignore */ }
  }, []);

  const loadErrors = useCallback(async () => {
    try { setErrors(await remoteClient.maintenance.errors(100)); } catch { /* ignore */ }
  }, []);

  const loadQueue = useCallback(async () => {
    try { setQueue(await remoteClient.maintenance.whatsappQueue()); } catch { /* ignore */ }
  }, []);

  const loadMigrations = useCallback(async () => {
    try { setMigrations(await remoteClient.maintenance.migrations()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview();
    loadScripts();
  }, [isAdmin, loadOverview, loadScripts]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'errors') loadErrors();
    if (tab === 'queue') loadQueue();
    if (tab === 'migrations') loadMigrations();
  }, [tab, isAdmin, loadErrors, loadQueue, loadMigrations]);

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: 380 }}>
          <ShieldCheck style={{ width: 40, height: 40, color: C.red, margin: '0 auto 12px' }} />
          <h2 style={{ color: '#fff', margin: 0, fontSize: 16 }}>Acesso restrito</h2>
          <p style={{ color: C.dim, fontSize: 13 }}>Esta página é exclusiva do administrador.</p>
        </div>
      </div>
    );
  }

  const runDiagnose = async (id) => {
    setBusyId(`diag-${id}`);
    try {
      const res = await remoteClient.maintenance.diagnose(id);
      setDiagnostics((prev) => ({ ...prev, [id]: res }));
    } catch (e) {
      flash('err', e.message || 'Falha no diagnóstico');
    } finally {
      setBusyId(null);
    }
  };

  const confirmApply = async () => {
    const id = confirm.script.id;
    setBusyId(`apply-${id}`);
    try {
      if (id === '__migrate__') {
        const res = await remoteClient.maintenance.deployMigrations();
        flash(res.success ? 'ok' : 'err', res.output?.slice(0, 300) || 'Deploy executado.');
        setConfirm({ open: false, script: null });
        loadMigrations();
      } else {
        const res = await remoteClient.maintenance.apply(id);
        flash('ok', res.message || 'Correção aplicada.');
        setDiagnostics((prev) => ({ ...prev, [id]: undefined }));
        setConfirm({ open: false, script: null });
        loadOverview();
      }
    } catch (e) {
      flash('err', e.message || 'Falha ao aplicar');
    } finally {
      setBusyId(null);
    }
  };

  const grouped = scripts.reduce((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px 16px 80px' }}>
      <Toast toast={toast} />
      <ConfirmModal
        open={confirm.open}
        script={confirm.script}
        busy={busyId === `apply-${confirm.script?.id}`}
        onCancel={() => setConfirm({ open: false, script: null })}
        onConfirm={confirmApply}
      />

      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.accentDeep}, ${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ServerCog style={{ width: 22, height: 22, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 19, fontWeight: 800 }}>Centro de Manutenção</h1>
            <p style={{ margin: 0, color: C.dim, fontSize: 12 }}>Diagnóstico e auto-cura do sistema</p>
          </div>
        </div>
        <p style={{ color: C.dim, fontSize: 12, lineHeight: 1.5, margin: '0 0 18px' }}>
          Esta página corrige dados, estado operacional e configuração. Bugs de lógica no código aparecem em
          <b style={{ color: C.text }}> Erros</b> (com stack) para conserto e novo deploy — não são reescritos por aqui.
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
                border: `1px solid ${active ? 'rgba(167,139,250,0.4)' : C.border}`,
                background: active ? 'rgba(167,139,250,0.12)' : 'transparent',
                color: active ? C.accent : C.dim, fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
                <t.icon style={{ width: 14, height: 14 }} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* ───────── OVERVIEW ───────── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={loadOverview} style={btn('rgba(255,255,255,0.08)')}>
                <RefreshCw style={{ width: 14, height: 14 }} /> Atualizar
              </button>
            </div>
            {!overview ? <p style={{ color: C.dim }}>Carregando...</p> : (
              <>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px', color: '#fff', fontSize: 14 }}>Saúde dos serviços</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    <HealthPill ok={overview.health.database} label="Banco de dados" />
                    <HealthPill ok={overview.health.redis} label="Redis / Fila" />
                    <HealthPill ok={overview.health.vapidConfigured} label="Push (VAPID)" />
                    <HealthPill ok={overview.health.evolutionConfigured} label="WhatsApp (Evolution)" />
                  </div>
                  <p style={{ color: C.dim, fontSize: 11, marginTop: 12, marginBottom: 0 }}>
                    Uptime: {Math.floor(overview.uptime / 60)} min · {overview.timestamp?.slice(0, 19).replace('T', ' ')}
                  </p>
                </div>

                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 14px', color: '#fff', fontSize: 14 }}>Problemas detectados</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    {Object.entries({
                      'Pedidos presos': overview.issues.stuckRequests,
                      'Faturas vencidas': overview.issues.overdueInvoices,
                      'Revendedores órfãos': overview.issues.orphanResellers,
                      'Faturas inexistentes': overview.issues.danglingInvoices,
                      'Tokens expirados': overview.issues.expiredTokens,
                      'Inscrições antigas': overview.issues.stalePushSubscriptions,
                      'Erros não resolvidos': overview.issues.unresolvedErrors,
                    }).map(([k, v]) => (
                      <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: v > 0 ? C.amber : C.green }}>{v}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{k}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: C.dim, fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                    Vá em <b style={{ color: C.text }}>Scripts de correção</b> para resolver cada item.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────── SCRIPTS ───────── */}
        {tab === 'scripts' && (
          <div style={{ display: 'grid', gap: 18 }}>
            {Object.keys(grouped).length === 0 && <p style={{ color: C.dim }}>Carregando scripts...</p>}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h3 style={{ color: C.accent, fontSize: 13, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {CATEGORY_LABEL[cat] || cat}
                </h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {items.map((s) => {
                    const d = DANGER[s.danger];
                    const diag = diagnostics[s.id];
                    return (
                      <div key={s.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 240 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                              <span style={{ fontSize: 10, fontWeight: 800, color: d.c, border: `1px solid ${d.c}`, borderRadius: 6, padding: '1px 6px' }}>
                                risco {d.label}
                              </span>
                            </div>
                            <p style={{ color: C.dim, fontSize: 12, margin: '4px 0 0' }}>{s.description}</p>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <button onClick={() => runDiagnose(s.id)} disabled={busyId === `diag-${s.id}`} style={btn('rgba(167,139,250,0.15)', busyId === `diag-${s.id}`)}>
                              {busyId === `diag-${s.id}` ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> : <Stethoscope style={{ width: 14, height: 14 }} />}
                              Diagnosticar
                            </button>
                            <button onClick={() => setConfirm({ open: true, script: s })} disabled={!diag} style={btn(C.accentDeep, !diag)} title={!diag ? 'Diagnostique primeiro' : ''}>
                              <Play style={{ width: 14, height: 14 }} /> Corrigir
                            </button>
                          </div>
                        </div>
                        {diag && (
                          <div style={{ marginTop: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                            <div style={{ color: diag.affectedCount > 0 ? C.amber : C.green, fontSize: 12, fontWeight: 700 }}>
                              {diag.message}
                            </div>
                            {Array.isArray(diag.samples) && diag.samples.length > 0 && (
                              <pre style={{ margin: '8px 0 0', color: C.dim, fontSize: 11, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                                {JSON.stringify(diag.samples, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ───────── ERRORS ───────── */}
        {tab === 'errors' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.dim, fontSize: 12 }}>{errors.length} erro(s) registrado(s)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={loadErrors} style={btn('rgba(255,255,255,0.08)')}><RefreshCw style={{ width: 14, height: 14 }} /> Atualizar</button>
                <button onClick={async () => { await remoteClient.maintenance.clearErrors(); flash('ok', 'Log de erros limpo.'); loadErrors(); }} style={btn('rgba(248,113,113,0.15)')}>
                  <Trash2 style={{ width: 14, height: 14 }} /> Limpar tudo
                </button>
              </div>
            </div>
            {errors.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', color: C.green }}>
                <CheckCircle2 style={{ width: 32, height: 32, margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: 13 }}>Nenhum erro registrado. 🎉</p>
              </div>
            ) : errors.map((e) => (
              <div key={e.id} style={{ ...cardStyle, padding: 12, opacity: e.resolved ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}
                     onClick={() => setExpandedError(expandedError === e.id ? null : e.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {expandedError === e.id ? <ChevronDown style={{ width: 14, height: 14, color: C.dim }} /> : <ChevronRight style={{ width: 14, height: 14, color: C.dim }} />}
                    <span style={{ color: C.red, fontWeight: 800, fontSize: 12 }}>{e.statusCode}</span>
                    <span style={{ color: C.text, fontSize: 12, fontFamily: 'monospace' }}>{e.method} {e.path}</span>
                  </div>
                  <span style={{ color: C.dim, fontSize: 11, whiteSpace: 'nowrap' }}>{e.createdAt?.slice(0, 19).replace('T', ' ')}</span>
                </div>
                <p style={{ color: C.text, fontSize: 12, margin: '6px 0 0 22px' }}>{e.message}</p>
                {expandedError === e.id && (
                  <>
                    {e.stack && (
                      <pre style={{ margin: '8px 0 0 22px', color: C.dim, fontSize: 10.5, maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{e.stack}</pre>
                    )}
                    {!e.resolved && (
                      <button onClick={async () => { await remoteClient.maintenance.resolveError(e.id); loadErrors(); }} style={{ ...btn('rgba(34,197,94,0.15)'), marginTop: 8, marginLeft: 22 }}>
                        <CheckCircle2 style={{ width: 14, height: 14 }} /> Marcar resolvido
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ───────── QUEUE ───────── */}
        {tab === 'queue' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={loadQueue} style={btn('rgba(255,255,255,0.08)')}><RefreshCw style={{ width: 14, height: 14 }} /> Atualizar</button>
              <button onClick={async () => { const r = await remoteClient.maintenance.retryWhatsapp(); flash('ok', `${r.retried} job(s) reenfileirado(s).`); loadQueue(); }} style={btn(C.accentDeep)}>
                <RefreshCw style={{ width: 14, height: 14 }} /> Reprocessar falhas
              </button>
            </div>
            {!queue ? <p style={{ color: C.dim }}>Carregando...</p> : (
              <>
                <div style={cardStyle}>
                  <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 14 }}>Estado da fila</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                    {queue.counts && Object.entries(queue.counts).map(([k, v]) => (
                      <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: k === 'failed' && v > 0 ? C.red : C.text }}>{v}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {queue.failed?.length > 0 && (
                  <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 14 }}>Falhas recentes</h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {queue.failed.map((j) => (
                        <div key={j.id} style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 8, padding: '8px 10px' }}>
                          <div style={{ color: C.text, fontSize: 12 }}>{j.phone} · {j.attemptsMade} tentativa(s)</div>
                          <div style={{ color: C.red, fontSize: 11, fontFamily: 'monospace' }}>{j.failedReason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ───────── MIGRATIONS ───────── */}
        {tab === 'migrations' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={loadMigrations} style={btn('rgba(255,255,255,0.08)')}><RefreshCw style={{ width: 14, height: 14 }} /> Verificar</button>
              <button onClick={() => setConfirm({ open: true, script: { id: '__migrate__', name: 'Aplicar migrations pendentes', description: 'Executa prisma migrate deploy no banco.', danger: 'high' } })} style={btn(C.accentDeep)}>
                <Database style={{ width: 14, height: 14 }} /> Aplicar migrations
              </button>
            </div>
            <div style={cardStyle}>
              {!migrations ? <p style={{ color: C.dim, margin: 0 }}>Clique em "Verificar" para checar o estado das migrations.</p> : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {migrations.pending
                      ? <><AlertTriangle style={{ width: 16, height: 16, color: C.amber }} /><span style={{ color: C.amber, fontWeight: 700, fontSize: 13 }}>Há migrations pendentes</span></>
                      : <><CheckCircle2 style={{ width: 16, height: 16, color: C.green }} /><span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>Banco atualizado</span></>}
                  </div>
                  <pre style={{ margin: 0, color: C.dim, fontSize: 11, maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{migrations.output}</pre>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
