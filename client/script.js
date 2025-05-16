const socket = io('https://3e8c-118-69-72-133.ngrok-free.app/');
const form = document.getElementById('registerForm');
const messageDiv = document.getElementById('message');
const numberGrid = document.getElementById('numberGrid');
const numberInput = document.getElementById('number');

let selectedNumber = null;
let takenNumbers = [];

// Lấy danh sách người chơi để biết số đã chọn
async function fetchTakenNumbers() {
  try {
    const response = await fetch('https://3e8c-118-69-72-133.ngrok-free.app/players');
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
    const response = await fetch('https://3e8c-118-69-72-133.ngrok-free.app/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, number }),
    });
    const data = await response.json();
    if (data.success) {
      messageDiv.textContent = 'Đăng ký thành công!';
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