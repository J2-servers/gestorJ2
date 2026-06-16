import React, { useState, useEffect } from "react";
import { remoteClient } from "@/api/remoteClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export default function DemandChart({ user }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDemand = async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      const result = await remoteClient.creditRequests.list(null, 500).catch(() => null);
      const requests = result?.data || [];
      const serverDemand = {};
      requests
        .filter(r => r.status === 'recharged')
        .forEach(req => {
          const srvName = req.server_snapshot?.name;
          if (srvName) {
            serverDemand[srvName] = (serverDemand[srvName] || 0) + 1;
          }
        });

      const formatted = Object.entries(serverDemand)
        .map(([name, demand]) => ({ name: name.slice(0, 12), demand }))
        .sort((a, b) => b.demand - a.demand)
        .slice(0, 8);

      setData(formatted);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemand();
  }, [user?.role]);

  if (user?.role !== 'admin' || data.length === 0) return null;

  return (
    <div style={{ background: "#141414", border: "1px solid #2a2a3e", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <TrendingUp style={{ width: 16, height: 16, color: "#10b981" }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Demanda por Servidor (Top 8)</h3>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
          <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #2a2a3e" }} />
          <Bar dataKey="demand" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
