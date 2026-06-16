import React from 'react';
import { Key, Copy } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function PixKeysDisplay({ keys }) {
  const { toast } = useToast();

  if (!keys || keys.length === 0) return null;

  const handleCopy = (val) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Chave PIX copiada!" });
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <div className="icon-box icon-box-success"><Key className="w-4 h-4" style={{ color: "var(--color-success)" }} /></div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Chaves PIX para Pagamento</h3>
      </div>
      <div className="space-y-2">
        {keys.map((key, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg transition-base"
               style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border-subtle)" }}
               onMouseEnter={e => e.currentTarget.style.borderColor="rgba(52,211,153,0.25)"}
               onMouseLeave={e => e.currentTarget.style.borderColor="var(--color-border-subtle)"}>
            <Key className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-success)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{key.bank} — {key.type}</p>
              <p className="text-xs truncate font-mono" style={{ color: "var(--color-text-muted)" }}>{key.key_value}</p>
            </div>
            <button onClick={() => handleCopy(key.key_value)}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-base flex-shrink-0"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border-default)", color: "var(--color-text-muted)" }}
              onMouseEnter={e => e.currentTarget.style.color="var(--color-success)"}
              onMouseLeave={e => e.currentTarget.style.color="var(--color-text-muted)"}>
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}