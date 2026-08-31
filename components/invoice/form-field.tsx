import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * The app's one form language: a bottom-border field with an uppercase
 * micro-label above it, no boxed borders. Built on the shadcn primitives
 * (for the accessibility and state handling) but restyled away from their
 * boxed, rounded default — the brief is explicit that a default shadcn look
 * isn't the target here.
 */
const fieldClass =
  'h-auto w-full rounded-none border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-[15px] ' +
  'text-neutral-900 shadow-none transition-colors placeholder:text-neutral-400 ' +
  'focus-visible:border-neutral-900 focus-visible:ring-0 disabled:opacity-50'

const labelClass =
  'text-[11px] uppercase tracking-[0.12em] text-neutral-500 font-normal'

export function FormField({
  name,
  label,
  defaultValue,
  type = 'text',
  required = false,
  placeholder,
  disabled,
  hint,
}: {
  name: string
  label: string
  defaultValue?: string | null
  type?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className={labelClass} htmlFor={name}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        disabled={disabled}
        className={fieldClass}
      />
      {hint ? <p className="text-[12px] text-neutral-400">{hint}</p> : null}
    </div>
  )
}

export function FormTextarea({
  name,
  label,
  defaultValue,
  rows = 3,
  disabled,
}: {
  name: string
  label: string
  defaultValue?: string | null
  rows?: number
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Label className={labelClass} htmlFor={name}>
        {label}
      </Label>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        disabled={disabled}
        className={`${fieldClass} resize-y`}
      />
    </div>
  )
}

export function FormSelect({
  name,
  label,
  defaultValue,
  options,
  placeholder,
  disabled,
  hint,
}: {
  name: string
  label: string
  defaultValue?: string
  options: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className={labelClass} htmlFor={name}>
        {label}
      </Label>
      {/* A plain, uncontrolled native select submits with the form the
          same way an <input> does — no client state needed for a value
          that's just read out of FormData on submit. */}
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        disabled={disabled}
        className={fieldClass}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-[12px] text-neutral-400">{hint}</p> : null}
    </div>
  )
}

export function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-neutral-200 pt-8">
      <h2 className="mb-6 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
        {title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">{children}</div>
    </section>
  )
}
