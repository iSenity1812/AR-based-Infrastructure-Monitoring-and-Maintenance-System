## 2. Problem Statement

### 2.1 Background

Trong môi trường trung tâm dữ liệu, việc giám sát và bảo trì hạ tầng không chỉ là theo dõi trạng thái tài sản mà còn là quá trình kết hợp giữa quan sát vận hành, xác định nguyên nhân sự cố, ghi nhận lịch sử xử lý và thực hiện kiểm tra tại chỗ. Nhiều vai trò cùng tham gia vào quy trình này, bao gồm quản trị viên hệ thống, nhân viên vận hành và kỹ thuật viên bảo trì.

Mỗi nhóm người dùng có nhu cầu khác nhau nhưng lại cần cùng nhìn về một bức tranh vận hành thống nhất. Quản trị viên cần theo dõi tổng quan và kiểm soát truy cập, nhân viên vận hành cần xử lý cảnh báo và điều phối sự cố, còn kỹ thuật viên bảo trì cần truy cập đúng ngữ cảnh của tài sản để kiểm tra và ghi nhận kết quả. Vì vậy, bài toán của dự án không chỉ là hiển thị thông tin, mà còn là tổ chức lại luồng xử lý để các bên liên quan có thể làm việc trên cùng một ngữ cảnh vận hành.

### 2.2 Current Situation

Trong trạng thái hiện tại của quá trình vận hành thông thường, thông tin liên quan đến một tài sản thường bị chia tách thành nhiều nhóm: trạng thái hoạt động, cảnh báo, lịch sử sự cố, ghi chú xử lý, kết quả kiểm tra và thông tin định danh tài sản. Khi các thông tin này không nằm trong một luồng làm việc thống nhất, người dùng phải tự tra cứu, đối chiếu và tổng hợp thủ công trước khi đưa ra quyết định.

Nhân viên vận hành thường phải theo dõi trạng thái hạ tầng, xem danh sách cảnh báo, đối chiếu với lịch sử gần nhất rồi mới quyết định có mở sự cố hay không. Sau đó, nếu cần xử lý tại hiện trường, thông tin này lại phải được chuyển tiếp cho kỹ thuật viên bảo trì để kiểm tra tiếp. Ở chiều ngược lại, kỹ thuật viên khi tiếp cận một tài sản cũng cần biết tài sản đó đang có vấn đề gì, đã từng xảy ra sự cố nào, và cần lưu ý những chỉ dẫn nào trong quá trình kiểm tra.

Cách làm này tạo ra một quy trình phụ thuộc nhiều vào thao tác thủ công, trao đổi rời rạc và đối chiếu nhiều nguồn thông tin khác nhau. Điều đó làm cho việc theo dõi trạng thái, chuyển giao trách nhiệm và ghi nhận kết quả trở nên tốn thời gian hơn cần thiết.

### 2.3 Business Problem

Vấn đề chính là quy trình giám sát và bảo trì hạ tầng đang bị phân mảnh, khiến người dùng khó có được ngữ cảnh đầy đủ tại đúng thời điểm cần ra quyết định.

Nguyên nhân cốt lõi của vấn đề gồm:

- Thông tin vận hành của cùng một tài sản bị chia thành nhiều nhóm nội dung khác nhau.
- Cảnh báo, sự cố và kết quả kiểm tra chưa luôn được gắn kết thành một chuỗi xử lý rõ ràng.
- Kỹ thuật viên bảo trì phải tự tìm lại ngữ cảnh của tài sản thay vì được cung cấp sẵn thông tin liên quan.
- Người vận hành phải tốn thời gian tổng hợp dữ liệu trước khi chuyển giao cho bước xử lý tiếp theo.

Tác động của vấn đề này thể hiện ở nhiều mặt:

- Tốn thời gian khi tra cứu và tổng hợp thông tin.
- Dễ bỏ sót ngữ cảnh quan trọng khi xử lý cảnh báo hoặc kiểm tra tài sản.
- Khó theo dõi tiến độ từ cảnh báo đến sự cố đến ticket đến kết quả kiểm tra.
- Tăng nguy cơ ghi nhận thiếu nhất quán giữa các vai trò.
- Làm giảm khả năng truy vết và đánh giá lại quá trình xử lý sau này.

Nếu vấn đề này không được giải quyết, quy trình vận hành sẽ tiếp tục phụ thuộc nhiều vào trí nhớ, trao đổi thủ công và kinh nghiệm cá nhân. Điều này khiến việc giám sát, phản ứng và bảo trì khó đạt được tính nhất quán và minh bạch cần thiết trong một môi trường có nhiều thành phần cần theo dõi đồng thời.

### 2.4 Business Opportunity

Từ vấn đề trên, có một cơ hội rõ ràng để xây dựng một nền tảng giúp hợp nhất ngữ cảnh vận hành và tổ chức lại quy trình giám sát - bảo trì theo hướng mạch lạc hơn.

Nếu có một hệ thống có thể tập trung trạng thái tài sản, cảnh báo, lịch sử sự cố và kết quả kiểm tra vào cùng một luồng làm việc, người dùng sẽ:

- nhìn thấy tình trạng tài sản nhanh hơn
- giảm thao tác tra cứu lặp lại
- chuyển giao công việc rõ ràng hơn giữa các vai trò
- kiểm tra và xác nhận kết quả bảo trì dễ hơn
- theo dõi được toàn bộ quá trình xử lý một cách nhất quán

Về mặt nghiệp vụ, cơ hội của dự án là biến hoạt động giám sát và bảo trì vốn rời rạc thành một quy trình có ngữ cảnh, có thể theo dõi, có thể kiểm tra lại và có thể trình diễn rõ ràng trong môi trường.

### 2.5 Problem-to-Objective Mapping

| Business Problem                                         | Business Objective                                   | Related Features                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Thông tin vận hành của tài sản bị chia tách ở nhiều nơi  | Centralize infrastructure monitoring information     | Xem trạng thái tài sản, cảnh báo liên quan, lịch sử vận hành gần nhất              |
| Người dùng phải tự đối chiếu nhiều nguồn trước khi xử lý | Support role-based operational workflows             | Phân quyền theo vai trò, luồng làm việc riêng cho quản trị viên, vận hành, bảo trì |
| Từ cảnh báo đến xử lý sự cố còn nhiều bước thủ công      | Reduce manual effort in issue handling               | Xem cảnh báo, mở sự cố, giao ticket, theo dõi trạng thái xử lý                     |
| Kỹ thuật viên cần đúng ngữ cảnh của tài sản khi kiểm tra | Improve maintenance accuracy                         | Nhận diện tài sản, xem thông tin liên quan, ghi nhận kết quả kiểm tra              |
| Quy trình cần phù hợp cho demo và đánh giá capstone      | Provide a realistic proof-of-concept                 | Luồng từ giám sát đến xử lý đến kiểm tra hiện trường trong một kịch bản hoàn chỉnh |
| Cần khả năng truy vết và báo cáo sau xử lý               | Support basic operational reporting and traceability | Nhật ký thao tác, lịch sử kiểm tra, trạng thái workflow                            |
