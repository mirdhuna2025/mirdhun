// DOM elements
const authButton = document.getElementById('authButton');
const authText = document.getElementById('authText');
const homeBtn = document.getElementById('homeBtn');
const ordersBtn = document.getElementById('ordersBtn');
const searchBtn = document.getElementById('searchBtn');

// Check login status
function checkAuthStatus() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  authText.textContent = isLoggedIn ? 'Logout' : 'Login';
}

// Handle auth click
function toggleAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    localStorage.setItem('isLoggedIn', 'false');
  }
  window.location.href = 'login.html';
}

// Set up event listeners
homeBtn.addEventListener('click', () => window.location.href = 'index.html');
ordersBtn.addEventListener('click', () => window.location.href = 'myorder.html');
searchBtn.addEventListener('click', () => window.location.href = 'search.html');
authButton.addEventListener('click', toggleAuth);

// Initialize on load
checkAuthStatus();
