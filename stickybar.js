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
          ? order.items.map(i => i.name + ' ×' + i.qty).join(', ')
          : 'None';

        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
          <p><strong>Placed:</strong> ${order.timestamp ? new Date(order.timestamp).toLocaleString() : '—'}</p>
          <p><strong>Phone:</strong> ${order.phoneNumber}</p>
          <p><strong>Address:</strong> ${order.address || '—'}</p>
          <p><strong>Payment:</strong> ${order.paymentMode || '—'}</p>
          <p><strong>Items:</strong> ${itemsList}</p>
          <p><strong>Status:</strong> <span class="status-badge ${status}">${status}</span></p>
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

// ===== REAL-TIME TRACKING HANDLER =====
document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('track-btn')) return;

  const orderId = e.target.dataset.orderId;
  const initialLat = parseFloat(e.target.dataset.lat) || 28.6139;
  const initialLng = parseFloat(e.target.dataset.lng) || 77.2090;

  const trackMapEl = document.getElementById('track-map');
  const trackStatusEl = document.getElementById('track-status');
  const trackNoteEl = document.getElementById('track-note');
  const trackRefreshEl = document.getElementById('track-refresh');

  if (!trackMapEl || !trackStatusEl || !trackNoteEl) {
    console.error('Missing track-popup elements!');
    return;
  }

  // Initial view
  renderMapEmbed(initialLat, initialLng, 15);
  trackStatusEl.textContent = '🚚 On the way';
  trackNoteEl.textContent = 'Loading live location...';
  trackPopup.style.display = 'flex';

  // Setup Firebase realtime listener
  let unsubscribe = null;
  try {
    const { getDatabase, ref, onValue } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const database = getDatabase();
    const trackingRef = ref(database, `tracking/${orderId}`);

    unsubscribe = onValue(trackingRef, (snapshot) => {
      const updates = snapshot.val();
      if (!updates) {
        trackNoteEl.textContent = '📍 Awaiting driver update...';
        return;
      }

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
        renderMapEmbed(latest.lat, latest.lng, 16);
        const note = latest.note || 'Driver is en route';
        trackNoteEl.textContent = note;
        trackStatusEl.innerHTML = `🕒 ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${note}`;
      }
    }, (error) => {
      console.warn('Tracking error:', error);
      trackNoteEl.textContent = '📡 Connection issue';
    });

  } catch (err) {
    console.error('Firebase tracking import failed:', err);
    trackNoteEl.textContent = '⚠️ Tracking unavailable';
  }

  // Cleanup on close
  const closeTracking = () => {
    if (unsubscribe) unsubscribe();
    trackPopup.style.display = 'none';
  };

  closeTrackBtn.onclick = closeTracking;
  trackPopup.onclick = (ev) => { if (ev.target === trackPopup) closeTracking(); };

  // Manual refresh
  if (trackRefreshEl) {
    trackRefreshEl.onclick = () => {
      trackNoteEl.textContent = '↻ Refreshing...';
    };
  }
});

// Helper: Render Google Map embed
function renderMapEmbed(lat, lng, zoom = 15) {
  const mapEl = document.getElementById('track-map');
  if (!mapEl) return;
  const apiKey = "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ";
  mapEl.src = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${lat},${lng}&zoom=${zoom}&maptype=roadmap`;
}

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

// Optional: Add status badge styling
const style = document.createElement('style');
style.textContent = `
  .status-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }
  .status-badge.pending { background: #ffe082; color: #5d4037; }
  .status-badge.confirmed { background: #81d4fa; color: #01579b; }
  .status-badge['on the way'] { background: #a5d6a7; color: #1b5e20; }
  .status-badge.delivered { background: #c8e6c9; color: #2e7d32; }
  .status-badge.cancelled { background: #ffcdd2; color: #c62828; }
`;
document.head.appendChild(style);

updateAuthUI();
