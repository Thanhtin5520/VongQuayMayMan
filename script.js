const socket = io('https://vongquaymayman-production.up.railway.app/');
const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');
const numberGrid = document.getElementById('numberGrid');
const numberInput = document.getElementById('number');
const successEffect = document.getElementById('successEffect');
const overlay = document.getElementById('overlay');
const gshockTimeHeader = document.getElementById('gshockTimeHeader');
const gshockSeconds = document.getElementById('gshockSeconds');

// Lottie animation
const lottieContainer = document.getElementById('lottie-success');
const successText = document.getElementById('successText');
let lottieInstance = null;

let selectedNumber = null;
let takenNumbers = [];

// Cập nhật thời gian cho đồng hồ G-Shock
function updateGShockTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  gshockTimeHeader.textContent = `${hours}:${minutes}`;
}

// Cập nhật giây cho đồng hồ G-Shock
function updateGShockSeconds() {
  const now = new Date();
  const seconds = now.getSeconds().toString().padStart(2, '0');
  gshockSeconds.textContent = seconds;
}

// Cập nhật thời gian mỗi phút
setInterval(updateGShockTime, 60000);
updateGShockTime(); // Cập nhật ngay lần đầu

// Cập nhật giây mỗi giây
setInterval(updateGShockSeconds, 1000);
updateGShockSeconds(); // Cập nhật giây ngay lần đầu

// Hàm tạo hiệu ứng confetti
function triggerConfetti() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}
 
// Hàm hiển thị hiệu ứng thành công mới
function showSuccessMessage(message) {
  overlay.classList.add('active');
  successEffect.classList.add('active');
  successText.textContent = message || 'Đăng ký thành công!';

  // Xóa animation cũ nếu có
  if (lottieInstance) {
    lottieInstance.destroy();
    lottieInstance = null;
  }
  // Load animation Lottie
  lottieInstance = lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: false,
    autoplay: true,
    path: 'https://raw.githubusercontent.com/Thanhtin5520/VQMM_Client/refs/heads/main/success.json'
  });
  
  // Hiệu ứng confetti
  triggerConfetti();

  // Ẩn hiệu ứng sau 2.2s (hoặc đúng thời lượng animation)
  setTimeout(() => {
    overlay.classList.remove('active');
    successEffect.classList.remove('active');
    if (lottieInstance) {
      lottieInstance.destroy();
      lottieInstance = null;
    }
  }, 2200);
}

// Lấy danh sách người chơi để biết số đã chọn
async function fetchTakenNumbers() {
  try {
    const response = await fetch('https://vongquaymayman-production.up.railway.app/players');
    const players = await response.json();
    takenNumbers = players.map(p => parseInt(p.number));
    renderNumberGrid();
  } catch (error) {
    messageDiv.textContent = 'Không thể tải danh sách số đã chọn';
    messageDiv.classList.add('show');
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
  }
}

// Hiệu ứng cho số khi hover và chọn
function addNumberEffects() {
  const buttons = document.querySelectorAll('.number-btn:not(.taken)');
  
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (!btn.classList.contains('selected')) {
        btn.style.transform = 'translateY(-2px)';
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      if (!btn.classList.contains('selected')) {
        btn.style.transform = '';
      }
    });
  });
}

// Hiển thị lưới số
function renderNumberGrid() {
  numberGrid.innerHTML = '';
  const totalNumbers = 50; // Tổng số là 50
  
  for (let i = 1; i <= totalNumbers; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'number-btn';
    btn.dataset.number = i;
    
    // Tạo các thẻ span cho số để trông giống đồng hồ
    const numSpan = document.createElement('span');
    numSpan.textContent = i.toString().padStart(2, '0');
    btn.appendChild(numSpan);
    
    if (takenNumbers.includes(i)) {
      btn.classList.add('taken');
      btn.disabled = true;
    }
    
    if (selectedNumber === i) {
      btn.classList.add('selected');
    }
    
    btn.addEventListener('click', () => {
      if (btn.classList.contains('taken')) return;
      
      // Bỏ chọn số trước đó nếu có
      const prevSelected = document.querySelector('.number-btn.selected');
      if (prevSelected) {
        prevSelected.classList.remove('selected');
      }
      
      // Hiệu ứng chọn số
      selectedNumber = i;
      numberInput.value = i;
      btn.classList.add('selected');
      
      // Thêm hiệu ứng âm thanh khi chọn số
      playSelectSound();
    });
    
    numberGrid.appendChild(btn);
  }
  
  addNumberEffects();
}

// Hiệu ứng âm thanh khi chọn số
function playSelectSound() {
  const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAeHh4eHh4eHh4eHh4eHh4eHh4eHh4eHiNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2no6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6P///////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYsAAAAAAAAAbDsxA5TAAAAAAAAAAAAAAAAAAAAAP/jYMQAEvgiwl/DEAAAANB8KAiD5ZBAYhEIhEMfB8YDAQGP/AIDB8HwfB8H/lIPAgIBlYODgICAf5foMcBDgY43/ggIDgPg+D4Pg+H/+D4Pg+CAQGPggEBj+D4Pg+D4P//B8HwfB8HwQEBgICAwEP/Pnh8H3/ICA58EBnyT5P/wQ/B//+MYxB8RKbJgAZoQAP8EPwMf+YJfi///xU/+plQ/8TP/lavKn//6RU//0yrKipJyepdl/+gc/nK/nQh5fQoZ4MUHnWh5fX9KyxrEzrHQ6G5f/hgBgvAMQGzAXXT6bqLFCvIvZ3////srIiX970/////9RK6HsfDYbbUWNGabMrFvWoZkn4WAYZqykh6/x3CUHxEGWZFXrLav/oGQRm1XaderEThiNQG5QJxBlyVDPBiAMnTqg5K1S5TsvRK9UvRY14rUt6pWixutVTqhUlVsrrXolK5KrY5VgliJW05q1SRXRVRvW2t1dWKomrS2uuaoeNjpHMD49PT6/uhAngnJ6800000000000000DZ6ujYhhhhhupin42On4NDDDDFxTEFNRTMuOTkuNaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq/+MYxFYUWbXQAYYwAKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg==');
  audio.volume = 0.3;
  audio.play();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const number = parseInt(numberInput.value);
  
  if (!number) {
    messageDiv.textContent = 'Vui lòng chọn số!';
    messageDiv.classList.add('show');
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
    return;
  }
  
  try {
    const response = await fetch('https://vongquaymayman-production.up.railway.app/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, number }),
    });
    const data = await response.json();
    
    if (data.success) {
      showSuccessMessage('Đăng ký thành công!');
      form.reset();
      selectedNumber = null;
      fetchTakenNumbers();
    } else {
      messageDiv.textContent = data.error || 'Lỗi đăng ký';
      messageDiv.classList.add('show');
      setTimeout(() => messageDiv.classList.remove('show'), 3000);
      fetchTakenNumbers();
    }
  } catch (error) {
    messageDiv.textContent = 'Lỗi kết nối server';
    messageDiv.classList.add('show');
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
  }
});

// Lắng nghe khi có người mới đăng ký để cập nhật số đã chọn
socket.on('newPlayer', () => {
  fetchTakenNumbers();
});
socket.on('playerRemoved', () => {
  fetchTakenNumbers();
});

fetchTakenNumbers(); 