import { appClient } from './appClient';


export const Query = appClient.entities.Query;
export const ApprovalStage = appClient.entities.ApprovalStage;
export const AuditLog = appClient.entities.AuditLog;
export const CreditRequest = appClient.entities.CreditRequest;
export const Invoice = appClient.entities.Invoice;
export const Message = appClient.entities.Message;
export const MessageTemplate = appClient.entities.MessageTemplate;
export const Notification = appClient.entities.Notification;
export const ResellerServer = appClient.entities.ResellerServer;
export const Server = appClient.entities.Server;
export const ServerAlert = appClient.entities.ServerAlert;
export const ServerGroup = appClient.entities.ServerGroup;
export const ServerPriceHistory = appClient.entities.ServerPriceHistory;
export const Settings = appClient.entities.Settings;
export const WhatsAppChat = appClient.entities.WhatsAppChat;
export const WhatsAppLog = appClient.entities.WhatsAppLog;
export const WhatsAppMessage = appClient.entities.WhatsAppMessage;



export const User = {
  ...appClient.entities.User,
  me: appClient.auth.me.bind(appClient.auth),
  updateMe: appClient.auth.updateMe.bind(appClient.auth),
  logout: appClient.auth.logout.bind(appClient.auth),
  redirectToLogin: appClient.auth.redirectToLogin.bind(appClient.auth),
};
