## 6. Rủi ro và Vấn đề

### 6.1 Định nghĩa Rủi ro và Vấn đề

**Rủi ro (Risk)** là một sự kiện chưa xảy ra nhưng có khả năng xảy ra trong tương lai và có thể ảnh hưởng tiêu cực đến dự án nếu nó xảy ra.

**Vấn đề (Issue)** là một sự cố hoặc vấn đề đã xảy ra hoặc đang xảy ra và cần có hành động khắc phục.

Rủi ro được quản lý thông qua các kế hoạch **giảm thiểu (mitigation)** và **ứng phó dự phòng (contingency)**.

Vấn đề được quản lý thông qua các hành động khắc phục ngay lập tức và theo dõi liên tục sau đó.

### 6.2 Phương pháp Đánh giá Rủi ro

Mức độ phơi nhiễm rủi ro (_Risk Exposure_) được tính theo công thức:

**Risk Exposure = Probability × Impact**

Trong đó:

- **Probability (Xác suất xảy ra)** được đánh giá từ 0.1 đến 1.0.
- **Impact (Mức độ ảnh hưởng)** được đánh giá từ 1 đến 10.
- **Mức độ rủi ro (Risk Level)** được phân loại như sau:
  - **Thấp (Low):** 0.1 – 2.9
  - **Trung bình (Medium):** 3.0 – 5.9
  - **Cao (High):** 6.0 – 10.0

### 6.3 Danh mục Rủi ro (Risk Register)

| ID  | Mô tả Rủi ro                                                                                                                                                                        | Danh mục   | Xác suất | Ảnh hưởng | Mức độ phơi nhiễm | Mức độ     | Biện pháp giảm thiểu                                                                                                  | Kế hoạch dự phòng                                                                                                           | Người phụ trách          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | --------- | ----------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| R01 | Nếu các bên liên quan không xem xét và xác nhận các yêu cầu còn lại đúng thời hạn, nhóm có thể tiếp tục phát triển dựa trên giả định, làm tăng nguy cơ sai lệch yêu cầu.            | Yêu cầu    | 0.6      | 7         | 4.2               | Trung bình | Tổ chức các buổi rà soát định kỳ và duy trì tài liệu phạm vi ngắn gọn, dễ truy vết.                                   | Sử dụng các giả định đã được ghi nhận, đóng băng phạm vi đã xác nhận và chuyển các hạng mục chưa rõ sang các phiên bản sau. | BA / Team Lead           |
| R02 | Nếu giữ quá nhiều chức năng nâng cao trong phiên bản đầu tiên, nhóm có thể không hoàn thành luồng nghiệp vụ cốt lõi trước thời hạn đồ án tốt nghiệp.                                | Phạm vi    | 0.5      | 9         | 4.5               | Trung bình | Tập trung phiên bản đầu tiên vào các chức năng cốt lõi như giám sát, xử lý cảnh báo và quy trình kiểm tra.            | Chuyển các chức năng không cốt lõi sang phiên bản sau và ưu tiên luồng demo hoàn chỉnh.                                     | Project Lead             |
| R03 | Nếu vai trò người dùng và trách nhiệm trong quy trình làm việc không được làm rõ sớm, các quy tắc phân quyền và bàn giao công việc có thể trở nên không nhất quán trong toàn dự án. | Yêu cầu    | 0.5      | 8         | 4.0               | Trung bình | Xác định rõ trách nhiệm của từng vai trò, cách sử dụng hệ thống và nhóm người dùng chính trước khi thiết kế chi tiết. | Đơn giản hóa cấu trúc vai trò cho phiên bản đầu tiên và tập trung quy trình vào các người dùng cốt lõi.                     | BA / Team Lead           |
| R04 | Nếu nhóm không chuẩn bị đủ dữ liệu mẫu thực tế cho tài sản, cảnh báo, sự cố và hồ sơ kiểm tra, các quy trình chính có thể không được trình diễn đầy đủ.                             | Dữ liệu    | 0.6      | 6         | 3.6               | Trung bình | Chuẩn bị dữ liệu mẫu sớm cho từng quy trình cốt lõi và kiểm tra tính phù hợp với các kịch bản nghiệp vụ.              | Tạo dữ liệu demo tối thiểu thủ công và giới hạn phạm vi demo trong các kịch bản đã chuẩn bị.                                | QA / Developer           |
| R05 | Nếu các quy trình cốt lõi mất nhiều thời gian hơn dự kiến để hoàn thành, thời gian dành cho kiểm thử và tài liệu hóa có thể bị rút ngắn gần ngày nộp cuối cùng.                     | Tiến độ    | 0.5      | 8         | 4.0               | Trung bình | Theo dõi tiến độ theo lộ trình phát hành và bảo vệ quỹ thời gian dành cho kiểm thử và tài liệu.                       | Hoãn các tính năng ưu tiên thấp và thu hẹp phạm vi các cải tiến tùy chọn.                                                   | Project Lead             |
| R06 | Nếu các trường hợp kiểm thử không được xây dựng song song với yêu cầu, các lỗi có thể không được phát hiện trước buổi demo cuối cùng.                                               | Kiểm thử   | 0.6      | 7         | 4.2               | Trung bình | Xây dựng test case dựa trên các yêu cầu nghiệp vụ đã xác nhận và cập nhật khi phạm vi thay đổi.                       | Thực hiện kiểm tra thủ công tập trung vào quy trình cốt lõi và loại bỏ các tính năng chưa ổn định khỏi bản demo.            | QA                       |
| R07 | Nếu môi trường dự án không được chuẩn bị sớm cho buổi trình bày cuối cùng, bản demo có thể không ổn định hoặc gặp lỗi khi trình diễn.                                               | Triển khai | 0.4      | 8         | 3.2               | Trung bình | Chuẩn bị môi trường trình bày và danh sách kiểm tra thực thi trước giai đoạn rà soát cuối cùng.                       | Sử dụng phương án demo dự phòng với dữ liệu đã được kiểm chứng và luồng trình bày đơn giản hơn.                             | Project Lead / Presenter |

### 6.4 Nhật ký Vấn đề (Issue Log)

Tại thời điểm lập tài liệu này, **chưa ghi nhận bất kỳ vấn đề đang hoạt động nào**. Nhóm dự án cần tiếp tục theo dõi phạm vi, yêu cầu, công tác chuẩn bị dữ liệu và mức độ sẵn sàng của bản demo trong suốt quá trình phát triển và kiểm thử.

| ID  | Vấn đề                                          | Tác động          | Hành động khắc phục                                                                              | Người phụ trách | Hạn xử lý | Trạng thái    |
| --- | ----------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ | --------------- | --------- | ------------- |
| I01 | Chưa phát hiện vấn đề nào ở giai đoạn hiện tại. | Chưa có tác động. | Tiếp tục theo dõi trong quá trình phát triển, kiểm thử và chuẩn bị cho buổi trình bày cuối cùng. | Project Lead    | N/A       | Đang theo dõi |
