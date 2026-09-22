import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  FileText,
  Globe,
  HelpCircle,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Plug,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import { Wordmark } from '@/components/Logo'
import { VideoAvatar } from '@/components/chat/VideoAvatar'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useI18n } from '@/hooks/useI18n'

const CONTACT_EMAIL = 'etqan.agency.company@gmail.com'

/**
 * Public marketing site — standalone (no dashboard shell). Aurora hero with a
 * live chat mockup, glass cards, bento features, and scroll-reveal sections.
 */
export default function MarketingPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen scroll-smooth bg-bg text-fg">
      <MarketingNav />
      <Hero />

      {/* About */}
      <Section id="about" eyebrow={t('mk.nav.about')} title={t('mk.about.title')}>
        <Reveal className="mx-auto max-w-3xl space-y-4 text-center text-lg text-muted">
          <p>{t('mk.about.p1')}</p>
          <p>{t('mk.about.p2')}</p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {(
            [
              [BadgeCheck, 'mk.about.card1', 'from-brand-400 to-brand-600'],
              [Globe, 'mk.about.card2', 'from-steel-300 to-steel-600'],
              [ShieldCheck, 'mk.about.card3', 'from-success to-steel-500'],
            ] as const
          ).map(([Icon, key, grad], i) => (
            <Reveal key={key} delay={i * 120}>
              <div className="group h-full rounded-2xl border border-border bg-surface p-7 text-center shadow-sm shadow-navy-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-300/60 hover:shadow-xl hover:shadow-brand-500/10">
                <span
                  className={cn(
                    'mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110',
                    grad,
                  )}
                >
                  <Icon className="size-7" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-fg">{t(`${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${key}.desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Features — bento grid */}
      <Section
        id="features"
        eyebrow={t('mk.nav.features')}
        title={t('mk.features.title')}
        subtitle={t('mk.features.subtitle')}
        tinted
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {(
            [
              [FileText, 'mk.features.f1', 'lg:col-span-4', 'from-brand-400 to-brand-600'],
              [Plug, 'mk.features.f2', 'lg:col-span-2', 'from-steel-300 to-steel-600'],
              [Bot, 'mk.features.f3', 'lg:col-span-2', 'from-navy-400 to-navy-700'],
              [HelpCircle, 'mk.features.f4', 'lg:col-span-2', 'from-success to-steel-500'],
              [BarChart3, 'mk.features.f5', 'lg:col-span-2', 'from-brand-300 to-brand-500'],
              [MessageCircle, 'mk.features.f6', 'lg:col-span-6', 'from-success to-steel-400'],
            ] as const
          ).map(([Icon, key, span, grad], i) => (
            <Reveal key={key} delay={(i % 3) * 100} className={span}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-surface p-7 shadow-sm shadow-navy-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300/60 hover:shadow-xl hover:shadow-brand-500/10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full bg-brand-500/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                />
                <span
                  className={cn(
                    'flex size-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110',
                    grad,
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-fg">{t(`${key}.title`)}</h3>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
                  {t(`${key}.desc`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Blog */}
      <Section
        id="blog"
        eyebrow={t('mk.nav.blog')}
        title={t('mk.blog.title')}
        subtitle={t('mk.blog.subtitle')}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {(
            [
              ['from-brand-400 via-brand-500 to-brand-700', Sparkles],
              ['from-steel-300 via-steel-500 to-navy-700', FileText],
              ['from-navy-400 via-steel-500 to-brand-500', Globe],
            ] as const
          ).map(([grad, Icon], idx) => {
            const i = (idx + 1) as 1 | 2 | 3
            return (
              <Reveal key={i} delay={idx * 120}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm shadow-navy-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand-500/10">
                  <div
                    className={cn(
                      'relative flex h-36 items-center justify-center bg-gradient-to-br',
                      grad,
                    )}
                  >
                    <div aria-hidden className="mk-grid absolute inset-0 opacity-60" />
                    <Icon className="size-12 text-white/85 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6" />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-full bg-steel-500/10 px-2.5 py-1 font-medium text-steel-600 dark:text-steel-300">
                        {t(`mk.blog.p${i}.tag`)}
                      </span>
                      <span className="text-faint">{t(`mk.blog.p${i}.date`)}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug text-fg group-hover:text-brand-700 dark:group-hover:text-brand-400">
                      {t(`mk.blog.p${i}.title`)}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {t(`mk.blog.p${i}.excerpt`)}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {t('mk.blog.readMore')}
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                    </span>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* Author */}
      <Section id="author" eyebrow={t('mk.nav.author')} title={t('mk.author.title')} tinted>
        <Reveal>
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center shadow-lg shadow-navy-900/5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(229,162,60,0.15),transparent)]"
            />
            <span className="relative mx-auto block size-24">
              <span
                aria-hidden
                className="animate-spin-slow absolute -inset-1 rounded-full opacity-80"
                style={{
                  background:
                    'conic-gradient(from 0deg, #e5a23c, #3e7cb1, #f2d785, #e5a23c)',
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy-800 text-3xl font-bold text-brand-400 ring-4 ring-surface">
                {t('mk.author.name').slice(0, 1)}
              </span>
            </span>
            <p className="mt-6 text-2xl font-bold text-fg">{t('mk.author.name')}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              {t('mk.author.role')}
            </p>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted">{t('mk.author.bio')}</p>
            <a
              href="#contact"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface2 px-5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/10"
            >
              <Mail className="size-4" /> {t('mk.author.cta')}
            </a>
          </div>
        </Reveal>
      </Section>

      {/* Contact — gradient CTA panel */}
      <Section id="contact" eyebrow={t('mk.nav.contact')} title="">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-8 py-16 text-center shadow-2xl shadow-navy-900/30">
            <div aria-hidden className="mk-grid absolute inset-0" />
            <div
              aria-hidden
              className="animate-blob pointer-events-none absolute -start-20 -top-24 size-80 rounded-full bg-brand-500/25 blur-3xl"
            />
            <div
              aria-hidden
              className="animate-blob pointer-events-none absolute -bottom-24 -end-20 size-80 rounded-full bg-steel-500/25 blur-3xl"
              style={{ animationDelay: '-8s' }}
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-cream-50 sm:text-4xl">
                {t('mk.contact.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-navy-200">{t('mk.contact.subtitle')}</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-8 inline-flex h-13 items-center gap-3 rounded-2xl bg-brand-500 px-7 py-3.5 text-base font-bold text-navy-900 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-xl hover:shadow-brand-500/40"
              >
                <Mail className="size-5" /> <bdi dir="ltr">{CONTACT_EMAIL}</bdi>
              </a>
              <p className="mt-5 text-sm text-navy-300">{t('mk.contact.note')}</p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface2/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-12 text-center sm:flex-row sm:justify-between sm:text-start">
          <div>
            <Wordmark subtitle="AI" />
            <p className="mt-2 max-w-xs text-sm text-muted">{t('mk.footer.tagline')}</p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-muted transition-colors hover:text-fg">
                  {t(l.key)}
                </a>
              ))}
            </nav>
            <p className="text-sm text-faint">
              © 2026 {t('mk.author.name')} · {t('mk.footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  const { t } = useI18n()

  return (
    <section className="relative overflow-hidden bg-navy-900 text-cream-50">
      {/* Layered background: blueprint grid + drifting aurora blobs */}
      <div aria-hidden className="mk-grid absolute inset-0" />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -top-40 start-1/4 size-[34rem] rounded-full bg-brand-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -bottom-32 -end-24 size-[30rem] rounded-full bg-steel-500/20 blur-3xl"
        style={{ animationDelay: '-6s' }}
      />
      <div
        aria-hidden
        className="animate-blob pointer-events-none absolute -start-32 top-1/2 size-72 rounded-full bg-brand-300/10 blur-3xl"
        style={{ animationDelay: '-11s' }}
      />
      <Particles />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-2 lg:pb-32 lg:pt-28">
        {/* Copy */}
        <div className="text-center lg:text-start">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-sm font-medium text-brand-300 backdrop-blur">
              <Sparkles className="size-4" /> {t('mk.hero.badge')}
            </span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              <span className="mk-text-gradient">{t('mk.hero.title')}</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-navy-200 lg:mx-0">
              {t('mk.hero.subtitle')}
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link
                to="/register"
                className="group inline-flex h-13 items-center gap-2 rounded-2xl bg-brand-500 px-7 py-3.5 text-base font-bold text-navy-900 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-xl hover:shadow-brand-500/40"
              >
                {t('mk.hero.cta')}
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
              <a
                href="#about"
                className="inline-flex h-13 items-center rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-base font-medium text-cream-50 backdrop-blur transition-colors hover:bg-white/10"
              >
                {t('mk.hero.cta2')}
              </a>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-navy-200 lg:justify-start">
              {(['mk.hero.point1', 'mk.hero.point2', 'mk.hero.point3'] as const).map((k) => (
                <li key={k} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand-400" /> {t(k)}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={500}>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 max-lg:mx-auto">
              {(['mk.stat1', 'mk.stat2', 'mk.stat3'] as const).map((k) => (
                <div
                  key={k}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-center backdrop-blur"
                >
                  <p className="text-xl font-extrabold text-brand-400">{t(`${k}.v`)}</p>
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-navy-200">
                    {t(`${k}.l`)}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Live chat mockup */}
        <Reveal delay={250}>
          <ChatMockup />
        </Reveal>
      </div>

      {/* Capability ticker */}
      <CapabilityMarquee />

      {/* Fade into the page background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-bg"
      />
    </section>
  )
}

/** Twinkling amber/steel dots drifting over the hero. */
function Particles() {
  // Hand-placed so the layout is stable and balanced (no Math.random in render).
  const dots: Array<[string, string, string, number, string]> = [
    ['8%', '22%', '4px', 0, '#e5a23c'],
    ['16%', '68%', '3px', 1.2, '#8fb6d8'],
    ['26%', '12%', '5px', 2.1, '#f2d785'],
    ['38%', '80%', '3px', 0.6, '#e5a23c'],
    ['47%', '30%', '4px', 3.2, '#8fb6d8'],
    ['58%', '14%', '3px', 1.8, '#f2d785'],
    ['66%', '74%', '5px', 2.6, '#e5a23c'],
    ['76%', '24%', '3px', 0.9, '#8fb6d8'],
    ['86%', '58%', '4px', 3.8, '#f2d785'],
    ['93%', '18%', '3px', 1.5, '#e5a23c'],
  ]
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map(([left, top, size, delay, color], i) => (
        <span
          key={i}
          className="animate-mk-twinkle absolute rounded-full"
          style={{
            left,
            top,
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 ${parseInt(size) * 3}px ${color}`,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Infinite scrolling strip of what the product does. */
function CapabilityMarquee() {
  const { t } = useI18n()
  const items = [
    'mk.features.f1.title',
    'mk.features.f2.title',
    'mk.features.f3.title',
    'mk.features.f4.title',
    'mk.features.f5.title',
    'mk.hero.point2',
    'mk.hero.point3',
  ] as const

  const strip = (
    <>
      {items.map((k) => (
        <span key={k} className="flex shrink-0 items-center gap-3">
          <Sparkles className="size-4 text-brand-400" />
          <span className="whitespace-nowrap text-sm font-medium tracking-wide text-navy-200">
            {t(k)}
          </span>
        </span>
      ))}
    </>
  )

  return (
    <div
      aria-hidden
      dir="ltr"
      className="relative border-t border-white/10 bg-white/[0.03] py-4 backdrop-blur [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <div className="animate-mk-marquee flex w-max items-center gap-10 pe-10">
        {strip}
        {strip}
      </div>
    </div>
  )
}

/** A floating, glassy fake conversation that sells the product at a glance. */
function ChatMockup() {
  const { t } = useI18n()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -7, y: px * 9 })
  }

  return (
    <div className="animate-float-y relative mx-auto w-full max-w-md">
      {/* Halo behind the card */}
      <div
        aria-hidden
        className="animate-mk-breathe pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-500/25 via-transparent to-steel-500/25 blur-2xl"
      />
      {/* Orbiting satellite ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 hidden lg:block"
      >
        <div className="absolute inset-0 rounded-full border border-dashed border-white/10" />
        <div className="animate-mk-orbit absolute inset-0">
          <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-brand-400 shadow-[0_0_12px_#e5a23c]" />
        </div>
        <div className="animate-mk-orbit absolute inset-4" style={{ animationDirection: 'reverse', animationDuration: '20s' }}>
          <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-steel-400 shadow-[0_0_10px_#5f97c4]" />
        </div>
      </div>
      <div
        onMouseMove={handleMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={{
          transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.25s ease-out',
        }}
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-navy-800/80 shadow-2xl shadow-navy-900/60 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
          <VideoAvatar className="size-10" glow />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-cream-50">{t('mk.demo.title')}</p>
            <p className="flex items-center gap-1.5 text-xs text-navy-200">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              {t('mk.demo.online')}
            </p>
          </div>
          <span className="rounded-full border border-brand-400/30 bg-brand-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
            AI
          </span>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-3.5 px-5 py-6">
          <div
            className="animate-msg-in self-end rounded-2xl rounded-ee-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-navy-900 shadow-md"
            style={{ animationDelay: '0.3s' }}
          >
            {t('mk.demo.q1')}
          </div>

          <div className="animate-msg-in max-w-[85%] self-start" style={{ animationDelay: '0.9s' }}>
            <div className="rounded-2xl rounded-ss-md border border-white/10 bg-white/10 px-4 py-3 text-sm leading-relaxed text-cream-50 shadow-md">
              {t('mk.demo.a1')}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-navy-200">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                <FileText className="size-3 text-brand-400" />
                <bdi dir="ltr">{t('mk.demo.source')}</bdi>
              </span>
              <span className="inline-flex items-center gap-1 text-success">
                <BadgeCheck className="size-3.5" /> {t('mk.demo.grounded')}
              </span>
            </div>
          </div>

          <div
            className="animate-msg-in self-end rounded-2xl rounded-ee-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-navy-900 shadow-md"
            style={{ animationDelay: '1.7s' }}
          >
            {t('mk.demo.q2')}
          </div>

          {/* Typing dots */}
          <div
            className="animate-msg-in flex items-center gap-1.5 self-start rounded-2xl rounded-ss-md border border-white/10 bg-white/10 px-4 py-3"
            style={{ animationDelay: '2.3s' }}
          >
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="animate-dot size-1.5 rounded-full bg-brand-400"
                style={{ animationDelay: `${d * 0.18}s` }}
              />
            ))}
          </div>
        </div>

        {/* Composer (decorative) */}
        <div className="border-t border-white/10 bg-white/5 px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-900/60 px-4 py-2.5">
            <span className="flex-1 text-sm text-navy-300">{t('mk.demo.placeholder')}</span>
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand-500 text-navy-900">
              <Send className="size-4 rtl:-scale-x-100" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- nav */

const NAV_LINKS = [
  { href: '#about', key: 'mk.nav.about' },
  { href: '#features', key: 'mk.nav.features' },
  { href: '#blog', key: 'mk.nav.blog' },
  { href: '#author', key: 'mk.nav.author' },
  { href: '#contact', key: 'mk.nav.contact' },
] as const

function MarketingNav() {
  const { t, lang, setLang } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy-900/80 text-cream-50 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <a href="#top" className="shrink-0 [&_*]:!text-cream-50">
          <Wordmark subtitle="AI" />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-navy-200 transition-colors hover:bg-white/10 hover:text-cream-50"
            >
              {t(l.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-navy-200 transition-colors hover:bg-white/10 hover:text-cream-50"
            aria-label={t('common.language')}
          >
            <Globe className="size-[18px]" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'EN' : 'ع'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-navy-200 transition-colors hover:bg-white/10 hover:text-cream-50"
            aria-label={t('common.theme.toggle')}
          >
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          {isAuthenticated ? (
            <Link
              to="/"
              className="hidden h-9 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-sm font-bold text-navy-900 shadow-md shadow-brand-500/25 transition-all hover:-translate-y-px hover:bg-brand-400 sm:inline-flex"
            >
              {t('mk.nav.console')} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-navy-200 transition-colors hover:bg-white/10 hover:text-cream-50 sm:block"
              >
                {t('mk.nav.login')}
              </Link>
              <Link
                to="/register"
                className="hidden h-9 items-center rounded-xl bg-brand-500 px-4 text-sm font-bold text-navy-900 shadow-md shadow-brand-500/25 transition-all hover:-translate-y-px hover:bg-brand-400 sm:inline-flex"
              >
                {t('mk.nav.signup')}
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-navy-200 hover:bg-white/10 md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-white/10 bg-navy-900 px-6 py-3 md:hidden">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-200 hover:bg-white/10 hover:text-cream-50"
            >
              {t(l.key)}
            </a>
          ))}
          <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
            {isAuthenticated ? (
              <Link
                to="/"
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 text-sm font-bold text-navy-900"
              >
                {t('mk.nav.console')} <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/15 text-sm font-medium text-cream-50"
                >
                  {t('mk.nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="flex h-10 flex-1 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-navy-900"
                >
                  {t('mk.nav.signup')}
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

/* -------------------------------------------------------------- helpers */

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  tinted,
  children,
}: {
  id: string
  eyebrow?: string
  title: string
  subtitle?: string
  tinted?: boolean
  children: React.ReactNode
}) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-24', tinted && 'bg-surface2/50')}>
      <div className="mx-auto max-w-6xl px-6">
        {(eyebrow || title) && (
          <Reveal className="text-center">
            {eyebrow && (
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
            )}
            {/* Hairline with a sweeping light beam */}
            <span
              aria-hidden
              className="relative mx-auto mt-6 block h-px w-28 overflow-hidden rounded-full bg-border"
            >
              <span className="animate-mk-beam absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
            </span>
            {subtitle && <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{subtitle}</p>}
          </Reveal>
        )}
        <div className={cn((eyebrow || title) && 'mt-12')}>{children}</div>
      </div>
    </section>
  )
}

/** Fades + slides children up the first time they scroll into view. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Anything already in (or near) the viewport shows right away — the
    // observer is only for content revealed by scrolling.
    if (
      !('IntersectionObserver' in window) ||
      el.getBoundingClientRect().top < window.innerHeight * 1.05
    ) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        'transition-all duration-700 ease-out',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className,
      )}
    >
      {children}
    </div>
  )
}
