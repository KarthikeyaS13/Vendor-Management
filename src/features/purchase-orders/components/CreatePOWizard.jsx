import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Save, X, Building2, FileText, Users, MapPin, CheckCircle2, List, FileSignature, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../../services/apiClient';

const steps = [
  { id: 1, title: 'PO Details', icon: FileText },
  { id: 2, title: 'Vendor Selection', icon: Users },
  { id: 3, title: 'Delivery Location', icon: MapPin },
  { id: 4, title: 'PO Item Details', icon: List },
  { id: 5, title: 'Terms & Review', icon: FileSignature },
];

export default function CreatePOWizard({ onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [vendors, setVendors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    id: null,
    // Auto-populated Company Details
    company_name: localStorage.getItem('brandName') || 'Finnovo',
    company_address: localStorage.getItem('companyAddress') || 'Madhapur Bhanu Elite Hitech City Hyderabad',
    company_gstin: localStorage.getItem('companyGst') || '',

    // Step 2: PO Details
    po_number: 'Draft - Auto Generated',
    po_date: new Date().toISOString().split('T')[0],

    // Step 3: Vendor Selection
    vendor_id: '',
    vendor_name: '',
    vendor_address: '',
    vendor_gstin: '',
    vendor_pan: '',

    // Step 4: Delivery Location
    delivery_same_as_company: true,
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_pincode: '',
    delivery_contact_person: '',
    delivery_phone: '',

    // Step 5: PO Item Details
    items: Array(5).fill().map((_, i) => ({
      sl_no: i + 1,
      particulars: '',
      quantity: '',
      rate: '',
      value: 0
    })),
    total_amount: 0,

    // Step 6: Terms & Conditions
    terms_and_conditions: ''
  });

  useEffect(() => {
    // Ensure we fetch the latest settings when the wizard opens
    setFormData(prev => ({
      ...prev,
      company_name: localStorage.getItem('brandName') || 'Finnovo',
      company_address: localStorage.getItem('companyAddress') || '123 Business Avenue, Tech District',
      company_gstin: localStorage.getItem('companyGst') || '',
    }));

    // Fetch accepted vendors
    const fetchVendors = async () => {
      try {
        const data = await apiClient('/vendors');
        // Filter for active/accepted vendors
        const activeVendors = data.filter(v => v.status === 'Active' || v.status === 'Accepted');
        setVendors(activeVendors);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };
    fetchVendors();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleVendorSelect = (e) => {
    const vendorId = e.target.value;
    const selectedVendor = vendors.find(v => v.id.toString() === vendorId);

    if (selectedVendor) {
      const fullAddress = [selectedVendor.address, selectedVendor.city, selectedVendor.state]
        .filter(Boolean)
        .join(', ');

      setFormData(prev => ({
        ...prev,
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.company_name || '',
        vendor_gstin: selectedVendor.gst_number || '',
        vendor_pan: selectedVendor.pan_number || '',
        vendor_address: fullAddress || 'Address not available'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vendor_id: '',
        vendor_name: '',
        vendor_address: '',
        vendor_gstin: '',
        vendor_pan: ''
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };

      if (field === 'quantity' || field === 'rate') {
        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        item.value = qty * rate;
      }

      newItems[index] = item;

      const total_amount = newItems.reduce((sum, currentItem) => sum + (currentItem.value || 0), 0);

      return { ...prev, items: newItems, total_amount };
    });
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sl_no: prev.items.length + 1,
          particulars: '',
          quantity: '',
          rate: '',
          value: 0
        }
      ]
    }));
  };

  const removeItemRow = (index) => {
    if (index < 5) return; // Do not allow deleting first 5 rows
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        sl_no: i + 1
      }));
      const total_amount = newItems.reduce((sum, item) => sum + (item.value || 0), 0);
      return { ...prev, items: newItems, total_amount };
    });
  };

  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.po_date) { newErrors.po_date = 'PO Date is required'; isValid = false; }
    } else if (step === 2) {
      if (!formData.vendor_id) { newErrors.vendor_id = 'Please select a vendor'; isValid = false; }
    } else if (step === 3) {
      if (!formData.delivery_same_as_company) {
        if (!formData.delivery_address) { newErrors.delivery_address = 'Address is required'; isValid = false; }
        if (!formData.delivery_city) { newErrors.delivery_city = 'City is required'; isValid = false; }
        if (!formData.delivery_state) { newErrors.delivery_state = 'State is required'; isValid = false; }
        if (!formData.delivery_pincode) { newErrors.delivery_pincode = 'Pincode is required'; isValid = false; }
        if (!formData.delivery_contact_person) { newErrors.delivery_contact_person = 'Contact Person is required'; isValid = false; }
        if (!formData.delivery_phone) { newErrors.delivery_phone = 'Phone Number is required'; isValid = false; }
      }
    } else if (step === 4) {
      let hasItemError = false;
      formData.items.forEach((item, index) => {
        if (item.particulars || item.quantity || item.rate) {
          if (!item.particulars) {
            newErrors[`item_${index}_particulars`] = 'Required';
            hasItemError = true;
          }
          const qty = parseFloat(item.quantity);
          if (isNaN(qty) || qty <= 0) {
            newErrors[`item_${index}_quantity`] = 'Invalid qty';
            hasItemError = true;
          }
          const rate = parseFloat(item.rate);
          if (isNaN(rate) || rate <= 0) {
            newErrors[`item_${index}_rate`] = 'Invalid rate';
            hasItemError = true;
          }
        }
      });
      // Need at least one valid item
      const filledItems = formData.items.filter(i => i.particulars && parseFloat(i.quantity) > 0 && parseFloat(i.rate) > 0);
      if (filledItems.length === 0) {
        newErrors.items = 'Please enter at least one valid item.';
        hasItemError = true;
      }
      if (hasItemError) isValid = false;
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

  const savePO = async (status) => {
    setIsSaving(true);
    try {
      const url = formData.id ? `/purchase-orders/${formData.id}` : '/purchase-orders';
      const method = formData.id ? 'PUT' : 'POST';

      const data = await apiClient(url, {
        method,
        body: JSON.stringify({ ...formData, status })
      });

      if (data.id && !formData.id) {
        setFormData(prev => ({ ...prev, id: data.id, po_number: data.po_number || prev.po_number }));
      }
      
      toast.success(formData.id ? 'Purchase Order updated!' : 'Purchase Order created!');
      return true;
    } catch (error) {
      console.error('Error saving PO:', error);
      toast.error('Error saving PO: ' + (error.message || 'Unknown error'));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (validateStep(currentStep)) {
      const success = await savePO('Draft');
      if (success) {
        onClose(true); // Close and refresh list if needed
      }
    }
  };

  const handleGeneratePO = async () => {
    if (validateStep(currentStep)) {
      const success = await savePO('Accepted');
      if (success) {
        toast.success('Purchase Order generated successfully!');
        onClose(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onClose(false)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Purchase Order</h2>
            <p className="text-sm text-slate-500">Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center relative z-10 ${isCompleted ? 'cursor-pointer group' : ''}`}
                  onClick={() => {
                    if (isCompleted) {
                      setCurrentStep(step.id);
                    }
                  }}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200
                      ${isCompleted ? 'bg-blue-600 text-white group-hover:bg-blue-700 group-hover:scale-105 shadow-sm' :
                        isCurrent ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' :
                          'bg-slate-100 text-slate-400'}`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className={`mt-2 text-xs font-medium transition-colors ${isCurrent ? 'text-slate-900' :
                      isCompleted ? 'text-slate-700 group-hover:text-blue-700' : 'text-slate-400'
                    }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative -mt-8 mb-8 z-0">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2"></div>
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">

          {/* STEP 1: PO DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Purchase Order Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    name="po_number"
                    value={formData.po_number}
                    readOnly
                    className="w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-slate-500">Auto-generated upon saving.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PO Date *</label>
                  <input
                    type="date"
                    name="po_date"
                    value={formData.po_date}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.po_date ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
                  />
                  {errors.po_date && <p className="mt-1 text-sm text-red-600">{errors.po_date}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VENDOR SELECTION */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Select Accepted Vendor</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vendor *</label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={handleVendorSelect}
                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.vendor_id ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}`}
                  >
                    <option value="">-- Select a Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.company_name} ({v.vendor_code})</option>
                    ))}
                  </select>
                  {errors.vendor_id && <p className="mt-1 text-sm text-red-600">{errors.vendor_id}</p>}
                </div>

                {formData.vendor_id && (
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Vendor Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Vendor Name</label>
                        <p className="text-sm text-slate-900 font-medium">{formData.vendor_name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">GSTIN</label>
                        <p className="text-sm text-slate-900">{formData.vendor_gstin || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">PAN</label>
                        <p className="text-sm text-slate-900">{formData.vendor_pan || 'N/A'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                        <p className="text-sm text-slate-900">{formData.vendor_address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: DELIVERY LOCATION */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Delivery Location</h3>

              <div className="space-y-6">

                <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="delivery_same_as_company"
                    name="delivery_same_as_company"
                    checked={!formData.delivery_same_as_company}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_same_as_company: !e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="delivery_same_as_company" className="text-sm font-medium text-slate-900">
                    Deliver to a Different Location
                  </label>
                </div>

                {formData.delivery_same_as_company ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Delivery Address</label>
                    <textarea
                      readOnly
                      value={formData.company_address}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-md cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500">Using company address from Settings.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address *</label>
                      <textarea
                        name="delivery_address"
                        value={formData.delivery_address}
                        onChange={handleInputChange}
                        rows={2}
                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.delivery_address ? 'border-red-300' : 'border-slate-300'}`}
                      />
                      {errors.delivery_address && <p className="mt-1 text-xs text-red-600">{errors.delivery_address}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                        <input
                          type="text"
                          name="delivery_city"
                          value={formData.delivery_city}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.delivery_city ? 'border-red-300' : 'border-slate-300'}`}
                        />
                        {errors.delivery_city && <p className="mt-1 text-xs text-red-600">{errors.delivery_city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                        <input
                          type="text"
                          name="delivery_state"
                          value={formData.delivery_state}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.delivery_state ? 'border-red-300' : 'border-slate-300'}`}
                        />
                        {errors.delivery_state && <p className="mt-1 text-xs text-red-600">{errors.delivery_state}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pincode *</label>
                        <input
                          type="text"
                          name="delivery_pincode"
                          value={formData.delivery_pincode}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.delivery_pincode ? 'border-red-300' : 'border-slate-300'}`}
                        />
                        {errors.delivery_pincode && <p className="mt-1 text-xs text-red-600">{errors.delivery_pincode}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label>
                        <input
                          type="text"
                          name="delivery_contact_person"
                          value={formData.delivery_contact_person}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.delivery_contact_person ? 'border-red-300' : 'border-slate-300'}`}
                        />
                        {errors.delivery_contact_person && <p className="mt-1 text-xs text-red-600">{errors.delivery_contact_person}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                        <input
                          type="text"
                          name="delivery_phone"
                          value={formData.delivery_phone}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.delivery_phone ? 'border-red-300' : 'border-slate-300'}`}
                        />
                        {errors.delivery_phone && <p className="mt-1 text-xs text-red-600">{errors.delivery_phone}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: PO ITEM DETAILS */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">PO Item Details</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg w-16">Sl No</th>
                      <th className="px-4 py-3 w-64">Particulars</th>
                      <th className="px-4 py-3 w-32 text-right">Quantity</th>
                      <th className="px-4 py-3 w-32 text-right">Rate (₹)</th>
                      <th className="px-4 py-3 w-32 text-right">Value (₹)</th>
                      <th className="px-4 py-3 rounded-tr-lg w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.items.map((item, index) => {
                      const hasParticularsErr = errors[`item_${index}_particulars`];
                      const hasQtyErr = errors[`item_${index}_quantity`];
                      const hasRateErr = errors[`item_${index}_rate`];

                      return (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-500">{item.sl_no}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.particulars}
                              onChange={(e) => handleItemChange(index, 'particulars', e.target.value)}
                              placeholder="Item description"
                              className={`w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none ${hasParticularsErr ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className={`w-full px-3 py-1.5 border rounded text-right focus:ring-1 focus:ring-blue-500 focus:outline-none ${hasQtyErr ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                              className={`w-full px-3 py-1.5 border rounded text-right focus:ring-1 focus:ring-blue-500 focus:outline-none ${hasRateErr ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {item.value.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {index >= 5 && (
                              <button
                                onClick={() => removeItemRow(index)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Remove Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                      <td colSpan={4} className="px-4 py-4 text-right rounded-bl-lg">Total Amount (₹)</td>
                      <td className="px-4 py-4 text-right text-blue-700 text-lg">
                        {formData.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="rounded-br-lg"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {errors.items && <p className="text-sm text-red-600 font-medium">{errors.items}</p>}

              <div>
                <button
                  onClick={addItemRow}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  + Add Item
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: TERMS & CONDITIONS & REVIEW */}
          {currentStep === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-4">Terms & Conditions</h3>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Terms & Conditions (Payment, Delivery, Warranty, etc.)</label>
                <textarea
                  name="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder="Enter payment terms, delivery terms, penalty clauses..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Company Declaration */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg space-y-4 text-sm text-slate-600 leading-relaxed">
                <p>This is a system-generated Purchase Order issued by the Procurement Department.</p>
                <p>All materials supplied against this Purchase Order shall comply with the agreed specifications, quality standards and delivery schedule.</p>
                <p>The supplier agrees to the terms and conditions mentioned above.</p>
                <p className="font-medium text-slate-500 italic">This Purchase Order is electronically generated and does not require a physical signature unless specifically requested.</p>

                <div className="pt-8 flex justify-end">
                  <div className="text-center">
                    <div className="w-48 h-20 mb-2 flex items-center justify-center mx-auto">
                      {localStorage.getItem('companySignature') ? (
                        <img src={localStorage.getItem('companySignature')} alt="Authorized Signature" className="h-full object-contain mix-blend-multiply" />
                      ) : (
                        <div className="w-40 h-16 border-2 border-dashed border-slate-300 bg-white rounded flex items-center justify-center text-slate-400">
                          <span className="text-xs">No Signature Uploaded</span>
                        </div>
                      )}
                    </div>
                    <p className="font-medium text-slate-800">For {formData.company_name || '<Company Name>'}</p>
                    <p className="text-xs text-slate-500 mt-1">Authorized Signatory</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border border-blue-100 bg-blue-50/30 p-6 rounded-lg">
                <h4 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  Purchase Order Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Buyer</p>
                    <p className="font-medium text-slate-900">{formData.company_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Vendor</p>
                    <p className="font-medium text-slate-900">{formData.vendor_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">PO Date</p>
                    <p className="font-medium text-slate-900">{formData.po_date || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Items</p>
                    <p className="font-medium text-slate-900">{formData.items.filter(i => i.particulars).length}</p>
                  </div>
                  <div className="col-span-2 md:col-span-4 border-t border-blue-100 pt-4 mt-2 flex justify-between items-center">
                    <p className="text-slate-500">Grand Total</p>
                    <p className="text-xl font-bold text-blue-700">₹ {formData.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Sticky Footer */}
      <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
                ${currentStep === 1 || isSaving
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleGeneratePO}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                Generate PO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
