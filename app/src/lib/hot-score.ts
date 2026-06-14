/** Điểm "nóng" sơ bộ cho mỗi bài (0..1+), dùng để xếp hạng feed và làm input cho digest. */
export function baseHotScore(input: {
  publishedAt: number | null;
  hasImage: boolean;
  textLen: number;
}): number {
  const ageH = input.publishedAt ? (Date.now() - input.publishedAt) / 3.6e6 : 72;
  const recency = Math.max(0, 1 - ageH / 48);
  const img = input.hasImage ? 0.1 : 0;
  const depth = Math.min(0.15, input.textLen / 6000);
  return Number((recency + img + depth).toFixed(4));
}
