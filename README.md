# Mặc Hương Các — Studio Dịch & Biên Tập Truyện Chữ Trung - Việt AI

Không gian làm việc tích hợp chuyên sâu dành cho dịch giả, biên tập viên và độc giả tiểu thuyết Trung - Việt (Next.js 15 + `@google/genai` Interactions API + IndexedDB).

---

## Tính Năng Nổi Bật

1. **Thư Viện Truyện & Biểu Đồ Tiến Độ 3 Tầng**:
   - Quản lý đa dự án tiểu thuyết với biểu đồ tròn Donut 3 tầng (*Đã biên tập/duyệt* • *Đã dịch chưa duyệt* • *Chưa dịch*).
   - Hỗ trợ Chế độ Thẻ (Card View) & Bảng Ma Trận (Table View), ghim ưu tiên `⭐`, nhân bản dự án (Clone), và sao lưu/khôi phục toàn diện qua gói `.ZIP Backup v5`.

2. **Nhập & Tách Chương Đa Nguồn (Tích Hợp Trình Tách Chương Thông Minh)**:
   - **4 nguồn nhập nguyên tác**:
     - Thư mục / Nhiều file `.TXT` hoặc gói `.ZIP` chứa `.TXT` (`XXXX_Tên_chương.txt`).
     - Sách điện tử `.EPUB` nguyên tác (đọc chuẩn `container.xml` → `.opf` → `spine`).
     - **Trình Tách Chương Thông Minh (`splitChaptersSmart`) & Regex** cho 1 file `.TXT` gộp cả truyện: tự động phân biệt nguồn bẩn/nguồn sạch, lọc bỏ bảng mục lục (TOC) đầu file, tách riêng *Lời mở đầu (Prologue)*, xem trước nội dung từng chương và cho phép **Tải xuống ngay gói `.ZIP` các chương đã tách** hoặc nhập thẳng vào truyện.
     - Dán trực tiếp hoặc tải chương từ URL.
   - **Tự động giải mã đa bảng mã tiếng Trung**: Hỗ trợ `Auto-detect`, `UTF-8`, `GB18030 / GBK`, và `UTF-16LE`.
   - **Nhập bản dịch ngoài (`.TXT` 1:1)**: Ghép nối bản dịch có sẵn vào từng mã `TITLE`, `P0001`..`Pxxxx` kèm bảng xem trước.

3. **Structured Output Chuẩn SDK (`blocks-v1`) & Bảo Vệ Chống Timeout 300s**:
   - **Structured Output (`response_format` JSON Schema + `minItems`/`maxItems`)**: Khóa cứng cấu trúc trả về theo từng đoạn `TITLE`, `P0001`..`Pxxxx` cho cả Dịch Mới, Biên Tập AI và Quét Từ Điển.
   - **4 Preset chuẩn (`v1.14.1` & `v1.14.0`)**: Tích hợp sẵn bộ chỉ dẫn *Dịch Trung - Việt* và *Biên Tập Trung - Việt* phiên bản `v1.14.1` (mặc định) và `v1.14.0`, đồng bộ 100% đầu ra `blocks-v1`.
   - **Chống đứt kết nối 300 giây trên Sợi dây 1 (Browser ↔ Next.js Server)**:
     - **Cách 1 (`renewWire1` ở 240s)**: Tự động ngắt kết nối chờ ở giây 240 (trước trần 300s) và mở lại kết nối mới / xoay sang Key tiếp theo trong bể.
     - **Cách 2 (`NDJSON Heartbeat Stream 15s`)**: Truyền xung nhịp tim `\n` mỗi 15 giây giữ kết nối HTTP luôn sống trong suốt quá trình AI suy luận sâu (`thinkingLevel: high`).
   - **Bể 50 API Key (`1 Luồng = 1 Key Độc Lập`)**: Lưu bền vững trong dự án + `localStorage`, không lưu cứng bất kỳ API Key nào trong `.env` hay mã nguồn.

4. **Từ Điển Thuật Ngữ Lọc Ngữ Cảnh 0.5ms & Quét Tiền Kỳ AI Đa Luồng**:
   - **6 phân loại chuẩn**: Nhân vật (`character`), Cảnh giới/Công pháp (`term`), Địa danh (`location`), Tông môn/Thế lực (`organization`), Pháp bảo/Đan dược (`item`), Khác (`other`).
   - **Trích xuất chuyên sâu**: Tự động thu thập `aliases` (biến thể), `forbiddenTranslations` (cách dịch sai dễ nhầm cần cấm), `confidence` (độ tin cậy `0–100%`), và `evidence` (câu bằng chứng 10–35 chữ Hán trích nguyên tác).
   - **Phát hiện Xung Đột Đa Luồng (`conflictWith`) & Chốt 1-Click**: Tự động phát hiện khi các gói quét song song đề xuất bản dịch khác nhau cho cùng 1 từ Hán, cung cấp bộ lọc `Xung đột (N)` và nút bấm 1-click để chốt phương án chuẩn (đồng thời đẩy phương án lệch vào danh sách Từ cấm).

5. **Biên Tập Song Ngữ 1:1 Khóa Dòng Block-ID (Phương Án A)**:
   - Khóa ngang hàng 1:1 giữa nguyên văn tiếng Trung (trái) và ô nhập tiếng Việt tự giãn chiều cao (phải) theo mã `TITLE`, `P0001`..`Pxxxx`.
   - **Thanh công cụ tổng trên đầu trang**: Gọn gàng cho các thao tác toàn chương (`Undo/Redo`, `Sửa raw`, `Xuất TXT 1:1`, `Nhập bản dịch cả chương`, `Chuẩn hóa câu`, lọc `Tất cả / Block lỗi`, `Tìm & Thay`).
   - **Thanh công cụ trực tiếp dưới mỗi dòng Block ID**: Tích hợp **`AI Dịch Block`**, **`3 Gợi ý`**, **`Lệnh AI...`** cùng bộ nút căn chỉnh (`Gộp ↓`, `Tách ↵`, `Đẩy ↓`, `Kéo ↑`, `Xóa Hán`). Khung 3 phương án gợi ý và ô nhập lệnh AI tùy chỉnh bung ra ngay bên dưới chính dòng Block ID đang thao tác.

6. **Chế Độ Đọc Sạch (`Justify`), Sổ Tay Highlight & Xuất Sách EPUB 3.3**:
   - Trình đọc căn đều hai lề (`text-align: justify`), tùy biến màu nền/chữ HEX/RGB, nạp font cá nhân (`.ttf/.otf/.woff2`), đánh dấu Highlight 3 màu kèm ghi chú và lưu vị trí đọc (Bookmark).
   - Xuất sách điện tử **`.EPUB 3.3` chuẩn quốc tế** (tự động dịch tiêu đề chương còn thiếu bằng AI, nhúng ảnh bìa, mục lục tự động), gói `.ZIP TXT`, hoặc `.TXT` gộp.

---

## Khởi Chạy Local

**Yêu cầu:** Node.js 18+

1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Khởi chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt tại `http://localhost:3000`, vào mục **[Preset & Model → Tab 3: Chọn Model Alias, Ngưỡng QA & Xoay 50 Key]** để dán Gemini API Key cá nhân của bạn vào rồi bấm **Lưu** trước khi dịch.

## Tài Liệu Hướng Dẫn Trong Dự Án
- [`HUONG_DAN_SU_DUNG.md`](./HUONG_DAN_SU_DUNG.md): Cẩm nang vận hành toàn diện 11 chuyên mục (đồng bộ với nút **Hướng Dẫn** trên giao diện).
- [`HUONG_DAN_GITHUB.md`](./HUONG_DAN_GITHUB.md): Hướng dẫn đẩy mã nguồn lên GitHub cá nhân an toàn.
