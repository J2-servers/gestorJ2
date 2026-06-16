import React, { useMemo } from "react";
import { TrendingUp, DollarSign, AlertCircle } from "lucide-react";

export default function ServerAnalytics({ servers }) {
  const analytics = useMemo(() => {
    if (!servers.length) return { totalServers: 0, totalValue: 0, avgPrice: 0, mostExpensive: null, cheapest: null };

    const prices = servers.map((s) => Number(s.value_per_credit || 0));
    const totalValue = prices.reduce((a, b) => a + b, 0);
    const avgPrice = totalValue / servers.length;

    return {
      totalServers: servers.length,
      totalValue: totalValue.toFixed(4),
      avgPrice: avgPrice.toFixed(4),
      mostExpensive: servers.reduce((a, b) => (Number(b.value_per_credit || 0) > Number(a.value_per_credit || 0) ? b : a)),
      cheapest: servers.reduce((a, b) => (Number(b.value_per_credit || 0) < Number(a.value_per_credit || 0) ? b : a)),
    };
  }, [servers]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
      {[
        {
          icon: ServerIcon,
          label: "Total de Servidores",
          value: analytics.totalServers,
          color: "#8b5cf6",
        },
        {
          icon: DollarSign,
          label: "Valor Médio/Crédito",
          value: `R$ ${analytics.avgPrice}`,
          color: "#10b981",
        },
        {
          icon: TrendingUp,
          label: "Valor Total",
          value: `R$ ${analytics.totalValue}`,
          color: "#06b6d4",
        },
      ].map((item, i) => (
        <div
          key={i}
          style={{
            background: `${item.color}12`,
            border: `1px solid ${item.color}33`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: item.color, textTransform: "uppercase" }}>
            {item.label}
          </p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{item.value}</p>
        </div>
      ))}

      {analytics.mostExpensive && (
        <div style={{ background: "#f5970033", border: "1px solid #f5970055", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" }}>Mais Caro</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {analytics.mostExpensive.name}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>R$ {analytics.mostExpensive.value_per_credit}</p>
        </div>
      )}

      {analytics.cheapest && (
        <div style={{ background: "#10b98133", border: "1px solid #10b98155", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase" }}>Mais Barato</p>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {analytics.cheapest.name}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>R$ {analytics.cheapest.value_per_credit}</p>
        </div>
      )}
    </div>
  );
}

function ServerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="8" />
      <rect x="2" y="14" width="20" height="8" />
      <line x1="6" y1="7" x2="6" y2="7" />
      <line x1="6" y1="18" x2="6" y2="18" />
    </svg>
  );
}