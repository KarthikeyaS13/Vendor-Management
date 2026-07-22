import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ArrowLeft, ArrowRight, X, Receipt, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const steps = [
  { id: 1, title: 'Invoice Details', icon: Receipt },
  { id: 2, title: 'Line Items', icon: FileText },
  { id: 3, title: 'Upload & Review', icon: UploadCloud }
];

export default function InvoiceSubmissionWizard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    delivery_challan_reference: '',
    total_amount: 0,
    items: [],
    invoice_file: null,
    file_preview: null,
    notes: ''
  });

  useEffect(() => {
    if (!state?.poId) {
      toast.error('No Purchase Order selected');
      navigate('/portal/purchase-orders');
      return;
    }
    
    const fetchPO = async () => {
      try {
        const res = await fetch(`/api/purchase-orders/${state.poId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setPo(data);
        
        // Initialize items from PO
        if (data.items && data.items.length > 0) {
          const validItems = data.items.filter(item => {
            const remaining = item.quantity - (item.previously_invoiced_quantity || 0);
            return item.particulars && item.particulars.trim() !== '' && remaining > 0;
          });
          setFormData(prev => ({
            ...prev,
            items: validItems.map(item => {
              const remaining = item.quantity - (item.previously_invoiced_quantity || 0);
              return {
                ...item,
                remaining_quantity: remaining,
                invoice_quantity: remaining,
                invoice_rate: item.rate,
                invoice_value: remaining * item.rate,
                hsn_sac: '',
                gst_rate: 18
              };
            }),
            total_amount: validItems.reduce((sum, item) => {
              const remaining = item.quantity - (item.previously_invoiced_quantity || 0);
              const baseValue = remaining * item.rate;
              return sum + baseValue + (baseValue * 18 / 100);
            }, 0)
          }));
        }
      } catch (error) {
        console.error('Error fetching PO:', error);
        toast.error('Failed to load PO details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPO();
  }, [state, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      
      if (field === 'invoice_quantity' || field === 'invoice_rate' || field === 'gst_rate') {
        const qty = parseFloat(item.invoice_quantity) || 0;
        const rate = parseFloat(item.invoice_rate) || 0;
        const gst = parseFloat(item.gst_rate) || 0;
        // Invoice value includes GST
        const baseValue = qty * rate;
        item.invoice_value = baseValue + (baseValue * gst / 100);
      }
      
      newItems[index] = item;
      
      const total_amount = newItems.reduce((sum, currentItem) => sum + (currentItem.invoice_value || 0), 0);
      return { ...prev, items: newItems, total_amount };
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview for images
      let preview = null;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }
      
      setFormData(prev => ({
        ...prev,
        invoice_file: file,
        file_preview: preview
      }));
      if (errors.invoice_file) setErrors(prev => ({ ...prev, invoice_file: null }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.invoice_number.trim()) { newErrors.invoice_number = 'Invoice number is required'; isValid = false; }
      if (!formData.invoice_date) { newErrors.invoice_date = 'Invoice date is required'; isValid = false; }
    } else if (step === 2) {
      let hasItemError = false;
      formData.items.forEach((item, index) => {
        const qty = parseFloat(item.invoice_quantity);
        if (isNaN(qty) || qty <= 0) {
          newErrors[`item_${index}_quantity`] = 'Invalid qty';
          hasItemError = true;
        }
        if (qty > parseFloat(item.remaining_quantity)) {
           newErrors[`item_${index}_quantity`] = `Cannot exceed remaining qty (${item.remaining_quantity})`;
           hasItemError = true;
        }
      });
      if (hasItemError) isValid = false;
    } else if (step === 3) {
      if (!formData.invoice_file) { newErrors.invoice_file = 'Please upload a copy of the invoice'; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setIsSubmitting(true);
    try {
      const data = new FormData();
      const calculatedSubtotal = formData.items.reduce((sum, i) => sum + (i.invoice_quantity * i.invoice_rate), 0);
      const calculatedGstTotal = formData.items.reduce((sum, i) => sum + (i.invoice_quantity * i.invoice_rate * (i.gst_rate || 0) / 100), 0);
      const calculatedGrandTotal = calculatedSubtotal + calculatedGstTotal;

      const payload = {
        purchase_order_id: po.id,
        vendor_id: user.vendorId || po.vendor_id,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        delivery_challan_reference: formData.delivery_challan_reference,
        subtotal: calculatedSubtotal,
        gst_total: calculatedGstTotal,
        grand_total: calculatedGrandTotal,
        notes: formData.notes || '',
        items: formData.items.map(i => {
          const lineSubtotal = i.invoice_quantity * i.invoice_rate;
          const taxAmount = lineSubtotal * ((i.gst_rate || 0) / 100);
          return {
            purchase_order_item_id: i.id,
            ordered_quantity: i.quantity,
            supplied_quantity: i.invoice_quantity,
            hsn_code: i.hsn_sac || '',
            gst_rate: i.gst_rate || 0,
            rate: i.invoice_rate,
            tax_amount: taxAmount,
            line_total: lineSubtotal + taxAmount
          };
        })
      };
      
      data.append('data', JSON.stringify(payload));
      
      if (formData.invoice_file) {
        data.append('invoice_file', formData.invoice_file);
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: data
      });

      const responseData = await res.json();
      if (res.ok) {
        toast.success('Invoice submitted successfully');
        navigate('/portal/invoices');
      } else {
        toast.error(responseData.error || 'Failed to submit invoice');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An error occurred during submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] bg-slate-50 relative border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/portal/purchase-orders')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Submit Invoice for PO #{po?.po_number}</h2>
            <p className="text-sm text-slate-500">Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div 
                  key={step.id} 
                  className={`flex flex-col items-center relative z-10 ${isCompleted ? 'cursor-pointer group' : ''}`}
                  onClick={() => { if (isCompleted) setCurrentStep(step.id); }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                      ${isCompleted ? 'bg-blue-600 text-white group-hover:bg-blue-700 group-hover:scale-105 shadow-sm' : 
                        isCurrent ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' : 
                        'bg-slate-100 text-slate-400'}`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-4 h-4" />}
                  </div>
                  <span className={`mt-2 text-xs font-medium transition-colors ${
                    isCurrent ? 'text-slate-900' : 
                    isCompleted ? 'text-slate-700 group-hover:text-blue-700' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative -mt-5 mb-6 z-0">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2"></div>
             <div 
                className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-300"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
             ></div>
          </div>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          
          {/* STEP 1: Invoice Details */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Invoice Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.invoice_number ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
                    placeholder="e.g. INV-2023-001"
                  />
                  {errors.invoice_number && <p className="mt-1 text-xs text-red-600">{errors.invoice_number}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.invoice_date ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
                  />
                  {errors.invoice_date && <p className="mt-1 text-xs text-red-600">{errors.invoice_date}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ref Delivery Challan (Manual Entry)</label>
                  <input
                    type="text"
                    name="delivery_challan_reference"
                    value={formData.delivery_challan_reference}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. DC-001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Line Items */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Line Items</h3>
              <p className="text-xs text-slate-500 mb-2">Adjust the quantities you are invoicing for. You cannot invoice for more than the ordered quantity.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-3 border-b">Item</th>
                      <th className="px-4 py-3 border-b">HSN</th>
                      <th className="px-4 py-3 border-b text-right">Rem Qty</th>
                      <th className="px-4 py-3 border-b text-right">Inv Qty</th>
                      <th className="px-4 py-3 border-b text-right">Rate</th>
                      <th className="px-4 py-3 border-b text-right">GST %</th>
                      <th className="px-4 py-3 border-b text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, index) => {
                      const hasQtyErr = errors[`item_${index}_quantity`];
                      return (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-900">{item.particulars}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.hsn_sac || ''}
                              onChange={(e) => handleItemChange(index, 'hsn_sac', e.target.value)}
                              placeholder="HSN code"
                              className="w-24 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.remaining_quantity}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={item.remaining_quantity}
                              step="1"
                              value={item.invoice_quantity}
                              onChange={(e) => handleItemChange(index, 'invoice_quantity', e.target.value)}
                              className={`w-20 px-2 py-1 border rounded text-right focus:ring-1 focus:ring-blue-500 focus:outline-none ${hasQtyErr ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            />
                            {hasQtyErr && <p className="text-[10px] text-red-600 mt-1 block">{hasQtyErr}</p>}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{Number(item.invoice_rate).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <select
                              value={item.gst_rate}
                              onChange={(e) => handleItemChange(index, 'gst_rate', e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-right focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(item.invoice_value).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                      <td colSpan={6} className="px-4 py-3 text-right">Total Invoice Value</td>
                      <td className="px-4 py-3 text-right text-blue-700">₹ {formData.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Upload & Review */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">Upload Invoice Document</h3>
              
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Attach Physical/Digital Invoice (PDF or Image) *</label>
                
                <div className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${errors.invoice_file ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                   {formData.invoice_file ? (
                     <div className="space-y-3 w-full">
                        <div className="flex items-center justify-center gap-3">
                           <FileText className="w-8 h-8 text-blue-600" />
                           <div className="text-left">
                             <p className="font-medium text-slate-900 truncate max-w-xs">{formData.invoice_file.name}</p>
                             <p className="text-xs text-slate-500">{(formData.invoice_file.size / 1024 / 1024).toFixed(2)} MB</p>
                           </div>
                           <button 
                             onClick={() => setFormData(prev => ({ ...prev, invoice_file: null, file_preview: null }))}
                             className="ml-auto p-1 text-slate-400 hover:text-red-500 transition-colors"
                           >
                             <X className="w-5 h-5" />
                           </button>
                        </div>
                        {formData.file_preview && (
                          <div className="mt-4 border border-slate-200 rounded overflow-hidden max-h-48 flex justify-center bg-slate-100">
                             <img src={formData.file_preview} alt="Preview" className="h-full object-contain" />
                          </div>
                        )}
                     </div>
                   ) : (
                     <label className="cursor-pointer w-full flex flex-col items-center">
                        <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                        <span className="text-sm font-medium text-slate-700">Click to upload or drag and drop</span>
                        <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max 5MB)</span>
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                     </label>
                   )}
                </div>
                {errors.invoice_file && <p className="mt-1 text-sm text-red-600">{errors.invoice_file}</p>}
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any specific instructions or remarks..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items Preview */}
              <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-800">Line Items Preview</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-white text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">HSN</th>
                        <th className="px-4 py-2 text-right">Rem Qty</th>
                        <th className="px-4 py-2 text-right">Inv Qty</th>
                        <th className="px-4 py-2 text-right">Rate</th>
                        <th className="px-4 py-2 text-right">GST %</th>
                        <th className="px-4 py-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-slate-900">{item.particulars}</td>
                          <td className="px-4 py-2 text-slate-500">{item.hsn_sac || '-'}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{item.remaining_quantity}</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-700">{item.invoice_quantity}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{Number(item.invoice_rate).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{item.gst_rate}%</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900">{Number(item.invoice_value).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={6} className="px-4 py-2 text-right font-semibold text-slate-900">Total Invoice Value</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-700">₹ {formData.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Summary Box */}
              <div className="mt-8 bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex gap-4">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="text-sm text-slate-700">
                  <p className="font-medium text-slate-900 mb-1">Verify Information</p>
                  <p>You are about to submit Invoice <strong>{formData.invoice_number || 'N/A'}</strong> for the amount of <strong>₹{formData.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> against PO <strong>#{po?.po_number}</strong>. This action cannot be undone.</p>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 p-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/portal/purchase-orders')}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSubmitting}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
                ${currentStep === 1 || isSubmitting
                  ? 'text-slate-300 cursor-not-allowed' 
                  : 'text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Invoice
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
