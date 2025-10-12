import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain: "mirdhuna-25542.firebaseapp.com",
  databaseURL: "https://mirdhuna-25542-default-rtdb.firebaseio.com", // ✅ Fixed: removed trailing spaces
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

function updateLoginState() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  loginBtn.textContent = isLoggedIn ? "Logout" : "Login";
  loginBtn.style.background = isLoggedIn ? "#4CAF50" : "#d40000";
}

loginBtn.addEventListener("click", () => {
  if (localStorage.getItem("isLoggedIn") === "true") {
    localStorage.removeItem("isLoggedIn");
    updateLoginState();
    alert("Logged out successfully.");
  } else {
    popup.style.display = "flex";
  }
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

  let location = { lat: null, lng: null };
  let hasLocation = false;

  if ("geolocation" in navigator) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      hasLocation = true;
    } catch (err) {
      console.warn("Geolocation not available:", err);
    }
  }

  try {
    await push(ref(db, 'loginHistory'), {
      mobileNumber: number,
      timestamp: new Date().toISOString(),
      location: hasLocation ? location : { error: "Geolocation denied or unavailable" }
    });

    localStorage.setItem("isLoggedIn", "true");
    alert("Login successful!");
    popup.style.display = "none";
    mobInput.value = "";
    updateLoginState();
  } catch (error) {
    console.error("Firebase error:", error);
    alert("Login failed. Check console.");
  }
});

updateLoginState();
