import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step2Schema } from '../../lib/schema';
import { useFormContext } from '../../context/FormContext';
import { ArrowLeft, ArrowRight, Info, Check } from 'lucide-react';

const Step2BusinessDetails = () => {
  const { formData, updateFormData, nextStep, prevStep } = useFormContext();
  
  const { register, control, getValues, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: formData
  });

  const onSubmit = (data) => {
    updateFormData(data);
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
                </select>
                {errors.entityType && <p className="mt-1 text-xs text-red-500">{errors.entityType.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Corporate Identification Number (CIN)</label>
                <input type="text" {...register('cin')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="U12345DL2023PTC123456" />
                {errors.cin && <p className="mt-1 text-xs text-red-500">{errors.cin.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Permanent Account Number (PAN)</label>
                  <input type="text" {...register('pan')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="ABCDE1234F" />
                  {errors.pan && <p className="mt-1 text-xs text-red-500">{errors.pan.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Tax Deduction Account Number (TAN)</label>
                  <input type="text" {...register('tan')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="DELA12345B" />
                  {errors.tan && <p className="mt-1 text-xs text-red-500">{errors.tan.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">GSTIN</label>
                <input type="text" {...register('gstin')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase" placeholder="22AAAAA0000A1Z5" />
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
                  <input type="text" {...register('pfRegistration')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="NA if not applicable" />
                  {errors.pfRegistration && <p className="mt-1 text-xs text-red-500">{errors.pfRegistration.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">ESI Reg No</label>
                  <input type="text" {...register('esiRegistration')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="NA if not applicable" />
                  {errors.esiRegistration && <p className="mt-1 text-xs text-red-500">{errors.esiRegistration.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Labour (If applicable)</label>
                <input type="text" {...register('labourRegistration')} className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="NA if not applicable" />
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
          <button type="button" onClick={() => { updateFormData(getValues()); nextStep(); }} className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md shadow-blue-700/20 transition-all flex items-center">
            Next Step <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step2BusinessDetails;
