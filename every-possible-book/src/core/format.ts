// Number and time formatting shared by the UI and the found texts.

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

export function fmtInt(n: number): string {
  return n < 1e6 ? Math.floor(n).toLocaleString('en-US') : fmt(n);
}

export function fmtRate(n: number): string {
  return n > 0 && n < 0.1 ? n.toFixed(3) : fmt(n);
}

export function fmtTime(seconds: number): string {
  seconds = Math.max(0, Math.floor(seconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

/** Spelled-out numbers, for texts written "by hand". */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function spell(n: number): string {
  n = Math.floor(n);
  if (n < 0) return 'minus ' + spell(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + spell(n % 100) : '');
  if (n < 1e6) return spell(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + spell(n % 1000) : '');
  return fmt(n);
}
