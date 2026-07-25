import express from 'express';
import { getDb } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all options (public so vendors can see them)
router.get('/options', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM system_options ORDER BY category, value');
    
    // Group by category
    const options = {
      vendorType: [],
      vendorCategory: []
    };
    
    rows.forEach(row => {
      if (options[row.category]) {
        options[row.category].push({ id: row.id, value: row.value });
      }
    });
    
    res.json(options);
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ error: 'Failed to fetch options' });
  }
});

// Add a new option
router.post('/options', authenticateToken, async (req, res) => {
  const { category, value } = req.body;
  if (!category || !value) {
    return res.status(400).json({ error: 'Category and value are required' });
  }
  
  if (!['vendorType', 'vendorCategory'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const db = await getDb();
    const result = await db.run('INSERT INTO system_options (category, value) VALUES (?, ?)', [category, value]);
    res.status(201).json({ id: result.lastID, category, value });
  } catch (error) {
    console.error('Error adding option:', error);
    res.status(500).json({ error: 'Failed to add option (might be a duplicate)' });
  }
});

// Delete an option
router.delete('/options/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM system_options WHERE id = ?', [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting option:', error);
    res.status(500).json({ error: 'Failed to delete option' });
  }
});
// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM system_config');
    const config = {};
    rows.forEach(row => {
      try {
        config[row.key] = JSON.parse(row.value);
      } catch (e) {
        config[row.key] = row.value;
      }
    });
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Update a specific configuration
router.post('/config/:key', authenticateToken, async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  try {
    const db = await getDb();
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
    await db.run(
      'INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value RETURNING key',
      [key, stringValue]
    );
    res.status(200).json({ success: true, key, value: stringValue });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

export default router;
