import { X, Download, FileText } from 'lucide-react';

export default function DocumentViewerModal({ document, onClose }) {
  if (!document) return null;

  const isImage = document.mime_type?.startsWith('image/');
  const isPdf = document.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      
      <div className="relative bg-surface rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline bg-surface">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-surface-on truncate pr-4">
              {document.original_name || document.file_name}
            </h3>
            <span className="text-sm text-surface-on-variant">
              {document.document_type}
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={document.file_path}
              download={document.original_name || document.file_name}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-surface-on bg-surface-highest border border-outline rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-10 h-10 text-surface-on-variant hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-surface-lowest p-6 flex items-center justify-center">
          {isImage ? (
            <img 
              src={document.file_path} 
              alt={document.file_name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-outline"
            />
          ) : isPdf ? (
            <iframe
              src={document.file_path}
              title={document.file_name}
              className="w-full h-full rounded-lg border border-outline shadow-sm bg-white"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-surface border border-outline rounded-xl max-w-md">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-surface-on mb-2">Preview Not Available</h4>
              <p className="text-surface-on-variant mb-6">
                This file type ({document.mime_type || 'Unknown'}) cannot be previewed directly in the browser.
              </p>
              <a
                href={document.file_path}
                download={document.original_name || document.file_name}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-primary-on bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
              >
                <Download className="w-5 h-5 mr-2" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
