# components

React components, grouped by the area of the product they belong to.

| Folder       | Purpose                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `ui/`        | Small, generic, presentational building blocks. No domain knowledge.         |
| `marketing/` | The public site: header, footer, landing sections, product preview. Built.   |
| `demo/`      | The interactive quote assistant demo (conversation UI, enquiry summary).     |
| `leads/`     | Internal lead inbox — lists, detail views, status controls.                  |
| `admin/`     | Internal outreach tracker (`/admin/leads`). Built; see the root README.      |

Conventions:

- Server Components by default; add `"use client"` only where interactivity requires it.
- Props typed explicitly, no `any`.
- Domain types come from `@/types`, never redeclared locally.
- Every interactive element must be keyboard reachable and labelled.

`demo/` and `leads/` are empty placeholders for now. `ui/` holds only
`Field.tsx` (label + control pairing and the shared input styling).

## `marketing/`

Everything here is a Server Component except `AssistantPreview.tsx`. The mobile
menu uses a native `<details>` rather than React state specifically so the
header ships no JavaScript.

`primitives.tsx` holds the shared `Container`, `SectionHeading` and button
classes — use those rather than re-deriving spacing or button styling per
section. Copy lives in `lib/marketing/content.ts`, not in the JSX.
