import { ArrowLeft, Printer, Check, X } from 'lucide-react';
import { useEffect } from 'react';
import VoucherBillDocument from './VoucherBillDocument';

export default function VoucherBillPreviewModal({
  open,
  onClose,
  draftVoucher,
  title = 'Bill Preview',
  subtitle,
  onConfirm,
  confirmLabel = 'Confirm & Continue',
  showPrint = true,
  confirmDisabled = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !draftVoucher) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-[#f5f6f8]"
      role="dialog"
      aria-modal="true"
    >
      <div className="no-print shrink-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="btn-secondary text-sm gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Edit
            </button>
            {showPrint && (
              <button type="button" onClick={() => window.print()} className="btn-secondary text-sm gap-1.5">
                <Printer className="w-4 h-4" /> Print
              </button>
            )}
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled}
                className="btn-primary text-sm gap-1.5 disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {confirmLabel}
              </button>
            )}            {!onConfirm && (
              <button type="button" onClick={onClose} className="btn-secondary p-2" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <VoucherBillDocument voucher={draftVoucher} styled isDraft />
        </div>
      </div>
    </div>
  );
}
