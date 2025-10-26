// order.js
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

// DOM elements
const popup = document.getElementById("order-popup");
const ordersList = document.getElementById("orders-list");
const closeBtn = document.getElementById("close-popup");

// Helper: normalize phone to digits only
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

// Close popup
closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
  // Optional: window.close(); if opened in new tab
});

// Get the last phone number (assuming it's stored as a single value in localStorage)
const userPhone = localStorage.getItem("userPhone");
const userPhoneNorm = normalizePhone(userPhone);

if (!userPhone) {
  ordersList.innerHTML = `<p class="error">⚠️ Please log in first.</p>`;
} else {
  const ordersRef = ref(db, "orders");
  onValue(
    ordersRef,
    (snapshot) => {
      const data = snapshot.val();
      const allOrders = data ? Object.values(data) : [];

      // Filter ONLY by `phoneNumber` field (your newer orders use this)
      const myOrders = allOrders.filter(order =>
        normalizePhone(order.phoneNumber) === userPhoneNorm
      );

      if (myOrders.length === 0) {
        ordersList.innerHTML = `<p class="no-orders">No orders found for your number.</p>`;
      } else {
        let html = '';
        myOrders.forEach(order => {
          // Timestamp
          let timeStr = 'Unknown';
          if (order.timestamp) {
            try {
              timeStr = new Date(order.timestamp).toLocaleString();
            } catch (e) {
              timeStr = String(order.timestamp);
            }
          }

          // Items
          const itemsList = (order.items || []).map(item =>
            `${item.name || 'Unnamed Item'} × ${item.qty || item.quantity || 1}`
          ).join(', ') || '—';

          // Total
          const total = order.total !== undefined ? order.total : 0;

          // Status & Payment
          const status = order.status || 'Pending';
          const payment = order.paymentMode || '—';

          html += `
            <div class="order-card">
              <p><strong>Order Time:</strong> ${timeStr}</p>
              <p><strong>Total:</strong> ₹${total}</p>
              <p><strong>Status:</strong> ${status}</p>
              <p><strong>Payment:</strong> ${payment}</p>
              <p><strong>Items:</strong> ${itemsList}</p>
            </div>
          `;
        });
        ordersList.innerHTML = html;
      }
    },
    (error) => {
      console.error("Firebase error:", error);
      ordersList.innerHTML = `<p class="error">❌ Failed to load orders.<br>Check database rules or network.</p>`;
    }
  );
}
