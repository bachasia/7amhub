export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { readArticles } from "@/lib/db/schema";

export function GET() {
  const rows = db.select({ articleId: readArticles.articleId }).from(readArticles).all();
  return NextResponse.json(rows.map((r) => r.articleId));
}
