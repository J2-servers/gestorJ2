import React, { useState, useEffect } from "react";
import { remoteClient } from "@/api/remoteClient";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";

export default function PriceHistoryChart({ serverId }) {
  const [history, setHistory] = useState([]);
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [h, allServers] = await Promise.all([
          Promise.resolve([]),
          remoteClient.servers.list().catch(() => []),
        ]);
        const s = (allServers || []).find(x => x.id === serverId) || null;
        
        const formatted = h.reverse().map((item, i) => ({
          date: new Date(item.created_date).toLocaleDateString("pt-BR").slice(0, 5),
          price: Number(item.new_price),
          timestamp: item.created_date,
        }));

        setHistory(formatted);
        setServer(s);
      } catch (e) {
        console.error("Erro ao carregar histórico:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [serverId]);

  if (loading) return <div style={{ fontSize: 11, color: "#64748b" }}>Carregando histórico...</div>;

  if (history.length === 0) {
    return <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", padding: 20 }}>Sem histórico de preço</div>;
  }

  const minPrice = Math.min(...history.map(h => h.price));
  const maxPrice = Math.max(...history.map(h => h.price));
  const change = ((history[history.length - 1]?.price - history[0]?.price) / history[0]?.price * 100).toFixed(1);

  return (
    <div style={{ background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Calendar style={{ width: 14, height: 14, color: "#d93810" }} />
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#f1f5f9" }}>Histórico de Preço</p>
          <p style={{ margin: 0, fontSize: 10, color: change > 0 ? "#f87171" : "#ff8a4a" }}>
            {change > 0 ? "▲" : "▼"} {Math.abs(change)}% {history.length} mudança(s)
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #2a2a3e", borderRadius: 6 }} />
          <Line type="monotone" dataKey="price" stroke="#d93810" strokeWidth={2} dot={{ fill: "#ff4b12", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <div style={{ background: "#0a0a0a", padding: "6px 8px", borderRadius: 6 }}>
          <p style={{ margin: 0, fontSize: 9, color: "#64748b", fontWeight: 700 }}>MIN</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#ff8a4a" }}>R$ {minPrice.toFixed(4)}</p>
        </div>
        <div style={{ background: "#0a0a0a", padding: "6px 8px", borderRadius: 6 }}>
          <p style={{ margin: 0, fontSize: 9, color: "#64748b", fontWeight: 700 }}>MAX</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#f87171" }}>R$ {maxPrice.toFixed(4)}</p>
        </div>
      </div>
    </div>
  );
}