// DOM Elements
const authButton = document.getElementById('authButton');
const authText = document.getElementById('authText');
const homeBtn = document.getElementById('homeBtn');
const ordersBtn = document.getElementById('ordersBtn');
const searchBtn = document.getElementById('searchBtn');

const homeView = document.getElementById('home-view');
const ordersView = document.getElementById('orders-view');
const ordersContainer = document.getElementById('ordersContainer');

const popup = document.getElementById('mirdhuna-login-popup');
const closeBtn = document.getElementById('mirdhuna-close-popup');
const submitBtn = document.getElementById('mirdhuna-submit-login');
const mobInput = document.getElementById('mirdhuna-mob-input');

const trackPopup = document.getElementById('track-popup');
const closeTrackBtn = document.getElementById('close-track');
const trackMap = document.getElementById('track-map');

let db = null;

// Initialize Firebase
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

// Update auth UI
function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  authText.textContent = isLoggedIn ? 'Logout' : 'Login';
}

// Show view
function showView(view) {
  homeView.style.display = view === 'home' ? 'block' : 'none';
  ordersView.style.display = view === 'orders' ? 'block' : 'none';
}

// Close login popup
function closeLoginPopup() {
  popup.style.display = 'none';
  mobInput.value = '';
}

// Handle login
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
    localStorage.setItem('mobileNumber', number); // ✅ store for order filtering
    updateAuthUI();
    alert('Login successful!');
    closeLoginPopup();
  } catch (error) {
    console.error('Firebase error:', error);
    alert('Login failed. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

// Load orders from Firebase
async function loadOrders() {
  const userPhone = localStorage.getItem('mobileNumber');
  if (!userPhone) {
    alert('Please login first to view orders.');
    showView('home');
    return;
  }

  ordersContainer.innerHTML = '<p id="loading">Loading your orders...</p>';
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
        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
          <p><strong>Placed:</strong> ${order.timestamp ? new Date(order.timestamp).toLocaleString() : '—'}</p>
          <p><strong>Phone:</strong> ${order.phoneNumber}</p>
          <p><strong>Address:</strong> ${order.address || '—'}</p>
          <p><strong>Payment:</strong> ${order.paymentMode || '—'}</p>
          <p><strong>Items:</strong> ${order.items?.map(i => \`\${i.name} ×\${i.qty}\`).join(', ') || 'None'}</p>
          <p><strong>Status:</strong> ${status}</p>
          ${
            status === 'on the way'
              ? `<button class="track-btn" data-lat="${order.lat || '28.6139'}" data-lng="${order.lng || '77.2090'}">Track Delivery</button>`
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

// Event Listeners
homeBtn.addEventListener('click', () => {
  showView('home');
  homeBtn.classList.add('active');
  ordersBtn.classList.remove('active');
});

ordersBtn.addEventListener('click', () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    alert('Please login first to view your orders.');
    return;
  }
  showView('orders');
  loadOrders();
  homeBtn.classList.remove('active');
  ordersBtn.classList.add('active');
});

searchBtn.addEventListener('click', () => {
  alert('Search feature coming soon!');
});

authButton.addEventListener('click', () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('mobileNumber');
    updateAuthUI();
    alert('Logged out successfully.');
    showView('home');
    homeBtn.classList.add('active');
    ordersBtn.classList.remove('active');
  } else {
    popup.style.display = 'flex';
  }
});

closeBtn.addEventListener('click', closeLoginPopup);
submitBtn.addEventListener('click', handleLogin);

// Close popups on outside click
popup.addEventListener('click', (e) => {
  if (e.target === popup) closeLoginPopup();
});

trackPopup.addEventListener('click', (e) => {
  if (e.target === trackPopup) trackPopup.style.display = 'none';
});

closeTrackBtn.addEventListener('click', () => {
  trackPopup.style.display = 'none';
});

// Track button delegation
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('track-btn')) {
    const lat = e.target.dataset.lat;
    const lng = e.target.dataset.lng;
    trackMap.src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    trackPopup.style.display = 'flex';
  }
});

// Init
updateAuthUI();
showView('home');
