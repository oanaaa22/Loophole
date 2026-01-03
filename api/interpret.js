import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { text, jurisdiction = "", tone = "professional" } = req.body || {};
    if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });

    const instructions = `
You are “Loophole Finance – Regulation Interpreter”.
Explain regulations and compliance concepts clearly. Educational only; not legal/tax/financial advice.
Do NOT provide instructions to break the law, evade taxes, dodge reporting, launder money, or commit fraud.
If user asks for illegal guidance, refuse briefly and offer lawful, high-level alternatives.

Return JSON ONLY with this schema:
{"summary":string,"key_points":string[],"risks":string[],"questions":string[],"disclaimer":string}

Tone: ${tone}
Jurisdiction (if any): ${jurisdiction || "not specified"}
`;

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      instructions,
      input: text
    });

    const outText =
      resp.output_text ||
      (resp.output || []).flatMap(o => (o.content || []).map(c => c.text).filter(Boolean)).join("\n");

    let data;
    try { data = JSON.parse(outText); }
    catch { return res.status(502).json({ error: "Model returned invalid JSON. Please try again." }); }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
