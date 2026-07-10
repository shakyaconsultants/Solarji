/** Bill pad row count — one A4 page of line items (client requirement: 35–40). */
export const BILL_PAD_ROWS = 40;

export const COMPANY = {
  name: 'SolarJi',
  tagline: 'Solar Installation & Energy Solutions',
  addressLines: ['Shop No. 5, Solar Market', 'Kanpur, Uttar Pradesh'],
  address: 'Shop No. 5, Solar Market, Kanpur, Uttar Pradesh',
  phones: ['+91 98765 43210', '+91 87654 32109'],
  email: 'info@solarji.com',
};

export function emptyVoucherRow() {
  return { item: '', itemName: '', unit: '', quantity: '', price: '', total: 0 };
}

export function createBillPadRows(count = BILL_PAD_ROWS) {
  return Array.from({ length: count }, emptyVoucherRow);
}

/** Pad item lines to fixed row count for bill print (filled rows first, then blanks). */
export function buildBillLines(items, padRows = BILL_PAD_ROWS) {
  const filled = (items || []).map((item, index) => {
    const qty = item.quantity ?? '';
    const rate = item.price ?? 0;
    const amount = item.total ?? (Number(qty) * Number(rate));
    return {
      sno: index + 1,
      name: item.itemName || '',
      qty,
      unit: item.unit || 'piece',
      rate,
      amount,
    };
  });

  const lines = [...filled];
  while (lines.length < padRows) {
    lines.push({
      sno: lines.length + 1,
      name: '',
      qty: '',
      unit: '',
      rate: '',
      amount: '',
    });
  }
  return lines.slice(0, padRows);
}

export function formatBillDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(value) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Build a draft voucher object for preview (before save). */
export function buildDraftVoucher({
  type,
  party,
  partyAddress,
  note,
  date,
  rows,
  preparedBy,
}) {
  const items = (rows || [])
    .filter((r) => r.item && Number(r.quantity) > 0)
    .map((r) => {
      const quantity = Number(r.quantity);
      const price = Number(r.price);
      const total = Number(r.total) || quantity * price;
      return {
        itemName: r.itemName,
        unit: r.unit || 'piece',
        quantity,
        price,
        total,
      };
    });

  const totalAmount = items.reduce((s, i) => s + i.total, 0);

  return {
    type,
    party,
    partyAddress,
    note,
    date: date || new Date().toISOString(),
    items,
    totalAmount,
    voucherNumber: 'PREVIEW',
    createdBy: preparedBy ? { name: preparedBy } : undefined,
  };
}
