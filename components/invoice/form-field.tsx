import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * The app's one form language, Apple-flavoured: filled, rounded fields on
 * a card, with a sentence-case label above.
 *
 * The previous version used bottom-border-only fields and uppercase
 * tracked micro-labels. Both are gone deliberately — a filled control
 * with a real hit area is what the references use everywhere, and it's
 * also the more usable target on a phone.
 */
const fieldClass =
  'h-11 w-full rounded-xl border border-transparent bg-secondary px-3.5 text-[15px] ' +
  'text-foreground shadow-none transition-colors placeholder:text-muted-foreground ' +
  'focus-visible:border-ring focus-visible:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const labelClass = 'text-[14px] font-medium text-muted-foreground'

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
      {hint ? <p className="text-[14px] text-muted-foreground">{hint}</p> : null}
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
        className={`${fieldClass} h-auto resize-y py-2.5 leading-relaxed`}
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
          that's just read out of FormData on submit. The caret is drawn
          as a background image so the control keeps one rounded shape
          instead of the platform's boxed dropdown chrome. */}
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        disabled={disabled}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='none' stroke='%238e8e93' stroke-width='1.5' stroke-linecap='round'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          backgroundSize: '10px 6px',
        }}
        className={`${fieldClass} cursor-pointer appearance-none pr-10`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-[14px] text-muted-foreground">{hint}</p> : null}
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
    <section className="app-card p-5 sm:p-6">
      <h2 className="mb-5 text-[17px] font-semibold text-foreground">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}
