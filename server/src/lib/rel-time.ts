/** Chuyển timestamp (ms) thành chuỗi tương đối tiếng Việt: "3 giờ trước". */
export function relTime(ts: number | null | undefined): string {
  if (!ts) return '';
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}
