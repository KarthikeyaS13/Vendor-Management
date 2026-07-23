import { z } from 'zod';

export const step1Schema = z.object({
  vendorName: z.string().min(1, 'Vendor Name is required'),
  vendorLegalName: z.string().min(1, 'Vendor Legal Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  pinCode: z.string().regex(/^\d{6}$/, 'PIN code must be exactly 6 digits'),
  email1: z.string().email('Invalid email'),
  email2: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPerson: z.string().min(1, 'Contact Person is required'),
  contactPhone: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
});

export const step2Schema = z.object({
  vendorType: z.string().min(1, 'Vendor Type is required'),
  vendorCategory: z.string().min(1, 'Vendor Category is required'),
  entityType: z.string().min(1, 'Entity Type is required'),
  cin: z.string()
    .trim()
    .toUpperCase()
    .max(21, 'CIN must be at most 21 characters.')
    .regex(/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/, 'Please enter a valid CIN number.')
    .or(z.literal(''))
    .optional(),
  pan: z.string()
    .trim()
    .toUpperCase()
    .length(10, 'PAN must be exactly 10 characters.')
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Enter a valid PAN number.'),
  tan: z.string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}[0-9]{5}[A-Z]$/, 'Enter a valid TAN number.')
    .or(z.literal(''))
    .optional(),
  gstin: z.string()
    .trim()
    .toUpperCase()
    .length(15, 'GSTIN must be exactly 15 characters.')
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/, 'Invalid GSTIN format'),
  pfRegistration: z.string()
    .trim()
    .regex(/^[A-Za-z0-9\/-]{5,30}$/, 'Invalid PF Registration Number')
    .or(z.literal(''))
    .optional(),
  esiRegistration: z.string()
    .trim()
    .regex(/^\d{10,17}$/, 'Enter valid ESI Registration Number.')
    .or(z.literal(''))
    .optional(),
  labourRegistration: z.string()
    .trim()
    .regex(/^[A-Za-z0-9\/]{5,30}$/, 'Invalid Labour License Number')
    .or(z.literal(''))
    .optional(),
  itFiling: z.string().min(1, 'IT Filing is required'),
  gstFiling: z.string().min(1, 'GST Filing is required')
}).superRefine((data, ctx) => {
  // Cross validation for GSTIN and PAN
  if (data.pan && data.gstin) {
    const panFromGst = data.gstin.substring(2, 12);
    if (panFromGst !== data.pan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PAN and GSTIN do not belong to the same entity.',
        path: ['gstin']
      });
    }
  }

  // CIN required for certain entity types
  const requiresCin = ['Private Limited', 'Public Limited', 'OPC'].includes(data.entityType);
  if (requiresCin && (!data.cin || data.cin.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please enter a valid CIN number.',
      path: ['cin']
    });
  }
});

export const step3Schema = z.object({
  bankName: z.string().min(1, 'Bank Name is required'),
  bankBranch: z.string().min(1, 'Branch Name is required'),
  accountNumber: z.string().min(1, 'Account Number is required'),
  accountType: z.string().min(1, 'Account Type is required'),
  ifsc: z.string().min(1, 'IFSC Code is required')
});
