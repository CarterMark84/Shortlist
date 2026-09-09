import { Logo } from '@/components/Logo';
import { SetupNotice } from '@/components/SetupNotice';
import { isConfigured } from '@/lib/env';

/** Centred card shell shared by every auth screen. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured) return <SetupNotice />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo href="/" />
        </div>

        <div className="mt-8 rounded-xl border border-line bg-surface p-7 shadow-[0_2px_8px_-1px_rgb(28_25_23_/_0.08)]">
          {children}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-subtle">
          Shortlist links out to Amazon to complete purchases. It never sees or stores your Amazon
          credentials.
        </p>
      </div>
    </main>
  );
}
