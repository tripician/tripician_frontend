/**
 * The "@Name " that starts a reply to a comment, as the app writes it: the
 * commenter's first name. Kept apart from the composer so it can be tested.
 */
export const mentionFor = (name: string): string => `@${name.trim().split(/\s+/)[0]} `;

/**
 * Moves the box from answering one comment to answering another (or none):
 * the previous mention comes off the front, the new one goes on, and whatever
 * the person typed after it stays. Mentions never stack.
 */
export function swapMention(body: string, previousName: string | null, nextName: string | null): string {
  const previous = previousName ? mentionFor(previousName) : null;
  const bare = previous && body.startsWith(previous) ? body.slice(previous.length) : body;
  return nextName ? mentionFor(nextName) + bare : bare;
}

/** What was actually written, without the mention: a bare "@Name " is not a reply yet. */
export function writtenPart(body: string, name: string | null): string {
  const mention = name ? mentionFor(name) : null;
  return mention && body.startsWith(mention) ? body.slice(mention.length) : body;
}
