import React, { useState, useEffect, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel
} from '@tanstack/react-table';
import { Mail, Plus, Search, RefreshCw, Copy, Send, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import InviteVendorModal from '../components/Invitations/InviteVendorModal';
import VendorDetailsSlideOver from '../components/Invitations/VendorDetailsSlideOver';

export default function Invitations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Slide Over State
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Instead of just invitations, fetch unified applications data
      const response = await fetch('/api/applications');
      if (!response.ok) throw new Error('Failed to load data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      toast.error('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyLink = (e, token) => {
    e.stopPropagation(); // Prevent row click
    const url = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Registration link copied to clipboard');
  };

  const openSlideOver = async (row) => {
    // Fetch full details
    try {
      const response = await fetch(`/api/applications/${row.original.invitation_id}`);
      if (!response.ok) throw new Error('Failed to fetch details');
      const details = await response.json();
      setSelectedApplication(details);
      setIsSlideOverOpen(true);
    } catch (err) {
      toast.error('Failed to load application details');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pending: 'bg-amber-100 text-amber-700 border-amber-200',
      Opened: 'bg-blue-100 text-blue-700 border-blue-200',
      Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Expired: 'bg-rose-100 text-rose-700 border-rose-200',
      Cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
      SUBMITTED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      IN_REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-700 border-rose-200'
    };
    const style = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
    return (
      <span className={`px-2.5 py-1 text-xs font-medium border rounded-full ${style}`}>
        {status}
      </span>
    );
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'company_name',
        header: 'Company / Name',
        cell: info => (
          <div>
            <div className="font-medium text-slate-900">{info.getValue()}</div>
            <div className="text-slate-500 text-xs mt-0.5">{info.row.original.invitationId}</div>
          </div>
        ),
      },
      {
        accessorKey: 'contactPerson',
        header: 'Contact Person',
        cell: info => (
          <div>
            <div className="text-slate-900">{info.getValue() || 'N/A'}</div>
            <div className="text-slate-500 text-xs mt-0.5">{info.row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'invitation_date',
        header: 'Invitation Sent',
        cell: info => <div className="text-slate-600">{new Date(info.getValue()).toLocaleDateString()}</div>,
      },
      {
        accessorKey: 'display_status',
        header: 'Status',
        cell: info => getStatusBadge(info.getValue()),
      },
      {
        accessorKey: 'completion_percentage',
        header: 'Completion',
        cell: info => (
          <div className="flex items-center gap-2 w-full max-w-[100px]">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${info.getValue() === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                style={{ width: `${info.getValue()}%` }}
              ></div>
            </div>
            <span className="text-xs font-medium text-slate-600 w-8">{info.getValue()}%</span>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={(e) => copyLink(e, row.original.token)} // token might not be in the query unless we joined it. Wait, I didn't select token in backend!
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Copy Link"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={() => openSlideOver(row)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const updateApplicationStatus = async (status) => {
    if (!selectedApplication?.invitation?.id) return;
    
    try {
      const response = await fetch(`/api/applications/${selectedApplication.invitation.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success(`Application ${status.toLowerCase()} successfully!`);
      setIsSlideOverOpen(false);
      loadData(); // Refresh the table
    } catch (err) {
      toast.error('Failed to update application status');
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <Toaster position="top-right" />
      
      {/* ... header ... */}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Registrations</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage invitations and vendor applications across the lifecycle.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadData()}
            className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            Invite Vendor
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            type="text" 
            placeholder="Search by company or email..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* TanStack Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className={`px-6 py-4 font-semibold text-slate-700 ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ChevronUp className="w-4 h-4 text-slate-400" />,
                          desc: <ChevronDown className="w-4 h-4 text-slate-400" />,
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-medium">No registrations found</p>
                    <p className="text-slate-500 text-sm mt-1">Adjust your filters or invite a vendor.</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => openSlideOver(row)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {table.getRowModel().rows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 border border-slate-200 rounded text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 border border-slate-200 rounded text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <InviteVendorModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={loadData}
      />

      <VendorDetailsSlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        applicationData={selectedApplication}
        onApprove={() => updateApplicationStatus('APPROVED')}
        onReject={() => updateApplicationStatus('REJECTED')}
      />
    </div>
  );
}
