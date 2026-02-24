const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'shop.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    price       REAL    NOT NULL,
    description TEXT,
    image_url   TEXT
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed products on first run
const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)'
  );
  const seed = db.transaction(() => {
    insert.run('Mechanical Keyboard',         89.99,  'TKL layout, Cherry MX Red switches, RGB backlight',           'https://picsum.photos/seed/keyboard/400/260');
    insert.run('Wireless Mouse',              34.99,  'Ergonomic design, 3000 DPI, silent clicks, 60h battery',      'https://picsum.photos/seed/mouse/400/260');
    insert.run('27" 4K Monitor',             349.99,  'IPS panel, 144Hz, HDR400, USB-C 90W PD, 1ms response',        'https://picsum.photos/seed/monitor/400/260');
    insert.run('USB-C Hub 7-in-1',            29.99,  'HDMI 4K, 3× USB-A 3.0, SD/microSD reader, 100W passthrough', 'https://picsum.photos/seed/hub/400/260');
    insert.run('Noise-Cancelling Headphones', 199.99, 'Active ANC, 30h battery, Bluetooth 5.2, foldable',            'https://picsum.photos/seed/headphones/400/260');
    insert.run('Webcam 1080p 60fps',          59.99,  'Auto-focus, dual mic with noise reduction, plug & play',      'https://picsum.photos/seed/webcam/400/260');
    insert.run('Laptop Stand Aluminium',      39.99,  'Adjustable height & angle, fits 13"–17", cable slot',         'https://picsum.photos/seed/laptopstand/400/260');
    insert.run('LED Desk Lamp',               44.99,  '5 colour temps, 10 brightness levels, USB charging port',     'https://picsum.photos/seed/desklamp/400/260');
    insert.run('Portable SSD 1TB',           109.99,  'USB 3.2 Gen2, 1050 MB/s read, rugged drop-proof case',        'https://picsum.photos/seed/portablessd/400/260');
    insert.run('Smart Power Strip',           49.99,  '4 outlets + 4 USB-A, surge protection, remote scheduling',    'https://picsum.photos/seed/powerstrip/400/260');
  });
  seed();
  console.log('Database seeded with 10 sample products.');
}

module.exports = {
  getAllProducts() {
    return db.prepare('SELECT * FROM products').all();
  },

  getCartByUser(userId) {
    return db.prepare(`
      SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(userId);
  },

  addToCart(userId, productId, quantity = 1) {
    const existing = db.prepare(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?'
    ).get(userId, productId);

    if (existing) {
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?')
        .run(existing.quantity + quantity, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
        .run(userId, productId, quantity);
    }
  },

  clearCart(userId) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
  },
};
