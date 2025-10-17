// search.js — standalone search page
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

function renderItems(items) {
  const container = document.getElementById('results');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="no-results">No items match your search.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const name = (item.name || 'Unnamed Item').replace(/"/g, '&quot;');
    const price = safeNumber(item.price, 0).toFixed(2);
    const mrpDisplay = (item.mrp && item.mrp > item.price) 
      ? `<del style="color:#999;font-size:13px">₹${item.mrp}</del>` 
      : '';
    
    return `
      <div class="menu-card">
        <img class="menu-img" src="${item.image || ''}" alt="${name}" />
        <div class="menu-info">
          <div class="menu-name">${name}</div>
          <div style="display:flex;gap:6px;align-items:center;">
            ${mrpDisplay}
            <div class="menu-price">₹${price}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
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

// Load menu from Firebase once
onValue(ref(db, 'menu'), snapshot => {
  const arr = [];
  snapshot.forEach(child => {
    const it = child.val() || {};
    it.id = child.key;
    it.name = it.name || it.title || `Item ${child.key}`;
    it.price = safeNumber(it.price, 0);
    it.mrp = it.mrp !== undefined ? safeNumber(it.mrp, it.mrp) : it.mrp;
    it.image = it.image || '';
    arr.push(it);
  });
  allMenuItems = arr;
  // If there's a query in URL (optional), auto-search
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  if (q) {
    document.getElementById('search-input').value = q;
    performSearch(q);
  }
});

// Search as you type (with debounce)
let searchTimer;
document.getElementById('search-input')?.addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    performSearch(e.target.value);
  }, 300);
});
