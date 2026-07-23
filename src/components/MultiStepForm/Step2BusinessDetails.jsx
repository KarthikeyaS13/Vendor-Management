import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step2Schema } from '../../lib/schema';
import { useFormContext } from '../../context/FormContext';
import { ArrowLeft, ArrowRight, Info, Check, UploadCloud, FileCheck, Eye, Trash2 } from 'lucide-react';

const Step2BusinessDetails = () => {
  const { formData, updateFormData, nextStep, prevStep, updateDocuments, removeDocument } = useFormContext();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { register, control, getValues, watch, handleSubmit, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: formData,
    mode: 'onChange'
  });

  const itFilingValue = watch('itFiling');

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
          updateDocuments('it_return', {
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

  const onSubmit = (data) => {
    const { uploadedDocuments, ...restData } = data;
    updateFormData(restData);
    nextStep();
  };

  const PillSelector = ({ options, name, label }) => (
    <div className="mb-6">
      <label className="text-sm font-semibold text-slate-900 mb-3 block">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => field.onChange(opt)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  field.value === opt 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      />
      {errors[name] && <p className="mt-2 text-xs text-red-500 font-medium">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Business Details</h2>
        <p className="text-sm text-slate-500 mt-1">Please provide your legal business identification and registration information.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Column - Form */}
        <div className="flex-1 space-y-8">
          
          <div>
            <div className="flex items-center gap-2 mb-4 text-blue-800">
              <span className="p-1.5 bg-blue-50 rounded-md">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider">Classification</h3>
            </div>
            
            <PillSelector 
              name="vendorType" 
              label="Vendor Type"
              options={["Manufacturer", "Distributor", "Service Provider", "Retailer", "Consultant"]}
            />
            
            <PillSelector 
              name="vendorCategory" 
              label="Vendor Category"
              options={["IT Services", "Office Supplies", "Logistics", "Raw Materials", "Marketing"]}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 text-blue-800">
              <span className="p-1.5 bg-blue-50 rounded-md">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider">Legal Identification</h3>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Entity Type</label>
                <select {...register('entityType')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="">Select Entity Type</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                  <option value="Proprietorship">Proprietorship</option>
                  <option value="Public Limited">Public Limited</option>
                  <option value="Others">Others</option>
                </select>
                {errors.entityType && <p className="mt-1 text-xs text-red-500">{errors.entityType.message}</p>}
              </div>

              {watch('entityType') !== 'Proprietorship' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">CIN/Registration Number</label>
                  <input type="text" {...register('cin', { onChange: e => e.target.value = e.target.value.toUpperCase() })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="U74999KA2023PTC123456" />
                  {errors.cin && <p className="mt-1 text-xs text-red-500">{errors.cin.message}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Permanent Account Number (PAN)</label>
                  <input type="text" {...register('pan', { onChange: e => e.target.value = e.target.value.toUpperCase() })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="ABCDE1234F" />
                  {errors.pan && <p className="mt-1 text-xs text-red-500">{errors.pan.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Tax Deduction Account Number (TAN)</label>
                  <input type="text" {...register('tan', { onChange: e => e.target.value = e.target.value.toUpperCase() })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="HYDA12345B" />
                  {errors.tan && <p className="mt-1 text-xs text-red-500">{errors.tan.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">GSTIN</label>
                <input type="text" {...register('gstin', { onChange: e => e.target.value = e.target.value.toUpperCase() })} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="29ABCDE1234F1Z5" />
                {errors.gstin && <p className="mt-1 text-xs text-red-500">{errors.gstin.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4 text-blue-800">
              <span className="p-1.5 bg-blue-50 rounded-md">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider">Additional Registrations & Compliance</h3>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">PF Reg No</label>
                  <input type="text" {...register('pfRegistration')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="" />
                  {errors.pfRegistration && <p className="mt-1 text-xs text-red-500">{errors.pfRegistration.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">ESI Reg No</label>
                  <input type="text" {...register('esiRegistration')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="" />
                  {errors.esiRegistration && <p className="mt-1 text-xs text-red-500">{errors.esiRegistration.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Labour License (If applicable)</label>
                <input type="text" {...register('labourRegistration')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="" />
                {errors.labourRegistration && <p className="mt-1 text-xs text-red-500">{errors.labourRegistration.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">IT Filing (Y/N)</label>
                  <select {...register('itFiling')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {errors.itFiling && <p className="mt-1 text-xs text-red-500">{errors.itFiling.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">GST Filings (Y/N)</label>
                  <select {...register('gstFiling')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {errors.gstFiling && <p className="mt-1 text-xs text-red-500">{errors.gstFiling.message}</p>}
                </div>
              </div>

              {/* Conditional IT Return Upload */}
              {itFilingValue === 'Yes' && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-2">
                  <div className="mb-3">
                    <label className="text-sm font-medium text-slate-700 block">Upload IT Return Document</label>
                    <p className="text-xs text-slate-500 mt-1">Please provide your latest Income Tax Return for verification.</p>
                  </div>
                  
                  {formData.uploadedDocuments?.it_return ? (
                    <div className="flex items-center justify-between bg-white border border-green-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <FileCheck className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{formData.uploadedDocuments.it_return.name}</p>
                          <p className="text-xs text-slate-500">{formData.uploadedDocuments.it_return.size}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => window.open(formData.uploadedDocuments.it_return.url, '_blank')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => removeDocument('it_return')} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : uploading ? (
                    <div className="bg-white border border-blue-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-blue-600">Uploading Document...</span>
                        <span className="font-bold text-blue-700">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <label className="relative block cursor-pointer">
                      <input type="file" className="hidden" onChange={(e) => handleFileUpload(e.target.files[0])} accept=".pdf" />
                      <div className="w-full py-3 bg-white border border-dashed border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <UploadCloud className="w-5 h-5" />
                        Upload IT Return PDF
                      </div>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-200" />
              <h4 className="font-bold">Document Guide</h4>
            </div>
            <p className="text-sm text-blue-50 leading-relaxed mb-4">
              Please ensure all numbers match your physical documents. You will be required to upload copies in the next step.
            </p>
            <ul className="text-sm text-blue-100 space-y-3">
              <li className="flex gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>CIN is required for all Corporate entities.</span>
              </li>
              <li className="flex gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
                <span>PAN and GSTIN are mandatory for verification.</span>
              </li>
            </ul>
          </div>


        </div>
      </div>

      <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 w-4 h-4" /> Previous
        </button>
        <div className="flex items-center gap-4">
          <button 
            type="submit" 
            disabled={!isValid}
            className={`px-6 py-2.5 rounded-lg text-white text-sm font-bold shadow-md transition-all flex items-center ${isValid ? 'bg-blue-700 hover:bg-blue-800 shadow-blue-700/20' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Next Step <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step2BusinessDetails;
