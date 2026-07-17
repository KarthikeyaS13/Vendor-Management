import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { invitationService } from '../services/invitationService';
import { FormProvider, useFormContext } from '../context/FormContext';
import Step1CompanyInfo from '../components/MultiStepForm/Step1CompanyInfo';
import Step2BusinessDetails from '../components/MultiStepForm/Step2BusinessDetails';
import Step3BankDetails from '../components/MultiStepForm/Step3BankDetails';
import Step4DocumentUpload from '../components/MultiStepForm/Step4DocumentUpload';
import Step5Review from '../components/MultiStepForm/Step5Review';
import { Toaster } from 'react-hot-toast';

const RegistrationWizard = () => {
  const { currentStep, goToStep } = useFormContext();

  const steps = [
    { id: 1, name: 'Company Info' },
    { id: 2, name: 'Business Details' },
    { id: 3, name: 'Bank Details' },
    { id: 4, name: 'Documents' },
    { id: 5, name: 'Review' }
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1CompanyInfo />;
      case 2: return <Step2BusinessDetails />;
      case 3: return <Step3BankDetails />;
      case 4: return <Step4DocumentUpload />;
      case 5: return <Step5Review />;
      default: return <Step1CompanyInfo />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto px-4">
        
        {/* Step Progress Indicator */}
        <div className="mb-8 bg-white p-4 pb-8 rounded-2xl shadow-sm border border-slate-200">
          <nav aria-label="Progress">
            <ol role="list" className="flex items-center justify-between">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'w-full' : ''}`}>
                  <div className="flex items-center">
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => {
                          if (step.id < currentStep) {
                            goToStep(step.id);
                          }
                        }}
                        disabled={step.id >= currentStep}
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors
                          ${step.id < currentStep 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' 
                            : step.id === currentStep
                              ? 'bg-blue-100 text-blue-600 border-2 border-blue-600 cursor-default'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                      >
                        {step.id < currentStep ? (
                          <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          step.id
                        )}
                      </button>
                      <span className="hidden sm:block absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-500 whitespace-nowrap">
                        {step.name}
                      </span>
                    </div>
                    {stepIdx !== steps.length - 1 ? (
                      <div className={`hidden sm:block absolute top-1/2 w-full h-1 bg-slate-200 left-10`} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {renderStep()}
      </div>
    </div>
  );
};

export default function Register() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);

  useEffect(() => {
    const validate = async () => {
      try {
        const data = await invitationService.validateToken(token);
        setInvitationData(data);
      } catch (err) {
        setError(err.message || 'Invitation Invalid or Expired');
      } finally {
        setLoading(false);
      }
    };
    if (token) validate();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-slate-200">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  const initialData = {
    token: token,
    vendorName: invitationData.companyName || '',
    vendorLegalName: invitationData.companyName || '',
    contactPerson: invitationData.contactPerson || '',
    email1: invitationData.email || '',
    contactPhone: invitationData.mobile || ''
  };

  return (
    <FormProvider initialData={initialData}>
      <RegistrationWizard />
    </FormProvider>
  );
}
