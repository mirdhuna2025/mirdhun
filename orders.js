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

const ordersContainer = document.getElementById('ordersContainer');
const trackPopup = document.getElementById('track-popup');
const trackMap = document.getElementById('track-map');
const closeTrack = document.getElementById('close-track');

// Load orders only if logged in
const userPhone = localStorage.getItem("userPhone");

if (!userPhone) {
  ordersContainer.innerHTML = "<p>Please login to view your orders.</p>";
} else {
  ordersContainer.innerHTML = "<p>Loading your orders...</p>";

  onValue(ref(db, 'orders'), snapshot => {
    const data = snapshot.val();
    const orders = data ? Object.values(data) : [];
    const userOrders = orders.filter(o => o.phoneNumber === userPhone);
    renderOrders(userOrders);
  });
}

function renderOrders(orders) {
  ordersContainer.innerHTML = '';
  if (orders.length === 0) {
    ordersContainer.innerHTML = "<p>No orders found.</p>";
    return;
  }

  orders.forEach(order => {
    const div = document.createElement('div');
    div.className = 'order-card';
    div.innerHTML = `
      <p><strong>Order Time:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
      <p><strong>Total:</strong> ₹${order.total}</p>
      <p class="status"><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong> ${order.items.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
      ${order.status === 'on the way'
        ? `<button class="track-btn" data-lat="${order.lat || '28.6139'}" data-lng="${order.lng || '77.2090'}">Track Delivery</button>`
        : ''
      }
    `;
    ordersContainer.appendChild(div);
  });
}

// Track Delivery Popup
document.addEventListener('click', e => {
  if (e.target.classList.contains('track-btn')) {
    const lat = e.target.dataset.lat;
    const lng = e.target.dataset.lng;
    trackMap.src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    trackPopup.style.display = 'flex';
  }
});

closeTrack.onclick = () => {
  trackPopup.style.display = 'none';
};


