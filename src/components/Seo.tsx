import React from 'react';
import { Helmet } from 'react-helmet-async';

export const SITE_URL = 'https://tripician.com';
export const SITE_NAME = 'Tripician';
/**
 * Site-wide social preview image.
 *
 * This path was always referenced but the file did not exist in public/, so it
 * was never in the build output and every share of every page previewed with a
 * missing image. The file is now real: 1200x630 and 88KB, comfortably under the
 * ~300KB ceiling above which WhatsApp drops the preview entirely.
 */
export const DEFAULT_OG_IMAGE =
  (import.meta.env.VITE_OG_COVER_URL as string) || `${SITE_URL}/og-cover.jpg`;

interface SeoProps {
  /** Page title; ` - Tripician` is appended unless it already mentions the brand */
  title: string;
  description: string;
  /** Path beginning with '/', used for canonical + og:url */
  path: string;
  image?: string;
  /** OpenGraph type, e.g. 'website' | 'article' */
  type?: string;
  /** Set true for pages that must stay out of search indexes */
  noindex?: boolean;
  /** JSON-LD structured data objects, rendered as script tags */
  jsonLd?: object | object[];
}

/**
 * Single source of truth for per-page SEO: title, canonical, robots,
 * OpenGraph/Twitter cards, and JSON-LD structured data.
 */
const Seo: React.FC<SeoProps> = ({ title, description, path, image, type = 'website', noindex = false, jsonLd }) => {
  // Separator was `,` with a leading space, so every page that did not already
  // contain the brand rendered as "Community ,Tripician" in the tab and in
  // search results.
  const fullTitle = /tripician/i.test(title) ? title : `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const img = image || DEFAULT_OG_IMAGE;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      {/* Dimensions let Facebook and LinkedIn reserve the card before they have
          fetched the image; without them the first share of a URL often renders
          text-only while the scrape is still in flight. The default OG image is
          1200x630, the ratio both platforms expect for a large card. */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      <meta name="twitter:image:alt" content={fullTitle} />

      {/* '<' is escaped so user-generated names can't break out of the script tag */}
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block).replace(/</g, '\\u003c')}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
