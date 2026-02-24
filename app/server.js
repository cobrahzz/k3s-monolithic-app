const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check (K8s liveness probe)
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

// Products
app.get('/api/products', (req, res) => {
  res.json(db.getAllProducts());
});

// Cart
app.get('/api/cart/:userId', (req, res) => {
  res.json(db.getCartByUser(req.params.userId));
});

app.post('/api/cart/:userId', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });
  db.addToCart(req.params.userId, productId, quantity);
  res.json({ message: 'Added to cart' });
});

app.delete('/api/cart/:userId', (req, res) => {
  db.clearCart(req.params.userId);
  res.json({ message: 'Order placed! Cart cleared.' });
});

app.listen(PORT, () => console.log(`Shop running on http://0.0.0.0:${PORT}`));
