// The story card's type-on-photograph treatment, shared so the card and the wall preview cannot drift.

/**
 * Type sits on the photograph, so it needs its own darkening rather than the
 * theme's surfaces, which are tuned for type on paper. Neutral, never brand
 * coral: a coral wash over a photograph is the "generated UI" tell the theme
 * rules exist to prevent, and the shadow guard fails the build on one.
 *
 * Four stops rather than two because a linear fade over this distance leaves a
 * visible band across the middle of the image.
 */
export const SCRIM =
  'linear-gradient(to top, rgba(10,10,13,0.94) 0%, rgba(10,10,13,0.78) 26%, rgba(10,10,13,0.34) 52%, rgba(10,10,13,0) 76%)';

/** Legible on the scrim without being pure white, which glares against a photo. */
export const INK = 'rgba(255,255,255,0.96)';
export const INK_MUTED = 'rgba(255,255,255,0.74)';

/**
 * Covers for a story with no photograph.
 *
 * The first version painted a flat near-black and centred a faint image icon,
 * which in a grid is a large black rectangle apologising for itself. A story
 * without a picture is not a broken story: plenty of good writing ships without
 * one, and the card should look like a decision.
 *
 * So: a deep two-stop wash keyed to the story's vibe, which gives two coverless
 * stories different faces, and no icon at all. An icon meaning "no image" is an
 * apology; a text-only jacket is a design. Neutral-dark rather than brand coral,
 * because a coral field behind white serif is the generated-UI tell the theme
 * rules exist to prevent.
 */
const VIBE_WASH: Record<string, string> = {
  adventure: 'linear-gradient(150deg, #1B2A24 0%, #0E1512 100%)',
  culture: 'linear-gradient(150deg, #2A2233 0%, #14101A 100%)',
  party: 'linear-gradient(150deg, #33202A 0%, #1A0F15 100%)',
  slow: 'linear-gradient(150deg, #1E2A2E 0%, #101619 100%)',
  romantic: 'linear-gradient(150deg, #32222A 0%, #180F14 100%)',
  luxury: 'linear-gradient(150deg, #2C2820 0%, #15130E 100%)',
  spiritual: 'linear-gradient(150deg, #262036 0%, #12101C 100%)',
  urban: 'linear-gradient(150deg, #232629 0%, #101214 100%)',
  scenic: 'linear-gradient(150deg, #1C2B2F 0%, #0E1618 100%)',
};
const DEFAULT_WASH = 'linear-gradient(150deg, #23232A 0%, #101015 100%)';

/** The jacket colour for a coverless story. */
export function storyWash(vibe: string | null | undefined): string {
  return (vibe && VIBE_WASH[vibe.toLowerCase()]) || DEFAULT_WASH;
}
