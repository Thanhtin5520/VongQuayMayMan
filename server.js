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

// Route cho trang checkin
app.get('/checkin', (req, res) => {
  res.sendFile(path.join(__dirname, 'checkin.html'));
});

// Lưu trữ dữ liệu tạm thời
let players = [];
let usedNumbers = new Set();

// Lưu trữ đại lý (dealers) realtime
let dealers = [
  { code: 'CWS068', name: 'ĐỒNG HỒ HẢI TRIỀU' },
  { code: 'CWS303', name: 'CÔNG TY TNHH TASMEDIA' },
  { code: 'CWS378', name: 'HỘ KINH DOANH WATCHSTORE.VN' },
  { code: 'CWS047', name: 'ĐỒNG HỒ -MK MINH' },
  { code: 'CWS128', name: 'ĐỒNG HỒ ĐẶNG PHƯỚC QUÂN' },
  { code: 'CWS333', name: 'CTY TNHH XNK & PP SKTIME' },
  { code: 'CWS278', name: 'CTY TNHH XNK PP TRẦN ĐỨC' },
  { code: 'CWS077', name: 'ĐỒNG HỒ ĐẠI LỘC' },
  { code: 'CWS052', name: 'ĐỒNG HỒ SK TIME' },
  { code: 'CWS407', name: 'CÔNG TY TNHH MERCURY NETWORK' },
  { code: 'CWS097', name: 'ĐỒNG HỒ HƯNG THỊNH' },
  { code: 'CWS369', name: 'HỘ KINH DOANH CAT WATCH' },
  { code: 'CWS350', name: 'CTY CP TMẠI VÀ XNK TÂN HOÀNG HÀ' },
  { code: 'CWS076', name: 'SHOPDONGHO.COM' },
  { code: 'CWS043', name: 'SHOP ĐỒNG HỒ 24H' },
  { code: 'CWS351', name: 'CTY TNHH ĐẦU TƯ GD QUỲNH PHÁT' },
  { code: 'CWS140', name: 'ĐỒNG HỒ HỒNG ANH' },
  { code: 'CWS057', name: 'CÔNG TY ĐỒNG VIỆT' },
  { code: 'CWS408', name: 'HỘ KINH DOANH ĐỨC DŨNG' },
  { code: 'CWS430', name: 'HKD BI WATCH' },
  { code: 'CWS107', name: 'ĐỒNG HỒ VIỆT THẮNG' },
  { code: 'CWS030', name: 'ĐỒNG HỒ CHÍ' },
  { code: 'CWS271', name: 'ĐẶNG TUẤN KHANH' },
  { code: 'CWS014', name: 'ĐỒNG HỒ ORI' },
  { code: 'CWS212', name: 'CTY CP XUẤT NHẬP KHẨU HIỂN LONG' },
  { code: 'CWS354', name: 'HKD WATCHSTORE TRẦN ĐẠI NGHĨA' }
];

// Lưu trữ lịch sử quay số
let spinHistory = [];

// --- Trạng thái chốt danh sách ---
let isPlayersLocked = false;

// API đăng ký người chơi
app.post('/register', (req, res) => {
  if (isPlayersLocked) {
    return res.status(403).json({ error: 'Đã chốt danh sách, không thể đăng ký thêm!' });
  }
  const { name, code, number } = req.body;
  if (!name || !number || !code) {
    return res.status(400).json({ error: 'Vui lòng nhập tên, mã và số' });
  }
  if (usedNumbers.has(number)) {
    return res.status(400).json({ error: 'Số này đã được chọn' });
  }
  players.push({ name, code, number });
  usedNumbers.add(number);
  io.emit('newPlayer', { name, code, number });
  io.emit('playersChanged');
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
        io.emit('playersChanged');
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

// API xóa bản ghi cuối cùng và đồng bộ lại dữ liệu
app.delete('/history/last', (req, res) => {
  if (spinHistory.length === 0) {
    return res.status(404).json({ error: 'Không có bản ghi nào để xóa' });
  }
  
  // Lấy bản ghi cuối cùng
  const lastRecord = spinHistory.pop();
  
  // Xóa prizeResult của player tương ứng
  if (lastRecord && lastRecord.number) {
    const player = players.find(p => p.number == lastRecord.number);
    if (player) {
      delete player.prizeResult;
      io.emit('playersChanged');
    }
  }
  
  // Thông báo cho tất cả client cập nhật lịch sử
  io.emit('historyChanged');
  
  res.json({ success: true });
});

// API lấy danh sách đại lý
app.get('/dealers', (req, res) => {
  res.json(dealers);
});

// API thêm đại lý
app.post('/dealers', (req, res) => {
  const { code, name } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Thiếu mã hoặc tên đại lý' });
  if (dealers.some(d => d.code === code)) return res.status(400).json({ error: 'Mã ĐL đã tồn tại' });
  dealers.push({ code, name });
  io.emit('dealersChanged');
  res.json({ success: true });
});

// API xóa đại lý
app.delete('/dealers/:code', (req, res) => {
  const code = req.params.code;
  const idx = dealers.findIndex(d => d.code === code);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy ĐL' });
  dealers.splice(idx, 1);
  io.emit('dealersChanged');
  res.json({ success: true });
});

// API sửa đại lý
app.put('/dealers/:code', (req, res) => {
  const code = req.params.code;
  const { name } = req.body;
  const idx = dealers.findIndex(d => d.code === code);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy ĐL' });
  if (!name) return res.status(400).json({ error: 'Thiếu tên ĐL' });
  dealers[idx].name = name;
  io.emit('dealersChanged');
  res.json({ success: true });
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

  // Xử lý chốt/mở danh sách
  socket.on('lockPlayers', () => {
    isPlayersLocked = true;
    io.emit('playersLocked');
  });
  socket.on('unlockPlayers', () => {
    isPlayersLocked = false;
    io.emit('playersUnlocked');
  });

  // Xử lý đồng bộ giải thưởng và chỉnh tay
  socket.on('prizeSelected', (idx) => {
    socket.broadcast.emit('prizeSelected', idx);
  });
  socket.on('toggleManualPrize', (manual) => {
    socket.broadcast.emit('toggleManualPrize', manual);
  });

  socket.on('disconnect', () => {
    console.log('Client ngắt kết nối');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});