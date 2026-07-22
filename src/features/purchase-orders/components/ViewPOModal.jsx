import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Printer, Building2, MapPin, Calendar, CheckCircle2, FilePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

export default function ViewPOModal({ poId, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const res = await fetch(`/api/purchase-orders/${poId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await res.json();
        setPo(data);
      } catch (error) {
        console.error('Error fetching PO details:', error);
      } finally {
        setLoading(false);
      }
    };
    if (poId) {
      fetchPO();
    }
  }, [poId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-slate-600 font-medium">Loading Purchase Order...</span>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Error</h3>
            <p className="text-slate-500 mb-4">Could not load the Purchase Order.</p>
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Issued': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formattedDate = po.po_date ? new Date(po.po_date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : 'N/A';

  const handleDownloadPDF = () => {
    const element = document.getElementById('po-content-to-print');
    if (!element) return;

    const generate = () => {
      const opt = {
        margin:       10,
        filename:     `${po.po_number || 'Purchase_Order'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // We don't want the PDF to be split abruptly at signatures, so add pagebreak settings
      opt.pagebreak = { mode: ['avoid-all', 'css', 'legacy'] };
      
      window.html2pdf().set(opt).from(element).save();
    };

    if (window.html2pdf) {
      generate();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = generate;
      document.body.appendChild(script);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{po.po_number || 'Draft PO'}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(po.status)}`}>
              {po.status || 'Draft'}
            </span>
            {user?.role === 'VENDOR' && ['Approved', 'Submitted', 'Sent', 'Open', 'Issued'].includes(po.status) && (
              <button 
                onClick={() => {
                  onClose();
                  navigate(`/portal/invoices/new`, { state: { poId: po.id } });
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm ml-2"
              >
                <FilePlus className="w-4 h-4" />
                Submit Invoice
              </button>
            )}
            <button onClick={handleDownloadPDF} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors ml-2" title="Download PDF">
              <Download className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
          <div id="po-content-to-print" className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
            
            {/* Header section (Company vs Vendor) */}
            <div className="flex flex-col md:flex-row justify-between gap-6 mb-4 pb-4 border-b border-slate-100">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Buyer</h3>
                <h4 className="text-lg font-bold text-slate-900 mb-1">{po.company_name}</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.company_address}</p>
                {po.company_gstin && <p className="text-sm text-slate-600 mt-2"><span className="font-medium">GSTIN:</span> {po.company_gstin}</p>}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Vendor</h3>
                <h4 className="text-lg font-bold text-slate-900 mb-1">{po.vendor_name}</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.vendor_address}</p>
                {po.vendor_gstin && <p className="text-sm text-slate-600 mt-2"><span className="font-medium">GSTIN:</span> {po.vendor_gstin}</p>}
                {po.vendor_pan && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">PAN:</span> {po.vendor_pan}</p>}
              </div>
            </div>

            {/* Delivery Section */}
            <div className="mb-4 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Delivery Location
              </h3>
              {po.delivery_same_as_company ? (
                <>
                  <p className="text-sm text-slate-900 font-medium">{po.company_name}</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{po.company_address}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-900 font-medium whitespace-pre-wrap">{po.delivery_address}</p>
                  <p className="text-sm text-slate-600">
                    {po.delivery_city}, {po.delivery_state} - {po.delivery_pincode}
                  </p>
                  {(po.delivery_contact_person || po.delivery_phone) && (
                    <div className="mt-3 text-sm text-slate-600">
                      <p><span className="font-medium">Attn:</span> {po.delivery_contact_person}</p>
                      <p><span className="font-medium">Phone:</span> {po.delivery_phone}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Items Table */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Line Items</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">#</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right w-20">Qty</th>
                      <th className="px-3 py-2 text-right w-28">Rate (₹)</th>
                      <th className="px-3 py-2 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {po.items && po.items.filter(item => item.particulars?.trim() || item.quantity > 0 || item.rate > 0).length > 0 ? (
                      po.items.filter(item => item.particulars?.trim() || item.quantity > 0 || item.rate > 0).map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-1.5 text-center text-slate-500">{item.sl_no}</td>
                          <td className="px-3 py-1.5 text-slate-900">{item.particulars}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{item.quantity}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600">{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-900">{Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-3 py-4 text-center text-slate-500">No items found for this PO.</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/50">
                      <td colSpan="4" className="px-3 py-2 text-right font-bold text-slate-700">Grand Total</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700 text-base">
                        ₹ {(po.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Terms & Conditions */}
            {po.terms_and_conditions && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</h3>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap">
                  {po.terms_and_conditions}
                </div>
              </div>
            )}

            {/* Footer Signatures */}
            <div className="pt-2 flex justify-end">
              <div className="text-center">
                <div className="w-40 h-16 mb-1 flex items-center justify-center mx-auto">
                  {localStorage.getItem('companySignature') ? (
                     <img src={localStorage.getItem('companySignature')} alt="Authorized Signature" className="h-full object-contain mix-blend-multiply" />
                  ) : (
                     <div className="w-full h-8 border-b-2 border-slate-300"></div>
                  )}
                </div>
                <p className="font-bold text-slate-900 mb-1 text-sm">For {po.company_name}</p>
                <div className="w-40 border-t-2 border-slate-200 mx-auto pt-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Authorized Signatory</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
