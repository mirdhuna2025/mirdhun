// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

const loginForm = document.getElementById('login-form');
const logoutView = document.getElementById('logout-view');
const mobInput = document.getElementById('mob-number');
const userNumberEl = document.getElementById('user-number');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// Check auth state on load
function updateUI() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const number = localStorage.getItem('mobileNumber');

  if (isLoggedIn && number) {
    userNumberEl.textContent = `+91 ${number}`;
    loginForm.classList.remove('active');
    logoutView.classList.add('active');
  } else {
    loginForm.classList.add('active');
    logoutView.classList.remove('active');
  }
}

// Login
loginBtn.addEventListener('click', async () => {
  const num = mobInput.value.trim();
  if (!num || !/^[6-9]\d{9}$/.test(num)) {
    alert('Please enter a valid 10-digit Indian mobile number.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  let location = null;
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (err) {
      console.warn('Geolocation unavailable');
    }
  }

  try {
    await push(ref(db, 'loginHistory'), {
      mobileNumber: num,
      timestamp: new Date().toISOString(),
      location: location || 'unavailable'
    });

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('mobileNumber', num);
    updateUI();
  } catch (e) {
    alert('Login failed. Please try again.');
    console.error(e);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('mobileNumber');
  updateUI();
});

// Initialize
updateUI();
