import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, List } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import VoucherBillDocument from '../../components/VoucherBillDocument';
import { showApiError } from '../../utils/apiError';

export default function VoucherPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/stock/vouchers/${id}`)
      .then((res) => setVoucher(res.data))
      .catch((err) => showApiError(err, 'Could not load voucher for preview.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const title = voucher?.type === 'SELL' ? 'Sales Invoice Preview' : 'Purchase Bill Preview';

  return (
    <Layout module="stock">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 no-print">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/stock/vouchers')} className="btn-secondary p-2">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{loading ? 'Loading…' : title}</h1>
              {voucher && (
                <p className="text-sm text-gray-500">{voucher.voucherNumber} · Saved successfully</p>
              )}
            </div>
          </div>
          {voucher && (
            <div className="flex gap-2">
              <button type="button" onClick={() => navigate('/stock/vouchers')} className="btn-secondary gap-2">
                <List className="w-4 h-4" /> Voucher List
              </button>
              <button type="button" onClick={handlePrint} className="btn-primary gap-2">
                <Printer className="w-4 h-4" /> Print Bill
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading bill preview…</div>
        ) : voucher ? (
          <VoucherBillDocument voucher={voucher} styled />
        ) : (
          <div className="text-center py-20 text-gray-400">Voucher not found.</div>
        )}
      </div>
    </Layout>
  );
}
