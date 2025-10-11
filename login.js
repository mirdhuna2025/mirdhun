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
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Elements
const loginBtn = document.getElementById("login-btn");
const popup = document.getElementById("login-popup");
const closeBtn = document.getElementById("close-popup");
const submitBtn = document.getElementById("submit-login");
const mobInput = document.getElementById("mob-number");

// Open/close popup
loginBtn.addEventListener("click", () => popup.style.display = "block");
closeBtn.addEventListener("click", () => popup.style.display = "none");

// Submit mobile number
submitBtn.addEventListener("click", () => {
  const number = mobInput.value.trim();
  if(!number){
    alert("Please enter your mobile number");
    return;
  }
  // Push to Firebase
  firebase.database().ref('logins').push({
    number: number,
    time: new Date().toISOString()
  });
  popup.style.display = "none";
  alert("Logged in successfully!");
  mobInput.value = "";
});
