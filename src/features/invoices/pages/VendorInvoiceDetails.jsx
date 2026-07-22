import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Building2, Calendar, CheckCircle2, Clock, XCircle, FileBox, Receipt } from 'lucide-react';

export default function VendorInvoiceDetails({ invoiceId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) fetchInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-slate-600 font-medium">Loading Invoice Details...</span>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Clarification_Requested': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Paid': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Invoice #{invoice.invoice_number}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
              {invoice.status.replace('_', ' ')}
            </span>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 flex flex-col lg:flex-row gap-6">
           
           {/* Left Column: Details */}
           <div className="flex-1 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-xl font-bold text-slate-900">₹{invoice.grand_total ? invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</p>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PO Number</p>
                    <p className="text-base font-bold text-blue-600 truncate">{invoice.po_number}</p>
                 </div>
              </div>

              {invoice.status === 'Paid' && (
                <div className="bg-white border border-purple-200 rounded-lg p-5">
                   <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4" /> Payment Completed
                   </h4>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-xs text-slate-500 mb-1">Payment Date</span>
                        <span className="font-medium text-slate-900">{new Date(invoice.payment_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 mb-1">Mode</span>
                        <span className="font-medium text-slate-900">{invoice.payment_mode || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500 mb-1">Bank Name</span>
                        <span className="font-medium text-slate-900">{invoice.bank_name || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-xs text-slate-500 mb-1">Reference / UTR</span>
                        <span className="font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded">{invoice.payment_reference || 'N/A'}</span>
                      </div>
                      {invoice.remarks && (
                        <div className="col-span-2">
                          <span className="block text-xs text-slate-500 mb-1">Remarks</span>
                          <span className="text-slate-700">{invoice.remarks}</span>
                        </div>
                      )}
                   </div>
                </div>
              )}

              {/* Line Items Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                   <h3 className="text-sm font-bold text-slate-700">Line Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 border-b border-slate-100 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Rate</th>
                        <th className="px-4 py-2 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {invoice.items && invoice.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-900">{item.particulars}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{item.supplied_quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-600">{Number(item.rate).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900">{Number(item.line_total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
           </div>

           {/* Right Column: Attachment */}
           <div className="lg:w-80 space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
                 <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FileBox className="w-4 h-4 text-slate-400" /> Attached Invoice
                    </h3>
                    {invoice.invoice_file && (
                      <a href={`/${invoice.invoice_file}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Download">
                         <Download className="w-4 h-4" />
                      </a>
                    )}
                 </div>
                 <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 min-h-[300px]">
                    {invoice.invoice_file ? (
                       invoice.invoice_file.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                         <img src={`/${invoice.invoice_file}`} alt="Invoice Document" className="max-w-full max-h-[500px] object-contain shadow-sm border border-slate-200 bg-white" />
                       ) : (
                         <div className="text-center">
                           <FileText className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                           <p className="text-sm text-slate-600 mb-4">PDF Document Uploaded</p>
                           <a href={`/${invoice.invoice_file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                              View Full Document
                           </a>
                         </div>
                       )
                    ) : (
                       <div className="text-center text-slate-400">
                         <FileBox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                         <p className="text-sm">No document attached</p>
                       </div>
                    )}
                 </div>
                 {invoice.notes && (
                   <div className="p-4 border-t border-slate-200 bg-yellow-50/50">
                     <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Your Notes</p>
                     <p className="text-sm text-slate-800 italic">"{invoice.notes}"</p>
                   </div>
                 )}
                 {invoice.rejection_reason && (
                   <div className="p-4 border-t border-red-200 bg-red-50">
                     <p className="text-xs font-semibold text-red-800 uppercase mb-1">Action Notes</p>
                     <p className="text-sm text-red-900">{invoice.rejection_reason}</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
