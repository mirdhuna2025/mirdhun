// DOM elements
const authButton = document.getElementById('authButton');
const authText = document.getElementById('authText');
const homeBtn = document.getElementById('homeBtn');
const ordersBtn = document.getElementById('ordersBtn');
const searchBtn = document.getElementById('searchBtn');

const popup = document.getElementById('mirdhuna-login-popup');
const closeBtn = document.getElementById('mirdhuna-close-popup');
const submitBtn = document.getElementById('mirdhuna-submit-login');
const mobInput = document.getElementById('mirdhuna-mob-input');

// Firebase modules (loaded via CDN in JS)
let db = null;

// Initialize Firebase once
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

// Update auth button text
function updateAuthUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  authText.textContent = isLoggedIn ? 'Logout' : 'Login';
}

// Close popup
function closePopup() {
  popup.style.display = 'none';
  mobInput.value = '';
}

// Handle auth click
async function toggleAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    // Logout
    localStorage.removeItem('isLoggedIn');
    updateAuthUI();
    alert('Logged out successfully.');
  } else {
    // Login: show popup
    popup.style.display = 'flex';
  }
}

// Submit login
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
    // Initialize Firebase
    const database = await initFirebase();
    const { ref, push } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

    // Save to Firebase
    await push(ref(database, 'loginHistory'), {
      mobileNumber: number,
      timestamp: new Date().toISOString(),
      location: location || { error: 'Geolocation denied or unavailable' }
    });

    // Set login state
    localStorage.setItem('isLoggedIn', 'true');
    updateAuthUI();
    alert('Login successful!');
    closePopup();
  } catch (error) {
    console.error('Firebase error:', error);
    alert('Login failed. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

// Event Listeners
homeBtn.addEventListener('click', () => window.location.href = 'index.html');
ordersBtn.addEventListener('click', () => window.location.href = 'myorder.html');
searchBtn.addEventListener('click', () => window.location.href = 'search.html');
authButton.addEventListener('click', toggleAuth);
closeBtn.addEventListener('click', closePopup);
submitBtn.addEventListener('click', handleLogin);

// Close popup on outside click
popup.addEventListener('click', (e) => {
  if (e.target === popup) closePopup();
});

// Initialize
updateAuthUI();
