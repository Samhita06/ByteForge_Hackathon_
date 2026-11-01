export function toMoneyNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number.parseFloat(value);
}

export function sumMoney(rows, field = 'amount') {
  return rows.reduce((total, row) => total + toMoneyNumber(row[field]), 0);
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
