/**
 * Nguồn RSS mặc định — chỉ seed khi bảng sources rỗng (lần chạy đầu).
 * Người dùng sau đó tự thêm/sửa/xoá qua Feed Manager; không gán category thủ công (AI lo).
 */
import { db } from './client.js';
import { sources } from './schema.js';

const DEFAULTS = [
  { id: 'vne-thegioi', label: 'VnExpress · Thế giới', url: 'https://vnexpress.net/rss/the-gioi.rss' },
  { id: 'vne-sohoa', label: 'VnExpress · Số hóa', url: 'https://vnexpress.net/rss/so-hoa.rss' },
  { id: 'vne-kinhdoanh', label: 'VnExpress · Kinh doanh', url: 'https://vnexpress.net/rss/kinh-doanh.rss' },
  { id: 'vne-khoahoc', label: 'VnExpress · Khoa học', url: 'https://vnexpress.net/rss/khoa-hoc.rss' },
  { id: 'vne-thoisu', label: 'VnExpress · Thời sự', url: 'https://vnexpress.net/rss/thoi-su.rss' },
];

export function seedSourcesIfEmpty(): void {
  const count = db.select({ id: sources.id }).from(sources).all().length;
  if (count > 0) return;
  const now = Date.now();
  db.insert(sources)
    .values(DEFAULTS.map((s) => ({ ...s, active: 1, createdAt: now })))
    .run();
  console.log(`[seed] đã thêm ${DEFAULTS.length} nguồn RSS mặc định`);
}
