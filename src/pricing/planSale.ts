/**
 * Whether a plan's price is actually struck through, and at what.
 *
 * The server sends both numbers: what is payable now, and the MRP it was before
 * the sale. This decides whether showing both is honest, and it refuses in every
 * case where it would not be. A permanent strike-through against a price nobody
 * ever paid is the oldest trick in retail and the fastest way to stop being
 * believed, so the rule lives here where it can be tested rather than inside a
 * component that cannot be.
 */
export function strikePrice(mrp: number | null | undefined, payable: number): number | null {
  // An older server sends no MRP at all. One number is the right answer then.
  if (typeof mrp !== 'number' || !Number.isFinite(mrp)) return null;

  // A sale that moves nothing is not a sale, and a free plan has nothing to cut.
  if (payable <= 0 || mrp <= payable) return null;

  return mrp;
}

/**
 * How a running sale names itself beside a struck-through price.
 *
 * The percentage is worked out here, per period, rather than sent by the server.
 * A discount is a prepared pair of Razorpay plans holding two real prices, and
 * the saving on a monthly plan is rarely the same as the saving on an annual
 * one, so a single percentage would be wrong for one of them.
 *
 * A name is used only when it reads like a reason: a label that is just digits
 * renders next to a price as a stray number, which is exactly what "99" looked
 * like under Tripician Pro.
 */
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
