import React, { createContext, useContext, useState } from 'react';

const FormContext = createContext();

export const useFormContext = () => {
  return useContext(FormContext);
};

export const FormProvider = ({ children, initialData = {} }) => {
  const [formData, setFormData] = useState({
    ...initialData,
    uploadedDocuments: {}
  });
  const [currentStep, setCurrentStep] = useState(1);

  const updateFormData = (newData) => {
    setFormData(prev => ({ ...prev, ...newData }));
  };

  const updateDocuments = (docId, fileData) => {
    setFormData(prev => ({
      ...prev,
      uploadedDocuments: {
        ...prev.uploadedDocuments,
        [docId]: fileData
      }
    }));
  };

  const removeDocument = (docId) => {
    setFormData(prev => {
      const newDocs = { ...prev.uploadedDocuments };
      delete newDocs[docId];
      return { ...prev, uploadedDocuments: newDocs };
    });
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);
  const goToStep = (step) => setCurrentStep(step);

  return (
    <FormContext.Provider value={{
      formData,
      updateFormData,
      updateDocuments,
      removeDocument,
      currentStep,
      nextStep,
      prevStep,
      goToStep
    }}>
      {children}
    </FormContext.Provider>
  );
};
