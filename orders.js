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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ordersContainer = document.getElementById("ordersContainer");
const trackPopup = document.getElementById("track-popup");
const trackMap = document.getElementById("track-map");
const closeTrack = document.getElementById("close-track");

/**
 * Function called when the “My Orders” button is clicked
 * (this function must be called from your main site)
 */
window.showUserOrders = function() {
  const userPhone = localStorage.getItem("userPhone");

  // If not logged in, show nothing
  if (!userPhone) {
    alert("Please login to view your orders.");
    ordersContainer.style.display = "none";
    return;
  }

  ordersContainer.style.display = "block";
  ordersContainer.innerHTML = "<p>Loading your orders...</p>";

  // Fetch from Firebase
  const ordersRef = ref(db, "orders");
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    const allOrders = data ? Object.values(data) : [];
    const userOrders = allOrders.filter(o => o.phoneNumber === userPhone);
    renderOrders(userOrders);
  });
};

// Render orders filtered by phone number
function renderOrders(orders) {
  ordersContainer.innerHTML = "";

  if (!orders.length) {
    ordersContainer.innerHTML = "<p>No orders found for your login.</p>";
    return;
  }

  orders.forEach(order => {
    const div = document.createElement("div");
    div.className = "order-card";
    div.innerHTML = `
      <p><strong>Order Time:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
      <p><strong>Total:</strong> ₹${order.total}</p>
      <p class="status"><strong>Status:</strong> ${order.status}</p>
      <p><strong>Items:</strong> ${order.items.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
      ${order.status === "on the way" 
        ? `<button class="track-btn" data-lat="${order.lat || '28.6139'}" data-lng="${order.lng || '77.2090'}">Track Delivery</button>`
        : ""
      }
    `;
    ordersContainer.appendChild(div);
  });
}

// Delivery Map Popup
document.addEventListener("click", e => {
  if (e.target.classList.contains("track-btn")) {
    const lat = e.target.dataset.lat;
    const lng = e.target.dataset.lng;
    trackMap.src = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    trackPopup.style.display = "flex";
  }
});

closeTrack.onclick = () => {
  trackPopup.style.display = "none";
};
