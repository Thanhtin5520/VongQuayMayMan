# Vòng Quay Con Số May Mắn

Dự án minigame vòng quay con số may mắn sử dụng Node.js, Express, Socket.io và HTML/CSS/JS.

## Cài đặt

1. Clone dự án:
   ```bash
   git clone <repository-url>
   cd vong-quay-may-man
   ```

2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Chạy server:
   ```bash
   npm start
   ```

4. Truy cập:
   - Client: http://localhost:3000/client
   - Admin: http://localhost:3000/admin

## Tính năng

- **Client:**
  - Đăng ký người chơi (tên, số).
  - Hiển thị thông báo đăng ký thành công.

- **Admin:**
  - Hiển thị danh sách người chơi.
  - Vòng quay số may mắn.
  - Chức năng: Quay, Dừng, Quay lại lượt trước.
  - Hiển thị kết quả người trúng thưởng.

## Công nghệ sử dụng

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** HTML, CSS, JavaScript 