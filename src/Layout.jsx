import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Home, Users, Server, CreditCard, Settings as SettingsIcon, Bell,
  BarChart3, Menu, X, LogOut, User as UserIcon, MessageSquare, List,
  ChevronRight, DollarSign, Image, Zap, Layers, Send, Wrench
} from "lucide-react";
import NotificationPopover from "@/components/layout/NotificationPopover";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import ThemeToggle from "@/components/layout/ThemeToggle";
import ResellerMobileNav from "@/components/layout/ResellerMobileNav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getNavItems = (role, paymentType) => {
  const base = [{ title: "Dashboard", url: createPageUrl("Dashboard"), icon: Home }];
  if (role === "admin" || role === "dev") return [
    ...base,
    { title: "Analytics",     url: createPageUrl("Analytics"),          icon: BarChart3 },
    { title: "Revendedores",  url: createPageUrl("Users"),              icon: Users },
    { title: "Pedidos",       url: createPageUrl("CreditRequests"),     icon: CreditCard },
    { title: "Financeiro",    url: createPageUrl("InvoiceManagement"),  icon: DollarSign },
    { title: "Comprovantes",  url: createPageUrl("ProofGallery"),       icon: Image },
    { title: "Templates",     url: createPageUrl("MessageTemplates"),   icon: MessageSquare },
    { title: "WA Diagnóstico", url: createPageUrl("WhatsAppDiagnostic"), icon: Zap },
    { title: "Servidores",    url: createPageUrl("AdminServers"),       icon: Layers },
    { title: "Envios",        url: createPageUrl("BroadcastMessage"),   icon: Send },
    { title: "Manutenção",    url: createPageUrl("DevDiagnostics"),     icon: Wrench },
  ];
  if (role === "user") {
    const items = [
      ...base,
      { title: "Pedidos",   url: createPageUrl("CreditRequests"), icon: CreditCard },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>

      {/* ── Floating Sidebar Modal (Desktop) ── */}
      <>
        {/* Trigger button - visible on desktop always */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="hidden lg:flex"
          style={{
            position: "fixed", top: 20, left: 20, zIndex: 60,
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(167,139,250,0.15)",
            border: "1px solid rgba(167,139,250,0.35)",
            alignItems: "center", justifyContent: "center",
            cursor: "pointer", backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(167,139,250,0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(167,139,250,0.25)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(167,139,250,0.15)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          <Menu style={{ width: 18, height: 18, color: "#a78bfa" }} />
        </button>

        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="hidden lg:block"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 55,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            }}
          />
        )}

        {/* Floating Sidebar Panel */}
        <div
          className="hidden lg:flex lg:flex-col"
          style={{
            position: "fixed", top: 16, left: 16, bottom: 16,
            width: 260, zIndex: 60,
            background: "rgba(15,15,15,0.97)",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: 20,
            backdropFilter: "blur(24px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(167,139,250,0.08) inset",
            transform: sidebarOpen ? "translateX(0) scale(1)" : "translateX(-290px) scale(0.97)",
            opacity: sidebarOpen ? 1 : 0,
            transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
            pointerEvents: sidebarOpen ? "all" : "none",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <LogoBlock />
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", flexShrink: 0 }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* User info */}
          {user && (
            <div style={{ padding: "12px 12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#a78bfa", flexShrink: 0 }}>
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
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 10, textDecoration: "none",
                    fontSize: 13, fontWeight: 600,
                    color: active ? "#a78bfa" : "rgba(255,255,255,0.55)",
                    background: active ? "rgba(167,139,250,0.12)" : "transparent",
                    border: active ? "1px solid rgba(167,139,250,0.2)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; } }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <item.icon style={{ width: 13, height: 13, color: active ? "#a78bfa" : "rgba(255,255,255,0.4)" }} />
                  </div>
                  {item.title}
                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />}
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
                  <Bell style={{ width: 13, height: 13, color: "#a78bfa" }} />
                  Notificações
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 9, background: "#a78bfa", color: "#0a0a0a", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
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
              <Link to={createPageUrl("Profile")} onClick={() => setSidebarOpen(false)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                <UserIcon style={{ width: 12, height: 12 }} /> Perfil
              </Link>
              {isAdmin && (
                <Link to={createPageUrl("Settings")} onClick={() => setSidebarOpen(false)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
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
           style={{ background: "rgba(10,10,10,0.96)", borderBottom: "1px solid rgba(167,139,250,0.12)", backdropFilter: "blur(20px)" }}>
        <LogoBlock />
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative flex items-center justify-center"
                style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <Bell style={{ width: 15, height: 15, color: "#a78bfa" }} />
                {unreadCount > 0 && (
                  <span style={{ position:"absolute", top:-4, right:-4, minWidth:16, height:16, borderRadius:8, background:"#a78bfa", color:"#0a0a0a", fontSize:8, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"2px solid #0a0a0a" }}>
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
              background: mobileOpen ? "rgba(167,139,250,0.2)" : "rgba(167,139,250,0.1)",
              border: `1px solid ${mobileOpen ? "rgba(167,139,250,0.5)" : "rgba(167,139,250,0.2)"}`,
              cursor:"pointer", transition:"all 0.2s",
            }}
          >
            <div style={{ position:"relative", width:18, height:18 }}>
              <Menu style={{ width:18, height:18, color:"#a78bfa", position:"absolute", top:0, left:0, transition:"all 0.25s", opacity: mobileOpen ? 0 : 1, transform: mobileOpen ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)" }} />
              <X style={{ width:18, height:18, color:"#a78bfa", position:"absolute", top:0, left:0, transition:"all 0.25s", opacity: mobileOpen ? 1 : 0, transform: mobileOpen ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)" }} />
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
            background: "linear-gradient(160deg, #0d0d10 0%, #080810 60%, #050508 100%)",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRight: "none",
            borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
            boxShadow: "-8px 0 48px rgba(0,0,0,0.9), 0 0 60px rgba(167,139,250,0.08)",
            transform: mobileOpen ? "translateX(0)" : "translateX(110%)",
            transition: "transform 0.4s cubic-bezier(0.32,0.72,0,1)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Glow orb decoration */}
          <div style={{ position:"absolute", top:-60, right:-60, width:180, height:180, borderRadius:"50%", background:"radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", bottom:-40, left:-40, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)", pointerEvents:"none" }} />

          {/* Header */}
          <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid rgba(167,139,250,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative", zIndex:1, marginTop: 14 }}>
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
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"rgba(167,139,250,0.07)", border:"1px solid rgba(167,139,250,0.18)", borderRadius:14, backdropFilter:"blur(10px)" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg, rgba(167,139,250,0.3), rgba(34,211,238,0.15))", border:"2px solid rgba(167,139,250,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#a78bfa", flexShrink:0 }}>
                  {user.name ? user.name[0].toUpperCase() : <UserIcon style={{ width:16, height:16 }} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name || user.email}</p>
                  <p style={{ fontSize:10, margin:0, fontWeight:700, color: isAdmin ? "#a78bfa" : "#34d399" }}>
                    {isAdmin ? "👍‘ Administrador" : "🔍„ Revendedor"}
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
                    color: active ? "#a78bfa" : "rgba(255,255,255,0.6)",
                    background: active ? "rgba(167,139,250,0.12)" : "transparent",
                    border: `1px solid ${active ? "rgba(167,139,250,0.25)" : "transparent"}`,
                    transition:"all 0.18s",
                    animationDelay: `${idx * 40}ms`,
                  }}
                >
                  <div style={{ width:32, height:32, borderRadius:9, background: active ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.05)", border:`1px solid ${active ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <item.icon style={{ width:14, height:14, color: active ? "#a78bfa" : "rgba(255,255,255,0.45)" }} />
                  </div>
                  <span style={{ flex:1 }}>{item.title}</span>
                  {active
                    ? <div style={{ width:6, height:6, borderRadius:"50%", background:"#a78bfa", boxShadow:"0 0 8px rgba(167,139,250,0.8)" }} />
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
                  <div style={{ width:30, height:30, borderRadius:8, background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Bell style={{ width:13, height:13, color:"#a78bfa" }} />
                  </div>
                  Notificações
                  {unreadCount > 0 && (
                    <span style={{ marginLeft:"auto", minWidth:20, height:20, borderRadius:10, background:"#a78bfa", color:"#0a0a0a", fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 5px" }}>
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
      <div className="lg:pl-0">
        <main className="min-h-screen">
          {children}
        </main>
      </div>

      {/* Reseller mobile bottom nav */}
      {user?.role === "user" && (
        <ResellerMobileNav navigationItems={navItems} currentPath={location.pathname} user={user} />
      )}

      {/* Admin mobile bottom nav */}
      {isAdmin && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
             style={{ background: "rgba(10,10,10,0.97)", borderTop: "1px solid var(--color-border-subtle)", backdropFilter: "blur(12px)" }}>
          <nav className="flex justify-around items-center h-16 px-2">
            {navItems.slice(0, 5).map(item => {
              const active = location.pathname === item.url;
              return (
                <Link key={item.title} to={item.url}
                  className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-fast"
                  style={{ color: active ? "var(--color-primary)" : "var(--color-text-disabled)" }}>
                  <div className="p-1.5 rounded-md" style={{ background: active ? "var(--color-primary-light)" : "transparent" }}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-medium truncate max-w-[3.5rem] text-center">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

