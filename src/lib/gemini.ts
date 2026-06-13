// Client minimal pour l'API Gemini (Google AI Studio). Utilisé uniquement côté
// serveur (la clé reste dans process.env, jamais exposée au client).
const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function generateText(
  prompt: string,
  opts: { maxOutputTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("[gemini] GEMINI_API_KEY absente — génération ignorée.");
    return null;
  }
  try {
    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxOutputTokens ?? 800,
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[gemini] HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch (err) {
    console.warn("[gemini] échec de la requête :", (err as Error).message);
    return null;
  }
}
