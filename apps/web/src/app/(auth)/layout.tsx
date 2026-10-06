import type { ReactNode } from 'react';
import { LogoMark } from '@/components/shell/logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Soft accent glow; purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-10 rounded-xl [&_svg]:size-6" />
          <p className="mt-4 text-[13px] font-semibold tracking-[0.18em] text-fg">
            NEXUS
          </p>
          <p className="mt-1 text-[13px] text-fg-muted">
            Personal Context &amp; Action Engine
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
