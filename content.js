import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

let categories = [];
let menuItems = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentOffer = null;
let selectedCategory = null;
let currentUser = null;

const authBar = document.getElementById('auth-bar');
const categoryCarousel = document.getElementById('categoryCarousel');
const menuGrid = document.getElementById('menuGrid');
const offerBanner = document.getElementById('offerBanner');

// Auth state listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authBar.innerHTML = `Hello, ${user.displayName || 'User'}! <button onclick="signOut()">Logout</button>`;
  } else {
    authBar.innerHTML = `Welcome! <button onclick="signIn()">Login to Order</button>`;
  }
  loadShopData();
});

function signIn() {
  signInWithPopup(auth, provider).catch(console.error);
}

function signOut() {
  auth.signOut();
}

function loadShopData() {
  // Load categories
  onValue(ref(db, 'categories'), snapshot => {
    categories = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderCategories();
  });

  // Load menu
  onValue(ref(db, 'menu'), snapshot => {
    menuItems = snapshot.val() ? Object.values(snapshot.val()) : [];
    renderMenu();
  });

  // Load offers
  onValue(ref(db, 'offers'), snapshot => {
    const offers = snapshot.val();
    currentOffer = null;
    if (offers) {
      const activeOffers = Object.values(offers).filter(o => o.active);
      if (activeOffers.length > 0) {
        currentOffer = activeOffers[0];
      }
    }
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
      <img class="category-img" src="${cat.image}" alt="${cat.name}" onerror="this.src='image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><circle cx=%2230%22 cy=%2230%22 r=%2228%22 fill=%22%23f0f0f0%22 stroke=%22%23ddd%22 stroke-width=%222%22/><text x=%2230%22 y=%2235%22 font-size=%2210%22 fill=%22%23999%22 text-anchor=%22middle%22>?</text></svg>'" />
      <div class="category-name">${cat.name}</div>
    `;
    div.addEventListener('click', () => {
      selectedCategory = cat.name;
      renderMenu();
    });
    categoryCarousel.appendChild(div);
  });

  let scrollPos = 0;
  setInterval(() => {
    scrollPos += 1;
    categoryCarousel.scrollLeft = scrollPos;
    if (scrollPos >= categoryCarousel.scrollWidth - categoryCarousel.clientWidth) {
      scrollPos = 0;
    }
  }, 50);
}

function renderMenu() {
  menuGrid.innerHTML = '';
  let itemsToRender = menuItems;

  if (selectedCategory) {
    itemsToRender = menuItems.filter(item => item.category === selectedCategory);
  }

  if (itemsToRender.length === 0) {
    menuGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#999;">No items available</p>';
    return;
  }

  itemsToRender.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <img class="menu-img" src="${item.image}" alt="${item.name}" />
      <div class="menu-info">
        <div class="menu-name">${item.name}</div>
        <div class="menu-price">₹${item.price}</div>
        ${item.offer ? `<div class="offer-tag">OFFER</div>` : ''}
        <button class="add-cart-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">Add to Cart</button>
      </div>
    `;
    menuGrid.appendChild(card);
  });
}

// Cart Functions
function addToCart(id, name, price, image) {
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id, name, price, image, qty: 1 });
  }
  saveCart();
  updateCartUI();
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartUI() {
  const cartItemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');

  cartItemsEl.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img class="cart-img" src="${item.image}" />
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

  totalEl.textContent = total.toFixed(2);
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
    saveCart();
    updateCartUI();
  }
}

function toggleCart() {
  document.getElementById('cart-popup').style.display = 
    document.getElementById('cart-popup').style.display === 'none' ? 'block' : 'none';
}

function closeCart() {
  document.getElementById('cart-popup').style.display = 'none';
}

function placeOrder() {
  if (!cart || cart.length === 0) {
    alert("Cart is empty!");
    return;
  }

  if (!currentUser) {
    alert("Please login to place order.");
    signIn();
    return;
  }

  const order = {
    userId: currentUser.uid,
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

updateCartUI();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('menuGrid').addEventListener('click', (e) => {
    if (e.target.classList.contains('add-cart-btn')) {
      const btn = e.target;
      addToCart(
        btn.dataset.id,
        btn.dataset.name,
        parseFloat(btn.dataset.price),
        btn.dataset.image
      );
    }
  });

  document.getElementById('cart-toggle-btn')?.addEventListener('click', toggleCart);
  document.getElementById('close-cart')?.addEventListener('click', closeCart);
  document.getElementById('checkout-btn')?.addEventListener('click', placeOrder);

  document.getElementById('cartItems').addEventListener('click', (e) => {
    if (e.target.classList.contains('qty-btn')) {
      const id = e.target.dataset.id;
      const action = e.target.dataset.action;
      changeQty(id, action === 'inc' ? 1 : -1);
    }
  });
});
