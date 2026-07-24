import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Building2, Calendar, CheckCircle2, AlertCircle, XCircle, Clock, Banknote, FileBox, Receipt } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminInvoiceDetails({ invoiceId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Status actions state
  const [actionNotes, setActionNotes] = useState('');
  const [showStatusAction, setShowStatusAction] = useState(null); // 'Accept', 'Reject', 'Clarify'
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInvoice = async () => {
    try {
      const data = await apiClient(`/invoices/${invoiceId}`);
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handleStatusUpdate = async (status) => {
    if ((status === 'Rejected' || status === 'Clarification_Requested') && !actionNotes.trim()) {
      toast.error('Please provide notes for this action.');
      return;
    }
    
    setIsProcessing(true);
    try {
      await apiClient(`/invoices/${invoiceId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes: actionNotes })
      });
      
      toast.success(`Invoice marked as ${status.replace('_', ' ')}`);
      onClose(true);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };



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

  if (!invoice) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Error</h3>
            <p className="text-slate-500 mb-4">Could not load the invoice.</p>
            <button onClick={() => onClose(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Accepted': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
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
            <button onClick={() => onClose(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 flex flex-col lg:flex-row gap-6">
           
           {/* Left Column: Details */}
           <div className="flex-1 space-y-6">
              
              {/* Amounts Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-xl font-bold text-slate-900">₹{invoice.grand_total ? invoice.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</p>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PO Number</p>
                    <p className="text-base font-bold text-blue-600 truncate">{invoice.po_number}</p>
                 </div>
                 <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor</p>
                    <p className="text-base font-bold text-slate-900 truncate" title={invoice.vendor_name}>{invoice.vendor_name}</p>
                 </div>
              </div>

              {/* Status Action Panel */}
              {invoice.status === 'Submitted' && !showStatusAction && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Invoice Pending Review</h4>
                      <p className="text-xs text-slate-600">Please review the invoice and take appropriate action.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowStatusAction('Accept')} className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700">Accept</button>
                    <button onClick={() => setShowStatusAction('Reject')} className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700">Reject</button>
                  </div>
                </div>
              )}

              {invoice.status === 'Accepted' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-900">Invoice Accepted</h4>
                      <p className="text-xs text-emerald-700">This invoice has been accepted for payment.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Action Form */}
              {showStatusAction && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm animate-in fade-in zoom-in duration-200">
                   <h4 className="text-sm font-semibold text-slate-900 mb-2">
                     {showStatusAction === 'Accept' && 'Accept Invoice'}
                     {showStatusAction === 'Reject' && 'Reject Invoice'}
                   </h4>
                   <textarea
                     value={actionNotes}
                     onChange={(e) => setActionNotes(e.target.value)}
                     className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                     rows="3"
                     placeholder={showStatusAction === 'Accept' ? 'Add any approval notes (optional)' : 'Provide reason...'}
                   ></textarea>
                   <div className="flex justify-end gap-2">
                      <button onClick={() => setShowStatusAction(null)} className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded text-sm font-medium">Cancel</button>
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleStatusUpdate(showStatusAction === 'Accept' ? 'Accepted' : 'Rejected')}
                        className={`px-3 py-1.5 text-white rounded text-sm font-medium
                          ${showStatusAction === 'Accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        {isProcessing ? 'Processing...' : 'Confirm'}
                      </button>
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
                     <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Vendor Notes</p>
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
