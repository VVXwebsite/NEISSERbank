interface NeonLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function BalloonLogo({ className = '', size = 'md' }: NeonLogoProps) {
  const sizeMap = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-2xl',
  };

  const glowMap = {
    sm: 'text-sm shadow-[0_0_12px_rgba(168,85,247,0.4)]',
    md: 'text-base shadow-[0_0_18px_rgba(168,85,247,0.5)]',
    lg: 'text-xl shadow-[0_0_24px_rgba(168,85,247,0.6)]',
    xl: 'text-3xl shadow-[0_0_32px_rgba(168,85,247,0.7)]',
  };

  return (
    <div
      id="neisser-neon-logo"
      className={`relative inline-flex items-center justify-center rounded-xl bg-neutral-950 border border-purple-500/50 select-none transition-transform active:scale-95 overflow-hidden ${sizeMap[size]} ${glowMap[size]} ${className}`}
      style={{
        background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.25) 0%, rgba(10, 10, 10, 0.95) 75%)',
      }}
    >
      {/* Subtle neon ambient ring */}
      <span className="absolute inset-0 rounded-xl bg-gradient-to-tr from-purple-600/20 via-transparent to-fuchsia-500/20 pointer-events-none" />
      
      {/* Glowing Neon Letter N */}
      <span
        className="font-black tracking-tighter text-white font-sans drop-shadow-[0_0_8px_#c084fc] drop-shadow-[0_0_16px_#9333ea]"
        style={{
          textShadow:
            '0 0 4px #ffffff, 0 0 10px #c084fc, 0 0 20px #9333ea, 0 0 35px #7e22ce',
        }}
      >
        N
      </span>
    </div>
  );
}

// Alias export for compatibility
export const NeonLogo = BalloonLogo;

