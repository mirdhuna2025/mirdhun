import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

const loginBtn = document.getElementById("login-btn");
const popup = document.getElementById("login-popup");
const closeBtn = document.getElementById("close-popup");
const submitBtn = document.getElementById("submit-login");
const mobInput = document.getElementById("mob-number");

function updateLoginState() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const mobileNumber = localStorage.getItem("mobileNumber") || "";
  loginBtn.textContent = isLoggedIn ? `Logout (${mobileNumber})` : "Login";
  loginBtn.style.background = isLoggedIn
    ? "linear-gradient(135deg, #4CAF50, #66bb6a)"
    : "linear-gradient(135deg, #d40000, #ff4c4c)";
}

loginBtn.addEventListener("click", () => {
  if (localStorage.getItem("isLoggedIn") === "true") {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("mobileNumber");
    updateLoginState();
    alert("Logged out successfully.");
  } else {
    popup.style.display = "flex";
  }
});

closeBtn.addEventListener("click", () => {
  popup.style.display = "none";
});

popup.addEventListener("click", (e) => {
  if (e.target === popup) popup.style.display = "none";
});

submitBtn.addEventListener("click", async () => {
  const number = mobInput.value.trim();
  if (!number || !/^[6-9]\d{9}$/.test(number)) {
    alert("Please enter a valid 10-digit Indian mobile number (starting with 6–9).");
    return;
  }

  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Logging in...";

  let location = null;
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
    } catch (err) {
      console.warn("Geolocation not available:", err);
    }
  }

  try {
    await push(ref(db, 'loginHistory'), {
      mobileNumber: number,
      timestamp: new Date().toISOString(),
      location: location || { error: "Geolocation denied or unavailable" }
    });

    // 🔥 First clear localStorage, then set new login data
    localStorage.clear(); // Ensures no leftover login state
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("mobileNumber", number);

    alert("Login successful!");
    popup.style.display = "none";
    mobInput.value = "";
    updateLoginState();
  } catch (error) {
    console.error("Firebase error:", error);
    alert("Login failed. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Initialize UI on load
updateLoginState();
