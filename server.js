const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Cấu hình static files
app.use('/client', express.static(path.join(__dirname, 'client')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Route cho trang chủ
app.get('/', (req, res) => {
  res.redirect('/client');
}); 
  
// Route cho client
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Route cho admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Route cho trang setting
app.get('/setting', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'setting.html'));
});

// Lưu trữ dữ liệu tạm thời
let players = [];
let usedNumbers = new Set();

// Lưu trữ lịch sử quay số
let spinHistory = [];

// --- Trạng thái chốt danh sách ---
let isPlayersLocked = false;

// API đăng ký người chơi
app.post('/register', (req, res) => {
  if (isPlayersLocked) {
    return res.status(403).json({ error: 'Đã chốt danh sách, không thể đăng ký thêm!' });
  }
  const { name, number } = req.body;
  if (!name || !number) {
    return res.status(400).json({ error: 'Vui lòng nhập tên và số' });
  }
  if (usedNumbers.has(number)) {
    return res.status(400).json({ error: 'Số này đã được chọn' });
  }
  players.push({ name, number });
  usedNumbers.add(number);
  io.emit('newPlayer', { name, number });
  res.json({ success: true });
});

// API lấy danh sách người chơi
app.get('/players', (req, res) => {
  res.json(players);
});

// API thêm người chơi (admin)
app.post('/admin/add', (req, res) => {
  const { name, number } = req.body;
  if (!name || !number) {
    return res.status(400).json({ error: 'Vui lòng nhập tên và số' });
  }
  if (usedNumbers.has(number)) {
    return res.status(400).json({ error: 'Số này đã được chọn' });
  }
  players.push({ name, number });
  usedNumbers.add(number);
  io.emit('newPlayer', { name, number });
  res.json({ success: true });
});

// API xóa người chơi (admin)
app.delete('/admin/remove/:number', (req, res) => {
  const number = parseInt(req.params.number);
  const index = players.findIndex(p => p.number === number);
  if (index === -1) {
    return res.status(404).json({ error: 'Không tìm thấy người chơi' });
  }
  players.splice(index, 1);
  usedNumbers.delete(number);
  io.emit('playerRemoved', number);
  res.json({ success: true });
});

// API lấy lịch sử
app.get('/history', (req, res) => {
  res.json(spinHistory);
});

// API thêm lịch sử
app.post('/history', (req, res) => {
  const { number, name, prize, prizeImg, time } = req.body;
  spinHistory.push({ number, name, prize, prizeImg, time });
  io.emit('historyChanged');
  res.json({ success: true });
});

// API xóa 1 dòng lịch sử
app.delete('/history/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  if (idx >= 0 && idx < spinHistory.length) {
    // Lấy số của player vừa xóa lịch sử
    const removed = spinHistory.splice(idx, 1)[0];
    // Xóa trường prizeResult của player tương ứng
    if (removed && removed.number) {
      const player = players.find(p => p.number == removed.number);
      if (player) {
        delete player.prizeResult;
      }
    }
    io.emit('historyChanged');
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy dòng lịch sử' });
  }
});  

// API xóa     toàn bộ lịch sử
app.delete('/history', (req, res) => {
  spinHistory = [];
  // Xóa luôn prizeResult của tất cả player
  players.forEach(p => {
    delete p.prizeResult;
  });
  io.emit('historyChanged');
  res.json({ success: true });
});

// API cập nhật kết quả giải thưởng cho player
app.post('/players/updateResult', (req, res) => {
  const { number, result } = req.body;
  const player = players.find(p => p.number == number);
  if (player) {
    player.prizeResult = { name: result }; // Lưu lại giải thưởng
    io.emit('playersChanged');
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy người chơi' });
  }
});

// API sửa 1 dòng lịch sử
app.put('/history/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  if (idx >= 0 && idx < spinHistory.length) {
    const { number, name, prize, prizeImg, time } = req.body;
    // Lưu lại số cũ để tìm player đúng
    const oldNumber = spinHistory[idx].number;
    if (number !== undefined) spinHistory[idx].number = number;
    if (name !== undefined) spinHistory[idx].name = name;
    if (prize !== undefined) spinHistory[idx].prize = prize;
    if (prizeImg !== undefined) spinHistory[idx].prizeImg = prizeImg;
    if (time !== undefined) spinHistory[idx].time = time;
    // Đồng bộ với players
    let player = players.find(p => p.number == oldNumber);
    if (player) {
      if (number !== undefined) player.number = number;
      if (name !== undefined) player.name = name;
      // Đồng bộ giải thưởng
      if (prize !== undefined && prize !== '') {
        player.prizeResult = { name: prize };
      } else if (prize === '') {
        delete player.prizeResult;
      }
    } else if (number !== undefined) {
      // Nếu không tìm thấy theo số cũ, thử tìm theo số mới (trường hợp đã đổi số trước đó)
      player = players.find(p => p.number == number);
      if (player) {
        if (name !== undefined) player.name = name;
        if (prize !== undefined && prize !== '') {
          player.prizeResult = { name: prize };
        } else if (prize === '') {
          delete player.prizeResult;
        }
      }
    }
    io.emit('playersChanged');
    io.emit('historyChanged');
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Không tìm thấy dòng lịch sử' });
  }
});

// Socket.io kết nối
io.on('connection', (socket) => {
  console.log('Client kết nối');
  // Gửi trạng thái lock khi client mới kết nối
  if (isPlayersLocked) {
    socket.emit('playersLocked');
  } else {
    socket.emit('playersUnlocked');
  }
  socket.on('lockPlayers', () => {
    isPlayersLocked = true;
    io.emit('playersLocked');
  });
  socket.on('unlockPlayers', () => {
    isPlayersLocked = false;
    io.emit('playersUnlocked');
  });
  socket.on('disconnect', () => {
    console.log('Client ngắt kết nối');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});