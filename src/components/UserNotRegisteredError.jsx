import React from "react";
import { AlertTriangle, LogOut } from "lucide-react";

export default function UserNotRegisteredError() {
  return (
    <div className="access-page">
      <section className="access-panel">
        <div className="access-mark">
          <AlertTriangle size={32} />
        </div>
        <span>Acesso restrito</span>
        <h1>Conta nao cadastrada</h1>
        <p>Seu login foi autenticado, mas ainda nao existe liberacao para usar o Gestor J2.</p>
        <div className="access-note">
          Verifique se entrou com o e-mail correto ou solicite a ativacao ao administrador operacional.
        </div>
        <button className="access-button" onClick={() => window.location.assign("/Login")} type="button">
          <LogOut size={17} />
          Voltar ao login
        </button>
      </section>
      <style>{accessStyles}</style>
    </div>
  );
}

const accessStyles = `
.access-page {
  width: 100%;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
}

.access-panel {
  width: min(430px, 100%);
  border: 0;
  border-radius: 30px;
  padding: clamp(22px, 5vw, 34px);
  text-align: center;
  background: rgba(6, 7, 7, .96);
  box-shadow: var(--j2-neu);
}

.access-mark {
  width: 76px;
  height: 76px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 25px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: 8px 9px 20px rgba(0, 0, 0, .38), -2px -2px 8px rgba(255, 255, 255, .014);
}

.access-panel span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.access-panel h1 {
  margin: 7px 0 10px;
  color: var(--j2-text);
  font-size: clamp(31px, 8vw, 44px);
  line-height: .95;
  font-weight: 950;
}

.access-panel p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
  line-height: 1.55;
}

.access-note {
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

.access-button {
  width: 100%;
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
