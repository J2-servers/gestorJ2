import React, { useState, useEffect } from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Building, Image, Key, MessageSquare, Bell, Settings as SettingsIcon } from 'lucide-react';
import CompanyForm from '../components/settings/CompanyForm';
import IdentityForm from '../components/settings/IdentityForm';
import PixForm from '../components/settings/PixForm';
import IntegrationsForm from '../components/settings/IntegrationsForm';
import NotificationTest from '../components/settings/NotificationTest';

const S = { minHeight:"100vh", background:"#0a0a0a", color:"#fff" };
const CARD = { background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20 };

const tabs = [
  { value:"company",      label:"Empresa",  icon:Building },
  { value:"identity",     label:"Visual",   icon:Image },
  { value:"pix",          label:"PIX",      icon:Key },
  { value:"integrations", label:"WhatsApp", icon:MessageSquare },
  { value:"notifications",label:"Testes",   icon:Bell },
];

export default function SettingsPage() {
  const [settings, setSettings]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("integrations");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await remoteClient.auth.me();
      setCurrentUser(me);
      if (me.role !== 'admin') { setLoading(false); return; }
      setSettings(await remoteClient.settings.get());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ ...S, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"2px solid rgba(167,139,250,0.2)", borderTopColor:"#a78bfa", animation:"spin 0.7s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (currentUser?.role !== 'admin') return (
    <div style={{ ...S, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ ...CARD, borderColor:"rgba(248,113,113,0.3)" }}><p style={{ color:"#f87171" }}>Acesso não autorizado.</p></div>
    </div>
  );

  return (
    <div style={S}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} .sf{animation:fadeUp 0.4s ease both}`}</style>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"12px 12px 96px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* Header */}
        <div className="sf" style={{ ...CARD, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, padding:"16px 20px", transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 24px 64px rgba(0,0,0,0.85), 0 0 60px rgba(167,139,250,0.15)"; e.currentTarget.style.borderColor="rgba(167,139,250,0.55)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <SettingsIcon style={{ width:16, height:16, color:"#a78bfa" }} />
            </div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, background:"linear-gradient(135deg,#a78bfa,#22d3ee)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>Configurações</h1>
              <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:0 }}>Configurações globais da plataforma</p>
            </div>
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="sf" style={CARD}>
          <div style={{ display:"flex", gap:4, padding:"6px 8px", background:"rgba(255,255,255,0.04)", borderRadius:12, marginBottom:16, flexWrap:"wrap", overflowX:"auto" }}>
            {tabs.map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value)} style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", transition:"all 0.15s",
                background: activeTab === t.value ? "#a78bfa" : "transparent",
                color: activeTab === t.value ? "#0a0a0a" : "rgba(255,255,255,0.45)" }}>
                <t.icon style={{ width:13, height:13 }} /> {t.label}
              </button>
            ))}
          </div>

          {activeTab === "company"       && <CompanyForm settings={settings} onUpdate={setSettings} />}
          {activeTab === "identity"      && <IdentityForm settings={settings} onUpdate={setSettings} />}
          {activeTab === "pix"           && <PixForm settings={settings} onUpdate={setSettings} />}
          {activeTab === "integrations"  && <IntegrationsForm settings={settings} onUpdate={setSettings} />}
          {activeTab === "notifications" && <NotificationTest settings={settings} />}
        </div>
      </div>
    </div>
  );
}
