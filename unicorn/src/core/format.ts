// Number and time formatting for the UI.

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export type Notation = 'words' | 'scientific';
let notation: Notation = 'words';
export function setNotation(n: Notation): void {
  notation = n;
}

export function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return n > 0 ? '∞' : '—';
  if (n < 0) return '-' + fmt(-n, digits);
  if (n < 1000) {
    if (n < 10 && n % 1 !== 0) return n.toFixed(Math.min(digits, 2)).replace(/\.?0+$/, '');
    return Math.floor(n).toString();
  }
  const exp = Math.floor(Math.log10(n));
  if (notation === 'scientific' || exp >= SUFFIXES.length * 3) {
    const m = n / Math.pow(10, exp);
    return `${m.toFixed(digits)}e${exp}`;
  }
  const tier = Math.floor(exp / 3);
  const m = n / Math.pow(10, tier * 3);
  return `${m.toFixed(m >= 100 ? 0 : m >= 10 ? 1 : digits)}${SUFFIXES[tier]}`;
}

export function money(n: number): string {
  return (n < 0 ? '-$' : '$') + fmt(Math.abs(n));
}

export function fmtTime(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
