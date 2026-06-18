export function getUserWhatsApp(user) {
  if (!user) return "";
  const raw =
    user.phone ??
    user.whatsapp ??
    user.whatsappNumber ??
    user.whatsapp_number ??
    user.phoneNumber ??
    user.phone_number ??
    "";

  return String(raw || "").trim();
}

export function hasUserWhatsApp(user) {
  const value = getUserWhatsApp(user);
  if (!value) return false;

  const digits = value.replace(/\D/g, "");
  return digits.length >= 8;
}
