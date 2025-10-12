import { initializeApp } from "https://www.gstatic.com/firebasejs/10.24.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.24.0/firebase-database.js";

// 🔥 Critical: No extra spaces in URLs!
const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com", // ✅ Clean URL
  projectId: "mirdhuna-25542",
  storageBucket: "mirdhuna-25542.appspot.com",
  messagingSenderId: "575924409876",
  appId: "1:575924409876:web:6ba1ed88ce941d9c83b901"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const loginBtn = document.getElementById("login-btn");
const popup = document.getElementById("login-popup");
const closeBtn = document.getElementById("close-popup");
const submitBtn = document.getElementById("submit-login");
const mobInput = document.getElementById("mob-number");

loginBtn.addEventListener("click", () => {
  popup.style.display = "block";
});

closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

submitBtn.addEventListener("click", async () => {
  const number = mobInput.value.trim();

  if (!number || !/^\d{10}$/.test(number)) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }

  try {
    await push(ref(db, 'logins'), {
      number: number,
      time: new Date().toISOString()
    });
    alert("Login request recorded!");
    popup.style.display = "none";
    mobInput.value = "";
  } catch (error) {
    console.error("Firebase error:", error);
    alert("Failed to save. Check console.");
  }
});
