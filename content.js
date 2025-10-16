// content.js — full replacement (fixed popup qty & login issues)
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
let viewMode = 'grid';

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

const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

const gridViewBtn = document.getElementById('grid-view');
const listViewBtn = document.getElementById('list-view');

const productPopup = document.getElementById('productPopup');
const ppImg = document.getElementById('pp-img');
const ppName = document.getElementById('pp-name');
const ppDesc = document.getElementById('pp-desc');
const ppPrice = document.getElementById('pp-price');
const ppQty = document.getElementById('pp-qty');
const ppAdd = document.getElementById('pp-add');
const ppClose = document.getElementById('pp-close');

const checkoutModal = document.getElementById('checkoutModal');
const checkoutPhone = document.getElementById('checkout-phone');
const checkoutAddress = document.getElementById('checkout-address');
const checkoutPayment = document.getElementById('checkout-payment');
const checkoutInstructions = document.getElementById('checkout-instructions');
const checkoutPlace = document.getElementById('checkout-place');
const checkoutCancel = document.getElementById('checkout-cancel');

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
  setTimeout(() => { toastEl.style.opacity = '0'; }, 2200);
}

/* =========================
   Auth
========================= */
function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true';
}

function getCurrentPhone() {
  return localStorage.getItem('userPhone') || '';
}

function updateAuthUI() {
  if (!authBar) return;
  if (isLoggedIn()) {
    const phone = getCurrentPhone();
    authBar.innerHTML = `Logged in — ${phone} <button onclick="logout()">Logout</button>`;
  } else {
    authBar.innerHTML = `Welcome! <a href="login.html" style="color:white;text-decoration:underline">Login to Order</a>`;
    // clear cart for non-logged-in user
    cart = [];
    saveCart();
    updateCartUI();
  }
}
window.logout = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userPhone');
  updateAuthUI();
};

/* =========================
   Cart storage
========================= */
function loadCartFromStorage() {
  const userPhone = getCurrentPhone();
  const raw = JSON.parse(localStorage.getItem(`cart_${userPhone}`)) || [];
  cart = raw.map((it, idx) => ({
    id: it?.id || `temp-${Date.now()}-${idx}`,
    name: it?.name || 'Unnamed Item',
    price: safeNumber(it?.price, 0),
    image: it?.image || '',
    qty: Math.max(1, parseInt(it?.qty) || 1)
  }));
  saveCart();
}

function saveCart() {
  const userPhone = getCurrentPhone();
  localStorage.setItem(`cart_${userPhone}`, JSON.stringify(cart));
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
    div.innerHTML = `<img class="category-img" src="${cat.image||''}" alt="${cat.name||'Category'}"/><div class="category-name">${cat.name||'Unknown'}</div>`;
    div.addEventListener('click', () => { selectedCategory = cat.name; renderMenu(); });
    categoryCarousel.appendChild(div);
  });
}

function renderMenu() {
  if (!menuGrid) return;
  menuGrid.innerHTML = '';
  let items = selectedCategory ? menuItems.filter(i => i.category === selectedCategory) : [...menuItems];

  const term = (searchInput?.value || '').trim().toLowerCase();
  if (term) items = items.filter(i => (i.name||'').toLowerCase().includes(term));

  const sortVal = (sortSelect?.value || 'default');
  if (sortVal==='price-low-high') items.sort((a,b)=>a.price-b.price);
  else if (sortVal==='price-high-low') items.sort((a,b)=>b.price-a.price);
  else if (sortVal==='offer-first') items.sort((a,b)=>b.offer?1:0-(a.offer?1:0));

  if (!items.length) {
    menuGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;">No items available</p>';
    menuGrid.style.gridTemplateColumns = '1fr';
    return;
  }

  items.forEach(item => {
    const safeName = (item.name || 'Unnamed Item').replace(/"/g,'&quot;');
    const safePrice = safeNumber(item.price,0).toFixed(2);
    const mrpDisplay = (item.mrp && item.mrp>item.price)?`<del style="color:#999;font-size:14px">₹${item.mrp}</del>`:'';
    const discountDisplay = (item.mrp && item.mrp>item.price)?`<div style="color:#d40000;font-size:13px;font-weight:600;margin-top:2px;">${Math.round(((item.mrp-item.price)/item.mrp)*100)}% OFF</div>`:'';

    const card = document.createElement('div');
    card.className = `menu-card ${viewMode==='list'?'list-view':''}`;
    card.innerHTML = `
      <img class="menu-img" loading="lazy" src="${item.image||''}" alt="${safeName}" />
      <div class="menu-info">
        <div class="menu-name">${safeName}</div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${mrpDisplay}
          <div class="menu-price">₹${safePrice}</div>
          ${discountDisplay}
        </div>
        ${item.offer?`<div class="offer-tag">OFFER</div>`:''}
        <button class="add-cart-btn" data-id="${item.id}" data-name="${safeName}" data-price="${safeNumber(item.price,0)}" data-image="${item.image||''}">Add to Cart</button>
      </div>
    `;

    const imgEl = card.querySelector('.menu-img');
    imgEl?.addEventListener('click',()=>openProductPopup(item));
    card.addEventListener('click',(e)=>{
      if(!e.target.classList.contains('add-cart-btn') && e.target!==imgEl) openProductPopup(item);
    });

    menuGrid.appendChild(card);
  });

  menuGrid.style.gridTemplateColumns = viewMode==='list'?'1fr':'repeat(2,1fr)';
}

/* =========================
   Product Popup
========================= */
let popupCurrentItem = null;
function openProductPopup(item){
  if(!isLoggedIn()){ return showToast('Please login first to add items'); }

  popupCurrentItem = item;
  if(!productPopup){ createInlineProductPopup(item); return; }

  ppImg && (ppImg.src=item.image||'');
  ppName && (ppName.textContent=item.name||'Unnamed Item');
  ppDesc && (ppDesc.textContent=item.description||'');
  ppPrice && (ppPrice.textContent=`₹${safeNumber(item.price,0).toFixed(2)}`);
  if(ppQty) ppQty.value=1;

  ensurePopupQtyControls();

  if(ppAdd){
    ppAdd.dataset.id=item.id||'';
    ppAdd.dataset.name=item.name||'';
    ppAdd.dataset.price=String(safeNumber(item.price,0));
    ppAdd.dataset.image=item.image||'';
  }

  productPopup.style.display='flex';
}

function ensurePopupQtyControls(){
  if(!ppQty) return;
  if(document.getElementById('pp-minus') && document.getElementById('pp-plus')) return;

  const minus=document.createElement('button');
  minus.type='button'; minus.id='pp-minus'; minus.textContent='−';
  minus.style.marginRight='8px'; minus.style.padding='6px'; minus.style.cursor='pointer';
  minus.addEventListener('click',()=>{ let v=parseInt(ppQty.value)||1; if(v>1) ppQty.value=v-1; });

  const plus=document.createElement('button');
  plus.type='button'; plus.id='pp-plus'; plus.textContent='+';
  plus.style.marginLeft='8px'; plus.style.padding='6px'; plus.style.cursor='pointer';
  plus.addEventListener('click',()=>{ let v=parseInt(ppQty.value)||1; ppQty.value=v+1; });

  ppQty.insertAdjacentElement('beforebegin',minus);
  ppQty.insertAdjacentElement('afterend',plus);
}

function createInlineProductPopup(item){
  const tmp=document.createElement('div');
  tmp.id='productPopupInline';
  tmp.style.position='fixed'; tmp.style.inset='0'; tmp.style.display='flex'; tmp.style.alignItems='center'; tmp.style.justifyContent='center';
  tmp.style.background='rgba(0,0,0,0.6)'; tmp.style.zIndex='99999';
  tmp.innerHTML=`
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
  document.getElementById('inline-close').onclick=()=>tmp.remove();
  document.getElementById('inline-plus').onclick=()=>{ const q=document.getElementById('inline-qty'); q.value=Number(q.value||1)+1; };
  document.getElementById('inline-minus').onclick=()=>{ const q=document.getElementById('inline-qty'); if(Number(q.value)>1) q.value=Number(q.value)-1; };
  document.getElementById('inline-add').onclick=()=>{
    const qty=Number(document.getElementById('inline-qty').value)||1;
    addToCart(item.id,item.name,safeNumber(item.price,0),item.image||'',qty);
    tmp.remove();
  };
}

ppClose && ppClose.addEventListener('click',()=>{ if(productPopup) productPopup.style.display='none'; });
ppAdd && ppAdd.addEventListener('click',()=>{
  const qty=Math.max(1,parseInt(ppQty?.value||'1'));
  const id=ppAdd.dataset.id||(`temp-${Date.now()}`);
  const name=ppAdd.dataset.name||(popupCurrentItem && popupCurrentItem.name)||'Unnamed Item';
  const price=safeNumber(ppAdd.dataset.price,popupCurrentItem?popupCurrentItem.price:0);
  const image=ppAdd.dataset.image||(popupCurrentItem && popupCurrentItem.image)||'';
  addToCart(id,name,price,image,qty);
  if(productPopup) productPopup.style.display='none';
});
productPopup && productPopup.addEventListener('click',(e)=>{ if(e.target===productPopup) productPopup.style.display='none'; });

/* =========================
   Cart functions
========================= */
function addToCart(id,name,price,image,qty=1){
  if(!isLoggedIn()){ return showToast('Please login first to add items'); }
  const itemId=id||`temp-${Date.now()}`;
  const itemName=name||'Unnamed Item';
  const itemPrice=safeNumber(price,0);
  const itemImage=image||'';
  const itemQty=Math.max(1,Number(qty)||1);

  const existing=cart.find(c=>c.id===itemId);
  if(existing) existing.qty=itemQty; // replace qty from popup
  else cart.push({id:itemId,name:itemName,price:itemPrice,image:itemImage,qty:itemQty});

  saveCart(); updateCartUI();
  showToast(`${itemName} added (${itemQty})`);
}

function updateCartUI(){
  if(!cartItemsEl || !cartTotalEl) return;
  cartItemsEl.innerHTML='';
  let total=0; let totalCount=0;
  const fallbackImg='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect width=%2260%22 height=%2260%22 fill=%22%23f0f0f0%22/%3E%3C/svg%3E';

  for(const it of cart){
    const price=safeNumber(it.price,0);
    const qty=Math.max(0,Number(it.qty)||0);
    const subtotal=price*qty; total+=subtotal; totalCount+=qty;

    const div=document.createElement('div');
    div.className='cart-item';
    div.style.display='flex'; div.style.alignItems='center'; div.style.marginBottom='6px';
    div.innerHTML=`
      <img src="${it.image||fallbackImg}" width="40" height="40" style="object-fit:cover;margin-right:8px;">
      <div style="flex:1;">
        <div>${it.name}</div>
        <div style="font-size:12px;color:#555;">₹${price} × ${qty} = ₹${subtotal.toFixed(2)}</div>
      </div>
      <button style="padding:2px 6px;margin-left:4px;" class="cart-remove">✕</button>
    `;
    div.querySelector('.cart-remove').addEventListener('click',()=>{ removeCartItem(it.id); });
    cartItemsEl.appendChild(div);
  }

  cartTotalEl.textContent=`Total: ₹${total.toFixed(2)} (${totalCount} items)`;
}

function removeCartItem(id){
  cart=cart.filter(c=>c.id!==id);
  saveCart(); updateCartUI();
}

/* =========================
   Checkout
========================= */
checkoutPlace?.addEventListener('click',()=>{
  if(!isLoggedIn()){ return showToast('Please login first'); }
  if(!cart.length){ return showToast('Cart is empty'); }

  const phone=checkoutPhone.value.trim()||getCurrentPhone();
  if(!phone) return showToast('Phone is required');

  const address=checkoutAddress.value.trim();
  const payment=checkoutPayment.value.trim()||'Cash on Delivery';
  const instructions=checkoutInstructions.value.trim()||'';

  const orderRef=ref(db,'orders');
  const timestamp=new Date().toISOString();

  push(orderRef,{
    phone,
    items:cart,
    total:cart.reduce((acc,it)=>acc+safeNumber(it.price)*safeNumber(it.qty),0),
    paymentMode:payment,
    address,
    instructions,
    status:'pending',
    timestamp
  }).then(()=>{
    showToast('Order placed!');
    cart=[]; saveCart(); updateCartUI();
    if(checkoutModal) checkoutModal.style.display='none';
  }).catch(err=>{
    console.error(err); showToast('Error placing order');
  });
});

checkoutCancel?.addEventListener('click',()=>{ if(checkoutModal) checkoutModal.style.display='none'; });

/* =========================
   Events
========================= */
cartToggleBtn?.addEventListener('click',()=>{ if(cartPopupEl) cartPopupEl.style.display=cartPopupEl.style.display==='flex'?'none':'flex'; });
searchInput?.addEventListener('input',()=>renderMenu());
sortSelect?.addEventListener('change',()=>renderMenu());
gridViewBtn?.addEventListener('click',()=>{ viewMode='grid'; renderMenu(); });
listViewBtn?.addEventListener('click',()=>{ viewMode='list'; renderMenu(); });

/* =========================
   Init
========================= */
updateAuthUI();
loadCartFromStorage();
updateCartUI();
loadShopData();
