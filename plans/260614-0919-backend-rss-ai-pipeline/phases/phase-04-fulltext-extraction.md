# Phase 04 — Full-text extraction

**Priority:** P1 · **Status:** ⬜ · **Depends:** 03

## Mục tiêu
Lấy toàn văn bài gốc server-side để (a) phục vụ tab "Bài gốc" trong reader, (b) cho AI tóm tắt chất lượng hơn raw_summary.

## Việc làm
1. `src/ingest/extract.ts`:
   - `extractFullText(url)` — fetch HTML (User-Agent giả lập, timeout 10s) → linkedom parse → @mozilla/readability `parse()` → trả `{ text, paragraphs[] }` (textContent làm sạch, lọc đoạn >60 ký tự).
   - Fallback selector cho VnExpress: `.fck_detail p, article p, p.Normal` nếu readability rỗng.
   - Bọc try/catch — lỗi trả null, không chặn pipeline.
2. Gọi trong AI worker (Phase 05) trước khi summarize: nếu `full_text` null thì extract & lưu.

## Lưu ý
- Không extract lúc ingest (chậm) — làm lazy trong AI worker hoặc khi mở reader.
- Giới hạn độ dài text gửi AI (~6000 ký tự đầu) để kiểm soát token.

## Success
- `extractFullText` trả >3 đoạn cho 1 URL VnExpress thật.
