import React, { useEffect, useState } from "react";
import { remoteClient } from "@/api/remoteClient";
import { Bell, Building, Image, Key, Loader2, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import CompanyForm from "../components/settings/CompanyForm";
import IdentityForm from "../components/settings/IdentityForm";
import PixForm from "../components/settings/PixForm";
import IntegrationsForm from "../components/settings/IntegrationsForm";
import NotificationTest from "../components/settings/NotificationTest";

const tabs = [
  { value: "company", label: "Empresa", icon: Building },
  { value: "identity", label: "Visual", icon: Image },
  { value: "pix", label: "PIX", icon: Key },
  { value: "integrations", label: "WhatsApp", icon: MessageSquare },
  { value: "notifications", label: "Testes", icon: Bell },
];

const isStaff = (user) => user?.role === "admin" || user?.role === "dev";

function PageState({ denied }) {
  return (
    <div className="settings-page">
      <section className="settings-state">
        {denied ? <SettingsIcon size={30} /> : <Loader2 className="settings-spin" size={30} />}
        <strong>{denied ? "Acesso nao autorizado" : "Carregando configuracoes"}</strong>
        <p>{denied ? "Esta area e exclusiva para administradores." : "Buscando parametros globais da plataforma."}</p>
      </section>
      <style>{settingsStyles}</style>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("integrations");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const me = await remoteClient.auth.me();
      setCurrentUser(me);
      if (!isStaff(me)) return;
      setSettings(await remoteClient.settings.get());
    } catch (error) {
      console.error("[Settings] load error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageState />;
  if (!isStaff(currentUser)) return <PageState denied />;

  return (
    <div className="settings-page">
      <main className="settings-shell">
        <section className="settings-hero">
          <div>
            <span>Admin</span>
            <h1>Configuracoes</h1>
            <p>Controle identidade, PIX, WhatsApp, notificacoes e parametros globais do Gestor J2.</p>
          </div>
          <button className="settings-action" onClick={loadData} type="button">
            Atualizar
          </button>
        </section>

        <section className="settings-layout">
          <aside className="settings-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.value;
              return (
                <button className={active ? "active" : ""} key={tab.value} onClick={() => setActiveTab(tab.value)} type="button">
                  <span><Icon size={16} /></span>
                  <strong>{tab.label}</strong>
                </button>
              );
            })}
          </aside>

          <section className="settings-content">
            {activeTab === "company" && <CompanyForm onUpdate={setSettings} settings={settings} />}
            {activeTab === "identity" && <IdentityForm onUpdate={setSettings} settings={settings} />}
            {activeTab === "pix" && <PixForm onUpdate={setSettings} settings={settings} />}
            {activeTab === "integrations" && <IntegrationsForm onUpdate={setSettings} settings={settings} />}
            {activeTab === "notifications" && <NotificationTest settings={settings} />}
          </section>
        </section>
      </main>

      <style>{settingsStyles}</style>
    </div>
  );
}

const settingsStyles = `
.settings-page {
  width: 100%;
  min-height: 100dvh;
  color: var(--j2-text);
  background: linear-gradient(135deg, var(--j2-bg) 0%, var(--j2-bg-soft) 54%, #010202 100%);
  overflow-x: hidden;
}

.settings-shell {
  width: min(1280px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  padding: clamp(14px, 2vw, 30px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-hero,
.settings-tabs,
.settings-content,
.settings-state {
  border: 0 !important;
  background: rgba(6, 7, 7, .96) !important;
  box-shadow: var(--j2-neu) !important;
}

.settings-hero {
  border-radius: 28px;
  padding: clamp(18px, 2.2vw, 30px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.settings-hero span {
  display: block;
  color: var(--j2-accent);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.settings-hero h1 {
  margin: 4px 0 7px;
  color: var(--j2-text);
  font-size: clamp(36px, 5.6vw, 64px);
  line-height: .9;
  font-weight: 950;
}

.settings-hero p {
  max-width: 760px;
  margin: 0;
  color: var(--j2-muted);
  font-size: 14px;
}

.settings-action,
.settings-form button,
.settings-upload-button {
  border: 0;
  min-height: 42px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 15px;
  color: var(--j2-muted);
  background: var(--j2-surface-2);
  box-shadow: var(--j2-neu-soft);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.settings-form button.primary,
.settings-save {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.settings-form button:disabled,
.settings-action:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.settings-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.settings-tabs {
  border-radius: 26px;
  padding: 10px;
  display: grid;
  gap: 8px;
  position: sticky;
  top: 16px;
}

.settings-tabs button {
  border: 0;
  min-height: 54px;
  border-radius: 18px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--j2-muted);
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.settings-tabs button span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 13px;
  color: currentColor;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.settings-tabs button strong {
  font-size: 13px;
  font-weight: 950;
}

.settings-tabs button.active {
  color: #fff;
  background: rgba(255, 75, 18, .10);
}

.settings-tabs button.active span {
  color: var(--j2-accent);
}

.settings-content {
  min-width: 0;
  border-radius: 26px;
  padding: clamp(14px, 2vw, 22px);
}

.settings-form {
  display: grid;
  gap: 16px;
}

.settings-form-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-form-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 16px;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .76);
  box-shadow: var(--j2-sunken);
}

.settings-form-header h2,
.settings-form-section h3 {
  margin: 0;
  color: var(--j2-text);
  font-size: 18px;
  font-weight: 950;
}

.settings-form-header p,
.settings-form-section p {
  margin: 3px 0 0;
  color: var(--j2-muted);
  font-size: 12px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.settings-field {
  display: grid;
  gap: 7px;
}

.settings-field.full {
  grid-column: 1 / -1;
}

.settings-field span {
  display: block;
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.settings-field input,
.settings-field textarea,
.settings-field select,
.settings-input,
.settings-textarea {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  border-radius: 16px;
  padding: 12px;
  color: var(--j2-text);
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
  font: inherit;
  font-size: 13px;
}

.settings-field textarea,
.settings-textarea {
  resize: vertical;
  min-height: 98px;
}

.settings-field small {
  color: var(--j2-faint);
  font-size: 11px;
}

.settings-form-section,
.settings-success,
.settings-error,
.settings-empty,
.settings-pix-row,
.settings-diagnostic,
.settings-test-panel {
  border: 0;
  border-radius: 20px;
  padding: 14px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.settings-form-section {
  display: grid;
  gap: 14px;
}

.settings-form-section > .settings-form-header {
  margin-bottom: 2px;
}

.settings-success {
  color: var(--j2-accent);
  font-size: 13px;
  font-weight: 900;
}

.settings-error {
  color: #ffb4b4;
  font-size: 13px;
  font-weight: 900;
}

.settings-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.settings-visual-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, .75fr);
  grid-template-areas:
    "showcase panel"
    "showcase sidebar";
  gap: 14px;
  align-items: stretch;
}

.settings-preview-showcase,
.settings-preview-panel,
.settings-preview-sidebar {
  border: 0;
  border-radius: 24px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.settings-preview-showcase {
  grid-area: showcase;
  position: relative;
  min-height: 390px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  isolation: isolate;
}

.settings-preview-showcase::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image:
    linear-gradient(160deg, rgba(5,6,6,.64), rgba(1,2,2,.94)),
    var(--preview-bg-image);
  background-position: var(--preview-bg-position);
  background-size: cover;
}

.settings-preview-showcase::after {
  content: "";
  position: absolute;
  inset: auto 18px 18px;
  height: 1px;
  z-index: -1;
  background: linear-gradient(90deg, transparent, rgba(255,75,18,.45), transparent);
}

.settings-preview-top,
.settings-preview-brand,
.settings-preview-sidebar {
  display: flex;
  align-items: center;
}

.settings-preview-top {
  justify-content: space-between;
  gap: 12px;
}

.settings-preview-brand,
.settings-preview-sidebar {
  min-width: 0;
  gap: 11px;
}

.settings-preview-logo,
.settings-preview-sidebar-logo {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: var(--j2-accent);
  background: rgba(3, 4, 4, .78);
  box-shadow: var(--j2-sunken);
}

.settings-preview-logo {
  width: 54px;
  height: 54px;
  border-radius: 18px;
}

.settings-preview-sidebar-logo {
  width: 42px;
  height: 42px;
  border-radius: 14px;
}

.settings-preview-logo img,
.settings-preview-sidebar-logo img {
  width: 100%;
  height: 100%;
  padding: 7px;
}

.settings-preview-brand strong,
.settings-preview-sidebar strong,
.settings-preview-panel h4,
.settings-preview-copy h4 {
  color: var(--j2-text);
  font-weight: 950;
}

.settings-preview-brand strong,
.settings-preview-sidebar strong {
  display: block;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-preview-brand span,
.settings-preview-sidebar span,
.settings-preview-copy p {
  color: var(--j2-muted);
}

.settings-preview-brand span,
.settings-preview-sidebar span {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-preview-pill {
  min-height: 32px;
  padding: 0 11px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  color: #ff8a4a;
  background: rgba(3, 4, 4, .74);
  box-shadow: var(--j2-sunken);
  font-size: 11px;
  font-weight: 950;
}

.settings-preview-copy {
  max-width: 540px;
}

.settings-preview-copy span,
.settings-preview-panel > span {
  display: block;
  color: var(--j2-accent);
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.settings-preview-copy h4 {
  margin: 7px 0 10px;
  font-size: clamp(34px, 5vw, 58px);
  line-height: .88;
}

.settings-preview-copy p {
  max-width: 430px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.settings-preview-panel {
  grid-area: panel;
  padding: 16px;
  display: grid;
  align-content: start;
  gap: 12px;
}

.settings-preview-panel h4 {
  margin: -4px 0 0;
  font-size: 24px;
  line-height: 1;
}

.settings-preview-tabs {
  padding: 6px;
  border-radius: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.settings-preview-tabs b,
.settings-preview-tabs em {
  min-height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
}

.settings-preview-tabs b {
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
}

.settings-preview-tabs em {
  color: var(--j2-muted);
}

.settings-preview-input {
  height: 42px;
  border-radius: 15px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.settings-preview-input.short {
  width: 82%;
}

.settings-preview-panel button {
  border: 0;
  min-height: 42px;
  border-radius: 15px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: var(--j2-neu-soft);
  font-size: 12px;
  font-weight: 950;
}

.settings-preview-sidebar {
  grid-area: sidebar;
  min-height: 92px;
  padding: 14px;
}

.settings-empty {
  color: var(--j2-muted);
  text-align: center;
  font-size: 13px;
}

.settings-pix-list {
  display: grid;
  gap: 9px;
}

.settings-pix-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.settings-pix-row strong {
  display: block;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
}

.settings-pix-row span {
  display: block;
  margin-top: 3px;
  color: var(--j2-muted);
  font-size: 12px;
  word-break: break-word;
}

.settings-pix-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.settings-diagnostic {
  display: grid;
  gap: 8px;
}

.settings-test-list,
.settings-test-actions,
.settings-queue-grid {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.settings-test-row,
.settings-queue-grid div {
  border: 0;
  border-radius: 17px;
  padding: 12px;
  background: rgba(3, 4, 4, .72);
  box-shadow: var(--j2-sunken);
}

.settings-test-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.settings-test-row > span,
.settings-queue-grid span {
  color: var(--j2-muted);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}

.settings-test-row strong,
.settings-queue-grid strong {
  overflow: hidden;
  color: var(--j2-text);
  font-size: 13px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-test-row svg {
  color: var(--j2-accent);
}

.settings-queue-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.settings-queue-grid strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-accent);
  font-size: 24px;
}

.settings-muted {
  margin: 10px 0 0;
  color: var(--j2-muted);
  font-size: 12px;
}

.settings-test-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.settings-test-actions button {
  width: 100%;
}

.settings-diagnostic div {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 10px;
  color: var(--j2-muted);
  font-size: 12px;
}

.settings-diagnostic strong {
  overflow: hidden;
  color: var(--j2-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-state {
  width: min(430px, calc(100vw - 28px));
  min-height: 320px;
  margin: 18dvh auto 0;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.settings-state strong {
  color: var(--j2-text);
  font-size: 20px;
  font-weight: 950;
}

.settings-state p {
  margin: 0;
  color: var(--j2-muted);
  font-size: 13px;
}

.settings-spin {
  animation: settingsSpin .8s linear infinite;
}

@keyframes settingsSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 960px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }

  .settings-tabs {
    position: static;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .settings-tabs button {
    min-height: 74px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 760px) {
  .settings-shell {
    padding: 12px 10px calc(92px + env(safe-area-inset-bottom, 0px));
  }

  .settings-hero {
    align-items: stretch;
    flex-direction: column;
    border-radius: 24px;
  }

  .settings-hero h1 {
    font-size: clamp(34px, 10vw, 50px);
  }

  .settings-action,
  .settings-form-actions .settings-form button,
  .settings-form-actions button,
  .settings-save {
    width: 100%;
  }

  .settings-tabs {
    display: flex;
    overflow-x: auto;
    padding-bottom: 12px;
  }

  .settings-tabs button {
    min-width: 92px;
    flex: 0 0 auto;
  }

  .settings-grid,
  .settings-visual-preview,
  .settings-pix-row,
  .settings-diagnostic div,
  .settings-test-row,
  .settings-queue-grid,
  .settings-test-actions {
    grid-template-columns: 1fr;
  }

  .settings-visual-preview {
    grid-template-areas:
      "showcase"
      "panel"
      "sidebar";
  }

  .settings-preview-showcase {
    min-height: 360px;
  }

  .settings-preview-top {
    align-items: flex-start;
  }

  .settings-preview-pill {
    display: none;
  }

  .settings-preview-copy h4 {
    font-size: clamp(34px, 11vw, 48px);
  }

  .settings-form-actions,
  .settings-pix-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}
`;
