/**
 * Wrapper Anthropic SDK. Dùng tool-use (forced) để model luôn trả JSON đúng cấu trúc,
 * sau đó validate bằng zod. Có retry với backoff cho lỗi tạm thời.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import { config } from '../lib/config.js';

// Hỗ trợ cả Anthropic chính thức (apiKey) lẫn gateway custom (baseURL + authToken Bearer).
const client = config.aiEnabled
  ? new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY ?? null,
      authToken: config.ANTHROPIC_AUTH_TOKEN, // set Authorization: Bearer khi dùng gateway
      baseURL: config.ANTHROPIC_BASE_URL || undefined,
    })
  : null;

export function aiReady(): boolean {
  return client !== null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gọi model và buộc trả về JSON theo `inputSchema` (JSON Schema cho tool),
 * rồi parse/validate bằng `validator` (zod). Ném lỗi nếu sau retry vẫn thất bại.
 */
export async function callJSON<T>(opts: {
  model: string;
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  validator: z.ZodType<T>;
  maxTokens?: number;
  retries?: number;
}): Promise<T> {
  if (!client) throw new Error('AI disabled: thiếu ANTHROPIC_API_KEY');
  const retries = opts.retries ?? 2;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await client.messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        tools: [
          {
            name: opts.toolName,
            description: opts.toolDescription,
            input_schema: opts.inputSchema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: opts.toolName },
        messages: [{ role: 'user', content: opts.user }],
      });
      const block = res.content.find((c) => c.type === 'tool_use');
      if (!block || block.type !== 'tool_use') throw new Error('không có tool_use trong phản hồi');
      return opts.validator.parse(block.input);
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(500 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('callJSON thất bại');
}
