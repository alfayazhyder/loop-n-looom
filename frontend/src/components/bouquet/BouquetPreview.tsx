"use client";

import { flowerOptions, stemCount, type BouquetDesign, type FlowerId } from "@/lib/bouquetBuilder";

const positions = [
  [181, 92], [126, 110], [236, 112], [90, 153], [167, 151], [268, 158],
  [137, 196], [211, 196], [68, 199], [288, 207], [173, 239], [238, 240],
] as const;

function FlowerHead({
  kind,
  x,
  y,
  color,
}: {
  kind: FlowerId;
  x: number;
  y: number;
  color: string;
}) {
  const petalCount = kind === "daisy" ? 10 : kind === "sunflower" ? 11 : kind === "lavender" ? 5 : kind === "tulip" ? 5 : 8;
  const petalWidth = kind === "lavender" ? 6 : 11;
  const petalHeight = kind === "lavender" ? 14 : kind === "sunflower" ? 24 : 20;
  const offset = kind === "lavender" ? -11 : -16;
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      {Array.from({ length: petalCount }, (_, index) => (
        <ellipse
          key={index}
          cx="0"
          cy={offset}
          rx={petalWidth}
          ry={petalHeight}
          fill={kind === "daisy" ? "#FFF9F1" : color}
          fillOpacity={index % 2 === 0 ? 1 : 0.86}
          stroke="#896D64"
          strokeOpacity="0.18"
          strokeWidth="0.9"
          transform={`rotate(${(index * 360) / petalCount})`}
        />
      ))}
      <circle r={kind === "sunflower" ? 14 : 9} fill={kind === "sunflower" ? "#624534" : "#E6BA73"} />
      <circle r="3" fill="#FFF3CE" opacity="0.7" />
    </g>
  );
}

export default function BouquetPreview({ design }: { design: BouquetDesign }) {
  const flowers = flowerOptions.flatMap((flower) =>
    Array.from({ length: design.flowers[flower.id] }, () => flower.id),
  );
  const count = stemCount(design.flowers);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#E9DCD3] bg-[#FCF9F5]">
      <div className="relative bg-[radial-gradient(circle_at_50%_35%,#FFFFFF_5%,#F7EBE8_75%)] px-4 pt-6">
        <div className="absolute left-6 top-5 rounded-full bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#705F56] shadow-sm">
          Your live concept
        </div>
        <svg viewBox="0 0 360 405" role="img" aria-label={`Illustrated bouquet preview: ${count} flowers, ${design.palette.name} palette with ${design.wrap.name} wrapping and ${design.ribbon.name} ribbon`} className="mx-auto w-full max-w-[350px] drop-shadow-[0_15px_22px_rgba(74,59,50,0.14)]">
          <defs>
            <linearGradient id="bouquet-paper" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7C665C" stopOpacity="0.13" />
            </linearGradient>
          </defs>
          <ellipse cx="180" cy="380" rx="110" ry="12" fill="#B6A19A" opacity="0.16" />
          {flowers.map((_, index) => {
            const [x, y] = positions[index] ?? [180, 170];
            return (
              <g key={`stem-${index}`}>
                <path d={`M ${x} ${y + 14} Q ${x + 8} ${y + 74} 182 343`} fill="none" stroke="#7B9E7B" strokeWidth="3.6" strokeLinecap="round" />
                <ellipse cx={(x + 182) / 2 - 8} cy={(y + 343) / 2 - 14} rx="17" ry="8" fill="#94AD8A" transform={`rotate(-36 ${(x + 182) / 2 - 8} ${(y + 343) / 2 - 14})`} />
              </g>
            );
          })}
          <path d="M 75 225 L 179 354 L 300 222 L 260 340 L 181 387 L 107 343 Z" fill={design.wrap.color} stroke="#BAA49B" strokeWidth="1" />
          <path d="M 75 225 L 179 354 L 300 222 L 260 340 L 181 387 L 107 343 Z" fill="url(#bouquet-paper)" />
          <path d="M 75 225 L 179 354 L 300 222" fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="3" />
          {flowers.map((kind, index) => {
            const [x, y] = positions[index] ?? [180, 170];
            return <FlowerHead key={`${kind}-${index}`} kind={kind} x={x} y={y} color={design.palette.colors[index % design.palette.colors.length] ?? "#E8A5B2"} />;
          })}
          <path d="M 160 315 Q 175 300 184 320 Q 166 347 136 336 Q 143 322 160 315" fill={design.ribbon.color} stroke="#8F7971" strokeWidth="1" />
          <path d="M 203 315 Q 188 299 180 319 Q 195 347 228 337 Q 223 321 203 315" fill={design.ribbon.color} stroke="#8F7971" strokeWidth="1" />
          <circle cx="182" cy="323" r="9" fill={design.ribbon.color} stroke="#8F7971" strokeWidth="1" />
          <path d="M 178 326 Q 159 361 155 379 L 171 370 L 188 337 M 185 326 Q 202 354 211 380 L 219 367 L 192 329" fill={design.ribbon.color} stroke="#8F7971" strokeWidth="1" />
          {count === 0 && <text x="180" y="170" textAnchor="middle" fontSize="13" fill="#73645D">Choose your first flower</text>}
        </svg>
      </div>
      <div className="border-t border-[#E9DCD3] bg-white p-5 text-center">
        <p className="font-serif text-xl text-[#4A3B32]">{count} handmade flower {count === 1 ? "stem" : "stems"}</p>
        <p className="mt-2 text-xs leading-5 text-[#827168]">Illustrative concept, not a photograph or confirmed product. Actual yarn shades, arrangement and finish may differ.</p>
      </div>
    </div>
  );
}
