import OpenAI from "openai";

export interface JsonModelRequest {
  system: string;
  input: unknown;
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  /** Sampling temperature. Leave unset for conversation; set 0 where the same
   *  input must give the same answer — a verdict that changes between two
   *  identical requests is not a verdict. */
  temperature?: number;
}

export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
}

export function getBaseUrl(): string | undefined {
  return process.env.GEMINI_BASE_URL || process.env.OPENAI_BASE_URL || undefined;
}

export function modelName(): string {
  return process.env.GEMINI_MODEL || process.env.OPENAI_MODEL || "gemini-3.8-flash";
}

export function getTimeoutMs(): number {
  const custom = Number(process.env.LLM_TIMEOUT_MS ?? process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(custom) && custom > 0 ? custom : 15000;
}

export function isConfigured(): boolean {
  return Boolean(getApiKey());
}

export function maskKey(key?: string): string {
  if (!key) return "<none>";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 3)}***`;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)} (len ${trimmed.length})`;
}

export function validateKeyFormat(key?: string, baseUrl?: string): { valid: boolean; warning?: string } {
  if (!key) return { valid: false, warning: "No API key configured" };
  const trimmed = key.trim();
  const url = baseUrl || getBaseUrl() || "";

  // Gemini API key check (supports legacy AIzaSy... and new AQ.Ab... Auth keys)
  const isGemini = url.includes("generativelanguage.googleapis.com") || Boolean(process.env.GEMINI_API_KEY) || trimmed.startsWith("AIzaSy") || trimmed.startsWith("AQ.");
  if (isGemini) {
    if (!trimmed.startsWith("AIzaSy") && !trimmed.startsWith("AQ.")) {
      return {
        valid: false,
        warning: `Gemini API key should start with 'AIzaSy' or 'AQ.' (found '${trimmed.slice(0, 7)}...'). Obtain a valid key from Google AI Studio (https://aistudio.google.com).`,
      };
    }
    if (trimmed.length < 30) {
      return {
        valid: false,
        warning: `Gemini API key length seems too short (found ${trimmed.length} chars).`,
      };
    }
    return { valid: true };
  }

  // Groq API key check
  if (url.includes("groq.com")) {
    if (!trimmed.startsWith("gsk_")) {
      return { valid: false, warning: "Groq API key should start with 'gsk_'" };
    }
    return { valid: true };
  }

  // OpenAI API key check
  if (!url || url.includes("openai.com")) {
    if (!trimmed.startsWith("sk-")) {
      return { valid: false, warning: "OpenAI API key should start with 'sk-'" };
    }
    return { valid: true };
  }

  return { valid: true };
}

/**
 * What an unauthenticated caller may learn about the copilot: whether one is
 * configured, and which model answers.
 *
 * /health is public and used to return getLLMConfigStatus() whole, which
 * includes the first eight and last four characters of the API key plus its
 * length. A masked key is fine in a server log, where only operators read it.
 * On an open endpoint it is twelve characters of a live secret handed to
 * anyone who asks, and it names the provider to try them against.
 */
export function publicLLMStatus() {
  const key = getApiKey();
  return {
    configured: Boolean(key),
    model: modelName(),
    keyFormatValid: validateKeyFormat(key, getBaseUrl()).valid,
  };
}

/** Full diagnostic, including a masked key. Server logs only — never a response body. */
export function getLLMConfigStatus() {
  const key = getApiKey();
  const trimmedKey = (key ?? "").trim();
  const rawBaseUrl = getBaseUrl();
  const isGemini = Boolean(process.env.GEMINI_API_KEY) || (rawBaseUrl && rawBaseUrl.includes("generativelanguage.googleapis.com")) || trimmedKey.startsWith("AIzaSy") || trimmedKey.startsWith("AQ.");

  const displayBaseUrl = isGemini
    ? "https://generativelanguage.googleapis.com/v1beta/models/ (Native Gemini)"
    : (rawBaseUrl ?? "default (https://api.openai.com/v1)");

  const keyCheck = validateKeyFormat(key, rawBaseUrl);
  return {
    configured: Boolean(key),
    keyPrefix: maskKey(key),
    baseUrl: displayBaseUrl,
    model: modelName(),
    timeoutMs: getTimeoutMs(),
    keyFormatValid: keyCheck.valid,
    ...(keyCheck.warning ? { keyFormatWarning: keyCheck.warning } : {}),
  };
}

function extractJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // match failed
      }
    }
    console.error("[extractJson Error] Failed to parse raw text:", JSON.stringify(text));
    throw new Error("Failed to parse JSON response");
  }
}

function cleanSchemaForGemini(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(cleanSchemaForGemini);

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "minItems" || key === "maxItems") continue;
    if (key === "type" && typeof val === "string") {
      result[key] = val.toUpperCase();
    } else {
      result[key] = cleanSchemaForGemini(val);
    }
  }
  return result;
}

async function askGeminiNative<T>(req: JsonModelRequest, apiKey: string, model: string, timeout: number, startTime: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      systemInstruction: {
        parts: [{ text: req.system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: typeof req.input === "string" ? req.input : JSON.stringify(req.input) }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: cleanSchemaForGemini(req.schema),
        maxOutputTokens: req.maxTokens,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      const status = res.status;
      throw new Error(`[HTTP ${status}] ${errText}`);
    }

    const data: any = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty candidate text");

    console.log(`[LLM Request] Completed '${req.schemaName}' via native Gemini API in ${Date.now() - startTime}ms`);
    return extractJson<T>(text);
  } finally {
    clearTimeout(timer);
  }
}

export async function askForJson<T>(req: JsonModelRequest): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const timeout = getTimeoutMs();
  const baseUrl = getBaseUrl();
  const model = modelName();
  const maskedKey = maskKey(apiKey);
  const startTime = Date.now();
  const trimmedKey = apiKey.trim();

  const isGemini = Boolean(process.env.GEMINI_API_KEY) || (baseUrl && baseUrl.includes("generativelanguage.googleapis.com")) || trimmedKey.startsWith("AIzaSy") || trimmedKey.startsWith("AQ.");

  console.log(`[LLM Request] Initiating '${req.schemaName}' (${isGemini ? "Native Gemini" : "OpenAI SDK"}) | Model: ${model} | BaseURL: ${baseUrl ?? "default"} | Key: ${maskedKey} | Timeout: ${timeout}ms`);

  const keyCheck = validateKeyFormat(apiKey, baseUrl);
  if (keyCheck.warning) {
    console.warn(`[LLM Request] ⚠️ Key Format Warning: ${keyCheck.warning}`);
  }

  if (isGemini) {
    try {
      return await askGeminiNative<T>(req, apiKey, model, timeout, startTime);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.error(`[LLM Request] Native Gemini call failed after ${elapsed}ms: ${err?.message || String(err)}`);
      throw err;
    }
  }

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    timeout,
  });

  // Try response_format json_object first for maximum compatibility across providers (Groq, OpenRouter, OpenAI, etc.)
  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: req.maxTokens,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      messages: [
        { role: "system", content: `${req.system}\n\nRespond ONLY with a valid JSON object matching this schema: ${JSON.stringify(req.schema)}` },
        { role: "user", content: JSON.stringify(req.input) },
      ],
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (text) {
      console.log(`[LLM Request] Completed '${req.schemaName}' via json_object in ${Date.now() - startTime}ms`);
      return extractJson<T>(text);
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    const status = err?.status || err?.statusCode;
    const codeInfo = status ? `[HTTP ${status}] ` : "";
    console.warn(`[LLM Request] Primary attempt (json_object) failed after ${elapsed}ms: ${codeInfo}${err?.message || String(err)}`);

    if (status === 401 || status === 429) {
      console.error(`[LLM Request] Aborting fallback due to non-retryable status [HTTP ${status}]`);
      throw err;
    }
  }

  // Fall back to json_schema if json_object is unsupported by the endpoint
  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: req.maxTokens,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: JSON.stringify(req.input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: req.schemaName, strict: true, schema: req.schema },
      },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("model returned no content");
    console.log(`[LLM Request] Completed '${req.schemaName}' via json_schema in ${Date.now() - startTime}ms`);
    return extractJson<T>(text);
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    const status = err?.status || err?.statusCode;
    const codeInfo = status ? `[HTTP ${status}] ` : "";
    console.error(`[LLM Request] Fallback attempt (json_schema) failed after ${elapsed}ms: ${codeInfo}${err?.message || String(err)}`);
    throw err;
  }
}


