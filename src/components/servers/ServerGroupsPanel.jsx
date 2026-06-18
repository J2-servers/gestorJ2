import React, { useState, useEffect } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Folder, Eye, Edit, Trash2, Plus } from "lucide-react";

export default function ServerGroupsPanel({ servers, user }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [servers]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const allGroups = [];

      const enriched = allGroups.map(g => {
        const groupServers = servers.filter(s => (g.server_ids || []).includes(s.id));
        return {
          ...g,
          serverCount: groupServers.length,
          totalValue: groupServers.reduce((sum, s) => sum + (Number(s.value_per_credit || 0) * 100), 0) / 100,
          servers: groupServers
        };
      });

      setGroups(enriched.sort((a, b) => b.serverCount - a.serverCount));
    } catch (e) {
      console.error("Erro ao carregar grupos:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!groups.length) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>
        <Folder style={{ width: 20, height: 20, margin: "0 auto 8px", opacity: 0.3 }} />
        Nenhum grupo criado. Peça ao agente IA para agrupar seus servidores!
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
      {groups.map(group => (
        <div
          key={group.id}
          style={{
            background: `${group.color || "#d93810"}15`,
            border: `1px solid ${group.color || "#d93810"}33`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setExpanded(expanded === group.id ? null : group.id)}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              color: group.color || "#d93810",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <Folder style={{ width: 14, height: 14, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {group.name}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#64748b", opacity: 0.8 }}>
                  {group.serverCount} servidor{group.serverCount !== 1 ? "es" : ""}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, background: `${group.color || "#d93810"}44`, padding: "2px 8px", borderRadius: 4 }}>
              R$ {group.totalValue?.toFixed(2)}
            </span>
          </button>

          {expanded === group.id && (
            <div style={{ padding: "8px 12px", borderTop: `1px solid ${group.color || "#d93810"}22`, background: "#0a0a0a" }}>
              {group.servers.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.servers.map(srv => (
                    <div
                      key={srv.id}
                      style={{
                        padding: "6px 8px",
                        background: "#1a1a1a",
                        borderRadius: 6,
                        fontSize: 10,
                        color: "#94a3b8",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{srv.name}</span>
                      <span style={{ color: "#64748b" }}>R$ {Number(srv.value_per_credit || 0).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 10, color: "#334155" }}>Grupo vazio</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}