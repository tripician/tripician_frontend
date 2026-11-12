/**
 * Reads a Tripician Intelligence answer into the blocks the app decorates.
 *
 * The staged general chat writes a small, fixed syntax for this (see
 * `BuildStagedGeneralSystemPrompt` on the server):
 *
 *   **At a glance:** 5 days · Lisbon → Porto · food & history   → a chip strip
 *   ## Day 1 · Lisbon                                          → a day on the timeline
 *   - 🏛️ Walk the **Baixa**                                     → an item with its emoji
 *   > 💡 Buy a Viva Viagem card                                → a tip callout
 *   > ⚠️ / > 🌤️                                                 → a warning / weather callout
 *
 * Everything else is plain Markdown-ish text, and older answers ("# Day 1 –
 * Lisbon", "**Day 2, Kyoto**") still read as days. It works line by line, so a
 * half-streamed answer is always renderable.
 */

export type RichItem = {
  /** "1." for a numbered item; null for a bullet. */
  number: string | null;
  /** A leading emoji, shown in place of the bullet. */
  emoji: string | null;
  text: string;
};

export type CalloutTone = 'tip' | 'warning' | 'weather' | 'note';

export type RichBlock =
  | { kind: 'glance'; items: string[] }
  | { kind: 'day'; label: string; title: string; items: RichItem[] }
  | { kind: 'heading'; text: string }
  | { kind: 'callout'; tone: CalloutTone; icon: string | null; text: string }
  | { kind: 'list'; items: RichItem[] }
  | { kind: 'paragraph'; text: string };

const DAY_HEADING =
  /^#{1,4}\s*\**\s*(days?\s*\d+(?:\s*[-–—]\s*\d+)?)\s*\**\s*(?:[·:,\-–—|]\s*(.*?))?\s*\**\s*$/i;
const DAY_BOLD = /^\*\*\s*(days?\s*\d+(?:\s*[-–—]\s*\d+)?)\s*(?:[·:,\-–—|]\s*(.*?))?\s*\*\*:?\s*$/i;
const GLANCE = /^\**\s*at a glance\s*:?\s*\**\s*:?\s*(.+)$/i;
const HEADING = /^#{1,6}\s+(.+?)\s*#*\s*$/;
const BULLET = /^[-*+•]\s+(.+)$/;
const NUMBERED = /^(\d+[.)])\s+(.+)$/;
const CALLOUT = /^>\s?(.*)$/;

/**
 * Splits a leading emoji off the text. Covers the pictographic blocks a model
 * uses (with variation selectors, skin tones and ZWJ sequences) without Unicode
 * property escapes, which not every JS engine the app runs on supports.
 */
export function splitLeadingEmoji(text: string): { emoji: string | null; rest: string } {
  const isPictograph = (cp: number) =>
    (cp >= 0x1f000 && cp <= 0x1faff) ||
    (cp >= 0x2600 && cp <= 0x27bf) ||
    (cp >= 0x2b00 && cp <= 0x2bff) ||
    (cp >= 0x2300 && cp <= 0x23ff) ||
    (cp >= 0x2190 && cp <= 0x21ff) ||
    cp === 0x00a9 ||
    cp === 0x00ae ||
    cp === 0x203c ||
    cp === 0x2049 ||
    cp === 0x2122 ||
    cp === 0x2139;
  const isModifier = (cp: number) => cp === 0xfe0f || cp === 0xfe0e || (cp >= 0x1f3fb && cp <= 0x1f3ff) || cp === 0x20e3;

  const points = Array.from(text);
  const first = points[0]?.codePointAt(0);
  if (first === undefined || !isPictograph(first)) {
    return { emoji: null, rest: text };
  }
  let end = 1;
  while (end < points.length) {
    const cp = points[end].codePointAt(0)!;
    if (isModifier(cp)) {
      end += 1;
    } else if (cp === 0x200d && end + 1 < points.length && isPictograph(points[end + 1].codePointAt(0)!)) {
      end += 2;
    } else {
      break;
    }
  }
  return { emoji: points.slice(0, end).join(''), rest: points.slice(end).join('').trimStart() };
}

function calloutTone(icon: string | null): CalloutTone {
  if (!icon) return 'note';
  if (/💡|✨|👉|📝/u.test(icon)) return 'tip';
  if (/⚠|❗|🚨|⛔|🚧/u.test(icon)) return 'warning';
  if (/☀|🌤|⛅|🌥|🌦|🌧|⛈|🌨|❄|🌡|☔|🌬|🌫|🌈/u.test(icon)) return 'weather';
  return 'note';
}

function dayLabel(raw: string): string {
  const match = raw.match(/(days?)\s*(\d+)(?:\s*[-–—]\s*(\d+))?/i);
  if (!match) return raw.trim();
  return match[3] ? `Days ${match[2]}–${match[3]}` : `Day ${match[2]}`;
}

function toItem(line: string): RichItem {
  const numbered = line.match(NUMBERED);
  const body = numbered ? numbered[2] : line.match(BULLET)?.[1] ?? line;
  const { emoji, rest } = splitLeadingEmoji(body.trim());
  return { number: numbered ? numbered[1] : null, emoji, text: rest };
}

export function parseRichAnswer(content: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let day: Extract<RichBlock, { kind: 'day' }> | null = null;
  let list: Extract<RichBlock, { kind: 'list' }> | null = null;
  let paragraph: string[] = [];
  let callout: string[] | null = null;
  // A blank line inside a day: an item after it carries on the day, plain text
  // (a closing question, a sign-off) ends it.
  let dayGap = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };
  const flushCallout = () => {
    if (callout && callout.join(' ').trim()) {
      const { emoji, rest } = splitLeadingEmoji(callout.join(' ').trim());
      blocks.push({ kind: 'callout', tone: calloutTone(emoji), icon: emoji, text: rest });
    }
    callout = null;
  };
  const closeSection = () => {
    flushParagraph();
    flushCallout();
    day = null;
    list = null;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    const quote = line.match(CALLOUT);
    if (quote) {
      flushParagraph();
      list = null;
      day = null;
      const quoted = quote[1].trim();
      // A quoted line that opens with its own emoji starts a new callout, so a
      // tip and a warning on consecutive lines stay two.
      if (callout?.length && quoted && splitLeadingEmoji(quoted).emoji) {
        flushCallout();
      }
      callout = callout ?? [];
      if (quoted) callout.push(quoted);
      continue;
    }
    flushCallout();

    if (!line) {
      flushParagraph();
      list = null;
      if (day) dayGap = true;
      continue;
    }

    const glance = line.match(GLANCE);
    if (glance) {
      closeSection();
      const items = glance[1]
        .split(/\s*[·•|]\s*/)
        .map(item => item.replace(/^\*+|\*+$/g, '').trim())
        .filter(Boolean);
      if (items.length) blocks.push({ kind: 'glance', items });
      continue;
    }

    const dayMatch = line.match(DAY_HEADING) ?? line.match(DAY_BOLD);
    if (dayMatch) {
      closeSection();
      const opened: Extract<RichBlock, { kind: 'day' }> = {
        kind: 'day',
        label: dayLabel(dayMatch[1]),
        title: (dayMatch[2] ?? '').replace(/\*+/g, '').trim(),
        items: [],
      };
      day = opened;
      dayGap = false;
      blocks.push(opened);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      closeSection();
      blocks.push({ kind: 'heading', text: heading[1].replace(/^\*+|\*+$/g, '').trim() });
      continue;
    }

    const isItem = BULLET.test(line) || NUMBERED.test(line);
    if (day && dayGap && !isItem) {
      day = null;
    }
    dayGap = false;
    const openDay = day as Extract<RichBlock, { kind: 'day' }> | null;
    if (openDay) {
      // Inside a day, every line is one of its items, bulleted or not.
      flushParagraph();
      openDay.items.push(toItem(line));
      continue;
    }

    if (isItem) {
      flushParagraph();
      if (!list) {
        const opened: Extract<RichBlock, { kind: 'list' }> = { kind: 'list', items: [] };
        list = opened;
        blocks.push(opened);
      }
      (list as Extract<RichBlock, { kind: 'list' }>).items.push(toItem(line));
      continue;
    }

    list = null;
    paragraph.push(line);
  }

  flushParagraph();
  flushCallout();
  return blocks;
}

/** Splits **bold** spans out of a line. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map(part =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part.replace(/\*\*/g, ''), bold: false },
    );
}
