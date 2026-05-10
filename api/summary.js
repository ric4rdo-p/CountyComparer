import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
  }

  const { messages, model, max_tokens } = req.body;
  if (!messages || !model) {
    return res.status(400).json({ error: 'Missing required fields: messages, model' });
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({ model, max_tokens, messages });
  res.status(200).json(response);
}
