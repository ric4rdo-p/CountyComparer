import { METRICS, getWinner, getOverallWinner } from '../utils/metrics.js';

const SYSTEM_PROMPTS = {
  'trash-talk': `You are a rowdy, over-the-top Texas sports commentator hosting a county rivalry cage match. Your job: trash talk both counties with loud, funny, brutally specific jabs based only on the real data given — no vague generalizations. Rules:
- Call out at least 5 specific stats with their actual numbers in the commentary.
- Roast the losing county mercilessly but cleverly (no generic insults, tie it to real stats).
- Crown the winner with ridiculous fanfare and Texas-sized bragging.
- Throw in at least 2 funny quips or metaphors comparing the counties.
- Use Texas slang, regional pride, and sports-broadcast drama throughout.
- 3-5 punchy sentences. Keep it moving.`,

  'professional': `You are a senior regional economist writing a concise comparative brief for city planners, journalists, and economic development offices. Guidelines:
- Lead with the overall competitive outcome and score.
- Identify the 3-4 most significant differentiating metrics; cite exact values for each.
- Analyze what those differences imply for quality of life, economic opportunity, workforce, and housing affordability.
- Close with a one-sentence takeaway on which county has a structural advantage and why.
- 3-5 sentences. Professional, precise, no hyperbole.`,

  'plain': `You are a friendly, knowledgeable neighbor explaining two Texas counties to someone deciding where to live. Use plain, conversational English — zero jargon, zero econ-speak. Translate every number into what it means for everyday life. Guidelines:
- Talk about what it actually feels like to live there: commute, rent, schools, safety, job market.
- Use relatable comparisons (e.g. "that's about X minutes to get to work").
- Be warm, honest, and balanced — point out where each place shines and where it might frustrate someone.
- 3-5 sentences. Sound like a real person, not a report.`,
};

export async function generateSummary(countyA, countyB, mode = 'professional', activeMetrics = METRICS) {
  const overall = getOverallWinner(countyA, countyB, activeMetrics);
  const winnerName = overall.winner === 'A' ? countyA.name
    : overall.winner === 'B' ? countyB.name : "neither (it's a tie)";

  const statsBlock = activeMetrics
    .map(m => {
      const a = countyA[m.key];
      const b = countyB[m.key];
      if (a == null && b == null) return null;
      const winner = getWinner(m, countyA, countyB);
      const winLabel = m.higherIsBetter === null ? 'neutral'
        : winner === 'A' ? `${countyA.name} wins`
        : winner === 'B' ? `${countyB.name} wins`
        : 'tie';
      const fmtA = a != null ? m.format(a) : 'N/A';
      const fmtB = b != null ? m.format(b) : 'N/A';
      return `${m.label}: ${countyA.name} ${fmtA} vs ${countyB.name} ${fmtB} [${winLabel}]`;
    })
    .filter(Boolean)
    .join('\n');

  const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS['professional'];

  const res = await fetch('/api/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here are the stats for two Texas counties:\n\n${statsBlock}\n\nFinal score: ${countyA.name} ${overall.scoreA} – ${countyB.name} ${overall.scoreB}. Overall winner: ${winnerName}.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Summary request failed (${res.status})`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
