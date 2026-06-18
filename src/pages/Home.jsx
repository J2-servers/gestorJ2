import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl("Dashboard"), { replace: true });
  }, [navigate]);

  return (
    <div className="home-page">
      <section className="home-card">
        <Loader2 className="home-spin" size={28} />
        <strong>Carregando painel</strong>
        <span>Redirecionando para a dashboard.</span>
      </section>
      <style>{homeStyles}</style>
    </div>
  );
}

const homeStyles = `
.home-page {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
}

.home-card {
  width: min(360px, 100%);
  min-height: 220px;
  border: 0;
  border-radius: 28px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.home-card svg {
  color: var(--j2-accent);
}

.home-card strong {
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.home-card span {
  color: var(--j2-muted);
  font-size: 13px;
}

.home-spin {
  animation: homeSpin .8s linear infinite;
}

@keyframes homeSpin {
  to { transform: rotate(360deg); }
}
`;
