import React from "react";
import { ArrowRight, MessageCircle, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { hasUserWhatsApp } from "@/utils/contact";

export default function PhoneRequiredBanner({ user }) {
  if (!user || user.role === "admin" || user.role === "dev" || hasUserWhatsApp(user)) {
    return null;
  }

  return (
    <section className="phone-required-banner" role="status" aria-live="polite">
      <div className="phone-required-mark" aria-hidden="true">
        <MessageCircle size={22} />
        <i />
      </div>

      <div className="phone-required-body">
        <span className="phone-required-kicker"><Smartphone size={13} /> Perfil incompleto</span>
        <strong>WhatsApp pendente</strong>
        <p>Adicione seu numero para receber avisos e liberar novos pedidos.</p>
      </div>

      <Link className="phone-required-action" to={createPageUrl("Profile")}>
        <span>Cadastrar</span>
        <ArrowRight size={15} />
      </Link>

      <style>{phoneRequiredStyles}</style>
    </section>
  );
}

const phoneRequiredStyles = `
.phone-required-banner {
  width: 100%;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 0 !important;
  border-radius: 24px;
  padding: 14px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  color: var(--j2-text);
  background:
    radial-gradient(circle at 100% 0%, rgba(255,75,18,.16), transparent 34%),
    linear-gradient(145deg, rgba(8,9,9,.98), rgba(4,5,5,.96)) !important;
  box-shadow: var(--j2-neu) !important;
}

.phone-required-banner::before {
  content: "";
  position: absolute;
  inset: 12px auto 12px 0;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--j2-accent), var(--j2-accent-deep));
}

.phone-required-mark {
  width: 52px;
  height: 52px;
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 18px;
  color: var(--j2-accent) !important;
  background: rgba(3, 4, 4, .74);
  box-shadow: var(--j2-sunken);
}

.phone-required-mark i {
  width: 16px;
  height: 16px;
  position: absolute;
  top: 4px;
  right: 4px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep));
  box-shadow: inset 1px 1px 2px rgba(255,255,255,.18);
}

.phone-required-mark i::after {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: inherit;
  background: #fff;
}

.phone-required-body {
  min-width: 0;
}

.phone-required-kicker {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--j2-accent) !important;
  font-size: 10.5px;
  font-weight: 950;
  line-height: 1;
  text-transform: uppercase;
}

.phone-required-body strong {
  display: block;
  margin-top: 5px;
  color: var(--j2-text) !important;
  font-size: 17px;
  font-weight: 950;
  line-height: 1.05;
}

.phone-required-body p {
  max-width: 620px;
  margin: 6px 0 0;
  color: var(--j2-muted) !important;
  font-size: 12.5px;
  line-height: 1.42;
}

.phone-required-action {
  min-height: 42px;
  border: 0 !important;
  border-radius: 999px;
  padding: 0 14px 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff !important;
  background: linear-gradient(135deg, var(--j2-accent), var(--j2-accent-deep)) !important;
  box-shadow: var(--j2-neu-soft) !important;
  font-size: 12px;
  font-weight: 950;
  text-decoration: none;
  white-space: nowrap;
  transition: transform .18s ease, filter .18s ease;
}

.phone-required-action:active {
  transform: translateY(1px) scale(.99);
}

@media (max-width: 620px) {
  .phone-required-banner {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    border-radius: 24px;
    padding: 14px;
    background:
      radial-gradient(circle at 100% 0%, rgba(255,75,18,.11), transparent 34%),
      linear-gradient(145deg, rgba(8, 9, 9, .98), rgba(4, 5, 5, .96)) !important;
    box-shadow:
      10px 12px 26px rgba(0, 0, 0, .48),
      -4px -4px 12px rgba(255,255,255,.016),
      inset 1px 1px 0 rgba(255,255,255,.014) !important;
  }

  .phone-required-banner::before {
    inset: 14px auto 14px 0;
  }

  .phone-required-mark {
    width: 48px;
    height: 48px;
    border-radius: 17px;
    background: rgba(3, 4, 4, .76);
    box-shadow:
      inset 4px 4px 10px rgba(0, 0, 0, .42),
      inset -3px -3px 8px rgba(255,255,255,.016);
  }

  .phone-required-kicker {
    color: #ff4b12 !important;
    font-size: 10px;
  }

  .phone-required-body strong {
    color: var(--j2-text, #fff8f2) !important;
    font-size: 16px;
  }

  .phone-required-body p {
    color: var(--j2-muted, #a3a09b) !important;
    font-size: 12px;
  }

  .phone-required-action {
    grid-column: 2;
    width: fit-content;
    min-height: 36px;
    justify-self: start;
    margin-top: 2px;
    padding: 0 13px;
    font-size: 11.5px;
  }
}
`;
