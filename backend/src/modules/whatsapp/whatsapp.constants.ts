// Constante isolada para evitar import circular entre o módulo e os providers
// (module importa service/processor, e estes importavam a constante de volta do module,
// resultando em WHATSAPP_QUEUE === undefined no @InjectQueue -> BullQueue_default).
export const WHATSAPP_QUEUE = 'whatsapp';
