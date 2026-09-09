import { Logo } from './Logo';

/**
 * Shown instead of the app when Supabase env vars are missing.
 *
 * A fresh clone has no `.env.local`; a blank screen or a stack trace would be
 * a poor first impression, so the app explains exactly what to do.
 */
export function SetupNotice() {
  const steps: Array<{ title: string; body: React.ReactNode }> = [
    {
      title: 'Create a Supabase project',
      body: (
        <>
          At <Code>supabase.com</Code>, then copy the Project URL and the{' '}
          <Code>anon</Code> public key from Project Settings → API Keys.
        </>
      ),
    },
    {
      title: 'Add them to apps/web/.env.local',
      body: (
        <Pre>{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}</Pre>
      ),
    },
    {
      title: 'Apply the database schema',
      body: (
        <Pre>{`supabase login
supabase link --project-ref <your-project-ref>
supabase db push`}</Pre>
      ),
    },
    {
      title: 'Deploy the recommend function',
      body: (
        <>
          <Pre>{`npm run fn:deploy`}</Pre>
          <p className="mt-2">
            It runs on offline fixture data until you set{' '}
            <Code>AMAZON_PROVIDER=serpapi</Code>, so you can build without any keys.
          </p>
        </>
      ),
    },
    {
      title: 'Check the email settings',
      body: (
        <>
          Email sign-up is on by default — nothing to configure. Under Authentication → Providers →
          Email you can turn <Code>Confirm email</Code> off to skip the confirmation step while
          developing. For production, add your own SMTP provider: Supabase&apos;s built-in mailer is
          rate-limited and intended for testing only.
        </>
      ),
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Logo href="/" />

      <h1 className="mt-10 text-3xl font-semibold tracking-tight text-ink">Finish setting up</h1>
      <p className="mt-3 text-ink-muted">
        Shortlist needs a Supabase project before it can run. The full walkthrough is in the
        repository README; the short version is below.
      </p>

      <ol className="mt-10 space-y-7">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="nums flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-ink">{step.title}</h2>
              <div className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-12 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm text-ink-muted">
        Restart <Code>npm run dev</Code> after editing <Code>.env.local</Code> — Next.js reads
        environment variables at startup.
      </p>
    </main>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[0.85em] text-ink">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink">
      {children}
    </pre>
  );
}
