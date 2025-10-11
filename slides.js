import { initializeApp } from "https://www.gstatic.com/firebasejs/10.24.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.24.0/firebase-database.js";

const firebaseConfig = {
  apiKey:"AIzaSyCPbOZwAZEMiC1LSDSgnSEPmSxQ7-pR2oQ",
  authDomain:"mirdhuna-25542.firebaseapp.com",
  databaseURL:"https://mirdhuna-25542-default-rtdb.firebaseio.com",
  projectId:"mirdhuna-25542",
  storageBucket:"mirdhuna-25542.appspot.com",
  messagingSenderId:"575924409876",
  appId:"1:575924409876:web:6ba1ed88ce941d9c83b901"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const slider = document.getElementById("slider");
const slides = slider.children;
const nav = document.getElementById("sliderNav");
let index = 0;
const slideCount = slides.length;

// Create dots
for(let i=0;i<slideCount;i++){
  const dot = document.createElement("div");
  dot.classList.add("slider-dot");
  if(i===0) dot.classList.add("active");
  dot.addEventListener("click",()=>goToSlide(i));
  nav.appendChild(dot);
}
const dots = nav.children;

function goToSlide(i){index=i; slider.style.transform=`translateX(-${i*100}%)`; updateDots();}
function updateDots(){for(let i=0;i<dots.length;i++){dots[i].classList.toggle("active", i===index);}}

document.querySelector(".next").addEventListener("click",()=>{index=(index+1)%slideCount; goToSlide(index);});
document.querySelector(".prev").addEventListener("click",()=>{index=(index-1+slideCount)%slideCount; goToSlide(index);});

// Click logging & preload
Array.from(slides).forEach(slide=>{
  const imgUrl = slide.style.backgroundImage.slice(5,-2);
  const img = new Image(); img.src = imgUrl; // preload
  slide.addEventListener("click", ()=>{
    const url = slide.getAttribute("data-url");
    push(ref(db,'slideClicks'), {image:imgUrl,url:url,clickedAt:new Date().toISOString()});
    if(url) window.open(url,"_blank");
  });
});

// Auto-slide every 5s
setInterval(()=>{index=(index+1)%slideCount; goToSlide(index);},5000);
