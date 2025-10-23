// search.js — full-featured search with Add to Cart (using localStorage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

let allMenuItems = [];

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Load cart from localStorage
function getCart() {
  const cart = localStorage.getItem('cart');
  return cart ? JSON.parse(cart) : [];
}

// Save cart to localStorage
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Add item to cart
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(cart);
}

function showToast(message) {
  let toast = document.getElementById('search-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'search-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      z-index: 9999;
      font-size: 14px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      opacity: 0;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

function renderItems(items) {
  const container = document.getElementById('results');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="no-results">No items match your search.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const safeName = (item.name || 'Unnamed Item').replace(/"/g, '&quot;');
    const safePrice = safeNumber(item.price, 0).toFixed(2);
    const mrpDisplay = (item.mrp && item.mrp > item.price) 
      ? `<del style="color:#999;font-size:14px">₹${item.mrp}</del>` 
      : '';
    const discountDisplay = (item.mrp && item.mrp > item.price) 
      ? `<div style="color:#d40000;font-size:13px;font-weight:600;margin-top:2px;">
          ${Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
        </div>` 
      : '';

    const id = item.id || `temp-${Date.now()}`;
    const priceNum = safeNumber(item.price, 0);
    const image = item.image || '';

    return `
      <div class="menu-card">
        <img class="menu-img" src="${image}" alt="${safeName}" onerror="this.src='fallback-image.jpg'" />
        <div class="menu-info">
          <div class="menu-name">${safeName}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${mrpDisplay}
            <div class="menu-price">₹${safePrice}</div>
            ${discountDisplay}
          </div>
          ${item.offer ? `<div class="offer-tag">OFFER</div>` : ''}
          <button class="add-cart-btn" 
            data-id="${id}" 
            data-name="${safeName}" 
            data-price="${priceNum}" 
            data-image="${image}">
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach Add to Cart handler
  container.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const image = btn.dataset.image || '';

      const item = { id, name, price, image };

      // ✅ ACTUALLY ADD TO CART
      addToCart(item);

      showToast(`"${name}" added to cart!`);
      
     
    });
  });
}

function performSearch(query) {
  if (!query.trim()) {
    renderItems([]);
    return;
  }
  const term = query.toLowerCase();
  const filtered = allMenuItems.filter(item =>
    (item.name || '').toLowerCase().includes(term)
  );
  renderItems(filtered);
}

// Load menu from Firebase
onValue(ref(db, 'menu'), snapshot => {
  const arr = [];
  snapshot.forEach(child => {
    const it = child.val() || {};
    it.id = child.key;
    it.name = it.name || it.title || `Item ${child.key}`;
    it.price = safeNumber(it.price, 0);
    it.mrp = it.mrp !== undefined ? safeNumber(it.mrp, it.mrp) : it.mrp;
    it.image = it.image || '';
    it.offer = it.offer || false;
    arr.push(it);
  });
  allMenuItems = arr;

  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  if (q) {
    document.getElementById('search-input').value = q;
    performSearch(q);
  }
});

// Debounced search
let searchTimer;
document.getElementById('search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    performSearch(e.target.value);
  }, 300);
});
