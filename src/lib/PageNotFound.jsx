import { Home, SearchX } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { remoteClient } from "@/api/remoteClient";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1) || "inicio";

  const { data: authData, isFetched } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const user = await remoteClient.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  const isAdmin =
    isFetched &&
    authData?.isAuthenticated &&
    (authData.user?.role === "admin" || authData.user?.role === "dev");

  return (
    <div className="notfound-page">
      <section className="notfound-panel">
        <div className="notfound-mark">
          <SearchX size={34} />
        </div>
        <span>404</span>
        <h1>Pagina nao encontrada</h1>
        <p>A rota "{pageName}" nao existe neste modulo do Gestor J2.</p>
        {isAdmin && (
          <div className="notfound-note">
            Como administrador, confira se a pagina foi registrada em `pages.config.js` ou se o link do menu esta correto.
          </div>
        )}
        <button className="notfound-button" onClick={() => window.location.assign("/")} type="button">
          <Home size={17} />
          Voltar para dashboard
        </button>
      </section>
      <style>{notFoundStyles}</style>
    </div>
  );
}

const notFoundStyles = `
.notfound-page {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
}

.notfound-panel {
  width: min(440px, 100%);
  border: 0;
  border-radius: 30px;
  padding: clamp(22px, 5vw, 34px);
  text-align: center;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.notfound-mark {
  width: 78px;
  height: 78px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 25px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 8px 9px 20px rgba(0, 0, 0, .38), -2px -2px 8px rgba(255, 255, 255, .014);
}

.notfound-panel span {
  display: block;
  color: var(--j2-accent);
  font-size: 12px;
  font-weight: 950;
  text-transform: uppercase;
}

.notfound-panel h1 {
  margin: 7px 0 10px;
  color: var(--j2-text);
  font-size: clamp(31px, 8vw, 44px);
  line-height: .95;
  font-weight: 950;
}

.notfound-panel p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.55;
}

.notfound-note {
  margin: 18px 0;
  border: 0;
  border-radius: 17px;
  padding: 13px;
  color: var(--j2-muted);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
  font-size: 12px;
  line-height: 1.5;
}

.notfound-button {
  width: 100%;
  margin-top: 20px;
  border: 0;
  min-height: 50px;
  border-radius: 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 5px 6px 14px rgba(0, 0, 0, .32), -2px -2px 8px rgba(255, 255, 255, .014);
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
}
`;
