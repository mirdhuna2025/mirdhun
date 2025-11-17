// ===== stickybar.js (FULLY UPDATED) =====
const authButton = document.getElementById('authButton');
const authText = document.getElementById('authText');
const homeBtn = document.getElementById('homeBtn');
const ordersBtn = document.getElementById('ordersBtn');
const searchBtn = document.getElementById('searchBtn');

const ordersContainer = document.getElementById('ordersContainer');

const popup = document.getElementById('mirdhuna-login-popup');
const closeBtn = document.getElementById('mirdhuna-close-popup');
const submitBtn = document.getElementById('mirdhuna-submit-login');
const mobInput = document.getElementById('mirdhuna-mob-input');

const ordersPopup = document.getElementById('orders-popup');
const closeOrdersBtn = document.getElementById('close-orders');

const trackPopup = document.getElementById('track-popup');
const closeTrackBtn = document.getElementById('close-track');

let db = null;

async function initFirebase() {
  if (db) return db;
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const { getDatabase } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

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
  db = getDatabase(app);
  return db;
}

function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  authText.textContent = isLoggedIn ? 'Logout' : 'Login';
}

function closeLoginPopup() {
  popup.style.display = 'none';
  mobInput.value = '';
}

async function handleLogin() {
  const number = mobInput.value.trim();
  if (!number || !/^[6-9]\d{9}$/.test(number)) {
    alert('Please enter a valid 10-digit Indian mobile number (starting with 6–9).');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  let location = null;
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      console.warn('Geolocation not available:', err);
    }
  }

  try {
    const database = await initFirebase();
    const { ref, push } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

    await push(ref(database, 'loginHistory'), {
      mobileNumber: number,
      timestamp: new Date().toISOString(),
      location: location || { error: 'Geolocation denied or unavailable' }
    });

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('mobileNumber', number);
    updateAuthUI();
    closeLoginPopup();
  } catch (error) {
    console.error('Firebase error:', error);
    alert('Login failed. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

async function loadOrders() {
  const userPhone = localStorage.getItem('mobileNumber');
  if (!userPhone) {
    ordersPopup.style.display = 'none';
    return;
  }

  ordersContainer.innerHTML = '<p id="loading" style="text-align:center; padding:20px; font-family:\'Poppins\',sans-serif;">Loading your orders...</p>';
  try {
    const database = await initFirebase();
    const { ref, onValue } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        ordersContainer.innerHTML = '<p style="text-align:center;">No orders found.</p>';
        return;
      }

      const myOrders = Object.entries(data)
        .filter(([key, order]) => order.phoneNumber === userPhone)
        .map(([key, order]) => ({ key, ...order }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (myOrders.length === 0) {
        ordersContainer.innerHTML = '<p style="text-align:center;">You haven’t placed any orders yet.</p>';
        return;
      }

      ordersContainer.innerHTML = '';
      myOrders.forEach(order => {
        const status = order.status || 'pending';
        const itemsList = order.items
          ? order.items.map(i => `<div>${i.name} × ${i.qty} <span>₹${(i.price * i.qty).toFixed(2)}</span></div>`).join('')
          : '<div>No items</div>';

        const imagesHtml = order.items && order.items.length > 0
          ? `<div class="order-images">${order.items.slice(0,3).map(i => `<img src="${i.image || ''}" alt="${i.name}" loading="lazy">`).join('')}</div>`
          : '';

        const total = order.total || 0;
        const payment = order.paymentMode || 'COD';
        const orderId = order.orderId || 'N/A';
        const placedDate = order.timestamp ? new Date(order.timestamp).toLocaleString() : '—';

        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
          <div class="order-header">
            <span class="order-id">Order #${orderId}</span>
            <span>📱 ${order.phoneNumber}</span>
          </div>
          <div class="order-meta">
            <p><strong>Placed:</strong> ${placedDate}</p>
            <p><strong>Payment:</strong> ${payment}</p>
            <p><strong>Total:</strong> ₹${total.toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="status-badge ${status}">${status}</span></p>
          </div>
          <div class="order-items">
            ${itemsList}
          </div>
          ${imagesHtml}
          ${
            status === 'on the way'
              ? `<button class="track-btn" 
                  data-order-id="${order.key}" 
                  data-lat="${order.lat || '28.6139'}" 
                  data-lng="${order.lng || '77.2090'}">
                  🚚 Track Live
                </button>`
              : ''
          }
          <div class="order-actions">
            <button class="btn-print" data-order='${JSON.stringify(order)}'>🖨️ Print</button>
            <button class="btn-whatsapp" data-msg="${encodeURIComponent(generateWhatsAppMessage(order))}" data-raw="${generateWhatsAppMessage(order)}">💬 WhatsApp</button>
          </div>
        `;
        ordersContainer.appendChild(card);
      });
    }, (error) => {
      console.error('DB error:', error);
      ordersContainer.innerHTML = '<div id="error">Failed to load orders.</div>';
    });
  } catch (err) {
    console.error('Init error:', err);
    ordersContainer.innerHTML = '<div id="error">Failed to connect.</div>';
  }
}

function generateWhatsAppMessage(order) {
  let msg = `*Mirdhuna Order*\n\n`;
  msg += `🔢 Order ID: ${order.orderId || 'N/A'}\n`;
  msg += `📱 Phone: ${order.phoneNumber || 'N/A'}\n`;
  msg += `💳 Payment: ${order.paymentMode || 'COD'}\n`;
  msg += `📦 Items:\n`;
  if (order.items && order.items.length > 0) {
    order.items.forEach(i => {
      msg += `• ${i.name} x${i.qty} — ₹${(i.price * i.qty).toFixed(2)}\n`;
    });
  } else {
    msg += `• No items\n`;
  }
  msg += `\n💰 Total: ₹${(order.total || 0).toFixed(2)}\n`;

  if (order.lat && order.lng) {
    msg += `\n📍 Location: https://maps.google.com/?q=${order.lat},${order.lng}`;
  }

  if (order.address) {
    msg += `\n🏠 Address: ${order.address}`;
  }

  if (order.instructions) {
    msg += `\n📝 Instructions: ${order.instructions}`;
  }

  msg += `\n\n✅ Ready for delivery!`;

  return msg;
}

// 👇 REAL-TIME TRACKING — uses <img> + valid key
document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('track-btn')) return;

  const orderId = e.target.dataset.orderId;
  const initialLat = parseFloat(e.target.dataset.lat) || 28.6139;
  const initialLng = parseFloat(e.target.dataset.lng) || 77.2090;

  const trackStatusEl = document.getElementById('track-status');
  const trackNoteEl = document.getElementById('track-note');
  const trackMapImg = document.getElementById('track-map'); // 👈 img, not iframe

  if (!trackMapImg || !trackStatusEl || !trackNoteEl) {
    console.error('Missing track-popup elements!');
    return;
  }

  // ✅ Render static map with YOUR key
  const apiKey = "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ";
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${initialLat},${initialLng}&zoom=15&size=400x300&scale=2&markers=color:red%7Clabel:%F0%9F%93%8D%7C${initialLat},${initialLng}&key=${apiKey}`;
  trackMapImg.src = url;

  trackStatusEl.textContent = '🚚 On the way';
  trackNoteEl.textContent = 'Loading location...';
  trackPopup.style.display = 'flex';

  // 🔁 Real-time updates
  let db, onValue;
  try {
    const { getDatabase } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const { onValue: _onValue } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    db = getDatabase();
    onValue = _onValue;
  } catch (err) {
    trackNoteEl.textContent = '⚠️ Tracking unavailable';
    return;
  }

  const trackingRef = ref(db, `tracking/${orderId}`);
  const unsubscribe = onValue(trackingRef, (snapshot) => {
    const updates = snapshot.val();
    if (!updates) return;

    let latest;
    if (Array.isArray(updates)) {
      latest = updates[updates.length - 1];
    } else if (typeof updates === 'object') {
      const keys = Object.keys(updates).sort();
      latest = updates[keys[keys.length - 1]];
    } else {
      latest = updates;
    }

    if (latest && latest.lat && latest.lng) {
      const url = `https://maps.googleapis.com/maps/api/staticmap?center=${latest.lat},${latest.lng}&zoom=16&size=400x300&scale=2&markers=color:red%7Clabel:%F0%9F%93%8D%7C${latest.lat},${latest.lng}&key=${apiKey}`;
      trackMapImg.src = url;
      const note = latest.note || 'Driver is en route';
      trackNoteEl.textContent = note;
      trackStatusEl.innerHTML = `🕒 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${note}`;
    }
  });

  const closeTracking = () => {
    if (unsubscribe) unsubscribe();
    trackPopup.style.display = 'none';
  };

  closeTrackBtn.onclick = closeTracking;
  trackPopup.onclick = (ev) => { if (ev.target === trackPopup) closeTracking(); };
});

// ===== EVENT LISTENERS =====
homeBtn?.addEventListener('click', () => {
  window.location.href = 'index.html';
});

ordersBtn?.addEventListener('click', () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    popup.style.display = 'flex';
    return;
  }
  ordersPopup.style.display = 'flex';
  loadOrders();
});

searchBtn?.addEventListener('click', () => {
  window.location.href = 'search.html';
});

authButton?.addEventListener('click', () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('mobileNumber');
    updateAuthUI();
    ordersPopup.style.display = 'none';
  } else {
    popup.style.display = 'flex';
  }
});

// Popup close handlers
closeBtn?.addEventListener('click', closeLoginPopup);
submitBtn?.addEventListener('click', handleLogin);
popup?.addEventListener('click', (e) => { if (e.target === popup) closeLoginPopup(); });

closeOrdersBtn?.addEventListener('click', () => { ordersPopup.style.display = 'none'; });
ordersPopup?.addEventListener('click', (e) => { if (e.target === ordersPopup) ordersPopup.style.display = 'none'; });

closeTrackBtn?.addEventListener('click', () => { trackPopup.style.display = 'none'; });
trackPopup?.addEventListener('click', (e) => { if (e.target === trackPopup) trackPopup.style.display = 'none'; });

// Status badge styling
const style = document.createElement('style');
style.textContent = `
  .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
  .status-badge.pending { background: #ffe082; color: #5d4037; }
  .status-badge.confirmed { background: #81d4fa; color: #01579b; }
  .status-badge['on the way'] { background: #a5d6a7; color: #1b5e20; }
  .status-badge.delivered { background: #c8e6c9; color: #2e7d32; }
  .status-badge.cancelled { background: #ffcdd2; color: #c62828; }
  .order-card { background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .order-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; }
  .order-meta { margin: 8px 0; font-size: 14px; }
  .order-items { margin: 8px 0; font-size: 14px; }
  .order-images { display: flex; gap: 4px; margin: 8px 0; flex-wrap: wrap; }
  .order-images img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
  .order-actions { margin-top: 12px; display: flex; gap: 8px; }
  .btn-print, .btn-whatsapp { padding: 6px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }
  .btn-print { background: #2196F3; color: white; }
  .btn-whatsapp { background: #25D366; color: white; }
`;
document.head.appendChild(style);

updateAuthUI();
