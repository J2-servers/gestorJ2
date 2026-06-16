import React, { useState, useMemo } from 'react';
import { ExternalLink, Search, Star, Grid, List as ListIcon, Tv } from 'lucide-react';

const players = [
  { name: "ABE Player",     url: "https://abeplayertv.com/login",                                                          logo: null,                          category: "Premium" },
  { name: "ALL Player",     url: "https://alltvplayer.com/login",                                                          logo: null,                          category: "Premium" },
  { name: "Assist Plus +",  url: "https://smartcpp.com/#/upload-playlist",                                                 logo: "/playlists/assist_plus.png",  category: "Standard" },
  { name: "Bay IPTV",       url: "https://cms.bayip.tv/user/manage/playlist",                                             logo: null,                          category: "Standard" },
  { name: "Bob Player",     url: "https://bobplayer.com/device/login",                                                    logo: null,                          category: "Popular",  featured: true },
  { name: "Bob Premium",    url: "https://bobtvpremium.com/device/login",                                                 logo: null,                          category: "Premium",  featured: true },
  { name: "Bob Pro",        url: "https://bobprotv.com/mylist",                                                           logo: null,                          category: "Premium" },
  { name: "IBO Player",     url: "https://iboplayer.com/device/login",                                                    logo: null,                          category: "Popular",  featured: true },
  { name: "IBO Player Pro", url: "https://iboproapp.com/manage-playlists/login/?callback_url=%2Fmanage-playlists%2Flist", logo: null,                          category: "Premium",  featured: true },
  { name: "SSIPTV",         url: "https://ss-iptv.com/en/users/playlist",                                                 logo: null,                          category: "Popular",  featured: true },
];

const CATEGORIES = ["Todos", "Popular", "Premium", "Standard"];

const CAT_STYLE = {
  Popular:  { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)" },
  Premium:  { color: "#22d3ee", bg: "rgba(34,211,238,0.10)",  border: "rgba(34,211,238,0.25)" },
  Standard: { color: "#60a5fa", bg: "rgba(96,165,250,0.10)",  border: "rgba(96,165,250,0.25)" },
};

export default function Playlists() {
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('Todos');
  const [viewMode, setViewMode]       = useState('grid');

  const filtered = useMemo(() =>
    players.filter(p => {
      const matchQ = p.name.toLowerCase().includes(search.toLowerCase());
      const matchC = category === 'Todos' || p.category === category;
      return matchQ && matchC;
    }),
  [search, category]);

  const featured = useMemo(() => filtered.filter(p => p.featured), [filtered]);
  const others   = useMemo(() => filtered.filter(p => !p.featured), [filtered]);
  const showFeaturedSection = featured.length > 0 && category === 'Todos' && !search;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", paddingBottom:"6rem" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .pl-card { animation: fadeUp 0.3s ease both; }
        .pl-card:hover .pl-logo { transform: scale(1.06); }
        .pl-open-btn { transition: all 0.15s; }
        .pl-open-btn:hover { background: rgba(34,211,238,0.22) !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(34,211,238,0.25); }
        .pl-card-wrap:hover { border-color: rgba(167,139,250,0.45) !important; box-shadow: 0 0 24px rgba(167,139,250,0.12) !important; transform: translateY(-2px); }
        .pl-cat-btn { transition: all 0.15s; }
        .pl-cat-btn:hover { background: rgba(167,139,250,0.1) !important; }
      `}</style>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"1.25rem 1.25rem" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:"1.25rem", padding:"16px 20px", background:"#141414", border:"1px solid rgba(167,139,250,0.15)", borderRadius:16, boxShadow:"0 0 0 1px rgba(167,139,250,0.05) inset" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Tv style={{ width:18, height:18, color:"#a78bfa" }} />
            </div>
            <div>
              <h1 style={{ fontSize:"1.15rem", fontWeight:800, color:"#fff", margin:0, letterSpacing:"-0.02em" }}>Players IPTV</h1>
              <p style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.35)", margin:0 }}>{players.length} players disponíveis</p>
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ display:"flex", gap:4, padding:4, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10 }}>
            {[['grid', <Grid key="g" style={{ width:14, height:14 }} />], ['list', <ListIcon key="l" style={{ width:14, height:14 }} />]].map(([m, icon]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:7, border:"none", cursor:"pointer", transition:"all 0.15s",
                  background: viewMode === m ? "#a78bfa" : "transparent",
                  color:      viewMode === m ? "#0a0a0a"  : "rgba(255,255,255,0.4)" }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:10, marginBottom:"1.25rem", padding:"14px 16px", background:"#141414", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14 }}>
          {/* Search */}
          <div style={{ position:"relative", flex:"1 1 200px", minWidth:180 }}>
            <Search style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"rgba(255,255,255,0.3)", pointerEvents:"none" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar player..."
              style={{ width:"100%", paddingLeft:34, paddingRight:12, paddingTop:8, paddingBottom:8, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:"#fff", fontSize:"0.8rem", outline:"none", boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor="rgba(167,139,250,0.4)"}
              onBlur={e  => e.target.style.borderColor="rgba(255,255,255,0.08)"}
            />
          </div>

          {/* Category pills */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <button key={cat} onClick={() => setCategory(cat)} className="pl-cat-btn"
                  style={{ padding:"6px 14px", borderRadius:20, border: active ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.08)", background: active ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.03)", color: active ? "#a78bfa" : "rgba(255,255,255,0.45)", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Counter */}
          <span style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.3)", marginLeft:"auto", whiteSpace:"nowrap" }}>
            {filtered.length} de {players.length} players
          </span>
        </div>

        {/* ── Featured ── */}
        {showFeaturedSection && (
          <div style={{ marginBottom:"1.5rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
              <Star style={{ width:13, height:13, color:"#fbbf24", fill:"#fbbf24" }} />
              <span style={{ fontSize:"0.68rem", fontWeight:800, color:"#fbbf24", textTransform:"uppercase", letterSpacing:"0.12em" }}>Em Destaque</span>
            </div>
            <div style={{ display: viewMode === 'grid' ? "grid" : "flex", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", flexDirection:"column", gap:12 }}>
              {featured.map((p, i) => <PlayerCard key={p.name} player={p} viewMode={viewMode} delay={i * 50} />)}
            </div>
          </div>
        )}

        {/* ── All / Filtered ── */}
        {others.length > 0 && (
          <div>
            {showFeaturedSection && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                <span style={{ fontSize:"0.68rem", fontWeight:800, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.12em" }}>Todos os Players</span>
              </div>
            )}
            <div style={{ display: viewMode === 'grid' ? "grid" : "flex", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", flexDirection:"column", gap:12 }}>
              {others.map((p, i) => <PlayerCard key={p.name} player={p} viewMode={viewMode} delay={i * 40} />)}
            </div>
          </div>
        )}

        {/* Empty */}
        {filtered.length === 0 && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4rem 1rem", background:"#141414", border:"1px dashed rgba(167,139,250,0.18)", borderRadius:16 }}>
            <Search style={{ width:36, height:36, color:"rgba(167,139,250,0.2)", marginBottom:12 }} />
            <p style={{ fontSize:"0.9rem", fontWeight:700, color:"rgba(255,255,255,0.5)", margin:"0 0 4px" }}>Nenhum player encontrado</p>
            <p style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.25)", margin:0 }}>Tente ajustar sua busca ou filtro</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerCard({ player, viewMode, delay = 0 }) {
  const cat = CAT_STYLE[player.category] || CAT_STYLE.Standard;

  if (viewMode === 'list') {
    return (
      <div className="pl-card pl-card-wrap"
        style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", background:"#141414", border:"1px solid rgba(167,139,250,0.15)", borderRadius:12, transition:"all 0.2s", cursor:"default", animationDelay:`${delay}ms` }}>
        {player.logo
          ? <img src={player.logo} alt={player.name} loading="lazy" className="pl-logo" style={{ width:48, height:48, objectFit:"contain", borderRadius:10, flexShrink:0, transition:"transform 0.2s" }} />
          : <div style={{ width:48, height:48, borderRadius:10, background:"rgba(167,139,250,0.08)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}><Tv style={{ width:20, height:20, color:"rgba(167,139,250,0.4)" }} /></div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <h3 style={{ fontSize:"0.88rem", fontWeight:700, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{player.name}</h3>
            {player.featured && <Star style={{ width:12, height:12, color:"#fbbf24", fill:"#fbbf24", flexShrink:0 }} />}
          </div>
          <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 10px", borderRadius:20, fontSize:"0.65rem", fontWeight:700, color:cat.color, background:cat.bg, border:`1px solid ${cat.border}` }}>{player.category}</span>
        </div>
        <a href={player.url} target="_blank" rel="noopener noreferrer" className="pl-open-btn"
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.25)", color:"#22d3ee", fontSize:"0.75rem", fontWeight:700, textDecoration:"none", flexShrink:0 }}>
          Abrir <ExternalLink style={{ width:12, height:12 }} />
        </a>
      </div>
    );
  }

  // Grid card
  return (
    <div className="pl-card pl-card-wrap"
      style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"24px 20px 20px", background:"#141414", border:"1px solid rgba(167,139,250,0.15)", borderRadius:16, transition:"all 0.2s", position:"relative", boxShadow:"0 2px 16px rgba(0,0,0,0.5)", animationDelay:`${delay}ms`, cursor:"default" }}>

      {player.featured && (
        <div style={{ position:"absolute", top:12, right:12 }}>
          <Star style={{ width:14, height:14, color:"#fbbf24", fill:"#fbbf24" }} />
        </div>
      )}

      {/* Logo */}
      <div style={{ width:80, height:80, borderRadius:16, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14, overflow:"hidden" }}>
        {player.logo
          ? <img src={player.logo} alt={player.name} loading="lazy" className="pl-logo" style={{ width:64, height:64, objectFit:"contain", transition:"transform 0.2s" }} />
          : <Tv style={{ width:30, height:30, color:"rgba(167,139,250,0.4)" }} />
        }
      </div>

      <h3 style={{ fontSize:"0.9rem", fontWeight:700, color:"#fff", margin:"0 0 10px", lineHeight:1.3 }}>{player.name}</h3>

      <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 12px", borderRadius:20, fontSize:"0.65rem", fontWeight:700, color:cat.color, background:cat.bg, border:`1px solid ${cat.border}`, marginBottom:16 }}>
        {player.category}
      </span>

      <a href={player.url} target="_blank" rel="noopener noreferrer" className="pl-open-btn"
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"10px 0", borderRadius:10, background:"rgba(34,211,238,0.12)", border:"1px solid rgba(34,211,238,0.25)", color:"#22d3ee", fontSize:"0.8rem", fontWeight:700, textDecoration:"none", marginTop:"auto" }}>
        Abrir Player <ExternalLink style={{ width:13, height:13 }} />
      </a>
    </div>
  );
}
