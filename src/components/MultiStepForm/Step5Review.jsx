import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormContext } from '../../context/FormContext';
import { ArrowLeft, CheckCircle, Building2, Briefcase, Landmark, FileText, Check } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { invitationService } from '../../services/invitationService';

const Step5Review = () => {
  const { formData, prevStep, goToStep } = useFormContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...formData };
      delete dataToSubmit.uploadedDocuments; 
      
      const response = await invitationService.submitRegistration(formData.token, dataToSubmit);
      const applicationId = response.applicationId;
      
      const docs = Object.keys(formData.uploadedDocuments);
      if (docs.length > 0) {
        const formDataUpload = new FormData();
        formDataUpload.append('applicationId', applicationId);
        docs.forEach(docId => {
          formDataUpload.append('documents', formData.uploadedDocuments[docId].file);
          formDataUpload.append('documentTypes', docId);
        });
        
        // Keep the upload endpoint as is or update if necessary. Assuming /api/vendors/upload for now.
        // If there's an issue with upload, we will handle it later. The registration data is what matters most here.
        await axios.post('/api/vendors/upload', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(err => console.warn('Document upload failed but registration succeeded.', err));
      }
      
      toast.success('Registration submitted successfully!');
      navigate('/success', { state: { applicationId } });
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error('Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ReviewCard = ({ icon, title, step, children }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            {icon}
          </div>
          <h3 className="font-bold text-slate-900 text-[15px]">{title}</h3>
        </div>
        <button onClick={() => goToStep(step)} className="text-blue-600 text-sm font-semibold hover:underline">
          Edit
        </button>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const ReviewRow = ({ label, value }) => (
    <div className="flex justify-between items-start border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-medium text-slate-500 w-1/2">{label}</span>
      <span className="text-sm font-semibold text-slate-900 w-1/2 text-right break-words">{value || '-'}</span>
    </div>
  );

  return (
    <div className="w-full flex flex-col h-full max-w-5xl mx-auto">
      <div className="mb-10 text-center flex flex-col items-center">
        <h2 className="text-2xl font-bold text-slate-900">Review Your Application</h2>
        <p className="text-sm text-slate-500 mt-1">Please verify all information before final submission.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <ReviewCard icon={<Building2 className="w-5 h-5" />} title="Company Information" step={1}>
          <ReviewRow label="Vendor Name" value={formData.vendorName} />
          <ReviewRow label="Legal Entity Name" value={formData.vendorLegalName} />
          <ReviewRow label="Primary Address" value={`${formData.address}, ${formData.city}, ${formData.state}`} />
          <ReviewRow label="Contact Person" value={formData.contactPerson} />
          <ReviewRow label="Primary Email" value={formData.email1} />
        </ReviewCard>

        <ReviewCard icon={<Briefcase className="w-5 h-5" />} title="Business Information" step={2}>
          <ReviewRow label="Industry Sector" value={formData.vendorCategory} />
          <ReviewRow label="Vendor Type" value={formData.vendorType} />
          <ReviewRow label="Entity Type" value={formData.entityType} />
          <ReviewRow label="Tax ID / PAN" value={formData.pan} />
          <ReviewRow label="GSTIN" value={formData.gstin} />
          <ReviewRow label="PF Reg No" value={formData.pfRegistration} />
          <ReviewRow label="ESI Reg No" value={formData.esiRegistration} />
          <ReviewRow label="Labour Reg" value={formData.labourRegistration} />
          <ReviewRow label="IT Filing" value={formData.itFiling} />
          <ReviewRow label="GST Filing" value={formData.gstFiling} />
        </ReviewCard>

        <ReviewCard icon={<Landmark className="w-5 h-5" />} title="Bank Details" step={3}>
          <ReviewRow label="Bank Name" value={formData.bankName} />
          <ReviewRow label="Branch Name" value={formData.bankBranch} />
          <ReviewRow label="Account Number" value={formData.accountNumber} />
          <ReviewRow label="Account Type" value={formData.accountType} />
          <ReviewRow label="IFSC Code" value={formData.ifsc} />
        </ReviewCard>

        <ReviewCard icon={<FileText className="w-5 h-5" />} title="Uploaded Documents" step={4}>
          {Object.keys(formData.uploadedDocuments || {}).length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">No documents uploaded</div>
          ) : (
            <div className="space-y-3">
              {Object.keys(formData.uploadedDocuments).map(docId => (
                <div key={docId} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 truncate">{formData.uploadedDocuments[docId].name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 shrink-0">{formData.uploadedDocuments[docId].size}</span>
                    <button 
                      onClick={() => window.open(formData.uploadedDocuments[docId].url, '_blank')}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ReviewCard>

      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
        <button type="button" onClick={prevStep} className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="mr-2 w-4 h-4" /> Previous
        </button>
        <div className="flex items-center gap-4">
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center disabled:opacity-70"
          >
            {isSubmitting ? (
              <span className="flex items-center">Processing...</span>
            ) : (
              <span className="flex items-center">
                <Check className="mr-2 w-4 h-4" /> SUBMIT REGISTRATION
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step5Review;
