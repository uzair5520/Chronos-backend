const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC NOT NULL,
      accent_color TEXT DEFAULT '#3a3d43',
      category TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM products');
  if (parseInt(rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO products (name, description, price, accent_color, category) VALUES
      ('The Meridian', 'Brushed steel, everyday precision.', 42500, '#3a3d43', 'Steel'),
      ('The Vantage', 'Chronograph built for pace.', 58900, '#46392a', 'Titanium'),
      ('The Noir', 'All-black case, sapphire crystal.', 61200, '#1c1c1e', 'Noir');
    `);
  }
}

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Public: list all products
app.get('/api/products', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
  res.json(rows);
});

// Public: get one product
app.get('/api/products/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Admin: add a product
app.post('/api/products', requireAdmin, async (req, res) => {
  const { name, description, price, accent_color, category } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
  const { rows } = await pool.query(
    'INSERT INTO products (name, description, price, accent_color, category) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, description || '', price, accent_color || '#3a3d43', category || '']
  );
  res.status(201).json(rows[0]);
});

// Admin: edit a product
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const { name, description, price, accent_color, category } = req.body;
  const { rows } = await pool.query(
    'UPDATE products SET name=$1, description=$2, price=$3, accent_color=$4, category=$5 WHERE id=$6 RETURNING *',
    [name, description, price, accent_color, category, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Admin: remove a product
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const { rows } = await pool.query('DELETE FROM products WHERE id=$1 RETURNING *', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
});

app.get('/', (req, res) => res.send('Chronos API is running.'));

const PORT = process.env.PORT || 4000;
initDb()
  .then(() => app.listen(PORT, () => console.log(`Chronos API listening on port ${PORT}`)))
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
