// content.js — Full replacement
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* =========================
   Firebase config (your values)
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
let cart = []; // we'll sanitize on load
let currentOffer = null;
let selectedCategory = null;
let viewMode = 'grid'; // 'grid' | 'list'

/* =========================
   DOM refs (must match your HTML)
   ========================= */
const authBar = document.getElementById('auth-bar');
const categoryCarousel = document.getElementById('categoryCarousel');
const menuGrid = document.getElementById('menuGrid');
const offerBanner = document.getElementById('offerBanner');
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const cartPopupEl = document.getElementById('cart-popup');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkout-btn');
const toastEl = document.getElementById('toast');

/* Product detail popup elements (productPopup) */
const productPopup = document.getElementById('productPopup');
const ppImg = document.getElementById('pp-img');
const ppName = document.getElementById('pp-name');
const ppDesc = document.getElementById('pp-desc');
const ppPrice = document.getElementById('pp-price');
const ppQty = document.getElementById('pp-qty');
const ppAdd = document.getElementById('pp-add');
const ppClose = document.getElementById('pp-close');

/* Checkout modal elements (checkoutModal) */
const checkoutModal = document.getElementById('checkoutModal');
const checkoutPhone = document.getElementById('checkout-phone'); // note: added in HTML as instructed
const checkoutAddress = document.getElementById('checkout-address');
const checkoutPayment = document.getElementById('checkout-payment');
const checkoutInstructions = document.getElementById('checkout-instructions');
const checkoutPlace = document.getElementById('checkout-place');
const checkoutCancel = document.getElementById('checkout-cancel');

/* search / sort / view */
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

/* sanitize and load cart from localStorage */
function loadCartFromStorage() {
  const raw = JSON.parse(localStorage.getItem('cart')) || [];
  cart = raw.map((it, idx) => ({
    id: it.id || `temp-${Date.now()}-${idx}`,
    name: it.name || 'Unnamed Item',
    price: (it.price !== undefined && it.price !== null) ? Number(it.price) : 0,
    image: it.image || '',
    qty: Number(it.qty) || 1
  }));
  saveCart();
}
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

/* =========================
   Auth UI (kept)
   ========================= */
function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}
function updateAuthUI() {
  if (!authBar) return;
  if (isLoggedIn()) {
    authBar.innerHTML = `Logged in! <button onclick="logout()">Logout</button>`;
  } else {
    authBar.innerHTML = `Welcome! <a href="login.html" style="color:white;text-decoration:underline">Login to Order</a>`;
  }
  authBar.style.display = 'block';
}
window.logout = () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userPhone");
  updateAuthUI();
};

/* =========================
   Load shop data (with caching and id preservation)
   ========================= */
function loadShopData() {
  // categories
  onValue(ref(db, 'categories'), snapshot => {
    categories = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderCategories();
  });

  // menu: convert to array preserving key as id, coerce price to Number, save raw cache
  onValue(ref(db, 'menu'), snapshot => {
    const rawObj = snapshot.val() || {};
    const arr = [];
    snapshot.forEach(child => {
      const it = child.val() || {};
      it.id = child.key;
      it.name = it.name || it.title || 'Unnamed Item';
      // coerce numeric price
      it.price = (it.price !== undefined && it.price !== null) ? Number(it.price) : 0;
      if (Number.isNaN(it.price)) it.price = 0;
      it.mrp = (it.mrp !== undefined && it.mrp !== null) ? Number(it.mrp) : it.mrp;
      arr.push(it);
    });
    // store raw object to session to speed startup
    sessionStorage.setItem('menuCache', JSON.stringify(rawObj));
    menuItems = arr;
    renderMenu();
  });

  // offers
  onValue(ref(db, 'offers'), snapshot => {
    const offers = snapshot.val();
    currentOffer = offers ? Object.values(offers).find(o => o.active) || null : null;
    renderOffer();
  });
}

/* =========================
   Render Offer / Categories
   ========================= */
function renderOffer() {
  if (!offerBanner) return;
  if (currentOffer) {
    offerBanner.textContent = `🔥 ${currentOffer.title} — ${currentOffer.description}`;
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
  allDiv.innerHTML = `
    <img class="category-img" src="" alt="All" />
    <div class="category-name">ALL</div>
  `;
  allDiv.addEventListener('click', () => {
    selectedCategory = null;
    renderMenu();
  });
  categoryCarousel.appendChild(allDiv);

  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
      <img class="category-img" src="${cat.image || ''}" alt="${cat.name || 'Category'}" />
      <div class="category-name">${cat.name || 'Unknown'}</div>
    `;
    div.addEventListener('click', () => {
      selectedCategory = cat.name;
      renderMenu();
    });
    categoryCarousel.appendChild(div);
  });
}

/* =========================
   Render Menu (2-column fixed or list)
   ========================= */
function renderMenu() {
  if (!menuGrid) return;
  menuGrid.innerHTML = '';

  // use selectedCategory and search filter
  let items = selectedCategory
    ? menuItems.filter(i => i.category === selectedCategory)
    : [...menuItems];

  const term = searchInput?.value?.trim().toLowerCase() || '';
  if (term) items = items.filter(i => (i.name || '').toLowerCase().includes(term));

  // sorting
  const sortValue = sortSelect?.value || 'default';
  if (sortValue === 'price-low-high') items.sort((a,b) => (a.price||0) - (b.price||0));
  else if (sortValue === 'price-high-low') items.sort((a,b) => (b.price||0) - (a.price||0));
  else if (sortValue === 'offer-first') items.sort((a,b) => (b.offer ? 1 : 0) - (a.offer ? 1 : 0));

  if (items.length === 0) {
    menuGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#999;">No items available</p>';
    menuGrid.style.gridTemplateColumns = '1fr';
    return;
  }

  items.forEach(item => {
    const mrpDisplay = item.mrp && item.mrp > item.price ? `<del style="color:#999; font-size:14px;">₹${item.mrp}</del>` : '';
    const discountDisplay = item.mrp && item.mrp > item.price ? `<div style="color:#d40000; font-size:13px; font-weight:600; margin-top:2px;">${Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF</div>` : '';

    const card = document.createElement('div');
    card.className = `menu-card ${viewMode === 'list' ? 'list-view' : ''}`;
    // ensure attributes sanitized and price numeric in data-attrs
    const safeName = (item.name || 'Unnamed Item').replace(/"/g,'&quot;');
    const safePrice = Number(item.price || 0);
    card.innerHTML = `
      <img class="menu-img" loading="lazy" src="${item.image || ''}" alt="${safeName}" />
      <div class="menu-info">
        <div class="menu-name">${safeName}</div>
        <div style="display:flex; flex-direction:row; gap:6px;">
          ${mrpDisplay}
          <div class="menu-price">₹${safePrice}</div>
          ${discountDisplay}
        </div>
        ${item.offer ? `<div class="offer-tag">OFFER</div>` : ''}
        <button class="add-cart-btn" data-id="${item.id}" data-name="${safeName}" data-price="${safePrice}" data-image="${item.image || ''}">Add to Cart</button>
      </div>
    `;

    // product popup on image or card click (but not on clicking add button)
    const img = card.querySelector('.menu-img');
    img?.addEventListener('click', (e) => openProductPopup(item));
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('add-cart-btn') && e.target !== img) {
        openProductPopup(item);
      }
    });

    menuGrid.appendChild(card);
  });

  menuGrid.style.gridTemplateColumns = viewMode === 'list' ? '1fr' : 'repeat(2, 1fr)';
}

/* =========================
   Product Popup (pp- elements)
   Adds +/- controls dynamically next to qty input
   ========================= */
let popupCurrentItem = null;

function openProductPopup(item) {
  popupCurrentItem = item;
  // fill content
  ppImg.src = item.image || '';
  ppName.textContent = item.name || 'Unnamed Item';
  ppDesc.textContent = item.description || '';
  ppPrice.textContent = `₹${(Number(item.price) || 0).toFixed(2)}`;
  // set qty to 1
  ppQty.value = 1;

  // ensure +/- controls exist (create if not)
  setupPopupQtyControls();

  // store dataset on add button for safety
  ppAdd.dataset.id = item.id || '';
  ppAdd.dataset.name = item.name || '';
  ppAdd.dataset.price = String(Number(item.price || 0));
  ppAdd.dataset.image = item.image || '';

  productPopup.style.display = 'flex';
}

function setupPopupQtyControls() {
  // We'll add small - and + buttons next to existing ppQty input if not already added
  if (!ppQty) return;
  const wrapper = ppQty.parentElement || ppQty; // existing layout may vary
  // Check for existing controls by id
  if (document.getElementById('pp-minus')) return; // already added

  // Create minus button
  const minus = document.createElement('button');
  minus.id = 'pp-minus';
  minus.type = 'button';
  minus.textContent = '−';
  minus.style.marginRight = '8px';
  minus.style.padding = '6px 10px';
  minus.style.borderRadius = '6px';
  minus.style.cursor = 'pointer';
  minus.addEventListener('click', () => {
    let v = parseInt(ppQty.value) || 1;
    if (v > 1) ppQty.value = v - 1;
  });

  // Create plus button
  const plus = document.createElement('button');
  plus.id = 'pp-plus';
  plus.type = 'button';
  plus.textContent = '+';
  plus.style.marginLeft = '8px';
  plus.style.padding = '6px 10px';
  plus.style.borderRadius = '6px';
  plus.style.cursor = 'pointer';
  plus.addEventListener('click', () => {
    let v = parseInt(ppQty.value) || 1;
    ppQty.value = v + 1;
  });

  // Insert minus before qty and plus after qty
  ppQty.insertAdjacentElement('beforebegin', minus);
  ppQty.insertAdjacentElement('afterend', plus);
}

/* popup close & add handlers */
ppClose?.addEventListener('click', () => productPopup.style.display = 'none');

ppAdd?.addEventListener('click', () => {
  if (!ppAdd) return;
  const id = ppAdd.dataset.id || (`temp-${Date.now()}`);
  const name = ppAdd.dataset.name || 'Unnamed Item';
  const price = Number(ppAdd.dataset.price) || 0;
  const image = ppAdd.dataset.image || '';
  const qty = Number(ppQty.value) || 1;

  if (!name) return showToast("Item missing name");
  if (Number.isNaN(price)) return showToast("Item price invalid");

  addToCart(id, name, price, image, qty);
  productPopup.style.display = 'none';
});

/* close popup on background click */
productPopup?.addEventListener('click', (e) => {
  if (e.target === productPopup) productPopup.style.display = 'none';
});

/* =========================
   Cart functions (robust)
   ========================= */
function addToCart(id, name, price, image, qty = 1) {
  const itemId = id || `temp-${Date.now()}`;
  const itemName = name || 'Unnamed Item';
  const itemPrice = (price !== undefined && price !== null) ? Number(price) : 0;
  const itemImage = image || '';
  const itemQty = Number(qty) || 1;

  // UI feedback for the add button in grid (best-effort)
  const btn = document.querySelector(`.add-cart-btn[data-id="${id}"]`);
  if (btn) {
    btn.classList.add("added");
    const prevText = btn.textContent;
    btn.textContent = "✔ Added";
    setTimeout(() => {
      btn.classList.remove("added");
      btn.textContent = prevText;
    }, 900);
  }

  const existing = cart.find(it => it.id === itemId);
  if (existing) existing.qty = (existing.qty || 0) + itemQty;
  else cart.push({ id: itemId, name: itemName, price: Number(itemPrice) || 0, image: itemImage, qty: itemQty });

  saveCart();
  updateCartUI();
  showToast("Added to cart");
}

function updateCartUI() {
  if (!cartItemsEl || !cartTotalEl) return;
  cartItemsEl.innerHTML = '';
  let total = 0;
  let count = 0;
  const fallbackImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E';

  cart.forEach(item => {
    const price = (item.price !== undefined && item.price !== null) ? Number(item.price) : 0;
    const qty = Number(item.qty) || 0;
    const subtotal = price * qty;
    total += subtotal;
    count += qty;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-img" src="${item.image || fallbackImg}" />
      <div class="cart-info">
        <div>${item.name}</div>
        <div>₹${price} × 
          <button class="qty-btn" data-id="${item.id}" data-action="dec">-</button>
          ${qty}
          <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
          <div>₹${subtotal}</div>
          <button class="delete-item" data-id="${item.id}" style="background:none; border:none; color:#d40000; font-size:20px; cursor:pointer; padding:0;">🗑️</button>
        </div>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });

  cartTotalEl.textContent = Number(total).toFixed(2);
  updateCartBadge(count);
}

function updateCartBadge(count) {
  if (!cartToggleBtn) return;
  const existing = cartToggleBtn.querySelector('.cart-badge');
  if (existing) existing.remove();
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'cart-badge';
    badge.textContent = count > 9 ? '9+' : String(count);
    cartToggleBtn.appendChild(badge);
  }
}

function changeQty(id, delta) {
  const it = cart.find(i => i.id === id);
  if (!it) return;
  it.qty = Number(it.qty) + delta;
  if (it.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  updateCartUI();
}

function toggleCart() {
  if (!cartPopupEl) return;
  cartPopupEl.style.display = cartPopupEl.style.display === 'block' ? 'none' : 'block';
}
function closeCart() { if (cartPopupEl) cartPopupEl.style.display = 'none'; }

/* =========================
   Checkout (modal) — robust + phone capture
   ========================= */
function placeOrder() {
  if (cart.length === 0) return showToast("Cart is empty!");
  // open checkout modal and prefill
  checkoutAddress.value = '';
  checkoutPayment.value = 'Cash on Delivery';
  checkoutInstructions.value = '';
  checkoutPhone.value = localStorage.getItem('userPhone') || '';
  checkoutModal.style.display = 'flex';
}

checkoutCancel?.addEventListener('click', () => checkoutModal.style.display = 'none');

checkoutPlace?.addEventListener('click', () => {
  const address = (checkoutAddress.value || '').trim();
  if (!address) return showToast("Please enter delivery address.");
  let phone = (checkoutPhone?.value || '').trim();
  if (!phone) {
    phone = localStorage.getItem('userPhone') || '';
  }
  if (!phone) {
    const p = prompt("Please enter your mobile number to place the order:");
    if (!p) return showToast("Mobile number required.");
    phone = p.trim();
    localStorage.setItem('userPhone', phone);
  } else {
    // save if user typed a new phone
    localStorage.setItem('userPhone', phone);
  }

  const payment = checkoutPayment.value;
  const instructions = (checkoutInstructions.value || '').trim();

  // calculate total defensively from cart items
  const calculatedTotal = cart.reduce((s, it) => {
    const pr = (it.price !== undefined && it.price !== null) ? Number(it.price) : 0;
    const q = Number(it.qty) || 0;
    return s + ( (Number.isNaN(pr) ? 0 : pr) * (Number.isNaN(q) ? 0 : q) );
  }, 0);

  const order = {
    phoneNumber: phone,
    address,
    paymentMode: payment,
    instructions,
    items: cart,
    total: Number(calculatedTotal.toFixed(2)),
    timestamp: new Date().toISOString(),
    status: "pending"
  };

  push(ref(db, 'orders'), order)
    .then(() => {
      showToast("Order placed successfully!");
      cart = [];
      saveCart();
      updateCartUI();
      closeCart();
      checkoutModal.style.display = 'none';
    })
    .catch(err => {
      console.error(err);
      showToast("Failed to place order.");
    });
});

/* =========================
   Utility: toast
   ========================= */
function showToast(msg) {
  if (!toastEl) {
    // create one
    const t = document.createElement('div');
    t.id = 'toast';
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.left = '50%';
    t.style.transform = 'translateX(-50%)';
    t.style.background = 'rgba(51,51,51,0.92)';
    t.style.color = 'white';
    t.style.padding = '8px 16px';
    t.style.borderRadius = '20px';
    t.style.zIndex = 99999;
    document.body.appendChild(t);
  }
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => el.style.opacity = '0', 2300);
}

/* =========================
   Initialization
   ========================= */
loadCartFromStorage();
updateAuthUI();
updateCartUI();

// load from session cache quickly if present
const menuCacheRaw = sessionStorage.getItem('menuCache');
if (menuCacheRaw) {
  // reconstruct array preserving keys if possible
  try {
    const obj = JSON.parse(menuCacheRaw);
    if (obj && typeof obj === 'object') {
      menuItems = Object.keys(obj).map(k => {
        const it = obj[k] || {};
        it.id = it.id || k;
        it.name = it.name || it.title || 'Unnamed Item';
        it.price = (it.price !== undefined && it.price !== null) ? Number(it.price) : 0;
        return it;
      });
      renderMenu();
    }
  } catch (e) {
    console.warn('menu cache parse failed', e);
  }
}

// start live listeners (this will overwrite menuItems from cache if new data)
loadShopData();

/* =========================
   Event listeners (search debounced, sort, view toggle)
   ========================= */
let searchTimeout;
searchInput?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderMenu();
  }, 350);
});
sortSelect?.addEventListener('change', renderMenu);

document.getElementById('grid-view')?.addEventListener('click', () => {
  viewMode = 'grid';
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('grid-view')?.classList.add('active');
  renderMenu();
});
document.getElementById('list-view')?.addEventListener('click', () => {
  viewMode = 'list';
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('list-view')?.classList.add('active');
  renderMenu();
});

/* =========================
   Global click delegation (cart controls + open cart + checkout)
   ========================= */
document.addEventListener('click', (e) => {
  const t = e.target;

  // Add to cart from grid buttons
  if (t.classList.contains('add-cart-btn')) {
    const id = t.dataset.id;
    const name = t.dataset.name;
    const price = Number(t.dataset.price) || 0;
    const image = t.dataset.image || '';
    addToCart(id, name, price, image, 1);
    return;
  }

  // qty buttons in cart popup
  if (t.classList.contains('qty-btn')) {
    const id = t.dataset.id;
    const action = t.dataset.action;
    if (action === 'inc') changeQty(id, 1);
    else changeQty(id, -1);
    return;
  }

  // delete item
  if (t.classList.contains('delete-item')) {
    const id = t.dataset.id;
    removeFromCart(id);
    showToast("Item removed");
    return;
  }

  // toggle cart
  if (t.id === 'cart-toggle-btn') {
    toggleCart();
    return;
  }

  // close cart
  if (t.id === 'close-cart') {
    closeCart();
    return;
  }

  // place order (checkout button in cart popup)
  if (t.id === 'checkout-btn' || t.id === 'checkout-place') {
    placeOrder();
    return;
  }

  // open orders page (track-order-btn)
  if (t.id === 'track-order-btn') {
    window.open('orders.html', '_blank');
    return;
  }
});

/* =========================
   Expose some functions globally (compat)
   ========================= */
window.addToCart = addToCart;
window.placeOrder = placeOrder;
window.showProductPopup = openProductPopup;
window.toggleCart = toggleCart;
