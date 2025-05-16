const socket = io('https://vongquaymayman-production.up.railway.app/');
const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');
const numberGrid = document.getElementById('numberGrid');
const numberInput = document.getElementById('number');
const successEffect = document.getElementById('successEffect');
const bigCheck = document.getElementById('bigCheck');

let selectedNumber = null;
let takenNumbers = [];

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
  // Hiện hiệu ứng tích xanh lớn
  successEffect.classList.add('active');
  bigCheck.style.display = 'block';

  // Hiển thị thông báo
  messageDiv.textContent = message;
  messageDiv.classList.add('show');

  // Ẩn hiệu ứng sau 2 giây
  setTimeout(() => {
    successEffect.classList.remove('active');
    bigCheck.style.display = 'none';
    messageDiv.classList.remove('show');
  }, 2000);
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
  }
}

// Hiển thị lưới số
function renderNumberGrid() {
  numberGrid.innerHTML = '';
  for (let i = 1; i <= 16; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'number-btn';
    btn.textContent = i.toString().padStart(2, '0');
    if (takenNumbers.includes(i)) {
      btn.classList.add('taken');
      btn.disabled = true;
    }
    if (selectedNumber === i) {
      btn.classList.add('selected');
    }
    btn.addEventListener('click', () => {
      if (btn.classList.contains('taken')) return;
      selectedNumber = i;
      numberInput.value = i;
      renderNumberGrid();
    });
    numberGrid.appendChild(btn);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const number = parseInt(numberInput.value);
  if (!number) {
    messageDiv.textContent = 'Vui lòng chọn số!';
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
      fetchTakenNumbers();
    }
  } catch (error) {
    messageDiv.textContent = 'Lỗi kết nối server';
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