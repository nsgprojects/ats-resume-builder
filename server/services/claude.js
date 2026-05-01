const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from Claude');

  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(text); } catch (_) {}

  const s = text.search(/[{\[]/);
  if (s < 0) throw new Error(`No JSON in response. Got: ${text.slice(0, 120)}`);

  let depth = 0, end = -1;
  for (let i = s; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') depth++;
    if (text[i] === '}' || text[i] === ']') depth--;
    if (depth === 0) { end = i; break; }
  }

  let slice;
  if (end === -1) {
    slice = text.slice(s);
    const stack = [];
    for (const ch of slice) {
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if ((ch === '}' || ch === ']') && stack.length) stack.pop();
    }
    const quotes = (slice.match(/(?<!\\)"/g) || []).length;
    if (quotes % 2 !== 0) slice += '"';
    slice = slice.replace(/,\s*$/, '');
    slice += stack.reverse().join('');
  } else {
    slice = text.slice(s, end + 1);
  }

  const fixed = slice
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"');

  try { return JSON.parse(fixed); }
  catch (e) { throw new Error(`Parse failed: ${e.message} | Partial: ${slice.slice(0, 250)}`); }
}

async function askClaude(userMessage, options = {}) {
  const {
    system = 'You are an expert resume analyst. You MUST respond with a single valid JSON object only. No markdown fences. No explanation. No preamble. Start your response directly with { and end with }.',
    maxTokens = 8000
  } = options;

  const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

  // Prefill (assistant turn starting with "{") only works on Haiku
  // Sonnet and Opus reject it with a 400 error
  const supportsPreFill = model.includes('haiku');

  const messages = supportsPreFill
    ? [{ role: 'user', content: userMessage }, { role: 'assistant', content: '{' }]
    : [{ role: 'user', content: userMessage }];

  const response = await client.messages.create({ model, max_tokens: maxTokens, system, messages });

  const raw = (supportsPreFill ? '{' : '') +
              (response.content || []).map(b => b.text || '').join('');
  return extractJSON(raw);
}

module.exports = { askClaude };
