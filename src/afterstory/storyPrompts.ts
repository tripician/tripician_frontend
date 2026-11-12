/**
 * The writing prompts a story template starts with.
 *
 * They are placeholders: grey text in an empty block that disappears as soon as
 * the author types, and never reaches a reader. They used to be inserted as real
 * text the author had to select and delete, which customers reported as a
 * placeholder that would not go away, and anything left behind was published
 * under the author's name.
 *
 * Its own module so blockSchema (which recognises the old inserted copies) and
 * the templates can both import it without importing each other.
 */

export const PROMPTS = {
  // The opening prompt, in the owner's own words. Every shape starts here,
  // because the blank first paragraph is the one that stops people writing at all.
  intro:
    'This place is for introduction, maybe you can mention the overall motive of the trip, but like a summary. Where you went, who you went with, and why this one rather than anywhere else.',
  journalFirst:
    'Start with the thing you actually remember, not with the airport. What did the first hour look like, and what surprised you?',
  journalMiddle:
    'The part most people skip. One meal, one wrong turn, one conversation is worth more here than a list of everywhere you walked.',
  journalHome: 'What you were carrying back that you did not arrive with.',
  essayOpening:
    'One or two lines under the opening picture. In a photo essay the words are the caption, not the article, so keep them short and let the next image do the talking.',
  essayRest: 'Add the pictures that did not fit above, and say what was happening just outside the frame.',
  guideStay:
    'Name the places and say plainly whether you would book them again. A guide earns its keep on the details a listing page will not tell you: the walk from the station, the noise, the breakfast.',
  guideSkip:
    'The honest half. Something you queued for and regretted is more useful to the next person than another recommendation.',
  guideCost: 'Round numbers are fine. Say what is included and what is not.',
  postcardFirst: 'A line about that picture.',
  postcardSecond:
    'And one about this one. A postcard is meant to be finished in ten minutes, so stop when you run out of things worth saying.',
} as const;

/** Was appended to each template's last prompt while prompts were real text. */
const OLD_CLOSING_HINT =
  'Guidance stops here. Everything above is an ordinary block: type over it, move it, or delete it and lay the rest out however you like.';

const LAST_PROMPTS = new Set<string>([PROMPTS.journalHome, PROMPTS.essayRest, PROMPTS.guideCost, PROMPTS.postcardSecond]);

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Every paragraph the templates used to insert as real text, exactly as inserted. */
const INSERTED = new Map<string, string>();
Object.values(PROMPTS).forEach((prompt) => {
  INSERTED.set(squash(prompt), prompt);
  if (LAST_PROMPTS.has(prompt)) INSERTED.set(squash(`${prompt} ${OLD_CLOSING_HINT}`), prompt);
});

/**
 * The prompt a block's text came from, when the text is one of the template
 * paragraphs nobody wrote over. Null for anything the author actually typed:
 * only an exact copy of our own words is ever recognised.
 */
export function insertedPrompt(plainText: string): string | null {
  return INSERTED.get(squash(plainText)) ?? null;
}
