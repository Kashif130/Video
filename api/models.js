import { getCandidates } from "../lib/models.js";

export default async function handler(req, res) {
  const models = await getCandidates(process.env.HF_TOKEN);
  res.setHeader("Cache-Control", "s-maxage=3600");
  return res.json({ models });
}
