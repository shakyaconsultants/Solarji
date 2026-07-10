import logo from '../assets/solarji logo.jpeg';
import { COMPANY, buildBillLines, formatBillDate, formatMoney } from '../constants/voucherBill';

const ORANGE = '#f7941d';
const BLACK = '#111111';

const billStyles = `
  .voucher-bill-wrap { font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; color: #111; }
  .voucher-bill {
    max-width: 210mm;
    margin: 0 auto;
    background: #fff;
    border: 2px solid #111;
    padding: 10mm 12mm 8mm;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .voucher-bill.styled {
    border: 3px solid ${ORANGE};
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,.08);
    padding: 12mm 14mm 10mm;
  }
  .voucher-bill-top { flex-shrink: 0; }
  .voucher-bill-table-wrap { flex: 1 1 auto; min-height: 0; }
  .voucher-bill-bottom { flex-shrink: 0; }
  .voucher-bill-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    border-bottom: 2px solid #111;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .voucher-bill.styled .voucher-bill-header { border-bottom-color: ${ORANGE}; }
  .voucher-bill-brand { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
  .voucher-bill-brand img {
    width: 56px; height: 56px; border-radius: 14px; object-fit: cover;
    border: 2px solid ${ORANGE}; flex-shrink: 0;
  }
  .voucher-bill-company h1 { font-size: 1.5rem; font-weight: 900; margin: 0; letter-spacing: -0.03em; color: ${BLACK}; line-height: 1.1; }
  .voucher-bill-company .tagline { font-size: 0.68rem; font-weight: 800; color: ${ORANGE}; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 2px; }
  .voucher-bill-company p { margin: 2px 0; font-size: 10px; color: #555; }
  .voucher-bill-meta { text-align: right; font-size: 11px; flex-shrink: 0; }
  .voucher-bill-meta .title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: ${BLACK}; }
  .voucher-bill-meta .draft-badge {
    display: inline-block; font-size: 9px; font-weight: 800; color: ${ORANGE};
    border: 1.5px solid ${ORANGE}; border-radius: 99px; padding: 2px 8px; margin-bottom: 4px;
  }
  .voucher-bill-party {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 11px;
  }
  .voucher-bill-party label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #666; margin-bottom: 2px; }
  .voucher-bill-party .value { min-height: 18px; border-bottom: 1px dotted #999; padding-bottom: 2px; white-space: pre-wrap; word-break: break-word; }
  .voucher-bill-table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
  .voucher-bill-table th, .voucher-bill-table td {
    border: 1px solid #111;
    padding: 4px 5px;
    vertical-align: middle;
  }
  .voucher-bill.styled .voucher-bill-table th { background: rgba(247,148,29,.12); }
  .voucher-bill-table th { background: #f3f4f6; font-weight: 700; text-align: center; }
  .voucher-bill-table .col-sno { width: 6%; text-align: center; }
  .voucher-bill-table .col-item { width: 38%; text-align: left; word-break: break-word; }
  .voucher-bill-table .col-qty { width: 10%; text-align: center; }
  .voucher-bill-table .col-unit { width: 10%; text-align: center; }
  .voucher-bill-table .col-rate { width: 16%; text-align: right; }
  .voucher-bill-table .col-amt { width: 20%; text-align: right; }
  .voucher-bill-table tbody td { height: 18px; }
  .voucher-bill-row-empty td { color: transparent; }
  .voucher-bill-row-empty .col-sno { color: #999; }
  .voucher-bill-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    margin-top: 12px;
    font-size: 11px;
  }
  .voucher-bill-signatures {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #555;
  }
  .voucher-bill-total {
    text-align: right;
    font-size: 13px;
    font-weight: 800;
    border: 2px solid #111;
    padding: 8px 14px;
    min-width: 180px;
  }
  .voucher-bill.styled .voucher-bill-total { border-color: ${ORANGE}; color: ${BLACK}; }
  @media print {
    @page { size: A4 portrait; margin: 6mm; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body * { visibility: hidden; }
    .voucher-bill-print-root, .voucher-bill-print-root * { visibility: visible; }
    .voucher-bill-print-root {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 0;
      margin: 0;
    }
    .voucher-bill {
      width: 100%;
      max-width: none;
      min-height: calc(297mm - 12mm);
      max-height: calc(297mm - 12mm);
      padding: 4mm 7mm 3mm !important;
      border: 2px solid #000 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: hidden;
      page-break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .voucher-bill-header {
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .voucher-bill-brand img { width: 38px !important; height: 38px !important; border-radius: 8px !important; }
    .voucher-bill-company h1 { font-size: 13pt !important; }
    .voucher-bill-company .tagline { font-size: 6.5pt !important; }
    .voucher-bill-company p { font-size: 7pt !important; margin: 1px 0 !important; }
    .voucher-bill-meta { font-size: 8pt !important; }
    .voucher-bill-meta .title { font-size: 10pt !important; margin-bottom: 2px !important; }
    .voucher-bill-party { margin-bottom: 6px !important; font-size: 8pt !important; gap: 8px !important; }
    .voucher-bill-party label { font-size: 7pt !important; }
    .voucher-bill-party .value { min-height: 14px !important; }
    .voucher-bill-table { font-size: 7pt !important; }
    .voucher-bill-table th, .voucher-bill-table td {
      padding: 0.8mm 1.2mm !important;
      line-height: 1.15 !important;
    }
    .voucher-bill-table th { font-size: 7pt !important; }
    .voucher-bill-table tbody td {
      height: 4.8mm !important;
      max-height: 4.8mm !important;
      overflow: hidden;
      vertical-align: middle !important;
    }
    .voucher-bill-row-empty { display: none !important; }
    .voucher-bill-footer {
      margin-top: 3mm !important;
      font-size: 8.5pt !important;
      page-break-inside: avoid;
    }
    .voucher-bill-total {
      font-size: 10pt !important;
      padding: 4px 10px !important;
      min-width: 140px !important;
    }
    .voucher-bill-signatures {
      margin-top: 4mm !important;
      font-size: 8pt !important;
      page-break-inside: avoid;
    }
    .no-print { display: none !important; }
  }
`;

export default function VoucherBillDocument({ voucher, className = '', styled = false, isDraft = false }) {
  if (!voucher) return null;

  const isSell = voucher.type === 'SELL';
  const billTitle = isSell ? 'Sales Invoice' : 'Purchase Bill';
  const partyLabel = isSell ? 'Customer Name' : 'Supplier Name';
  const addressLabel = isSell ? 'Customer Address' : 'Supplier Address';
  const lines = buildBillLines(voucher.items);
  const billNo = isDraft ? 'PREVIEW' : voucher.voucherNumber;

  return (
    <div className={`voucher-bill-wrap voucher-bill-print-root ${className}`}>
      <style>{billStyles}</style>
      <div className={`voucher-bill${styled ? ' styled' : ''}`}>
        <div className="voucher-bill-top">
        <div className="voucher-bill-header">
          <div className="voucher-bill-brand">
            {styled && (
              <img src={logo} alt="SolarJi" />
            )}
            <div className="voucher-bill-company">
              <h1>{COMPANY.name}</h1>
              <p className="tagline">{COMPANY.tagline}</p>
              {COMPANY.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{COMPANY.phones.join(' · ')} · {COMPANY.email}</p>
            </div>
          </div>
          <div className="voucher-bill-meta">
            {isDraft && <div className="draft-badge">DRAFT PREVIEW</div>}
            <div className="title">{billTitle}</div>
            <div><strong>Bill No:</strong> {billNo}</div>
            <div><strong>Date:</strong> {formatBillDate(voucher.date || voucher.createdAt)}</div>
            {voucher.createdBy?.name && (
              <div><strong>Prepared By:</strong> {voucher.createdBy.name}</div>
            )}
          </div>
        </div>

        <div className="voucher-bill-party">
          <div>
            <label>{partyLabel}</label>
            <div className="value">{voucher.party || '—'}</div>
          </div>
          <div>
            <label>{addressLabel}</label>
            <div className="value">{voucher.partyAddress || '—'}</div>
          </div>
        </div>
        </div>

        <div className="voucher-bill-table-wrap">
        <table className="voucher-bill-table">
          <thead>
            <tr>
              <th className="col-sno">S.No.</th>
              <th className="col-item">Part Name / Item</th>
              <th className="col-qty">Qty</th>
              <th className="col-unit">Unit</th>
              <th className="col-rate">Rate (₹)</th>
              <th className="col-amt">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const isEmpty = !line.name && line.qty === '' && line.rate === '' && line.amount === '';
              return (
              <tr key={line.sno} className={isEmpty ? 'voucher-bill-row-empty' : ''}>
                <td className="col-sno">{line.sno}</td>
                <td className="col-item">{line.name}</td>
                <td className="col-qty">{line.qty !== '' ? line.qty : ''}</td>
                <td className="col-unit">{line.unit || ''}</td>
                <td className="col-rate">{line.rate !== '' ? formatMoney(line.rate) : ''}</td>
                <td className="col-amt">{line.amount !== '' ? formatMoney(line.amount) : ''}</td>
              </tr>
            );})}
          </tbody>
        </table>
        </div>

        <div className="voucher-bill-bottom">
        <div className="voucher-bill-footer">
          <div>
            {voucher.note && (
              <p><strong>Remarks:</strong> {voucher.note}</p>
            )}
            <p style={{ marginTop: 8, color: '#666' }}>Thank you for your business.</p>
          </div>
          <div className="voucher-bill-total">
            Grand Total: ₹{formatMoney(voucher.totalAmount)}
          </div>
        </div>

        <div className="voucher-bill-signatures">
          <span>Receiver&apos;s Signature</span>
          <span>Authorised Signatory</span>
        </div>
        </div>
      </div>
    </div>
  );
}
