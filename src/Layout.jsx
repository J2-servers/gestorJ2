import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { remoteClient } from "@/api/remoteClient";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Home, Users, Server, CreditCard, Settings as SettingsIcon, Bell,
  BarChart3, Menu, X, LogOut, User as UserIcon, MessageSquare, List,
  ChevronLeft, ChevronRight, DollarSign, Image, Zap, Layers, Send, Wrench, ShieldAlert, MessageCircle, FileSpreadsheet
} from "lucide-react";
import NotificationPopover from "@/components/layout/NotificationPopover";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import ResellerMobileNav from "@/components/layout/ResellerMobileNav";
import AdminMobileNav from "@/components/layout/AdminMobileNav";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const J2_ACCENT = "#ff4b12";
const J2_ACCENT_2 = "#8f1608";
const J2_RAISED = "8px 10px 22px rgba(0,0,0,0.44), -4px -4px 12px rgba(255,255,255,0.016)";
const J2_SUNKEN = "inset 3px 3px 8px rgba(0,0,0,0.34), inset -2px -2px 6px rgba(255,255,255,0.016)";

const mobileDarkThemeCss = `
@media (max-width: 1023px) {
  :root {
    --j2-bg: #030404;
    --j2-bg-soft: #080909;
    --j2-surface: rgba(6, 7, 7, .96);
    --j2-surface-2: rgba(9, 10, 10, .96);
    --j2-surface-strong: rgba(12, 15, 15, .98);
    --j2-surface-sunken: rgba(3, 4, 4, .76);
    --j2-sunken-bg: rgba(3, 4, 4, .76);
    --j2-text: #fff8f2;
    --j2-muted: #a3a09b;
    --j2-faint: #67615c;
    --j2-neu: 8px 10px 22px rgba(0,0,0,.44),
      -4px -4px 12px rgba(255,255,255,.016),
      inset 1px 1px 0 rgba(255,255,255,.014);
    --j2-neu-soft: 5px 6px 14px rgba(0,0,0,.32),
      -2px -2px 8px rgba(255,255,255,.014);
    --j2-sunken: inset 3px 3px 8px rgba(0,0,0,.34),
      inset -2px -2px 6px rgba(255,255,255,.016);
  }

  html,
  body,
  #root,
  .app-layout,
  .app-content,
  .app-main {
    background: var(--j2-bg) !important;
    color: var(--j2-text) !important;
    color-scheme: dark !important;
  }

  .dash-page {
    --dash-bg: #030404;
    --dash-bg-soft: #080909;
    --dash-surface: rgba(6, 7, 7, .96);
    --dash-surface-2: rgba(9, 10, 10, .96);
    --dash-sunken-bg: rgba(3, 4, 4, .76);
    --dash-text: #fff8f2;
    --dash-muted: #a3a09b;
    --dash-faint: #67615c;
    --dash-neu: var(--j2-neu);
    --dash-neu-soft: var(--j2-neu-soft);
    --dash-sunken: var(--j2-sunken);
  }

  .analytics-page {
    --a-bg: #030404;
    --a-bg-soft: #080909;
    --a-surface: rgba(6, 7, 7, .96);
    --a-surface-2: rgba(9, 10, 10, .96);
    --a-sunken: rgba(3, 4, 4, .76);
    --a-text: #fff8f2;
    --a-muted: #a3a09b;
    --a-faint: #67615c;
    --a-neu: var(--j2-neu);
    --a-neu-soft: var(--j2-neu-soft);
    --a-inner: var(--j2-sunken);
  }

  .j2-page,
  .dash-page,
  .analytics-page,
  .cr-page,
  .chat-page,
  .users-page,
  .settings-page,
  .profile-page,
  .servers-page,
  .adminservers-page,
  .proof-page,
  .templates-page,
  .wa-page,
  .broadcast-page,
  .management-page,
  .playlists-page,
  .finance-page,
  .invoice-page,
  .god-page,
  .dev-page,
  .devdiag-page,
  .postpay-page,
  .users-rebuilt-page,
  .login-page,
  .register-page,
  .recovery-page,
  .home-page,
  .index-page,
  .not-found-page,
  .user-not-registered-page {
    --j2-bg: #030404;
    --j2-bg-soft: #080909;
    --j2-surface: rgba(6, 7, 7, .96);
    --j2-surface-2: rgba(9, 10, 10, .96);
    --j2-surface-strong: rgba(12, 15, 15, .98);
    --j2-surface-sunken: rgba(3, 4, 4, .76);
    --j2-sunken-bg: rgba(3, 4, 4, .76);
    --j2-text: #fff8f2;
    --j2-muted: #a3a09b;
    --j2-faint: #67615c;
    --j2-neu: 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.016), inset 1px 1px 0 rgba(255,255,255,.014);
    --j2-neu-soft: 5px 6px 14px rgba(0,0,0,.32), -2px -2px 8px rgba(255,255,255,.014);
    --j2-sunken: inset 3px 3px 8px rgba(0,0,0,.34), inset -2px -2px 6px rgba(255,255,255,.016);
    background: linear-gradient(135deg, #030404 0%, #080909 54%, #010202 100%) !important;
    color: var(--j2-text) !important;
  }

  :where(.j2-page, .dash-page, .analytics-page, .cr-page, .chat-page, .users-page, .users-rebuilt-page, .settings-page, .profile-page, .servers-page, .adminservers-page, .proof-page, .templates-page, .wa-page, .broadcast-page, .management-page, .playlists-page, .finance-page, .invoice-page, .god-page, .dev-page, .devdiag-page, .postpay-page)
  :where(h1, h2, h3, h4, p, span, strong, small, label, li, th, td, button, input, textarea, select, .text-black, [class*="text-gray"], [class*="text-neutral"], [class*="text-zinc"]) {
    color: var(--j2-text) !important;
  }

  :where(.j2-page, .dash-page, .analytics-page, .cr-page, .chat-page, .users-page, .users-rebuilt-page, .settings-page, .profile-page, .servers-page, .adminservers-page, .proof-page, .templates-page, .wa-page, .broadcast-page, .management-page, .playlists-page, .finance-page, .invoice-page, .god-page, .dev-page, .devdiag-page, .postpay-page)
  :where(.j2-muted, [class*="muted"], [class*="subtitle"], [class*="detail"], [class*="meta"], [class*="hint"], [class*="description"]) {
    color: var(--j2-muted) !important;
  }

  :where(.j2-page, .dash-page, .analytics-page, .cr-page, .chat-page, .users-page, .users-rebuilt-page, .settings-page, .profile-page, .servers-page, .adminservers-page, .proof-page, .templates-page, .wa-page, .broadcast-page, .management-page, .playlists-page, .finance-page, .invoice-page, .god-page, .dev-page, .devdiag-page, .postpay-page)
  :where(.j2-accent-text, .active, [class*="kicker"], [class*="accent"], [class*="value"], [class*="amount"], [class*="price"]) {
    color: var(--j2-accent) !important;
  }

  :where(.j2-panel, .j2-card, .j2-surface, .dash-hero, .dash-panel, .dash-metric, .dash-action-card, .dash-sync, .analytics-hero, .analytics-panel, .analytics-stat, .analytics-sync, .cr-hero, .cr-filter-panel, .cr-list-panel, .cr-form-zone, .cr-request-card, .cr-stat-card, .chat-list-panel, .chat-conversation-panel, .users-shell, .settings-panel, .profile-shell, .servers-shell, .adminservers-hero, .adminservers-metric, .adminservers-toolbar, .adminservers-card, .proof-shell, .templates-shell, .wa-shell, .broadcast-shell, .management-shell, .playlists-shell, .finance-shell, .invoice-shell, .god-shell, .dev-shell, .request-panel, .multi-request-panel, .request-chat-dialog, .template-dialog, .user-form-dialog, .proof-viewer, .image-upload-panel) {
    background: var(--j2-surface) !important;
    color: var(--j2-text) !important;
    border-color: transparent !important;
    box-shadow: var(--j2-neu) !important;
  }

  body :is(.users-rebuilt-page, .invoice-page, .proof-page, .templates-page, .wa-page, .adminservers-page, .broadcast-page, .devdiag-page, .god-page, .profile-page, .settings-page, .servers-page, .management-page, .playlists-page, .postpay-page)
  :is([class*="-hero"], [class*="-metric"], [class*="-panel"], [class*="-toolbar"], [class*="-card"], [class*="-tabs"], [class*="-state"], [class*="-summary"], [class*="-stat"], [class*="-side"], [class*="-workbench"], [class*="-column"], [class*="-section"], [class*="-empty"], [class*="-warning"], [class*="-vars"], [class*="-content"], [class*="-target"], [class*="-health"], [class*="-invoice"], [class*="-modal"], [class*="-confirm"], [class*="-view"]) {
    background: var(--j2-surface) !important;
    color: var(--j2-text) !important;
    border-color: transparent !important;
    box-shadow: var(--j2-neu) !important;
  }

  body :is(.users-rebuilt-page, .invoice-page, .proof-page, .templates-page, .wa-page, .adminservers-page, .broadcast-page, .devdiag-page, .god-page, .profile-page, .settings-page, .servers-page, .management-page, .playlists-page, .postpay-page)
  :is([class*="-icon"], [class*="-search"], [class*="-filter"], [class*="-input"], [class*="-toggle"], [class*="-count"], [class*="-info"], [class*="-data"], [class*="-preview"], [class*="-mini"], [class*="-result"], [class*="-note"], [class*="-bar"], [class*="-logo"], [class*="-row"], [class*="-list"], [class*="-btn"]:not(.primary), [class*="-action"]:not(.primary):not(.danger), [class*="-refresh"], [class*="-variable"]) {
    background: var(--j2-surface-sunken) !important;
    color: var(--j2-text) !important;
    border-color: transparent !important;
    box-shadow: var(--j2-sunken) !important;
  }

  :where(.j2-input, .j2-select, .j2-textarea, input:not([type="checkbox"]):not([type="radio"]), textarea, select, .dash-search, .analytics-filter, .analytics-search, .cr-search, .cr-filter, .chat-search, .chat-composer, .chat-input, [class*="search"], [class*="filter"]) {
    background: var(--j2-surface-sunken) !important;
    color: var(--j2-text) !important;
    border-color: transparent !important;
    box-shadow: var(--j2-sunken) !important;
  }

  :where(input, textarea)::placeholder {
    color: var(--j2-faint) !important;
  }

  :where(.j2-button-primary, .primary, [class*="primary"], .phone-required-action, .request-btn.primary, .multi-btn.primary, .request-server i, .multi-server-option i) {
    color: #fff !important;
    background: linear-gradient(135deg, #ff4b12, #8f1608) !important;
    box-shadow: var(--j2-neu-soft) !important;
  }

  .mobile-menu-arrow,
  .mobile-drawer-panel,
  .request-card,
  .request-step,
  .request-server-card,
  .request-summary,
  .request-chat-messages,
  .request-chat-bubble > div,
  .request-chat-composer,
  .multi-step,
  .multi-server-card,
  .multi-summary,
  .template-section,
  .user-form-section,
  .image-upload-dropzone {
    background: var(--j2-surface) !important;
    color: var(--j2-text) !important;
    box-shadow: var(--j2-neu) !important;
  }

  .mobile-drawer-backdrop {
    background: rgba(0, 0, 0, .54) !important;
    backdrop-filter: blur(7px) !important;
  }

  .chat-list-stats div,
  .chat-conversation-header,
  .chat-context-strip,
  .chat-day,
  .chat-message.theirs .chat-bubble,
  .chat-phrase-menu,
  .chat-phrase-list button,
  .chat-composer,
  .chat-live,
  .chat-thread-bottom i,
  .chat-skeleton-row span,
  .chat-skeleton-row i,
  .chat-skeleton-row b {
    background: var(--j2-surface-sunken) !important;
    color: var(--j2-text) !important;
    box-shadow: var(--j2-sunken) !important;
  }

  .chat-message.mine .chat-bubble,
  .chat-composer-send:not(:disabled),
  .chat-thread-bottom b {
    color: #fff !important;
    background: linear-gradient(135deg, #ff4b12, #8f1608) !important;
  }

  .request-action-modal,
  .request-action-modal :where(h1, h2, h3, p, span, strong, small, label, textarea, button) {
    color: var(--j2-text) !important;
  }

  .request-action-modal :where(.request-action-footer button:first-child) {
    color: var(--j2-text) !important;
    background: var(--j2-surface-sunken) !important;
  }

  .proof-viewer-stage,
  .request-chat-messages,
  .request-chat-composer textarea {
    background: var(--j2-surface-sunken) !important;
    color: var(--j2-text) !important;
    box-shadow: var(--j2-sunken) !important;
  }
}
`;

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
    { title: "Importar CSV",  url: createPageUrl("ImportData"),         icon: FileSpreadsheet },
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

const updateFavicon = (url) => {
  if (!url) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
};

export default function Layout({ children }) {
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
      if (s) {
        setSettings(s);
        document.title = s.company_name || "Gestor J2";
        updateFavicon(s.favicon_url);
      }
    } catch { /* ignore — settings are optional */ }
  };

  const handleLogout = () => logout();
  const navItems   = user ? getNavItems(user.role, user.payment_type) : [];
  const isAdmin    = user?.role === "admin" || user?.role === "dev";
  const currentPath = location.pathname.toLowerCase();
  const isChatPage  = currentPath === createPageUrl("Chat").toLowerCase();
  const hideAppChrome = currentPath === createPageUrl("Login").toLowerCase();

  const LogoBlock = () => (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden"
           style={{ background: "var(--color-primary-light)", border: "1px solid var(--color-primary-border)" }}>
        {settings?.sidebar_logo_url
          ? <img src={settings.sidebar_logo_url} alt={settings?.company_name || "Logo"} className="w-7 h-7 rounded" style={{ objectFit: settings?.sidebar_logo_fit || "contain" }} />
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

  const AccountActions = ({ onNavigate }) => {
    const compactButton = {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      padding: "9px 6px",
      borderRadius: 13,
      border: "0",
      textDecoration: "none",
      background: "rgba(3,4,4,0.72)",
      boxShadow: J2_SUNKEN,
      cursor: "pointer",
    };

    const compactText = {
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontSize: 10,
      fontWeight: 800,
      color: "rgba(255,255,255,0.48)",
    };

    const iconWrap = {
      width: 28,
      height: 28,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
      borderRadius: 10,
      background: "rgba(255,75,18,0.12)",
      boxShadow: J2_SUNKEN,
    };

    return (
      <div
        className="account-actions"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 10,
          borderRadius: 16,
          background: "rgba(3,4,4,0.48)",
          boxShadow: J2_SUNKEN,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 2px" }}>
          <span style={{ color: "rgba(255,255,255,0.42)", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>
            Conta e sistema
          </span>
        </div>

        <PushNotificationToggle />

        <Popover>
          <PopoverTrigger asChild>
            <button
              style={{
                width: "100%",
                minHeight: 42,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                border: "0",
                borderRadius: 12,
                background: "rgba(3,4,4,0.72)",
                boxShadow: J2_SUNKEN,
                color: "rgba(255,255,255,0.56)",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 800,
              }}
              type="button"
            >
              <span style={iconWrap}>
                <Bell style={{ width: 13, height: 13, color: J2_ACCENT }} />
              </span>
              <span style={{ flex: 1, textAlign: "left" }}>Notificações</span>
              {unreadCount > 0 && (
                <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: J2_ACCENT, color: "#fff", fontSize: 9, fontWeight: 950, display: "grid", placeItems: "center", padding: "0 5px" }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-[#141414] border-white/10" side="top" align="end">
            <NotificationPopover notifications={notifications} onMarkRead={markRead} onMarkAllRead={markAllRead} />
          </PopoverContent>
        </Popover>

        <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))", gap: 6 }}>
          <Link to={createPageUrl("Profile")} onClick={onNavigate} style={compactButton} aria-label="Abrir perfil">
            <UserIcon style={{ width: 15, height: 15, color: "rgba(255,255,255,0.58)" }} />
            <span style={compactText}>Perfil</span>
          </Link>

          {isAdmin && (
            <Link
              to={createPageUrl("Settings")}
              onClick={onNavigate}
              style={{
                ...compactButton,
                background: "rgba(255,75,18,0.12)",
              }}
              aria-label="Abrir configurações"
            >
              <SettingsIcon style={{ width: 15, height: 15, color: J2_ACCENT }} />
              <span style={{ ...compactText, color: J2_ACCENT }}>Config</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            style={{
              ...compactButton,
              background: "rgba(248,113,113,0.08)",
              color: "#f87171",
            }}
            type="button"
            aria-label="Sair"
          >
            <LogOut style={{ width: 15, height: 15, color: "#f87171" }} />
            <span style={{ ...compactText, color: "#f87171" }}>Sair</span>
          </button>
        </div>
      </div>
    );
  };

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

  // Mantem o tema desktop escuro por classe. O tema claro mobile entra por CSS responsivo.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div
      className={`app-layout min-h-screen ${hideAppChrome ? "app-layout--plain" : ""}`}
      style={hideAppChrome ? { display: "block", gridTemplateColumns: "1fr" } : undefined}
    >

      {/* -- Desktop Sidebar -- */}
      {user && !hideAppChrome && (
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
            position: "fixed",
            top: 16,
            left: 16,
            bottom: 16,
            margin: 0,
            width: 260,
            zIndex: 60,
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
          <nav style={{ flex: 1, minHeight: 0, padding: "12px", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column", gap: 2 }}>
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

          {/* Account actions */}
          <div style={{ flex: "0 0 auto", padding: "10px 12px 12px", background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.18))" }}>
            <AccountActions />
          </div>
        </div>
      </>
      )}

      {user && !isChatPage && !hideAppChrome && (
        <button
          className="mobile-menu-arrow"
          onClick={() => setMobileOpen(true)}
          style={{
            position: "fixed",
            top: "max(10px, env(safe-area-inset-top))",
            right: 10,
            zIndex: 45,
            width: 38,
            height: 38,
            borderRadius: 14,
            border: 0,
            color: J2_ACCENT,
            background: "rgba(5,6,6,0.92)",
            boxShadow: "6px 8px 16px rgba(0,0,0,0.48), -2px -2px 8px rgba(255,255,255,0.016), inset 1px 1px 0 rgba(255,255,255,0.018)",
            cursor: "pointer",
            backdropFilter: "blur(16px)",
          }}
          type="button"
          aria-label="Abrir menu completo"
        >
          <ChevronLeft size={19} strokeWidth={2.5} />
        </button>
      )}

      {/* -- Mobile Full-Screen Drawer -- */}
      {!hideAppChrome && (
      <div
        className="lg:hidden"
        style={{
          position: "fixed", inset: 0, zIndex: 49,
          pointerEvents: mobileOpen ? "all" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          className="mobile-drawer-backdrop"
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
          className="mobile-drawer-panel"
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
	          <div className="mobile-drawer-header" style={{ padding:"20px 20px 16px", borderBottom:"0", display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative", zIndex:1, marginTop: 14 }}>
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

          {/* Account actions */}
          <div style={{ flex:"0 0 auto", padding:"10px 12px 18px", borderTop:"0", position:"relative", zIndex:1 }}>
            <AccountActions onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>
      )}

      {/* -- Main Content -- */}
      <div className="app-content">
        <main className={`app-main min-h-screen ${isChatPage ? "app-main--chat" : ""}`}>
          {children}
          {/* Espaçador para o bottom nav mobile não cobrir o conteúdo */}
          {user && !isChatPage && !hideAppChrome && <div className="lg:hidden" style={{ height: "76px" }} aria-hidden="true" />}
        </main>
      </div>

      {/* Bottom nav mobile — exclusiva por papel */}
      {user?.role === "user" && !hideAppChrome && (
        <ResellerMobileNav navigationItems={navItems} currentPath={location.pathname} user={user} />
      )}
      {isAdmin && !hideAppChrome && (
        <AdminMobileNav
          currentPath={location.pathname}
          unreadCount={unreadCount}
        />
      )}
      <style>{mobileDarkThemeCss}</style>

    </div>
  );
}
