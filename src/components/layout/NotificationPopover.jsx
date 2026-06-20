import React from 'react';
import { Bell, CheckCheck, CreditCard, DollarSign, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_ICON = {
  approval:         { Icon: CreditCard,    color: '#ff8a4a' },
  rejection:        { Icon: CreditCard,    color: '#f87171' },
  payment:          { Icon: DollarSign,    color: '#fbbf24' },
  payment_reminder: { Icon: DollarSign,    color: '#fb923c' },
  message:          { Icon: MessageSquare, color: '#ff7540' },
  system:           { Icon: Settings,      color: '#ff4b12' },
};

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export default function NotificationPopover({ notifications = [], onMarkRead, onMarkAllRead }) {
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleClick = (notif) => {
    if (!notif.isRead && onMarkRead) onMarkRead(notif.id);
  };

  return (
    <div className="p-2 text-[var(--j2-text)]">
      <div className="flex justify-between items-center mb-2 px-2">
        <h4 className="font-semibold text-[var(--j2-text)]">Notificações</h4>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            className="text-xs text-[var(--j2-accent)] hover:text-[var(--j2-accent-deep)]"
          >
            <CheckCheck className="w-3 h-3 mr-1" /> Marcar todas
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const typeKey = notif.type || 'system';
            const { Icon, color } = TYPE_ICON[typeKey] ?? TYPE_ICON.system;
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`p-2 rounded-xl flex gap-2 cursor-pointer transition-colors ${
                  !notif.isRead
                    ? 'bg-[var(--j2-accent-soft)] hover:brightness-105'
                    : 'hover:bg-[var(--j2-surface-2)]'
                }`}
              >
                <div
                  className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: `${color}20` }}
                >
                  <Icon style={{ width: 12, height: 12, color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--j2-text)] leading-snug">{notif.message}</p>
                  <p className="text-xs text-[var(--j2-muted)] mt-0.5">
                    {relativeTime(notif.createdAt)}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-[var(--j2-accent)]" />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-[var(--j2-faint)] mx-auto mb-2" />
            <p className="text-sm text-[var(--j2-muted)]">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  );
}
