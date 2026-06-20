import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart3, CreditCard, Home, MessageCircle } from "lucide-react";

const ADMIN_TABS = [
  { title: "Inicio", url: createPageUrl("Dashboard"), icon: Home },
  { title: "Pedidos", url: createPageUrl("CreditRequests"), icon: CreditCard },
  { title: "Chat", url: createPageUrl("Chat"), icon: MessageCircle, badge: true },
  { title: "Analise", url: createPageUrl("Analytics"), icon: BarChart3 },
];

export default function AdminMobileNav({ currentPath, unreadCount = 0 }) {
  const path = (currentPath || "").toLowerCase();
  const chatPath = createPageUrl("Chat").toLowerCase();
  const hiddenForChat = path === chatPath;

  return (
    <>
      <div className={`admin-mobile-nav ${hiddenForChat ? "is-hidden-for-chat" : ""}`} aria-hidden={hiddenForChat}>
        <nav className="admin-mobile-dock" aria-label="Navegacao admin mobile">
          <div className="admin-mobile-track">
            {ADMIN_TABS.map((tab) => (
              <NavKey
                key={tab.url}
                tab={tab}
                active={path === tab.url.toLowerCase()}
                badge={tab.badge ? unreadCount : 0}
              />
            ))}
          </div>
        </nav>
      </div>
      <style>{adminMobileNavStyles}</style>
    </>
  );
}

function NavKey({ tab, active, badge = 0 }) {
  const Icon = tab.icon;
  return (
    <Link className={`admin-mobile-key ${active ? "active" : ""}`} to={tab.url} aria-label={tab.title}>
      <span className="admin-mobile-key-icon">
        <Icon size={19} strokeWidth={2.4} />
        {badge > 0 && <span className="admin-mobile-badge">{badge > 9 ? "9+" : badge}</span>}
      </span>
      <span className="admin-mobile-label">{tab.title}</span>
    </Link>
  );
}

const adminMobileNavStyles = `
.admin-mobile-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: max(7px, env(safe-area-inset-bottom));
  z-index: 42;
  display: none;
  justify-content: center;
  padding: 0 12px;
  pointer-events: none;
  transform: translate3d(0, 0, 0);
  transition: transform .38s cubic-bezier(.2,.9,.2,1), opacity .28s ease, filter .28s ease;
}

.admin-mobile-nav.is-hidden-for-chat {
  transform: translate3d(0, calc(100% + 28px), 0);
  opacity: 0;
  filter: blur(3px);
}

.admin-mobile-dock {
  width: min(100%, 390px);
  pointer-events: auto;
  border: 0;
  border-radius: 22px;
  padding: 7px 8px 6px;
  background:
    linear-gradient(145deg, rgba(8, 9, 9, .98), rgba(4, 5, 5, .96));
  box-shadow:
    8px 10px 22px rgba(0,0,0,.48),
    -4px -4px 12px rgba(255,255,255,.016),
    inset 1px 1px 0 rgba(255,255,255,.014);
  backdrop-filter: blur(18px);
}

.admin-mobile-track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 5px;
}

.admin-mobile-key {
  min-width: 0;
  border: 0;
  text-decoration: none;
  color: var(--j2-text);
  background: transparent;
  display: grid;
  justify-items: center;
  gap: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.admin-mobile-key-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 39px;
  height: 36px;
  border-radius: 13px;
  color: var(--j2-muted);
  background: linear-gradient(145deg, rgba(11,12,12,.98), rgba(5,6,6,.96));
  box-shadow:
    5px 6px 12px rgba(0,0,0,.38),
    -2px -2px 8px rgba(255,255,255,.014),
    inset 1px 1px 0 rgba(255,255,255,.014);
  transition: transform .2s ease, box-shadow .2s ease, color .2s ease, background .2s ease;
}

.admin-mobile-key:active .admin-mobile-key-icon {
  transform: translateY(1px) scale(.98);
  box-shadow: inset 3px 3px 8px rgba(0,0,0,.36), inset -2px -2px 6px rgba(255,255,255,.016);
}

.admin-mobile-key.active .admin-mobile-key-icon {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow:
    inset 1px 1px 4px rgba(255,255,255,.08),
    inset -3px -4px 10px rgba(0,0,0,.34),
    4px 5px 10px rgba(0,0,0,.38);
}

.admin-mobile-label {
  max-width: 100%;
  color: var(--j2-muted);
  font-size: 8.5px;
  line-height: 1;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-mobile-key.active .admin-mobile-label {
  color: var(--j2-accent);
}

.admin-mobile-badge {
  position: absolute;
  top: -5px;
  right: -6px;
  display: grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--j2-accent);
  color: #fff;
  font-size: 8px;
  font-weight: 950;
  box-shadow: 0 4px 10px rgba(0,0,0,.45);
}

@media (max-width: 1023px) {
  .admin-mobile-nav {
    display: flex;
  }
}

@media (max-width: 360px) {
  .admin-mobile-track {
    gap: 4px;
  }

  .admin-mobile-key-icon {
    width: 36px;
    height: 34px;
    border-radius: 12px;
  }
}
`;
