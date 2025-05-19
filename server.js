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

// API đăng ký người chơi
app.post('/register', (req, res) => {
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

// Socket.io kết nối
io.on('connection', (socket) => {
  console.log('Client kết nối');
  socket.on('disconnect', () => {
    console.log('Client ngắt kết nối');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});