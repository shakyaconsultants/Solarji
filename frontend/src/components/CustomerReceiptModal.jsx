import { useState } from 'react';
import { Printer, X, CheckCircle2, Download, User, Phone, MapPin, Calendar, Banknote, IndianRupee, ShieldCheck } from 'lucide-react';
import { COMPANY } from '../constants/voucherBill';
import { formatINR, printCustomerReceipt } from '../utils/printReceipt';

export default function CustomerReceiptModal({ lead, onClose, singlePayment = null }) {
  if (!lead) return null;

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
  });

  const isFullSettlement = plantCost > 0 && remainingBalance === 0;

  const handlePrint = () => {
    printCustomerReceipt(lead, singlePayment);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="bg-gray-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Payment Receipt & Statement</h3>
              <p className="text-[11px] text-gray-400">Official SolarJi Customer Billing Document</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              title="Open full print dialog or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area */}
        <div className="p-6 max-h-[75vh] overflow-y-auto bg-gray-50/50 space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5">
            
            {/* Document Header */}
            <div className="flex items-start justify-between border-b-2 border-orange-500 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900">
                  Solar<span className="text-orange-500">Ji</span>
                </h1>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-0.5">
                  {COMPANY.tagline || 'Solar Installation & Energy Solutions'}
                </p>
                <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  <p>{COMPANY.address}</p>
                  <p>Phone: {COMPANY.phones?.join(', ') || '+91 7233050533'} · Email: {COMPANY.email || 'info@solarji.co.in'}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {singlePayment ? 'Official Receipt' : 'Account Statement'}
                </span>
                <p className="font-mono text-sm font-bold text-gray-800 mt-1.5">{receiptNo}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Date: {generatedDate}</p>
                <div className="mt-2">
                  <span className={`inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    isFullSettlement
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : totalPaid > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {isFullSettlement ? 'FULLY PAID' : totalPaid > 0 ? 'PARTIALLY PAID' : 'PAYMENT DUE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Project Info Boxes */}
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200">
                <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-2">
                  Customer Details
                </h4>
                <div className="space-y-1.5">
                  <p><span className="text-gray-500">Name:</span> <strong className="text-gray-900">{lead.name}</strong></p>
                  <p><span className="text-gray-500">Phone:</span> <span className="font-mono font-semibold text-gray-800">{lead.phone}</span></p>
                  {lead.email && <p><span className="text-gray-500">Email:</span> <span className="text-gray-700">{lead.email}</span></p>}
                  <p><span className="text-gray-500">Address:</span> <span className="text-gray-700">{[lead.address, lead.city].filter(Boolean).join(', ') || '—'}</span></p>
                  <p><span className="text-gray-500">System Capacity:</span> <span className="font-semibold text-gray-800">{lead.systemSize || 'Standard'}</span></p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-200">
                <h4 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-2">
                  Financial Summary
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Plant Cost:</span>
                    <strong className="text-gray-900">{formatINR(plantCost)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Received:</span>
                    <strong className="text-emerald-700">{formatINR(totalPaid)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Outstanding Due:</span>
                    <strong className={remainingBalance > 0 ? 'text-amber-800' : 'text-emerald-700'}>
                      {formatINR(remainingBalance)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Progress:</span>
                    <span className="font-bold text-gray-800">{percentPaid}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current CRM Stage:</span>
                    <span className="badge text-[10px] py-0.5 px-2 bg-white border border-gray-300">{lead.stage}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Installments Table */}
            <div>
              <h4 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Recorded Payment Installments ({payments.length})</span>
              </h4>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Remarks / Txn</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {(singlePayment ? [singlePayment] : sortedPayments).map((p, idx) => (
                      <tr key={p._id || idx} className="hover:bg-gray-50/70">
                        <td className="py-2 px-3 font-mono text-gray-400">
                          {idx + 1}
                          {!singlePayment && idx === 0 && (
                            <span className="ml-1 text-[9px] font-black bg-blue-100 text-blue-700 px-1 py-0.2 rounded">1ST</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-medium text-gray-800">
                          {new Date(p.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.method === 'account' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {p.method === 'account' ? 'Bank Account' : 'Cash'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-gray-900">
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-2 px-3 text-gray-500 max-w-[150px] truncate">
                          {p.note || '—'}
                        </td>
                        <td className="py-2 px-3 text-gray-400">
                          {p.recordedBy?.name || 'Staff'}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-gray-400 italic">
                          No payment installments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {payments.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                      <tr>
                        <td colSpan="3" className="py-2.5 px-3 text-right text-gray-600 uppercase text-[10px]">
                          {singlePayment ? 'Receipt Amount:' : 'Total Received:'}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-700 text-sm">
                          {formatINR(singlePayment ? singlePayment.amount : totalPaid)}
                        </td>
                        <td colSpan="2" className="py-2.5 px-3 text-gray-500 text-[11px] font-normal">
                          {singlePayment ? '' : `Remaining Balance: ${formatINR(remainingBalance)}`}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Document Bottom / Signatory */}
            <div className="pt-4 border-t border-gray-200 flex items-end justify-between text-[11px] text-gray-500">
              <div className="space-y-1">
                <p className="font-semibold text-gray-700">Official SolarJi Verification Note:</p>
                <p>This is a computer generated receipt & account statement from SolarJi CRM.</p>
                <p>For any queries, please reach out to +91 7233050533.</p>
              </div>

              <div className="text-center min-w-[160px]">
                <div className="text-[11px] font-bold text-orange-600 mb-6">For SolarJi</div>
                <div className="border-t border-gray-400 pt-1 text-[10px] font-semibold text-gray-700">
                  Authorized Signatory
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Clicking <strong className="text-gray-700">Print / Save PDF</strong> will open your system's print dialog to print or save as PDF.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-1.5 px-4 text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download Receipt</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
