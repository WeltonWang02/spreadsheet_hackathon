import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface LLMResponse {
  text: string;
  fromCache: boolean;
}

export async function llm(prompt: string, model: string = 'gpt-4o-mini'): Promise<LLMResponse> {
  // Create cache directory if it doesn't exist
  const cacheDir = path.join(process.cwd(), '.cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Generate cache key from prompt and model
  const cacheKey = crypto
    .createHash('md5')
    .update(`${prompt}${model}`)
    .digest('hex');
  const cachePath = path.join(cacheDir, `${cacheKey}.json`);

  // Check cache
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    return {
      text: cached.text,
      fromCache: true
    };
  }

  // Call OpenAI API
  prompt = `
  ${prompt}

  Return your response as described inside <response></response> tags. Only return the response inside these tags, no other text.
  `
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: model,
  });

  const response = completion.choices[0]?.message?.content || '';

  // parse out the response from the <response></response> tags
  const responseText = response.match(/<response>([^]*?)<\/response>/)?.[1] || '';

  // Cache the rnesponse
  fs.writeFileSync(
    cachePath,
    JSON.stringify({
      text: responseText,
      prompt,
      model,
      timestamp: new Date().toISOString()
    })
  );

  return {
    text: responseText,
    fromCache: false
  };
}
