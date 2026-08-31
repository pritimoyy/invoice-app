/**
 * The "nothing here yet" panel for list pages.
 *
 * Previously each page dropped a bare <p> under its heading, which read as
 * a stray sentence floating in the layout rather than a deliberate state.
 * Giving it the same card the populated list would occupy keeps the page's
 * shape stable whether or not there's data in it.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="app-card mt-6 flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
