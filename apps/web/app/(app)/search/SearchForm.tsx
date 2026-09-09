'use client';

import { useActionState, useRef } from 'react';

import { EXAMPLE_PROMPTS } from '@recs/shared';

import { runSearch } from './actions';
import { initialSearchState } from './form-state';

/**
 * The search box.
 *
 * A textarea rather than an input, because the whole premise is that people
 * describe things in a sentence or two. Enter submits; Shift+Enter adds a line.
 */
export function SearchForm() {
  const [state, formAction, pending] = useActionState(runSearch, initialSearchState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function fillFromChip(prompt: string) {
    const field = textareaRef.current;
    if (!field) return;
    field.value = prompt;
    field.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <div className="w-full">
      <form ref={formRef} action={formAction}>
        <div className="relative rounded-xl border border-line-strong bg-surface shadow-[0_2px_8px_-1px_rgb(28_25_23_/_0.08)] transition-colors focus-within:border-accent">
          <label htmlFor="query" className="sr-only">
            Describe the product you are looking for
          </label>

          <textarea
            ref={textareaRef}
            id="query"
            name="query"
            rows={3}
            maxLength={500}
            defaultValue={state.query}
            onKeyDown={onKeyDown}
            disabled={pending}
            placeholder="Something to keep my coffee hot on my long commute…"
            className="w-full resize-none rounded-xl bg-transparent px-4 py-3.5 pr-4 pb-14 text-base leading-relaxed text-ink outline-none placeholder:text-ink-subtle disabled:opacity-60 sm:text-lg"
          />

          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
            <span className="hidden text-xs text-ink-subtle sm:block">
              Press <Kbd>Enter</Kbd> to search
            </span>

            <button
              type="submit"
              disabled={pending}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover active:bg-accent-pressed disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? (
                <>
                  <Spinner />
                  Finding the best five…
                </>
              ) : (
                <>
                  Find products
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {state.error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-danger-subtle px-3.5 py-2.5 text-sm text-danger"
          >
            {state.error}
          </p>
        )}
      </form>

      {pending && (
        <p className="mt-4 text-center text-sm text-ink-muted" aria-live="polite">
          Interpreting your description, then searching Amazon and ranking the results. This takes a
          few seconds.
        </p>
      )}

      {!pending && (
        <div className="mt-6">
          <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
            Or try one of these
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  type="button"
                  onClick={() => fillFromChip(prompt)}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-left text-sm text-ink-muted transition-colors hover:border-accent-border hover:bg-accent-subtle hover:text-accent"
                >
                  {prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-muted">
      {children}
    </kbd>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
