# Clockwork — freelance time clock

Clock in, clock out, know what you earned. Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind v4.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # pure-logic tests (reducer + billing math)
npm run typecheck
```

## Two screens

| Route | What's on it |
| --- | --- |
| `/` | For ease of use, the main page highlights the most important component, the punching in/out button. |
| `/timesheet` | The second page displays a "Time Invested" dashboard with total money earned over multiple time spans (Today, This week, This Month). Followed by some other helpful information like total by client, and a history of previously recorded entries. The previously recorded entries segment allows for creating invoices at the click of a button and exporting them as a PDF. |

The tracker lives in the **root layout**, which App Router keeps mounted across
client-side navigation. Moving between the two screens never unmounts the timer,
re-reads storage, or drops a second.
## What it does

- **One clock.** Start / pause / resume / stop, with a live seconds counter and live earnings.
- **Survives everything.** The start timestamp is persisted, so closing the tab, sleeping the laptop, or refreshing does not lose or distort time.
- **Clients, projects, rates.** Set a rate as **hourly, daily, weekly, monthly or yearly** — the way you quote it — and the app converts to hours for billing. Project rate overrides client default; the hourly figure is frozen onto each entry at creation so old invoices never re-price themselves.
- **Your working day, your numbers.** Hours per day, days per week and weeks per year are settings (default 12 / 5 / 52), editable inline in the Rate dialog. Every non-hourly conversion derives from them — nothing assumes an 8-hour day.
- **Job titles that remember themselves.** The field starts on the last title you used, and a dropdown offers every title from your history — type a new one any time. The list is derived from your entries, so it can never drift from what you actually logged.
- **Billable toggle** per entry, so overhead is tracked without being charged.
- **Billing rounding** — exact, nearest 6 min (0.1 h), nearest 15 min, or always up to 15 min — applied at read time, never to stored data.
- **Dashboard** — today / week / month totals plus a per-client breakdown that follows your filters.
- **Timesheet** — one "Filter & sort" button opens the whole panel over the table; active filters stay visible as dismissable chips with a count on the button. Sort by newest, oldest, longest, shortest or highest amount. Edit or delete inline; add shifts you forgot to track.
- **Price override** — the edit dialog's price defaults to the total for the times you enter and follows them as you change them; type your own number to charge a fixed price instead, and one click puts the calculated figure back.
- **Overtime, automatic.** Any entry past a threshold (default 12 h, set in the Rate dialog, overridable per client) has the excess billed at a multiplier. **Automatic overtime is carved out of the tracked window, not added to it** — a 14 h day bills 12 h regular + 2 h at 1.5×, never 16 h. Every entry shows the split and can be overridden by hand, with one click back to automatic. Manual overtime still adds hours you never tracked. Flows into the row, the totals, and the CSV and PDF invoice.
- **Exports** — RFC-4180 CSV and an invoice-ready PDF summary (jsPDF, loaded on demand).

## Project structure

```
src/
├── app/                  # Next.js App Router shell (server components)
│   ├── layout.tsx        # TrackerProvider + no-flash theme script
│   ├── page.tsx          # /           → ClockScreen
│   ├── timesheet/page.tsx# /timesheet  → WorkspaceScreen
│   └── globals.css       # Tailwind v4 @theme tokens, light + dark
├── lib/                  # pure, framework-free domain code
│   ├── types.ts          # Client, Project, TimeEntry, TimerState, Settings
│   ├── defaults.ts       # ids, seed data, constants
│   ├── selectors.ts      # derived data: enrich, filter, totals, breakdown
│   ├── storage/          # StorageAdapter port + localStorage adapter + migrations
│   ├── time/             # formatting, rate periods, billing rounding
│   └── export/           # csv.ts, pdf.ts
├── hooks/
│   ├── timeTrackerReducer.ts   # every state transition, pure
│   ├── useTimeTracker.ts       # the engine: hydrate, persist, sync, derive
│   └── useNow.ts               # drift-compensated ticking clock
├── state/TrackerProvider.tsx   # one hook instance, shared by context
└── components/                 # presentation only
    ├── ClockScreen.tsx         # screen 1
    ├── WorkspaceScreen.tsx     # screen 2
    ├── RunningTimerBar.tsx     # sticky clock on screen 2
    ├── ClientSelector.tsx · JobTitleField.tsx · TimesheetTable.tsx
    ├── FiltersBar.tsx · EntryEditorDialog.tsx · ThemeToggle.tsx
    └── ui/                     # Button, Card, Field, Input, Modal…
```

Dependency direction is one-way: `components → hooks → lib`. Nothing in `lib/` imports React.

## Swapping in Supabase / IndexedDB

Implement `StorageAdapter` (`src/lib/storage/adapter.ts`) and return it from `createStorageAdapter()`. No component or hook changes.

```ts
export class SupabaseAdapter implements StorageAdapter {
  async load()  { /* select the row, return PersistedState | null */ }
  async save(s) { /* upsert */ }
  async clear() { /* delete */ }
  subscribe(cb) { /* realtime channel; return unsubscribe */ }
}
```

Suggested SQL shape when you get there: `clients`, `projects`, `time_entries` tables keyed by `user_id`, with `start_time timestamptz` and `end_time timestamptz null`. Keep storing UTC.

## Deliberate trade-offs

| Decision | Why | When to revisit |
| --- | --- | --- |
| Whole state in one localStorage blob | Atomic writes, trivial migrations | Thousands of entries — move to IndexedDB or the server |
| Rounding applied at read time | Changing the rule re-prices history; nothing is lost | Never |
| Rate frozen on the entry | A rate rise must not silently re-price sent invoices | Never |
| Quoted rate stored, hourly derived | One source of truth; changing the period can't leave a stale hourly figure behind | Never |
| Working day stored as a setting | A 12-hour day is as valid as an 8-hour one; hard-coding either mis-prices the other | Never — change the value in the app |
| Month = year ÷ 12, not 4 weeks | Four weeks undercounts a month by ~8% | Never |
| Overtime as `{ hours, multiplier, source }` on the entry | `source` is what stops auto overtime being billed twice: 'auto' hours are carved out of tracked time, 'manual' hours are added to it | A client needs tiered overtime bands |
| Threshold is per entry, not per day | One session is one decision; summing a day means attributing the surcharge across entries | You bill daily overtime by contract |
| `useReducer` + context, no state library | One writer, small state, zero deps | Multi-user sync, undo history |
