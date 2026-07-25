import React, { useState } from 'react';
import { useFormContext } from '../../context/FormContext';
import { ArrowLeft, ArrowRight, UploadCloud, FileText, CheckCircle2, RefreshCw, Trash2, ShieldCheck, FileCheck, Eye } from 'lucide-react';

const Step4DocumentUpload = () => {
  const { formData, updateDocuments, removeDocument, nextStep, prevStep } = useFormContext();
  const [uploading, setUploading] = useState({});
  const [progress, setProgress] = useState({});
  const [validationError, setValidationError] = useState('');

  const requiredDocuments = [
    { id: 'coi', name: 'COI', description: 'Certificate of Incorporation', summary: 'Proof of legal company registration and existence', icon: <ShieldCheck className="w-5 h-5 text-green-600" /> },
    { id: 'aoa', name: 'AOA', description: 'Articles of Association', summary: 'Rules for company\'s internal management and operations', icon: <UploadCloud className="w-5 h-5 text-blue-500" /> },
    { id: 'moa', name: 'MOA', description: 'Memorandum of Association', summary: 'Company\'s constitution and scope of business', icon: <UploadCloud className="w-5 h-5 text-blue-500" /> },
    { id: 'msme', name: 'MSME Certificate', description: 'Micro, Small & Medium Enterprise', summary: 'Government recognition for small/medium businesses', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'pan', name: 'PAN Copy *', description: 'Permanent Account Number (Mandatory)', summary: 'Indian Income Tax identification number', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'tan', name: 'TAN Copy', description: 'Tax Deduction & Collection', summary: 'Tax deduction and collection account number', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'gst', name: 'GST Certificate *', description: 'Goods & Services Tax (Mandatory)', summary: 'Proof of Goods and Services Tax registration', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'pf_reg', name: 'PF Reg', description: 'PF Registration Copy', summary: 'Employee Provident Fund registration proof', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'esi_reg', name: 'ESI Reg', description: 'ESI Registration Copy', summary: 'Employee State Insurance registration proof', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'labour_reg', name: 'Labour Reg', description: 'Labour Registration Copy', summary: 'Compliance with state labor laws', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'fssai_reg', name: 'FSSAI Reg', description: 'FSSAI Registration Copy', summary: 'Food safety and standards authority license', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'ph3', name: 'Other Docs', description: 'Additional Document 1', summary: 'Any other supporting documentation', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'ph4', name: 'Other Docs', description: 'Additional Document 2', summary: 'Any other supporting documentation', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'service_terms', name: 'Service Terms', description: 'Service Terms Agreement', summary: 'Signed agreement for service delivery conditions', icon: <FileText className="w-5 h-5 text-slate-400" /> },
    { id: 'payment_terms', name: 'Payment Terms', description: 'Payment Terms Agreement', summary: 'Signed agreement for payment conditions', icon: <FileText className="w-5 h-5 text-slate-400" /> }
  ];

  if (formData.itFiling === 'Yes') {
    requiredDocuments.push({
      id: 'it_return', 
      name: 'IT Return', 
      description: 'Income Tax Return Document', 
      summary: 'Recent Income Tax Return filing proof',
      icon: <FileText className="w-5 h-5 text-slate-400" />
    });
  }

  const handleFileUpload = (docId, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [docId]: true }));
    setProgress(prev => ({ ...prev, [docId]: 0 }));
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(prev => ({ ...prev, [docId]: currentProgress }));
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploading(prev => ({ ...prev, [docId]: false }));
          updateDocuments(docId, {
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            status: 'Uploaded',
            url: URL.createObjectURL(file),
            file: file
          });
          // Clear validation error if a missing document is uploaded
          if (docId === 'pan' || docId === 'gst') {
            setValidationError('');
          }
        }, 500);
      }
    }, 200);
  };

  const handleNextStep = () => {
    const missingDocs = [];
    if (!formData.uploadedDocuments?.pan) missingDocs.push('PAN Copy');
    if (!formData.uploadedDocuments?.gst) missingDocs.push('GST Certificate');

    if (missingDocs.length > 0) {
      setValidationError(`Please upload mandatory documents: ${missingDocs.join(' and ')}`);
      return;
    }

    setValidationError('');
    nextStep();
  };

  const DocumentCard = ({ doc }) => {
    const isUploaded = formData.uploadedDocuments?.[doc.id];
    const isUploading = uploading[doc.id];
    const uploadProgress = progress[doc.id] || 0;

    return (
      <div className={`border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shadow-sm transition-all ${
        isUploaded ? 'border-green-200 shadow-green-100' : 
        isUploading ? 'border-blue-300 shadow-blue-100 ring-1 ring-blue-100' : 'border-slate-200 hover:border-blue-300'
      }`}>
        {/* Left: Icon and Details */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-slate-100 bg-slate-50">
            {isUploaded ? <ShieldCheck className="w-5 h-5 text-green-600" /> : isUploading ? <UploadCloud className="w-5 h-5 text-blue-500" /> : doc.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-[14px] sm:text-[15px] truncate">{doc.name}</h3>
              {isUploaded && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[9px] font-bold rounded-full uppercase tracking-wider shrink-0">Uploaded</span>}
            </div>
            <p className="text-[12px] font-medium text-slate-600 truncate">{doc.description}</p>
            {doc.summary && <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.summary}</p>}
          </div>
        </div>
        
        {/* Right: Actions / Status */}
        <div className="w-full sm:w-auto shrink-0 sm:min-w-[280px] flex justify-end">
          {isUploaded ? (
            <div className="flex items-center justify-end gap-2 w-full">
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 flex items-center gap-2 min-w-0">
                <FileCheck className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs font-semibold text-slate-700 truncate">{isUploaded.name}</p>
              </div>
              <button type="button" onClick={() => window.open(isUploaded.url, '_blank')} className="p-1.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shrink-0" title="Preview">
                <Eye className="w-4 h-4" />
              </button>
              <button type="button" className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0" title="Re-upload">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => removeDocument(doc.id)} className="p-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col gap-1.5 w-full sm:max-w-[200px]">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-blue-600">Uploading... {uploadProgress}%</span>
                <button type="button" onClick={() => setUploading(prev => ({ ...prev, [doc.id]: false }))} className="text-[10px] text-slate-400 hover:text-red-500 transition-colors">Cancel</button>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          ) : (
            <label className="relative w-full sm:w-auto block cursor-pointer">
              <input type="file" className="hidden" onChange={(e) => handleFileUpload(doc.id, e.target.files[0])} />
              <div className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                Upload Document
              </div>
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full max-w-5xl mx-auto">
      <div className="mb-10 text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold text-slate-900">Upload Required Documents</h2>
        <p className="text-sm text-slate-500 mt-1">Please provide the following legal and operational certificates to complete your application.</p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {requiredDocuments.map(doc => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>

      {validationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <div className="text-red-500 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <p className="text-sm text-red-700 font-medium">{validationError}</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-4 pt-6 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 w-4 h-4" /> Previous
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleNextStep} className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md shadow-blue-700/20 transition-all flex items-center">
            Next Step <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step4DocumentUpload;
