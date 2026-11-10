# Cẩm Nang Vận Hành Toàn Diện — Mặc Hương Các Studio

Chào mừng bạn đến với **Mặc Hương Các Studio** — không gian làm việc tích hợp chuyên biệt dành cho dịch giả, biên tập viên và độc giả tiểu thuyết Trung - Việt (Tiên hiệp, Huyền huyễn, Khoa huyễn, Đô thị, Võng du, Lịch sử, Cổ đại, Đam mỹ, Ngôn tình, Dị giới...).

Tài liệu này được cập nhật đồng bộ 100% với luồng hoạt động thực tế của hệ thống: từ quản lý **Thư viện truyện kèm Biểu đồ tiến độ 3 tầng**, **Nhập liệu đa định dạng & Trình Tách Chương Thông Minh (Nguồn bẩn / Nguồn sạch / Regex / Tải ngay `.ZIP`)**, **Structured Output chuẩn SDK (`blocks-v1`)**, **Mức độ suy luận AI (`Thinking Level`: `minimal` • `low` • `medium` • `high` — mặc định `high`) kèm Bảo vệ kép chống Timeout 300s (Renew 240s + Heartbeat 15s)**, **Bể 50 API Key lưu bền vững vào dự án**, **4 Preset chuẩn (`v1.14.1` & `v1.14.0`)**, **Quét dựng Từ điển Tiền kỳ Đa luồng (kèm Trích dẫn nguyên tác, Độ tin cậy %, Từ cấm & Xử lý xung đột 1-Click)**, **Hàng đợi Dịch & Biên tập AI Đa luồng (Tạm dừng / Tiếp tục / Dừng hẳn)**, **Biên tập Song ngữ 1:1 khóa dòng Block-ID (`TITLE`, `P0001`..`Pxxxx`) với `AI Dịch Block` • `3 Gợi ý` • `Lệnh AI...` ngay trên từng dòng**, **Kiểm định chất lượng QA đa tiêu chí**, **Chế độ Đọc sạch (Justify)** đến **Đóng gói sách điện tử EPUB 3.3 & Sao lưu Dự án `.ZIP` (Backup v5)**.

---

## MỤC LỤC NHANH
1. [Quy Trình Nhanh 5 Bước & Kiến Trúc Không Gian Làm Việc](#1-quy-trình-nhanh-5-bước--kiến-trúc-không-gian-làm-việc)
2. [Thư Viện Truyện & Bảng Điều Khiển Tiến Độ Toàn Thư Viện](#2-thư-viện-truyện--bảng-điều-khiển-tiến-độ-toàn-thư-viện)
3. [Nhập Chương Nguyên Tác (4 Nguồn, Tách Chương Thông Minh) & Nhập Bản Dịch Ngoài (.TXT 1:1)](#3-nhập-chương-nguyên-tác-4-nguồn-tách-chương-thông-minh--nhập-bản-dịch-ngoài-txt-11)
4. [Cấu Hình Model Alias, Thinking Level, Chống Timeout 300s & Bể 50 Key](#4-cấu-hình-model-alias-thinking-level-chống-timeout-300s--bể-50-key)
5. [4 Preset Chuẩn (`v1.14.1` & `v1.14.0`), Từ Điển & Quét Tiền Kỳ AI Đa Luồng](#5-4-preset-chuẩn-v1141--v1140-từ-điển--quét-tiền-kỳ-ai-đa-luồng)
6. [Hàng Đợi Dịch & Biên Tập AI Đa Luồng (1x–10x, Pause / Resume / Hard Stop)](#6-hàng-đợi-dịch--biên-tập-ai-đa-luồng-1x10x-pause--resume--hard-stop)
7. [Biên Tập Song Ngữ 1:1 Khóa Dòng Block-ID & Trợ Lý AI Tại Từng Đoạn](#7-biên-tập-song-ngữ-11-khóa-dòng-block-id--trợ-lý-ai-tại-từng-đoạn)
8. [Kiểm Định Chất Lượng Đa Tiêu Chí (QA Scanner) & Tìm / Thay Thế Toàn Văn](#8-kiểm-định-chất-lượng-đa-tiêu-chí-qa-scanner--tìm--thay-thế-toàn-văn)
9. [Chế Độ Đọc Sạch (Justify), Màu HEX/RGB, Font Cá Nhân & Sổ Tay Highlight](#9-chế-độ-đọc-sạch-justify-màu-hexrgb-font-cá-nhân--sổ-tay-highlight)
10. [Xuất Sách Điện Tử EPUB 3.3, ZIP TXT, TXT Gộp & Sao Lưu Dự Án `.ZIP` (Backup v5)](#10-xuất-sách-điện-tử-epub-33-zip-txt-txt-gộp--sao-lưu-dự-án-zip-backup-v5)
11. [System Terminal Thời Gian Thực (`Ctrl + \``) & Bảng Phím Tắt Toàn Cục](#11-system-terminal-thời-gian-thực-ctrl----bảng-phím-tắt-toàn-cục)

---

## 1. Quy Trình Nhanh 5 Bước & Kiến Trúc Không Gian Làm Việc

### 1.1. Quy trình nhanh 5 bước cho người mới bắt đầu
1. **Bước 1 — Chọn hoặc Tạo bộ truyện**: Nhấn nút **Thư Viện** trên thanh công cụ trên cùng để chọn bộ mẫu có sẵn (*Phàm Nhân Tu Tiên*) hoặc tạo dự án truyện mới.
2. **Bước 2 — Nhập & Tách chương nguyên tác**: Nhấn **Nhập Chương** để nạp thư mục/gói `.zip` chứa nhiều file `.txt`, sách `.epub`, tách 1 file `.txt` gộp bằng **Trình Tách Chương Thông Minh** (hoặc Regex), hay tải trực tiếp từ URL.
3. **Bước 3 — Thiết lập Preset (`v1.14.1` / `v1.14.0`), `Thinking Level` & Key Pool**: Mở **Preset & Model** để chọn bộ chỉ dẫn dịch (*Flash Đa Thể Loại v1.14.1* hoặc *v1.14.0*), chọn mức suy luận (`minimal` / `low` / `medium` / `high` — mặc định `high`), và dán danh sách API Key cá nhân (tối đa 50 Key).
4. **Bước 4 — Quét Từ Điển Tiền Kỳ (tùy chọn) & Chạy Hàng Đợi Dịch / Biên Tập**: Tick chọn các chương ở cột trái -> chọn số luồng (`1x`–`10x`) -> nhấn **Dịch Đã Chọn** hoặc **Biên Tập Đã Chọn**.
5. **Bước 5 — Rà soát 1:1, Đọc & Xuất sách**: Chỉnh sửa chi tiết trên bảng **Biên tập bản dịch 1:1** (sử dụng các nút `AI Dịch Block`, `3 Gợi ý`, `Lệnh AI...` ngay dưới từng đoạn), kiểm tra ở chế độ **Đọc**, và nhấn **Xuất & Sao lưu** để tải sách `.EPUB 3.3` hoặc gói sao lưu `.ZIP` (Backup v5).

### 1.2. Kiến trúc 2 Chế Độ Trung Tâm & Tự Động Cuộn Đầu Chương
Giao diện chính được tinh giản tối đa vào 2 chế độ chuyển đổi tức thì ở chính giữa thanh công cụ trên cùng:
- **Biên tập bản dịch (1:1 Block-ID)**: Bảng song ngữ khóa dòng 1:1 giữa nguyên bản tiếng Trung và bản dịch tiếng Việt (`TITLE`, `P0001`, `P0002`...), kèm khung nhập tự giãn chiều cao, thanh công cụ tổng ghim cố định và thanh thao tác AI / căn chỉnh riêng dưới từng dòng đoạn văn.
- **Đọc (Clean Justified Reader)**: Trình đọc sách chuyên nghiệp căn đều hai lề (`justify`), hỗ trợ tùy biến màu nền/màu chữ HEX/RGB, nạp font cá nhân (`.ttf/.otf/.woff2`), đánh dấu Highlight 3 màu kèm ghi chú và lưu vị trí đọc (Bookmark).
- **Tự động cuộn lên đầu chương (`Scroll-to-Top`)**: Mỗi khi bạn chuyển đổi sang chương khác (bằng danh sách bên trái, menu thả xuống hay nút *Chương trước / Chương tiếp*), cả khung **Biên tập bản dịch** lẫn khung **Đọc** đều tự động cuộn mượt về đầu chương (`scrollTop = 0`), đồng thời giữ chương đang chọn luôn nằm trong vùng nhìn thấy ở cột mục lục bên trái.

---

## 2. Thư Viện Truyện & Bảng Điều Khiển Tiến Độ Toàn Thư Viện

Nhấn nút **Thư Viện** ở góc trái trên cùng để mở trung tâm quản lý toàn bộ dự án truyện:

### 2.1. Bảng Điều Khiển Tiến Độ Toàn Thư Viện (Biểu Đồ Tròn Donut 3 Tầng)
Ngay đầu cửa sổ Thư Viện là bảng tổng hợp trực quan cho cả **Toàn bộ thư viện** lẫn **Từng bộ truyện**:
- **Biểu đồ tròn Donut 3 tầng màu**:
  - **Màu Xanh Ngọc (`#1E6F50`) — Đã biên tập / Đã duyệt**: Số chương đã hoàn thiện biên tập và kiểm duyệt.
  - **Màu Hổ Phách (`#D97706`) — Đã dịch (Chưa duyệt)**: Số chương đã có bản dịch tiếng Việt nhưng chưa qua bước duyệt biên tập.
  - **Màu Xám Giấy (`#D6CFC2`) — Chưa dịch (Nguyên bản)**: Số chương mới nạp nguyên tác tiếng Trung.
- Hiển thị đầy đủ tỷ lệ phần trăm hoàn thành toàn thư viện, tổng số chương, tổng số từ tiếng Việt, số mục thuật ngữ Từ điển và số chương đạt chuẩn QA sạch 100%.

### 2.2. Chế Độ Xem Thẻ (Card View) & Bảng Ma Trận (Table View)
- **Tìm kiếm, Lọc & Sắp xếp**: Tìm theo tên truyện, tên Hán tự, tác giả, thể loại; lọc theo trạng thái (*Tất cả*, *Đã ghim ⭐*, *Đang dịch dở*, *Hoàn thành 100%*, *Chưa dịch*); sắp xếp theo *Mới cập nhật*, *Tiến độ dịch %*, *Tổng số chương*, *Số lượng từ*, hoặc *Tên A-Z*.
- **Thao tác quản trị trên từng bộ truyện**:
  - **Ghim ưu tiên (⭐)**: Đưa bộ truyện đang làm việc lên đầu danh sách.
  - **Sửa thông tin & Ảnh bìa**: Cập nhật tên tiếng Việt, tên nguyên tác, tác giả, thể loại, mô tả tóm tắt và tải ảnh bìa (dùng làm bìa sách EPUB 3.3).
  - **Nhân bản (Clone)**: Sao chép toàn bộ chương, từ điển và thiết lập sang một bản sao độc lập để thử nghiệm văn phong dịch mới.
  - **Khôi phục Dự án từ gói `.ZIP` (Backup v5)**: Nạp trực tiếp file `.zip` sao lưu để khôi phục nguyên trạng bộ truyện từ máy khác.

---

## 3. Nhập Chương Nguyên Tác (4 Nguồn, Tách Chương Thông Minh) & Nhập Bản Dịch Ngoài (.TXT 1:1)

### 3.1. Nhập Chương Nguyên Tác & Trình Tách Chương Thông Minh (Nút `Nhập Chương` ở cột trái)
Hỗ trợ **4 phương thức nhập liệu chuyên sâu**, đi kèm bộ giải mã bảng mã tiếng Trung (**Auto-detect UTF-8/GB18030, UTF-8, GB18030/GBK, UTF-16LE**) và tự động cấp mã thứ tự (`0000`, `0001`, `0002`...):
1. **Tab 1 — Thư mục / Nhiều file `.TXT` / Gói `.ZIP` chứa `.TXT`**:
   - Chọn cả thư mục, hàng trăm file `.txt` rời hoặc 1 file `.zip` chứa các chương (`0001_Chương 1.txt`, `0002_Chương 2.txt`).
   - Tự động nhận diện số thứ tự chương từ tiền tố tên file (`XXXX_`) và bóc tách dòng tiêu đề đầu tiên.
2. **Tab 2 — Sách điện tử `.EPUB` nguyên tác**:
   - Đọc cấu trúc `container.xml` -> `.opf` -> `manifest` & `spine` chuẩn quốc tế, giữ đúng thứ tự chương mục của sách gốc tiếng Trung.
3. **Tab 3 — Tách 1 file `.TXT` lớn gộp cả truyện (Trình Tách Chương Thông Minh + Regex)**:
   - **Chế độ 1 — Tách Chương Thông Minh (`Smart Splitter`)**:
     - Tự động phân biệt **Nguồn bẩn (`isDirtySource`)** và **Nguồn sạch**, tự động bỏ qua khối danh sách Mục lục (TOC) ở đầu file để không tách nhầm mục lục thành các chương rỗng.
     - Tự động gom phần văn bản trước Chương 1 thành **Lời mở đầu (`0000_Lời mở đầu.txt`)** (có thể bật/tắt), tùy chỉnh số chữ số tiền tố (`3–6 chữ số`, mặc định `4`) và tùy chọn xóa dòng tiêu đề lặp trong thân chương.
   - **Chế độ 2 — Tách bằng Biểu thức Chính quy (`Custom Regex`)**:
     - Tích hợp sẵn các mẫu Regex nhận diện `第...章/节/回/卷`, `Chương/Hồi/Quyển...` hoặc tự viết Regex riêng.
   - **Bảng Xem Trước 2 Cột & Tải Ngay Gói `.ZIP`**:
     - Xem danh sách chương bên trái và đọc thử toàn bộ nội dung chương đang chọn bên phải.
     - Cho phép bấm **Tải gói `.ZIP` các chương đã tách** về máy tính ngay lập tức, hoặc bấm **Nhập vào Bộ Truyện** để đưa thẳng vào trình dịch.
4. **Tab 4 — Dán Văn Bản Trực Tiếp hoặc Tải Từ URL**:
   - Dán nhanh nội dung 1 chương lẻ hoặc dán đường dẫn URL chương truyện (máy chủ tự động giải mã UTF-8, GB18030, GBK).

### 3.2. Nhập Bản Dịch Ngoài Cả Chương (`.TXT` 1:1)
Khi đang ở màn hình **Biên tập bản dịch**, nhấn nút **Nhập bản dịch cả chương** trên thanh công cụ để nạp bản dịch có sẵn từ bên ngoài:
- Hỗ trợ chọn file `.txt` hoặc dán văn bản trực tiếp.
- Tùy chọn **Tự động lấy dòng đầu tiên làm Tiêu đề chương (`TITLE`)**.
- Hiển thị **Bảng Xem Trước Ghép Đoạn 1:1 (`TITLE`, `P0001`..`Pxxxx`)** và cảnh báo ngay nếu số đoạn văn tiếng Việt lệch với số đoạn nguyên tác tiếng Trung.

---

## 4. Cấu Hình Model Alias, Thinking Level, Chống Timeout 300s & Bể 50 Key

Nhấn nút **Preset & Model** trên thanh công cụ trên cùng và chuyển sang **Tab 3: Chọn Model Alias, Ngưỡng QA & Xoay 50 Key**:

### 4.1. Danh sách Model Alias & Chuẩn Hóa Structured Output (`blocks-v1`)
Hệ thống kết nối trực tiếp với `@google/genai` Interactions API, sử dụng cấu hình chuẩn thức **`response_format: { type: 'text', mime_type: 'application/json', schema: ... }`** kèm khóa cứng `minItems`/`maxItems` theo đúng số đoạn văn cần trả về:
- **`gemini-flash-latest` (Khuyên dùng mặc định)**: Tốc độ cao, văn phong tiếng Việt mượt mà, ổn định cho cả dịch thuật lẫn biên tập hàng loạt.
- **`gemini-3.8-flash`**: Thế hệ Flash mới cân bằng giữa tốc độ xử lý và khả năng bám sát ngữ cảnh chương dài.
- **`gemini-4-argon`**: Mô hình suy luận chuyên sâu cho các chương văn chương cổ điển, thơ phú hoặc cấu trúc phức tạp.
- **`gemini-3.1-flash-lite` (Tốc độ siêu nhanh / Model dự phòng)**: Phản hồi cực nhanh, đồng thời đóng vai trò model dự phòng khi bật chế độ Auto-Fallback.
- **Nhập mã Model tùy chỉnh**: Cho phép gõ trực tiếp bất kỳ tên model nào khả dụng trên tài khoản của bạn.

### 4.2. Mức Độ Suy Luận (`Thinking Level`) & Bảo Vệ Kép Chống Timeout 300 Giây
- **4 mức `Thinking Level` chuẩn SDK (`minimal` • `low` • `medium` • `high`)**:
  - Mặc định luôn đặt ở mức **`high` (Suy luận sâu)** để đảm bảo chất lượng dịch thuật và biên tập cao nhất.
  - Có thể chuyển nhanh giữa `minimal | low | medium | high` ngay tại **khung Hàng Đợi (cột trái)** hoặc trong **Preset & Model -> Tab 3**.
- **Cơ chế Bảo Vệ Kép Chống Đứt Kết Nối 300 Giây trên Sợi Dây 1 (Browser ↔ Next.js API)**:
  1. **Cách 1 — Tự động làm mới ở giây 240 (`renewWire1`)**: Mỗi lượt gọi Gemini được đặt ngưỡng an toàn `240 giây` (trước trần 300 giây của cổng mạng). Nếu mô hình suy nghĩ quá 240 giây chưa trả kết quả, hệ thống chủ động ngắt kết nối chờ và tự động thử lại / xoay sang Key tiếp theo trong bể.
  2. **Cách 2 — Luồng Nhịp Tim NDJSON (`Heartbeat Stream 15s`)**: Trong suốt thời gian chờ AI suy luận, máy chủ gửi một xung nhịp tim (`\n`) mỗi 15 giây về trình duyệt để giữ kết nối HTTP luôn hoạt động, loại bỏ hoàn toàn lỗi `504 Gateway Timeout` hoặc `Premature Close`.

### 4.3. Bể 50 API Key Lưu Bền Vững & Bảo Mật 100%
- **Không lưu cứng API Key trong `.env`**: Dự án hoàn toàn sạch Key trong mã nguồn để bạn yên tâm đẩy lên GitHub.
- **1 Luồng = 1 Key Độc Lập**: Khi bạn nạp nhiều API Key (tối đa **50 Key**, mỗi dòng 1 Key `AIza...`), luồng #1 dùng Key #1, luồng #2 dùng Key #2... giúp nhân tốc độ dịch lên gấp 5–10 lần mà không bị nghẽn hạn mức trên một Key duy nhất.
- **Lưu bền vững & Nút "Xóa sạch Key"**: Key được lưu đồng bộ trên máy chủ cục bộ và trình duyệt; có thể nhấn **Xóa sạch Key** bất cứ lúc nào.
- **Chẩn đoán Key & 5 Tuyến API + Xóa Cooldown 429**: Kiểm tra sức khỏe từng Key và 5 tuyến API chỉ với 1 cú nhấp chuột, hoặc nhấn **Xóa Cooldown 429** để mở khóa ngay các Key đang chờ nghỉ.

---

## 5. 4 Preset Chuẩn (`v1.14.1` & `v1.14.0`), Từ Điển & Quét Tiền Kỳ AI Đa Luồng

Mở **Preset & Model** để quản lý bộ quy tắc dịch thuật và từ điển nhất quán cho từng bộ truyện:

### 5.1. 4 Bộ Chỉ Dẫn Dịch Thuật & Biên Tập Tích Hợp Sẵn (Tab 1)
Hệ thống tích hợp sẵn **4 bộ chỉ dẫn chuẩn** đã được đồng bộ hóa 100% với cấu trúc đầu ra `blocks-v1` (`titleTranslated` + `blocks: [{ id: "P0001", translation: "..." }]`):
1. **Dịch Trung - Việt | Flash Đa Thể Loại v1.14.1 (Khuyên dùng mặc định)**: Bản nâng cấp mới nhất tinh chỉnh nhịp câu, đại từ nhân xưng linh hoạt theo vai vế và khóa chặt đầu ra JSON `blocks-v1`.
2. **Biên Tập Trung - Việt | Flash Đa Thể Loại v1.14.1 (Khuyên dùng mặc định)**: Bản nâng cấp dành cho chế độ **Biên Tập AI**, đối chiếu nguyên tác 1:1 để chuốt văn phong tiếng Việt mượt mà và diệt sạch lỗi dịch máy.
3. **Dịch Trung - Việt | Flash Đa Thể Loại v1.14.0**: Phiên bản tiêu chuẩn ổn định cho dịch thuật đa thể loại.
4. **Biên Tập Trung - Việt | Flash Đa Thể Loại v1.14.0**: Phiên bản tiêu chuẩn ổn định cho biên tập hậu kỳ.
- Bạn có thể tạo thêm không giới hạn Preset riêng, nhân bản hoặc xuất/nhập Preset ra file `.md` / `.txt`.

### 5.2. Từ Điển Thuật Ngữ Thông Minh & Lọc Ngữ Cảnh 0.5ms (Tab 2)
- **Công tắc Đính kèm Từ điển (Mặc định TẮT)**: Bạn hoàn toàn chủ động quyết định có gửi Từ điển vào Prompt hay không bằng nút bật/tắt ngay trên thanh công cụ hoặc trong Tab Từ điển.
- **Tối ưu Lọc Ngữ Cảnh 0.5ms (Context-Aware Filtering)**: Dù từ điển của bộ truyện có tới 5.000 mục từ, trước khi dịch mỗi chương hệ thống chỉ trích xuất những thuật ngữ **thực sự xuất hiện trong văn bản chương đó** (cộng với các mục được ghim *Luôn gửi*) và nằm trong **Khoảng chương hiệu lực (`Từ chương X -> Đến chương Y`)**.
- **6 Phân loại chuẩn & 4 Chính sách dịch thuật ngữ**:
  - **6 phân loại**: `Nhân vật` (`character`), `Cảnh giới / Công pháp` (`term`), `Địa danh` (`location`), `Tông môn / Thế lực` (`organization`), `Pháp bảo / Đan dược` (`item`), `Khác` (`other`).
  - **4 chính sách**: `force` (*Bắt buộc khớp 100%*), `prefer` (*Ưu tiên dùng*), `contextual` (*Tùy ngữ cảnh*), `keep_source` (*Giữ nguyên Hán Việt/Phiên âm*).
- Hỗ trợ khai báo **Biến thể (`Aliases`)**, **Cách dịch cấm (`Forbidden Translations`)** để QA Scanner tự động bắt lỗi, và nút **Áp dụng & Thay thế đồng loạt vào các chương đã dịch**.

### 5.3. Trình Quét Dựng Từ Điển Tiền Kỳ AI Đa Luồng (Pre-Scan Builder Nâng Cấp)
Trước khi dịch một bộ truyện mới hoặc một quyển mới, mở khung **Quét & Dựng Từ Điển Tiền Kỳ Đa Luồng** ngay trong Tab 2:
- **Chọn phạm vi & cấu hình đa luồng**: Quét *Tất cả chương*, *Các chương đã tick*, *Khoảng chương (Từ X -> Y)*, hoặc *Chương đang mở*; tùy chọn **Số chương gộp mỗi gói AI (`1–10 chương/gói`)** và **Số luồng chạy song song (`1x–10x`)**.
- **Trích xuất thông tin chuyên sâu trên từng mục từ**:
  1. **Cách dịch cấm (`forbiddenTranslations`)**: Tự động liệt kê các cách dịch nghĩa đen sai, nhầm âm Hán Việt đa âm hoặc sai vai vế cần tránh để bộ Quét QA tự động phát hiện nếu bản dịch vi phạm.
  2. **Độ tin cậy (`confidence`: 0–100%)**: Hiển thị huy hiệu phần trăm độ tin cậy (`AI 95%`) ngay cạnh nhãn mục từ.
  3. **Bằng chứng nguyên tác (`evidence`)**: Trích dẫn trực tiếp câu/cụm ngắn (`10–35 chữ Hán`) từ nguyên tác (`Trích nguyên tác: 「...」`) giúp bạn kiểm chứng ngữ cảnh tức thì mà không cần mở lại chương truyện.
- **Tự Động Hợp Nhất & Phát Hiện Xung Đột Đa Luồng (`conflictWith`) — Chốt 1-Click**:
  - Khi các gói quét song song gặp lại cùng một từ Hán: không bao giờ ghi đè mục đã duyệt (`approved`); với mục nháp (`draft`), hệ thống tự động gộp thêm `aliases` và `forbiddenTranslations` mới.
  - Nếu hai gói quét đề xuất bản dịch tiếng Việt khác nhau cho cùng một từ Hán, hệ thống tự động gắn cờ **`⚡ Xung đột`**, hiển thị số lượng trên bộ lọc **`Xung đột (N)`** và cung cấp hộp nút bấm **Chốt 1-Click**: khi bạn bấm chọn 1 phương án chuẩn, các phương án lệch còn lại sẽ tự động được đẩy vào danh sách **Từ cấm (`forbiddenTranslations`)**!

---

## 6. Hàng Đợi Dịch & Biên Tập AI Đa Luồng (1x–10x, Pause / Resume / Hard Stop)

Ở cột mục lục bên trái, khung **Hàng Đợi Đa Luồng** cho phép xử lý hàng chục đến hàng trăm chương tự động:

### 6.1. Hai Chế Độ Chạy Hàng Loạt Độc Lập
1. **Dịch Đã Chọn (`Dịch Mới 100%`)**: Dịch từ nguyên bản tiếng Trung sang tiếng Việt cho các chương đã tick chọn, khóa khớp cấu trúc dòng `1:1` (`TITLE`, `P0001`..`Pxxxx`).
2. **Biên Tập Đã Chọn (`Biên Tập AI Thông Minh 2 Cơ Chế`)**:
   - **Với chương đã khớp đoạn 1:1 nhưng còn sót lỗi cục bộ**: Chỉ gửi riêng các Block ID bị sót chữ Hán / lọt tiếng Anh (`block_cleanup`) để làm sạch siêu tốc.
   - **Với chương bị báo QA Lệch Đoạn (hoặc chuốt đồng bộ cả chương)**: Hệ thống **tự động gửi TOÀN BỘ CHƯƠNG (`realign_chapter`)** gồm đầy đủ nguyên bản `TITLE`, `P0001`..`Pxxxx` kèm toàn bộ bản dịch hiện có để AI đối chiếu từ đầu đến cuối, phân bổ tách/gộp lại khớp chuẩn 1:1 từng đoạn và dọn sạch lỗi QA.

### 6.2. Chọn Nhanh `Thinking Level` & Điều Khiển Hàng Đợi Thời Gian Thực
- **Thanh chọn nhanh `Thinking`**: Ngay dưới thanh tiến độ Hàng Đợi, bạn có thể bấm chọn trực tiếp `minimal`, `low`, `medium`, hoặc `high` (mặc định `high`).
- **Bộ nút điều khiển 3 trạng thái**:
  - **Tạm dừng (Pause)**: Dừng nhận chương mới, chờ luồng đang chạy hoàn tất an toàn.
  - **Tiếp tục (Resume)**: Chạy tiếp ngay các chương còn lại trong hàng đợi.
  - **Dừng hẳn / Hủy ngay (Hard Stop)**: Ngắt toàn bộ các luồng mạng đang chạy ngay lập tức và trả các chương đang xử lý dở về trạng thái ban đầu.
- **Thanh Khôi Phục Nhanh 1-Click**: Khi có chương báo lỗi hoặc bị kẹt trạng thái đang xử lý, một thanh công cụ màu hổ phách sẽ xuất hiện ngay ở cột trái cho phép **Chạy lại các chương lỗi** hoặc **Đặt lại trạng thái chương kẹt** chỉ với 1 cú nhấp chuột.

---

## 7. Biên Tập Song Ngữ 1:1 Khóa Dòng Block-ID & Trợ Lý AI Tại Từng Đoạn

Chế độ **Biên tập bản dịch** được thiết kế theo mô hình bảng khóa dòng `1:1` trực quan và tinh gọn (Phương án A):

### 7.1. Bảng Khóa Dòng 1:1 (`TITLE`, `P0001`..`Pxxxx`) & Thanh Công Cụ Tổng Trên Đầu Trang
- Mỗi đoạn văn nguyên bản tiếng Trung ở cột trái được gắn một mã định danh cố định (`TITLE`, `P0001`, `P0002`...) và khóa ngang hàng 1:1 với ô nhập tiếng Việt tương ứng ở cột phải.
- Ô nhập tiếng Việt tự động giãn chiều cao theo độ dài văn bản; nhấn `Backspace` ở đầu ô không bao giờ làm nhảy hay gộp nhầm sang đoạn văn phía trên.
- **Thanh công cụ tổng ghim cố định (Pinned Chapter Toolbar)**: Chỉ tập trung vào các thao tác cấp toàn chương để giữ giao diện thoáng đãng:
  - **Hoàn tác / Làm lại (`Undo / Redo` — tối đa 60 bước)**, bật/tắt **Sửa raw** (sửa trực tiếp nguyên văn chữ Hán), **Xuất TXT 1:1**, **Nhập bản dịch cả chương**, và **Chuẩn hóa câu** (chuẩn hóa khoảng trắng & dấu câu toàn chương).
  - **Bộ lọc hiển thị**: Xem **Tất cả (`Tất cả`)** hoặc chỉ lọc riêng **Các đoạn có cảnh báo lỗi (`Block lỗi`)**.
  - **Tìm & Thay thế nhanh trong chương (`Tìm & Thay`)**: Hỗ trợ tìm kiếm (có Regex, Nguyên từ, Phân biệt hoa/thường) và thay thế từng vị trí hoặc toàn chương.

### 7.2. Thanh Công Cụ AI & Căn Chỉnh Trực Tiếp Dưới Mỗi Dòng Block ID (`Pxxxx`)
Ngay bên dưới ô nhập tiếng Việt của **từng dòng `TITLE`, `P0001`..`Pxxxx`** là thanh công cụ thao tác tại chỗ:
- **3 Nút Trợ Lý AI Trực Tiếp Cho Đoạn Đang Chọn**:
  1. **`AI Dịch Block`**: Nhờ AI dịch mới hoặc chuốt mượt lại toàn diện (kèm đồng bộ xưng hô theo ngữ cảnh đoạn trước/đoạn sau) cho riêng duy nhất Block ID đó.
  2. **`3 Gợi ý`**: Yêu cầu AI đề xuất **3 phương án diễn đạt tiếng Việt khác nhau** cho đoạn văn (hoặc cho cụm từ đang bôi đen trong đoạn). Hộp **3 Phương Án Diễn Đạt Từ AI** sẽ bung ra ngay bên dưới chính dòng `Pxxxx` đó để bạn đối chiếu nguyên tác bên trái và bấm chọn áp dụng 1-click.
  3. **`Lệnh AI...`**: Mở thanh nhập lệnh tùy chỉnh ngay bên dưới dòng `Pxxxx` hiện tại (ví dụ: *"Đổi sang giọng cổ phong bi tráng hơn, xưng Bản tọa - Ngươi"*), nhấn `Enter` hoặc bấm **Thực thi** để AI sửa trực tiếp đoạn hoặc vùng đang bôi đen.
- **Bộ nút căn chỉnh cấu trúc đoạn 1:1**:
  - `Gộp ↓`: Gộp đoạn hiện tại với đoạn kế tiếp bên dưới (kéo các đoạn dưới lên 1 nhịp).
  - `Tách ↵` (hoặc phím tắt `Ctrl + Enter` tại vị trí con trỏ): Tách đoạn đang chọn thành 2 đoạn độc lập (đẩy các đoạn dưới xuống 1 nhịp).
  - `Đẩy ↓` / `Kéo ↑`: Chèn 1 ô trống để đẩy các đoạn dịch bên dưới xuống 1 nhịp, hoặc xóa ô dịch dư để kéo các đoạn dưới lên 1 nhịp.
  - `Xóa Hán`: Quét và xóa tức thì các ký tự chữ Hán còn sót trong đoạn.
- **Nút `AI biên tập` / `AI Căn Lại & Biên Tập Cả Chương` trên thanh tiêu đề bảng**:
  - **Khi chương bị báo QA Lệch Đoạn (`Lệch X/Y đoạn`)**: Tự động gửi **TOÀN BỘ CHƯƠNG (`realign_chapter`)** để AI phân bổ, tách/gộp lại đúng 1:1 từng mã `TITLE`, `P0001`..`Pxxxx`.
  - **Khi chương đã khớp 1:1 và chỉ có vài Block lỗi**: Chỉ gom riêng các đoạn lỗi đó (`block_cleanup`) gửi cho AI xử lý nhanh trong một lượt.

---

## 8. Kiểm Định Chất Lượng Đa Tiêu Chí (QA Scanner) & Tìm / Thay Thế Toàn Văn

### 8.1. Bộ Quét Kiểm Định Chất Lượng Tự Động (QA Scanner)
Mỗi khi dịch xong hoặc khi bạn gõ biên tập, hệ thống tự động quét kiểm định và hiển thị huy hiệu trạng thái ngay trên từng chương và từng đoạn `Pxxxx`:
1. **Sót chữ Hán (`Residual Chinese`)**: Phát hiện và tô sáng chính xác vị trí ký tự CJK còn sót lại trong tiêu đề hoặc nội dung tiếng Việt.
2. **Rò rỉ từ tiếng Anh của AI (`English Leak`)**: Bắt các từ tiếng Anh do AI vô tình chèn vào văn cảnh cổ trang/tiên hiệp (như `system`, `level`, `boss`, `skill`, `ok`, `sorry`... trừ các từ viết tắt hợp lệ).
3. **Lệch cấu trúc đoạn 1:1 (`Block Alignment`)**: Cảnh báo khi có đoạn nguyên tác chưa được dịch hoặc số đoạn bị lệch.
4. **Vi phạm Từ cấm & Cách dịch cấm trong Từ điển (`Banned Words & Glossary Violations`)**: Kiểm tra danh sách từ cấm tùy chỉnh và các mục `forbiddenTranslations` hoặc `force` trong Từ điển.

### 8.2. Tìm Kiếm Toàn Văn & Thay Thế Hàng Loạt Chương (`Tìm Toàn Văn`)
Nhấn nút **Tìm Toàn Văn** ở cột trái để mở công cụ tra cứu xuyên suốt toàn bộ bộ truyện:
- Tìm kiếm theo **Bản dịch tiếng Việt**, **Nguyên bản tiếng Trung**, hoặc **Cả hai**.
- Hỗ trợ phân biệt chữ hoa/thường (`Case Sensitive`), biểu thức chính quy (`Regex`), lọc phạm vi (*Toàn bộ chương*, *Các chương đã tick*, *Chương đang mở*).
- Cho phép **Nhảy tới chương khớp từ khóa**, **Tick chọn toàn bộ các chương chứa từ khóa**, hoặc **Thay thế đồng loạt (Bulk Replace)** kèm quét lại QA tự động.

---

## 9. Chế Độ Đọc Sạch (Justify), Màu HEX/RGB, Font Cá Nhân & Sổ Tay Highlight

Chuyển sang chế độ **Đọc** ở thanh trên cùng để tận hưởng trải nghiệm đọc sách hoàn chỉnh:
- **Căn đều hai lề (`text-align: justify`) & Thụt đầu dòng**: Văn bản được trình bày chuẩn sách in với khoảng cách đoạn, cỡ chữ, chiều cao dòng và độ rộng trang đọc tùy chỉnh linh hoạt.
- **Tùy biến Màu Sắc HEX / RGB & 4 Giao Diện Mẫu**: Chọn nhanh *Giấy Tuyên Thành*, *Trắng Sứ Thanh Nhã*, *Xanh Trúc Dịu Mắt*, *Đêm Mặc Huyền* hoặc tự chọn mã màu nền / màu chữ HEX & RGB theo sở thích.
- **Tải Font Chữ Cá Nhân (`.ttf`, `.otf`, `.woff2`)**: Nạp trực tiếp file font từ máy tính vào trình duyệt (lưu bền vững trong IndexedDB) để đọc truyện và nhúng vào sách EPUB.
- **Đánh Dấu Highlight 3 Màu, Ghi Chú & Lưu Vị Trí Đọc (Bookmark)**:
  - Bôi đen bất kỳ câu chữ nào khi đang đọc để đánh dấu bằng 3 màu (*Vàng Hổ Phách*, *Xanh Ngọc Bích*, *Đỏ Chu Sa*) kèm ghi chú cá nhân và quản lý tập trung trong **Sổ Tay Highlight**.
  - Nhấn **Lưu vị trí đọc** để ghi nhớ chính xác chương và tỷ lệ phần trăm cuộn trang; nhấn **Đọc tiếp Chương #...** để quay lại đúng dòng đang đọc dở.

---

## 10. Xuất Sách Điện Tử EPUB 3.3, ZIP TXT, TXT Gộp & Sao Lưu Dự Án `.ZIP` (Backup v5)

Nhấn nút **Xuất & Sao lưu** ở góc phải trên cùng để mở trung tâm xuất bản và sao lưu dữ liệu:

### 10.1. Tab 1 — Xuất Sách Đọc (EPUB 3.3 / ZIP TXT / TXT Gộp)
- **Tự động kiểm tra & Dịch tiêu đề chương còn thiếu**: Trước khi xuất sách, hệ thống tự động thống kê các chương chưa có tiêu đề tiếng Việt hoặc còn sót chữ Hán ở tiêu đề, cho phép nhấn **Dịch tự động toàn bộ tiêu đề thiếu bằng AI** chỉ với 1 cú nhấp chuột.
- **Quản lý Ảnh Bìa Sách EPUB**: Tải ảnh bìa từ máy tính để nhúng trực tiếp làm trang bìa (`cover.xhtml`) cho sách điện tử.
- **3 Định dạng xuất bản chuyên nghiệp**:
  1. **Sách điện tử `.EPUB 3.3` chuẩn quốc tế**: Có mục lục tự động (`nav.xhtml` + `toc.ncx`), trang thông tin sách, ảnh bìa và CSS căn đều hai lề (`justify`), tương thích hoàn hảo với Apple Books, Kindle (Send-to-Kindle), Kobo, Moon+ Reader, Google Play Books.
  2. **Gói `.ZIP` chứa từng file `.TXT` theo chương**: Đặt tên chuẩn thứ tự `0001_Chương_1.txt`, `0002_Chương_2.txt`...
  3. **1 File `.TXT` Gộp Toàn Bộ Truyện**: Ghép toàn bộ các chương thành một tệp văn bản duy nhất có phân cách chương rõ ràng.
- Hỗ trợ chọn phạm vi xuất (*Toàn bộ chương*, *Chỉ các chương đã dịch*, *Chỉ các chương đang tick chọn*) và chế độ trình bày (*Chỉ Tiếng Việt sạch* hoặc *Song ngữ Trung - Việt xen kẽ từng đoạn*).

### 10.2. Tab 2 — Sao Lưu & Khôi Phục Dự Án Toàn Diện `.ZIP` (Backup v5)
- **Xuất Gói Sao Lưu Dự Án `.ZIP` (Backup v5)**: Đóng gói toàn bộ dữ liệu bộ truyện vào một tệp `.zip` có cấu trúc thư mục rõ ràng (`backup-manifest.json`, `project/novel.json`, `chapters/`, `glossary/`, `presets/`, `assets/` bao gồm cả ảnh bìa và font chữ cá nhân).
- **Khôi Phục Dự Án Từ Gói `.ZIP`**: Chọn tệp `.zip` Backup v5 để khôi phục 100% chương truyện, trạng thái duyệt, từ điển, highlight và cài đặt đọc trên bất kỳ thiết bị nào.

---

## 11. System Terminal Thời Gian Thực (`Ctrl + \``) & Bảng Phím Tắt Toàn Cục

### 11.1. System Terminal & Bảng Chẩn Đoán Kỹ Thuật (`Ctrl + \``)
Nhấn nút **Terminal** ở góc phải dưới màn hình (hoặc phím tắt `Ctrl + \``) để mở bảng theo dõi hệ thống thời gian thực:
- **Nhật ký hợp nhất (Client + Server API)**: Hiển thị chi tiết từng yêu cầu dịch thuật, biên tập, quét từ điển, thời gian phản hồi (`ms`), Model thực tế đã dùng (`modelUsed`), mức suy luận (`thinkingLevelUsed`), luồng Key nào được cấp phát (`keyMask`) và trạng thái Cooldown.
- **Nút Chẩn Đoán Nhanh 1-Click**: Kiểm tra tức thì kết nối `/api/models`, `/api/logs` và sao chép toàn bộ nhật ký kỹ thuật ra Clipboard.

### 11.2. Bảng Phím Tắt Toàn Cục
| Phím tắt | Chức năng thực thi |
| :--- | :--- |
| **`Ctrl + S`** (hoặc `Cmd + S`) | Lưu ngay chương đang biên tập vào cơ sở dữ liệu trình duyệt (IndexedDB) |
| **`Ctrl + Z` / `Ctrl + Y`** | Hoàn tác (Undo) / Làm lại (Redo) thao tác chỉnh sửa trong bảng biên tập 1:1 |
| **`Ctrl + Enter`** | Tách đoạn văn (`Block Pxxxx`) đang đặt con trỏ thành 2 đoạn tại đúng vị trí con trỏ |
| **`Alt + ←` / `Alt + →`** | Chuyển nhanh sang **Chương trước** / **Chương tiếp theo** (tự động cuộn lên đầu chương) |
| **`Ctrl + \``** | Bật / Tắt ngăn kéo **System Terminal** theo dõi nhật ký AI và mạng thời gian thực |
