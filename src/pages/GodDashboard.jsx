import React, { useState, useEffect, useCallback } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  LayoutDashboard, Users as UsersIcon, Server, ShoppingCart, Activity, ScrollText,
  ShieldAlert, RefreshCw, Trash2, Ban, CheckCircle2, Wrench, Database, Bell,
} from 'lucide-react';

// ── estilos (módulo, para não remontar) ──
const S = {
  page:  { minHeight:'100vh', background:'#0a0a0a', color:'#fff', padding:'20px 18px 96px' },
  card:  { background:'#141414', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16 },
  h1:    { fontSize:22, fontWeight:800, background:'linear-gradient(135deg,#a78bfa,#22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', margin:0 },
  label: { fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em' },
  btn:   { padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', border:'none' },
};

const TABS = [
  { id:'overview', label:'Visão Geral', icon:LayoutDashboard },
  { id:'users',    label:'Usuários',    icon:UsersIcon },
  { id:'catalog',  label:'Catálogo',    icon:Server },
  { id:'ops',      label:'Operação',    icon:ShoppingCart },
  { id:'system',   label:'Sistema',     icon:Activity },
  { id:'audit',    label:'Auditoria',   icon:ScrollText },
];

const StatCard = ({ label, value, color = '#a78bfa', sub }) => (
  <div style={{ ...S.card, borderColor:`${color}33` }}>
    <p style={{ ...S.label, margin:0 }}>{label}</p>
    <p style={{ fontSize:26, fontWeight:800, color, margin:'4px 0 0' }}>{value}</p>
    {sub && <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:'2px 0 0' }}>{sub}</p>}
  </div>
);

const Pill = ({ children, color = '#a78bfa' }) => (
  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${color}1f`, color, border:`1px solid ${color}40` }}>{children}</span>
);

const Section = ({ title, icon:Icon, children, right }) => (
  <div style={{ ...S.card, marginBottom:14 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {Icon && <Icon style={{ width:15, height:15, color:'#a78bfa' }} />}
        <h3 style={{ fontSize:14, fontWeight:700, color:'#fff', margin:0 }}>{title}</h3>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const fmtBRL = (n) => `R$ ${Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const roleColor = { admin:'#fbbf24', dev:'#22d3ee', recovery:'#f87171', reseller:'#a78bfa', user:'#a78bfa' };
const statusColor = { active:'#34d399', blocked:'#f87171', pending:'#fbbf24' };

export default function GodDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('overview');
  const isGod = user?.role === 'admin' || user?.role === 'dev';

  if (!isGod) {
    return (
      <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ ...S.card, borderColor:'rgba(248,113,113,0.3)', textAlign:'center' }}>
          <ShieldAlert style={{ width:28, height:28, color:'#f87171', margin:'0 auto 8px', display:'block' }} />
          <p style={{ color:'#f87171', margin:0 }}>Acesso restrito ao administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={{ maxWidth:1500, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <ShieldAlert style={{ width:22, height:22, color:'#a78bfa' }} />
          <div>
            <h1 style={S.h1}>Painel do Sistema</h1>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:'2px 0 0' }}>Controle total — dados, usuários, operação e saúde</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...S.btn, display:'inline-flex', alignItems:'center', gap:6,
                background: tab===t.id ? '#a78bfa' : 'rgba(255,255,255,0.05)',
                color: tab===t.id ? '#0a0a0a' : 'rgba(255,255,255,0.6)' }}>
              <t.icon style={{ width:13, height:13 }} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab toast={toast} />}
        {tab === 'users'    && <UsersTab toast={toast} />}
        {tab === 'catalog'  && <CatalogTab />}
        {tab === 'ops'      && <OpsTab />}
        {tab === 'system'   && <SystemTab toast={toast} />}
        {tab === 'audit'    && <AuditTab />}
      </div>
    </div>
  );
}

// ───────────────── Visão Geral ─────────────────
function OverviewTab({ toast }) {
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, hl] = await Promise.all([
        remoteClient.maintenance.systemOverview(),
        remoteClient.maintenance.overview().catch(() => null),
      ]);
      setData(ov); setHealth(hl);
    } catch (e) { toast({ title:'Erro', description:'Não foi possível carregar a visão geral.', variant:'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;
  if (!data) return null;

  const req = data.requests?.byStatus || {};
  const wa = data.whatsapp || {};

  return (
    <div>
      <Section title="Usuários" icon={UsersIcon}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          <StatCard label="Total" value={data.users.total} />
          <StatCard label="Revendedores" value={(data.users.byRole.reseller || 0)} color="#22d3ee" />
          <StatCard label="Ativos" value={(data.users.byStatus.active || 0)} color="#34d399" />
          <StatCard label="Bloqueados" value={(data.users.byStatus.blocked || 0)} color="#f87171" />
        </div>
      </Section>

      <Section title="Catálogo" icon={Server}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          <StatCard label="Servidores" value={data.catalog.servers} />
          <StatCard label="Fornecedores" value={data.catalog.suppliers} color="#fbbf24" />
          <StatCard label="Vínculos reseller" value={data.catalog.resellerServers} color="#22d3ee" />
        </div>
      </Section>

      <Section title="Operação" icon={ShoppingCart}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          <StatCard label="Pendentes" value={req.pending || 0} color="#fbbf24" />
          <StatCard label="Em análise" value={req.analyzing || 0} color="#22d3ee" />
          <StatCard label="Aprovados" value={req.recharged || 0} color="#34d399" />
          <StatCard label="Rejeitados" value={req.rejected || 0} color="#f87171" />
          <StatCard label="Receita (aprovados)" value={fmtBRL(data.requests.revenueRecharged)} color="#34d399" />
        </div>
      </Section>

      <Section title="WhatsApp & Erros" icon={Bell}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          <StatCard label="WA enviados" value={wa.sent || 0} color="#34d399" />
          <StatCard label="WA na fila" value={wa.queued || 0} color="#fbbf24" />
          <StatCard label="WA falhas" value={wa.failed || 0} color="#f87171" />
          <StatCard label="Erros não resolvidos" value={data.errors.unresolved} color="#f87171" sub={`${data.errors.total} no total`} />
        </div>
      </Section>

      {health && (
        <Section title="Saúde da infraestrutura" icon={Database} right={<button onClick={load} style={{ ...S.btn, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', display:'inline-flex', alignItems:'center', gap:6 }}><RefreshCw style={{ width:12, height:12 }} /> Atualizar</button>}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <HealthDot ok={health.dbOk ?? health.database} label="Banco de dados" />
            <HealthDot ok={health.redisOk ?? health.redis} label="Redis / Fila" />
            <HealthDot ok={health.vapidConfigured} label="VAPID (push)" />
            <HealthDot ok={health.evolutionConfigured} label="Evolution (WhatsApp)" />
          </div>
        </Section>
      )}
    </div>
  );
}

const HealthDot = ({ ok, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(255,255,255,0.04)', borderRadius:8, border:'1px solid rgba(255,255,255,0.07)' }}>
    <span style={{ width:9, height:9, borderRadius:'50%', background: ok ? '#34d399' : '#f87171' }} />
    <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>{label}</span>
  </div>
);

// ───────────────── Usuários ─────────────────
function UsersTab({ toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await remoteClient.users.list() || []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id, fn, okMsg) => {
    setBusy(id);
    try { await fn(); toast({ title: okMsg }); await load(); }
    catch (e) { toast({ title:'Erro', description:e?.message, variant:'destructive' }); }
    finally { setBusy(null); }
  };

  const filtered = users.filter(u =>
    (u.full_name || u.name || '').toLowerCase().includes(q.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(q.toLowerCase()));

  if (loading) return <Loading />;

  return (
    <Section title={`Usuários (${users.length})`} icon={UsersIcon}
      right={<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar..."
        style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontSize:12, padding:'6px 10px', outline:'none' }} />}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(u => {
          const admin = u.role === 'admin' || u.role === 'recovery' || u.role === 'dev';
          const blocked = u.status === 'blocked';
          return (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:180 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#fff', margin:0 }}>{u.full_name || u.name || 'Sem nome'}</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0 }}>{u.email}</p>
              </div>
              <Pill color={roleColor[u.role] || '#a78bfa'}>{u.role}</Pill>
              <Pill color={statusColor[u.status] || '#737373'}>{u.status}</Pill>
              {u.payment_type && <Pill color="#22d3ee">{u.payment_type}</Pill>}
              {!admin && (
                <div style={{ display:'flex', gap:6 }}>
                  <button disabled={busy===u.id} onClick={() => act(u.id, () => remoteClient.users.update(u.id, { status: blocked ? 'active' : 'blocked' }), blocked ? 'Desbloqueado' : 'Bloqueado')}
                    style={{ ...S.btn, display:'inline-flex', alignItems:'center', gap:4, background: blocked ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: blocked ? '#34d399' : '#fbbf24', border:`1px solid ${blocked ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                    {blocked ? <><CheckCircle2 style={{ width:12, height:12 }} /> Desbloquear</> : <><Ban style={{ width:12, height:12 }} /> Bloquear</>}
                  </button>
                  <button disabled={busy===u.id} onClick={() => { if (confirm(`Excluir ${u.email}?`)) act(u.id, () => remoteClient.users.remove(u.id), 'Removido'); }}
                    style={{ ...S.btn, display:'inline-flex', alignItems:'center', gap:4, background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.3)' }}>
                    <Trash2 style={{ width:12, height:12 }} />
                  </button>
                </div>
              )}
              {admin && <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>conta protegida</span>}
            </div>
          );
        })}
        {filtered.length === 0 && <Empty msg="Nenhum usuário." />}
      </div>
    </Section>
  );
}

// ───────────────── Catálogo ─────────────────
function CatalogTab() {
  const [d, setD] = useState({ servers:[], suppliers:[], links:[] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const [servers, suppliers, links] = await Promise.all([
          remoteClient.servers.list().catch(()=>[]),
          remoteClient.suppliers.list().catch(()=>[]),
          remoteClient.resellerServers.list().catch(()=>[]),
        ]);
        setD({ servers, suppliers, links });
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <Loading />;
  return (
    <div>
      <Section title={`Servidores (${d.servers.length})`} icon={Server}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {d.servers.map(s => (
            <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8, fontSize:12 }}>
              <span style={{ color:'#fff', fontWeight:600 }}>{s.name}</span>
              <span style={{ color:'rgba(255,255,255,0.4)' }}>custo {fmtBRL(s.cost_per_credit)} • {d.suppliers.filter(x=>x.server_id===s.id).length} fornecedor(es) • {d.links.filter(x=>x.server_id===s.id).length} reseller(s)</span>
            </div>
          ))}
          {d.servers.length === 0 && <Empty msg="Nenhum servidor." />}
        </div>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'10px 0 0' }}>Gestão completa em <a href="/AdminServers" style={{ color:'#a78bfa' }}>Servidores</a>.</p>
      </Section>
    </div>
  );
}

// ───────────────── Operação ─────────────────
function OpsTab() {
  const [d, setD] = useState({ reqs:[], invoices:[] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const [r, inv] = await Promise.all([
          remoteClient.creditRequests.list(null, 500).then(x => x?.data || []).catch(()=>[]),
          remoteClient.invoices.list().catch(()=>[]),
        ]);
        setD({ reqs:r, invoices:inv });
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <Loading />;
  const by = (s) => d.reqs.filter(r => r.status === s).length;
  return (
    <div>
      <Section title="Pedidos (resumo)" icon={ShoppingCart}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
          <StatCard label="Pendentes" value={by('pending')} color="#fbbf24" />
          <StatCard label="Em análise" value={by('analyzing')} color="#22d3ee" />
          <StatCard label="Aprovados" value={by('recharged')} color="#34d399" />
          <StatCard label="Rejeitados" value={by('rejected')} color="#f87171" />
        </div>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'10px 0 0' }}>Gestão em <a href="/CreditRequests" style={{ color:'#a78bfa' }}>Pedidos</a>.</p>
      </Section>
      <Section title={`Faturas (${d.invoices.length})`} icon={ScrollText}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
          <StatCard label="Pendentes" value={d.invoices.filter(i=>i.status==='pending').length} color="#fbbf24" />
          <StatCard label="Pagas" value={d.invoices.filter(i=>i.status==='paid').length} color="#34d399" />
          <StatCard label="Vencidas" value={d.invoices.filter(i=>i.status==='overdue').length} color="#f87171" />
        </div>
        <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:'10px 0 0' }}>Gestão em <a href="/InvoiceManagement" style={{ color:'#a78bfa' }}>Financeiro</a>.</p>
      </Section>
    </div>
  );
}

// ───────────────── Sistema ─────────────────
function SystemTab({ toast }) {
  const [errors, setErrors] = useState([]);
  const [queue, setQueue] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [migrations, setMigrations] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, q, s, m, st] = await Promise.all([
        remoteClient.maintenance.errors(50).catch(()=>[]),
        remoteClient.maintenance.whatsappQueue().catch(()=>null),
        remoteClient.maintenance.scripts().catch(()=>[]),
        remoteClient.maintenance.migrations().catch(()=>null),
        remoteClient.settings.get().catch(()=>null),
      ]);
      setErrors(e || []); setQueue(q); setScripts(s || []); setMigrations(m); setSettings(st);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleWhatsapp = async () => {
    const next = !(settings?.whatsapp_enabled ?? true);
    setBusy('wa-toggle');
    try {
      const updated = await remoteClient.settings.update({ whatsappEnabled: next });
      setSettings(updated);
      toast({ title: next ? 'Envios de WhatsApp ATIVADOS' : 'Envios de WhatsApp DESLIGADOS' });
    } catch (e) { toast({ title:'Erro', description:e?.message, variant:'destructive' }); }
    finally { setBusy(null); }
  };

  const run = async (key, fn, msg) => {
    setBusy(key);
    try { const r = await fn(); toast({ title: msg, description: typeof r==='object' ? JSON.stringify(r).slice(0,120) : String(r) }); await load(); }
    catch (e) { toast({ title:'Erro', description:e?.message, variant:'destructive' }); }
    finally { setBusy(null); }
  };

  if (loading) return <Loading />;

  const waOn = settings?.whatsapp_enabled ?? true;

  return (
    <div>
      <Section title="Envios de WhatsApp" icon={Bell}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', margin:0 }}>
            {waOn ? '✅ Ativado — pedidos disparam mensagens no WhatsApp dos revendedores.' : '⛔ Desligado — nenhuma mensagem de WhatsApp é enviada (pedidos e chat seguem normais).'}
          </p>
          <button onClick={toggleWhatsapp} disabled={busy==='wa-toggle'}
            style={{ ...S.btn, background: waOn ? 'rgba(248,113,113,0.12)' : 'rgba(52,211,153,0.12)', color: waOn ? '#f87171' : '#34d399', border:`1px solid ${waOn ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}` }}>
            {waOn ? 'Desligar envios' : 'Ativar envios'}
          </button>
        </div>
      </Section>

      <Section title="Fila WhatsApp" icon={Bell} right={
        <button disabled={busy==='retry'} onClick={() => run('retry', () => remoteClient.maintenance.retryWhatsapp(), 'Reprocessado')}
          style={{ ...S.btn, background:'rgba(34,211,238,0.12)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.3)' }}>Reprocessar falhas</button>}>
        {queue ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:8 }}>
            {Object.entries(queue).filter(([,v]) => typeof v === 'number').map(([k,v]) => <StatCard key={k} label={k} value={v} />)}
          </div>
        ) : <Empty msg="Fila indisponível (Redis?)." />}
      </Section>

      <Section title="Migrations" icon={Database} right={
        <button disabled={busy==='mig'} onClick={() => run('mig', () => remoteClient.maintenance.deployMigrations(), 'Migrations aplicadas')}
          style={{ ...S.btn, background:'rgba(167,139,250,0.12)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.3)' }}>Aplicar pendentes</button>}>
        <p style={{ fontSize:12, color: migrations?.pending ? '#fbbf24' : '#34d399', margin:0 }}>
          {migrations?.pending ? '⚠ Há migrations pendentes' : '✓ Banco em dia'}
        </p>
      </Section>

      <Section title="Scripts de manutenção" icon={Wrench}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {scripts.map(sc => (
            <div key={sc.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#fff', margin:0 }}>{sc.name} <Pill color={sc.danger==='high'?'#f87171':sc.danger==='medium'?'#fbbf24':'#34d399'}>{sc.danger}</Pill></p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0 }}>{sc.description}</p>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button disabled={busy===sc.id} onClick={() => run(sc.id, () => remoteClient.maintenance.diagnose(sc.id), `Diagnóstico: ${sc.name}`)}
                  style={{ ...S.btn, background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)' }}>Diagnosticar</button>
                <button disabled={busy===sc.id} onClick={() => { if (confirm(`Aplicar "${sc.name}"?`)) run(sc.id, () => remoteClient.maintenance.apply(sc.id), `Aplicado: ${sc.name}`); }}
                  style={{ ...S.btn, background:'rgba(167,139,250,0.15)', color:'#a78bfa' }}>Corrigir</button>
              </div>
            </div>
          ))}
          {scripts.length === 0 && <Empty msg="Nenhum script." />}
        </div>
      </Section>

      <Section title={`Erros recentes (${errors.length})`} icon={ShieldAlert} right={
        errors.length > 0 && <button disabled={busy==='clr'} onClick={() => run('clr', () => remoteClient.maintenance.clearErrors(), 'Erros limpos')}
          style={{ ...S.btn, background:'rgba(248,113,113,0.1)', color:'#f87171', border:'1px solid rgba(248,113,113,0.3)' }}>Limpar</button>}>
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:300, overflowY:'auto' }}>
          {errors.map(er => (
            <div key={er.id} style={{ padding:'8px 12px', background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.15)', borderRadius:8 }}>
              <p style={{ fontSize:11, color:'#f87171', margin:0, fontFamily:'monospace' }}>{er.statusCode || ''} {er.method || ''} {er.path || ''}</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.7)', margin:'2px 0 0' }}>{er.message}</p>
            </div>
          ))}
          {errors.length === 0 && <Empty msg="Nenhum erro registrado. 🎉" />}
        </div>
      </Section>
    </div>
  );
}

// ───────────────── Auditoria ─────────────────
function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const raw = await remoteClient.audit.list();
        setLogs((Array.isArray(raw) ? raw : []).map(l => ({
          ...l,
          userName: l.userName ?? l.user_name,
          createdAt: l.createdAt ?? l.created_date,
        })));
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <Loading />;
  return (
    <Section title={`Auditoria (${logs.length})`} icon={ScrollText}>
      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:520, overflowY:'auto' }}>
        {logs.map((l,i) => (
          <div key={l.id || i} style={{ display:'flex', gap:12, padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap', flexShrink:0 }}>{l.createdAt ? new Date(l.createdAt).toLocaleString('pt-BR') : ''}</span>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#fff', margin:0 }}>{l.action}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', margin:0 }}>{l.userName} {l.details ? `• ${l.details}` : ''}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && <Empty msg="Sem registros de auditoria." />}
      </div>
    </Section>
  );
}

// ── util ──
const Loading = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:'3rem 0' }}>
    <div style={{ width:30, height:30, borderRadius:'50%', border:'2px solid rgba(167,139,250,0.2)', borderTopColor:'#a78bfa', animation:'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
const Empty = ({ msg }) => <p style={{ fontSize:12, color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'1rem 0', margin:0 }}>{msg}</p>;
