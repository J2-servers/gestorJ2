import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { remoteClient } from "@/api/remoteClient";
import { createPageUrl } from "@/utils";

export default function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("theme")) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }

    const checkAuth = async () => {
      try {
        const currentUser = await remoteClient.auth.me();
        navigate(currentUser ? createPageUrl("Dashboard") : "/Login", { replace: true });
      } catch {
        navigate("/Login", { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="index-page">
      <section className="index-card">
        <div className="index-mark">
          <Loader2 className="index-spin" size={30} />
        </div>
        <strong>Gestor J2</strong>
        <span>Verificando sessao segura.</span>
      </section>
      <style>{indexStyles}</style>
    </div>
  );
}

const indexStyles = `
.index-page {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
}

.index-card {
  width: min(370px, 100%);
  min-height: 240px;
  border: 0;
  border-radius: 30px;
  display: grid;
  place-items: center;
  gap: 9px;
  text-align: center;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.index-mark {
  width: 70px;
  height: 70px;
  display: grid;
  place-items: center;
  border-radius: 23px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.index-card strong {
  color: var(--j2-text);
  font-size: 21px;
  font-weight: 950;
}

.index-card span {
  color: var(--j2-muted);
  font-size: 13px;
}

.index-spin {
  animation: indexSpin .8s linear infinite;
}

@keyframes indexSpin {
  to { transform: rotate(360deg); }
}
`;
