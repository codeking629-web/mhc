# Hướng Dẫn Đẩy Dự Án Mặc Hương Các (`mhc`) Lên GitHub

Tài liệu này hướng dẫn từng bước để đẩy **riêng thư mục `mhc`** lên một kho lưu trữ (Repository) độc lập trên GitHub, kèm theo cách cập nhật code về sau và bảo mật 50 Gemini API Key.

---

## 1. Chuẩn bị trước khi đẩy (Chỉ làm 1 lần đầu)

1. **Cài đặt Git** (nếu máy chưa có): Tải tại https://git-scm.com/download/win
2. **Tạo Repository mới trên GitHub**:
   - Truy cập https://github.com/new
   - **Repository name**: Đặt tên (ví dụ: `mac-huong-cac-studio` hoặc `mhc-translator`)
   - **Chế độ hiển thị**: Nên chọn **Private** (Riêng tư) hoặc **Public** (Công khai)
   - **Lưu ý quan trọng**: **KHÔNG** tích vào ô *"Add a README file"*, *"Add .gitignore"* hay *"Choose a license"* (để kho lưu trữ trống hoàn toàn, giúp đẩy code lên không bị xung đột).
   - Bấm **Create repository** và copy đường link HTTPS của repo (ví dụ: `https://github.com/<ten-tai-khoan>/<ten-repo>.git`).

---

## 2. Bảo mật API Key trước khi đẩy lên GitHub

File [`.gitignore`](./.gitignore) trong thư mục `mhc` đã được cấu hình sẵn để **tự động loại bỏ** các file nhạy cảm và thư mục nặng không cần đẩy lên GitHub:
- `.env*` (các biến môi trường chứa API Key)
- `data/project-key-pool.json` (file lưu bể 50 Gemini API Key trên máy chủ)
- `node_modules/` và `.next/`

> 💡 **Lưu ý**: Nếu bạn chọn chế độ **Public** trên GitHub hoặc muốn导入 (Import) link GitHub này sang **Google AI Studio**, Google sẽ tự động quét và khóa các API Key bị lộ. Nhờ có `data/project-key-pool.json` trong `.gitignore`, các API Key của bạn sẽ luôn nằm an toàn trên máy riêng chứ không bị đẩy lên GitHub.

---

## 3. Các lệnh đẩy thư mục `mhc` lên GitHub lần đầu

Mở **PowerShell** hoặc **Terminal** (trong VS Code / Cursor / Windows Terminal) và chạy lần lượt các lệnh sau:

### Bước 1: Di chuyển vào đúng thư mục `mhc`
```powershell
cd "c:\Users\Admin\Documents\Codex\2026-07-24\sites-plugin-sites-openai-bundled-create-2\mhc"
```

### Bước 2: Khởi tạo Git riêng cho thư mục `mhc`
```powershell
git init
git branch -M main
```

### Bước 3: Kiểm tra danh sách file sẽ được đẩy lên
```powershell
git status
```
*(Đảm bảo trong danh sách không có `.env.local` hay `data/project-key-pool.json`).*

### Bước 4: Đóng gói toàn bộ code trong `mhc`
```powershell
git add .
git commit -m "Initial commit: Mac Huong Cac Studio (tich hop chong ngat 300s Soi day 1)"
```

### Bước 5: Liên kết với GitHub Repository và đẩy code lên
Thay đường dẫn bên dưới bằng link Repository GitHub của bạn:
```powershell
git remote add origin https://github.com/<TEN_TAI_KHOAN>/<TEN_REPO>.git
git push -u origin main
```
*(Nếu đẩy lần đầu trên máy, cửa sổ đăng nhập GitHub sẽ hiện ra, bạn chỉ cần bấm **Sign in with your browser** để xác nhận).*

---

## 4. Cách cập nhật code lên GitHub ở những lần sau

Sau này mỗi khi bạn sửa code trong `mhc` và muốn cập nhật lên GitHub, chỉ cần mở Terminal tại thư mục `mhc` và chạy 3 dòng lệnh:

```powershell
cd "c:\Users\Admin\Documents\Codex\2026-07-24\sites-plugin-sites-openai-bundled-create-2\mhc"
git add .
git commit -m "Cap nhat tinh nang moi"
git push
```

---

## 5. Xử lý các lỗi thường gặp khi Push

1. **Lỗi `remote origin already exists` khi chạy lệnh `git remote add origin`**:
   - Chạy lệnh sau để đổi sang link repo mới:
     ```powershell
     git remote set-url origin https://github.com/<TEN_TAI_KHOAN>/<TEN_REPO>.git
     ```
2. **Lỗi `Author identity unknown` khi chạy `git commit`**:
   - Khai báo tên và email Git (chỉ cần chạy 1 lần):
     ```powershell
     git config --global user.name "Ten Cua Ban"
     git config --global user.email "email-cua-ban@gmail.com"
     ```
3. **Lỗi `failed to push some refs` (do lỡ tạo sẵn file README trên GitHub)**:
   - Kéo file trên GitHub về gộp trước rồi đẩy lên:
     ```powershell
     git pull origin main --allow-unrelated-histories
     git push -u origin main
     ```
