<script type="module">
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
 * Normalize phone number: remove all non-digit characters
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Function called when the “My Orders” button is clicked
 */
window.showUserOrders = function() {
  const userPhone = localStorage.getItem("userPhone");

  if (!userPhone) {
    alert("Please login to view your orders.");
    ordersContainer.style.display = "none";
    return;
  }

  ordersContainer.style.display = "block";
  ordersContainer.innerHTML = "<p>Loading your orders...</p>";

  const userPhoneNormalized = normalizePhone(userPhone);

  const ordersRef = ref(db, "orders");
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    const allOrders = data ? Object.values(data) : [];
    
    // Filter orders by normalized phone number
    const userOrders = allOrders.filter(order => 
      normalizePhone(order.phoneNumber) === userPhoneNormalized
    );

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
      <p><strong>Order Time:</strong> ${order.timestamp ? new Date(order.timestamp).toLocaleString() : 'Unknown'}</p>
      <p><strong>Total:</strong> ₹${order.total || '0'}</p>
      <p class="status"><strong>Status:</strong> ${order.status || 'Pending'}</p>
      <p><strong>Items:</strong> ${order.items?.map(i => `${i.name} x${i.qty}`).join(', ') || 'None'}</p>
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
</script>
