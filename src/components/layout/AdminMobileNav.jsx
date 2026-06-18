import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, BarChart3, CreditCard, MessageCircle, Menu } from "lucide-react";

/**
 * Bottom navbar EXCLUSIVA do admin (mobile/Android).
 * Mostra os 4 destinos mais usados + botão "Mais" que abre o menu completo
 * (drawer do Layout), garantindo acesso a TODAS as páginas no celular.
 */
const ADMIN_TABS = [
  { title: "Início",    url: createPageUrl("Dashboard"),      icon: Home },
  { title: "Analytics", url: createPageUrl("Analytics"),      icon: BarChart3 },
  { title: "Pedidos",   url: createPageUrl("CreditRequests"), icon: CreditCard },
  { title: "Chat",      url: createPageUrl("Chat"),           icon: MessageCircle },
];

export default function AdminMobileNav({ currentPath, onOpenMenu, unreadCount = 0 }) {
  const path = (currentPath || "").toLowerCase();
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="mx-2 mb-2 rounded-2xl bg-black/95 border-0" style={{ boxShadow: "var(--j2-neu)" }}>
        <nav className="flex items-center justify-around px-2 h-[68px]">
          {ADMIN_TABS.map((tab) => (
            <NavItem
              key={tab.url}
              to={tab.url}
              icon={tab.icon}
              label={tab.title}
              isActive={path === tab.url}
              badge={tab.title === "Chat" ? unreadCount : 0}
            />
          ))}

          {/* Botão "Mais" — abre o menu completo (drawer) */}
          <button
            onClick={onOpenMenu}
            className="flex flex-col items-center justify-center min-w-[58px] group active:scale-95 transition-transform"
            aria-label="Abrir menu completo"
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 group-active:bg-white/10 transition-all">
              <Menu className="w-5 h-5 text-gray-400" strokeWidth={2} />
            </div>
            <span className="text-[10px] font-semibold mt-1.5 text-gray-500">Mais</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, isActive, badge = 0 }) {
  return (
    <Link to={to} className="relative flex flex-col items-center justify-center min-w-[58px] group active:scale-95 transition-transform">
      <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
        isActive ? "bg-gradient-to-br from-orange-500 to-orange-800" : "bg-white/5 group-active:bg-white/10"
      }`}>
        <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} strokeWidth={2} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[8px] font-black flex items-center justify-center border-2 border-black">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] font-semibold mt-1.5 ${isActive ? "text-orange-400" : "text-gray-500"}`}>
        {label}
      </span>
    </Link>
  );
}
