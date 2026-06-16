import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Server, Zap } from "lucide-react";

export default function ServerItemForm({ 
  serverData, 
  serverInfo, 
  index, 
  onUpdate, 
  onRemove, 
  disabled,
  validationErrors 
}) {
  const handleChange = (field, value) => {
    onUpdate(index, { ...serverData, [field]: value });
  };

  const calculateTotal = () => {
    const credits = parseInt(serverData.credits) || 0;
    const valuePerCredit = serverInfo?.value_per_credit || 0;
    return credits * valuePerCredit;
  };

  const total = calculateTotal();

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Server className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{serverInfo?.name || 'Servidor'}</h3>
            <p className="text-xs text-gray-500">
              R$ {(serverInfo?.value_per_credit || 0).toFixed(2)}/crédito
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={disabled}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">
            Créditos *
          </label>
          <Input
            type="number"
            min="1"
            max="1000000"
            value={serverData.credits}
            onChange={(e) => handleChange('credits', e.target.value)}
            placeholder="Ex: 1000"
            disabled={disabled}
            className={`bg-white/5 border-white/10 text-white ${
              validationErrors?.[index]?.credits ? 'border-red-500' : ''
            }`}
          />
          {validationErrors?.[index]?.credits && (
            <p className="text-xs text-red-400">{validationErrors[index].credits}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">
            Login *
          </label>
          <Input
            value={serverData.login}
            onChange={(e) => handleChange('login', e.target.value)}
            placeholder="Login para recebimento"
            disabled={disabled}
            className={`bg-white/5 border-white/10 text-white ${
              validationErrors?.[index]?.login ? 'border-red-500' : ''
            }`}
          />
          {validationErrors?.[index]?.login && (
            <p className="text-xs text-red-400">{validationErrors[index].login}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400 flex items-center justify-between">
          <span>Observações</span>
          <span className="text-gray-600">{(serverData.notes || '').length}/200</span>
        </label>
        <Textarea
          value={serverData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Opcional..."
          rows="2"
          maxLength="200"
          disabled={disabled}
          className="bg-white/5 border-white/10 text-white text-sm"
        />
      </div>

      {/* Total */}
      {total > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-sm text-gray-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Total deste servidor
          </span>
          <span className="text-lg font-bold text-orange-400">
            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}