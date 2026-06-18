import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Home, Loader2, MessageCircle, Plus, Server, X } from "lucide-react";
import NewRequestForm from "../requests/NewRequestForm";
import { toast } from "@/components/ui/use-toast";
import { remoteClient } from "@/api/remoteClient";

const titleKey = (value) => String(value || "").toLowerCase();

const findItem = (items, title, fallback) => {
  return items.find((item) => titleKey(item.title) === titleKey(title)) || fallback;
};

export default function ResellerMobileNav({ navigationItems, currentPath, user }) {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [allServers, setAllServers] = useState([]);
  const [loadingServers, setLoadingServers] = useState(false);

  const path = (currentPath || "").toLowerCase();
  const chatPath = createPageUrl("Chat").toLowerCase();
  const hiddenForChat = path === chatPath;

  const navTabs = useMemo(() => {
    const items = navigationItems || [];
    return [
      findItem(items, "Dashboard", { title: "Inicio", url: createPageUrl("Dashboard"), icon: Home }),
      findItem(items, "Pedidos", { title: "Pedidos", url: createPageUrl("CreditRequests"), icon: CreditCard }),
      findItem(items, "Chat", { title: "Chat", url: createPageUrl("Chat"), icon: MessageCircle }),
      findItem(items, "Servidores", { title: "Servidores", url: createPageUrl("Servers"), icon: Server }),
    ];
  }, [navigationItems]);

  const handleNewRequestClick = async () => {
    if (!user.phone) {
      toast({
        title: "WhatsApp necessario",
        description: "Cadastre seu WhatsApp antes de criar pedidos.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setLoadingServers(true);
    try {
      const myRegs = await remoteClient.resellerServers.list();
      const merged = (myRegs || [])
        .map((rs) => ({
          id: rs.server?.id ?? rs.server_id,
          name: rs.server?.name ?? "",
          panel_link: rs.server?.panel_link ?? rs.server?.panelLink ?? "",
          value_per_credit: rs.value_per_credit,
          username: rs.login,
        }))
        .filter((server) => server.value_per_credit > 0);
      setAllServers(merged);
      setShowNewRequest(true);
    } catch (error) {
      console.error("Erro ao carregar servidores:", error);
      toast({
        title: "Erro",
        description: "Nao foi possivel carregar os servidores.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setLoadingServers(false);
    }
  };

  const handleRequestCreated = () => {
    setShowNewRequest(false);
    window.location.reload();
  };

  return (
    <>
      <AnimatePresence>
        {showNewRequest && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="reseller-request-overlay"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setShowNewRequest(false)}
            />

            <motion.div
              animate={{ y: 0, opacity: 1 }}
              className="reseller-request-sheet"
              exit={{ y: "104%", opacity: .92 }}
              initial={{ y: "104%", opacity: .92 }}
              transition={{ type: "spring", damping: 31, stiffness: 310 }}
            >
              <div className="reseller-request-head">
                <div className="reseller-request-mark">
                  <Plus size={20} strokeWidth={2.6} />
                </div>
                <div>
                  <h2>Novo pedido</h2>
                  <p>Escolha servidor, creditos e comprovante.</p>
                </div>
                <button onClick={() => setShowNewRequest(false)} type="button" aria-label="Fechar pedido">
                  <X size={19} />
                </button>
              </div>

              <div className="reseller-request-body">
                <NewRequestForm
                  request={null}
                  servers={allServers}
                  user={user}
                  onSuccess={handleRequestCreated}
                  onCancel={() => setShowNewRequest(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className={`reseller-mobile-nav ${hiddenForChat ? "is-hidden-for-chat" : ""}`} aria-hidden={hiddenForChat}>
        <nav className="reseller-mobile-dock" aria-label="Navegacao revendedor mobile">
          <div className="reseller-mobile-track">
            {navTabs.slice(0, 2).map((tab) => (
              <NavKey key={tab.url} tab={tab} active={path === tab.url.toLowerCase()} />
            ))}

            <button
              className="reseller-mobile-action"
              disabled={loadingServers}
              onClick={handleNewRequestClick}
              type="button"
              aria-label="Criar novo pedido"
            >
              <span className="reseller-mobile-action-icon">
                {loadingServers ? <Loader2 className="reseller-mobile-spin" size={19} /> : <Plus size={22} strokeWidth={2.7} />}
              </span>
              <span>Novo</span>
            </button>

            {navTabs.slice(2).map((tab) => (
              <NavKey key={tab.url} tab={tab} active={path === tab.url.toLowerCase()} />
            ))}
          </div>
        </nav>
      </div>

      <style>{resellerMobileNavStyles}</style>
    </>
  );
}

function NavKey({ tab, active }) {
  const Icon = tab.icon;
  return (
    <Link className={`reseller-mobile-key ${active ? "active" : ""}`} to={tab.url} aria-label={tab.title}>
      <span className="reseller-mobile-key-icon">
        <Icon size={19} strokeWidth={2.45} />
      </span>
      <span className="reseller-mobile-label">{tab.title === "Dashboard" ? "Inicio" : tab.title}</span>
    </Link>
  );
}

const resellerMobileNavStyles = `
.reseller-mobile-nav {
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

.reseller-mobile-nav.is-hidden-for-chat {
  transform: translate3d(0, calc(100% + 28px), 0);
  opacity: 0;
  filter: blur(3px);
}

.reseller-mobile-dock {
  width: min(100%, 410px);
  pointer-events: auto;
  border: 0;
  border-radius: 22px;
  padding: 7px 8px 6px;
  background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(255,248,240,.96));
  box-shadow:
    7px 9px 18px rgba(86,65,47,.18),
    -5px -5px 14px rgba(255,255,255,.9),
    inset 1px 1px 0 rgba(255,255,255,.72);
  backdrop-filter: blur(18px);
}

.reseller-mobile-track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  gap: 5px;
}

.reseller-mobile-key,
.reseller-mobile-action {
  min-width: 0;
  border: 0;
  text-decoration: none;
  color: #101010;
  background: transparent;
  display: grid;
  justify-items: center;
  gap: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.reseller-mobile-key-icon,
.reseller-mobile-action-icon {
  display: grid;
  place-items: center;
  width: 39px;
  height: 36px;
  border-radius: 13px;
  color: #101010;
  background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(244,237,226,.96));
  box-shadow:
    4px 5px 10px rgba(86,65,47,.16),
    -3px -3px 9px rgba(255,255,255,.9),
    inset 1px 1px 0 rgba(255,255,255,.78);
  transition: transform .2s ease, box-shadow .2s ease, color .2s ease, background .2s ease;
}

.reseller-mobile-key:active .reseller-mobile-key-icon,
.reseller-mobile-action:active .reseller-mobile-action-icon {
  transform: translateY(1px) scale(.98);
  box-shadow: inset 3px 3px 8px rgba(99,79,58,.16), inset -3px -3px 8px rgba(255,255,255,.84);
}

.reseller-mobile-key.active .reseller-mobile-key-icon {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow:
    inset 1px 1px 4px rgba(255,255,255,.08),
    inset -3px -4px 10px rgba(0,0,0,.34),
    4px 5px 10px rgba(0,0,0,.38);
}

.reseller-mobile-action:disabled {
  opacity: .68;
  cursor: wait;
}

.reseller-mobile-action-icon {
  width: 43px;
  height: 39px;
  border-radius: 14px;
  color: #fff;
  background:
    linear-gradient(135deg, #ff4b12, #8f1608);
  box-shadow:
    5px 6px 12px rgba(0,0,0,.44),
    inset 1px 1px 4px rgba(255,255,255,.1),
    inset -4px -5px 12px rgba(0,0,0,.36);
}

.reseller-mobile-spin {
  animation: reseller-spin .8s linear infinite;
}

.reseller-mobile-label,
.reseller-mobile-action > span:last-child {
  max-width: 100%;
  color: #101010;
  font-size: 8.5px;
  line-height: 1;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reseller-mobile-key.active .reseller-mobile-label,
.reseller-mobile-action > span:last-child {
  color: var(--j2-accent);
}

.reseller-request-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: none;
  background: rgba(0,0,0,.82);
  backdrop-filter: blur(10px);
}

.reseller-request-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 101;
  display: none;
  max-height: 92dvh;
  overflow-y: auto;
  border: 0;
  border-radius: 30px 30px 0 0;
  background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(243,239,231,.99));
  box-shadow:
    0 -18px 44px rgba(86,65,47,.22),
    inset 1px 1px 0 rgba(255,255,255,.78);
}

.reseller-request-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 12px;
  padding: 16px 18px 12px;
  background: rgba(255,250,243,.94);
  backdrop-filter: blur(18px);
}

.reseller-request-head h2,
.reseller-request-head p {
  margin: 0;
}

.reseller-request-head h2 {
  color: var(--j2-text);
  font-size: 17px;
  font-weight: 950;
}

.reseller-request-head p {
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 750;
}

.reseller-request-mark,
.reseller-request-head button {
  display: grid;
  place-items: center;
  border: 0;
  color: var(--j2-accent);
  background: rgba(232,225,215,.78);
  box-shadow: inset 3px 3px 8px rgba(99,79,58,.16), inset -3px -3px 8px rgba(255,255,255,.84);
}

.reseller-request-mark {
  width: 46px;
  height: 46px;
  border-radius: 17px;
}

.reseller-request-head button {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  cursor: pointer;
}

.reseller-request-body {
  padding: 16px 14px calc(26px + env(safe-area-inset-bottom));
}

@keyframes reseller-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 1023px) {
  .reseller-mobile-nav,
  .reseller-request-overlay,
  .reseller-request-sheet {
    display: flex;
  }

  .reseller-request-sheet {
    display: block;
  }
}

@media (max-width: 360px) {
  .reseller-mobile-track {
    gap: 4px;
  }

  .reseller-mobile-key-icon {
    width: 35px;
    height: 34px;
    border-radius: 12px;
  }

  .reseller-mobile-action-icon {
    width: 39px;
    height: 36px;
    border-radius: 13px;
  }
}
`;
