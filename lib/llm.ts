import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Dostawca modelu AI. Domyślnie OpenAI (gpt-4o-mini).
// Można przełączyć na Anthropic ustawiając LLM_PROVIDER=anthropic.
export type LlmProvider = 'openai' | 'anthropic';

export function getProvider(): LlmProvider {
  return process.env.LLM_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
}

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

// Leniwa inicjalizacja — tworzymy klienta tylko dla używanego dostawcy,
// żeby brak klucza drugiego dostawcy nie wywalał aplikacji.
let _openai: OpenAI | null = null;
function openaiClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Brak OPENAI_API_KEY. Ustaw klucz OpenAI lub przełącz LLM_PROVIDER=anthropic.');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Brak ANTHROPIC_API_KEY. Ustaw klucz Anthropic lub przełącz LLM_PROVIDER=openai.');
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// Wysyła prompt do wybranego dostawcy i zwraca surowy tekst odpowiedzi (JSON).
export async function generateJson(prompt: string): Promise<string> {
  const provider = getProvider();

  if (provider === 'anthropic') {
    const message = await anthropicClient().messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });
    const firstTextBlock = message.content.find((b) => b.type === 'text');
    return firstTextBlock && firstTextBlock.type === 'text' ? firstTextBlock.text : '';
  }

  // Domyślnie: OpenAI. response_format wymusza poprawny JSON.
  const completion = await openaiClient().chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });
  return completion.choices[0]?.message?.content || '';
}
