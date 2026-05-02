'use client'

import { useMemo, useState } from 'react'

type Point = { date: string; visitors: number }

type Props = {
  data: Point[]
}

/** Eenvoudige SVG line chart — geen externe lib. */
export default function ViewsLineChart({ data }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const w = 800
  const h = 220
  const pad = { top: 16, right: 16, bottom: 30, left: 36 }
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom

  const max = Math.max(1, ...data.map((d) => d.visitors))
  const yTicks = 4

  const points = useMemo(() => {
    if (data.length === 0) return []
    const step = data.length > 1 ? innerW / (data.length - 1) : 0
    return data.map((d, i) => ({
      x: pad.left + i * step,
      y: pad.top + innerH - (d.visitors / max) * innerH,
      ...d,
    }))
  }, [data, innerW, innerH, pad.left, pad.top, max])

  const path = useMemo(() => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }, [points])

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    const start = `M ${points[0].x} ${pad.top + innerH}`
    const line = points.map((p) => `L ${p.x} ${p.y}`).join(' ')
    const end = `L ${points[points.length - 1].x} ${pad.top + innerH} Z`
    return `${start} ${line} ${end}`
  }, [points, pad.top, innerH])

  const total = data.reduce((s, d) => s + d.visitors, 0)

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = pad.top + (i * innerH) / yTicks
          const value = Math.round(max - (i * max) / yTicks)
          return (
            <g key={i}>
              <line
                x1={pad.left}
                x2={w - pad.right}
                y1={y}
                y2={y}
                stroke="currentColor"
                opacity={0.08}
                strokeWidth={1}
              />
              <text
                x={pad.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-current"
                opacity={0.5}
                fontSize={10}
              >
                {value}
              </text>
            </g>
          )
        })}

        {/* Area */}
        {areaPath && (
          <path d={areaPath} fill="var(--color-bronze)" opacity={0.12} />
        )}
        {/* Line */}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="var(--color-bronze)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover-area + dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill="var(--color-bronze)"
              stroke="var(--color-canvas)"
              strokeWidth={2}
            />
            {/* Onzichtbare grotere hover-target */}
            <rect
              x={p.x - 14}
              y={pad.top}
              width={28}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}

        {/* X-as labels — alleen eerste, midden, laatste */}
        {points.length > 0 && (
          <>
            <text
              x={points[0].x}
              y={h - 10}
              textAnchor="start"
              className="fill-current"
              opacity={0.6}
              fontSize={10}
            >
              {points[0].date.slice(5)}
            </text>
            {points.length > 2 && (
              <text
                x={points[Math.floor(points.length / 2)].x}
                y={h - 10}
                textAnchor="middle"
                className="fill-current"
                opacity={0.6}
                fontSize={10}
              >
                {points[Math.floor(points.length / 2)].date.slice(5)}
              </text>
            )}
            <text
              x={points[points.length - 1].x}
              y={h - 10}
              textAnchor="end"
              className="fill-current"
              opacity={0.6}
              fontSize={10}
            >
              {points[points.length - 1].date.slice(5)}
            </text>
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hover !== null && points[hover] && (
        <div
          className="absolute pointer-events-none px-2 py-1 bg-(--color-canvas) border border-(--color-frame) text-xs text-(--color-ink) shadow-lg"
          style={{
            left: `${(points[hover].x / w) * 100}%`,
            top: `${(points[hover].y / h) * 100}%`,
            transform: 'translate(-50%, -120%)',
          }}
        >
          <div className="text-[10px] text-(--color-stone) uppercase tracking-[0.15em]">
            {points[hover].date}
          </div>
          <div className="font-[family-name:var(--font-display)]">
            {points[hover].visitors} {points[hover].visitors === 1 ? 'visiteur' : 'visiteurs'}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-(--color-stone)">
        Total période: {total} {total === 1 ? 'visiteur' : 'visiteurs'} uniques
      </p>
    </div>
  )
}
