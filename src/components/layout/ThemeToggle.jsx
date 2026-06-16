import React from 'react';
import { Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// O sistema usa tema escuro fixo. Este botão não altera o tema.
export default function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      title="Tema escuro ativo"
      className="opacity-50 cursor-default"
      style={{ pointerEvents: 'none' }}
    >
      <Moon className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
    </Button>
  );
}