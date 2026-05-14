import { cn } from "@/shared/lib/utils/cn"

interface WorkspaceLoaderProps {
  message: string
  subMessage?: string
  className?: string
}

const PARTICLES = [
  { delay: '0s',     color: 'rgba(59,130,246,0.85)',  size: 5 },
  { delay: '0.75s',  color: 'rgba(6,182,212,0.75)',   size: 4 },
  { delay: '1.5s',   color: 'rgba(68,165,223,0.8)',   size: 4 },
  { delay: '2.25s',  color: 'rgba(59,130,246,0.65)',  size: 3 },
]

export const WorkspaceLoader = ({ message, subMessage, className }: WorkspaceLoaderProps) => (
  <div
    className={cn(
      "absolute inset-0 z-50 flex flex-col items-center justify-center",
      "backdrop-blur-[8px] bg-bg-main/55",
      className
    )}
  >
    {/* Top sliding progress bar */}
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-border-subtle overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-primary"
        style={{ animation: "loader-slide 1.5s ease-in-out infinite" }}
      />
    </div>

    {/* 3D logo scene */}
    <div className="flex flex-col items-center gap-5 select-none">
      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>

        {/* Radial glow backdrop */}
        <div
          className="absolute rounded-full"
          style={{
            width: 96, height: 96,
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(6,182,212,0.08) 50%, transparent 75%)',
            animation: 'loader-glow-pulse 2.4s ease-in-out infinite',
          }}
        />

        {/* Halo ring 1 — tilted like a planetary orbit */}
        <div
          className="absolute rounded-full"
          style={{
            width: 90, height: 90,
            border: '1.5px solid rgba(59,130,246,0.35)',
            transform: 'rotateX(72deg)',
            animation: 'loader-halo-pulse 2s ease-in-out infinite',
          }}
        />

        {/* Halo ring 2 — rotated 60° around Z for second orbit plane */}
        <div
          className="absolute rounded-full"
          style={{
            width: 76, height: 76,
            border: '1px solid rgba(6,182,212,0.28)',
            transform: 'rotateX(72deg) rotateZ(55deg)',
            animation: 'loader-halo-pulse 2.8s ease-in-out infinite 0.6s',
          }}
        />

        {/* Orbiting particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: '50%', left: '50%',
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
              width: p.size, height: p.size,
              borderRadius: '50%',
              background: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              animation: `loader-orbit-particle 3.2s linear infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}

        {/* Main logo — 3D float + subtle Y-axis tilt */}
        <div
          className="relative z-10"
          style={{
            animation: 'loader-float 4s ease-in-out infinite',
            filter:
              'drop-shadow(0 0 10px rgba(59,130,246,0.75)) drop-shadow(0 0 22px rgba(6,182,212,0.45))',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={48} height={48} />
        </div>

        {/* Subtle reflection below logo */}
        <div
          className="absolute z-10"
          style={{
            top: '62%',
            /* eslint-disable-next-line @next/next/no-img-element */
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            width={48}
            height={48}
            style={{
              opacity: 0.12,
              transform: 'scaleY(-1)',
              filter: 'blur(2px)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-semibold text-text-main tracking-tight">{message}</p>
        {subMessage && (
          <p className="text-xs text-text-muted animate-pulse">{subMessage}</p>
        )}
      </div>
    </div>
  </div>
)
