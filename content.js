import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

let categories = [];
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentOffer = null;
let selectedCategory = null;
let viewMode = 'grid';

const authBar = document.getElementById('auth-bar');
const categoryCarousel = document.getElementById('categoryCarousel');
const menuGrid = document.getElementById('menuGrid');
const offerBanner = document.getElementById('offerBanner');
const cartToggleBtn = document.getElementById('cart-toggle-btn');

function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

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

function loadShopData() {
  onValue(ref(db, 'categories'), snapshot => {
    categories = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderCategories();
  });

  onValue(ref(db, 'menu'), snapshot => {
    menuItems = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderMenu();
  });

  onValue(ref(db, 'offers'), snapshot => {
    const offers = snapshot.val();
    currentOffer = offers ? Object.values(offers).find(o => o.active) || null : null;
    renderOffer();
  });
}

function renderOffer() {
  if (currentOffer) {
    offerBanner.textContent = `🔥 ${currentOffer.title} — ${currentOffer.description}`;
    offerBanner.style.display = 'block';
  } else {
    offerBanner.style.display = 'none';
  }
}

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

function renderMenu() {
  menuGrid.innerHTML = '';

  let items = selectedCategory
    ? menuItems.filter(item => item.category === selectedCategory)
    : [...menuItems];

  // 🔍 Search by NAME only
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
      <img class="menu-img" src="${item.image || fallbackImg}" alt="${item.name}" />
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
    menuGrid.appendChild(card);
  });

  // 🔥 CRITICAL: Restore your original 2-column layout
  menuGrid.style.gridTemplateColumns = viewMode === 'list' ? '1fr' : 'repeat(2, 1fr)';
}

// Cart Functions
function addToCart(id, name, price, image) {
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
  if (existing) existing.qty += 1;
  else cart.push({ id, name, price: parseFloat(price), image, qty: 1 });
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
  const fallbackImg = 'image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E';

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
          <button class="delete-item" data-id="${item.id}" style="background:none; border:none; color:#d40000; font-size:16px; cursor:pointer; padding:0;">🗑️</button>
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

function placeOrder() {
  if (cart.length === 0) return showToast("Cart is empty!");
  if (!isLoggedIn()) return showToast("Please login first to place order.");

  const phoneNumber = localStorage.getItem("userPhone") || "unknown";
  const order = {
    phoneNumber,
    items: cart,
    total: parseFloat(document.getElementById('cartTotal').textContent),
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
    })
    .catch(() => showToast("Failed to place order."));
}

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

// Initialize
updateAuthUI();
updateCartUI();
loadShopData();

// 🔍 Search & Sort Listeners
document.getElementById('search-input')?.addEventListener('input', renderMenu);
document.getElementById('search-go')?.addEventListener('click', renderMenu);
document.getElementById('sort-select')?.addEventListener('change', renderMenu);

// 👁️ View Toggle
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

// 🖱️ Event Delegation
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
