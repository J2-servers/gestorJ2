import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { remoteClient } from '@/api/remoteClient';
import { subMonths, startOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

export default function MonthlyChart({ userRole }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
        const currentUser = await remoteClient.auth.me();

        let requests = [];

        if (currentUser.role === 'admin' || currentUser.role === 'dev') {
          const result = await remoteClient.creditRequests.list(null, 2000);
          const all = result?.data || [];
          requests = all.filter(r => r.status === 'recharged');
        } else if (currentUser.role === 'user') {
          const result = await remoteClient.creditRequests.list(null, 500);
          requests = (result?.data || []).filter(r => r.status === 'recharged');
        }

        const monthlyData = {};
        for (let i = 0; i < 6; i++) {
          const month = format(subMonths(new Date(), i), 'MMM/yy', { locale: ptBR });
          monthlyData[month] = { creditos: 0, valor: 0 };
        }

        requests.forEach(req => {
          const requestDate = new Date(req.created_date);
          if (!isNaN(requestDate.getTime()) && requestDate >= sixMonthsAgo) {
            const month = format(requestDate, 'MMM/yy', { locale: ptBR });
            if (monthlyData[month]) {
              monthlyData[month].creditos += req.requested_credits || 0;
              monthlyData[month].valor += req.total_value || 0;
            }
          }
        });

        const chartData = Object.keys(monthlyData)
          .map(month => ({ name: month, ...monthlyData[month] }))
          .reverse();

        setData(chartData);
      } catch (error) {
        console.error("Erro ao carregar gráfico mensal:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChartData();
  }, [userRole]);

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="icon-box">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Créditos por Mês</h3>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Últimos 6 meses de atividade</p>
        </div>
      </div>

      <div className="h-52 lg:h-64">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="spinner" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(167,139,250,0.06)' }}
                contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Bar dataKey="creditos" fill="url(#dsGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="dsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.7} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
