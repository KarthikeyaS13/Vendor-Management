import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step3Schema } from '../../lib/schema';
import { useFormContext } from '../../context/FormContext';
import { ArrowLeft, ArrowRight, Info, ShieldCheck, UploadCloud, FileCheck, Eye, Trash2 } from 'lucide-react';

const Step3BankDetails = () => {
  const { formData, updateFormData, nextStep, prevStep, updateDocuments, removeDocument } = useFormContext();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = (file) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploading(false);
          updateDocuments('cancel_cheque', {
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            status: 'Uploaded',
            url: URL.createObjectURL(file),
            file: file
          });
        }, 300);
      }
    }, 200);
  };
  
  const { register, getValues, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: formData
  });

  const onSubmit = (data) => {
    const { uploadedDocuments, ...restData } = data;
    updateFormData(restData);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col h-full max-w-4xl mx-auto">
      <div className="mb-8 text-center flex flex-col items-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Financial Information</h2>
        <p className="text-sm text-slate-500 mt-1">Provide the bank account details for payment processing and verification.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-6">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Bank Account Number</label>
            <input type="text" maxLength={20} {...register('accountNumber', { onChange: (e) => e.target.value = e.target.value.replace(/\D/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="Enter full account number" />
            {errors.accountNumber && <p className="mt-1 text-xs text-red-500">{errors.accountNumber.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Bank Name</label>
              <input type="text" {...register('bankName', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="e.g. JPMorgan Chase" />
              {errors.bankName && <p className="mt-1 text-xs text-red-500">{errors.bankName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Account Type</label>
              <select {...register('accountType')} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors">
                <option value="">Select account type</option>
                <option value="Current">Current</option>
                <option value="Savings">Savings</option>
                <option value="Cash Credit">Cash Credit</option>
                <option value="Overdraft">Overdraft</option>
              </select>
              {errors.accountType && <p className="mt-1 text-xs text-red-500">{errors.accountType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Branch Name</label>
              <input type="text" {...register('bankBranch', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="City or Branch Code" />
              {errors.bankBranch && <p className="mt-1 text-xs text-red-500">{errors.bankBranch.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">IFSC / Swift Code</label>
              <input type="text" maxLength={11} {...register('ifsc', { onChange: (e) => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white uppercase transition-colors" placeholder="ABCD0123456" />
              {errors.ifsc && <p className="mt-1 text-xs text-red-500">{errors.ifsc.message}</p>}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
            <div className="flex gap-3 mb-4">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 leading-relaxed">
                Please upload a cancel cheque to revalidate your account. Ensure the bank name matches your registered business name exactly to avoid rejection.
              </p>
            </div>
            
            {/* Upload Area */}
            {formData.uploadedDocuments?.cancel_cheque ? (
              <div className="flex items-center justify-between bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{formData.uploadedDocuments.cancel_cheque.name}</p>
                    <p className="text-xs text-slate-500">{formData.uploadedDocuments.cancel_cheque.size}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => window.open(formData.uploadedDocuments.cancel_cheque.url, '_blank')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Preview">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => removeDocument('cancel_cheque')} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : uploading ? (
              <div className="bg-white border border-blue-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-blue-600">Uploading Cancel Cheque...</span>
                  <span className="font-bold text-blue-700">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            ) : (
              <label className="relative block cursor-pointer">
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0])} accept="image/*,.pdf" />
                <div className="w-full py-3 bg-white border border-dashed border-blue-300 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <UploadCloud className="w-5 h-5" />
                  Upload Cancel Cheque
                </div>
              </label>
            )}
          </div>
        </div>
      </div>



      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 w-4 h-4" /> Previous
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => { updateFormData(getValues()); nextStep(); }} className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md shadow-blue-700/20 transition-all flex items-center">
            Next Step <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step3BankDetails;
