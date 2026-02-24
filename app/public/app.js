// ── User management ───────────────────────────────────────────────────────────

const PRESET_USERS = ['alice', 'bob', 'charlie', 'diana'];

function getActiveUser() {
  return localStorage.getItem('activeUser') || 'alice';
}

function setActiveUser(name) {
  const key = name.trim().toLowerCase().replace(/\s+/g, '-') || 'alice';
  localStorage.setItem('activeUser', key);
  updateUserUI();
  renderCartFromAPI();
}

function updateUserUI() {
  const active = getActiveUser();
  document.querySelectorAll('.user-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.user === active);
  });
  const customInput = document.getElementById('custom-user-input');
  customInput.value = PRESET_USERS.includes(active) ? '' : active;
}

// ── Product emoji & gradient map ──────────────────────────────────────────────

const PRODUCT_EMOJIS = {
  'mechanical keyboard':         '⌨️',
  'wireless mouse':              '🖱️',
  '27" 4k monitor':              '🖥️',
  'usb-c hub 7-in-1':            '🔌',
  'noise-cancelling headphones': '🎧',
  'webcam 1080p':                '📷',
  'webcam 1080p 60fps':          '📷',
  'laptop stand aluminium':      '💻',
  'led desk lamp':               '💡',
  'portable ssd 1tb':            '💾',
  'smart power strip':           '🔋',
};

const GRADIENTS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fda085, #f6d365)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  'linear-gradient(135deg, #d4fc79, #96e6a1)',
  'linear-gradient(135deg, #f7971e, #ffd200)',
];

function getEmoji(name) {
  return PRODUCT_EMOJIS[name.toLowerCase()] || '📦';
}

// ── Flying emoji animation ─────────────────────────────────────────────────────

function flyToCart(srcEl, emoji) {
  const srcRect  = srcEl.getBoundingClientRect();
  const cartRect = document.getElementById('basket-panel').getBoundingClientRect();

  const el = document.createElement('div');
  el.className  = 'fly-emoji';
  el.textContent = emoji;
  el.style.left = (srcRect.left + srcRect.width  / 2) + 'px';
  el.style.top  = (srcRect.top  + srcRect.height / 2) + 'px';
  document.body.appendChild(el);

  // Force reflow then start transition
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const dx = (cartRect.left + cartRect.width  / 2) - (srcRect.left + srcRect.width  / 2);
    const dy = (cartRect.top  + cartRect.height / 4) - (srcRect.top  + srcRect.height / 2);
    el.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
    el.style.opacity   = '0';
  }));

  el.addEventListener('transitionend', () => el.remove());
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

async function fetchCart() {
  const res = await fetch(`/api/cart/${getActiveUser()}`);
  if (!res.ok) throw new Error('Failed to load cart');
  return res.json();
}

async function addToCart(productId) {
  await fetch(`/api/cart/${getActiveUser()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: 1 }),
  });
}

async function checkout() {
  const res = await fetch(`/api/cart/${getActiveUser()}`, { method: 'DELETE' });
  return res.json();
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  if (!products || products.length === 0) {
    grid.innerHTML = '<p class="empty">No products available.</p>';
    return;
  }
  grid.innerHTML = products.map((p, i) => `
    <div class="product-card">
      <div class="product-emoji" style="background:${GRADIENTS[i % GRADIENTS.length]}">
        <span>${getEmoji(p.name)}</span>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <p class="description">${p.description}</p>
        <div class="product-footer">
          <span class="price">$${p.price.toFixed(2)}</span>
          <button class="add-btn" data-id="${p.id}" data-emoji="${getEmoji(p.name)}">Add to cart</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      flyToCart(btn, btn.dataset.emoji);
      await addToCart(Number(btn.dataset.id));
      await renderCartFromAPI();
      btn.disabled = false;
      showToast(`${btn.dataset.emoji} Added to basket!`);
    });
  });
}

function renderCart(items) {
  const list   = document.getElementById('basket-items');
  const total  = document.getElementById('basket-total');
  const payBtn = document.getElementById('pay-btn');

  if (!items || items.length === 0) {
    list.innerHTML = '<li class="empty">Your basket is empty.</li>';
    total.textContent = '';
    payBtn.disabled = true;
    return;
  }

  list.innerHTML = items.map(item => `
    <li>
      <span class="item-name">${getEmoji(item.name)} ${item.name}</span>
      <span class="item-qty">× ${item.quantity}</span>
      <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
    </li>
  `).join('');

  const sum = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  total.textContent = `Total: $${sum.toFixed(2)}`;
  payBtn.disabled = false;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function renderCartFromAPI() {
  const items = await fetchCart();
  renderCart(items);
}

document.getElementById('user-pills').addEventListener('click', e => {
  const pill = e.target.closest('.user-pill');
  if (pill) setActiveUser(pill.dataset.user);
});

document.getElementById('custom-user-btn').addEventListener('click', () => {
  const val = document.getElementById('custom-user-input').value.trim();
  if (val) setActiveUser(val);
});
document.getElementById('custom-user-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) setActiveUser(val);
  }
});

document.getElementById('pay-btn').addEventListener('click', async () => {
  const result = await checkout();
  renderCart([]);
  showToast(result.message);
});

(async () => {
  updateUserUI();
  try {
    const [products] = await Promise.all([fetchProducts(), renderCartFromAPI()]);
    renderProducts(products);
  } catch (err) {
    document.getElementById('products-grid').innerHTML =
      `<p class="empty">Error: ${err.message}</p>`;
  }
})();
