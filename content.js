// content.js — full replacement (search removed + guest cart + fixed double-add)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   Firebase config
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.appspot.com",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* =========================
   State
   ========================= */
let categories = [];
let menuItems = [];
let cart = [];
let currentOffer = null;
let selectedCategory = null;
let viewMode = 'grid'; // 'grid' | 'list'

/* =========================
   DOM refs
   ========================= */
const authBar = document.getElementById('auth-bar');
const categoryCarousel = document.getElementById('categoryCarousel');
const menuGrid = document.getElementById('menuGrid');
const offerBanner = document.getElementById('offerBanner');

const cartPopupEl = document.getElementById('cart-popup');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartToggleBtn = document.getElementById('cart-toggle-btn');

const sortSelect = document.getElementById('sort-select');
const gridViewBtn = document.getElementById('grid-view');
const listViewBtn = document.getElementById('list-view');

// Product popup
const productPopup = document.getElementById('productPopup');
const ppImg = document.getElementById('pp-img');
const ppName = document.getElementById('pp-name');
const ppDesc = document.getElementById('pp-desc');
const ppPrice = document.getElementById('pp-price');
const ppQty = document.getElementById('pp-qty');
const ppAdd = document.getElementById('pp-add');
const ppClose = document.getElementById('pp-close');

// Checkout modal
const checkoutModal = document.getElementById('checkoutModal');
const checkoutPhone = document.getElementById('checkout-phone');
const checkoutAddress = document.getElementById('checkout-address');
const checkoutPayment = document.getElementById('checkout-payment');
const checkoutInstructions = document.getElementById('checkout-instructions');
const checkoutPlace = document.getElementById('checkout-place');
const checkoutCancel = document.getElementById('checkout-cancel');

// Toast
let toastEl = document.getElementById('toast');

/* =========================
   Utilities
   ========================= */
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function showToast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'toast';
    toastEl.style.position = 'fixed';
    toastEl.style.bottom = '20px';
    toastEl.style.left = '50%';
    toastEl.style.transform = 'translateX(-50%)';
    toastEl.style.background = 'rgba(0,0,0,0.85)';
    toastEl.style.color = 'white';
    toastEl.style.padding = '8px 14px';
    toastEl.style.borderRadius = '18px';
    toastEl.style.zIndex = '99999';
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity .25s';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.style.opacity = '1';
  setTimeout(() => {
    if (toastEl) toastEl.style.opacity = '0';
  }, 2200);
}

/* =========================
   Auth / UI
   ========================= */
function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

function updateAuthUI() {
  if (!authBar) return;
  if (isLoggedIn()) {
    const phone = localStorage.getItem('userPhone') || '';
    authBar.innerHTML = `Logged in${phone ? ' — ' + phone : ''} <button onclick="logout()">Logout</button>`;
  } else {
    authBar.innerHTML = `Welcome! <button onclick="showLoginModal()">Login to Order</button>`;
  }
  authBar.style.display = 'block';
}

window.logout = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userPhone');
  updateAuthUI();
  showToast('Logged out');
};

window.showLoginModal = () => {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.style.display = 'flex';
  } else {
    console.warn('Login modal #loginModal not found.');
    showToast('Login interface missing.');
  }
};

/* =========================
   Cart: Load & Save (guest-friendly)
   ========================= */
function loadCartFromStorage() {
  const raw = JSON.parse(localStorage.getItem('cart')) || [];
  cart = raw.map((it, idx) => ({
    id: it?.id || `temp-${Date.now()}-${idx}`,
    name: it?.name || 'Unnamed Item',
    price: safeNumber(it?.price, 0),
    image: it?.image || '',
    qty: Math.max(1, parseInt(it?.qty) || 1)
  }));
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

/* =========================
   Load shop data
   ========================= */
function loadShopData() {
  if (categoryCarousel) {
    onValue(ref(db, 'categories'), snapshot => {
      const val = snapshot.val() || {};
      categories = Object.values(val || []);
      renderCategories();
    });
  }

  onValue(ref(db, 'menu'), snapshot => {
    const raw = snapshot.val() || {};
    const arr = [];
    snapshot.forEach(child => {
      const it = child.val() || {};
      it.id = child.key;
      it.name = it.name || it.title || `Item ${child.key}`;
      it.price = safeNumber(it.price, 0);
      it.mrp = (it.mrp !== undefined && it.mrp !== null) ? safeNumber(it.mrp, it.mrp) : it.mrp;
      it.image = it.image || '';
      arr.push(it);
    });
    sessionStorage.setItem('menuCache', JSON.stringify(raw));
    menuItems = arr;
    renderMenu();
  });

  onValue(ref(db, 'offers'), snapshot => {
    const val = snapshot.val() || {};
    const arr = Object.values(val || {});
    currentOffer = arr.find(o => o.active) || null;
    renderOffer();
  });
}

/* =========================
   Render helpers
   ========================= */
function renderOffer() {
  if (!offerBanner) return;
  if (currentOffer) {
    offerBanner.textContent = `🔥 ${currentOffer.title} — ${currentOffer.description || ''}`;
    offerBanner.style.display = 'block';
  } else {
    offerBanner.style.display = 'none';
  }
}

function renderCategories() {
  if (!categoryCarousel) return;
  categoryCarousel.innerHTML = '';
  const allDiv = document.createElement('div');
  allDiv.className = 'category-item';
  allDiv.innerHTML = `<img class="category-img" src="" alt="All"/><div class="category-name">ALL</div>`;
  allDiv.addEventListener('click', () => { selectedCategory = null; renderMenu(); });
  categoryCarousel.appendChild(allDiv);

  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
      <img class="category-img" src="${cat.image || ''}" alt="${cat.name || 'Category'}"/>
      <div class="category-name">${cat.name || 'Unknown'}</div>
    `;
    div.addEventListener('click', () => { selectedCategory = cat.name; renderMenu(); });
    categoryCarousel.appendChild(div);
  });
}

function renderMenu() {
  if (!menuGrid) return;
  menuGrid.innerHTML = '';

  let items = selectedCategory
    ? menuItems.filter(i => i.category === selectedCategory)
    : [...menuItems];

  const sortVal = (sortSelect?.value || 'default');
  if (sortVal === 'price-low-high') items.sort((a,b) => (a.price||0) - (b.price||0));
  else if (sortVal === 'price-high-low') items.sort((a,b) => (b.price||0) - (a.price||0));
  else if (sortVal === 'offer-first') items.sort((a,b) => (b.offer ? 1 : 0) - (a.offer ? 1 : 0));

  if (!items.length) {
    menuGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;">No items available</p>';
    menuGrid.style.gridTemplateColumns = '1fr';
    return;
  }

  items.forEach(item => {
    const safeName = (item.name || 'Unnamed Item').replace(/"/g,'&quot;');
    const safePrice = safeNumber(item.price, 0).toFixed(2);
    const mrpDisplay = (item.mrp && item.mrp > item.price) ? `<del style="color:#999;font-size:14px">₹${item.mrp}</del>` : '';
    const discountDisplay = (item.mrp && item.mrp > item.price) ? `<div style="color:#d40000;font-size:13px;font-weight:600;margin-top:2px;">${Math.round(((item.mrp - item.price)/item.mrp)*100)}% OFF</div>` : '';

    const card = document.createElement('div');
    card.className = `menu-card ${viewMode === 'list' ? 'list-view' : ''}`;
    card.innerHTML = `
      <img class="menu-img" loading="lazy" src="${item.image || ''}" alt="${safeName}" />
      <div class="menu-info">
        <div class="menu-name">${safeName}</div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${mrpDisplay}
          <div class="menu-price">₹${safePrice}</div>
          ${discountDisplay}
        </div>
        ${item.offer ? `<div class="offer-tag">OFFER</div>` : ''}
        <button class="add-cart-btn" data-id="${item.id}" data-name="${safeName}" data-price="${safeNumber(item.price,0)}" data-image="${item.image || ''}">Add to Cart</button>
      </div>
    `;

    const imgEl = card.querySelector('.menu-img');
    imgEl?.addEventListener('click', (e) => openProductPopup(item));
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('add-cart-btn') && e.target !== imgEl) openProductPopup(item);
    });

    menuGrid.appendChild(card);
  });

  menuGrid.style.gridTemplateColumns = viewMode === 'list' ? '1fr' : 'repeat(2, 1fr)';
}

/* =========================
   Product Popup
   ========================= */
let popupCurrentItem = null;

function openProductPopup(item) {
  popupCurrentItem = item;
  if (!productPopup) {
    createInlineProductPopup(item);
    return;
  }

  ppImg && (ppImg.src = item.image || '');
  ppName && (ppName.textContent = item.name || 'Unnamed Item');
  ppDesc && (ppDesc.textContent = item.description || '');
  ppPrice && (ppPrice.textContent = `₹${safeNumber(item.price,0).toFixed(2)}`);
  if (ppQty && ppQty.value === '') ppQty.value = '1';

  ensurePopupQtyControls();

  // ✅ ONLY update dataset — NO event listener here!
  if (ppAdd) {
    ppAdd.dataset.id = item.id || '';
    ppAdd.dataset.name = item.name || '';
    ppAdd.dataset.price = String(safeNumber(item.price, 0));
    ppAdd.dataset.image = item.image || '';
  }

  productPopup.style.display = 'flex';
}

function ensurePopupQtyControls() {
  if (!ppQty) return;
  if (document.getElementById('pp-minus') && document.getElementById('pp-plus')) return;

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.id = 'pp-minus';
  minus.textContent = '−';
  minus.style.marginRight = '8px';
  minus.style.padding = '6px';
  minus.style.cursor = 'pointer';
  minus.addEventListener('click', () => {
    let v = parseInt(ppQty.value) || 1;
    if (v > 1) ppQty.value = v - 1;
  });

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.id = 'pp-plus';
  plus.textContent = '+';
  plus.style.marginLeft = '8px';
  plus.style.padding = '6px';
  plus.style.cursor = 'pointer';
  plus.addEventListener('click', () => {
    let v = parseInt(ppQty.value) || 1;
    ppQty.value = v + 1;
  });

  ppQty.insertAdjacentElement('beforebegin', minus);
  ppQty.insertAdjacentElement('afterend', plus);
}

function createInlineProductPopup(item) {
  const tmp = document.createElement('div');
  tmp.id = 'productPopupInline';
  tmp.style.position = 'fixed';
  tmp.style.inset = '0';
  tmp.style.display = 'flex';
  tmp.style.alignItems = 'center';
  tmp.style.justifyContent = 'center';
  tmp.style.background = 'rgba(0,0,0,0.6)';
  tmp.style.zIndex = '99999';
  tmp.innerHTML = `
    <div style="background:white;border-radius:10px;padding:16px;max-width:420px;width:92%;">
      <img src="${item.image||''}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;">
      <h3 style="margin:8px 0;">${item.name}</h3>
      <p>₹${safeNumber(item.price,0).toFixed(2)}</p>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;">
        <button id="inline-minus">−</button>
        <input id="inline-qty" type="number" value="1" min="1" style="width:60px;text-align:center;">
        <button id="inline-plus">+</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="inline-add" style="flex:1;background:#4CAF50;color:#fff;padding:8px;border:none;border-radius:8px;">Add to Cart</button>
        <button id="inline-close" style="flex:1;padding:8px;border-radius:8px;">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(tmp);
  document.getElementById('inline-close').onclick = () => tmp.remove();
  document.getElementById('inline-plus').onclick = () => {
    const q = document.getElementById('inline-qty'); q.value = Number(q.value || 1) + 1;
  };
  document.getElementById('inline-minus').onclick = () => {
    const q = document.getElementById('inline-qty'); if (Number(q.value) > 1) q.value = Number(q.value) - 1;
  };
  document.getElementById('inline-add').onclick = () => {
    const qty = Number(document.getElementById('inline-qty').value) || 1;
    addToCart(item.id, item.name, safeNumber(item.price,0), item.image || '', qty);
    tmp.remove();
  };
}

// Close popup on close button or outside click
ppClose && ppClose.addEventListener('click', () => { if (productPopup) productPopup.style.display = 'none'; });
productPopup && productPopup.addEventListener('click', (e) => { if (e.target === productPopup) productPopup.style.display = 'none'; });

/* =========================
   Cart functions
   ========================= */
function addToCart(id, name, price, image, qty = 1) {
  const itemId = id || `temp-${Date.now()}`;
  const itemName = name || 'Unnamed Item';
  const itemPrice = safeNumber(price, 0);
  const itemImage = image || '';
  const itemQty = Math.max(1, Number(qty) || 1);

  const existing = cart.find(c => c.id === itemId);
  if (existing) existing.qty += itemQty;
  else cart.push({ id: itemId, name: itemName, price: itemPrice, image: itemImage, qty: itemQty });

  saveCart();
  updateCartUI();
  showToast(`${itemName} added (${itemQty})`);
}

function updateCartUI() {
  if (!cartItemsEl || !cartTotalEl) return;
  cartItemsEl.innerHTML = '';
  let total = 0;
  let totalCount = 0;
  const fallbackImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E';

  for (const it of cart) {
    const price = safeNumber(it.price, 0);
    const qty = Math.max(0, Number(it.qty) || 0);
    const subtotal = price * qty;
    total += subtotal;
    totalCount += qty;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-img" src="${it.image || fallbackImg}" />
      <div class="cart-info">
        <div>${it.name}</div>
        <div>₹${price} × 
          <button class="qty-btn" data-id="${it.id}" data-action="dec">-</button>
          ${qty}
          <button class="qty-btn" data-id="${it.id}" data-action="inc">+</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
          <div>₹${(subtotal).toFixed(2)}</div>
          <button class="delete-item" data-id="${it.id}" style="background:none;border:none;color:#d40000;font-size:20px;cursor:pointer;padding:0;">🗑️</button>
        </div>
      </div>
    `;
    cartItemsEl.appendChild(div);
  }
  cartTotalEl.textContent = Number(total).toFixed(2);
  updateCartBadge(totalCount);
}

function updateCartBadge(count) {
  if (!cartToggleBtn) return;
  const existing = cartToggleBtn.querySelector('.cart-badge');
  if (existing) existing.remove();
  if (count > 0) {
    const b = document.createElement('span');
    b.className = 'cart-badge';
    b.textContent = count > 9 ? '9+' : String(count);
    cartToggleBtn.appendChild(b);
  }
}

function changeQty(id, delta) {
  const it = cart.find(c => c.id === id);
  if (!it) return;
  it.qty = (Number(it.qty) || 0) + delta;
  if (it.qty <= 0) cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
}

/* =========================
   Checkout / placeOrder
   ========================= */
function placeOrder() {
  if (!isLoggedIn()) {
    showToast('Please log in to place an order.');
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
      loginModal.style.display = 'flex';
    } else {
      console.error('Login modal #loginModal not found!');
    }
    return;
  }

  if (!cart || cart.length === 0) return showToast('Cart is empty!');

  const address = (checkoutAddress?.value || '').trim();
  if (!address) {
    if (checkoutModal) {
      checkoutPhone && (checkoutPhone.value = localStorage.getItem('userPhone') || '');
      checkoutModal.style.display = 'flex';
    } else {
      const a = prompt('Enter delivery address:');
      if (!a) return showToast('Delivery address required');
    }
    return;
  }

  let phone = (checkoutPhone?.value || '').trim();
  if (!phone) phone = localStorage.getItem('userPhone') || '';
  if (!phone) {
    const p = prompt('Enter mobile number:');
    if (!p) return showToast('Mobile number required.');
    phone = p.trim();
    localStorage.setItem('userPhone', phone);
  } else {
    localStorage.setItem('userPhone', phone);
  }

  const payment = (checkoutPayment?.value) || 'Cash on Delivery';
  const instructions = (checkoutInstructions?.value || '').trim();

  const computedTotal = cart.reduce((s, it) => {
    const pr = safeNumber(it.price, 0);
    const q = Math.max(0, Number(it.qty) || 0);
    return s + pr * q;
  }, 0);

  const order = {
    phoneNumber: phone,
    address,
    instructions,
    paymentMode: payment,
    items: cart.map(i => ({
      id: i.id,
      name: i.name,
      price: safeNumber(i.price, 0),
      qty: Number(i.qty) || 0,
      image: i.image || ''
    })),
    total: Number(computedTotal.toFixed(2)),
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  push(ref(db, 'orders'), order)
    .then(() => {
      showToast('Order placed successfully!');
      cart = [];
      saveCart();
      updateCartUI();
      if (cartPopupEl) cartPopupEl.style.display = 'none';
      if (checkoutModal) checkoutModal.style.display = 'none';
    })
    .catch(err => {
      console.error('placeOrder error:', err);
      showToast('Failed to place order.');
    });
}

checkoutCancel && checkoutCancel.addEventListener('click', () => {
  if (checkoutModal) checkoutModal.style.display = 'none';
});
checkoutPlace && checkoutPlace.addEventListener('click', () => {
  const addr = (checkoutAddress?.value || '').trim();
  if (!addr) return showToast('Please enter delivery address');
  placeOrder();
});

/* =========================
   Global Event Delegation
   ========================= */
document.addEventListener('click', (e) => {
  const t = e.target;

  // Add from menu card
  if (t.classList && t.classList.contains('add-cart-btn')) {
    const id = t.dataset.id;
    const name = t.dataset.name;
    const price = safeNumber(t.dataset.price, 0);
    const image = t.dataset.image || '';
    addToCart(id, name, price, image, 1);
    return;
  }

  // Add from product popup (FIXED: single listener)
  if (t && t.id === 'pp-add') {
    const id = ppAdd?.dataset.id || (`temp-${Date.now()}`);
    const name = ppAdd?.dataset.name || 'Unnamed Item';
    const price = safeNumber(ppAdd?.dataset.price, 0);
    const image = ppAdd?.dataset.image || '';
    const qty = Math.max(1, parseInt(ppQty?.value || '1'));

    addToCart(id, name, price, image, qty);
    if (productPopup) productPopup.style.display = 'none';
    if (ppQty) ppQty.value = '1'; // reset for next use
    return;
  }

  // Cart quantity buttons
  if (t.classList && t.classList.contains('qty-btn')) {
    const id = t.dataset.id;
    const action = t.dataset.action;
    if (action === 'inc') changeQty(id, 1);
    else changeQty(id, -1);
    return;
  }

  // Delete from cart
  if (t.classList && t.classList.contains('delete-item')) {
    removeFromCart(t.dataset.id);
    showToast('Item removed');
    return;
  }

  // Toggle cart popup
  if (t.id === 'cart-toggle-btn') {
    if (cartPopupEl) cartPopupEl.style.display = cartPopupEl.style.display === 'block' ? 'none' : 'block';
    return;
  }

  if (t.id === 'close-cart') {
    if (cartPopupEl) cartPopupEl.style.display = 'none';
    return;
  }

  // Checkout button
  if (t.id === 'checkout-btn') {
    if (!isLoggedIn()) {
      showToast('Please log in to checkout.');
      const loginModal = document.getElementById('loginModal');
      if (loginModal) {
        loginModal.style.display = 'flex';
      } else {
        console.error('Login modal #loginModal not found!');
      }
      return;
    }
    if (checkoutModal) {
      checkoutPhone && (checkoutPhone.value = localStorage.getItem('userPhone') || '');
      checkoutModal.style.display = 'flex';
    } else {
      placeOrder();
    }
    return;
  }

  if (t.id === 'track-order-btn') {
    window.open('orders.html', '_blank');
    return;
  }
});

/* View toggles */
gridViewBtn && gridViewBtn.addEventListener('click', () => {
  viewMode = 'grid';
  gridViewBtn.classList.add('active');
  listViewBtn && listViewBtn.classList.remove('active');
  renderMenu();
});
listViewBtn && listViewBtn.addEventListener('click', () => {
  viewMode = 'list';
  listViewBtn.classList.add('active');
  gridViewBtn && gridViewBtn.classList.remove('active');
  renderMenu();
});

sortSelect && sortSelect.addEventListener('change', () => renderMenu());

/* =========================
   Initialization
   ========================= */
updateAuthUI();
loadCartFromStorage();
updateCartUI();

try {
  const cached = sessionStorage.getItem('menuCache');
  if (cached) {
    const obj = JSON.parse(cached) || {};
    menuItems = Object.keys(obj).map(k => {
      const v = obj[k] || {};
      v.id = v.id || k;
      v.name = v.name || v.title || `Item ${k}`;
      v.price = safeNumber(v.price, 0);
      v.image = v.image || '';
      return v;
    });
    renderMenu();
  }
} catch (e) {
  // ignore cache parse errors
}

loadShopData();

/* Expose helpers */
window.addToCart = addToCart;
window.placeOrder = placeOrder;
window.openProductPopup = openProductPopup;
window.updateCartUI = updateCartUI;
