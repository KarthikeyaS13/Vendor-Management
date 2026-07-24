import React, { useState, useEffect } from 'react';
import { Search, Filter, Receipt, Calendar, Building2, CheckCircle2, Clock, XCircle, DollarSign, FileText } from 'lucide-react';
import AdminInvoiceDetails from './AdminInvoiceDetails';
import { apiClient } from '../../../services/apiClient';

export default function AdminInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Submitted');

  const fetchInvoices = async () => {
    try {
      const data = await apiClient('/invoices');
      if (Array.isArray(data)) {
        setInvoices(data);
      } else {
        console.error('Expected array, got:', data);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Submitted': return { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200', icon: Clock };
      case 'Accepted': return { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', icon: CheckCircle2 };
      case 'Rejected': return { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', icon: XCircle };
      case 'Clarification_Requested': return { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200', icon: Clock };
      case 'Paid': return { color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200', icon: CheckCircle2 };
      default: return { color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', icon: Clock };
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus === 'All') return true;
    return inv.status === filterStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Invoice Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review vendor invoices and process payments.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice Number, Vendor, or PO Number..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Pending Review</option>
            <option value="Accepted">Accepted for Payment</option>
            <option value="Clarification_Requested">Clarification Requested</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice Number</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    <div className="flex justify-center mb-2">
                       <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    </div>
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-base">No invoices found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const style = getStatusStyle(inv.status);
                  const StatusIcon = style.icon;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {inv.invoice_number}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="truncate max-w-[150px] inline-block">{inv.vendor_name || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-4 h-4" />
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {inv.grand_total ? inv.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => setSelectedInvoiceId(inv.id)}
                          className={`font-medium text-sm transition-colors ${inv.status === 'Accepted' ? 'text-emerald-600 hover:text-emerald-800' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          {inv.status === 'Accepted' ? 'Accepted' : 'Review'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoiceId && (
        <AdminInvoiceDetails 
          invoiceId={selectedInvoiceId} 
          onClose={(shouldRefresh) => {
             setSelectedInvoiceId(null);
             if (shouldRefresh) fetchInvoices();
          }} 
        />
      )}
    </div>
  );
}
