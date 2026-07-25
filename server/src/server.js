import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './config/db.js';
import authRouter from './routes/auth.js';
import invitationsRouter from './routes/invitations.js';
import vendorRouter from './routes/vendor.js';
import vendorsRouter from './routes/vendors.js';
import applicationsRouter from './routes/applications.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import invoicesRouter from './routes/invoices.js';
import documentsRouter from './routes/documents.js'; // Added documents route
import settingsRouter from './routes/settings.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "object-src": ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/vendor', vendorRouter); // Public onboarding route
app.use('/api/applications', applicationsRouter);
app.use('/api/vendors', vendorsRouter); // Vendor Master internal route
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/documents', documentsRouter); // Added documents route
app.use('/api/settings', settingsRouter);

// Serve uploaded documents
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    await db.run('SELECT 1');
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: error.message });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const db = await getDb();
    
    // Vendor Master Stats
    const totalVendors = await db.get('SELECT COUNT(*) as count FROM vendors');
    const activeVendors = await db.get('SELECT COUNT(*) as count FROM vendors WHERE status = ?', ['Active']);
    const suspendedVendors = await db.get('SELECT COUNT(*) as count FROM vendors WHERE status = ?', ['Suspended']);
    
    // Application Stats
    const pendingQuery = await db.get('SELECT COUNT(*) as count FROM vendor_applications WHERE status = ?', ['IN_REVIEW']);

    res.json([
      { name: 'Total Vendors', value: totalVendors?.count || 0, icon: 'FileText', color: 'text-blue-600', bg: 'bg-blue-100' },
      { name: 'Active Vendors', value: activeVendors?.count || 0, icon: 'CheckCircle2', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      { name: 'Suspended Vendors', value: suspendedVendors?.count || 0, icon: 'AlertCircle', color: 'text-amber-600', bg: 'bg-amber-100' },
      { name: 'Pending Approvals', value: pendingQuery?.count || 0, icon: 'Clock', color: 'text-purple-600', bg: 'bg-purple-100' }
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/dashboard/queue', async (req, res) => {
  try {
    const db = await getDb();
    const queue = await db.all(`
      SELECT 
        a.application_number as id, 
        p.legal_name as name, 
        b.industry_category as category, 
        a.status, 
        a.submitted_at as submitted
      FROM vendor_applications a
      LEFT JOIN vendor_company_profiles p ON a.id = p.application_id
      LEFT JOIN vendor_business_profiles b ON a.id = b.application_id
      WHERE a.status = 'IN_REVIEW'
      ORDER BY a.submitted_at DESC
      LIMIT 10
    `);

    // Format the date if needed, or send as is
    const formattedQueue = queue.map(q => ({
      ...q,
      submitted: q.submitted ? new Date(q.submitted).toLocaleDateString() : 'Unknown'
    }));

    res.json(formattedQueue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

app.get('/api/dashboard/activities', async (req, res) => {
  try {
    const db = await getDb();
    const activities = await db.all(`
      SELECT id, action as text, created_at as time
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const formattedActivities = activities.map(a => ({
      id: a.id.toString(),
      text: a.text,
      time: new Date(a.time).toLocaleString()
    }));

    res.json(formattedActivities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.get('/api/dashboard/system-metrics', async (req, res) => {
  try {
    const db = await getDb();
    const poCount = await db.get('SELECT COUNT(*) as count FROM purchase_orders');
    const invoiceCount = await db.get('SELECT COUNT(*) as count FROM purchase_invoices');
    const paymentSum = await db.get('SELECT SUM(grand_total) as total FROM purchase_invoices WHERE status = ?', ['Paid']);
    
    res.json([
      { label: 'Purchase Orders Issued', value: poCount?.count || 0 },
      { label: 'Invoices Received', value: invoiceCount?.count || 0 },
      { label: 'Total Payments Processed', value: paymentSum?.total ? `₹${paymentSum.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹0.00' }
    ]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system metrics' });
  }
});

app.get('/api/settings/mail', (req, res) => {
  res.json({
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromName: process.env.FROM_NAME || ''
  });
});

app.post('/api/settings/mail', (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromName } = req.body;
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    const updateEnv = (key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newValue = `${key}=${value.includes(' ') ? `"${value}"` : value}`;
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, newValue);
      } else {
        envContent += `\n${newValue}`;
      }
      process.env[key] = value;
    };

    if (smtpHost !== undefined) updateEnv('SMTP_HOST', smtpHost);
    if (smtpPort !== undefined) updateEnv('SMTP_PORT', smtpPort);
    if (smtpUser !== undefined) updateEnv('SMTP_USER', smtpUser);
    if (smtpPass !== undefined) updateEnv('SMTP_PASS', smtpPass);
    if (fromName !== undefined) updateEnv('FROM_NAME', fromName);

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    res.json({ message: 'Mail settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update mail settings' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function initDatabase() {
  try {
    const db = await getDb();
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.exec(schema);
    console.log('Database initialized successfully with SQLite schema.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Nexus API Server running on port ${PORT}`);
});

// Triggering restart for DB init
