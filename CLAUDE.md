# Invoice app — project context

Personal invoicing tool for a freelance video editor based in Kolkata. Single user.
Not a SaaS: there is exactly one account, no teams, no billing, no onboarding flow.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase — Postgres, Auth, Storage
- `@react-pdf/renderer` for PDF generation
- Deployed on Vercel

## Non-negotiable rules

These have cost real projects real money. Do not deviate without asking.

**Money is always `bigint` paise.** Never float, never `numeric`, never a JS `number`
that came from parsing a decimal string. ₹1,250.00 is `125000`. Format only at the
render boundary. If you find yourself writing `* 100` or `/ 100` outside
`lib/money.ts`, stop and put it there instead.

**Invoice totals are stored, never recomputed on read.** A sent invoice must produce
identical output a year from now even if rates, tax settings, or client addresses
have changed. Line totals live on `invoice_items`, document totals on `invoices`, and
the recipient's name/address/GSTIN are frozen onto the invoice at issue time.

**Invoice numbers come from `next_invoice_number()` only.** Never `count(*) + 1`,
never client-side. Call it on the draft → sent transition, not on draft creation.

**RLS is on for every table.** Never disable it "temporarily". Never use the
`service_role` key in anything that ships to the browser — it belongs only in server
routes, and even there only when there's a reason the anon key can't work.

**Migrations are append-only.** Once a migration has run against the remote database,
it is frozen. Changes go in a new numbered file.

## Tax logic

Lives in one place: `lib/tax.ts`. Nothing else computes tax.

The `gst_treatment` field on an invoice drives everything:

- `unregistered` — no tax lines at all. This is the current default.
- `intra_state` — place of supply matches the user's state → split into CGST + SGST,
  each at half the rate.
- `inter_state` — place of supply differs → single IGST line at the full rate.
- `export` — zero rated. Print the LUT declaration line.

Place of supply is the *client's* state, not the user's. CGST/SGST and IGST are
mutually exclusive; there is a database constraint enforcing this, so a bug here
fails loudly rather than producing a wrong invoice.

Rates are basis points. 18% is `1800`.

## Layout

```
app/
  (auth)/login/
  (app)/
    dashboard/
    clients/
    invoices/
      [id]/edit/
    settings/
  i/[token]/          public invoice view, no auth
  api/
components/
  ui/                 shadcn primitives, do not hand-edit
  invoice/
lib/
  supabase/
    client.ts         browser client
    server.ts         server component / route handler client
  money.ts            paise <-> display. all conversion lives here
  tax.ts              gst_treatment -> tax lines
  numbering.ts        wraps next_invoice_number()
  pdf/
    templates/        one file per template
    fonts/            .ttf files, registered at module load
supabase/
  migrations/
types/
  database.ts         generated, do not hand-edit
```

## PDF constraints

`@react-pdf/renderer` is not a browser. It supports a flexbox subset and little else.

Available: flexbox (`flexDirection` defaults to `column`, not `row`), absolute
positioning, width/height, margin/padding, border, `borderRadius`,
`backgroundColor`, `color`, `fontFamily`/`fontSize`/`fontWeight`, `textAlign`,
`lineHeight`, `letterSpacing`, `opacity`.

Not available: CSS grid, float, `box-shadow`, `text-shadow`, pseudo-elements,
`position: sticky`, `gap` on some versions, most selectors — everything is inline
style objects.

Fonts must be registered from `.ttf` files before use. The system has no fonts.
Whatever face is chosen must include the ₹ glyph — verify it renders, don't assume.

Page size is A4: 595.28 × 841.89 pt.

## Commands

```
pnpm dev
pnpm build
supabase db push                    # apply new migrations
supabase gen types typescript --linked > types/database.ts
```

Regenerate types after every migration. Do not hand-write row types.

## Working style

- Ask before adding a dependency.
- Ask before changing the schema. Show the migration first.
- One feature per change. Don't refactor adjacent code while implementing something.
- When something is ambiguous, say so and pick the simpler option rather than
  building both paths.
- Prefer server components and server actions. Client components only where there's
  genuine interactivity (the line-item editor, mainly).

---

@AGENTS.md
