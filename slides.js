import { initializeApp } from "https://www.gstatic.com/firebasejs/10.24.0/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.24.0/firebase-database.js";

// Firebase config (same as before)
const firebaseConfig = { /* same config */ };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const slider = document.getElementById("slider");
const nav = document.getElementById("sliderNav");
let slides = [];
let index = 0;

const sliderRef = ref(db, 'slides');

// Load slides dynamically
onValue(sliderRef, (snapshot)=>{
  const data = snapshot.val();
  slider.innerHTML = '';
  nav.innerHTML = '';
  slides = [];

  if(data){
    Object.values(data).forEach(item=>{
      const div = document.createElement('div');
      div.classList.add('slide');
      div.setAttribute('data-url', item.url || '');
      div.style.backgroundImage = `url('${item.image}')`;
      slider.appendChild(div);
      slides.push(div);
    });
    setupSlider();
  }
});

// Setup slider (dots, click, auto-slide)
function setupSlider(){
  const dots = [];
  slides.forEach((s,i)=>{
    const dot = document.createElement('div');
    dot.classList.add('slider-dot');
    if(i===0) dot.classList.add('active');
    dot.addEventListener('click', ()=>goToSlide(i));
    nav.appendChild(dot);
    dots.push(dot);

    // Click to open URL + log to Firebase
    const imgUrl = s.style.backgroundImage.slice(5,-2);
    const url = s.getAttribute('data-url');
    s.addEventListener('click', ()=>{
      push(ref(db,'slideClicks'), { image: imgUrl, url: url, clickedAt: new Date().toISOString() });
      if(url) window.open(url,'_blank');
    });

    // Preload
    const img = new Image(); img.src = imgUrl;
  });

  function goToSlide(i){
    index = i;
    slider.style.transform = `translateX(-${i*100}%)`;
    dots.forEach((d,j)=>d.classList.toggle('active', i===j));
  }

  document.querySelector(".next").addEventListener("click", ()=>goToSlide((index+1)%slides.length));
  document.querySelector(".prev").addEventListener("click", ()=>goToSlide((index-1+slides.length)%slides.length));
  setInterval(()=>goToSlide((index+1)%slides.length), 5000);
}
