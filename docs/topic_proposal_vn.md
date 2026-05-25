## Thiết kế và phát triển nền tảng giám sát và bảo trì hạ tầng dựa trên thực tế tăng cường với phân tích hỗ trợ bởi AI cho môi trường trung tâm dữ liệu mô phỏng

---

## Thông tin nhóm

Học kỳ: SU26
Lớp: SE1823
Môn học: WDP301
Nhóm: 09
Thành viên: Phan Vo Duc Huy, Nguyen Khanh Ngan, Le Tran Anh Duy

---

## 1. Tên đề tài đề xuất

Thiết kế và phát triển nền tảng giám sát và bảo trì hạ tầng dựa trên thực tế tăng cường với phân tích hỗ trợ bởi AI cho môi trường trung tâm dữ liệu mô phỏng

## 2. Lĩnh vực ứng dụng

Hệ thống được đề xuất thuộc các lĩnh vực:

- Thực tế tăng cường cho giám sát và bảo trì hạ tầng
- Giám sát hạ tầng thời gian thực
- Trí tuệ nhân tạo cho vận hành CNTT (AIOps)
- Phân tích dữ liệu luồng
- Hệ thống phân tán và khả năng quan sát hệ thống
- Học máy cho phân tích chuỗi thời gian
- Tương tác người - AI trong hỗ trợ kỹ thuật hiện trường

Đề tài được định vị là một proof-of-concept (PoC) cho môi trường trung tâm dữ liệu mô phỏng thay vì một nền tảng sẵn sàng triển khai trong doanh nghiệp. Thay vì vận hành trên hạ tầng công nghiệp thực, hệ thống sử dụng các dịch vụ container hóa dựa trên Docker để mô phỏng các node máy chủ, workload và các sự kiện hạ tầng. Môi trường mô phỏng này cho phép nghiên cứu khảo sát liệu Thực tế tăng cường có thể đóng vai trò như một giao diện vận hành hiệu quả cho bài toán giám sát và bảo trì hạ tầng hay không, đồng thời Trí tuệ nhân tạo có thể hoạt động như một lớp mở rộng phân tích phục vụ diễn giải bất thường và hỗ trợ dự đoán.

## 3. Phát biểu vấn đề

Giám sát và bảo trì trung tâm dữ liệu bao gồm cả khả năng quan sát số của hệ thống lẫn nhận thức vận hành trong không gian vật lý. Trong thực tế, người vận hành hạ tầng cần kiểm tra mức sử dụng tài nguyên, phát hiện hành vi bất thường, xác định node bị ảnh hưởng và thực hiện các thao tác bảo trì dựa trên ngữ cảnh hệ thống. Tuy nhiên, các cách tiếp cận giám sát truyền thống thường tập trung vào dashboard, log và giao diện cảnh báo tĩnh, từ đó tách rời thông tin hạ tầng ảo khỏi không gian bảo trì vật lý.

Sự tách biệt này tạo ra một số hạn chế:

- Người vận hành phải tự ánh xạ các chỉ số ảo sang các thành phần hạ tầng vật lý
- Dashboard cảnh báo cung cấp ít ngữ cảnh không gian cho các tác vụ bảo trì tại chỗ
- Cảnh báo dựa trên luật có thể tạo ra nhiều dương tính giả và hỗ trợ ra quyết định còn hạn chế
- Giao diện truyền thống phù hợp với giám sát tập trung nhưng kém trực quan hơn cho quy trình kiểm tra và bảo trì vật lý
- Các giải pháp cấp doanh nghiệp hiện có thường quá phức tạp, tốn kém hoặc bị ràng buộc vận hành nên khó có thể tái hiện một cách thực tế trong một dự án học thuật

Vì vậy, đề tài này không nhằm tái tạo một hệ thống quản lý trung tâm dữ liệu doanh nghiệp thực tế. Thay vào đó, đề tài đề xuất một nền tảng proof-of-concept để kiểm chứng tính khả thi của việc kết hợp Thực tế tăng cường và phân tích hỗ trợ bởi AI trong bối cảnh trung tâm dữ liệu mô phỏng. Mục tiêu cốt lõi là chứng minh rằng AR có thể thu hẹp khoảng cách giữa hoạt động bảo trì vật lý và dữ liệu telemetry hạ tầng, trong khi AI có thể tăng cường hệ thống thông qua phát hiện bất thường và cung cấp insight dự đoán.

## 4. Người dùng mục tiêu

- Quản trị viên CNTT: Chịu trách nhiệm giám sát tập trung, xem xét telemetry, theo dõi cảnh báo và quản lý trạng thái hạ tầng từ dashboard web.
- Kỹ sư NOC: Chịu trách nhiệm quan sát hành vi hạ tầng theo thời gian thực, xác thực các sự kiện bất thường và phân loại vận hành.
- Kỹ thuật viên bảo trì: Chịu trách nhiệm kiểm tra tại chỗ hoặc trong bối cảnh mô phỏng bằng giao diện AR để nhận diện node, kiểm tra trạng thái, xem log và làm theo hướng dẫn bảo trì theo ngữ cảnh.

## 5. Động lực nghiên cứu cho việc tích hợp AI

Động lực nghiên cứu chủ yếu xuất phát từ nhu cầu khám phá các cách tiếp cận trực quan và có ngữ cảnh hơn cho giám sát và bảo trì hạ tầng. Trong đề tài này, Thực tế tăng cường là lớp tương tác cốt lõi, còn Trí tuệ nhân tạo được đưa vào như một phần mở rộng nhằm tăng cường năng lực phân tích và giá trị nghiên cứu.

##### 5.1 Độ phức tạp của telemetry hạ tầng:

Ngay cả trong môi trường trung tâm dữ liệu mô phỏng, các node hạ tầng và dịch vụ container hóa vẫn liên tục tạo ra telemetry đa biến như mức sử dụng CPU, mức tiêu thụ bộ nhớ, hoạt động mạng, sử dụng lưu trữ và thay đổi trạng thái container. Các tín hiệu này biến đổi theo thời gian và có thể hình thành các mẫu khó diễn giải nếu chỉ dựa vào ngưỡng cố định hoặc quan sát thủ công.

##### 5.2 Thực tế tăng cường như một giao diện vận hành

Dashboard truyền thống hiệu quả cho giám sát tập trung, nhưng không tự nhiên kết nối dữ liệu hạ tầng với bối cảnh bảo trì vật lý. Thực tế tăng cường có thể giảm khoảng cách này bằng cách chồng lớp thông tin vận hành trực tiếp lên các rack máy chủ mô phỏng hoặc các biểu diễn node thông qua cơ chế neo không gian dựa trên marker. Điều này tạo ra quy trình bảo trì trực quan hơn, nơi người dùng có thể kiểm tra trạng thái hạ tầng ngay tại chỗ thay vì phải liên tục chuyển đổi giữa tài sản vật lý và dashboard từ xa.

##### 5.3 Phát hiện bất thường thông minh theo thời gian thực

Khi telemetry được thu thập liên tục từ môi trường mô phỏng, các mô hình AI có thể được sử dụng để học các mẫu vận hành bình thường và xác định hành vi bất thường vượt ra ngoài các vi phạm ngưỡng đơn giản. Điều này mang lại giá trị nghiên cứu bằng cách chuyển hệ thống từ mức giám sát thuần hiển thị sang mức hỗ trợ thông minh.

##### 5.4 Hỗ trợ dự đoán cho quyết định bảo trì:

Ngoài phát hiện bất thường, một số mô hình AI được chọn có thể được dùng để ước lượng xu hướng rủi ro hoặc các mẫu suy giảm tiềm ẩn từ chuỗi telemetry. Trong đề tài này, khả năng dự đoán như vậy được xem là một phần mở rộng nâng cao chứ không phải tính năng lõi bắt buộc. Mục đích của nó là chứng minh cách AI có thể tiếp tục hỗ trợ lập kế hoạch bảo trì khi được tích hợp với quy trình vận hành dựa trên AR.

## 6. Các mô hình AI đề xuất

##### 6.1 Phát hiện bất thường

- Isolation Forest: Được đề xuất như baseline nhẹ chính cho phát hiện bất thường không giám sát trên telemetry đa biến. Mô hình này hiệu quả về tính toán và phù hợp với thực nghiệm proof-of-concept ở mức chỉ số container và node.

- LSTM Autoencoder: Được đề xuất như một mô hình phát hiện bất thường theo thời gian để học hành vi telemetry tuần tự và tái dựng các mẫu vận hành bình thường. Mô hình này phù hợp khi nghiên cứu cần so sánh giữa phát hiện không giám sát truyền thống và cách tiếp cận học sâu theo thời gian.

- Mô hình chuỗi thời gian dựa trên Transformer: Được xem là một lựa chọn thăm dò nâng cao cho việc mô hình hóa các phụ thuộc thời gian dài hơn. Mô hình này được đưa vào như một phần mở rộng nghiên cứu và không bắt buộc trong proof-of-concept khả thi tối thiểu.

##### 6.2 Bảo trì dự đoán

- Mô hình dự báo LSTM: Được đề xuất để dự báo xu hướng sức khỏe hạ tầng ngắn hạn như CPU, bộ nhớ hoặc lưu trữ theo thời gian trong môi trường mô phỏng.

- Mô hình ước lượng Remaining Useful Life (RUL): Được xem là một phần mở rộng mang tính khái niệm nhằm ước lượng xu hướng suy giảm hoặc khả năng lỗi. Trong bối cảnh của đề tài này, mô hình có thể được điều chỉnh để phản ánh sức khỏe dịch vụ hoặc node mô phỏng thay vì tuổi thọ phần cứng theo nghĩa đen.

- Temporal Fusion Transformer (TFT): Được xem xét cho phân tích dự đoán nâng cao trên các luồng telemetry đa biến. Tương tự mô hình anomaly dựa trên Transformer, lựa chọn này mang tính nghiên cứu mở rộng hơn là thành phần bắt buộc của bản triển khai nền tảng.

##### 6.3 Thực tế tăng cường và điện toán không gian

- Neo không gian dựa trên ID (WebAR + ArUco/QR Markers): Phân hệ AR sử dụng cơ chế neo không gian nhẹ dựa trên marker để liên kết các rack mô phỏng, node hoặc biểu diễn máy chủ với dữ liệu telemetry tương ứng. Cách tiếp cận này được lựa chọn có chủ đích thay vì dùng nhận dạng đối tượng tốn tài nguyên nhằm giữ cho proof-of-concept vừa khả thi về kỹ thuật vừa phù hợp về phạm vi học thuật.

- Biến đổi ma trận (Relative Offset): Phép biến đổi không gian được sử dụng để tính toán vị trí và hướng tương đối giữa camera và từng marker, từ đó các lớp phủ thông tin 2D có thể được hiển thị ổn định trên đúng thành phần hạ tầng tương ứng.

## 7. Hệ thống cốt lõi

##### 7.1 Phạm vi dashboard ứng dụng web (Trung tâm điều hành tập trung):

- Trực quan hóa telemetry thời gian thực: Dashboard tập trung trình bày telemetry ở mức node và container từ môi trường trung tâm dữ liệu mô phỏng, bao gồm CPU, bộ nhớ, hoạt động mạng và trạng thái dịch vụ.

- Quản lý trạng thái hạ tầng và cảnh báo: Dashboard cho phép quản trị viên và người vận hành xem xét tình trạng sức khỏe, kiểm tra các bất thường được phát hiện và theo dõi các sự kiện hạ tầng phát sinh từ mô phỏng.

- Góc nhìn ánh xạ cụm hoặc rack: Một module ánh xạ trực quan biểu diễn mối quan hệ giữa rack mô phỏng, node, container và định danh marker để giao diện AR có thể truy xuất đúng dữ liệu theo ngữ cảnh.

- Điều phối sự cố và bảo trì: Dashboard cung cấp một quy trình sự cố đơn giản để theo dõi các node bất thường, gán trạng thái kiểm tra và đồng bộ thông tin liên quan đến bảo trì với frontend AR.

##### 7.2 Phạm vi AR:

- Nhận diện và đăng ký thiết bị thông qua spatial anchors

- Ánh xạ ảo - vật lý: Các lớp phủ AR dựa trên marker hiển thị định danh node, trạng thái dịch vụ, workload đang hoạt động và tóm tắt sức khỏe trực tiếp trên các rack mô phỏng hoặc biểu diễn máy chủ.

- Trực quan hóa bảo trì theo ngữ cảnh: Giao diện AR làm nổi bật các node bất thường và trình bày các chỉ báo cảnh báo, tóm tắt trạng thái và ghi chú vận hành theo ngữ cảnh.

- Kiểm tra log và trạng thái tại chỗ: Người dùng có thể kích hoạt các thao tác nhẹ như xem log gần đây, kiểm tra sức khỏe dịch vụ hoặc đọc ghi chú bảo trì trực tiếp từ cảnh AR.

- Hỗ trợ bảo trì có hướng dẫn: Ứng dụng AR cung cấp các chỉ dẫn theo ngữ cảnh cho việc kiểm tra hoặc xử lý, chẳng hạn như kiểm tra tình huống quá nhiệt mô phỏng, khởi động lại dịch vụ lỗi hoặc xác minh trạng thái triển khai container.

- Tích hợp hệ thống ticket: Frontend AR có thể tương tác với các hành động quy trình bảo trì giới hạn như acknowledge, in progress, escalated và resolved.

##### 7.3 Phạm vi AI và backend:

- Mô phỏng trung tâm dữ liệu và thu thập telemetry: Môi trường backend mô phỏng rack, node và dịch vụ bằng Docker containers. Một bộ thu thập telemetry tùy chỉnh liên tục thu thập metadata hệ thống và container rồi truyền chúng đến backend để trực quan hóa và phân tích.

- Pipeline giám sát thời gian thực: Telemetry đầu vào được xử lý để phục vụ hiển thị, ghi log và chấm điểm bất thường. Pipeline này hỗ trợ cả logic ngưỡng cơ bản lẫn cơ chế phát hiện có hỗ trợ bởi AI.

- Lớp phân tích hỗ trợ bởi AI: Các mô hình phát hiện bất thường hoặc dự đoán được chọn sẽ được tích hợp như một lớp phân tích bổ sung nhằm làm giàu dashboard và giao diện AR bằng điểm bất thường, chỉ báo cảnh báo hoặc insight rủi ro đơn giản.

## 8. Kết quả kỳ vọng

Các đóng góp nghiên cứu kỳ vọng bao gồm:

- Một kiến trúc proof-of-concept cho giám sát và bảo trì hạ tầng dựa trên AR trong môi trường trung tâm dữ liệu mô phỏng.

- Một minh chứng thực tiễn cho cách Thực tế tăng cường dựa trên marker có thể kết nối telemetry hạ tầng với bối cảnh bảo trì vật lý.

- Một đánh giá về phát hiện bất thường hoặc phân tích dự đoán có hỗ trợ bởi AI như phần mở rộng của quy trình giám sát lấy AR làm trung tâm.

- Một quy trình tương tác tích hợp giữa con người và hệ thống, kết hợp giám sát qua dashboard, kiểm tra bằng AR và hỗ trợ ra quyết định có AI tùy chọn.

- Một nghiên cứu tính khả thi cho thấy tiềm năng của việc kết hợp AR và AI trong các hướng nghiên cứu tương lai về bảo trì hạ tầng và observability, mà không khẳng định sẵn sàng triển khai trực tiếp ở môi trường doanh nghiệp.
