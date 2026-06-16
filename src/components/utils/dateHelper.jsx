const TZ = 'America/Sao_Paulo';

export const formatBrasiliaDate = (date, formatStr) => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!d || isNaN(d.getTime())) return 'Data inválida';

    const get = (opts) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...opts }).format(d);

    const day    = get({ day: '2-digit' });
    const month  = get({ month: '2-digit' });
    const year   = get({ year: 'numeric' });
    const hour   = get({ hour: '2-digit', hour12: false });
    const minute = get({ minute: '2-digit' });
    const second = get({ second: '2-digit' });
    const monthShort = get({ month: 'short' }).replace('.', '').toLowerCase().slice(0, 3);

    const fmt = formatStr || "dd/MM/yyyy HH:mm";
    let result = '';
    let i = 0;
    while (i < fmt.length) {
      if (fmt[i] === "'") {
        const end = fmt.indexOf("'", i + 1);
        if (end === -1) { result += fmt.slice(i); break; }
        result += fmt.slice(i + 1, end);
        i = end + 1;
      } else if (fmt.startsWith('yyyy', i)) { result += year;       i += 4;
      } else if (fmt.startsWith('MMM',  i)) { result += monthShort; i += 3;
      } else if (fmt.startsWith('MM',   i)) { result += month;      i += 2;
      } else if (fmt.startsWith('dd',   i)) { result += day;        i += 2;
      } else if (fmt.startsWith('HH',   i)) { result += hour.padStart(2,'0');   i += 2;
      } else if (fmt.startsWith('mm',   i)) { result += minute.padStart(2,'0'); i += 2;
      } else if (fmt.startsWith('ss',   i)) { result += second.padStart(2,'0'); i += 2;
      } else { result += fmt[i]; i++; }
    }
    return result;
  } catch {
    return 'Data inválida';
  }
};

export const formatFullBrasiliaDate = (date) =>
  formatBrasiliaDate(date, "dd 'de' MMM 'de' yyyy 'às' HH:mm");

export const formatShortBrasiliaDate = (date) =>
  formatBrasiliaDate(date, "dd/MM/yyyy HH:mm");

export const formatBrasiliaTime = (date) =>
  formatBrasiliaDate(date, "HH:mm");

export const getCurrentBrasiliaDateTime = () =>
  formatBrasiliaDate(new Date(), "dd/MM/yyyy 'às' HH:mm:ss");

export const nowBrasilia = () => new Date();

export const formatDistanceToBrasilia = (date) => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days > 1 ? 's' : ''}`;
  } catch { return ''; }
};