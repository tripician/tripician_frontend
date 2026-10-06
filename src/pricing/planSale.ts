/** The MRP to strike through, or null whenever showing a struck price would not be honest. */
export function strikePrice(mrp: number | null | undefined, payable: number): number | null {
  // An older server sends no MRP at all. One number is the right answer then.
  if (typeof mrp !== 'number' || !Number.isFinite(mrp)) return null;

  // A sale that moves nothing is not a sale, and a free plan has nothing to cut.
  if (payable <= 0 || mrp <= payable) return null;

  return mrp;
}

/** How a running sale names itself, with the saving worked out per period and a digits-only name dropped. */
export function saleLabel(
  label: string | null | undefined,
  mrp: number | null | undefined,
  payable: number,
): string | null {
  const struck = strikePrice(mrp, payable);
  if (struck === null) return null;

  const percent = Math.round(((struck - payable) / struck) * 100);
  if (percent <= 0) return null;

  const name = label?.trim();
  const reads = name && /[a-z]/i.test(name) ? name : null;
  return reads ? `${reads}, ${percent}% off` : `${percent}% off`;
}
