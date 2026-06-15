/** Nguồn RSS mặc định — chỉ seed khi bảng sources rỗng (lần chạy đầu). */
import { db } from "./client";
import { sources } from "./schema";

const DEFAULTS = [
  { id: "vne-thegioi", label: "VnExpress · Thế giới", url: "https://vnexpress.net/rss/the-gioi.rss", type: "rss" },
  { id: "vne-sohoa", label: "VnExpress · Số hóa", url: "https://vnexpress.net/rss/so-hoa.rss", type: "rss" },
  { id: "vne-kinhdoanh", label: "VnExpress · Kinh doanh", url: "https://vnexpress.net/rss/kinh-doanh.rss", type: "rss" },
  { id: "vne-khoahoc", label: "VnExpress · Khoa học", url: "https://vnexpress.net/rss/khoa-hoc.rss", type: "rss" },
  { id: "vne-thoisu", label: "VnExpress · Thời sự", url: "https://vnexpress.net/rss/thoi-su.rss", type: "rss" },
  { id: "yt-duyluandethuong", label: "Duy Luân Dễ Thương", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCQ0jSGgYMLmRMeTE6UaPPXg", type: "youtube" },
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
