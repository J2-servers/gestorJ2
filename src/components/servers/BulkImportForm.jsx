import React, { useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Upload, X, Check, AlertCircle } from "lucide-react";

const splitLine = (line, separator) => {
  const values = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === separator && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseServerFile = async (file) => {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const separator = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], separator).map((header) => header.toLowerCase().trim());

  return lines.slice(1).map((line) => {
    const values = splitLine(line, separator);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    return {
      name: row.name || row.nome || row.servidor,
      panel_link: row.panel_link || row.link || row.url || row.painel,
      value_per_credit: Number(String(row.value_per_credit || row.valor || row.preco || row.price || "0").replace(",", ".")),
    };
  }).filter((server) => server.name && Number.isFinite(server.value_per_credit));
};

export default function BulkImportForm({ user, onSuccess, onCancel }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const serversToCreate = (await parseServerFile(file)).map((s) => ({
        ...s,
        owner_id: user.id,
        value_per_credit: Number(s.value_per_credit || 0),
      }));

      if (serversToCreate.length === 0) {
        setResult({ error: "Nenhum servidor encontrado no arquivo" });
        setLoading(false);
        return;
      }

      // Criar servidores individualmente
      await Promise.all(serversToCreate.map(s => remoteClient.servers.create(s)));

      setResult({ success: `✅ ${serversToCreate.length} servidor(es) importado(s)!` });
      setTimeout(() => onSuccess?.(), 1500);
    } catch (e) {
      setResult({ error: `❌ Erro: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#141414", border: "1px solid #2a2a3e", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>📥 Importar Servidores em Bulk</h3>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#94a3b8" }}>
        Envie um CSV/TSV com colunas: <code style={{ background: "#0a0a0a", padding: "2px 6px", borderRadius: 4, color: "#a78bfa" }}>name, panel_link, value_per_credit</code>
      </p>

      <div
        style={{
          border: "2px dashed #2a2a3e",
          borderRadius: 10,
          padding: 20,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          background: file ? "#1a1a2e" : "transparent",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "#a78bfa";
          e.currentTarget.style.background = "#0f0a1a";
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = "#2a2a3e";
          e.currentTarget.style.background = "transparent";
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "#2a2a3e";
          e.currentTarget.style.background = "transparent";
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
      >
        <label style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Upload style={{ width: 20, height: 20, color: "#a78bfa" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{file ? file.name : "Clique ou arraste arquivo"}</span>
          <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileChange} style={{ display: "none" }} />
        </label>
      </div>

      {result && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 8,
            fontSize: 12,
            color: result.success ? "#10b981" : "#f87171",
            background: result.success ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)",
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          {result.success ? <Check style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} /> : <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />}
          <span>{result.success || result.error}</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            background: "transparent",
            border: "1px solid #2a2a3e",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleImport}
          disabled={!file || loading}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            background: "#a78bfa",
            border: "none",
            color: "#0a0a0a",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 700,
            opacity: !file || loading ? 0.5 : 1,
          }}
        >
          {loading ? "Importando..." : "Importar"}
        </button>
      </div>
    </div>
  );
}
