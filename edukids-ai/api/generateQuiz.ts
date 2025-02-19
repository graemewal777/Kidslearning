// edukids-ai/src/api/generateQuiz.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

interface Question {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

interface Quiz {
  questions: Question[];
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  let { prompt } = request.body;

  if (!prompt) {
    return response.status(400).json({ error: 'Prompt is required' });
  }

  // Limit prompt length to 200 characters
  prompt = prompt.substring(0, 200);

  // Create a SHA-256 hash of the prompt
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');

  // Check if the response is cached in Supabase
  const { data: cachedResponse, error: cacheError } = await supabase
    .from('ai_cache')
    .select('response')
    .eq('prompt_hash', promptHash)
    .single();

  if (cacheError) {
    console.error('Error checking cache:', cacheError);
  }

  if (cachedResponse) {
    console.log('Cache hit!');
    return response.status(200).json(JSON.parse(cachedResponse.response));
  }

  try {
    // Call the OpenRouter API
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
      console.error('Missing OPENROUTER_API_KEY environment variable.');
      return response.status(500).json({ error: 'Missing OPENROUTER_API_KEY environment variable.' });
    }

    const fetchResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        prompt: prompt,
        max_tokens: 500,
      }),
    });

    const aiData = await fetchResponse.json();

    if (!fetchResponse.ok) {
      console.error('OpenRouter API error:', aiData);
      const errorMessage = aiData.error || `Failed to generate quiz: ${fetchResponse.status} - ${fetchResponse.statusText}`;
      throw new Error(errorMessage);
    }

    if (!aiData.choices || aiData.choices.length === 0) {
      console.error('OpenRouter API error: No choices returned');
      throw new Error('Failed to generate quiz: No choices returned');
    }

    if (!aiData.choices[0].message || !aiData.choices[0].message.content) {
      console.error('OpenRouter API error: No message content returned');
      throw new Error('Failed to generate quiz: No message content returned');
    }

    let quiz: Quiz | null = null;
    try {
      quiz = JSON.parse(aiData.choices[0].message.content);
      // Further validation of the quiz object can be added here if needed
      if (!quiz || !quiz.questions || !Array.isArray(quiz.questions)) {
        console.error('Failed to parse quiz: Invalid quiz format');
        throw new Error('Failed to parse quiz: Invalid quiz format');
      }
    } catch (parseError: any) {
      console.error('Failed to parse quiz:', parseError);
      throw new Error(`Failed to parse quiz: ${parseError.message}`);
    }

    // Cache the response in Supabase
    if (quiz) {
      const { error: insertError } = await supabase
        .from('ai_cache')
        .insert({
          prompt_hash: promptHash,
          response: JSON.stringify(quiz),
        });

      if (insertError) {
        console.error('Error caching response:', insertError);
      }
    }

    console.log('Cache miss, generated new quiz.');
    return response.status(200).json(quiz);
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return response.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
}
