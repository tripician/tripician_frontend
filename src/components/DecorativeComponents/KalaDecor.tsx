/**
 * KalaDecor — Rich Indian kala / zentangle mandala SVG components.
 *
 * Three distinct highly-detailed patterns:
 *   <KalaMandala />   – Spiral-core → petal rings → triangle band → leaf crown → dot border
 *   <KalaLotus />     – Volute centre → lotus petals → scale arcs → feather crown → hatch ring
 *   <KalaGeometric /> – Star polygon core → diamond lattice → arch band → petal tips → triangle crown
 *
 * Props: size, color, opacity, style, className
 */

import React from 'react';

export interface KalaDecorProps {
  size?: number;
  color?: string;
  opacity?: number;
  style?: React.CSSProperties;
  className?: string;
}

const C = 150; // all patterns use 300 × 300 viewBox
const R = Math.PI / 180;

//  shared micro-helpers 

/** Filled almond petal from r1 → r2, width w, at angle deg */
function petal(r1: number, r2: number, w: number, deg: number, col: string, k: string) {
  const a = deg * R, pp = a + Math.PI / 2;
  const x0 = C + r1 * Math.cos(a), y0 = C + r1 * Math.sin(a);
  const x1 = C + r2 * Math.cos(a), y1 = C + r2 * Math.sin(a);
  const m = r1 + (r2 - r1) * 0.55;
  const mx = C + m * Math.cos(a), my = C + m * Math.sin(a);
  return (
    <path key={k} fill={col}
      d={`M${x0},${y0} Q${mx+w*Math.cos(pp)},${my+w*Math.sin(pp)} ${x1},${y1} Q${mx-w*Math.cos(pp)},${my-w*Math.sin(pp)} ${x0},${y0}Z`} />
  );
}

/** Ring of n filled petals */
function petalRing(n: number, r1: number, r2: number, w: number, off: number, col: string, pfx: string) {
  return Array.from({length: n}, (_, i) => petal(r1, r2, w, off + i * (360/n), col, `${pfx}${i}`));
}

/** Ring of n stroke-only petals */
function petalRingStroke(n: number, r1: number, r2: number, w: number, off: number, col: string, sw: number, pfx: string) {
  return Array.from({length: n}, (_, i) => {
    const deg = off + i * (360/n), a = deg * R, pp = a + Math.PI/2;
    const x0 = C+r1*Math.cos(a), y0 = C+r1*Math.sin(a);
    const x1 = C+r2*Math.cos(a), y1 = C+r2*Math.sin(a);
    const m = r1+(r2-r1)*0.55;
    const mx = C+m*Math.cos(a), my = C+m*Math.sin(a);
    return <path key={`${pfx}${i}`} fill="none" stroke={col} strokeWidth={sw}
      d={`M${x0},${y0} Q${mx+w*Math.cos(pp)},${my+w*Math.sin(pp)} ${x1},${y1} Q${mx-w*Math.cos(pp)},${my-w*Math.sin(pp)} ${x0},${y0}Z`} />;
  });
}

/** Ring of n small filled circles */
function dotRing(n: number, r: number, dr: number, col: string, pfx: string) {
  return Array.from({length: n}, (_, i) => {
    const a = (i*(360/n)) * R;
    return <circle key={`${pfx}${i}`} cx={C+r*Math.cos(a)} cy={C+r*Math.sin(a)} r={dr} fill={col} />;
  });
}

/** Ring of n isoceles triangles pointing outward */
function triRing(n: number, r: number, len: number, baseW: number, off: number, col: string, pfx: string) {
  return Array.from({length: n}, (_, i) => {
    const deg = off + i*(360/n), a = deg*R, pp = a+Math.PI/2;
    const tx = C+(r+len)*Math.cos(a), ty = C+(r+len)*Math.sin(a);
    const b1x = C+r*Math.cos(a)+baseW*Math.cos(pp), b1y = C+r*Math.sin(a)+baseW*Math.sin(pp);
    const b2x = C+r*Math.cos(a)-baseW*Math.cos(pp), b2y = C+r*Math.sin(a)-baseW*Math.sin(pp);
    return <polygon key={`${pfx}${i}`} points={`${tx},${ty} ${b1x},${b1y} ${b2x},${b2y}`} fill={col} />;
  });
}

/** Ring of n hatched arc segments (radial lines filling an annular band) */
function hatchBand(n: number, r1: number, r2: number, lineCount: number, off: number, col: string, sw: number, pfx: string) {
  const step = 360 / n;
  return Array.from({length: n}, (_, i) => {
    const baseDeg = off + i * step;
    return Array.from({length: lineCount}, (__, j) => {
      const frac = lineCount > 1 ? j/(lineCount-1) : 0.5;
      const ang = (baseDeg - (step*0.38) + frac*(step*0.76)) * R;
      return <line key={`${pfx}${i}-${j}`}
        x1={C+r1*Math.cos(ang)} y1={C+r1*Math.sin(ang)}
        x2={C+r2*Math.cos(ang)} y2={C+r2*Math.sin(ang)}
        stroke={col} strokeWidth={sw} />;
    });
  });
}

/** Ring of n leaf-shapes (round teardrop) pointing outward */
function leafRing(n: number, r: number, len: number, w: number, off: number, col: string, filled: boolean, sw: number, pfx: string) {
  return Array.from({length: n}, (_, i) => {
    const deg = off + i*(360/n), a = deg*R, pp = a+Math.PI/2;
    const tipX = C+(r+len)*Math.cos(a), tipY = C+(r+len)*Math.sin(a);
    const baseX = C+r*Math.cos(a), baseY = C+r*Math.sin(a);
    const c1x = baseX+w*Math.cos(pp), c1y = baseY+w*Math.sin(pp);
    const c2x = baseX-w*Math.cos(pp), c2y = baseY-w*Math.sin(pp);
    return <path key={`${pfx}${i}`}
      fill={filled ? col : 'none'} stroke={col} strokeWidth={sw}
      d={`M${baseX},${baseY} Q${c1x},${c1y} ${tipX},${tipY} Q${c2x},${c2y} ${baseX},${baseY}Z`} />;
  });
}

/** Spiral path (Archimedean) from r0→r1 over turns */
function spiralPath(r0: number, r1: number, turns: number, steps: number, col: string, sw: number) {
  const pts = Array.from({length: steps+1}, (_, i) => {
    const t = i/steps, a = turns * 2 * Math.PI * t;
    const r = r0 + (r1-r0)*t;
    return `${i===0?'M':'L'}${C+r*Math.cos(a-Math.PI/2)},${C+r*Math.sin(a-Math.PI/2)}`;
  }).join(' ');
  return <path fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" d={pts} />;
}

/** n radial lines from r1 to r2 */
function spokeRing(n: number, r1: number, r2: number, off: number, col: string, sw: number, pfx: string) {
  return Array.from({length: n}, (_, i) => {
    const a = (off + i*(360/n)) * R;
    return <line key={`${pfx}${i}`} x1={C+r1*Math.cos(a)} y1={C+r1*Math.sin(a)}
      x2={C+r2*Math.cos(a)} y2={C+r2*Math.sin(a)} stroke={col} strokeWidth={sw} />;
  });
}

/** n scale arcs (concave inward, fish-scale style) at radius r */
function scaleRing(n: number, r: number, depth: number, off: number, col: string, sw: number, pfx: string) {
  const step = 360/n;
  return Array.from({length: n}, (_, i) => {
    const a1 = (off + i*step) * R;
    const a2 = (off + (i+1)*step) * R;
    const x1 = C+r*Math.cos(a1), y1 = C+r*Math.sin(a1);
    const x2 = C+r*Math.cos(a2), y2 = C+r*Math.sin(a2);
    const mid = (a1+a2)/2;
    const cx_ = C+(r-depth)*Math.cos(mid), cy_ = C+(r-depth)*Math.sin(mid);
    return <path key={`${pfx}${i}`} fill="none" stroke={col} strokeWidth={sw}
      d={`M${x1},${y1} Q${cx_},${cy_} ${x2},${y2}`} />;
  });
}

//  KalaMandala 
// Zones (inside → out):
//   1. Spiral volute core
//   2. Filled petal ring (8)
//   3. Dot border + stroke circle
//   4. Inner hatch band (16 segments, 4 lines each)
//   5. Stroke circle + dot ring
//   6. Large petal crown (12) filled
//   7. Tiny triangle spikes (24) outward
//   8. Scale arc ring
//   9. Outer leaf ring (16) stroke-only
//  10. Fine dot border + outermost circle
export const KalaMandala: React.FC<KalaDecorProps> = ({ size=300, color='#C41E3A', opacity=0.08, style, className }) => (
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    style={{ opacity, pointerEvents:'none', display:'block', ...style }}
    className={className} aria-hidden="true">

    {/* 1. Spiral core */}
    <circle cx={C} cy={C} r={4} fill={color} />
    {spiralPath(2, 10, 2.5, 120, color, 0.9)}
    <circle cx={C} cy={C} r={12} fill="none" stroke={color} strokeWidth={1.2} />

    {/* 2. Inner petal ring — 8 petals, filled */}
    {petalRing(8, 13, 28, 6.5, 0, color, 'km-p1-')}
    {/* small dot between each petal */}
    {dotRing(8, 29, 1.8, color, 'km-db1-')}

    {/* 3. Concentric stroke circle + fine dot ring */}
    <circle cx={C} cy={C} r={33} fill="none" stroke={color} strokeWidth={0.8} />
    {dotRing(24, 36, 1.4, color, 'km-dr1-')}
    <circle cx={C} cy={C} r={40} fill="none" stroke={color} strokeWidth={0.7} />

    {/* 4. Hatch band 40→56, 16 segments × 5 lines */}
    {hatchBand(16, 41, 55, 5, 0, color, 0.65, 'km-hb1-')}
    <circle cx={C} cy={C} r={57} fill="none" stroke={color} strokeWidth={0.9} />

    {/* 5. Medium petal ring — 12 petals, filled */}
    {petalRing(12, 58, 80, 9, 0, color, 'km-p2-')}
    {petalRingStroke(12, 58, 80, 4, 15, color, 0.5, 'km-p2s-')}
    {dotRing(24, 82, 1.6, color, 'km-dr2-')}
    <circle cx={C} cy={C} r={87} fill="none" stroke={color} strokeWidth={0.8} />

    {/* 6. Scale arc ring between r=88 and r=100 */}
    {scaleRing(24, 94, 8, 0, color, 0.75, 'km-sc1-')}
    <circle cx={C} cy={C} r={101} fill="none" stroke={color} strokeWidth={0.8} />

    {/* 7. Large petal crown — 8 wide petals, filled + stroke inner line */}
    {petalRing(8, 102, 130, 14, 22.5, color, 'km-p3-')}
    {petalRingStroke(8, 102, 130, 5, 22.5, color, 0.6, 'km-p3s-')}

    {/* 8. Triangle spike ring — 24 outward pointing, between petals */}
    {triRing(24, 130, 10, 3.5, 0, color, 'km-tr1-')}
    {dotRing(24, 132, 1.3, color, 'km-dr3-')}
    <circle cx={C} cy={C} r={142} fill="none" stroke={color} strokeWidth={0.75} />

    {/* 9. Outer leaf ring — 16 stroke-only leaves */}
    {leafRing(16, 143, 14, 5.5, 0, color, false, 0.7, 'km-lf1-')}
    {dotRing(32, 144, 1.1, color, 'km-dr4-')}

    {/* 10. Outermost double circle */}
    <circle cx={C} cy={C} r={148} fill="none" stroke={color} strokeWidth={1.0} />
  </svg>
);

//  KalaLotus 
// Zones (inside → out):
//   1. 3-loop volute centre
//   2. Tiny petal burst (8)
//   3. Spoke ring (16)
//   4. Filled scale arcs
//   5. Wide petal ring (8) filled
//   6. Offset petal ring (8) stroke
//   7. Triangle crown (16) filled
//   8. Hatch band
//   9. Leaf ring (12) mixed
//  10. Dot-diamond outer border
export const KalaLotus: React.FC<KalaDecorProps> = ({ size=300, color='#C41E3A', opacity=0.08, style, className }) => (
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    style={{ opacity, pointerEvents:'none', display:'block', ...style }}
    className={className} aria-hidden="true">

    {/* 1. Volute / triple-loop core */}
    <circle cx={C} cy={C} r={5} fill={color} />
    {spiralPath(3, 11, 1.8, 80, color, 0.85)}
    <circle cx={C} cy={C} r={13} fill="none" stroke={color} strokeWidth={1.1} />

    {/* 2. Tiny petal burst — 8 petals, very short */}
    {petalRing(8, 14, 24, 5, 22.5, color, 'kl-p0-')}

    {/* 3. Fine dotted ring */}
    {dotRing(16, 27, 1.6, color, 'kl-dr0-')}
    <circle cx={C} cy={C} r={31} fill="none" stroke={color} strokeWidth={0.7} />

    {/* 4. Spoke ring — 16 spokes r=32→44 */}
    {spokeRing(16, 32, 44, 0, color, 0.6, 'kl-sp1-')}
    <circle cx={C} cy={C} r={45} fill="none" stroke={color} strokeWidth={0.8} />

    {/* 5. Scale arc ring at r=52, depth=9 */}
    {scaleRing(20, 52, 9, 0, color, 0.8, 'kl-sc1-')}
    {dotRing(20, 58, 1.5, color, 'kl-dr1-')}
    <circle cx={C} cy={C} r={62} fill="none" stroke={color} strokeWidth={0.8} />

    {/* 6. Wide lotus petal ring — 8 filled */}
    {petalRing(8, 63, 98, 15, 0, color, 'kl-p1-')}
    {/* inner vein line on each petal */}
    {spokeRing(8, 63, 97, 0, color, 0.55, 'kl-vn1-')}

    {/* 7. Offset petal ring — 8 stroke-only, between main petals */}
    {petalRingStroke(8, 63, 88, 11, 22.5, color, 0.7, 'kl-p1s-')}
    {dotRing(16, 100, 1.8, color, 'kl-dr2-')}
    <circle cx={C} cy={C} r={105} fill="none" stroke={color} strokeWidth={0.85} />

    {/* 8. Triangle crown — 16 triangles pointing out */}
    {triRing(16, 106, 12, 4, 11.25, color, 'kl-tr1-')}
    <circle cx={C} cy={C} r={120} fill="none" stroke={color} strokeWidth={0.75} />

    {/* 9. Hatch band 121→133, 12 segments × 4 lines */}
    {hatchBand(12, 121, 133, 4, 0, color, 0.6, 'kl-hb1-')}
    <circle cx={C} cy={C} r={135} fill="none" stroke={color} strokeWidth={0.8} />

    {/* 10. Outer leaf ring — 12 filled leaves */}
    {leafRing(12, 136, 12, 5, 0, color, true, 0.5, 'kl-lf1-')}
    {dotRing(36, 141, 1.1, color, 'kl-dr3-')}
    <circle cx={C} cy={C} r={146} fill="none" stroke={color} strokeWidth={1.0} />
  </svg>
);

//  KalaGeometric 
// Zones (inside → out):
//   1. Cross + circle core
//   2. Star of David (6-point) fill
//   3. Dot ring + stroke circle
//   4. 8-point star outline (spokes visible through)
//   5. Diamond lattice ring
//   6. Hatch band (16 seg)
//   7. Petal ring (16) filled
//   8. Triangle ring (32) pointing out
//   9. Scale arcs
//  10. Leaf tips + outer double ring
export const KalaGeometric: React.FC<KalaDecorProps> = ({ size=300, color='#C41E3A', opacity=0.08, style, className }) => {
  // 8-pointed star polygon
  const star8 = (rO: number, rI: number) =>
    Array.from({length:16}, (_,i) => {
      const a = (i*22.5 - 90) * R;
      const r = i%2===0 ? rO : rI;
      return `${C+r*Math.cos(a)},${C+r*Math.sin(a)}`;
    }).join(' ');

  // 6-pointed star (two overlapping equilateral triangles)
  const tri6 = (r: number, offDeg: number) =>
    Array.from({length:3}, (_,i) => {
      const a = (offDeg + i*120) * R;
      return `${C+r*Math.cos(a)},${C+r*Math.sin(a)}`;
    }).join(' ');

  return (
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"
      width={size} height={size}
      style={{ opacity, pointerEvents:'none', display:'block', ...style }}
      className={className} aria-hidden="true">

      {/* 1. Cross core */}
      <circle cx={C} cy={C} r={4} fill={color} />
      {spokeRing(4, 0, 10, -45, color, 1.1, 'kg-cr-')}
      <circle cx={C} cy={C} r={12} fill="none" stroke={color} strokeWidth={1.1} />

      {/* 2. 6-point star fill */}
      <polygon points={tri6(22, -90)} fill={color} />
      <polygon points={tri6(22, -30)} fill={color} />
      <circle cx={C} cy={C} r={24} fill="none" stroke={color} strokeWidth={0.8} />

      {/* 3. Dot ring + stroke circle */}
      {dotRing(12, 28, 2.0, color, 'kg-dr0-')}
      <circle cx={C} cy={C} r={33} fill="none" stroke={color} strokeWidth={0.9} />

      {/* 4. 8-pointed star outline + spokes */}
      <polygon points={star8(46, 28)} fill="none" stroke={color} strokeWidth={1.1} />
      {spokeRing(8, 28, 46, -90, color, 0.6, 'kg-sp1-')}
      <circle cx={C} cy={C} r={50} fill="none" stroke={color} strokeWidth={0.7} />

      {/* 5. Diamond lattice — 16 small diamonds around r=60 */}
      {Array.from({length:16}, (_,i) => {
        const deg = i*22.5, a = deg*R, pp = a+Math.PI/2;
        const cx_ = C+60*Math.cos(a), cy_ = C+60*Math.sin(a);
        const sz = 7;
        const pts = `${cx_+sz*Math.cos(a)},${cy_+sz*Math.sin(a)} ${cx_+sz*0.5*Math.cos(pp)},${cy_+sz*0.5*Math.sin(pp)} ${cx_-sz*Math.cos(a)},${cy_-sz*Math.sin(a)} ${cx_-sz*0.5*Math.cos(pp)},${cy_-sz*0.5*Math.sin(pp)}`;
        return <polygon key={`kg-dm-${i}`} points={pts} fill={color} />;
      })}
      {dotRing(16, 70, 1.6, color, 'kg-dr1-')}
      <circle cx={C} cy={C} r={75} fill="none" stroke={color} strokeWidth={0.85} />

      {/* 6. Hatch band 76→90, 16 segs × 5 lines */}
      {hatchBand(16, 77, 89, 5, 0, color, 0.6, 'kg-hb1-')}
      <circle cx={C} cy={C} r={91} fill="none" stroke={color} strokeWidth={0.9} />

      {/* 7. Petal ring — 16 filled petals */}
      {petalRing(16, 92, 114, 9, 0, color, 'kg-p1-')}
      {dotRing(16, 116, 1.5, color, 'kg-dr2-')}
      <circle cx={C} cy={C} r={120} fill="none" stroke={color} strokeWidth={0.8} />

      {/* 8. Triangle ring — 24 pointing outward */}
      {triRing(24, 121, 10, 3.5, 7.5, color, 'kg-tr1-')}
      <circle cx={C} cy={C} r={133} fill="none" stroke={color} strokeWidth={0.75} />

      {/* 9. Scale arc outer ring */}
      {scaleRing(24, 139, 7, 0, color, 0.7, 'kg-sc1-')}
      {dotRing(32, 143, 1.1, color, 'kg-dr3-')}

      {/* 10. Double outer ring */}
      <circle cx={C} cy={C} r={146} fill="none" stroke={color} strokeWidth={0.7} />
      <circle cx={C} cy={C} r={149} fill="none" stroke={color} strokeWidth={1.0} />
    </svg>
  );
};
