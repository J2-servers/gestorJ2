import React from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { hasUserWhatsApp } from "@/utils/contact";

export default function PhoneRequiredBanner({ user }) {
  if (!user || user.role === "admin" || hasUserWhatsApp(user)) {
    return null;
  }

  return (
    <section className="phone-required-banner" role="status" aria-live="polite">
      <div className="phone-required-icon">
        <AlertTriangle size={20} />
      </div>

      <div className="phone-required-copy">
        <span>Ação necessária</span>
        <strong>Cadastre seu WhatsApp</strong>
        <p>
          Seu número de WhatsApp é obrigatório para receber avisos automáticos e criar novos pedidos.
        </p>
      </div>

      <Link className="phone-required-action" to={createPageUrl("Profile")}>
        <MessageCircle size={16} />
        Cadastrar
      </Link>

      <style>{phoneRequiredStyles}</style>
    </section>
  );
}

const phoneRequiredStyles = `
.phone-required-banner {
  width: 100%;
  border: 0;
  border-radius: 22px;
  padding: 14px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  color: var(--j2-text);
  background: var(--j2-surface);
  box-shadow: var(--j2-neu);
}

.phone-required-icon,
.phone-required-action {
  border: 0;
  display: inline-grid;
  place-items: center;
  box-shadow: var(--j2-sunken);
}

.phone-required-icon {
  width: 44px;
  height: 44px;
  border-radius: 15px;
  color: var(--j2-accent);
  background: var(--j2-sunken-bg);
}

.phone-required-copy {
  min-width: 0;
}

.phone-required-copy span {
  display: block;
  color: var(--j2-accent);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0;
  text-transform: uppercase;
}

.phone-required-copy strong {
  display: block;
  margin-top: 2px;
  color: var(--j2-text);
  font-size: 15px;
  font-weight: 950;
}

.phone-required-copy p {
  margin: 4px 0 0;
  color: var(--j2-muted);
  font-size: 12px;
  line-height: 1.45;
}

.phone-required-action {
  min-height: 42px;
  border-radius: 14px;
  padding: 0 14px;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  font-size: 12px;
  font-weight: 950;
  text-decoration: none;
  box-shadow: var(--j2-neu-soft);
}

@media (max-width: 620px) {
  .phone-required-banner {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    border-radius: 20px;
  }

  .phone-required-action {
    grid-column: 1 / -1;
    width: 100%;
  }
}
`;
