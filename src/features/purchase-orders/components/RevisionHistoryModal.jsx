import React, { useState, useEffect } from 'react';
import { X, Clock, FileText, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

export default function RevisionHistoryModal({ poId, onClose, onViewPO }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevisions = async () => {
      try {
        const data = await apiClient(`/purchase-orders/${poId}/revisions`);
        if (Array.isArray(data)) {
          setRevisions(data);
        }
      } catch (error) {
        console.error('Error fetching revisions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (poId) {
      fetchRevisions();
    }
  }, [poId]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Revision History</h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Track changes and previous versions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading history...</div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No revision history found.</div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {revisions.map((rev, index) => (
                <div key={rev.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Timeline dot */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                    {rev.is_latest_revision ? (
                      <div className="w-full h-full rounded-full bg-blue-500 border-4 border-blue-100 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Card */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative">
                    {rev.is_latest_revision && (
                      <span className="absolute -top-3 left-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        Current Version
                      </span>
                    )}
                    
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h4 className="font-semibold text-slate-900">{rev.po_number || 'Draft'}</h4>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Rev {rev.revision_number}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4">
                      {new Date(rev.edited_at).toLocaleString()}
                    </p>
                    
                    <button 
                      onClick={() => {
                        onClose();
                        onViewPO(rev.id);
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      View this version <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
