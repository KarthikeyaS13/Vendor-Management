import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Download, Eye, Calendar, User } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import DocumentViewerModal from '../components/DocumentViewerModal';

export default function PODocumentDetails() {
  const { id } = useParams();
  const [poNumber, setPoNumber] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, [id]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/documents/purchase-orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setPoNumber(data.po_number);
      setDocuments(data.documents);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[
          { label: 'Purchase Orders', path: '/documents/purchase-orders' },
          { label: poNumber || 'PO Documents' }
        ]} />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-on">{poNumber}</h1>
        <p className="text-surface-on-variant mt-1">All documents associated with this purchase order, including vendor invoices.</p>
      </div>

      <div className="bg-surface border border-outline rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-lowest border-b border-outline">
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Document Name</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Category</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Uploaded Date</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant">Uploaded By</th>
                <th className="py-4 px-6 text-sm font-semibold text-surface-on-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-surface-on-variant">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                    Loading documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-surface-on-variant">
                    No documents found for this purchase order.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-outline hover:bg-surface-highest transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-primary/70 mr-3" />
                        <span className="font-medium text-surface-on">{doc.original_name || doc.file_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-surface-highest border border-outline">
                        {doc.document_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-surface-on-variant">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 opacity-50" />
                        {formatDate(doc.uploaded_at)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-surface-on-variant">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 opacity-50" />
                        {doc.uploaded_by}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-surface-highest text-surface-on hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={doc.file_path}
                        download={doc.original_name || doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-surface-highest text-surface-on hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
}
