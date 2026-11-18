/**
 * The words of /child-safety-standards, in one place.
 *
 * Google Play's Child Safety Standards declaration links to this page, and Play
 * review reads it to confirm two things: that the standards explicitly prohibit
 * child sexual abuse and exploitation (CSAE) and name the app, and that the
 * child safety point of contact matches the email declared in Play Console.
 * The November 18, 2026 rejection ("Invalid Child Safety point of contact
 * email") is why this is written so plainly.
 *
 * Two things read it:
 * - ChildSafetyPage.tsx, the designed page people see
 * - childSafetyStatic.ts, which writes the same words as plain HTML at build
 *   time, because a reviewer or crawler that runs no JavaScript otherwise gets
 *   an empty <div id="root">
 *
 * CHILD_SAFETY_EMAIL must be the exact address in Play Console → Policy →
 * App content → Child safety standards. Change both together.
 *
 * Plain data with no JSX or `import.meta`, because vite.config.ts imports it.
 */

export const CHILD_SAFETY_PATH = '/child-safety-standards';
export const CHILD_SAFETY_EMAIL = 'support@tripician.com';
export const CHILD_SAFETY_TITLE = 'Child Safety Standards';
export const CHILD_SAFETY_DOC_TITLE = 'Child Safety Standards | Tripician';
export const CHILD_SAFETY_DESCRIPTION =
  "Tripician's Child Safety Standards: zero tolerance for child sexual abuse and exploitation (CSAE) in the Tripician app and website, how to report a concern, and our child safety point of contact.";
export const CHILD_SAFETY_UPDATED = 'November 18, 2026';

/** The Android app as it is published on Google Play. */
export const PLAY_APP_NAME = 'Tripician';
export const PLAY_PACKAGE = 'com.tripicianapp';

/** A run of text: plain, a link, or bold. */
export type Inline = string | { text: string; href: string } | { strong: string };
export type Block = { p: Inline[] } | { ul: Inline[][] };
export interface Section {
  title: string;
  blocks: Block[];
}

const mail = (subject: string): Inline => ({
  text: CHILD_SAFETY_EMAIL,
  href: `mailto:${CHILD_SAFETY_EMAIL}?subject=${encodeURIComponent(subject)}`,
});

export const CHILD_SAFETY_INTRO =
  'Tripician has zero tolerance for child sexual abuse and exploitation (CSAE). These standards explain what we prohibit, how to report a concern, and what we do about it.';

export const CHILD_SAFETY_SECTIONS: Section[] = [
  {
    title: 'Where these standards apply',
    blocks: [
      {
        p: [
          'These standards apply to the ',
          { strong: `${PLAY_APP_NAME} app on Google Play` },
          ` (package name ${PLAY_PACKAGE}), the Tripician website at tripician.com, and every community feature in them: profiles, posts, photos, stories, trips, comments, groups, questions, Tripician Intelligence, and private messages. They apply to everyone who uses Tripician and supplement our `,
          { text: 'Terms of Service', href: '/terms-and-conditions' },
          '.',
        ],
      },
    ],
  },
  {
    title: 'What we prohibit',
    blocks: [
      { p: ['Tripician strictly prohibits child sexual abuse and exploitation in any form. You must not use Tripician to share, request, create, or promote any of the following:'] },
      {
        ul: [
          ['Child sexual abuse material (CSAM), including drawn, edited, or AI-generated imagery that sexualizes a minor.'],
          ['Any content that sexualizes a minor, including sexual comments about a child.'],
          ['Grooming: building contact or trust with a minor in order to sexually abuse or exploit them.'],
          ['Sextortion: threatening or blackmailing a minor, or anyone, using intimate images of a minor.'],
          ['Trafficking a minor, or offering or arranging access to a minor for sexual purposes, including through travel.'],
          ['Asking a minor for sexual content or contact, or arranging to meet a minor for sexual purposes.'],
          ['Links to, or directions for finding, any of the above.'],
        ],
      },
      { p: ['These rules also cover Tripician Intelligence: using it to generate or request any of this content is prohibited.'] },
    ],
  },
  {
    title: 'How to report a child safety concern',
    blocks: [
      {
        p: [
          'In the app or on the website, use ',
          { strong: 'Report' },
          ' on the post, story, comment, trip, person, or chat, and choose ',
          { strong: 'Child safety: a minor at risk' },
          '. These reports alert our child safety contact immediately. Add a short description if you can.',
        ],
      },
      {
        p: [
          'You can also email our child safety point of contact at ',
          mail('Child Safety Report'),
          ' with the subject ',
          { strong: 'Child Safety Report' },
          '. Include links, usernames, and a description. Do not download, attach, or forward suspected CSAM.',
        ],
      },
      { p: ['You can also report directly to the authorities:'] },
      {
        ul: [
          [
            { strong: 'India: ' },
            'Report online child sexual abuse material and other cybercrimes against children through the ',
            { text: 'National Cyber Crime Reporting Portal', href: 'https://cybercrime.gov.in/' },
            ' under Report Crime Related to Women/Child. You can also contact your local police. For emergencies, call 112.',
          ],
          [
            { strong: 'United States: ' },
            'the National Center for Missing & Exploited Children (NCMEC) CyberTipline at ',
            { text: 'report.cybertip.org', href: 'https://report.cybertip.org/' },
            ' or 1-800-843-5678.',
          ],
          [
            { strong: 'Elsewhere: ' },
            'your national hotline, listed by ',
            { text: 'INHOPE', href: 'https://www.inhope.org/' },
            '.',
          ],
        ],
      },
      { p: [{ strong: 'If a child is in immediate danger, contact local emergency services or the police now (112 in India and the EU, 911 in the US).' }] },
    ],
  },
  {
    title: 'What we do',
    blocks: [
      {
        ul: [
          ['Child safety reports receive the highest review priority. We aim to review them as soon as possible, prioritising reports involving an immediate risk to a minor.'],
          ['When we confirm a violation, we remove the content and permanently ban the accounts involved.'],
          ['We report apparent child sexual abuse material and exploitation to the authorities: the National Cyber Crime Reporting Portal or the police in India, and the NCMEC CyberTipline.'],
          ['We securely preserve relevant reported material and associated account information when required by applicable law. Where a report is submitted to the NCMEC CyberTipline, we preserve the reported material and reasonably accessible related information for the applicable statutory period, including the one-year period under 18 U.S.C. § 2258A. Access is restricted to authorised personnel handling the case. We disclose information only through lawful and authorised channels.'],
          ['An account cannot be deleted while a child safety report or case involving it is still open.'],
          ['We respond to lawful requests from law enforcement and comply with applicable child safety laws, including the POCSO Act in India and 18 U.S.C. § 2258A in the United States.'],
        ],
      },
    ],
  },
  {
    title: 'Age requirements',
    blocks: [
      {
        p: [
          // "who live in", not "accessing from": the Terms set the 16+ rule by
          // residence ("if you reside in the European Union or United Kingdom").
          'Users must be at least 13 years old to use Tripician. Users who live in the EU or UK must be at least 16 years old, in accordance with Tripician\'s ',
          { text: 'Terms of Service', href: '/terms-and-conditions' },
          ". These are Tripician's minimum age requirements and do not limit our response to child safety concerns.",
        ],
      },
    ],
  },
  {
    title: 'Child safety point of contact',
    blocks: [
      {
        p: [
          'Tripician has a designated child safety representative responsible for receiving child safety reports, coordinating reviews and responding to compliance enquiries. Contact them at ',
          mail('Child Safety'),
          '.',
        ],
      },
    ],
  },
];
