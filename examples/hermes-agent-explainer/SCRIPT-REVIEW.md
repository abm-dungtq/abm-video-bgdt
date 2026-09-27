# Kịch bản duyệt — Hermes Agent – từ cơ bản đến nâng cao

Giọng: Thanh Bình · Tổng ước tính: 10:04 (604 s) · 63 khung hình · 2023 âm tiết

## Mở đầu  _(≈ 39 s · basic)_

**[01] Hermes Agent – từ cơ bản đến nâng cao** — _title_  
Chào mừng bạn đến với bài học về Hermes Agent.

**[02] Một trợ lý biết tự học** — _kinetic_  
Hãy tưởng tượng bạn có một trợ lý không bao giờ quên. Mỗi lần làm xong một việc khó, nó tự rút ra kinh nghiệm cho lần sau. Đó chính là Hermes Agent, do Nous Research tạo ra. <sub>F-04, F-01</sub>

**[03] Miễn phí và chạy ở đâu cũng được** — _stat_  
Hermes là phần mềm mã nguồn mở, theo giấy phép MIT. Bạn có thể chạy nó trên máy tính cá nhân, một máy chủ năm đô la, hay trên đám mây. Và Hermes không thu thập dữ liệu sử dụng của bạn. <sub>F-02, F-06, F-88</sub>

**[04] Sau bài học này** — _anchor_  
Sau mười phút, bạn sẽ hiểu agent là gì và khác chatbot ra sao. Bạn sẽ biết cách cài đặt, trò chuyện, và dạy Hermes tự học. Và bạn sẽ nắm được những điểm nổi bật nâng cao của nó.

## Agent là gì?  _(≈ 70 s · basic)_

**[05] Agent là gì?** — _title_  
Chương một: agent là gì?

**[06] Chatbot chỉ trả lời** — _split_  
Một chatbot thông thường chỉ biết trả lời câu hỏi của bạn. Bạn hỏi, nó đáp, rồi dừng lại ở đó. Mọi việc còn lại, bạn vẫn phải tự làm. Nó không tự mở file, không tự tìm kiếm, cũng không tự kiểm tra kết quả.

**[07] Agent thì bắt tay vào làm** — _metaphor_  
Còn agent thì khác: nó bắt tay vào làm việc. Giống như một người trợ lý thật, nó có công cụ trong tay. Hermes có sẵn hơn sáu mươi công cụ, từ đọc file đến tìm kiếm trên mạng. <sub>F-29, F-30</sub>

**[08] Vòng lặp của một agent** — _flow_  
Mỗi agent làm việc theo một vòng lặp đơn giản. Đầu tiên, nó suy nghĩ xem cần làm gì. Sau đó, nó hành động bằng một công cụ. Rồi nó quan sát kết quả, và lặp lại cho đến khi xong việc. Nhờ vòng lặp này, agent có thể tự sửa sai khi gặp kết quả bất ngờ.

**[09] Một ví dụ đời thường** — _typewriter_  
Ví dụ, bạn nhờ nó tóm tắt tin tức AI hôm nay. Agent sẽ tự tìm kiếm, đọc từng bài, rồi viết bản tóm tắt. Bạn chỉ cần giao việc, không cần chỉ từng bước. Nếu một trang web không mở được, nó sẽ thử nguồn khác.

**[10] Hermes không chỉ là chatbot** — _zoom_  
Tài liệu của Hermes nói rõ: đây không phải một chatbot bọc quanh một API. Nó là một agent tự chủ, càng chạy lâu càng giỏi hơn. <sub>F-08</sub>

**[11] Tóm tắt chương một** — _anchor_  
Tóm lại: chatbot trả lời, còn agent làm việc.

## Cài đặt và trò chuyện đầu tiên  _(≈ 101 s · basic)_

**[12] Cài đặt và trò chuyện đầu tiên** — _title_  
Chương hai: cài đặt và trò chuyện đầu tiên.

**[13] Một dòng lệnh là xong** — _terminal_  
Cài Hermes chỉ cần một dòng lệnh. Trên Windows, bạn mở PowerShell và dán lệnh cài đặt vào. Trên Linux hay macOS, bạn dùng lệnh curl tương tự. Sau vài phút, lệnh hermes đã sẵn sàng trên máy của bạn. <sub>F-13, F-14, F-15</sub>

**[14] Cách nhanh nhất cho người mới** — _journey_  
Cách nhanh nhất cho người mới là lệnh hermes setup. Trình thiết lập có ba lựa chọn: cài nhanh với Nous Portal, cài đầy đủ, hoặc bắt đầu trống. Với Nous Portal, bạn có hơn ba trăm mô hình trong một gói đăng ký. <sub>F-21, F-20</sub>

**[15] Trình cài đặt lo hết** — _cards_  
Trình cài đặt tự chuẩn bị mọi thứ cần thiết. Python, Node, Git và các công cụ khác đều được cài sẵn, không cần quyền quản trị. Bạn không phải tự cài từng thứ một, rất phù hợp cho người mới. <sub>F-28</sub>

**[16] Chọn bộ não cho Hermes** — _terminal_  
Tiếp theo, bạn gõ hermes model để chọn mô hình AI. Hermes dùng được rất nhiều nhà cung cấp, như OpenRouter, Anthropic hay Nous Portal. Muốn đổi mô hình, bạn không cần sửa code. Bạn có thể đổi bất cứ lúc nào, không bị ràng buộc vào một hãng nào. <sub>F-18, F-25, F-07</sub>

**[17] Lưu ý về bộ nhớ ngữ cảnh** — _stat_  
Một lưu ý nhỏ: mô hình cần ngữ cảnh ít nhất sáu mươi tư nghìn token. Mô hình nhỏ hơn sẽ bị từ chối ngay khi khởi động. Vì vậy, hãy chọn mô hình có ngữ cảnh đủ lớn ngay từ đầu. <sub>F-17</sub>

**[18] Hai giao diện dòng lệnh** — _split_  
Sau đó, chỉ cần gõ hermes là bắt đầu trò chuyện. Nếu thích giao diện hiện đại hơn, bạn thêm tùy chọn tui. Cả hai đều tự động gợi ý lệnh khi bạn gõ dấu gạch chéo. Muốn tiếp tục cuộc trò chuyện hôm trước, bạn thêm tùy chọn continue. <sub>F-23, F-27, F-24</sub>

**[19] Thanh trạng thái** — _zoom_  
Ở dưới màn hình, thanh trạng thái cho bạn biết mô hình đang dùng. Nó còn hiện số token, mức đầy của ngữ cảnh, và chi phí ước tính. <sub>F-26</sub>

**[20] Khóa bí mật và cài đặt** — _split_  
Các khóa bí mật, như khóa API, được lưu riêng trong tệp env. Còn các cài đặt thông thường nằm trong tệp config. <sub>F-22</sub>

**[21] Tóm tắt chương hai** — _anchor_  
Nhớ nhé: cài đặt, chọn mô hình, rồi trò chuyện.

## Công cụ và bộ công cụ  _(≈ 64 s · basic)_

**[22] Công cụ và bộ công cụ** — _title_  
Chương ba: công cụ và bộ công cụ.

**[23] Những công cụ quen thuộc** — _cards_  
Công cụ là đôi tay của agent. Hermes có công cụ để đọc và ghi file, chạy lệnh trong terminal, và duyệt web. Nó còn có thể tạo ảnh, đọc ảnh, và chạy code Python. <sub>F-30, F-31, F-35</sub>

**[24] Bộ công cụ là gì?** — _metaphor_  
Các công cụ được gom thành từng nhóm, gọi là toolset. Bạn có thể hình dung toolset như những hộp đồ nghề. Mỗi hộp phục vụ một kiểu công việc riêng. Có hộp cho lập trình, hộp cho tìm kiếm, và hộp chỉ để đọc. <sub>F-12, F-32, F-36</sub>

**[25] Hộp đồ nghề cho lập trình** — _hub_  
Ví dụ, toolset coding gom công cụ về file, terminal, web, trình duyệt và bộ nhớ. Còn toolset safe chỉ cho phép tìm kiếm và đọc, không được sửa gì trên máy. Mỗi máy chủ MCP bạn thêm vào cũng trở thành một toolset riêng. <sub>F-32, F-36, F-37</sub>

**[26] Bật tắt công cụ** — _terminal_  
Gõ lệnh hermes tools để bật hoặc tắt từng bộ công cụ. Ngay trong cuộc trò chuyện, bạn cũng đổi được bằng lệnh tools. Ví dụ, bạn có thể tắt trình duyệt khi không cần đến nó. <sub>F-33, F-34</sub>

**[27] Vì sao nên chọn lọc?** — _kinetic_  
Vì sao phải chọn lọc? Vì agent chỉ làm được những gì bạn cho phép. Ít công cụ hơn nghĩa là an toàn hơn và tập trung hơn.

**[28] Tóm tắt chương ba** — _anchor_  
Tóm lại: công cụ là đôi tay, toolset là hộp đồ nghề.

## Vòng học khép kín  _(≈ 105 s · intermediate)_

**[29] Vòng học khép kín** — _title_  
Chương bốn: vòng học khép kín.

**[30] Vòng học là gì?** — _flow_  
Điểm đặc biệt nhất của Hermes là vòng học khép kín. Nó tự ghi nhớ, tự tạo kỹ năng, và hiểu bạn hơn mỗi ngày. Nói cách khác, bạn dùng càng nhiều, Hermes làm càng tốt. <sub>F-04</sub>

**[31] Hai cuốn sổ ghi nhớ** — _cards_  
Hermes có hai cuốn sổ ghi nhớ. Một cuốn ghi chú về công việc, một cuốn ghi lại thông tin về bạn. Mỗi phiên làm việc mới, Hermes đọc lại hai cuốn sổ này trước tiên. Hai cuốn sổ có giới hạn độ dài, nên Hermes chỉ ghi những điều quan trọng. <sub>F-38, F-39</sub>

**[32] Tìm lại cuộc trò chuyện cũ** — _terminal_  
Bạn quên mất đã bàn gì tuần trước? Không sao cả. Hermes có thể tìm lại mọi cuộc trò chuyện cũ nhờ công cụ session search. Toàn bộ lịch sử được lưu ngay trên máy của bạn. <sub>F-41</sub>

**[33] Kỹ năng là trí nhớ về cách làm** — _metaphor_  
Kỹ năng, hay skill, là những ghi chú về cách làm một việc. Tài liệu gọi đó là trí nhớ quy trình của agent. Mỗi kỹ năng cài vào sẽ tự động trở thành một lệnh mới. <sub>F-43, F-45, F-44</sub>

**[34] Tự tạo và tự cải thiện** — _flow_  
Sau một nhiệm vụ khó, Hermes có thể tự viết một kỹ năng mới. Lần sau gặp việc tương tự, nó dùng lại và cải thiện kỹ năng đó. Đây là cách Hermes tích lũy kinh nghiệm theo thời gian. <sub>F-04, F-45</sub>

**[35] Kho kỹ năng cộng đồng** — _hub_  
Bạn cũng có thể cài kỹ năng do cộng đồng chia sẻ từ Skills Hub. Mọi kỹ năng tải về đều được quét bảo mật trước khi cài. <sub>F-47, F-48</sub>

**[36] Dạy Hermes bằng lệnh learn** — _typewriter_  
Bạn cũng có thể chủ động dạy nó bằng lệnh learn. Đưa cho nó một tài liệu, một trang web, hay cả một cuốn sách, nó sẽ biến thành kỹ năng. <sub>F-46</sub>

**[37] Người dọn dẹp kỹ năng** — _stat_  
Có một người dọn dẹp chạy ngầm, gọi là curator. Kỹ năng không dùng sau mười bốn ngày sẽ bị đánh dấu cũ, sau ba mươi ngày thì được cất đi. <sub>F-49, F-50</sub>

**[38] Hiểu bạn sâu hơn với Honcho** — _hub_  
Muốn Hermes hiểu bạn sâu hơn nữa, bạn có thể gắn thêm Honcho. Honcho suy ngẫm sau mỗi cuộc trò chuyện để xây dựng chân dung về bạn. Bạn có thể xem lại mọi điều Hermes đã học bằng lệnh journey. <sub>F-51, F-52, F-53</sub>

**[39] Tóm tắt chương bốn** — _anchor_  
Nhớ nhé: ghi nhớ, tìm lại, kỹ năng, ba mảnh ghép của vòng học.

## Luôn bên bạn  _(≈ 66 s · intermediate)_

**[40] Luôn bên bạn** — _title_  
Chương năm: Hermes luôn bên bạn.

**[41] Trò chuyện từ ứng dụng quen thuộc** — _hub_  
Bạn không cần ngồi trước máy tính để dùng Hermes. Nhờ gateway, bạn nhắn tin cho nó qua Telegram, Discord, Slack hay WhatsApp. Kể cả khi đang ở ngoài đường, bạn vẫn giao việc được cho nó. <sub>F-06, F-54</sub>

**[42] Hơn hai mươi nền tảng** — _stat_  
Gateway hỗ trợ hơn hai mươi nền tảng nhắn tin. Tất cả chạy trong một tiến trình duy nhất ở chế độ nền. Tiến trình này vừa nhận tin nhắn, vừa chạy các việc theo lịch. <sub>F-55, F-56</sub>

**[43] Thiết lập gateway** — _terminal_  
Để bắt đầu, bạn gõ hermes gateway setup và làm theo hướng dẫn. Sau đó, chạy hermes gateway start là xong. Để an toàn, mặc định gateway từ chối người lạ cho đến khi bạn cho phép. <sub>F-57, F-91</sub>

**[44] Việc tự động theo lịch** — _metaphor_  
Hermes còn biết làm việc theo lịch, giống như một chiếc đồng hồ báo thức. Bạn chỉ cần nói bằng lời thường, ví dụ mỗi sáng thứ hai lúc chín giờ. Hoặc ngắn gọn hơn, như sau ba mươi phút, hay mỗi hai giờ. <sub>F-58, F-59</sub>

**[45] Ví dụ lịch tự động** — _typewriter_  
Ví dụ, mỗi sáng Hermes tóm tắt tin tức và gửi vào Telegram của bạn. Hay nhắc bạn kiểm tra công việc sau ba mươi phút nữa. Các việc theo lịch còn có thể nối tiếp nhau, việc sau dùng kết quả của việc trước. <sub>F-54, F-59, F-63, F-61</sub>

**[46] Tóm tắt chương năm** — _anchor_  
Tóm lại: gateway để trò chuyện mọi nơi, cron để tự động theo lịch.

## Nâng cao: những điểm nổi bật  _(≈ 103 s · advanced)_

**[47] Nâng cao: những điểm nổi bật** — _title_  
Chương sáu: nâng cao, những điểm nổi bật.

**[48] Chỉ cần nắm ý chính** — _kinetic_  
Phần này là nâng cao, bạn chỉ cần nắm ý chính và vì sao nó đặc biệt.

**[49] Agent con làm việc song song** — _flow_  
Điểm nổi bật đầu tiên: Hermes có thể sinh ra agent con. Mỗi agent con nhận một phần việc, làm song song, rồi chỉ gửi lại bản tóm tắt. Nhờ vậy, việc lớn xong nhanh hơn, mà cuộc trò chuyện chính vẫn gọn gàng. <sub>F-10, F-64, F-65</sub>

**[50] Viết code để gọi công cụ** — _split_  
Điểm thứ hai: Hermes có thể tự viết một đoạn Python để gọi nhiều công cụ cùng lúc. Nhiều bước gộp lại thành một lượt, tiết kiệm thời gian và chi phí. Những quy trình dài giờ đây chỉ cần một lần suy nghĩ. <sub>F-11</sub>

**[51] MCP – cổng cắm chung** — _hub_  
Điểm thứ ba là MCP, một kiểu cổng cắm chung cho công cụ. Qua MCP, Hermes kết nối được với GitHub, cơ sở dữ liệu hay hệ thống nội bộ của bạn. Bạn chỉ cần gõ hermes mcp để chọn từ danh mục có sẵn. <sub>F-68, F-70</sub>

**[52] Bảy môi trường chạy lệnh** — _stat_  
Điểm thứ tư: Hermes có bảy môi trường để chạy lệnh. Từ máy của bạn, Docker, SSH, cho đến các dịch vụ đám mây như Modal và Daytona. <sub>F-71</sub>

**[53] Ngủ đông khi rảnh** — _zoom_  
Với Modal và Daytona, môi trường của agent ngủ đông khi rảnh và thức dậy khi cần. Nghĩa là bạn gần như không tốn tiền giữa các lần làm việc. <sub>F-72</sub>

**[54] SOUL.md – linh hồn của agent** — _metaphor_  
Điểm thứ năm là tệp SOUL.md, nơi bạn đặt tính cách cho agent. Bạn quyết định giọng điệu, phong cách, và cách nó giao tiếp với bạn. Nhờ SOUL.md, mỗi người có thể có một Hermes mang cá tính riêng. <sub>F-79</sub>

**[55] Tệp ngữ cảnh cho dự án** — _cards_  
Ngoài ra, Hermes tự đọc các tệp như AGENTS.md trong thư mục dự án. Nhờ đó, nó hiểu quy tắc của từng dự án mà bạn không cần nhắc lại. Trước khi nạp, mọi tệp ngữ cảnh đều được quét để chặn nội dung độc hại. <sub>F-80, F-81, F-82</sub>

**[56] Vì sao những điều này quan trọng?** — _journey_  
Vì sao những điểm này quan trọng? Vì Hermes không bị giới hạn trong một máy tính. Nó làm được việc lớn hơn, ở xa hơn, mà vẫn theo phong cách của bạn. <sub>F-06, F-79</sub>

**[57] Tóm tắt chương sáu** — _anchor_  
Năm điểm nổi bật: agent con, code gọi công cụ, MCP, bảy môi trường, và SOUL.md.

## Dùng an toàn và tổng kết  _(≈ 57 s · all)_

**[58] Dùng an toàn và tổng kết** — _title_  
Chương bảy: dùng Hermes an toàn.

**[59] Hỏi trước khi làm việc nguy hiểm** — _split_  
Hermes có cơ chế phê duyệt thông minh cho các lệnh. Lệnh an toàn chạy luôn, lệnh nguy hiểm bị chặn, còn lệnh chưa rõ thì hỏi bạn. Nếu bạn không trả lời trong năm phút, lệnh đó sẽ tự động bị từ chối. Và một danh sách đen luôn chặn những lệnh cực kỳ nguy hiểm, như xóa sạch ổ đĩa. <sub>F-83, F-84, F-85</sub>

**[60] Bảo vệ bí mật của bạn** — _cards_  
Hermes không cho sửa các tệp chứa mật khẩu và khóa bí mật. Nó còn tự che các chuỗi giống khóa API trước khi ghi vào nhật ký. Và dữ liệu của bạn được lưu trên máy, không gửi đi đâu cả. <sub>F-86, F-87, F-88</sub>

**[61] Luôn có đường lui** — _journey_  
Trước khi sửa hay xóa file, Hermes tự chụp lại dự án. Nếu có gì sai, bạn chỉ cần gõ lệnh rollback để quay lại. <sub>F-92</sub>

**[62] Tổng kết bài học** — _anchor_  
Hôm nay bạn đã học: agent là gì, cách cài đặt, công cụ, và vòng học. Bạn cũng đã biết về gateway, lịch tự động, và những điểm nâng cao.

**[63] Bước tiếp theo** — _kinetic_  
Bước tiếp theo? Hãy cài Hermes và giao cho nó việc đầu tiên của bạn. Chúc bạn học vui, và hẹn gặp lại ở bài sau!

---
## Nguồn trích dẫn

- [F-01] Hermes Agent is described as "the self-improving AI agent built by Nous Research." — README.md
- [F-02] Hermes Agent is licensed under MIT. — README.md
- [F-04] The docs call it "the only agent with a built-in learning loop" that creates skills from experience, improves them during use, and builds a deepening model of the user across sessions. — website/docs/index.mdx
- [F-06] Hermes can run on a $5 VPS, a GPU cluster, or serverless infrastructure and is "not tied to your laptop." — README.md
- [F-07] Switching model providers requires no code changes: "Switch with `hermes model` — no code changes, no lock-in." — README.md
- [F-08] index.mdx states: "It's not a coding copilot tethered to an IDE or a chatbot wrapper around a single API. It's an autonomous agent that gets more capable the longer it runs." — website/docs/index.mdx
- [F-10] delegate_task spawns child agent instances with isolated context, inherited tool access, and their own terminal sessions. — website/docs/user-guide/features/delegation.md
- [F-11] execute_code lets the agent write Python scripts that call Hermes tools programmatically over a Unix domain socket RPC, collapsing multi-step workflows into a single LLM turn. — website/docs/user-guide/features/code-execution.md
- [F-12] Toolsets are named bundles of tools that control what the agent can do, coming in core, composite, and platform kinds. — website/docs/reference/toolsets-reference.md
- [F-13] Linux/macOS/WSL2/Termux install command: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`. — README.md
- [F-14] Windows native install command (PowerShell): `iex (irm https://hermes-agent.nousresearch.com/install.ps1)`. — README.md
- [F-15] Per-user git installer places code at ~/.hermes/hermes-agent/, the `hermes` binary at ~/.local/bin/hermes (symlink), and data at ~/.hermes/. — website/docs/getting-started/installation.md
- [F-17] Hermes requires a model with at least 64,000 tokens of context; smaller windows are rejected at startup. — website/docs/getting-started/quickstart.md
- [F-18] `hermes model` interactively walks the user through choosing an inference provider and default model. — website/docs/getting-started/quickstart.md
- [F-20] Nous Portal offers 300+ models under one subscription, switchable with `/model <name>`. — README.md
- [F-21] On a fresh install, `hermes setup` offers three modes: Quick Setup (Nous Portal), Full Setup, and Blank Slate. — website/docs/getting-started/quickstart.md
- [F-22] Secrets and tokens are stored in ~/.hermes/.env, while non-secret settings are stored in ~/.hermes/config.yaml. — website/docs/getting-started/quickstart.md
- [F-23] Hermes ships two terminal interfaces: the classic CLI launched with `hermes`, and a newer TUI launched with `hermes --tui` that has modal overlays, mouse selection, and non-blocking input. — website/docs/getting-started/quickstart.md
- [F-24] `hermes --continue` (short form `-c`) resumes the most recent CLI session. — website/docs/user-guide/cli.md
- [F-25] The provider catalog includes Nous Portal, OpenAI Codex, Anthropic, OpenRouter, Fireworks AI, Z.AI, Kimi/Moonshot, AWS Bedrock, Azure Foundry, Google AI Studio, xAI, GitHub Copilot, and custom OpenAI-compatible endpoints, among many others. — website/docs/getting-started/quickstart.md
- [F-26] The CLI status bar shows the model name, token usage, a context fill bar, estimated session cost, and elapsed duration. — website/docs/user-guide/cli.md
- [F-27] Typing `/` in the CLI opens an autocomplete dropdown listing available slash commands. — website/docs/user-guide/cli.md
- [F-28] The Windows installer bundles uv, Python 3.11, Node.js, ripgrep, ffmpeg, and a portable Git Bash (MinGit) with no admin rights required. — README.md
- [F-29] The documentation homepage advertises "60+ built-in tools." — website/docs/index.mdx
- [F-30] The `file` toolset bundles patch, read_file, search_files, and write_file. — website/docs/reference/toolsets-reference.md
- [F-31] The `terminal` toolset bundles the process and terminal tools for shell execution and background process management. — website/docs/reference/toolsets-reference.md
- [F-32] The `coding` toolset is a composite bundling file, terminal, search, web, skills, browser, todo, memory, session_search, clarify, code_execution, delegation, and vision. — website/docs/reference/toolsets-reference.md
- [F-33] `hermes tools` opens a curses UI to enable or disable toolsets per platform. — website/docs/reference/toolsets-reference.md
- [F-34] In-session slash commands such as `/tools list`, `/tools disable browser`, and `/tools enable homeassistant` toggle toolsets live. — website/docs/reference/toolsets-reference.md
- [F-35] The `hermes-cli` platform toolset includes file, terminal, web, browser, memory, skills, vision, image_gen, todo, tts, delegation, code_execution, cronjob, session_search, clarify, computer_use, Home Assistant, and kanban tools. — website/docs/reference/toolsets-reference.md
- [F-36] The `safe` toolset provides read-only research and media generation (image_generate, vision_analyze, web_extract, web_search) with no file writes, terminal, or code execution. — website/docs/reference/toolsets-reference.md
- [F-37] Each configured MCP server that contributes a tool creates its own runtime toolset named `mcp-<server>`. — website/docs/user-guide/features/mcp.md
- [F-38] Persistent memory has two files: MEMORY.md (2,200-char limit, the agent's own notes) and USER.md (1,375-char limit, the user profile), stored under ~/.hermes/memories/. — website/docs/user-guide/features/memory.md
- [F-39] Memory entries are injected into the system prompt as a frozen snapshot at session start and are managed by the agent through the `memory` tool with add/replace/remove actions. — website/docs/user-guide/features/memory.md
- [F-41] Beyond MEMORY.md/USER.md, the agent can search past conversations with the `session_search` tool, backed by SQLite FTS5 full-text search over ~/.hermes/state.db. — website/docs/user-guide/features/memory.md
- [F-43] Skills are on-demand knowledge documents that follow a progressive-disclosure pattern and are compatible with the agentskills.io open standard. — website/docs/user-guide/features/skills.md
- [F-44] All skills live in ~/.hermes/skills/, and every installed skill is automatically registered as a slash command. — website/docs/user-guide/features/skills.md
- [F-45] The agent can create, update, and delete its own skills via the `skill_manage` tool, described as the agent's "procedural memory." — website/docs/user-guide/features/skills.md
- [F-46] `/learn` turns a source — local docs, a URL, a described workflow, or a whole book/PDF — into a reusable skill without the user hand-writing the SKILL.md. — website/docs/user-guide/features/skills.md
- [F-47] `hermes skills browse`, `hermes skills search`, and `hermes skills install` browse and install skills from the Skills Hub, including sources like skills.sh, well-known endpoints, and direct GitHub repos. — website/docs/user-guide/features/skills.md
- [F-48] All hub-installed skills go through a security scanner that checks for data exfiltration, prompt injection, and destructive commands before install. — website/docs/user-guide/features/skills.md
- [F-49] The curator is a background maintenance pass for agent-created skills that moves unused skills through active → stale → archived states and can optionally run an LLM consolidation pass. — website/docs/user-guide/features/curator.md
- [F-50] By default the curator's automatic transitions mark a skill stale after 14 days of non-use and archive it after 30 days. — website/docs/user-guide/features/curator.md
- [F-51] Honcho is an AI-native memory backend that adds dialectic reasoning and deep user modeling on top of Hermes's built-in memory by reasoning about conversations after they happen. — website/docs/user-guide/features/honcho.md
- [F-52] Honcho is integrated as one of Hermes's Memory Provider plugins and is configured with `hermes memory setup`. — website/docs/user-guide/features/honcho.md
- [F-53] The Learning Journey (`hermes journey`, aliases `hermes learning`/`hermes memory-graph`, or `/journey` in chat) is a timeline view of every skill and memory entry Hermes has learned, plotted over time. — website/docs/user-guide/features/memory.md
- [F-54] The messaging gateway lets users chat with Hermes from Telegram, Discord, Slack, WhatsApp, Signal, SMS, Email, Home Assistant, Mattermost, Matrix, DingTalk, Feishu/Lark, WeCom, Weixin, BlueBubbles, QQ, Yuanbao, Microsoft Teams, LINE, ntfy, or a browser. — website/docs/user-guide/messaging/index.md
- [F-55] The docs describe the gateway as reaching "20+ platforms from one gateway." — website/docs/index.mdx
- [F-56] The gateway is a single background process that connects to all configured platforms, handles sessions, runs cron jobs, and delivers voice messages. — website/docs/user-guide/messaging/index.md
- [F-57] `hermes gateway setup` interactively configures messaging platforms, and `hermes gateway start` / `hermes gateway run` starts the gateway process. — README.md
- [F-58] Hermes exposes cron scheduling through a single `cronjob` tool with create/list/pause/resume/run/remove/edit actions instead of separate tools. — website/docs/user-guide/features/cron.md
- [F-59] Schedules can be expressed in natural language ("in 30m", "every 2h", "every monday 9am") as well as raw cron expressions ("0 9 * * *"). — website/docs/user-guide/features/cron.md
- [F-61] Cron jobs can chain outputs between each other using `context_from`, and a job can carry forward its own previous output with `continuity=true`. — website/docs/user-guide/features/cron.md
- [F-63] In chat, `/cron add "in 30m" "Remind me to check the build"` schedules a task directly from natural language. — website/docs/user-guide/features/cron.md
- [F-64] `delegate_task` spawns child AIAgent instances with a completely fresh conversation; only the child's final summary enters the parent's context. — website/docs/user-guide/features/delegation.md
- [F-65] Up to 10 concurrent subagents run per batch by default (configurable, no hard ceiling). — website/docs/user-guide/features/delegation.md
- [F-68] MCP (Model Context Protocol) lets Hermes connect to external tool servers such as GitHub, databases, and internal APIs; MCP tools are registered as `mcp_<server_name>_<tool_name>`. — website/docs/user-guide/features/mcp.md
- [F-70] `hermes mcp` opens an interactive picker for a curated catalog of Nous-reviewed MCP servers. — website/docs/user-guide/features/mcp.md
- [F-71] Hermes supports seven terminal backends: local, Docker, SSH, Daytona, Singularity, Modal, and Vercel Sandbox. — README.md
- [F-72] Daytona and Modal offer serverless persistence: "your agent's environment hibernates when idle and wakes on demand, costing nearly nothing between sessions." — README.md
- [F-79] SOUL.md controls the agent's personality, tone, and communication style, and is loaded only from HERMES_HOME (e.g. ~/.hermes/SOUL.md), never from the working directory. — website/docs/user-guide/features/context-files.md
- [F-80] AGENTS.md (along with CLAUDE.md, .hermes.md, and .cursorrules) are project context files auto-discovered from the working directory and injected into the system prompt, with .hermes.md taking highest priority. — website/docs/user-guide/features/context-files.md
- [F-81] Inside a git repository, Hermes loads a merged chain of AGENTS.md files from the git root down to the working directory, with deeper files taking precedence. — website/docs/user-guide/features/context-files.md
- [F-82] All context files are scanned for prompt-injection patterns (instruction overrides, hidden HTML, credential exfiltration) before being loaded, and blocked content is not injected. — website/docs/user-guide/features/context-files.md
- [F-83] The default approval mode `approvals.mode: smart` uses an auxiliary LLM to assess command risk: low-risk commands auto-approve, dangerous ones auto-deny, and uncertain cases escalate to a manual prompt. — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-84] If an approval prompt times out (default 300 seconds) without a response, the command is denied. — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-85] A hardline blocklist refuses commands such as `rm -rf /`, fork bombs, or zeroing a physical disk regardless of approval mode, `--yolo`, or an explicit "allow always." — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-86] write_file and patch cannot touch OS credential stores (~/.ssh/, ~/.aws/, ~/.kube/, /etc/sudoers, ~/.netrc) or Hermes/project secret files (auth.json, .env, .env.local) anywhere on disk. — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-87] `security.redact_secrets` is on by default, redacting patterns that look like API keys, tokens, and passwords from tool output before they enter context or logs. — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-88] Hermes Agent does not collect telemetry, usage data, or analytics; conversations, memory, and skills are stored locally in ~/.hermes/. — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-91] On the gateway, if no allowlists are configured and `GATEWAY_ALLOW_ALL_USERS` is not set, all users are denied by default. — website/docs/guides/secure-hermes-on-a-work-machine.md
- [F-92] Checkpoints automatically snapshot a project before destructive operations (write_file, patch, rm, mv, sed -i, git reset) into a shadow git store under ~/.hermes/checkpoints/store/, restorable with `/rollback`. — website/docs/guides/secure-hermes-on-a-work-machine.md
