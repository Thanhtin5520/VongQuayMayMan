const socket = io('https://vongquaymayman-production.up.railway.app/');
const playerList = document.getElementById('players');
const resultDiv = document.getElementById('result');
const spinButton = document.getElementById('spin');
const stopButton = document.getElementById('stop');
const resetButton = document.getElementById('reset');
const wheelCanvas = document.getElementById('wheelCanvas');
const ctx = wheelCanvas.getContext('2d');
const successEffect = document.getElementById('successEffect');
const spinner = successEffect.querySelector('.spinner');
const checkmark = successEffect.querySelector('.checkmark');
const messageDiv = document.getElementById('message');
const spinAudio = document.getElementById('spinAudio');
const doneAudio = document.getElementById('doneAudio');
const winnerPopup = document.getElementById('winnerPopup');
const winnerText = document.getElementById('winnerText');
const resultPopup = document.getElementById('resultPopup');
const resultMessage = document.getElementById('resultMessage');
const closeResult = document.getElementById('closeResult');

let players = [];
let isSpinning = false;
let currentRotation = 0;
let spinInterval;
let spinEffectFrame = 0;
let spinSpeed = 0.1;
let decelerating = false;
let spinAudioLooping = false;
let canStop = false;

// Mảng màu neon cho sector (đặt trong hàm để luôn cập nhật đúng)
function drawWheel() {
  ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
  const centerX = wheelCanvas.width / 2;
  const centerY = wheelCanvas.height / 2;
  const spinCircleRatio = 0.98;
  const minSize = Math.min(wheelCanvas.width, wheelCanvas.height);
  const radius = (minSize * 0.5) * spinCircleRatio - 2;
  const sectorColors = [
    '#00eaff', // cyan
    '#ffe259', // vàng neon
    '#ff5e62', // cam neon
    '#a259ff', // tím neon
    '#43ff64', // xanh lá neon
    '#ff1744', // đỏ neon
    '#18dcff', // xanh dương neon
    '#fd5fff', // hồng neon
    '#fffbe7', // trắng vàng
    '#1a237e', // xanh navy đậm
    '#232946', // xám xanh đậm
    '#22223b'  // xám xanh đậm hơn
  ];
  // Nếu chưa có người chơi, luôn vẽ 8 sector, số là ?
  const n = players.length > 0 ? players.length : 8;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(currentRotation);
  const sliceAngle = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const startAngle = i * sliceAngle;
    const endAngle = (i + 1) * sliceAngle;
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    // Mỗi sector một màu
    const color = sectorColors[i % sectorColors.length];
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.fill();
    // Số nổi bật trên nền sector
    ctx.save();
    ctx.rotate(i * sliceAngle + sliceAngle / 2);
    ctx.textAlign = "center";
    ctx.font = "bold 44px 'Orbitron', Arial, sans-serif";
    // Chọn màu số nổi bật
    let textColor = '#fff';
    let shadowColor = '#fff';
    // Nếu màu nền sáng thì dùng đen, nếu nền tối thì dùng trắng hoặc vàng neon
    if (["#ffe259", "#fffbe7", "#fd5fff", "#ff5e62", "#ff1744", "#43ff64"].includes(color)) {
      textColor = '#181828';
      shadowColor = '#fffbe7';
    } else if (["#00eaff", "#18dcff", "#a259ff", "#1a237e", "#232946", "#22223b"].includes(color)) {
      textColor = '#ffe259';
      shadowColor = '#ffe259';
    }
    ctx.fillStyle = textColor;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 14;
    if (players[i]) {
      ctx.fillText(`${players[i].number}`, radius * 0.65, 20);
    } else {
      ctx.fillText('?', radius * 0.65, 20);
    }
    ctx.restore();
    ctx.restore();
  }
  // Hiệu ứng động cho viền vàng ngoài
  let borderGlow = 80;
  let borderAlpha = 1;
  if (isSpinning) {
    borderGlow = 120 + 48 * Math.abs(Math.sin(spinEffectFrame / 6));
    borderAlpha = 0.7 + 0.3 * Math.abs(Math.cos(spinEffectFrame / 8));
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.lineWidth = 8;
  ctx.globalAlpha = borderAlpha;
  ctx.strokeStyle = '#ffd700';
  ctx.shadowColor = '#ffff66';
  ctx.shadowBlur = borderGlow;
  ctx.stroke();
  ctx.restore();
  // Hiệu ứng động cho tâm vòng quay
  let centerGlow = 18;
  if (isSpinning) {
    centerGlow = 28 + 32 * Math.abs(Math.sin(spinEffectFrame / 5));
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffd700";
  ctx.shadowColor = "#fffde7";
  ctx.shadowBlur = centerGlow;
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // Hiệu ứng động cho mũi tên
  let arrowGlow = 28;
  if (isSpinning) {
    arrowGlow = 38 + 32 * Math.abs(Math.cos(spinEffectFrame / 4));
  }
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(0); // hướng lên trên (12h)
  ctx.beginPath();
  const arrowLen = radius * 0.35;
  const arrowWidth = 32;
  ctx.moveTo(0, -arrowLen); // đỉnh nhọn ngoài cùng
  ctx.lineTo(-arrowWidth / 2, 0); // góc trái ở tâm
  ctx.lineTo(arrowWidth / 2, 0);  // góc phải ở tâm
  ctx.closePath();
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#fffde7';
  ctx.shadowBlur = arrowGlow;
  ctx.fill();
  ctx.restore();
}

// Lấy danh sách người chơi từ server
async function fetchPlayers() {
  try {
    const response = await fetch('https://vongquaymayman-production.up.railway.app/players');
    players = await response.json();
    updatePlayerList();
    drawWheel();
  } catch (error) {
    console.error('Lỗi lấy danh sách người chơi:', error);
  }
}

// Cập nhật danh sách người chơi trên giao diện
function updatePlayerList() {
  const playersTbody = document.getElementById('players');
  playersTbody.innerHTML = '';
  if (players.length === 0) return; // Không hiển thị dòng nào nếu chưa có người chơi
  players.forEach(player => {
    const tr = document.createElement('tr');
    const tdNumber = document.createElement('td');
    const tdName = document.createElement('td');
    const tdResult = document.createElement('td');
    tdNumber.textContent = player.number;
    tdNumber.className = 'player-number';
    tdName.textContent = player.name;
    tdName.className = 'player-name';
    tdResult.className = 'player-result';
    tdResult.textContent = '';
    tr.appendChild(tdNumber);
    tr.appendChild(tdName);
    tr.appendChild(tdResult);
    playersTbody.appendChild(tr);
  });
}

// Quay vòng quay
function spin() {
  if (isSpinning) return;
  if (players.length < 4) {
    showErrorMessage('Cần tối thiểu 4 người chơi mới được quay!');
    return;
  }
  // Xóa dữ liệu JSON localStorage và sessionStorage khi quay
  localStorage.clear();
  sessionStorage.clear();
  isSpinning = true;
  decelerating = false;
  canStop = true;
  let spinStartTime = Date.now();
  let spinSpeedMin = 0.1;
  let spinSpeedMax = 1.0;
  let spinSpeedGrowTime = 1500; // 1.5s tăng tốc
  spinSpeed = spinSpeedMin;
  // PHÁT ÂM THANH QUAY SỐ LẶP LIÊN TỤC
  if (spinAudio) {
    spinAudio.currentTime = 0;
    spinAudio.play();
    spinAudioLooping = true;
    spinAudio.onended = function() {
      if (spinAudioLooping) {
        spinAudio.currentTime = 0;
        spinAudio.play();
      }
    };
  }
  // Bắt đầu hiệu ứng động
  function animateSpinEffect() {
    if (!isSpinning) return;
    spinEffectFrame++;
    drawWheel();
    // Tăng tốc dần trong 1.5s đầu
    let tGrow = (Date.now() - spinStartTime) / spinSpeedGrowTime;
    if (!decelerating && tGrow < 1) {
      spinSpeed = spinSpeedMin + (spinSpeedMax - spinSpeedMin) * (1 - Math.pow(1 - tGrow, 2)); // ease-out
    } else if (!decelerating) {
      spinSpeed = spinSpeedMax;
    }
    currentRotation += spinSpeed;
    requestAnimationFrame(animateSpinEffect);
  }
  animateSpinEffect();
  showSuccessMessage('Đang quay số...');
}

// Dừng vòng quay
function stop() {
  if (!isSpinning || !canStop) return;
  canStop = false;
  // Bắt đầu giảm tốc trong 7s rồi dừng hẳn, giữ nguyên tốc độ hiện tại
  decelerating = true;
  let decelStart = Date.now();
  let initialSpeed = spinSpeed;
  function decelerateToStop() {
    let t = (Date.now() - decelStart) / 7000; // 7s giảm tốc
    if (t >= 1) {
      spinSpeed = 0;
      isSpinning = false;
      drawWheel();
      // DỪNG ÂM THANH QUAY SỐ NGAY KHI DỪNG HẲN
      if (spinAudio) {
        spinAudioLooping = false;
        spinAudio.pause();
        spinAudio.currentTime = 0;
        spinAudio.onended = null;
      }
      // PHÁT ÂM THANH DONE KHI DỪNG
      if (doneAudio) {
        doneAudio.currentTime = 0;
        doneAudio.play();
      }
      // Tính sector tại vị trí mũi tên (12h)
      const n = players.length > 0 ? players.length : 8;
      let normalized = (3 * Math.PI / 2 - currentRotation) % (2 * Math.PI);
      if (normalized < 0) normalized += 2 * Math.PI;
      const sectorSize = 2 * Math.PI / n;
      const winnerIndex = Math.floor(normalized / sectorSize) % n;
      const winner = players[winnerIndex];
      // Hiển thị popup hiệu ứng số trước, sau đó type tên
      if (winner) {
        showResultPopupWithTypeEffect(winner.number, winner.name);
      } else {
        showResultPopup('Chưa có người chơi nào!');
      }
      // Ẩn thông báo cũ bên dưới
      resultDiv.textContent = '';
      showSuccessMessage('Đã dừng quay!');
      return;
    } else {
      // Giảm tốc theo hàm ease-out quartic cho cảm giác chậm dần mạnh hơn
      let ease = 1 - Math.pow(1 - t, 4); // quartic ease-out
      spinSpeed = initialSpeed * (1 - ease);
      currentRotation += spinSpeed;
      drawWheel();
      requestAnimationFrame(decelerateToStop);
    }
  }
  decelerateToStop();
}

// Quay lại lượt trước
function reset() {
  currentRotation = 0;
  drawWheel();
  resultDiv.textContent = '';
  showSuccessMessage('Đã reset vòng quay!');
}

// Kết nối Socket.io
socket.on('newPlayer', (player) => {
  players.push(player);
  updatePlayerList();
  drawWheel();
});

socket.on('playerRemoved', (number) => {
  players = players.filter(p => p.number !== number);
  updatePlayerList();
  drawWheel();
});

// Hàm hiển thị thông báo thành công
function showSuccessMessage(message) {
  // Hiển thị hiệu ứng xoay vòng
  successEffect.classList.add('active');
  spinner.style.display = 'block';
  checkmark.classList.remove('show');
  
  // Sau 1.5 giây, hiển thị dấu tích
  setTimeout(() => {
    spinner.style.display = 'none';
    checkmark.classList.add('show');
    
    // Hiển thị thông báo
    messageDiv.textContent = message;
    messageDiv.classList.add('show');
    
    // Hiển thị popup kết quả
    if (message.includes('Đã dừng quay')) {
      resultMessage.textContent = message;
      resultPopup.classList.add('show');
    }
    
    // Ẩn hiệu ứng sau 2 giây
    setTimeout(() => {
      successEffect.classList.remove('active');
      messageDiv.classList.remove('show');
    }, 2000);
  }, 1500);
}

// Xử lý đóng popup kết quả
closeResult.addEventListener('click', () => {
  resultPopup.classList.remove('show');
});

function showResultPopupWithTypeEffect(number, name) {
  resultMessage.innerHTML = `<div class='result-message-custom'><span class='popup-number'>${number}</span></div>`;
  resultPopup.classList.add('show');
  // Hiệu ứng nhấp nháy dòng trúng thưởng trong bảng
  blinkWinnerRow(number);
  // Hiệu ứng nhấp nháy bảng
  const table = document.getElementById('playersTable');
  if (table) {
    table.classList.add('blink-table');
    setTimeout(() => {
      table.classList.remove('blink-table');
    }, 2000);
  }
  let i = 0;
  function typeEffect() {
    if (i <= name.length) {
      resultMessage.innerHTML = `<div class='result-message-custom'><span class='popup-number'>${number}</span><span class='popup-name'>${name.slice(0, i)}</span></div>`;
      i++;
      setTimeout(typeEffect, 60);
    }
  }
  setTimeout(typeEffect, 700); // delay 0.7s cho bất ngờ
}

function blinkWinnerRow(number) {
  // Tìm tất cả các dòng trong bảng
  const rows = document.querySelectorAll('#playersTable tbody tr');
  let foundRow = null;
  rows.forEach(row => {
    const numberCell = row.children[1];
    if (numberCell && numberCell.textContent == number) {
      foundRow = row;
      row.classList.add('winner-blink');
      setTimeout(() => {
        row.classList.remove('winner-blink');
      }, 2400); // 0.4s * 6 lần nhấp nháy
    }
  });
  // Nếu tìm thấy dòng, scroll để dòng đó vào giữa bảng
  if (foundRow) {
    const table = document.getElementById('playersTable');
    const tableRect = table.getBoundingClientRect();
    const rowRect = foundRow.getBoundingClientRect();
    // Kiểm tra nếu dòng nằm ngoài vùng nhìn thấy
    if (rowRect.top < tableRect.top || rowRect.bottom > tableRect.bottom) {
      // Scroll để dòng vào giữa bảng
      const scrollTop = table.scrollTop;
      const offset = rowRect.top - tableRect.top;
      table.scrollTop = scrollTop + offset - table.clientHeight / 2 + foundRow.clientHeight / 2;
    }
  }
}

function showErrorMessage(message) {
  messageDiv.textContent = message;
  messageDiv.classList.add('show');
  messageDiv.style.color = '#ff1744';
  setTimeout(() => {
    messageDiv.classList.remove('show');
    messageDiv.style.color = '';
  }, 2000);
}

// Khởi tạo
fetchPlayers();
drawWheel();

// Gắn sự kiện cho các nút
spinButton.addEventListener('click', spin);
stopButton.addEventListener('click', stop);
resetButton.addEventListener('click', reset); 