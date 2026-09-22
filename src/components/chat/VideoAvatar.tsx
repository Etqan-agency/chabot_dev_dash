import { cn } from '@/lib/cn'

const RING = 'conic-gradient(from 0deg, #e5a23c, #3e7cb1, #f2d785, #8ddb8c, #e5a23c)'

/**
 * The assistant's living avatar — plays the moving bot icon in a circle so it
 * looks like the bot is responding. When `glow` is set it gets a spinning,
 * pulsing gradient halo (used while answering).
 */
export function VideoAvatar({ className, glow = false }: { className?: string; glow?: boolean }) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      {glow && (
        <>
          <span
            aria-hidden
            className="animate-glow absolute -inset-[5px] rounded-full blur-md"
            style={{ background: RING }}
          />
          <span
            aria-hidden
            className="animate-spin-slow absolute -inset-[3px] rounded-full"
            style={{ background: RING }}
          />
        </>
      )}
      <span className="relative z-10 block size-full overflow-hidden rounded-full border-2 border-white bg-navy-900 shadow-md">
        <video
          src="/chtbot_moving_icon.webm"
          autoPlay
          loop
          muted
          playsInline
          className="size-full scale-105 object-cover"
        />
      </span>
    </span>
  )
}
