import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function RequestFilters({ onFiltersChange }) {
  const [login, setLogin] = useState('');
  const isMounted = useRef(false);

  useEffect(() => {
    // Apenas aciona o filtro após a montagem inicial e quando o login mudar.
    if (isMounted.current) {
      const handler = setTimeout(() => {
          onFiltersChange({ login: login || undefined });
      }, 500);

      return () => {
          clearTimeout(handler);
      };
    } else {
      // Marca o componente como montado na primeira renderização.
      isMounted.current = true;
    }
  }, [login, onFiltersChange]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        placeholder="Buscar por login..."
        className="pl-10"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
      />
    </div>
  );
}