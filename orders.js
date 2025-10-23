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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const popup = document.getElementById("order-popup");
const ordersList = document.getElementById("orders-list");
const closeBtn = document.getElementById("close-popup");

// Normalize phone: keep only digits
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

const userPhone = localStorage.getItem("userPhone");
const userPhoneNorm = normalizePhone(userPhone);

if (!userPhone) {
  ordersList.innerHTML = `<p style="color:red;text-align:center;">⚠️ Please log in first.</p>`;
} else {
  const ordersRef = ref(db, "orders");
  onValue(ordersRef, (snapshot) => {
    const data = snapshot.val();
    const allOrders = data ? Object.values(data) : [];

    const myOrders = allOrders.filter(order => {
      const phone1 = normalizePhone(order.phoneNumber);
      const phone2 = normalizePhone(order.userMobile); // for older orders
      return (phone1 === userPhoneNorm) || (phone2 === userPhoneNorm);
    });

    if (myOrders.length === 0) {
      ordersList.innerHTML = '<p class="no-orders">No orders found for your number.</p>';
    } else {
      let html = '';
      myOrders.forEach(order => {
        // Timestamp handling
        let timeStr = 'Unknown';
        if (order.timestamp) {
          if (typeof order.timestamp === 'number') {
            timeStr = new Date(order.timestamp).toLocaleString();
          } else if (typeof order.timestamp === 'string') {
            timeStr = new Date(order.timestamp).toLocaleString();
          }
        }

        // Items
        const items = (order.items || []).map(i => 
          `${i.name || 'Unnamed'} × ${i.qty || i.quantity || 1}`
        ).join(', ') || '—';

        // Total
        const total = order.total !== undefined ? order.total : order.totalValue || 0;

        // Status
        const status = order.status || order.orderStatus || 'Pending';

        html += `
          <div class="order-card">
            <p><strong>Order Time:</strong> ${timeStr}</p>
            <p><strong>Total:</strong> ₹${total}</p>
            <p><strong>Status:</strong> ${status}</p>
            <p><strong>Items:</strong> ${items}</p>
          </div>
        `;
      });
      ordersList.innerHTML = html;
    }
  }, (error) => {
    console.error("Firebase error:", error);
    ordersList.innerHTML = `<p style="color:red;">❌ Failed to load orders.</p>`;
  });
}
