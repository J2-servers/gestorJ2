import React from 'react';
import { remoteClient } from '@/api/remoteClient';
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Server as ServerIcon, ExternalLink, DollarSign, User } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ServerList({ servers, onEdit, onDelete, loading, currentUser }) {
  const { toast } = useToast();
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'dev';

  const handleDelete = async (serverId) => {
    const server = servers.find(s => s.id === serverId);
    // Seguranca: so o dono ou admin pode deletar
    if (currentUser?.id !== server?.owner_id && !isStaff) {
      toast({
        title: "Acao bloqueada",
        description: "Voce nao tem permissao para deletar este servidor.",
        variant: "destructive",
      });
      return;
    }
    try {
      await remoteClient.servers.remove(serverId);
      toast({ title: "Servidor excluido", description: "O cadastro foi removido com sucesso." });
      onDelete();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error?.message || "Nao foi possivel remover este servidor.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse" style={{ height:"160px" }}>
            <div className="h-full rounded-lg" style={{ background:"var(--color-bg-tertiary)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!servers.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-xl"
           style={{ background:"var(--color-bg-secondary)", border:"1px solid var(--color-border-subtle)" }}>
        <div className="icon-box icon-box-lg mb-4" style={{ background:"var(--color-bg-tertiary)", borderColor:"var(--color-border-default)" }}>
          <ServerIcon className="w-6 h-6" style={{ color:"var(--color-text-disabled)" }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color:"var(--color-text-primary)" }}>Nenhum servidor</p>
        <p className="text-xs" style={{ color:"var(--color-text-muted)" }}>Adicione seus primeiros servidores para criar pedidos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {servers.map(server => (
        <div key={server.id} className="card group"
             onMouseEnter={e => e.currentTarget.style.borderColor="var(--color-primary-border)"}
             onMouseLeave={e => e.currentTarget.style.borderColor="var(--color-border-default)"}>
          <div className="flex items-start gap-3 mb-3">
            <div className="icon-box flex-shrink-0">
              <ServerIcon className="w-4 h-4" style={{ color:"var(--color-primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate" style={{ color:"var(--color-text-primary)" }}>{server.name}</h3>
              <p className="text-xs truncate mt-0.5" style={{ color:"var(--color-text-muted)" }}>{server.panel_link}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg" style={{ background:"var(--color-primary-light)", border:"1px solid var(--color-primary-border)" }}>
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-2.5 h-2.5" style={{ color:"var(--color-primary)" }} />
                <span className="text-[10px] font-semibold" style={{ color:"var(--color-primary)" }}>Valor/Crédito</span>
              </div>
              <p className="text-sm font-bold" style={{ color:"var(--color-primary)" }}>
                R$ {server.value_per_credit?.toFixed(2)}
              </p>
            </div>
            <div className="p-2 rounded-lg" style={{ background:"var(--color-bg-tertiary)", border:"1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-2.5 h-2.5" style={{ color:"var(--color-text-muted)" }} />
                <span className="text-[10px] font-semibold" style={{ color:"var(--color-text-muted)" }}>Username</span>
              </div>
              <p className="text-xs font-bold truncate" style={{ color:"var(--color-text-primary)" }}>{server.username}</p>
            </div>
          </div>

          {(currentUser?.id === server.owner_id || isStaff) && (
            <div className="flex gap-1.5" style={{ borderTop:"1px solid var(--color-border-subtle)", paddingTop:"0.75rem" }}>
              <a href={server.panel_link} target="_blank" rel="noopener noreferrer"
                 className="btn btn-outline btn-sm gap-1 flex-1"
                 style={{ color:"var(--color-secondary)", borderColor:"transparent" }}>
                <ExternalLink className="w-3 h-3" /> Painel
              </a>
              {(currentUser?.id === server.owner_id || isStaff) && (
                <>
                  <button onClick={() => onEdit(server)} className="btn btn-outline btn-sm gap-1">
                    <Edit className="w-3 h-3" /> Editar
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="btn btn-danger btn-sm gap-1"><Trash2 className="w-3 h-3" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent style={{ background:"var(--color-bg-secondary)", border:"1px solid var(--color-border-default)" }}>
                      <AlertDialogHeader>
                        <AlertDialogTitle style={{ color:"var(--color-text-primary)" }}>Excluir servidor?</AlertDialogTitle>
                        <AlertDialogDescription style={{ color:"var(--color-text-muted)" }}>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="btn btn-outline">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(server.id)} className="btn btn-danger">Sim, excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
