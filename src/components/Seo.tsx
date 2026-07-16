import React from 'react';
import { Helmet } from 'react-helmet-async';

export const SITE_URL = 'https://tripician.com';
export const SITE_NAME = 'Tripician';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

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
  const fullTitle = /tripician/i.test(title) ? title : `${title} ,${SITE_NAME}`;
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
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

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
