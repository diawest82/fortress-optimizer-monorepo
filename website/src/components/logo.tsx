"use client";

interface LogoProps {
  variant?: "icon" | "monogram" | "full";
  className?: string;
  animated?: boolean;
}

export default function Logo({
  variant = "icon",
  className = "",
  animated = false,
}: LogoProps) {
  const iconClass = animated
    ? "animate-pulse"
    : "";

  if (variant === "full") {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        <div className="relative h-12 w-12">
          <svg
            viewBox="0 0 64 64"
            className={`h-full w-full ${iconClass}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Gradient defs */}
            <defs>
              <linearGradient
                id="fortressGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient
                id="accentGradient"
                x1="0%"
                y1="100%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Shield background */}
            <path
              d="M 32 4 L 52 14 L 52 32 Q 32 50 32 50 Q 12 32 12 32 L 12 14 Z"
              fill="url(#fortressGradient)"
              opacity="0.95"
            />

            {/* Shield border */}
            <path
              d="M 32 4 L 52 14 L 52 32 Q 32 50 32 50 Q 12 32 12 32 L 12 14 Z"
              stroke="url(#accentGradient)"
              strokeWidth="1.5"
              fill="none"
            />

            {/* Fortress towers - architectural fortress with crenellations */}
            <g>
              {/* Left tower */}
              <rect
                x="20"
                y="18"
                width="4"
                height="18"
                fill="#f0fdf4"
                opacity="0.9"
              />
              {/* Left tower crenellations */}
              <g fill="#a7f3d0" opacity="0.8">
                <rect x="20" y="16" width="0.95" height="2.3" />
                <rect x="23" y="16" width="0.95" height="2.3" />
              </g>

              {/* Center tall tower */}
              <rect
                x="31"
                y="8"
                width="4"
                height="28"
                fill="#f0fdf4"
                opacity="0.95"
              />
              {/* Center tower crenellations - more prominent */}
              <g fill="#6ee7b7" opacity="0.9">
                <rect x="31" y="6" width="1" height="2.3" />
                <rect x="33.5" y="6" width="1" height="2.3" />
                <rect x="36" y="6" width="1" height="2.3" />
              </g>

              {/* Right tower */}
              <rect
                x="44"
                y="18"
                width="4"
                height="18"
                fill="#f0fdf4"
                opacity="0.9"
              />
              {/* Right tower crenellations */}
              <g fill="#a7f3d0" opacity="0.8">
                <rect x="44" y="16" width="0.95" height="2.3" />
                <rect x="47" y="16" width="0.95" height="2.3" />
              </g>

              {/* Connecting wall at base */}
              <rect
                x="20"
                y="40"
                width="24"
                height="2"
                fill="url(#accentGradient)"
                opacity="0.6"
              />

              {/* Accent highlight on center tower */}
              <rect
                x="33"
                y="12"
                width="1.2"
                height="20"
                fill="#fcd34d"
                opacity="0.5"
              />
            </g>
          </svg>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-emerald-300">
            Fortress
          </p>
          <p className="text-sm font-semibold text-white leading-tight">
            Optimizer
          </p>
        </div>
      </div>
    );
  }

  if (variant === "monogram") {
    return (
      <div className={`relative h-10 w-10 ${className}`}>
        <svg
          viewBox="0 0 64 64"
          className={`h-full w-full ${iconClass}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="monoGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient
              id="monoAccent"
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Shield */}
          <path
            d="M 32 4 L 52 14 L 52 32 Q 32 50 32 50 Q 12 32 12 32 L 12 14 Z"
            fill="url(#monoGradient)"
            opacity="0.95"
          />
          <path
            d="M 32 4 L 52 14 L 52 32 Q 32 50 32 50 Q 12 32 12 32 L 12 14 Z"
            stroke="url(#monoAccent)"
            strokeWidth="1.5"
            fill="none"
          />

          {/* "F" letter */}
          <g>
            <rect
              x="26"
              y="18"
              width="3"
              height="26"
              fill="white"
              opacity="0.95"
            />
            <rect
              x="26"
              y="18"
              width="10"
              height="2.5"
              fill="white"
              opacity="0.95"
            />
            <rect
              x="26"
              y="30"
              width="8"
              height="2"
              fill="white"
              opacity="0.85"
            />
          </g>
        </svg>
      </div>
    );
  }

  // Default: icon
  return (
    <div className={`relative h-10 w-10 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        className={`h-full w-full ${iconClass}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="iconGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient
            id="iconAccent"
            x1="100%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Shield base with dynamic gradient */}
        <path
          d="M 32 4 L 52 14 L 52 32 Q 32 50 32 50 Q 12 32 12 32 L 12 14 Z"
          fill="url(#iconGradient)"
          opacity="0.95"
        />

        {/* Shield outline with secondary color */}
        <path
          d="M 32 4 L 52 14 L 52 32 Q 32 50 32 50 Q 12 32 12 32 L 12 14 Z"
          stroke="url(#iconAccent)"
          strokeWidth="2"
          fill="none"
        />

        {/* Fortress towers - architectural towers with crenellations */}
        <g>
          {/* Left tower */}
          <rect
            x="20"
            y="20"
            width="4"
            height="16"
            fill="white"
            opacity="0.88"
          />
          {/* Left tower crenellations */}
          <g fill="#dbeafe" opacity="0.7">
            <rect x="20" y="18" width="0.95" height="2.2" />
            <rect x="23" y="18" width="0.95" height="2.2" />
          </g>

          {/* Center tall tower */}
          <rect
            x="31"
            y="10"
            width="4"
            height="26"
            fill="white"
            opacity="0.94"
          />
          {/* Center tower crenellations - most prominent */}
          <g fill="#fef3c7" opacity="0.85">
            <rect x="31" y="8" width="1" height="2.3" />
            <rect x="33.5" y="8" width="1" height="2.3" />
            <rect x="36" y="8" width="1" height="2.3" />
          </g>

          {/* Right tower */}
          <rect
            x="44"
            y="20"
            width="4"
            height="16"
            fill="white"
            opacity="0.88"
          />
          {/* Right tower crenellations */}
          <g fill="#dbeafe" opacity="0.7">
            <rect x="44" y="18" width="0.95" height="2.2" />
            <rect x="47" y="18" width="0.95" height="2.2" />
          </g>

          {/* Connecting wall at base */}
          <rect
            x="20"
            y="40"
            width="24"
            height="1.8"
            fill="#fcd34d"
            opacity="0.6"
          />

          {/* Accent light on center tower */}
          <rect
            x="33"
            y="14"
            width="1.2"
            height="16"
            fill="#fcd34d"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}
