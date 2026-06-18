import React from 'react';
import { remoteClient } from '@/api/remoteClient';
import { Edit, Trash2, User as UserIcon, FileText, Phone, Mail, CreditCard } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const paymentBadge = {
  prepaid:  { bg:"rgba(52,211,153,0.10)",  color:"var(--color-success)", border:"transparent",  label:"Pré-Pago"  },
  postpaid: { bg:"rgba(255,75,18,0.10)", color:"var(--color-primary)", border:"var(--color-primary-border)", label:"Pós-Pago" },
};

export default function UserList({ users, onEdit, onDelete, onGenerateInvoice, loading }) {
  const handleDelete = async (userId) => {
    await remoteClient.users.remove(userId);
    onDelete();
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

  if (!users.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-xl"
           style={{ background:"var(--color-bg-secondary)", border:"1px solid var(--color-border-subtle)" }}>
        <div className="icon-box icon-box-lg mb-4" style={{ background:"var(--color-bg-tertiary)", borderColor:"var(--color-border-default)" }}>
          <UserIcon className="w-6 h-6" style={{ color:"var(--color-text-disabled)" }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color:"var(--color-text-primary)" }}>Nenhum revendedor</p>
        <p className="text-xs" style={{ color:"var(--color-text-muted)" }}>Convide revendedores usando o link de cadastro</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {users.map(user => {
        const pmt = paymentBadge[user.payment_type] || paymentBadge.prepaid;
        return (
          <div key={user.id} className="card group"
               onMouseEnter={e => e.currentTarget.style.borderColor="var(--color-primary-border)"}
               onMouseLeave={e => e.currentTarget.style.borderColor="var(--color-border-default)"}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                     style={{ background:"var(--color-primary-light)", border:"1px solid var(--color-primary-border)", color:"var(--color-primary)" }}>
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color:"var(--color-text-primary)" }}>
                    {user.name || "Sem nome"}
                  </h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 flex-shrink-0" style={{ color:"var(--color-text-disabled)" }} />
                    <p className="text-xs truncate" style={{ color:"var(--color-text-muted)" }}>{user.email}</p>
                  </div>
                </div>
              </div>
              <span className="badge flex-shrink-0" style={{ background:pmt.bg, color:pmt.color, borderColor:pmt.border }}>
                {pmt.label}
              </span>
            </div>

            <div className="space-y-1.5 mb-3 p-2.5 rounded-lg"
                 style={{ background:"var(--color-bg-tertiary)", border:"1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5" style={{ color:"var(--color-text-muted)" }}>
                  <Phone className="w-3 h-3" /> WhatsApp
                </div>
                <span style={{ color: user.phone ? "var(--color-success)" : "var(--color-error)" }}>
                  {user.phone || "Não cadastrado"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5" style={{ color:"var(--color-text-muted)" }}>
                  <CreditCard className="w-3 h-3" /> Tipo
                </div>
                <span style={{ color:pmt.color }}>{pmt.label}</span>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap" style={{ borderTop:"1px solid var(--color-border-subtle)", paddingTop:"0.75rem" }}>
              {user.payment_type === 'postpaid' && onGenerateInvoice && (
                <button onClick={() => onGenerateInvoice(user)} className="btn btn-outline btn-sm gap-1 flex-1"
                        style={{ color:"var(--color-primary)", borderColor:"var(--color-primary-border)" }}>
                  <FileText className="w-3 h-3" /> Fatura
                </button>
              )}
              <button onClick={() => onEdit(user)} className="btn btn-outline btn-sm gap-1 flex-1">
                <Edit className="w-3 h-3" /> Editar
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="btn btn-danger btn-sm gap-1"><Trash2 className="w-3 h-3" /></button>
                </AlertDialogTrigger>
                <AlertDialogContent style={{ background:"var(--color-bg-secondary)", border:"1px solid var(--color-border-default)" }}>
                  <AlertDialogHeader>
                    <AlertDialogTitle style={{ color:"var(--color-text-primary)" }}>Excluir revendedor?</AlertDialogTitle>
                    <AlertDialogDescription style={{ color:"var(--color-text-muted)" }}>
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="btn btn-outline">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(user.id)} className="btn btn-danger">Sim, excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}