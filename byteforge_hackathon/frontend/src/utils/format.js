import { format, parseISO } from 'date-fns';

export function formatMoney(amount, currency = 'INR') {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    return format(typeof value === 'string' ? parseISO(value) : value, 'dd MMM yyyy');
  } catch {
    return value;
  }
}

export function labelize(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
