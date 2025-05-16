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

let players = [];
let isSpinning = false;
let currentRotation = 0;
let spinInterval;

// Lấy danh sách người chơi từ server
async function fetchPlayers() {
  try {
    const response = await fetch('https://vongquaymayman-production.up.railway.app/players');
    players = await response.json();
    updatePlayerList();
  } catch (error) {
    console.error('Lỗi lấy danh sách người chơi:', error);
  }
}

// Cập nhật danh sách người chơi trên giao diện
function updatePlayerList() {
  playerList.innerHTML = '';
  players.forEach(player => {
    const li = document.createElement('li');
    li.textContent = `${player.name} - Số: ${player.number}`;
    playerList.appendChild(li);
  });
}

// Vẽ vòng quay số
function drawWheel() {
  ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
  const centerX = wheelCanvas.width / 2;
  const centerY = wheelCanvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(currentRotation);

  const sliceAngle = (2 * Math.PI) / players.length;
  players.forEach((player, index) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, index * sliceAngle, (index + 1) * sliceAngle);
    ctx.closePath();
    ctx.fillStyle = index % 2 === 0 ? '#FFD700' : '#FFA500';
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(index * sliceAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    ctx.fillText(`${player.name} (${player.number})`, radius - 10, 5);
    ctx.restore();
  });

  ctx.restore();
}

// Quay vòng quay
function spin() {
  if (isSpinning) return;
  isSpinning = true;
  spinInterval = setInterval(() => {
    currentRotation += 0.1;
    drawWheel();
  }, 50);
  showSuccessMessage('Đang quay số...');
}

// Dừng vòng quay
function stop() {
  if (!isSpinning) return;
  clearInterval(spinInterval);
  isSpinning = false;
  const winnerIndex = Math.floor(Math.random() * players.length);
  const winner = players[winnerIndex];
  resultDiv.textContent = `Người trúng thưởng: ${winner.name} - Số: ${winner.number}`;
  showSuccessMessage('Đã dừng quay!');
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
    
    // Ẩn hiệu ứng sau 2 giây
    setTimeout(() => {
      successEffect.classList.remove('active');
      messageDiv.classList.remove('show');
    }, 2000);
  }, 1500);
}

// Khởi tạo
fetchPlayers();
drawWheel();

// Gắn sự kiện cho các nút
spinButton.addEventListener('click', spin);
stopButton.addEventListener('click', stop);
resetButton.addEventListener('click', reset); 