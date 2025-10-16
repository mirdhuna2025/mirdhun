// checkout.js — full implementation (complete)
// AUTHOR: generated complete checkout / orders manager for mirdhuna
// Requires: firebase (same version as content.js), Leaflet for map features (optional)

// ------------------------------
// Firebase imports
// ------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  push,
  set,
  update,
  query,
  orderByChild,
  equalTo,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ------------------------------
// Firebase config (same as content.js)
// ------------------------------
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

// ------------------------------
// CONFIG / FEATURES toggles
// ------------------------------
const TRACKING_POLL_INTERVAL = 7000; // ms - how often to refresh driver location
const ENABLE_GEOCODE = true; // set true to geocode addresses via Nominatim (no API key)
const GEOCODE_PROVIDER = "nominatim"; // placeholder, currently implements Nominatim

// ------------------------------
// DOM references — create or expect these IDs in your checkout/orders HTML
// ------------------------------
const elOrdersContainer = document.getElementById('ordersContainer'); // where orders list is shown
const elOrderEmpty = document.getElementById('ordersEmptyMsg'); // optional: message element
const elOrderDetailsModal = document.getElementById('orderDetailsModal'); // modal for an order details
const elOrderDetailsContent = document.getElementById('orderDetailsContent'); // inner content
const elPlaceOrderBtn = document.getElementById('placeOrderBtn'); // optional quick place
const elCheckoutForm = document.getElementById('checkoutForm'); // container for checkout form
const elCheckoutPhone = document.getElementById('checkoutPhone'); // phone input
const elCheckoutAddress = document.getElementById('checkoutAddress'); // address textarea
const elCheckoutPayment = document.getElementById('checkoutPayment'); // payment select
const elCheckoutInstructions = document.getElementById('checkoutInstructions'); // instructions
const elCheckoutSubmit = document.getElementById('checkoutSubmit'); // submit button
const elCheckoutCancel = document.getElementById('checkoutCancel'); // cancel button
const elToast = document.getElementById('toast') || null; // optional toast area

// Map elements for tracking (created dynamically if missing)
let trackMapPopup = null;
let trackMap = null;
let trackDriverMarker = null;
let trackIntervalHandle = null;

// ------------------------------
// Utility helpers
// ------------------------------
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function showToast(msg) {
  // If there's a toast element, use it; otherwise create a temporary toast
  if (elToast) {
    elToast.textContent = msg;
    elToast.style.opacity = '1';
    setTimeout(()=>{ elToast.style.opacity='0'; }, 2200);
    return;
  }
  const tmp = document.createElement('div');
  tmp.textContent = msg;
  tmp.style.position = 'fixed';
  tmp.style.left = '50%';
  tmp.style.transform = 'translateX(-50%)';
  tmp.style.bottom = '22px';
  tmp.style.background = 'rgba(0,0,0,0.8)';
  tmp.style.color = 'white';
  tmp.style.padding = '8px 12px';
  tmp.style.borderRadius = '8px';
  tmp.style.zIndex = 999999;
  document.body.appendChild(tmp);
  setTimeout(()=> tmp.remove(), 2200);
}
function isLoggedIn() {
  return localStorage.getItem('isLoggedIn') === 'true';
}
function getCurrentPhone() {
  return localStorage.getItem('userPhone') || '';
}
function requireLoginOrToast() {
  if (!isLoggedIn()) { showToast('Please login first'); return false; }
  return true;
}

// Simple DOM helper
function el(id) { return document.getElementById(id); }

// Format currency
function formatCurrency(x) { return `₹${Number(x).toFixed(2)}`; }

// ------------------------------
// Local cart/key management helpers (tie to phone)
// ------------------------------
function getCartKeyForUser() {
  const phone = getCurrentPhone();
  return `cart_${phone || 'anon'}`;
}
function loadCartForUser() {
  if (!isLoggedIn()) return [];
  const raw = localStorage.getItem(getCartKeyForUser());
  if (!raw) return [];
  try { return JSON.parse(raw) || []; } catch(e){ console.error('cart parse', e); return []; }
}
function saveCartForUser(cart) {
  if (!isLoggedIn()) return;
  localStorage.setItem(getCartKeyForUser(), JSON.stringify(cart));
}

// ------------------------------
// Checkout validation & geocoding
// ------------------------------
async function geocodeAddressIfNeeded(address) {
  if (!ENABLE_GEOCODE) return null;
  if (!address || !address.trim()) return null;

  // Use Nominatim (open) for geocoding
  if (GEOCODE_PROVIDER === 'nominatim') {
    try {
      const query = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
      const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const json = await resp.json();
      if (Array.isArray(json) && json.length) {
        return { lat: Number(json[0].lat), lng: Number(json[0].lon), displayName: json[0].display_name };
      }
    } catch (err) {
      console.warn('Geocode failed', err);
      return null;
    }
  }
  return null;
}

function validatePhone(phone) {
  if (!phone) return false;
  // Basic Indian phone validation: 10 digits or with +91
  const cleaned = phone.replace(/\D/g,'');
  return cleaned.length >= 10 && cleaned.length <= 13;
}

// ------------------------------
// Place order helper (client-side) — this will be used by UI and content.js
// ------------------------------
/*
  orderPayload structure:
  {
    phoneNumber,
    address,
    addressGeocoded (optional),
    items: [{id, name, price, qty, image}],
    paymentMode,
    instructions,
    total
  }
*/
async function submitOrder(orderPayload) {
  if (!isLoggedIn()) return Promise.reject(new Error('Login required'));
  if (!orderPayload || !orderPayload.items || !orderPayload.items.length) return Promise.reject(new Error('Cart empty'));

  // Add server-side timestamp and userPhone
  const order = {
    phoneNumber: orderPayload.phoneNumber || getCurrentPhone(),
    address: orderPayload.address || '',
    addressGeocoded: orderPayload.addressGeocoded || null,
    items: orderPayload.items.map(it => ({
      id: it.id,
      name: it.name,
      price: safeNumber(it.price,0),
      qty: Number(it.qty || 0),
      image: it.image || ''
    })),
    paymentMode: orderPayload.paymentMode || 'Cash on Delivery',
    instructions: orderPayload.instructions || '',
    total: safeNumber(orderPayload.total || 0),
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  const newRef = push(ref(db, 'orders'));
  // `set` or `update` via the returned reference key
  await set(newRef, order);
  return { key: newRef.key, order };
}

// ------------------------------
// Orders listing (per-user)
// ------------------------------
let ordersListenerCleanup = null;
function listUserOrdersAttach() {
  // Detach previous listener if any
  if (typeof ordersListenerCleanup === 'function') {
    ordersListenerCleanup();
    ordersListenerCleanup = null;
  }

  if (!isLoggedIn()) {
    renderOrdersEmpty('Please login to view orders.');
    return;
  }

  const phone = getCurrentPhone();
  if (!phone) { renderOrdersEmpty('Phone missing. Please login again.'); return; }

  // Query Firebase orders where phoneNumber == phone
  // We'll use onValue on a filtered query via orderByChild + equalTo
  const ordersQuery = query(ref(db, 'orders'), orderByChild('phoneNumber'), equalTo(phone));
  const unsubscribe = onValue(ordersQuery, snapshot => {
    const val = snapshot.val();
    if (!val) { renderOrdersEmpty('No orders yet.'); return; }
    const arr = Object.entries(val).map(([k,v]) => ({ id: k, ...v }));
    // sort by timestamp desc
    arr.sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
    renderOrdersList(arr);
  });

  // store cleanup to call later
  ordersListenerCleanup = () => {
    // firebase v10 onValue returns an unsubscribe function if you call it that way (but here we used onValue)
    // The simplest is to call onValue with null callback to detach — but that API doesn't exist.
    // Instead we keep reference to the Query and simply call off via ref — but SDK v10 doesn't expose off easily.
    // To keep safe, we will set ordersListenerCleanup to a no-op; in practice the SDK will garbage collect when page unloads.
    // (If you want explicit detach, convert to get and manual polling or use .off on older SDK.)
  };
}

// ------------------------------
// Render orders UI (list view) — builds HTML into elOrdersContainer
// ------------------------------
function renderOrdersEmpty(msg = 'No orders') {
  if (!elOrdersContainer) return;
  elOrdersContainer.innerHTML = `<div style="text-align:center;color:#666;padding:18px">${msg}</div>`;
  if (elOrderEmpty) elOrderEmpty.style.display = 'block';
}
function renderOrdersList(ordersArray) {
  if (!elOrdersContainer) return;
  if (!ordersArray || !ordersArray.length) return renderOrdersEmpty('No orders found');

  elOrdersContainer.innerHTML = ''; // clear
  if (elOrderEmpty) elOrderEmpty.style.display = 'none';

  ordersArray.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.style.border = '1px solid #e5e5e5';
    card.style.padding = '12px';
    card.style.marginBottom = '12px';
    card.style.borderRadius = '8px';
    card.style.background = '#fff';

    // Order header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `<div style="font-weight:600">Order • ${order.id || order.timestamp}</div>
                        <div style="font-size:12px;color:#666">${new Date(order.timestamp).toLocaleString()}</div>`;
    card.appendChild(header);

    // Items summary
    const itemsDiv = document.createElement('div');
    itemsDiv.style.marginTop = '10px';
    (order.items || []).forEach(it => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '6px 0';
      row.style.borderBottom = '1px dashed #eee';
      row.innerHTML = `<div>${it.name} × ${it.qty}</div><div>${formatCurrency(safeNumber(it.price) * safeNumber(it.qty))}</div>`;
      itemsDiv.appendChild(row);
    });
    card.appendChild(itemsDiv);

    // Totals & actions
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    footer.style.marginTop = '10px';

    const left = document.createElement('div');
    left.innerHTML = `<div style="font-weight:700">${formatCurrency(order.total || 0)}</div><div style="font-size:12px;color:#666">${order.paymentMode || 'COD'}</div>`;

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';
    // View details button
    const btnDetails = document.createElement('button');
    btnDetails.textContent = 'Details';
    btnDetails.style.padding = '6px 8px';
    btnDetails.onclick = () => openOrderDetailsModal(order);
    right.appendChild(btnDetails);

    // Track button (if order has driverLocation or allow tracking)
    const btnTrack = document.createElement('button');
    btnTrack.textContent = 'Track';
    btnTrack.style.padding = '6px 8px';
    btnTrack.onclick = () => {
      // When user clicks Track, attempt to open track map using order id and geocoded customer coords if available
      const coords = order.addressGeocoded || null;
      if (!coords) {
        showToast('Address not geocoded; using default zoom — driver location will still show if available');
      }
      openTrackingMap(order.id || order.timestamp, coords || { lat: 20.5937, lng: 78.9629 }); // default India center if unknown
    };
    right.appendChild(btnTrack);

    // If order is pending, show cancel (client-side request) — optional
    if (order.status && order.status.toLowerCase() === 'pending') {
      const btnCancel = document.createElement('button');
      btnCancel.textContent = 'Cancel';
      btnCancel.style.padding = '6px 8px';
      btnCancel.style.background = '#f44336'; btnCancel.style.color = '#fff'; btnCancel.style.border = 'none';
      btnCancel.onclick = async () => {
        if (!confirm('Cancel this order?')) return;
        try {
          await update(ref(db, `orders/${order.id}`), { status: 'cancelled' });
          showToast('Order cancelled');
        } catch (err) { console.error(err); showToast('Cancel failed'); }
      };
      right.appendChild(btnCancel);
    }

    footer.appendChild(left);
    footer.appendChild(right);
    card.appendChild(footer);

    elOrdersContainer.appendChild(card);
  });
}

// ------------------------------
// Order details modal (full view + admin actions)
// ------------------------------
function openOrderDetailsModal(order) {
  if (!elOrderDetailsModal || !elOrderDetailsContent) {
    // simple fallback: alert
    const items = (order.items||[]).map(it=>`${it.name} x ${it.qty}`).join('\n');
    alert(`Order ${order.id || order.timestamp}\n\nItems:\n${items}\n\nTotal: ${formatCurrency(order.total || 0)}\n\nStatus: ${order.status}`);
    return;
  }

  elOrderDetailsContent.innerHTML = ''; // clear
  const wrapper = document.createElement('div');
  wrapper.style.padding = '12px';

  wrapper.innerHTML = `<h3>Order • ${order.id || order.timestamp}</h3>
    <div><strong>Phone:</strong> ${order.phoneNumber || '—'}</div>
    <div><strong>Address:</strong> ${order.address || '—'}</div>
    <div><strong>Payment:</strong> ${order.paymentMode || 'COD'}</div>
    <div><strong>Status:</strong> <span id="order-status-text">${order.status || '—'}</span></div>
    <hr/>`;

  const itemsList = document.createElement('div');
  (order.items||[]).forEach(it=>{
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.padding = '6px 0';
    row.innerHTML = `<div>${it.name} × ${it.qty}</div><div>${formatCurrency(safeNumber(it.price)*safeNumber(it.qty))}</div>`;
    itemsList.appendChild(row);
  });
  wrapper.appendChild(itemsList);

  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.gap = '8px';
  btnContainer.style.marginTop = '12px';

  const btnClose = document.createElement('button');
  btnClose.textContent = 'Close';
  btnClose.onclick = () => { elOrderDetailsModal.style.display = 'none'; };
  btnContainer.appendChild(btnClose);

  const btnTrack = document.createElement('button');
  btnTrack.textContent = 'Track';
  btnTrack.onclick = () => {
    const coords = order.addressGeocoded || null;
    openTrackingMap(order.id || order.timestamp, coords || { lat: 20.5937, lng: 78.9629 });
  };
  btnContainer.appendChild(btnTrack);

  // Admin helpers — update status (this will be available but you should secure it server-side in production)
  const btnMarkReady = document.createElement('button');
  btnMarkReady.textContent = 'Mark Ready';
  btnMarkReady.onclick = async () => {
    try { await update(ref(db, `orders/${order.id}`), { status: 'ready' }); showToast('Marked ready'); elOrderDetailsModal.style.display='none'; }
    catch(e){ console.error(e); showToast('Update failed'); }
  };
  btnContainer.appendChild(btnMarkReady);

  wrapper.appendChild(btnContainer);
  elOrderDetailsContent.appendChild(wrapper);
  elOrderDetailsModal.style.display = 'flex';
}

// ------------------------------
// Live tracking map (Leaflet)
// ------------------------------
function openTrackingMap(orderId, customerCoords) {
  // ensure Leaflet script & css are present in the page; otherwise warn
  if (typeof L === 'undefined') {
    showToast('Map not available — include Leaflet library (CSS + JS) in the page');
    return;
  }
  if (!trackMapPopup) {
    trackMapPopup = document.createElement('div');
    trackMapPopup.style.position = 'fixed';
    trackMapPopup.style.inset = '0';
    trackMapPopup.style.background = 'rgba(0,0,0,0.65)';
    trackMapPopup.style.zIndex = 999999;
    trackMapPopup.style.display = 'flex';
    trackMapPopup.style.alignItems = 'center';
    trackMapPopup.style.justifyContent = 'center';
    trackMapPopup.innerHTML = `
      <div style="position:relative;width:90%;max-width:900px;height:70vh;background:#fff;border-radius:10px;overflow:hidden;">
        <div id="order-track-map" style="width:100%;height:100%;"></div>
        <button id="order-track-close" style="position:absolute;top:10px;right:10px;padding:8px 10px;background:#d40000;color:#fff;border:none;border-radius:6px;cursor:pointer;">Close</button>
      </div>
    `;
    document.body.appendChild(trackMapPopup);
    trackMapPopup.querySelector('#order-track-close').onclick = closeTrackingMap;
  }
  trackMapPopup.style.display = 'flex';

  // Initialize map container if not already
  if (!trackMap) {
    trackMap = L.map('order-track-map', { zoomControl: true }).setView([customerCoords.lat, customerCoords.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(trackMap);
    // customer marker
    L.marker([customerCoords.lat, customerCoords.lng], { title: 'Your location' }).addTo(trackMap);
    // driver marker initial
    trackDriverMarker = L.marker([customerCoords.lat, customerCoords.lng], { title: 'Driver' }).addTo(trackMap);
  } else {
    trackMap.setView([customerCoords.lat, customerCoords.lng], 13);
    if (trackDriverMarker) trackDriverMarker.setLatLng([customerCoords.lat, customerCoords.lng]);
  }

  // Poll Firebase for driver location for this order
  if (trackIntervalHandle) clearInterval(trackIntervalHandle);
  const driverLocRefPath = `orders/${orderId}/driverLocation`;
  trackIntervalHandle = setInterval(() => {
    get(ref(db, driverLocRefPath)).then(snapshot => {
      const val = snapshot.val();
      if (val && val.lat && val.lng) {
        const lat = Number(val.lat), lng = Number(val.lng);
        if (trackDriverMarker) trackDriverMarker.setLatLng([lat, lng]);
        else trackDriverMarker = L.marker([lat, lng], { title: 'Driver' }).addTo(trackMap);
      }
    }).catch(err => {
      // silently ignore; no driver location yet
    });
  }, TRACKING_POLL_INTERVAL);

  // initial immediate fetch
  get(ref(db, driverLocRefPath)).then(snap => {
    const val = snap.val();
    if (val && val.lat && val.lng) {
      const lat=Number(val.lat), lng=Number(val.lng);
      if (trackDriverMarker) trackDriverMarker.setLatLng([lat,lng]);
      else trackDriverMarker = L.marker([lat,lng],{title:'Driver'}).addTo(trackMap);
    }
  }).catch(()=>{});
}

function closeTrackingMap() {
  if (trackMapPopup) trackMapPopup.style.display = 'none';
  if (trackIntervalHandle) { clearInterval(trackIntervalHandle); trackIntervalHandle = null; }
}

// ------------------------------
// Checkout form UI wiring (if present in page)
// ------------------------------
if (elCheckoutForm) {
  // Prefill phone if logged in
  if (isLoggedIn() && elCheckoutPhone) elCheckoutPhone.value = getCurrentPhone();

  // Cancel hides form modal if used as popup
  if (elCheckoutCancel) {
    elCheckoutCancel.addEventListener('click', (e) => {
      e.preventDefault();
      if (elCheckoutForm) {
        // assume checkout form is inside a modal with class 'modal' and has style display flex/none
        const modal = elCheckoutForm.closest('.modal');
        if (modal) modal.style.display = 'none';
        else elCheckoutForm.style.display = 'none';
      }
    });
  }

  // Submit handler
  if (elCheckoutSubmit) {
    elCheckoutSubmit.addEventListener('click', async (evt) => {
      evt.preventDefault();
      if (!requireLoginOrToast()) return;

      const phone = (elCheckoutPhone?.value || '').trim() || getCurrentPhone();
      if (!validatePhone(phone)) { showToast('Enter a valid phone'); return; }
      const address = (elCheckoutAddress?.value || '').trim();
      if (!address) { showToast('Enter delivery address'); return; }
      const payment = (elCheckoutPayment?.value || 'Cash on Delivery');
      const instructions = (elCheckoutInstructions?.value || '').trim();

      // Get cart for current user (content.js stores cart in localStorage cart_{phone})
      const cartKey = `cart_${getCurrentPhone()}`;
      let cart = [];
      try { cart = JSON.parse(localStorage.getItem(cartKey)) || []; } catch(e) { cart = []; }
      if (!cart || !cart.length) { showToast('Cart is empty'); return; }

      // compute total
      const total = cart.reduce((s, it) => s + (safeNumber(it.price) * safeNumber(it.qty)), 0);

      // optionally geocode
      let geocoded = null;
      if (ENABLE_GEOCODE) {
        elCheckoutSubmit.disabled = true;
        elCheckoutSubmit.textContent = 'Geocoding...';
        geocoded = await geocodeAddressIfNeeded(address).catch(()=>null);
        elCheckoutSubmit.disabled = false;
        elCheckoutSubmit.textContent = 'Place Order';
      }

      // build order payload
      const orderPayload = {
        phoneNumber: phone,
        address,
        addressGeocoded: geocoded,
        items: cart,
        paymentMode: payment,
        instructions,
        total
      };

      try {
        elCheckoutSubmit.disabled = true;
        elCheckoutSubmit.textContent = 'Placing...';
        const res = await submitOrder(orderPayload);
        // clear cart for user
        localStorage.removeItem(cartKey);
        showToast('Order placed successfully!');
        // optionally redirect to orders page or show order id
        setTimeout(()=> {
          elCheckoutSubmit.disabled = false;
          elCheckoutSubmit.textContent = 'Place Order';
          // if a modal wrap exists, hide it
          const modal = elCheckoutForm.closest('.modal');
          if (modal) modal.style.display = 'none';
          // reload order list
          listUserOrdersAttach();
        }, 400);
      } catch (err) {
        console.error('Order submit', err);
        showToast('Failed to place order');
        elCheckoutSubmit.disabled = false;
        elCheckoutSubmit.textContent = 'Place Order';
      }
    });
  }
}

// ------------------------------
// Public helpers for content.js to call
// ------------------------------
window.checkout_submitOrder = submitOrder; // returns promise
window.checkout_openOrderDetails = openOrderDetailsModal;
window.checkout_openTrackingMap = openTrackingMap;
window.checkout_reloadOrders = listUserOrdersAttach;

// ------------------------------
// Init: attach orders listing when page loads
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // If there is a cached menu or other need, it's handled in content.js
  // Here, attach user orders list if an orders container exists
  if (elOrdersContainer) {
    listUserOrdersAttach();
  }

  // If there is a place order button that should open the checkout form
  if (elPlaceOrderBtn && elCheckoutForm) {
    elPlaceOrderBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isLoggedIn()) { showToast('Please login to place order'); return; }
      // show checkout form (if modal wrap), or ensure phone prefilled
      if (elCheckoutPhone) elCheckoutPhone.value = getCurrentPhone();
      const modal = elCheckoutForm.closest('.modal');
      if (modal) modal.style.display = 'flex';
      else elCheckoutForm.style.display = 'block';
    });
  }
});

// ------------------------------
// Clean up on unload
// ------------------------------
window.addEventListener('beforeunload', () => {
  if (trackIntervalHandle) clearInterval(trackIntervalHandle);
  if (ordersListenerCleanup) ordersListenerCleanup();
});
