import { getCandidates } from "../lib/models.js";

export const config = { maxDuration: 60 }; // Vercel Hobby plan ki max limit

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sirf POST allowed hai" });
  }

  const { prompt, model } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.length > 500) {
    return res.status(400).json({ error: "Prompt 1 se 500 characters ke beech hona chahiye" });
  }

  const token = process.env.HF_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "HF_TOKEN environment variable set nahi hai" });
  }

  // User ne model choose kiya to sirf wahi, warna auto list
  const candidates = model ? [model] : await getCandidates(token);

  const deadline = Date.now() + 50_000; // 60s limit se pehle ruk jayenge
  const errors = [];

  for (const m of candidates.slice(0, 6)) {
    const remaining = deadline - Date.now();
    if (remaining < 8_000) break;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(remaining, 40_000));

    try {
      const r = await fetch(`https://router.huggingface.co/hf-inference/models/${m}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!r.ok) {
        const txt = await r.text();
        errors.push(`${m}: ${r.status} ${txt.slice(0, 120)}`);
        continue;
      }

      const type = r.headers.get("content-type") || "";
      if (!type.includes("video")) {
        errors.push(`${m}: video nahi mila (${type})`);
        continue;
      }

      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader("Content-Type", type);
      res.setHeader("X-Model-Used", m);
      res.setHeader("Access-Control-Expose-Headers", "X-Model-Used");
      return res.send(buf);
    } catch (e) {
      clearTimeout(timer);
      errors.push(`${m}: ${e.name === "AbortError" ? "timeout" : e.message}`);
    }
  }

  return res.status(502).json({
    error: "Koi bhi model video nahi bana paya",
    details: errors,
  });
}
