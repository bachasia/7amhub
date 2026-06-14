/** Ngày hiện tại dạng YYYY-MM-DD theo timezone cấu hình (dùng cho khoá digest). */
import { config } from './config.js';

export function todayLocal(date = new Date()): string {
  // en-CA cho định dạng YYYY-MM-DD ổn định
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
