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

const ordersList = document.getElementById('ordersList');
const phone = localStorage.getItem('userPhone');

if (!phone) {
  ordersList.innerHTML = '<p>Please login to view your orders.</p>';
} else {
  onValue(ref(db, 'orders'), snap => {
    const data = snap.val();
    ordersList.innerHTML = '';
    const allOrders = Object.values(data || {})
      .filter(o => o.phoneNumber === phone)
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allOrders.length === 0) {
      ordersList.innerHTML = '<p>No orders found.</p>';
      return;
    }

    allOrders.forEach(order => {
      const div = document.createElement('div');
      div.className = 'order';
      div.innerHTML = `
        <h4>Order — ₹${order.total || 0}</h4>
        <div class="meta">${new Date(order.timestamp).toLocaleString()}</div>
        <div class="items">${(order.items || order.cart || []).map(i => `${i.name} × ${i.qty}`).join(', ')}</div>
        <div>Address: ${order.address || 'N/A'}</div>
        <div>Payment: ${order.paymentMode || order.payment || 'N/A'}</div>
        <div class="status">Status: ${order.status || 'N/A'}</div>
        ${order.instructions ? `<div style="margin-top:6px;color:#555">Notes: ${order.instructions}</div>` : ''}
      `;
      ordersList.appendChild(div);
    });
  });
}

