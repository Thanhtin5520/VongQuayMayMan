const socket = io('https://vongquaymayman-production.up.railway.app/');
const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');
const numberGrid = document.getElementById('numberGrid');
const numberInput = document.getElementById('number');
const successEffect = document.getElementById('successEffect');
const overlay = document.getElementById('overlay');
const gshockTimeHeader = document.getElementById('gshockTimeHeader');
const gshockSeconds = document.getElementById('gshockSeconds');
const dealerSelect = document.getElementById('dealerSelect');

// Lottie animation
const lottieContainer = document.getElementById('lottie-success');
const successText = document.getElementById('successText');
let lottieInstance = null;

let selectedNumber = null;
let takenNumbers = [];
let isLocked = false;
let dealers = [];
let players = [];

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

  // Thêm nền trắng bo góc cho popup
  successEffect.style.background = '#fff';
  successEffect.style.borderRadius = '18px';
  successEffect.style.padding = '18px 28px';
  successEffect.style.boxShadow = '0 4px 32px rgba(0,0,0,0.18)';
  successEffect.style.display = 'flex';
  successEffect.style.flexDirection = 'column';
  successEffect.style.alignItems = 'center';

  // SVG tick: vòng tròn to, tích nhỏ, nằm giữa tâm
  lottieContainer.innerHTML = `
    <svg id="tickSVG" width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="54" stroke="#00c853" stroke-width="7" fill="none" opacity="0.18"/>
      <polyline points="50,65 60,80 80,50" stroke="#00c853" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  // Hiệu ứng vẽ tick
  const style = document.createElement('style');
  style.innerHTML = `
    #tickSVG polyline {
      stroke-dasharray: 60;
      stroke-dashoffset: 60;
      animation: drawTick 1s ease forwards;
    }
    @keyframes drawTick {
      to { stroke-dashoffset: 0; }
    }
    .success-text {
      color: #ff0000 !important;
      font-size: 2em;
      font-family: 'Roboto', Arial, sans-serif;
      font-weight: bold;
      margin-top: 10px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.08);
      background: none;
      text-align: center;
    }
  `;
  document.head.appendChild(style);

  // Hiệu ứng confetti
  triggerConfetti();

  // Ẩn hiệu ứng sau 3.5s
  setTimeout(() => {
    overlay.classList.remove('active');
    successEffect.classList.remove('active');
    lottieContainer.innerHTML = '';
    style.remove();
    // Reset style popup
    successEffect.style.background = '';
    successEffect.style.borderRadius = '';
    successEffect.style.padding = '';
    successEffect.style.boxShadow = '';
    successText.textContent = '';
  }, 3500);
}

// Lấy danh sách đại lý realtime (tạm thời fetch từ setting nếu chưa có API/socket)
async function fetchDealers() {
  try {
    const res = await fetch('https://vongquaymayman-production.up.railway.app/dealers');
    dealers = await res.json();
    renderDealerSelect();
  } catch (e) {
    dealers = [];
    renderDealerSelect();
  }
}

function renderDealerSelect() {
  dealerSelect.innerHTML = '<option value="">Chọn đại lý tham gia...</option>';
  dealers.forEach(dl => {
    dealerSelect.innerHTML += `<option value="${dl.code}">${dl.code} - ${dl.name}</option>`;
  });
}

// Lấy danh sách người chơi để biết đại lý nào đã chọn số
async function fetchPlayersFull() {
  try {
    const response = await fetch('https://vongquaymayman-production.up.railway.app/players');
    players = await response.json();
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
    
    if (isLocked) {
      btn.classList.add('locked');
      btn.disabled = true;
      btn.addEventListener('click', showLockedPopup);
    } else {
    if (takenNumbers.includes(i)) {
      btn.classList.add('taken');
      btn.disabled = true;
      }
    }
    
    if (selectedNumber === i) {
      btn.classList.add('selected');
    }
    
    btn.addEventListener('click', () => {
      if (btn.classList.contains('taken')) return;
      if (isLocked) return;
      
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
  const audio = new Audio('sound/tic.mp3');
  audio.volume = 0.5;
  audio.play();
}

// Gọi khi load trang
fetchDealers();
fetchPlayersFull();

// Popup báo lỗi đại lý đã chọn số
function showDealerTakenPopup(dealerName, number) {
  let modal = document.getElementById('dealerTakenModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dealerTakenModal';
    modal.innerHTML = `
      <div class="dealer-modal-content">
        <div class="dealer-modal-title">Đã đăng ký!</div>
        <div class="dealer-modal-msg">Quý ĐL <span style='color:#00eaff'>"${dealerName}"</span> đã chọn con số may mắn <span style='color:#ffe259;font-size:1.3em'>"${number}"</span> nhé.</div>
        <button class="dealer-modal-close">Đóng</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.dealer-modal-close').onclick = () => {
      modal.style.display = 'none';
      dealerSelect.focus();
    };
  } else {
    modal.querySelector('.dealer-modal-msg').innerHTML = `Quý ĐL <span style='color:#00eaff'>"${dealerName}"</span> đã chọn con số may mắn <span style='color:#ffe259;font-size:1.3em'>"${number}"</span> nhé.`;
  }
  modal.style.display = 'flex';
  setTimeout(() => { modal.style.display = 'none'; }, 3500);
}

// Thêm CSS cho popup đại lý đã chọn số
if (!document.getElementById('dealerTakenModalStyle')) {
  const style = document.createElement('style');
  style.id = 'dealerTakenModalStyle';
  style.innerHTML = `
    #dealerTakenModal {
      position: fixed; z-index: 9999; left: 0; top: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.18); display: none; align-items: center; justify-content: center;
    }
    .dealer-modal-content {
      background: #181828; border-radius: 18px; box-shadow: 0 0 32px #00eaffcc, 0 0 0 4px #00eaff55;
      padding: 32px 36px; min-width: 320px; text-align: center; position: relative;
      border: 2.5px solid #00eaff; animation: lockedPopIn 0.25s cubic-bezier(.4,2,.6,1);
    }
    .dealer-modal-title {
      color: #00eaff; font-size: 2em; font-family: 'Orbitron', Arial, sans-serif;
      margin-bottom: 12px; text-shadow: 0 0 18px #00eaff, 0 0 2px #fff;
    }
    .dealer-modal-msg {
      color: #fff; font-size: 1.2em; margin-bottom: 18px;
    }
    .dealer-modal-close {
      background: linear-gradient(90deg,#00eaff 60%,#ffe259 100%); color: #181828;
      border: none; border-radius: 8px; font-family: 'Orbitron'; font-weight: bold;
      font-size: 1em; padding: 10px 32px; cursor: pointer; box-shadow: 0 0 8px #00eaff99;
      transition: background 0.2s;
    }
    .dealer-modal-close:hover { background: #00eaff; color: #000; }
    @keyframes lockedPopIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dealerCode = dealerSelect.value;
  const dealerObj = dealers.find(dl => dl.code === dealerCode);
  const number = parseInt(numberInput.value);
  if (!dealerCode) {
    messageDiv.textContent = 'Vui lòng chọn đại lý!';
    messageDiv.classList.add('show');
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
    dealerSelect.focus();
    return;
  }
  if (!number) {
    messageDiv.textContent = 'Vui lòng chọn số!';
    messageDiv.classList.add('show');
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
    // Focus vào số đầu tiên chưa bị chọn
    const firstBtn = document.querySelector('.number-btn:not(.taken)');
    if (firstBtn) firstBtn.focus();
    return;
  }
  // Kiểm tra đại lý đã chọn số chưa
  const existed = players.find(p => p.name === dealerObj.name || p.name === dealerObj.code || p.name === (dealerObj.code + ' - ' + dealerObj.name));
  if (existed) {
    showDealerTakenPopup(dealerObj.name, existed.number);
    return;
  }
  try {
    const response = await fetch('https://vongquaymayman-production.up.railway.app/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dealerObj.name, code: dealerObj.code, number })
    });
    const data = await response.json();
    if (data.success) {
      showSuccessMessage('Đăng ký thành công!');
      form.reset();
      selectedNumber = null;
      fetchPlayersFull();
      // Ẩn form, hiện luckyNumberBox
      form.style.display = 'none';
      document.getElementById('luckyNumberBox').style.display = 'block';
      document.getElementById('luckyNumberDisplay').textContent = number.toString().padStart(2, '0');
      dealerSelect.disabled = true;
    } else {
      messageDiv.textContent = data.error || 'Lỗi đăng ký';
      messageDiv.classList.add('show');
      setTimeout(() => messageDiv.classList.remove('show'), 3000);
      fetchPlayersFull();
    }
  } catch (error) {
    messageDiv.textContent = 'Lỗi kết nối server';
    messageDiv.classList.add('show');
    setTimeout(() => messageDiv.classList.remove('show'), 3000);
  }
});

// Khi load lại trang hoặc đăng ký lại, ẩn luckyNumberBox, hiện lại form
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('luckyNumberBox').style.display = 'none';
  form.style.display = 'flex';
});

// Lắng nghe khi có người mới đăng ký để cập nhật số đã chọn
socket.on('newPlayer', () => {
  fetchPlayersFull();
});
socket.on('playerRemoved', () => {
  fetchPlayersFull();
});

// Popup decor đẹp khi đã chốt danh sách
function showLockedPopup() {
  let modal = document.getElementById('lockedModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lockedModal';
    modal.innerHTML = `
      <div class="locked-modal-content">
        <div class="locked-modal-title">Đã chốt danh sách</div>
        <div class="locked-modal-msg">Không thể đăng ký thêm!</div>
        <button class="locked-modal-close">Đóng</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.locked-modal-close').onclick = () => {
      modal.style.display = 'none';
    };
  }
  modal.style.display = 'flex';
  setTimeout(() => { modal.style.display = 'none'; }, 2500);
}

// Thêm CSS cho popup decor
if (!document.getElementById('lockedModalStyle')) {
  const style = document.createElement('style');
  style.id = 'lockedModalStyle';
  style.innerHTML = `
    #lockedModal {
      position: fixed; z-index: 9999; left: 0; top: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.18); display: none; align-items: center; justify-content: center;
    }
    .locked-modal-content {
      background: #181828; border-radius: 18px; box-shadow: 0 0 32px #ffe259cc, 0 0 0 4px #ffe25955;
      padding: 32px 36px; min-width: 320px; text-align: center; position: relative;
      border: 2.5px solid #ffe259; animation: lockedPopIn 0.25s cubic-bezier(.4,2,.6,1);
    }
    .locked-modal-title {
      color: #ffe259; font-size: 2em; font-family: 'Orbitron', Arial, sans-serif;
      margin-bottom: 12px; text-shadow: 0 0 18px #ffe259, 0 0 2px #fff;
    }
    .locked-modal-msg {
      color: #fff; font-size: 1.2em; margin-bottom: 18px;
    }
    .locked-modal-close {
      background: linear-gradient(90deg,#ffe259 60%,#ffed85 100%); color: #181828;
      border: none; border-radius: 8px; font-family: 'Orbitron'; font-weight: bold;
      font-size: 1em; padding: 10px 32px; cursor: pointer; box-shadow: 0 0 8px #ffe25999;
      transition: background 0.2s;
    }
    .locked-modal-close:hover { background: #ffe259; color: #000; }
    @keyframes lockedPopIn { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `;
  document.head.appendChild(style);
}

// Lắng nghe sự kiện chốt danh sách từ server
socket.on('playersLocked', () => {
  // Nếu có form đăng ký, disable toàn bộ input, button
  const form = document.getElementById('registerForm');
  if (form) {
    form.querySelectorAll('input, button').forEach(e => e.disabled = true);
  }
  // Hiển thị thông báo
  if (typeof messageDiv !== 'undefined') {
    messageDiv.innerHTML = '<span style="color:#ff1744">Đã chốt danh sách, không thể đăng ký thêm!</span>';
  }
  // Hiện popup khi bấm vào bất kỳ số, input, button
  setTimeout(() => {
    const form = document.getElementById('registerForm');
    if (form) {
      form.querySelectorAll('input, button').forEach(e => {
        e.addEventListener('click', showLockedPopup);
      });
    }
    const numberBtns = document.querySelectorAll('.number-btn');
    numberBtns.forEach(btn => {
      btn.addEventListener('click', showLockedPopup);
    });
  }, 300);
});

// Khi mở lại danh sách, enable lại form và gỡ sự kiện popup
socket.on('playersUnlocked', () => {
  const form = document.getElementById('registerForm');
  if (form) {
    form.querySelectorAll('input, button').forEach(e => e.disabled = false);
  }
  if (typeof messageDiv !== 'undefined') {
    messageDiv.innerHTML = '';
  }
  // Gỡ sự kiện popup
  setTimeout(() => {
    const form = document.getElementById('registerForm');
    if (form) {
      form.querySelectorAll('input, button').forEach(e => {
        e.removeEventListener('click', showLockedPopup);
      });
    }
    const numberBtns = document.querySelectorAll('.number-btn');
    numberBtns.forEach(btn => {
      btn.removeEventListener('click', showLockedPopup);
    });
  }, 300);
});

// Focus tự động: chọn đại lý xong sẽ focus vào số, chọn số xong sẽ focus vào nút Tham Gia
if (dealerSelect) {
  dealerSelect.addEventListener('change', () => {
    // Focus vào số đầu tiên chưa bị chọn
    setTimeout(() => {
      const firstBtn = document.querySelector('.number-btn:not(.taken)');
      if (firstBtn) firstBtn.focus();
    }, 100);
  });
}

// Khi chọn số xong, focus vào nút Tham Gia
function focusJoinBtn() {
  setTimeout(() => {
    const joinBtn = form.querySelector('button[type="submit"]');
    if (joinBtn) {
      joinBtn.focus();
      // Scroll để nút luôn hiện trên mobile
      joinBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// Gắn lại sự kiện cho các nút số mỗi lần render
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
    btn.addEventListener('click', () => {
      if (btn.classList.contains('taken')) return;
      if (isLocked) return;
      // Bỏ chọn số trước đó nếu có
      const prevSelected = document.querySelector('.number-btn.selected');
      if (prevSelected) {
        prevSelected.classList.remove('selected');
      }
      // Hiệu ứng chọn số
      selectedNumber = parseInt(btn.dataset.number);
      numberInput.value = selectedNumber;
      btn.classList.add('selected');
      // Thêm hiệu ứng âm thanh khi chọn số
      playSelectSound();
      // Focus vào nút Tham Gia
      focusJoinBtn();
    });
  });
}

// Lắng nghe socket realtime cập nhật đại lý
socket.on('dealersChanged', fetchDealers); 