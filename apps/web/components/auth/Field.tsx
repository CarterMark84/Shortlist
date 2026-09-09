/** Labelled text input used across the auth forms. */
export function Field({
  id,
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  defaultValue,
  required = true,
  hint,
  autoFocus = false,
}: {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        autoFocus={autoFocus}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}
