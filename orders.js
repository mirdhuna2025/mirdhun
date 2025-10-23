// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase config
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

// Normalize phone helper
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

// Close popup
closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
  // Optional: redirect or close tab
  // window.close();
});

// Get user phone
const userPhone = localStorage.getItem("userPhone");
const userPhoneNorm = normalizePhone(userPhone);

if (!userPhone) {
  ordersList.innerHTML = `<p style="color:red;text-align:center;">⚠️ Please log in first.</p>`;
} else {
  // Fetch & filter orders
  const ordersRef = ref(db, "orders");
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    const allOrders = data ? Object.values(data) : [];
    
    const myOrders = allOrders.filter(order =>
      normalizePhone(order.phoneNumber) === userPhoneNorm
    );

    if (myOrders.length === 0) {
      ordersList.innerHTML = '<p class="no-orders">No orders found for your number.</p>';
    } else {
      let html = '';
      myOrders.forEach(order => {
        const time = order.timestamp 
          ? new Date(order.timestamp).toLocaleString() 
          : 'Unknown time';
        const items = order.items?.map(i => `${i.name} × ${i.qty}`).join(', ') || '—';
        const total = order.total || '0';

        html += `
          <div class="order-card">
            <p><strong>Order Time:</strong> ${time}</p>
            <p><strong>Total:</strong> ₹${total}</p>
            <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
            <p><strong>Items:</strong> ${items}</p>
          </div>
        `;
      });
      ordersList.innerHTML = html;
    }
  }, (error) => {
    console.error("Firebase error:", error);
    ordersList.innerHTML = `<p style="color:red;">❌ Failed to load orders. Check console.</p>`;
  });
}
