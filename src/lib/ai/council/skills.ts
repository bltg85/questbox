/**
 * Reusable prompt building blocks ("skills") for children's content generation.
 *
 * Each skill is a self-contained string block that can be composed into system prompts.
 * Based on:
 *   - Flesch-Kincaid readability research
 *   - Story Spine (Kenn Adams)
 *   - SCAMPER creative thinking framework
 *   - Curiosity Gap engagement technique
 *   - Game design difficulty curve principles
 */

import type { CouncilInput } from './types';

// ── Age & Readability ─────────────────────────────────────────────────────────

export function ageReadabilitySkill(ageGroup: string): string {
  const rules: Record<string, string> = {
    toddler: `AGE SKILL (2–4 years):
- Max 5 words per sentence
- Only 1–2 syllable words (cat, dog, big, red — not "enormous", "mysterious")
- Heavy repetition and rhythm — children love predictable patterns
- Lots of encouragement: "You found it! Hooray!"
- Avoid negations: say "find the red thing" not "it's not blue"
- Flesch-Kincaid target: grade 1`,

    child: `AGE SKILL (5–8 years):
- Max 10 words per sentence
- Simple vocabulary — no more than 2 syllables unless it's a fun, silly word
- Rhymes and rhythm are powerful — use them for riddles and clues
- One idea per sentence, one concept per paragraph
- Use sensory words: crunchy, sparkly, wiggly, gigantic
- Surprise and wonder: "Can you believe it?!", "Something magical is hiding..."
- Flesch-Kincaid target: grade 2–3`,

    teen: `AGE SKILL (9–12 years):
- Max 15 words per sentence, vary length for rhythm
- Clever wordplay, puns, and double meanings are welcome
- "Cool factor" matters — avoid baby talk, never be condescending
- Mysteries and secrets: partial reveals, "If you figure THIS out..."
- Incorporate challenge and pride: solving should feel like an achievement
- Flesch-Kincaid target: grade 4–6`,

    adult: `AGE SKILL (13+ years):
- Full vocabulary range, sophisticated sentence structure
- Irony, sarcasm, and subverted expectations work well
- Respect intelligence — no over-explaining
- Flesch-Kincaid target: grade 7+`,

    all: `AGE SKILL (All ages):
- Write so a 7-year-old can follow, but a parent won't be bored
- Use layered jokes: one simple, one clever
- Short sentences for action, longer sentences for atmosphere
- Avoid: irony, abstract time concepts, double negatives
- Include one "grown-up wink" moment per section`,
  };

  return rules[ageGroup] ?? rules['child'];
}

// ── Story Spine (narrative structure for treasure hunts) ─────────────────────

export function storySpineSkill(): string {
  return `STORY SPINE SKILL (Kenn Adams):
Structure your narrative using these beats — they create satisfying arcs that children remember:
1. "Once upon a time..." — establish the world and the hero
2. "Every day..." — show the normal state, what's at stake
3. "Until one day..." — the inciting event, the adventure begins (this is clue #1)
4. "Because of that..." — each clue leads causally to the next (not just "go to X")
5. "Until finally..." — the climax, the hardest challenge before the treasure
6. "Ever since then..." — the final message: what did we learn / celebrate?

Apply this arc even for short hunts: each clue should feel like a natural next step in the story, not a random location.`;
}

// ── Rule of Three ─────────────────────────────────────────────────────────────

export function ruleOfThreeSkill(): string {
  return `RULE OF THREE SKILL:
Children (and adults) respond to patterns of three — they feel complete and satisfying.
- Give three hints if a clue is hard
- Three cheering phrases when treasure is found
- Three wrong-answer distractors in a quiz
- Group tips for adults in threes
- Use tricolon for effect: "Search high, search low, search somewhere you know!"`;
}

// ── Curiosity Gap (engagement hook) ──────────────────────────────────────────

export function curiosityGapSkill(productType: string): string {
  if (productType === 'quiz') {
    return `CURIOSITY GAP SKILL (Quiz):
- End every answer with a "Did you know?" fun fact — even wrong answers get one
- Half-reveal in the question: "This animal can do something IMPOSSIBLE with its eyes..."
- Escalating stakes: "This next question has STUMPED grown-ups. Ready?"
- Score reveals are events: "5 correct? You're officially a quiz CHAMPION!"
- Never just say "Wrong" — redirect with wonder: "Tricky! The real answer is even cooler..."`;
  }

  if (productType === 'treasure_hunt') {
    return `CURIOSITY GAP SKILL (Treasure Hunt):
- End every clue with an open tease: "...and somewhere nearby, your next secret is hiding"
- Use partial reveals: "The treasure has something GOLDEN inside..."
- Build anticipation between clues: "Getting warmer! The next clue smells like..."
- Let children feel smart: "Only the sharpest explorers ever find this spot"
- The introduction must create a burning question that only finishing solves`;
  }

  return `CURIOSITY GAP SKILL:
- Tease information before revealing it
- Create open loops that only completing the activity closes
- Make children feel clever for discovering each step`;
}

// ── Difficulty Curve ──────────────────────────────────────────────────────────

export function difficultyCurveSkill(difficulty: string): string {
  const curves: Record<string, string> = {
    easy: `DIFFICULTY CURVE (Easy):
- Start with something they can see from where they're standing
- Build confidence: first 2 clues/questions are guaranteed wins
- Never block progress — if stuck, they should immediately find a visual cue
- Celebrate every correct answer enthusiastically`,

    medium: `DIFFICULTY CURVE (Medium):
- Clue 1: Easy win to build confidence
- Clue 2–3: Requires looking or thinking
- Clue 4–(N-1): The real challenge — one "aha moment" per clue
- Final clue: Satisfying but slightly harder than the rest
- One clue may require adult collaboration (builds family bonding)`,

    hard: `DIFFICULTY CURVE (Hard):
- Open with something deceptively simple
- Escalate quickly: each clue harder than the last
- Include at least one multi-step deduction ("If X is Y, then the next place is...")
- The penultimate clue should be the hardest
- The final reveal should feel EARNED`,
  };

  return curves[difficulty] ?? curves['medium'];
}

// ── SCAMPER (creative variation to avoid repetition) ─────────────────────────

export function scamperSkill(): string {
  return `SCAMPER SKILL (creative variety):
Vary your clues/questions so no two feel the same. Use these techniques:
- Substitute: Change the usual framing ("Instead of finding something cold, find something that was once cold")
- Combine: Mix two elements ("Find where reading meets sitting")
- Adapt: Use the theme in an unexpected way
- Modify/Magnify: Exaggerate for effect ("The BIGGEST thing in the room")
- Put to other use: "Find something for feet that isn't on the floor"
- Eliminate: "Find the room with no windows"
- Reverse: "Start at the end and work backwards"

Apply at least 3 different SCAMPER techniques across your clues/questions.`;
}

// ── Composer: assemble all relevant skills for a given input ─────────────────

export function buildSkillBlock(input: CouncilInput): string {
  const skills: string[] = [];

  skills.push(ageReadabilitySkill(input.ageGroup));

  if (input.type === 'treasure_hunt') {
    skills.push(storySpineSkill());
    skills.push(curiosityGapSkill('treasure_hunt'));
    skills.push(difficultyCurveSkill(input.difficulty));
    skills.push(scamperSkill());
    skills.push(ruleOfThreeSkill());
  } else if (input.type === 'quiz') {
    skills.push(curiosityGapSkill('quiz'));
    skills.push(difficultyCurveSkill(input.difficulty));
    skills.push(ruleOfThreeSkill());
  } else {
    skills.push(curiosityGapSkill(input.type));
    skills.push(ruleOfThreeSkill());
  }

  return `\n── CONTENT SKILLS ──\n${skills.join('\n\n')}`;
}
