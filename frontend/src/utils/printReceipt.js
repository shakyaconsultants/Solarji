import { COMPANY } from '../constants/voucherBill';

/**
 * Formats a number in Indian currency style (e.g., ₹1,50,000)
 */
export function formatINR(amount) {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

/**
 * Builds printable HTML for a customer payment receipt / statement
 */
export function generateReceiptHtml(lead, singlePayment = null) {
  const payments = lead.payments || [];
  const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  const plantCost = Number(lead.plantCost) || 0;
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, plantCost - totalPaid);
  const percentPaid = plantCost > 0 ? Math.min(100, Math.round((totalPaid / plantCost) * 100)) : (totalPaid > 0 ? 100 : 0);

  const receiptNo = singlePayment 
    ? `REC-${(singlePayment._id || Date.now().toString()).slice(-6).toUpperCase()}`
    : `STMT-${(lead._id || Date.now().toString()).slice(-6).toUpperCase()}`;

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isFullSettlement = plantCost > 0 && remainingBalance === 0;
  const statusBadgeColor = isFullSettlement ? '#10b981' : (totalPaid > 0 ? '#f59e0b' : '#ef4444');
  const statusBadgeText = isFullSettlement ? 'FULLY PAID' : (totalPaid > 0 ? 'PARTIALLY PAID' : 'PAYMENT DUE');

  // Rows for payment history
  const paymentRows = (singlePayment ? [singlePayment] : sortedPayments).map((p, idx) => {
    const isFirst = !singlePayment && idx === 0;
    const formattedDate = new Date(p.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const methodLabel = p.method === 'account' ? 'Bank Account' : 'Cash';
    const methodBadge = p.method === 'account'
      ? 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;'
      : 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;';

    return `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 11px;">
          ${idx + 1} ${isFirst ? '<span style="background: #e0e7ff; color: #3730a3; padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 800;">1ST</span>' : ''}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1f2937;">
          ${formattedDate}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; ${methodBadge}">
            ${methodLabel}
          </span>
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 800; color: #111827; font-size: 12.5px;">
          ${formatINR(p.amount)}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; font-size: 11px;">
          ${p.note || '—'}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 11px;">
          ${p.recordedBy?.name || 'Authorized Staff'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${singlePayment ? 'Payment Receipt' : 'Payment Statement'} - ${lead.name} (${receiptNo})</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 16mm 18mm 16mm 18mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
          font-size: 11.5px;
          line-height: 1.45;
          padding: 16px 20px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .container {
          max-width: 720px;
          margin: 0 auto;
          padding: 4px 10px;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #f7941d;
          padding: 0 2px 14px 2px;
          margin-bottom: 16px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: 900;
          color: #111827;
          letter-spacing: -0.5px;
        }
        .brand-title span {
          color: #f7941d;
        }
        .tagline {
          font-size: 9.5px;
          font-weight: 700;
          color: #f7941d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 1px;
        }
        .company-info {
          font-size: 10px;
          color: #4b5563;
          margin-top: 4px;
          line-height: 1.35;
        }
        .doc-meta {
          text-align: right;
          min-width: 220px;
          padding-left: 12px;
        }
        .doc-title {
          font-size: 13px;
          font-weight: 900;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .receipt-no {
          font-family: monospace;
          font-size: 12px;
          font-weight: 800;
          color: #f7941d;
          margin-top: 2px;
        }
        .doc-date {
          font-size: 10px;
          color: #6b7280;
          margin-top: 2px;
        }
        .status-badge {
          display: inline-block;
          margin-top: 6px;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 9.5px;
          font-weight: 800;
          color: #fff;
          background: ${statusBadgeColor};
          letter-spacing: 0.5px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 16px;
        }
        .info-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 14px;
        }
        .info-card h4 {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 11px;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .info-label {
          color: #6b7280;
        }
        .info-value {
          font-weight: 700;
          color: #1f2937;
          text-align: right;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .metric-box {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 10px;
          text-align: center;
        }
        .metric-label {
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.5px;
        }
        .metric-val {
          font-size: 14.5px;
          font-weight: 900;
          color: #111827;
          margin-top: 3px;
        }
        .table-wrap {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
        }
        thead {
          background: #f3f4f6;
          color: #374151;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        th {
          padding: 8px 12px;
          font-weight: 800;
          border-bottom: 1px solid #e5e7eb;
        }
        tfoot {
          background: #f9fafb;
          font-weight: 800;
        }
        tfoot td {
          padding: 9px 12px;
          border-top: 2px solid #e5e7eb;
        }
        .footer {
          margin-top: 24px;
          padding: 12px 4px 0 4px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .terms {
          max-width: 400px;
          font-size: 9px;
          color: #6b7280;
          line-height: 1.4;
        }
        .sign-box {
          text-align: center;
          min-width: 170px;
        }
        .sign-line {
          margin-top: 36px;
          border-top: 1px solid #111827;
          padding-top: 4px;
          font-size: 9.5px;
          font-weight: 700;
          color: #111827;
        }
        .action-bar {
          margin-bottom: 14px;
          text-align: right;
        }
        .btn-print {
          background: #f7941d;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 16mm 18mm 16mm 18mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            width: 100% !important;
          }
          .container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 4mm 6mm !important;
            box-sizing: border-box !important;
          }
          .action-bar, .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="action-bar no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header">
          <div>
            <div class="brand-title">Solar<span>Ji</span></div>
            <div class="tagline">${COMPANY.tagline || 'Solar Installation & Energy Solutions'}</div>
            <div class="company-info">
              ${COMPANY.address}<br />
              Phone: ${COMPANY.phones?.join(', ') || '+91 7233050533'} | Email: ${COMPANY.email || 'info@solarji.co.in'}
            </div>
          </div>
          <div class="doc-meta">
            <div class="doc-title">${singlePayment ? 'Official Payment Receipt' : 'Customer Account Statement'}</div>
            <div class="receipt-no">${receiptNo}</div>
            <div class="doc-date">Generated: ${generatedDate}</div>
            <div>
              <span class="status-badge">${statusBadgeText}</span>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <!-- Customer Details -->
          <div class="info-card">
            <h4>Customer Information</h4>
            <div class="info-row">
              <span class="info-label">Customer Name:</span>
              <span class="info-value">${lead.name || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone Number:</span>
              <span class="info-value">${lead.phone || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${lead.email || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${[lead.address, lead.city].filter(Boolean).join(', ') || '—'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">System Size:</span>
              <span class="info-value">${lead.systemSize || 'Standard Residential/Commercial'}</span>
            </div>
          </div>

          <!-- Account Overview -->
          <div class="info-card">
            <h4>Project & Financial Summary</h4>
            <div class="info-row">
              <span class="info-label">Current CRM Stage:</span>
              <span class="info-value">${lead.stage || 'Lead'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total Plant Cost:</span>
              <span class="info-value">${formatINR(plantCost)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Total Amount Paid:</span>
              <span class="info-value" style="color: #059669;">${formatINR(totalPaid)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Outstanding Balance:</span>
              <span class="info-value" style="color: ${remainingBalance > 0 ? '#b91c1c' : '#059669'};">
                ${formatINR(remainingBalance)}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Progress:</span>
              <span class="info-value">${percentPaid}%</span>
            </div>
          </div>
        </div>

        <!-- 4 KPI Boxes -->
        <div class="summary-grid">
          <div class="metric-box">
            <div class="metric-label">Total Plant Value</div>
            <div class="metric-val">${formatINR(plantCost)}</div>
          </div>
          <div class="metric-box" style="border-color: #a7f3d0; background: #f0fdf4;">
            <div class="metric-label" style="color: #047857;">Total Received</div>
            <div class="metric-val" style="color: #065f46;">${formatINR(totalPaid)}</div>
          </div>
          <div class="metric-box" style="border-color: ${remainingBalance > 0 ? '#fde68a' : '#bfdbfe'}; background: ${remainingBalance > 0 ? '#fffbeb' : '#eff6ff'};">
            <div class="metric-label" style="color: ${remainingBalance > 0 ? '#92400e' : '#1e40af'};">Remaining Due</div>
            <div class="metric-val" style="color: ${remainingBalance > 0 ? '#b45309' : '#1e3a8a'};">${formatINR(remainingBalance)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Installments</div>
            <div class="metric-val">${payments.length} Payment${payments.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <!-- Payment Installment History Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Payment Date</th>
                <th>Payment Method</th>
                <th>Amount Paid</th>
                <th>Remarks / Reference</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows.length > 0 ? paymentRows : `
                <tr>
                  <td colspan="6" style="padding: 18px; text-align: center; color: #9ca3af; font-style: italic;">
                    No payment installments recorded for this customer yet.
                  </td>
                </tr>
              `}
            </tbody>
            ${paymentRows.length > 0 ? `
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 9.5px; color: #4b5563;">
                    ${singlePayment ? 'RECEIPT AMOUNT:' : 'TOTAL RECEIVED AMOUNT:'}
                  </td>
                  <td style="font-size: 12.5px; color: #047857;">
                    ${formatINR(singlePayment ? singlePayment.amount : totalPaid)}
                  </td>
                  <td colspan="2" style="font-size: 9.5px; color: #6b7280; font-weight: normal;">
                    ${singlePayment ? '' : `Balance Remaining: ${formatINR(remainingBalance)}`}
                  </td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        <!-- Footer / Declaration & Signatures -->
        <div class="footer">
          <div class="terms">
            <strong>Terms & Notes:</strong>
            <p>1. This is a computer-generated official receipt/statement issued by SolarJi.</p>
            <p>2. Cheques/Online transfers are subject to realization.</p>
            <p>3. Keep this document safe for warranty, net-metering, and subsidy records.</p>
          </div>

          <div class="sign-box">
            <div style="font-size: 10.5px; font-weight: 800; color: #f7941d;">For SolarJi</div>
            <div class="sign-line">Authorized Signatory / Seal</div>
          </div>
        </div>
      </div>

      <script>
        // Auto trigger print when loaded directly in standalone window
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.focus();
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Open print window for customer payment receipt or statement
 */
export function printCustomerReceipt(lead, singlePayment = null) {
  if (!lead) return;
  const html = generateReceiptHtml(lead, singlePayment);
  const win = window.open('', '_blank', 'width=880,height=920,menubar=no,toolbar=no,location=no,status=no');
  if (!win) {
    alert('Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/**
 * Builds printable HTML for a batch list of First-Paid or Pending-Balance customers
 */
export function generateCustomerListPrintHtml(leads, title, stats = {}) {
  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const rows = leads.map((l, idx) => {
    const payments = l.payments || [];
    const sorted = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
    const fp = sorted[0] || null;
    const plantCost = Number(l.plantCost) || 0;
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, plantCost - totalPaid);

    return `
      <tr>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 11px;">#${idx + 1}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${l.name}</strong><br/>
          <span style="color: #6b7280; font-size: 10px;">${l.phone} ${l.city ? '· ' + l.city : ''}</span>
        </td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb;">
          ${fp ? `
            <strong>${formatINR(fp.amount)}</strong><br/>
            <span style="font-size: 9px; color: #4b5563;">${fp.method.toUpperCase()} · ${new Date(fp.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
          ` : '—'}
        </td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 700;">${plantCost > 0 ? formatINR(plantCost) : '—'}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #059669;">${formatINR(totalPaid)}</td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 800; color: ${balance > 0 ? '#b45309' : '#059669'};">
          ${balance > 0 ? formatINR(balance) : 'PAID'}
        </td>
        <td style="padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px;">
          <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${l.stage}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title} - SolarJi</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 14mm 16mm 14mm 16mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          color: #111;
          margin: 0;
          padding: 14px 18px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #f7941d;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .brand {
          font-size: 20px;
          font-weight: 900;
        }
        .brand span {
          color: #f7941d;
        }
        .stats-bar {
          display: flex;
          gap: 15px;
          margin-bottom: 12px;
          background: #f9fafb;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 11px;
          border: 1px solid #e5e7eb;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          background: #f3f4f6;
          padding: 8px 10px;
          font-weight: 800;
          font-size: 10px;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 14mm 16mm 14mm 16mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .container {
            padding: 4mm 6mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="no-print" style="text-align: right; margin-bottom: 10px;">
          <button onclick="window.print()" style="background: #f7941d; color: white; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer;">🖨️ Print / Save PDF</button>
        </div>
        <div class="header">
          <div>
            <div class="brand">Solar<span>Ji</span></div>
            <div style="font-size: 10px; color: #666;">Solar Installation & Energy Solutions</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 900; text-transform: uppercase;">${title}</div>
            <div style="font-size: 10px; color: #666;">Report Generated: ${generatedDate}</div>
            <div style="font-size: 10px; color: #666;">Total Records: ${leads.length}</div>
          </div>
        </div>

        ${stats.totalPlantCost != null ? `
          <div class="stats-bar">
            <div><strong>Total Customers:</strong> ${leads.length}</div>
            <div><strong>Total Plant Value:</strong> ${formatINR(stats.totalPlantCost)}</div>
            <div><strong>Total Collected:</strong> <span style="color: #059669; font-weight: bold;">${formatINR(stats.totalPaid)}</span></div>
            <div><strong>Outstanding Balance:</strong> <span style="color: #b45309; font-weight: bold;">${formatINR(stats.totalBalanceLeft)}</span></div>
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer Name & Contact</th>
              <th>First Payment</th>
              <th>Total Plant Cost</th>
              <th>Total Paid</th>
              <th>Balance Left</th>
              <th>CRM Stage</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => { window.focus(); window.print(); }, 300);
        });
      </script>
    </body>
    </html>
  `;
}

export function printCustomerListReport(leads, title, stats = {}) {
  if (!leads || leads.length === 0) return;
  const html = generateCustomerListPrintHtml(leads, title, stats);
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) {
    alert('Please allow pop-ups for this site to print reports.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
