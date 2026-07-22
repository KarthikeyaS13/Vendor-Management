import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { step1Schema } from '../../lib/schema';
import { useFormContext } from '../../context/FormContext';
import { ArrowRight, Building } from 'lucide-react';

const Step1CompanyInfo = () => {
  const { formData, updateFormData, nextStep } = useFormContext();
  
  const { register, getValues, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
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
          <Building className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Company Information</h2>
        <p className="text-sm text-slate-500 mt-1">Please enter your basic company details to start the registration.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mb-6">
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Vendor Name</label>
              <input type="text" {...register('vendorName', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="e.g. Acme Corp" />
              {errors.vendorName && <p className="mt-1 text-xs text-red-500">{errors.vendorName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Vendor Legal Name</label>
              <input type="text" {...register('vendorLegalName', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s.,]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="e.g. Acme Corporation Pvt. Ltd." />
              {errors.vendorLegalName && <p className="mt-1 text-xs text-red-500">{errors.vendorLegalName.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Address</label>
            <textarea {...register('address')} rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors resize-none" placeholder="123 Business Rd..." />
            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">City</label>
              <input type="text" {...register('city', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" />
              {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">State</label>
              <input type="text" {...register('state', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" />
              {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Country</label>
              <input type="text" {...register('country', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" />
              {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">PIN Code</label>
              <input type="text" maxLength={6} {...register('pinCode', { onChange: (e) => e.target.value = e.target.value.replace(/\D/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="6 digits" />
              {errors.pinCode && <p className="mt-1 text-xs text-red-500">{errors.pinCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Primary Email</label>
              <input type="email" {...register('email1')} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="contact@acme.com" />
              {errors.email1 && <p className="mt-1 text-xs text-red-500">{errors.email1.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Secondary Email</label>
              <input type="email" {...register('email2')} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" />
              {errors.email2 && <p className="mt-1 text-xs text-red-500">{errors.email2.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Contact Person</label>
              <input type="text" {...register('contactPerson', { onChange: (e) => e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="John Doe" />
              {errors.contactPerson && <p className="mt-1 text-xs text-red-500">{errors.contactPerson.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Mobile Number</label>
              <input type="text" maxLength={10} {...register('contactPhone', { onChange: (e) => e.target.value = e.target.value.replace(/\D/g, '') })} className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none focus:bg-white transition-colors" placeholder="10 digits" />
              {errors.contactPhone && <p className="mt-1 text-xs text-red-500">{errors.contactPhone.message}</p>}
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-end items-center mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => { const { uploadedDocuments, ...restData } = getValues(); updateFormData(restData); nextStep(); }} className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold shadow-md shadow-blue-700/20 transition-all flex items-center">
            Next Step <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
};

export default Step1CompanyInfo;
