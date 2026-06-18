import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X } from "lucide-react";
import NewRequestForm from "../requests/NewRequestForm";
import { toast } from "@/components/ui/use-toast";
import { remoteClient } from "@/api/remoteClient";

export default function ResellerMobileNav({ navigationItems, currentPath, user }) {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [allServers, setAllServers] = useState([]);
  const [loadingServers, setLoadingServers] = useState(false);

  const handleNewRequestClick = async () => {
    if (!user.phone) {
      toast({
        title: "WhatsApp Necessário",
        description: "Cadastre seu WhatsApp antes de criar pedidos.",
        variant: "destructive",
        duration: 2000
      });
      return;
    }

    setLoadingServers(true);
    try {
      const myRegs = await remoteClient.resellerServers.list();
      const merged = (myRegs || []).map(rs => ({
        id: rs.server?.id ?? rs.server_id,
        name: rs.server?.name ?? '',
        panel_link: rs.server?.panel_link ?? rs.server?.panelLink ?? '',
        value_per_credit: rs.value_per_credit,
        username: rs.login,
      })).filter(s => s.value_per_credit > 0);
      setAllServers(merged);
      setShowNewRequest(true);
    } catch (error) {
      console.error("Erro ao carregar servidores:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os servidores.",
        variant: "destructive",
        duration: 2000
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
      {/* Modal do Formulário */}
      <AnimatePresence>
        {showNewRequest && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden"
              onClick={() => setShowNewRequest(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#0a0a0a] to-[#030303] rounded-t-3xl lg:hidden"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-br from-black/95 via-black/90 to-black/80 backdrop-blur-xl border-b border-transparent px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Novo Pedido</h2>
                      <p className="text-xs text-gray-400">Preencha os dados abaixo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNewRequest(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent flex items-center justify-center transition-all"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 pb-32">
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

      {/* Navbar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="mx-2 mb-2 rounded-2xl bg-black/95 border-0" style={{ boxShadow: 'var(--j2-neu)' }}>
          <nav className="flex items-center justify-around px-3 h-20">
            {/* Item 1 */}
            {navigationItems[0] && (() => {
              const Icon0 = navigationItems[0].icon;
              const isActive = currentPath === navigationItems[0].url;
              return (
                <NavItem
                  key={navigationItems[0].url}
                  to={navigationItems[0].url}
                  icon={Icon0}
                  label={navigationItems[0].title}
                  isActive={isActive}
                />
              );
            })()}

            {/* Item 2 */}
            {navigationItems[1] && (() => {
              const Icon1 = navigationItems[1].icon;
              const isActive = currentPath === navigationItems[1].url;
              return (
                <NavItem
                  key={navigationItems[1].url}
                  to={navigationItems[1].url}
                  icon={Icon1}
                  label={navigationItems[1].title}
                  isActive={isActive}
                />
              );
            })()}

            {/* Central FAB Button */}
            <button
              onClick={handleNewRequestClick}
              disabled={loadingServers}
              className="relative -mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-800 flex items-center justify-center active:scale-95 transition-transform" style={{ boxShadow: 'var(--j2-neu)' }}>
                {loadingServers ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
                )}
              </div>
            </button>

            {/* Item 3 */}
            {navigationItems[2] && (() => {
              const Icon2 = navigationItems[2].icon;
              const isActive = currentPath === navigationItems[2].url;
              return (
                <NavItem
                  key={navigationItems[2].url}
                  to={navigationItems[2].url}
                  icon={Icon2}
                  label={navigationItems[2].title}
                  isActive={isActive}
                />
              );
            })()}

            {/* Item 4 */}
            {navigationItems[3] && (() => {
              const Icon3 = navigationItems[3].icon;
              const isActive = currentPath === navigationItems[3].url;
              return (
                <NavItem
                  key={navigationItems[3].url}
                  to={navigationItems[3].url}
                  icon={Icon3}
                  label={navigationItems[3].title}
                  isActive={isActive}
                />
              );
            })()}
          </nav>
        </div>
      </div>
    </>
  );
}

function NavItem({ to, icon: Icon, label, isActive }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center min-w-[60px] group active:scale-95 transition-transform">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
        isActive 
          ? 'bg-gradient-to-br from-orange-500 to-orange-800' 
          : 'bg-white/5 group-active:bg-white/10'
      }`}>
        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} strokeWidth={2} />
      </div>
      
      <span className={`text-[10px] font-semibold mt-1.5 ${
        isActive ? 'text-orange-400' : 'text-gray-500'
      }`}>
        {label}
      </span>
    </Link>
  );
}
