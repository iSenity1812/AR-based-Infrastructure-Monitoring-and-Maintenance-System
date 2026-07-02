## 3. Danh sách Các Bên Liên Quan (Stakeholders Register)

### 3.1 Tổng quan về Các Bên Liên Quan

**Giả định:** Do không có sơ đồ tổ chức chính thức được cung cấp, các nhóm bên liên quan được xác định dựa trên phạm vi đồ án capstone đã mô tả và mô hình vận hành hạ tầng mô phỏng điển hình.

Hệ thống **Giám sát và Bảo trì Hạ tầng bằng AR (AR-Based Infrastructure Monitoring and Maintenance System)** bao gồm cả **người dùng trực tiếp** và **các bên liên quan gián tiếp**.

- **Người dùng trực tiếp** là những người tương tác với hệ thống để giám sát hạ tầng, xử lý cảnh báo, quản lý sự cố và thực hiện kiểm tra bảo trì.
- **Các bên liên quan gián tiếp** là những người xác định yêu cầu, đánh giá, hỗ trợ hoặc chịu ảnh hưởng từ quy trình làm việc, khả năng truy vết và các kết quả vận hành của hệ thống.

Những nhóm bên liên quan quan trọng nhất trong dự án này bao gồm: **Quản trị viên hệ thống (System Administrator), Nhân viên giám sát vận hành (Monitoring Operator), Kỹ thuật viên bảo trì (Maintenance Technician), Giảng viên hướng dẫn (Capstone Supervisor)** và **Người đánh giá học thuật (Academic Evaluator)**.

Ngoài ra, các hệ thống cung cấp dữ liệu bên ngoài và các đối tượng nhận thông báo cũng đóng vai trò quan trọng vì chúng ảnh hưởng đến cách nền tảng tiếp nhận thông tin vận hành và phân phối các cập nhật trong quy trình làm việc.

---

### 3.2 Danh sách Các Bên Liên Quan (Stakeholder Register)

| Bên liên quan / Nhóm                                                             | Phân loại               | Vai trò trong dự án                                                                 | Mức độ ảnh hưởng | Mối quan tâm chính                                                                            |
| -------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| Nhóm dự án                                                                       | Khách hàng              | Xây dựng và triển khai đồ án capstone trong thời gian học thuật cho phép.           | Cao              | Phạm vi khả thi, yêu cầu rõ ràng và trình diễn thành công.                                    |
| Giảng viên hướng dẫn                                                             | Bên liên quan học thuật | Xem xét phạm vi, tiến độ, tài liệu và kết quả cuối cùng.                            | Cao              | Tính rõ ràng của yêu cầu, tính thực tế, tính đầy đủ và chất lượng học thuật.                  |
| Người đánh giá học thuật                                                         | Bên liên quan học thuật | Đánh giá kết quả dự án, phần trình bày và tài liệu.                                 | Cao              | Dự án có thể hiện được bài toán nghiệp vụ, phạm vi và giải pháp một cách nhất quán hay không. |
| Quản trị viên hệ thống                                                           | Người dùng chính        | Quản lý quyền truy cập, thông tin tài sản, giám sát quy trình và cấu hình vận hành. | Cao              | Khả năng kiểm soát, tính nhất quán, khả năng truy vết và quản trị dễ dàng.                    |
| Nhân viên giám sát vận hành                                                      | Người dùng chính        | Xem xét cảnh báo, tạo sự cố, phân công công việc và theo dõi tiến độ xử lý.         | Cao              | Xử lý nhanh, hiển thị trạng thái rõ ràng và giảm thao tác thủ công.                           |
| Kỹ thuật viên bảo trì                                                            | Người dùng chính        | Kiểm tra tài sản, thực hiện bảo trì và gửi kết quả xử lý.                           | Cao              | Nhận diện chính xác tài sản, hướng dẫn rõ ràng và gửi kết quả thuận tiện.                     |
| Trưởng bộ phận vận hành trung tâm dữ liệu (Hiện tại gộp vào Monitoring Operator) | Quản lý                 | Đại diện góc nhìn vận hành và quan tâm đến khả năng giám sát quy trình.             | Trung bình       | Chất lượng giám sát, tiến độ xử lý và trách nhiệm vận hành.                                   |
| Nhân viên hỗ trợ hiện trường tương lai (chưa triển khai)                         | Người dùng phụ          | Có thể sử dụng hệ thống trong tương lai cho các nhiệm vụ bảo trì mở rộng.           | Thấp             | Quy trình kiểm tra đơn giản và truy cập dễ dàng vào thông tin liên quan.                      |
| Người nhận thông báo vận hành                                                    | Bên liên quan hỗ trợ    | Nhận các thông báo cập nhật về quy trình xử lý và công việc.                        | Trung bình       | Nhận được thông tin kịp thời và dễ hiểu về sự cố hoặc kết quả kiểm tra.                       |
| Bộ thu thập dữ liệu Telemetry                                                    | Hệ thống bên ngoài      | Cung cấp thông tin trạng thái vận hành cho quy trình giám sát.                      | Trung bình       | Tiếp nhận dữ liệu đáng tin cậy và xử lý rõ ràng các thông tin được gửi đến.                   |
| Hệ thống tạo dữ liệu mô phỏng                                                    | Hệ thống bên ngoài      | Tạo các sự kiện mô phỏng phục vụ kiểm thử kịch bản và trình diễn.                   | Trung bình       | Thực thi kịch bản có kiểm soát và phản hồi quy trình dự đoán được.                            |
| Kênh thông báo vận hành                                                          | Hệ thống bên ngoài      | Chuyển các thông điệp vận hành đến các bên liên quan phù hợp.                       | Thấp             | Gửi thông báo rõ ràng, kịp thời và nhất quán.                                                 |

---

### 3.3 Phân cấp Các Bên Liên Quan

| Cấp độ                       | Mô tả                                                                                          | Ví dụ trong dự án                                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Stakeholder (Bên liên quan)  | Bất kỳ cá nhân, nhóm hoặc hệ thống nào ảnh hưởng, sử dụng, hỗ trợ hoặc bị ảnh hưởng bởi dự án. | Nhóm dự án, giảng viên hướng dẫn, người đánh giá, người dùng, nguồn dữ liệu bên ngoài, người nhận thông báo. |
| Customer (Khách hàng)        | Nhóm sở hữu, yêu cầu, tài trợ hoặc nhận giá trị chính từ dự án.                                | Nhóm dự án và giảng viên hướng dẫn trong vai trò triển khai và phê duyệt dự án.                              |
| User (Người dùng)            | Người trực tiếp tương tác với hệ thống.                                                        | Quản trị viên hệ thống, Nhân viên giám sát vận hành, Kỹ thuật viên bảo trì.                                  |
| User Class (Nhóm người dùng) | Tập hợp những người dùng có mục tiêu, trách nhiệm hoặc cách sử dụng tương tự nhau.             | Nhóm quản trị viên, nhóm giám sát vận hành, nhóm kỹ thuật viên bảo trì.                                      |

---

### 3.4 Các Nhóm Người Dùng (User Classes)

| Nhóm người dùng                           | Mô tả                                                                           | Tần suất sử dụng  | Trình độ kỹ năng | Nhu cầu chính                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ----------------- | ---------------- | --------------------------------------------------------------------------------------- |
| Quản trị viên hệ thống                    | Giám sát quyền truy cập, cấu hình vận hành và kiểm soát quy trình.              | Trung bình        | Trung bình - Cao | Quản lý quyền truy cập, giám sát cấu hình, khả năng truy vết và tầm nhìn toàn hệ thống. |
| Nhân viên giám sát vận hành               | Xử lý cảnh báo hàng ngày, tạo sự cố, phân công công việc và theo dõi quy trình. | Cao               | Trung bình       | Xem trạng thái nhanh, xử lý cảnh báo rõ ràng và phối hợp quy trình hiệu quả.            |
| Kỹ thuật viên bảo trì                     | Thực hiện kiểm tra và gửi kết quả sau khi xem xét thông tin tài sản.            | Cao               | Trung bình       | Nhận diện đúng tài sản, có đủ thông tin ngữ cảnh và gửi kết quả dễ dàng.                |
| Trưởng bộ phận vận hành trung tâm dữ liệu | Theo dõi tiến độ vận hành và khả năng giám sát quá trình xử lý.                 | Thấp - Trung bình | Trung bình       | Báo cáo tổng quan, theo dõi tiến độ và thông tin trách nhiệm xử lý.                     |
| Giảng viên hướng dẫn / Người đánh giá     | Đánh giá phạm vi dự án, tính đầy đủ và chất lượng trình bày.                    | Thấp              | Cao              | Tài liệu rõ ràng, phạm vi thực tế và quy trình nghiệp vụ nhất quán.                     |

---

### 3.5 Nhóm Người Dùng Ưu Tiên (Favored User Class)

Nhóm người dùng được ưu tiên cho phiên bản phát hành đầu tiên là **Nhân viên giám sát vận hành (Monitoring Operator)**, vì đây là vai trò gắn liền nhất với quy trình vận hành cốt lõi của hệ thống: xem xét cảnh báo, tạo sự cố, phân công công việc và điều phối việc bàn giao cho bộ phận bảo trì.

Việc ưu tiên nhóm người dùng này giúp đảm bảo phiên bản đầu tiên giải quyết được nhu cầu vận hành quan trọng và thường xuyên nhất của dự án.

---

### 3.6 Hồ sơ Người dùng Đại diện (Personas)

#### Persona 1: Minh — Nhân viên Giám sát Vận hành

- **Vai trò:** Xem xét cảnh báo, điều phối xử lý sự cố và phân công công việc.
- **Trình độ kỹ thuật:** Trung bình.
- **Tần suất sử dụng:** Cao.

**Mục tiêu:**

- Nhanh chóng xác định các vấn đề khẩn cấp.
- Tạo và theo dõi sự cố mà không làm mất ngữ cảnh.
- Chuyển giao công việc cho bộ phận bảo trì với hướng dẫn rõ ràng.

**Khó khăn:**

- Thông tin cảnh báo và sự cố thường bị phân tán.
- Khó theo dõi trạng thái xử lý một cách nhất quán.
- Việc điều phối thủ công tốn thời gian khi có nhiều sự cố cùng lúc.

**Nhu cầu chính:**

- Xem xét cảnh báo nhanh chóng.
- Trạng thái sự cố và phiếu xử lý rõ ràng.
- Dễ dàng chuyển giao công việc cho bộ phận bảo trì.

---

#### Persona 2: Lan — Kỹ thuật viên Bảo trì

- **Vai trò:** Kiểm tra tài sản bị ảnh hưởng và gửi kết quả xử lý.
- **Trình độ kỹ thuật:** Trung bình.
- **Tần suất sử dụng:** Cao.

**Mục tiêu:**

- Xác nhận đúng tài sản trước khi kiểm tra.
- Hiểu rõ bối cảnh vận hành hiện tại.
- Gửi kết quả kiểm tra nhanh chóng và chính xác.

**Khó khăn:**

- Thông tin ngữ cảnh về tài sản có thể chưa đầy đủ khi nhận nhiệm vụ.
- Hướng dẫn kiểm tra đôi khi khó theo dõi.
- Kết quả xử lý khó truy vết sau khi gửi.

**Nhu cầu chính:**

- Nhận diện tài sản chính xác.
- Tập trung toàn bộ thông tin liên quan tại một nơi.
- Gửi kết quả kiểm tra đơn giản và thuận tiện.

---

#### Persona 3: Huy — Quản trị viên Hệ thống

- **Vai trò:** Quản lý quyền truy cập, giám sát và cấu hình vận hành.
- **Trình độ kỹ thuật:** Trung bình - Cao.
- **Tần suất sử dụng:** Trung bình.

**Mục tiêu:**

- Kiểm soát quyền truy cập của người dùng.
- Duy trì tính nhất quán của dữ liệu tài sản.
- Kiểm tra khả năng truy vết quy trình khi cần thiết.

**Khó khăn:**

- Thông tin vận hành phân tán gây khó khăn cho việc kiểm tra và đánh giá.
- Việc phối hợp thủ công làm giảm hiệu quả giám sát.
- Sự không thống nhất giữa các vai trò có thể gây nhầm lẫn.

**Nhu cầu chính:**

- Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC).
- Giao diện quản lý có cấu trúc rõ ràng.
- Hỗ trợ kiểm toán và truy vết quy trình.
