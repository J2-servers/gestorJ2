import React from 'react';
import { Trophy, TrendingUp, DollarSign, CreditCard, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import GlassCard from './GlassCard';

const medalColors = {
  0: 'from-yellow-400 to-yellow-600',
  1: 'from-gray-300 to-gray-500',
  2: 'from-orange-400 to-orange-600'
};

export default function TopResellersList({ topResellers, onViewHistory }) {
  return (
    <GlassCard className="p-4 lg:p-6" neonColor="orange">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center border-2 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.6)]">
            <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <h3 className="text-base lg:text-xl font-bold text-gray-800 dark:text-white">
              Top 10 Revendedores 🏆
            </h3>
            <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
              Maiores compradores
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 lg:space-y-3">
        {topResellers.map((reseller, index) => (
          <div
            key={reseller.id}
            className="group relative backdrop-blur-lg bg-white/5 rounded-xl lg:rounded-2xl p-3 lg:p-4 border-2 border-white/10 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(251,146,60,0.4)] transition-all duration-300"
          >
            {/* Ranking badge */}
            <div className="absolute -top-1 -left-1 lg:-top-2 lg:-left-2 z-10">
              {index < 3 ? (
                <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br ${medalColors[index]} flex items-center justify-center shadow-lg border-2 border-white/30`}>
                  <span className="text-white font-bold text-xs lg:text-sm">{index + 1}</span>
                </div>
              ) : (
                <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg border-2 border-white/30">
                  <span className="text-white font-bold text-xs lg:text-sm">{index + 1}</span>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between pl-5 lg:pl-6">
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="font-semibold text-sm lg:text-base text-gray-800 dark:text-white truncate">
                  {reseller.name || reseller.email}
                </h4>
                <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate">
                  {reseller.email}
                </p>
                
                <div className="flex flex-wrap items-center gap-1 lg:gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px] lg:text-xs py-0.5 border-orange-400/30">
                    <CreditCard className="w-2.5 h-2.5 lg:w-3 lg:h-3 mr-0.5 lg:mr-1" />
                    {(reseller.totalCredits / 1000).toFixed(0)}k
                  </Badge>
                  
                  <Badge variant="outline" className="text-[10px] lg:text-xs text-green-600 dark:text-green-400 py-0.5 border-green-400/30">
                    <DollarSign className="w-2.5 h-2.5 lg:w-3 lg:h-3 mr-0.5 lg:mr-1" />
                    {(reseller.totalValue / 1000).toFixed(0)}k
                  </Badge>
                  
                  <Badge variant="outline" className="text-[10px] lg:text-xs py-0.5 border-blue-400/30">
                    {reseller.requestCount} pedidos
                  </Badge>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewHistory(reseller)}
                className="ml-2 backdrop-blur-sm bg-white/10 hover:bg-orange-500/20 border-2 border-orange-400/30 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(251,146,60,0.4)] h-8 px-2 lg:h-auto lg:px-3 transition-all"
              >
                <History className="w-3.5 h-3.5 lg:w-4 lg:h-4 lg:mr-2" />
                <span className="hidden lg:inline">Histórico</span>
              </Button>
            </div>

            {/* Progress bar */}
            <div className="mt-2 lg:mt-3 h-1.5 lg:h-2 bg-gray-200/20 dark:bg-gray-800/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(251,146,60,0.6)]"
                style={{
                  width: `${(reseller.totalValue / topResellers[0].totalValue) * 100}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}