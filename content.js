import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ---------------------------
   Firebase config (your original)
   --------------------------- */
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

/* ---------------------------
   State (kept same names)
   --------------------------- */
let categories = [];
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentOffer = null;
let selectedCategory = null;
let viewMode = 'grid';

/* DOM refs kept */
const authBar = document.getElementById('auth-bar');
const categoryCarousel = document.getElementById('categoryCarousel');
const menuGrid = document.getElementById('menuGrid');
const offerBanner = document.getElementById('offerBanner');
const cartToggleBtn = document.getElementById('cart-toggle-btn');

/* product modal elements */
const productPopup = document.getElementById('productPopup');
const ppImg = document.getElementById('pp-img');
const ppName = document.getElementById('pp-name');
const ppDesc = document.getElementById('pp-desc');
const ppPrice = document.getElementById('pp-price');
const ppQty = document.getElementById('pp-qty');
const ppAdd = document.getElementById('pp-add');
const ppClose = document.getElementById('pp-close');

/* checkout modal elements */
const checkoutModal = document.getElementById('checkoutModal');
const checkoutAddress = document.getElementById('checkout-address');
const checkoutPayment = document.getElementById('checkout-payment');
const checkoutInstructions = document.getElementById('checkout-instructions');
const checkoutPlace = document.getElementById('checkout-place');
const checkoutCancel = document.getElementById('checkout-cancel');

/* other UI */
const toastEl = document.getElementById('toast');

/* Helper - login check (same as before) */
function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

/* updateAuthUI kept (but original CSS hid auth bar) */
function updateAuthUI() {
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

/* ---------------------------
   Load data (with session cache)
   --------------------------- */
function loadShopData() {
  // categories
  onValue(ref(db, 'categories'), snapshot => {
    categories = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderCategories();
  });

  // menu (cache to sessionStorage)
  onValue(ref(db, 'menu'), snapshot => {
    const raw = snapshot.val();
    // store raw in session for caching; keep the same structure you used earlier (values array)
    sessionStorage.setItem('menuCache', JSON.stringify(raw || {}));
    menuItems = raw ? Object.values(raw) : [];
    renderMenu();
  });

  // offers
  onValue(ref(db, 'offers'), snapshot => {
    const offers = snapshot.val();
    currentOffer = offers ? Object.values(offers).find(o => o.active) || null : null;
    renderOffer();
  });
}

/* Render offer banner (unchanged) */
function renderOffer() {
  if (currentOffer) {
    offerBanner.textContent = `🔥 ${currentOffer.title} — ${currentOffer.description}`;
    offerBanner.style.display = 'block';
  } else {
    offerBanner.style.display = 'none';
  }
}

/* Render categories (same UI as before) */
function renderCategories() {
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
    const fallback = '';
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
      <img class="category-img" src="${cat.image || fallback}" alt="${cat.name || 'Category'}" />
      <div class="category-name">${cat.name || 'Unknown'}</div>
    `;
    div.addEventListener('click', () => {
      selectedCategory = cat.name;
      renderMenu();
    });
    categoryCarousel.appendChild(div);
  });
}

/* Render menu — preserved logic, with lazy loading + product modal hook + grid/list layout kept */
function renderMenu() {
  menuGrid.innerHTML = '';

  let items = selectedCategory
    ? menuItems.filter(item => item.category === selectedCategory)
    : [...menuItems];

  // 🔍 Search by NAME only — reads from search input
  const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
  if (searchTerm) {
    items = items.filter(item => item.name && item.name.toLowerCase().includes(searchTerm));
  }

  // 📊 Sorting
  const sortValue = document.getElementById('sort-select')?.value || 'default';
  if (sortValue === 'price-low-high') {
    items.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortValue === 'price-high-low') {
    items.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortValue === 'offer-first') {
    items.sort((a, b) => (b.offer ? 1 : 0) - (a.offer ? 1 : 0));
  }

  if (items.length === 0) {
    menuGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#999;">No items available</p>';
    menuGrid.style.gridTemplateColumns = '1fr';
    return;
  }

  items.forEach(item => {
    const fallbackImg = '';
    let mrpDisplay = '';
    let discountDisplay = '';
    const priceDisplay = `₹${item.price || '0'}`;

    if (item.mrp && item.mrp > (item.price || 0)) {
      mrpDisplay = `<del style="color:#999; font-size:14px;">₹${item.mrp}</del>`;
      const discount = Math.round(((item.mrp - item.price) / item.mrp) * 100);
      discountDisplay = `<div style="color:#d40000; font-size:13px; font-weight:600; margin-top:2px;">${discount}% OFF</div>`;
    }

    const card = document.createElement('div');
    card.className = `menu-card ${viewMode === 'list' ? 'list-view' : ''}`;
    card.innerHTML = `
      <img class="menu-img" loading="lazy" src="${item.image || fallbackImg}" alt="${item.name}" />
      <div class="menu-info">
        <div class="menu-name">${item.name || 'Unnamed Item'}</div>
        <div style="display:flex; flex-direction:row; gap:6px;">
          ${mrpDisplay}
          <div class="menu-price">${priceDisplay}</div>
          ${discountDisplay}
        </div>
        ${item.offer ? `<div class="offer-tag">OFFER</div>` : ''}
        <button class="add-cart-btn" data-id="${item.id}" data-name="${item.name || 'Item'}" data-price="${item.price || 0}" data-image="${item.image || ''}">Add to Cart</button>
      </div>
    `;
    // show product popup when card clicked (but not when clicking add button)
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('add-cart-btn')) {
        showProductPopup(item);
      }
    });

    menuGrid.appendChild(card);
  });

  // Restore your 2-column or list layout
  menuGrid.style.gridTemplateColumns = viewMode === 'list' ? '1fr' : 'repeat(2, 1fr)';
}

/* ---------------------------
   Product popup (new)
   --------------------------- */
let currentPopupItem = null;

function showProductPopup(item) {
  currentPopupItem = item;
  ppImg.src = item.image || '';
  ppName.textContent = item.name || 'Unnamed';
  ppDesc.textContent = item.description || 'No description available.';
  ppPrice.textContent = `₹${item.price || 0}`;
  ppQty.value = 1;
  productPopup.style.display = 'flex';
}

ppClose.addEventListener('click', () => productPopup.style.display = 'none');

ppAdd.addEventListener('click', () => {
  if (!currentPopupItem) return;
  const qty = parseInt(ppQty.value) || 1;
  addToCart(currentPopupItem.id, currentPopupItem.name, currentPopupItem.price, currentPopupItem.image, qty);
  productPopup.style.display = 'none';
});

/* ---------------------------
   Cart functions (kept from original, extended to accept qty)
   --------------------------- */
function addToCart(id, name, price, image, qty = 1) {
  const btn = document.querySelector(`.add-cart-btn[data-id="${id}"]`);
  if (btn) {
    btn.classList.add("added");
    btn.textContent = "✔ Added";
    setTimeout(() => {
      btn.classList.remove("added");
      btn.textContent = "Add to Cart";
    }, 1500);
  }

  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += qty;
  else cart.push({ id, name, price: parseFloat(price), image, qty });
  saveCart();
  updateCartUI();
  showToast("Added!");
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function updateCartUI() {
  const cartItemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  cartItemsEl.innerHTML = '';
  let total = 0;
  let totalCount = 0;
  const fallbackImg = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E';

  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    totalCount += item.qty;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-img" src="${item.image || fallbackImg}" />
      <div class="cart-info">
        <div>${item.name}</div>
        <div>₹${item.price} × 
          <button class="qty-btn" data-id="${item.id}" data-action="dec">-</button>
          ${item.qty}
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

  totalEl.textContent = total.toFixed(2);
  updateCartBadge(totalCount);
}

function updateCartBadge(count) {
  const existingBadge = cartToggleBtn.querySelector('.cart-badge');
  if (existingBadge) existingBadge.remove();
  if (count > 0) {
    const badge = document.createElement('span');
    badge.className = 'cart-badge';
    badge.textContent = count > 9 ? '9+' : count;
    cartToggleBtn.appendChild(badge);
  }
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartUI();
  }
}

function toggleCart() {
  const popup = document.getElementById('cart-popup');
  popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
}
function closeCart() { document.getElementById('cart-popup').style.display = 'none'; }

/* ---------------------------
   Enhanced checkout (modal) — replaces prompts
   --------------------------- */
function placeOrder() {
  if (cart.length === 0) return showToast("Cart is empty!");
  if (!isLoggedIn()) return showToast("Please login first to place order.");

  // open checkout modal and prefill if any
  checkoutAddress.value = '';
  checkoutPayment.value = 'Cash on Delivery';
  checkoutInstructions.value = '';
  checkoutModal.style.display = 'flex';
}

checkoutCancel.addEventListener('click', () => checkoutModal.style.display = 'none');

checkoutPlace.addEventListener('click', () => {
  const address = checkoutAddress.value.trim();
  if (!address) return showToast("Please enter delivery address.");
  const payment = checkoutPayment.value;
  const instructions = checkoutInstructions.value.trim();
  const phoneNumber = localStorage.getItem("userPhone") || "unknown";
  const total = parseFloat(document.getElementById('cartTotal').textContent) || 0;

  const order = {
    phoneNumber,
    address,
    paymentMode: payment,
    instructions,
    items: cart,
    total,
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
    .catch((err) => {
      console.error(err);
      showToast("Failed to place order.");
    });
});

/* ---------------------------
   Toast helper (kept)
   --------------------------- */
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => toast.style.opacity = '0', 2500);
}

/* ---------------------------
   Initialize UI & data
   --------------------------- */
updateAuthUI();
updateCartUI();

/* Load from cache first (performance optimization) */
const cachedMenu = sessionStorage.getItem('menuCache');
if (cachedMenu) {
  const raw = JSON.parse(cachedMenu);
  menuItems = raw ? Object.values(raw) : [];
  renderMenu();
}

/* Start live listeners (this will also update cache on change) */
loadShopData();

/* ---------------------------
   Search + Sort + View listeners (debounced search)
   --------------------------- */
let searchTimeout;
const searchInput = document.getElementById('search-input');

searchInput?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    // if there is cached menu, update local menuItems filter from cache to avoid extra transforms
    const cache = sessionStorage.getItem('menuCache');
    if (cache) {
      const rawMenu = Object.values(JSON.parse(cache));
      menuItems = rawMenu;
    }
    renderMenu();
  }, 350);
});

document.getElementById('sort-select')?.addEventListener('change', renderMenu);

document.getElementById('grid-view')?.addEventListener('click', () => {
  viewMode = 'grid';
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('grid-view').classList.add('active');
  renderMenu();
});
document.getElementById('list-view')?.addEventListener('click', () => {
  viewMode = 'list';
  document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('list-view').classList.add('active');
  renderMenu();
});

/* ---------------------------
   Event Delegation (cart buttons, qty, delete, cart toggle) - preserved
   --------------------------- */
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-cart-btn')) {
    const btn = e.target;
    addToCart(btn.dataset.id, btn.dataset.name, btn.dataset.price, btn.dataset.image);
  } else if (e.target.classList.contains('qty-btn')) {
    const id = e.target.dataset.id;
    const action = e.target.dataset.action;
    changeQty(id, action === 'inc' ? 1 : -1);
  } else if (e.target.classList.contains('delete-item')) {
    const id = e.target.dataset.id;
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
    showToast("Item removed");
  } else if (e.target.id === 'cart-toggle-btn') {
    toggleCart();
  } else if (e.target.id === 'close-cart') {
    closeCart();
  } else if (e.target.id === 'checkout-btn') {
    placeOrder();
  }
});
// 🚚 Open Order Tracking Page
document.getElementById('track-order-btn')?.addEventListener('click', () => {
  window.open('orders.html', '_blank');
});


/* Add some initial UI sync */
updateCartUI();

/* Expose some functions to global scope if other components expect them (keeps compatibility) */
window.addToCart = addToCart;
window.placeOrder = placeOrder;
window.showProductPopup = showProductPopup;
