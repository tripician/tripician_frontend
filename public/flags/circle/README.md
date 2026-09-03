# Circular country flags

249 SVGs, one per ISO 3166-1 alpha-2 code in `src/utils/countryData.ts`, named by
lowercase code. Vendored on 2026-08-29 from
[HatScripts/circle-flags](https://github.com/HatScripts/circle-flags), MIT licence.

Served from `public/` rather than bundled or fetched from a CDN. Each file is
requested only when a flag is actually shown, the browser caches it, and nothing
here depends on a third-party host staying up. 160 KB for the whole set.

Read through `flagSvgUrl()` in `src/utils/countryFlags.ts`, never by hand-built
path. `src/utils/flagCoverage.test.ts` fails the build if a country in the table
has no file here, so adding a country means adding its flag.

Each flag is masked to a circle at `viewBox="0 0 512 512"`, so everything outside
the disc is already transparent and no clip path is needed at the call site. The
geometry is deliberately simplified, which is why Mexico is 1.7 KB here against
85 KB in flag-icons; at the 16 to 32 px these are drawn at, the simplification is
invisible.

To refresh, re-run the vendoring script against the codes in `countryData.ts` and
check the coverage test still passes.
