import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step3Schema } from '../../lib/schema';
import { useFormContext } from '../../context/FormContext';
import { ArrowLeft, ArrowRight, Info, ShieldCheck } from 'lucide-react';

const Step3BankDetails = () => {
  const { formData, updateFormData, nextStep, prevStep } = useFormContext();
  
  const { register, getValues, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: formData
  });

  const onSubmit = (data) => {
    updateFormData(data);
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
              <input type="text" maxLength={11} {...register('ifsc', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white uppercase transition-colors" placeholder="ABCD0123456" />
              {errors.ifsc && <p className="mt-1 text-xs text-red-500">{errors.ifsc.message}</p>}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 mt-2">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              We will perform a penny-drop verification to validate this account. Ensure the bank name matches your registered business name exactly to avoid rejection.
            </p>
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
