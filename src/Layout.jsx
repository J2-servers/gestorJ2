import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Home, Users, Server, CreditCard, Settings as SettingsIcon, Bell,
  BarChart3, Menu, X, LogOut, User as UserIcon, MessageSquare, List,
  ChevronRight, DollarSign, Image, Zap, Layers, Send, Wrench, ShieldAlert, MessageCircle
} from "lucide-react";
import NotificationPopover from "@/components/layout/NotificationPopover";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";
import ResellerMobileNav from "@/components/layout/ResellerMobileNav";
import AdminMobileNav from "@/components/layout/AdminMobileNav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const J2_ACCENT = "#ff4b12";
const J2_ACCENT_2 = "#8f1608";
const J2_RAISED = "8px 10px 22px rgba(0,0,0,0.44), -4px -4px 12px rgba(255,255,255,0.016)";
const J2_SUNKEN = "inset 3px 3px 8px rgba(0,0,0,0.34), inset -2px -2px 6px rgba(255,255,255,0.016)";

const getNavItems = (role, paymentType) => {
  const base = [{ title: "Dashboard", url: createPageUrl("Dashboard"), icon: Home }];
  if (role === "admin" || role === "dev") return [
    ...base,
    { title: "Analytics",     url: createPageUrl("Analytics"),          icon: BarChart3 },
    { title: "Revendedores",  url: createPageUrl("Users"),              icon: Users },
    { title: "Pedidos",       url: createPageUrl("CreditRequests"),     icon: CreditCard },
    { title: "Chat",          url: createPageUrl("Chat"),               icon: MessageCircle },
    { title: "Financeiro",    url: createPageUrl("InvoiceManagement"),  icon: DollarSign },
    { title: "Comprovantes",  url: createPageUrl("ProofGallery"),       icon: Image },
    { title: "Templates",     url: createPageUrl("MessageTemplates"),   icon: MessageSquare },
    { title: "WA Diagnóstico", url: createPageUrl("WhatsAppDiagnostic"), icon: Zap },
    { title: "Servidores",    url: createPageUrl("AdminServers"),       icon: Layers },
    { title: "Envios",        url: createPageUrl("BroadcastMessage"),   icon: Send },
    { title: "Manutenção",    url: createPageUrl("DevDiagnostics"),     icon: Wrench },
    { title: "Painel GOD",    url: createPageUrl("GodDashboard"),       icon: ShieldAlert },
  ];
  if (role === "user") {
    const items = [
      ...base,
      { title: "Pedidos",   url: createPageUrl("CreditRequests"), icon: CreditCard },
      { title: "Chat",      url: createPageUrl("Chat"),           icon: MessageCircle },
      { title: "Servidores",url: createPageUrl("Servers"),        icon: Server },

      { title: "Gestão",    url: createPageUrl("Management"),     icon: BarChart3 },
      { title: "Playlists", url: createPageUrl("Playlists"),      icon: List },
    ];
    if (paymentType === "postpaid")
      items.splice(2, 0, { title: "Financeiro", url: createPageUrl("FinanceiroPospago"), icon: DollarSign });
    return items;
  }
  return base;
};

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings]       = useState(null);
  const location = useLocation();

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id);

  useEffect(() => {
    document.title = "Gestor J2";
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await remoteClient.settings.get();
      if (s) setSettings(s);
    } catch { /* ignore — settings are optional */ }
  };

  const handleLogout = () => logout();
  const navItems   = user ? getNavItems(user.role, user.payment_type) : [];
  const isAdmin    = user?.role === "admin" || user?.role === "dev";

  const LogoBlock = () => (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
           style={{ background: "var(--color-primary-light)", border: "1px solid var(--color-primary-border)" }}>
        {settings?.sidebar_logo_url
          ? <img src={settings.sidebar_logo_url} alt="Logo" className="w-7 h-7 object-cover rounded" />
          : <Zap className="w-4 h-4" style={{ color: "var(--color-primary)" }} />}
      </div>
      <div>
        <p className="font-bold text-sm leading-none" style={{ color: "var(--color-primary)" }}>
          {settings?.company_name || "Gestor J2"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-disabled)" }}>
          {isAdmin ? "Painel Admin" : "Gestão de Revendas"}
        </p>
      </div>
    </div>
  );

  const NavList = ({ onClick }) => (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map(item => {
        const active = location.pathname === item.url;
        return (
          <Link key={item.title} to={item.url} onClick={onClick}
            className={`nav-item ${active ? "active" : ""}`}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );

  // Forçar tema escuro absolutamente
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.style.cssText += "background-color:#0a0a0a!important;color:#ffffff!important;color-scheme:dark!important;";
    document.body.style.cssText += "background-color:#0a0a0a!important;color:#ffffff!important;";
    document.getElementById("root") && (document.getElementById("root").style.backgroundColor = "#0a0a0a");
  }, []);

  return (
    <div className="app-layout min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>

      {/* ── Desktop Sidebar ── */}
      <>
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden"
          style={{
            position: "fixed", top: 20, left: 20, zIndex: 60,
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(145deg,#111516,#080a0b)",
            border: "0",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(12px)",
            boxShadow: J2_RAISED,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(145deg,#15191a,#090b0c)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(145deg,#111516,#080a0b)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          <Menu style={{ width: 18, height: 18, color: J2_ACCENT }} />
        </button>

        {/* Backdrop */}
        <div
          className="app-sidebar hidden lg:flex lg:flex-col"
          style={{
            position: "sticky", top: 16,
            width: 260, zIndex: 60,
            height: "calc(100dvh - 32px)",
            background: "linear-gradient(160deg,#0b0d0d 0%,#070808 62%,#030404 100%)",
            border: "0",
            borderRadius: 20,
            backdropFilter: "blur(24px)",
            boxShadow: "10px 16px 34px rgba(0,0,0,0.58), -5px -5px 16px rgba(255,255,255,0.014)",
            transform: "translateX(0) scale(1)",
            opacity: 1,
            pointerEvents: "all",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <LogoBlock />
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ display: "none" }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div style={{ padding: "12px 12px 0" }}>
	              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(3,4,4,0.72)", border: "0", borderRadius: 12, boxShadow: J2_SUNKEN }}>
	                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${J2_ACCENT},${J2_ACCENT_2})`, border: "0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {user.name ? user.name[0].toUpperCase() : <UserIcon style={{ width: 14, height: 14 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || user.email}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0 }}>{isAdmin ? "Administrador" : "Revendedor"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {navItems.map(item => {
              const active = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10, textDecoration: "none",
                    fontSize: 13, fontWeight: 600,
	                    color: active ? J2_ACCENT : "rgba(255,255,255,0.55)",
	                    background: active ? "rgba(255,75,18,0.1)" : "transparent",
	                    border: "0",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}
                >
	                  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? "rgba(255,75,18,0.14)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: active ? J2_SUNKEN : "none" }}>
	                    <item.icon style={{ width: 13, height: 13, color: active ? J2_ACCENT : "rgba(255,255,255,0.4)" }} />
	                  </div>
	                  {item.title}
	                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: J2_ACCENT }} />}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
            <PushNotificationToggle />

            <Popover>
              <PopoverTrigger asChild>
                <button style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", width: "100%", position: "relative" }}>
	                  <Bell style={{ width: 13, height: 13, color: J2_ACCENT }} />
	                  Notificações
	                  {unreadCount > 0 && (
	                    <span style={{ marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 9, background: J2_ACCENT, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-[#141414] border-white/10" side="right" align="end">
                <NotificationPopover notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
              </PopoverContent>
            </Popover>

            <div style={{ display: "flex", gap: 6 }}>
              <Link to={createPageUrl("Profile")} onClick={() => setSidebarOpen(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                <UserIcon style={{ width: 12, height: 12 }} /> Perfil
              </Link>
              {isAdmin && (
                <Link to={createPageUrl("Settings")} onClick={() => setSidebarOpen(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                  <SettingsIcon style={{ width: 12, height: 12 }} /> Config
                </Link>
              )}
              <button onClick={handleLogout} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#f87171" }}>
                <LogOut style={{ width: 12, height: 12 }} /> Sair
              </button>
            </div>
          </div>
        </div>
      </>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden sticky top-0 z-50 h-14 flex items-center justify-between px-4"
	           style={{ background: "rgba(4,5,5,0.96)", borderBottom: "0", backdropFilter: "blur(20px)", boxShadow: "0 10px 24px rgba(0,0,0,0.32)" }}>
        <LogoBlock />
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative flex items-center justify-center"
	                style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(145deg,#111516,#080a0b)", border: "0", boxShadow: J2_RAISED }}>
	                <Bell style={{ width: 15, height: 15, color: J2_ACCENT }} />
	                {unreadCount > 0 && (
	                  <span style={{ position:"absolute", top:-4, right:-4, minWidth:16, height:16, borderRadius:8, background:J2_ACCENT, color:"#fff", fontSize:8, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"2px solid #0a0a0a" }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 mr-4 bg-[#141414] border-white/10">
              <NotificationPopover notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
            </PopoverContent>
          </Popover>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              width: 36, height: 36, borderRadius: 10, display:"flex", alignItems:"center", justifyContent:"center",
	              background: mobileOpen ? "linear-gradient(135deg,#15191a,#080a0b)" : "linear-gradient(145deg,#111516,#080a0b)",
	              border: "0",
	              boxShadow: mobileOpen ? J2_SUNKEN : J2_RAISED,
              cursor:"pointer", transition:"all 0.2s",
            }}
          >
            <div style={{ position:"relative", width:18, height:18 }}>
	              <Menu style={{ width:18, height:18, color:J2_ACCENT, position:"absolute", top:0, left:0, transition:"all 0.25s", opacity: mobileOpen ? 0 : 1, transform: mobileOpen ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)" }} />
	              <X style={{ width:18, height:18, color:J2_ACCENT, position:"absolute", top:0, left:0, transition:"all 0.25s", opacity: mobileOpen ? 1 : 0, transform: mobileOpen ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)" }} />
            </div>
          </button>
        </div>
      </div>

      {/* ── Mobile Full-Screen Drawer ── */}
      <div
        className="lg:hidden"
        style={{
          position: "fixed", inset: 0, zIndex: 49,
          pointerEvents: mobileOpen ? "all" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            transition: "opacity 0.3s ease",
            opacity: mobileOpen ? 1 : 0,
          }}
        />

        {/* Drawer Panel — slides in from the right */}
        <div
          style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: "82%", maxWidth: 320,
	            background: "linear-gradient(160deg, #0b0d0d 0%, #070808 60%, #030404 100%)",
	            border: "0",
            borderRight: "none",
            borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
	            boxShadow: "-16px 0 52px rgba(0,0,0,0.82)",
            transform: mobileOpen ? "translateX(0)" : "translateX(110%)",
            transition: "transform 0.4s cubic-bezier(0.32,0.72,0,1)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Glow orb decoration */}

          {/* Header */}
	          <div style={{ padding:"20px 20px 16px", borderBottom:"0", display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative", zIndex:1, marginTop: 14 }}>
            <LogoBlock />
            <button
              onClick={() => setMobileOpen(false)}
              style={{ width:32, height:32, borderRadius:10, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
            >
              <X style={{ width:15, height:15, color:"rgba(255,255,255,0.5)" }} />
            </button>
          </div>

          {/* User Card */}
          {user && (
            <div style={{ padding:"14px 16px 0", position:"relative", zIndex:1 }}>
	              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"rgba(3,4,4,0.72)", border:"0", borderRadius:14, backdropFilter:"blur(10px)", boxShadow:J2_SUNKEN }}>
	                <div style={{ width:40, height:40, borderRadius:"50%", background:`linear-gradient(135deg, ${J2_ACCENT}, ${J2_ACCENT_2})`, border:"0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#fff", flexShrink:0 }}>
                  {user.name ? user.name[0].toUpperCase() : <UserIcon style={{ width:16, height:16 }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name || user.email}</p>
                  <p style={{ fontSize:10, margin:0, fontWeight:700, color: isAdmin ? J2_ACCENT : "#ff8a4a" }}>
                    {isAdmin ? "Administrador" : "Revendedor"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nav Items */}
          <nav style={{ flex:1, padding:"12px 12px", overflowY:"auto", position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:3 }}>
            {navItems.map((item, idx) => {
              const active = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"11px 14px", borderRadius:12, textDecoration:"none",
                    fontSize:13, fontWeight:600,
	                    color: active ? J2_ACCENT : "rgba(255,255,255,0.6)",
	                    background: active ? "rgba(255,75,18,0.1)" : "transparent",
	                    border: "0",
                    transition:"all 0.18s",
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
	                  <div style={{ width:32, height:32, borderRadius:9, background: active ? "rgba(255,75,18,0.14)" : "rgba(255,255,255,0.05)", border:"0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow: active ? J2_SUNKEN : "none" }}>
	                    <item.icon style={{ width:14, height:14, color: active ? J2_ACCENT : "rgba(255,255,255,0.45)" }} />
                  </div>
                  <span style={{ flex:1 }}>{item.title}</span>
                  {active
	                    ? <div style={{ width:6, height:6, borderRadius:"50%", background:J2_ACCENT }} />
                    : <ChevronRight style={{ width:14, height:14, color:"rgba(255,255,255,0.2)" }} />
                  }
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ padding:"12px 12px 28px", borderTop:"1px solid rgba(255,255,255,0.06)", position:"relative", zIndex:1, display:"flex", flexDirection:"column", gap:8 }}>
            <PushNotificationToggle />

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <button style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", cursor:"pointer", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", width:"100%", position:"relative" }}>
	                  <div style={{ width:30, height:30, borderRadius:8, background:"rgba(255,75,18,0.12)", border:"0", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:J2_SUNKEN }}>
	                    <Bell style={{ width:13, height:13, color:J2_ACCENT }} />
                  </div>
                  Notificações
                  {unreadCount > 0 && (
	                    <span style={{ marginLeft:"auto", minWidth:20, height:20, borderRadius:10, background:J2_ACCENT, color:"#fff", fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-[#141414] border-white/10" side="top" align="end">
                <NotificationPopover notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
              </PopoverContent>
            </Popover>

            {/* Profile + Settings + Logout */}
            <div style={{ display:"flex", gap:6 }}>
              <Link to={createPageUrl("Profile")} onClick={() => setMobileOpen(false)}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 6px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", textDecoration:"none" }}>
                <UserIcon style={{ width:14, height:14, color:"rgba(255,255,255,0.5)" }} />
                <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.4)" }}>Perfil</span>
              </Link>
              {isAdmin && (
                <Link to={createPageUrl("Settings")} onClick={() => setMobileOpen(false)}
                  style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 6px", borderRadius:12, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", textDecoration:"none" }}>
                  <SettingsIcon style={{ width:14, height:14, color:"rgba(255,255,255,0.5)" }} />
                  <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.4)" }}>Config</span>
                </Link>
              )}
              <button onClick={handleLogout}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 6px", borderRadius:12, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", cursor:"pointer" }}>
                <LogOut style={{ width:14, height:14, color:"#f87171" }} />
                <span style={{ fontSize:10, fontWeight:600, color:"#f87171" }}>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="app-content">
        <main className="app-main min-h-screen">
          {children}
          {/* Espaçador para o bottom nav mobile não cobrir o conteúdo */}
          {user && <div className="lg:hidden" style={{ height: "96px" }} aria-hidden="true" />}
        </main>
      </div>

      {/* Bottom nav mobile — exclusiva por papel */}
      {user?.role === "user" && (
        <ResellerMobileNav navigationItems={navItems} currentPath={location.pathname} user={user} />
      )}
      {isAdmin && (
        <AdminMobileNav
          currentPath={location.pathname}
          onOpenMenu={() => setMobileOpen(true)}
          unreadCount={unreadCount}
        />
      )}

    </div>
  );
}
