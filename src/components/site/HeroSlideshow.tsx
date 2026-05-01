'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'

export type HeroSlide = {
  src: string
  label: string
  href: string
}

type Props = {
  slides: HeroSlide[]
  brandName: string
  tagline: string
  ctaLabel: string
  ctaHref: string
  contactLabel: string
  contactHref: string
  indicatorLabel: string
  intervalMs?: number
  fadeMs?: number
}

export default function HeroSlideshow({
  slides,
  brandName,
  tagline,
  ctaLabel,
  ctaHref,
  contactLabel,
  contactHref,
  indicatorLabel,
  intervalMs = 5000,
  fadeMs = 1500,
}: Props) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const id = setInterval(() => {
      setActive((a) => (a + 1) % slides.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [slides.length, intervalMs])

  if (!slides.length) return null

  const activeSlide = slides[active]

  return (
    <section className="relative h-[100vh] min-h-[560px] -mt-[1px] overflow-hidden bg-(--color-canvas)">
      {/* Crossfade-stack van foto's */}
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              opacity: i === active ? 1 : 0,
              transition: `opacity ${fadeMs}ms ease-in-out`,
            }}
            aria-hidden="true"
          >
            <Image
              src={s.src}
              alt=""
              fill
              priority={i < 2}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/85" />
      </div>

      {/* Frosted-glass card met titel/tagline/CTA's — celine-stijl, links uitgelijnd */}
      <div className="relative h-full flex items-center px-6 md:px-12 lg:px-20">
        <div
          className="max-w-2xl w-full p-10 md:p-14 backdrop-blur-md border border-white/15 text-white"
          style={{ background: 'rgba(10, 9, 8, 0.45)' }}
        >
          <p className="text-xs md:text-sm uppercase tracking-[0.2em] mb-6 text-(--color-bronze)">
            Atelier Montreuil
          </p>
          <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-display)] mb-6 leading-none">
            {brandName}
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/90">
            {tagline}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-(--color-bronze) hover:text-white transition-colors text-sm uppercase tracking-[0.2em]"
            >
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={contactHref}
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/40 text-white hover:bg-white/10 transition-colors text-sm uppercase tracking-[0.2em]"
            >
              <MessageCircle className="w-4 h-4" />
              {contactLabel}
            </Link>
          </div>
        </div>
      </div>

      {/* Categorie-indicator rechtsonder, met blur backdrop */}
      <Link
        key={`indicator-${active}`}
        href={activeSlide.href}
        className="absolute right-6 bottom-6 md:right-10 md:bottom-10 z-10 group"
        style={{ transition: `opacity ${fadeMs}ms ease-in-out` }}
      >
        <div className="px-5 py-3 backdrop-blur-md bg-white/10 border border-white/20 text-white flex items-center gap-3 hover:bg-white/20 transition-colors">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-70">
              {indicatorLabel}
            </div>
            <div className="text-base font-[family-name:var(--font-display)]">
              {activeSlide.label}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-(--color-bronze) group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Progress dots, midden onderaan */}
      <div className="absolute left-0 right-0 bottom-6 md:bottom-10 flex justify-center gap-2 z-10 pointer-events-none">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1 transition-all ${
              i === active ? 'w-8 bg-white' : 'w-3 bg-white/40'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  )
}
