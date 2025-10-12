// content.js — NO Firebase Auth, only localStorage check

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

const authBar = document.getElementById('auth-bar');
const categoryCarousel = document.getElementById('categoryCarousel');
const menuGrid = document.getElementById('menuGrid');
const offerBanner = document.getElementById('offerBanner');
const cartToggleBtn = document.getElementById('cart-toggle-btn');

// ✅ Check login status (frontend only)
function isLoggedIn() {
  const session = localStorage.getItem('mirdhuna_session');
  if (session) {
    try {
      const data = JSON.parse(session);
      return data.isLoggedIn === true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

function updateAuthUI() {
  if (isLoggedIn()) {
    authBar.innerHTML = `Logged in! <button onclick="logout()">Logout</button>`;
  } else {
    authBar.innerHTML = `Welcome! <a href="login.html" style="color:white;text-decoration:underline">Login to Order</a>`;
  }
}

window.logout = () => {
  localStorage.removeItem('mirdhuna_session');
  updateAuthUI();
};

// --- Rest of shop logic (same as before) ---
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
  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `
      <img class="category-img" src="${cat.image || 'image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><circle cx=%2230%22 cy=%2230%22 r=%2228%22 fill=%22%23f0f0f0%22 stroke=%22%23ddd%22 stroke-width=%222%22/><text x=%2230%22 y=%2235%22 font-size=%2210%22 fill=%22%23999%22 text-anchor=%22middle%22>?</text></svg>'}" alt="${cat.name}" />
      <div class="category-name">${cat.name}</div>
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
  const items = selectedCategory
    ? menuItems.filter(item => item.category === selectedCategory)
    : menuItems;

  if (items.length === 0) {
    menuGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#999;">No items available</p>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img class="menu-img" src="${item.image || ''}" alt="${item.name}" onerror="this.style.display='none'" />
      <div class="menu-info">
        <div class="menu-name">${item.name}</div>
        <div class="menu-price">₹${item.price}</div>
        ${item.offer ? `<div class="offer-tag">OFFER</div>` : ''}
        <button class="add-cart-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image || ''}">Add to Cart</button>
      </div>
    `;
    menuGrid.appendChild(card);
  });
}

// 🛒 Cart Functions
function addToCart(id, name, price, image) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, image, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showToast("Item added to cart!");
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
  const cartItemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');

  cartItemsEl.innerHTML = '';
  let total = 0;
  let totalCount = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    totalCount += item.qty;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-img" src="${item.image || 'image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/></svg>'}" />
      <div class="cart-info">
        <div>${item.name}</div>
        <div>₹${item.price} × 
          <button class="qty-btn" data-id="${item.id}" data-action="dec">-</button>
          ${item.qty}
          <button class="qty-btn" data-id="${item.id}" data-action="inc">+</button>
        </div>
        <div>₹${subtotal}</div>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });

  totalEl.textContent = total;
  updateCartBadge(totalCount);
}

function updateCartBadge(count) {
  const badge = cartToggleBtn.querySelector('.cart-badge');
  if (badge) badge.remove();

  if (count > 0) {
    const b = document.createElement('span');
    b.className = 'cart-badge';
    b.style.cssText = `position:absolute;top:-8px;right:-8px;background:red;color:white;font-size:12px;font-weight:bold;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;`;
    b.textContent = count > 9 ? '9+' : count;
    cartToggleBtn.style.position = 'relative';
    cartToggleBtn.appendChild(b);
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
  const p = document.getElementById('cart-popup');
  p.style.display = p.style.display === 'block' ? 'none' : 'block';
}

function closeCart() {
  document.getElementById('cart-popup').style.display = 'none';
}

// ✅ PLACE ORDER: Only check isLoggedIn()
function placeOrder() {
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }

  if (!isLoggedIn()) {
    window.location.href = 'login.html'; // 🔁 Redirect if not logged in
    return;
  }

  // Get phone number for order
  const session = JSON.parse(localStorage.getItem('mirdhuna_session'));
  const order = {
    phoneNumber: session.phoneNumber,
    items: cart,
    total: parseFloat(document.getElementById('cartTotal').textContent),
    timestamp: new Date().toISOString(),
    status: "pending"
  };

  push(ref(db, 'orders'), order)
    .then(() => {
      alert("Order placed successfully!");
      cart = [];
      saveCart();
      updateCartUI();
      closeCart();
    })
    .catch(err => {
      console.error(err);
      alert("Failed to place order.");
    });
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:10px 20px;border-radius:6px;z-index:2000;font-size:14px;`;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2000);
}

// Init
updateAuthUI();
updateCartUI();
loadShopData();

// Events
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-cart-btn')) {
    const btn = e.target;
    addToCart(btn.dataset.id, btn.dataset.name, parseFloat(btn.dataset.price), btn.dataset.image);
  } else if (e.target.classList.contains('qty-btn')) {
    const id = e.target.dataset.id;
    const action = e.target.dataset.action;
    changeQty(id, action === 'inc' ? 1 : -1);
  } else if (e.target.id === 'cart-toggle-btn') {
    toggleCart();
  } else if (e.target.id === 'close-cart') {
    closeCart();
  } else if (e.target.id === 'checkout-btn') {
    placeOrder();
  }
});
