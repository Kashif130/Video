let cache = { at: 0, list: [] };
const TTL = 60 * 60 * 1000; // 1 ghanta

// Ye models hf-inference provider par live hain (sirf inventory se, live check nahi)
const FALLBACK = [];

export async function getCandidates(token) {
  // Agar env mein manually list di hai to wahi use karein
  if (process.env.HF_MODELS) {
    return process.env.HF_MODELS.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (cache.list.length && Date.now() - cache.at < TTL) {
    return cache.list;
  }

  try {
    // Sirf wo models jo hf-inference provider par served hain
    const url =
      "https://huggingface.co/api/models?inference_provider=hf-inference&pipeline_tag=text-to-video&sort=downloads&direction=-1&limit=20";
    const r = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (r.ok) {
      const data = await r.json();
      const ids = data.map((m) => m.id).filter(Boolean);
      if (ids.length) {
        cache = { at: Date.now(), list: ids };
        return ids;
      }
    }
  } catch (e) {
    // fallback neeche
  }

  return FALLBACK;
}
