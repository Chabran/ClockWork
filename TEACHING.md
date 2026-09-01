# Teaching notes — how this app is built, and why

Twelve ideas do most of the work here. Learn these and you can rebuild the app from scratch.

1. Layers with a one-way dependency arrow
2. A timer that never counts ticks
3. Ports & adapters for storage
4. Derive, don't duplicate
5. Where shared state lives decides what survives navigation
6. A unit is part of the value, not a comment on it
7. Name your assumptions, then let the user change them
8. Derived objects break effects that watch them
9. Hiding controls must not hide state
10. The smallest model that can't be wrong
11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

---

## 1. Layers, and the direction of the arrow

```
┌──────────────────────────────────────────────────────────────┐
│  components/            TimerWidget · TimesheetTable · …     │
│  "How it looks."        No math, no localStorage, no dates.  │
└───────────────┬──────────────────────────────────────────────┘
                │ calls handlers, renders props
┌───────────────▼──────────────────────────────────────────────┐
│  hooks/                 useTimeTracker · reducer · useNow    │
│  "What happens when."   Owns state, effects, the clock.      │
└───────────────┬──────────────────────────────────────────────┘
                │ imports pure functions
┌───────────────▼──────────────────────────────────────────────┐
│  lib/                   types · selectors · rounding · csv   │
│  "What is true."        Pure. Zero React. Trivially testable.│
└──────────────────────────────────────────────────────────────┘
```

The arrow only ever points **down**. `lib/` does not know React exists, which is why
`npm test` can run the billing math in Node with no DOM, no render, no mocking.

> **Best practice.** When you can't decide where code goes, ask: *would this still be true
> if the UI were a CLI?* If yes, it belongs in `lib/`.

**Mental model:** *lib is the rulebook, hooks are the referee, components are the scoreboard.*

---

## 2. The timer: absolute time, not accumulated ticks

The naive version, which is wrong:

```ts
// ❌ counts wake-ups and calls them seconds
setInterval(() => setSeconds(s => s + 1), 1000);
```

Browsers throttle background tabs to roughly one tick a minute, and a sleeping laptop
fires none at all. Every skipped tick is a second the freelancer never gets paid for.

The version in this app:

```ts
// ✅ store WHEN it started; ask the OS what time it is now
elapsed = entry.durationSeconds + (Date.now() - startedAt) / 1000;
```

```
       start                    tab backgrounded              reopened
         │                             │                          │
 wall ───┼─────────────────────────────┼──────────────────────────┼──────▶
 clock   │                             │                          │
         │  ticks: ▮▮▮▮▮▮▮▮▮▮   throttled: ▮      ▮       ▮        │
         │                                                        │
 counting ticks  →  00:04:07   ✗ two hours of work vanished
 now − startedAt →  02:00:11   ✓ correct the instant you look
```

The interval is now only a **repaint request** — "the number on screen is stale, redraw it."
It is not the source of truth. Losing a repaint costs you nothing.

Two refinements in `useNow.ts` finish the job:

- the first tick is aligned to the next whole second, so the display flips in step with the
  wall clock instead of drifting a few milliseconds every second;
- `visibilitychange` and `focus` force an immediate recalculation, so returning to the tab
  snaps to the truth rather than waiting up to a second.

> **Best practice.** Any duration, countdown, or "time remaining" you build: store a
> timestamp, subtract on render. Never accumulate.

**Mental model:** *a stopwatch remembers when you pressed the button, not how many times it blinked.*

---

## 3. Ports & adapters — why storage hides behind an interface

```
        ┌───────────────────────┐
        │   useTimeTracker      │   knows only this shape:
        │                       │   load() · save() · clear() · subscribe()
        └──────────┬────────────┘
                   │  StorageAdapter  ← the PORT (an interface you own)
        ┌──────────┴──────────┬──────────────────┐
        ▼                     ▼                  ▼
 LocalStorageAdapter   IndexedDBAdapter    SupabaseAdapter   ← ADAPTERS
      (today)             (offline+)          (sync)
```

The app depends on the *interface*, not on `window.localStorage`. Swapping backends is one
new class plus one changed line in `createStorageAdapter()`. Without the port, `localStorage`
calls scatter across twenty components and the migration becomes a rewrite.

Two details worth copying:

- **`load()` is async even though localStorage is synchronous.** If the interface were sync,
  every network-backed adapter would break it later. Design the port for the hardest
  implementation you can foresee, not the easiest.
- **`migrate()` exists on day one.** Persisted data outlives your code. The first time you
  rename a field, every existing user still has yesterday's shape in their browser.

> **Best practice.** The moment code touches the outside world — storage, network, clock,
> filesystem — put an interface in front of it that *you* define.

**Mental model:** *a wall socket. The lamp doesn't care whether the power came from coal or wind.*

---

## 4. Derive, don't duplicate

Stored state is deliberately small:

```
STORED (the facts)                    DERIVED (recomputed every render)
─────────────────────                 ────────────────────────────────
entries[]                    ──┐
  startTime, endTime           ├──▶   liveSeconds     (+ running segment)
  durationSeconds              │      billedSeconds   (rounding applied)
  rateApplied, isBillable      │      earnings        (hours × rate)
timer { activeEntryId,       ──┘      todayTotal / weekTotal / monthTotal
        isRunning, startedAt }        clientBreakdown
settings { roundingRule }             filteredEntries
```

`earnings` is never written to disk. If it were, changing the rounding rule would leave
thousands of rows quietly disagreeing with the number on screen — and you would discover it
from a client's email, not a test.

The one intentional exception is `rateApplied`, which *is* frozen onto each entry. That is
not duplication, it is a **historical fact**: raising your rate must not silently re-price
work you already invoiced. Learning to tell "cache of a derivable value" (bad) from "record
of what was true at the time" (essential) is most of data modelling.

> **Best practice.** If a value can be computed from what you already store, compute it.
> Store it only when it records a decision that must not change later.

**Mental model:** *store the ingredients, not the cake.*

---

## 5. Where shared state lives decides what survives navigation

The app has two screens. The clock is on `/`; totals, the log and invoicing are on
`/timesheet`. Both need the *same* running timer — which makes the placement of the
provider the single most important line in the app.

```
app/layout.tsx                    ← stays mounted across every route change
└── <TrackerProvider>             ← ONE useTimeTracker: one interval,
    │                                one storage subscription, one debounced writer
    ├── /            → ClockScreen
    └── /timesheet   → WorkspaceScreen
```

Move the provider down one level, into `page.tsx`, and this happens instead:

```
navigate  →  page unmounts  →  hook unmounts  →  interval cleared,
             storage subscription dropped, isHydrated back to false
          →  new page mounts  →  localStorage re-read  →  clock appears to restart
```

The data would eventually be *correct* — the timer stores an absolute `startedAt`, so
nothing is actually lost — but the user sees a flash of `00:00:00` and a skeleton every
time they check their timesheet, which reads as a bug even when it isn't.

The rule generalises past React: **shared state belongs at the lowest node that stays
mounted for the whole lifetime of everything using it.** In App Router that node is the
layout. In a classic SPA it's the router's parent. Placement, not the library, is what
makes state feel persistent.

The second half of splitting a screen is making the hidden state visible. A timer you
can't see is a timer you forget to stop, so `RunningTimerBar` pins the live clock and its
Pause / Clock out controls to the top of the secondary screen.

> **Best practice.** Whenever you hide a running process behind a navigation, put a
> persistent indicator on every screen where it is still running — with the controls to
> stop it, not just a badge saying it exists.

**Mental model:** *state lives in the building, not in the room you happen to be standing in.*

---

## 6. A unit is part of the value, not a comment on it
7. Name your assumptions, then let the user change them
8. Derived objects break effects that watch them
9. Hiding controls must not hide state
10. The smallest model that can't be wrong
11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

The Rate control accepts a period — hourly, daily, weekly, monthly, yearly. The naive
model stores what the user typed and remembers the period somewhere else:

```ts
// ❌ two fields that can disagree, and eventually will
{ rateAmount: 4800, ratePeriod: 'weekly', hourlyRate: 120 }
```

Edit the amount without recomputing `hourlyRate` — one forgotten call site — and the
client is invoiced at a rate nobody ever agreed to. The bug is silent, and it is money.

What this app stores instead:

```ts
{ defaultRate: { amount: 4800, period: 'weekly' } }   // the quote, whole
```

and derives the hourly figure on the way through:

```
 STORED                          DERIVED (never stored)
 { amount, period }  ──▶ toHourlyRate() ──▶ 120 ──▶ × tracked hours ──▶ money
```

This is §4 (derive, don't duplicate) applied to units. A number without its unit is not
a value, it's half of one — the same reason `Duration`, `Money` and `Temperature` types
exist in every language that has been burned by this.

Two consequences fall out for free:

- **Conversion happens in one place.** `billableHours(schedule)` is one function, not `/ 8`
  scattered across four files — see §7 for why that argument exists at all.
- **The UI can convert as you type.** Switching the dialog from Hourly to Monthly
  rewrites $95 as $16,466.67 rather than leaving "95" sitting under a "Monthly" label,
  because there is a real function to call.

The exception that proves the rule: `TimeEntry.rateApplied` still stores a plain hourly
number, frozen at creation. That is not a cached conversion — it is the historical fact
of what this work was billed at, and it must not follow the client's current rate. Same
distinction as §4: *cache of a derivable value* (bad) vs *record of what was true* (essential).

> **Best practice.** If a number has a unit, store the unit with it. If your field name
> has to carry the unit (`hourlyRate`, `timeoutMs`, `distanceKm`), you're one requirement
> away from needing a second field that can contradict the first.

**Mental model:** *"4800" is not a rate. "$4,800 per week" is.*

---

## 7. Name your assumptions, then let the user change them
8. Derived objects break effects that watch them
9. Hiding controls must not hide state
10. The smallest model that can't be wrong
11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

The first version of the rate feature had this:

```ts
// ❌ a business rule disguised as a constant
const BILLABLE_HOURS = { hourly: 1, daily: 8, weekly: 40, monthly: 2080 / 12, yearly: 2080 };
```

Extracting it into a named constant felt like good practice — and it *was* better than
`/ 8` sprinkled across four files. But naming an assumption is only step one. The real
question is: **whose fact is this?**

```
     A CONSTANT                          A SETTING
 ────────────────────              ─────────────────────
 π, seconds in a minute,           how long YOUR day is,
 days in a week                    which days you work,
                                   how many weeks you bill
 true for everyone                 true for one person
 belongs in source                 belongs in data
```

"A working day is 8 hours" is not π. It is a fact about a particular freelancer, and for
a freelancer working 12-hour days it is simply wrong — $1,200/day is $150/h at 8 hours
and $100/h at 12. Getting it wrong doesn't throw; it quietly bills a third too much.

So the constant became an argument:

```ts
billableHours(schedule)                  // { hourly: 1, daily: 12, weekly: 60, ... }
toHourlyRate(rate, schedule)             // every conversion takes it
```

Two implementation details make it safe to hand a number like this to a user:

- **Normalize at the boundary, once.** `normalizeSchedule()` clamps to sane ranges and
  falls back on anything missing or non-numeric, and the hook runs it a single time per
  render. Arithmetic downstream can never see a zero and divide by it.
- **Derive the ladder, don't enumerate it.** Only `hoursPerDay`, `daysPerWeek` and
  `weeksPerYear` are stored. Week, month and year are computed — so a 12-hour day
  automatically means a 60-hour week and a 3,120-hour year, with no chance of the four
  numbers disagreeing. (§4 again.)

The tell that you're looking at a setting wearing a constant's clothes: you can imagine a
reasonable user for whom the value is different, and nothing in the code would tell them
it was wrong.

> **Best practice.** When you extract a magic number, ask whose fact it is. If a
> reasonable user could have a different answer, it isn't a constant — it's a default,
> and defaults belong in data where they can be overridden.

**Mental model:** *a constant is true everywhere; a default is true until someone tells you otherwise.*

---

## Migrations are the price of storing anything

Changing `defaultHourlyRate: 95` to `defaultRate: { amount: 95, period: 'hourly' }` is a
one-line change in the type and a five-minute change in the code. It is also a **breaking
change to data that already exists in people's browsers** — every user who opened the app
before today has the old shape saved right now.

```
localStorage (v1)          v1ToV2()              v2ToV3()
{ defaultHourlyRate: 95 } ─────────▶ { defaultRate:{amount:95,period:'hourly'} } ─────────▶ + settings.workSchedule
```

`migrate()` is a chain of one-way steps, each knowing only how to move forward one
version. Adding the next means appending a function, never editing the last.

Now look at what those steps deliberately do *not* do:

- `v1ToV2` leaves `rateApplied` on existing entries alone. Re-pricing invoiced history is
  the one thing a migration must never do, so it only adds the display form alongside.
- `v2ToV3` gives old stores the **8-hour** schedule, even though new installs default to
  12. Handing them today's default would silently turn every $1,200/day rate from $150/h
  into $100/h — data nobody edited, changing meaning because the app shipped a release.

That second one is the subtler rule, and it's worth stating on its own: **a migration
preserves meaning; it does not apply today's defaults.** The new default is for people
who have no answer yet. Everyone else already answered, implicitly, and the migration's
job is to write down the answer they were living with.

> **Best practice.** The moment you persist a shape outside your process — localStorage,
> a file, a queue message, a database — you have a contract with your past self. Version
> it on day one; a migration seam added early costs nothing, added late costs a support
> inbox.

---

## 8. Derived objects break effects that watch them
9. Hiding controls must not hide state
10. The smallest model that can't be wrong
11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

A real bug this app shipped, worth studying because it looks like nothing:

```tsx
// ❌ loads the entry into the form... every single second
useEffect(() => {
  if (entry) setForm({ description: entry.description, ... });
}, [entry]);
```

`entry` is an `EnrichedEntry` — rebuilt by `enrichAll()` on every tick while the clock
runs. Same *values*, brand-new *object*, once a second. React compares dependencies with
`Object.is`, so a new object is always "changed", so the effect re-ran and overwrote
whatever the user was typing. Type a description, wait a second, watch it vanish.

```
tick → enrichAll() → new EnrichedEntry object (same data)
     → [entry] dep changes → effect re-runs → setForm(...) → your typing is gone
```

The fix is to depend on **identity, not the object**:

```tsx
const loadedKey = useRef<string | null>(null);
useEffect(() => {
  const key = open ? entry?.id ?? 'new' : null;
  if (key === loadedKey.current) return;   // same entry — leave the form alone
  loadedKey.current = key;
  …load it…
}, [open, entry, clients]);
```

The ref makes the *intent* explicit — "sync when the subject changes, not when the object
does" — and keeps the dependency array honest, which `[entry?.id]` would not (the linter
can't verify a member expression).

Two general lessons:

- **Derived data makes bad effect dependencies.** Anything recomputed per render is a new
  reference each time. Depend on a stable key (an id), or on the raw state the derivation
  came from — never on the derived object.
- **Form state has an owner, and it's the user.** Once a form is open, it belongs to the
  person typing in it. Sync *into* it on open and on genuine subject changes; after that,
  the only writer is them.

> **Best practice.** Before putting an object in a dependency array, ask whether it is
> stored or computed. If it's computed, you're watching its identity, not its contents.

**Mental model:** *`[object]` asks "is this a different object?", not "is this different information?"*

---

## 9. Hiding controls must not hide state
10. The smallest model that can't be wrong
11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

Collapsing eight filter controls behind one button is an easy win for density and an easy
way to create a support ticket: *"the app is broken, half my entries are missing."* They
weren't missing — a filter was on, and the only thing that said so was now inside a closed
panel.

A collapsed control panel owes the user two things:

```
┌──────────────────────────────────────────────────────────────┐
│  [ Filter & sort (2) ▾ ]  ( Northwind ✕ )  ( Billable ✕ )     │
│    ↑ count of what's on      ↑ each active filter, dismissable│
└──────────────────────────────────────────────────────────────┘
```

1. **A count on the trigger** — so the button itself says "something is filtering this."
2. **Chips for what's applied** — the *specific* filters, each removable in one click,
   without reopening the panel at all.

The result reads better than the always-open version did: what's ON is visible, what's
OFF takes no space. The panel is only for *changing* filters, which is rare; seeing them
is constant.

Two mechanics every popover owes as well, both in `FiltersBar`:

- **Escape closes it**, because that is what every dialog on the platform does.
- **Outside press closes it** — bound to `pointerdown`, not `click`, so the panel is gone
  before a control underneath can receive the press. Binding `click` lets a stray press
  land on the thing behind the panel on its way out.

And a positioning note: the panel is `absolute`, so it opens *over* the table rather than
pushing it down. A panel that reflows the page moves the row you were about to click.

> **Best practice.** When you hide controls, surface their *effect*: a count, a chip, a
> badge. The rule is "hide the knobs, not the settings."

**Mental model:** *a closed drawer is fine; a closed drawer you can't tell is full is not.*

---

## 10. The smallest model that can't be wrong
11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

"Add overtime" is the kind of request that invites a system. You can imagine tiered bands,
weekday/weekend rules, a daily hours threshold that triggers automatically, per-client
overtime policies. All plausible; none asked for.

What the feature actually needs is two numbers on one entry:

```ts
overtime?: { hours: number; multiplier: number } | null
```

Everything else is **derived** from those two (§4 again):

```
{ hours: 2, multiplier: 1.5 }
        │
        ├─▶ overtimeSeconds   = hours × 3600      → billed hours on the row
        ├─▶ overtimeEarnings  = hours × rate × ×  → the money
        ├─▶ "2 h × 1.5"                            → the invoice line
        └─▶ folded into sumEntries()               → every total, automatically
```

The payoff is in that last arrow. Because overtime lands in `enrichEntry` — the one place
that turns a stored entry into a displayed one — the timesheet totals, the per-client
breakdown, the CSV and the PDF all picked it up **without being told about it**. Adding a
concept in the derivation layer costs one edit; adding it in six render sites costs six,
and the sixth is always missed.

Three small decisions inside the feature that are worth copying:

- **The absent case is the common case.** `overtime` is optional, and `undefined`, `null`
  and zero hours all mean the same thing: no surcharge. That is why this needed **no
  migration** — every entry ever written is still valid. Not every schema change is a
  breaking one; an *additive optional field with a safe absent-meaning* is the shape you
  should aim for whenever you can.
- **Price it off the entry, not the client.** Overtime multiplies the rate that entry is
  actually billed at, so a price override raises the overtime with it. Reaching back to
  the client's standing rate would silently disagree with the line above it.
- **Normalize at the boundary.** `normalizeOvertime()` rejects zero and negative hours,
  rejects a zero multiplier, and caps runaway ones — so a typo'd `15` in the multiplier
  box can't quietly ship a 15× invoice.

> **Best practice.** When a feature request arrives, find the smallest set of stored
> values from which everything asked for can be computed, and put the computation where
> all the readers already look. Build the general system only when a second real case
> demands it.

**Mental model:** *two numbers and a formula beat a subsystem you have to keep in sync.*

---

## 11. When a value can arrive two ways, record which
12. Defaults propose; they never insist

Overtime started manual: you typed the hours. Then it became automatic: anything past a
threshold. The same field now holds hours from two different places — and they mean
different things:

```
AUTOMATIC                             MANUAL
14 h tracked, threshold 12            8 h tracked, you type "2 h"
the 2 h are ALREADY in the window     the 2 h were never tracked
   ↓                                     ↓
carve them out and re-price:          add them on top:
12 h × rate + 2 h × rate × 1.5        8 h × rate + 2 h × rate × 1.5
billed hours stay 14                  billed hours become 10
```

Treat them the same and you get one of two silent bugs: bill the auto case like the manual
case and the excess is charged **twice** (14 h + 2 h = 16 h billed on a 14 h day); bill the
manual case like the auto case and the extra hours **vanish**.

Nothing in `{ hours: 2, multiplier: 1.5 }` distinguishes them. So the record says:

```ts
{ hours: 2, multiplier: 1.5, source: 'auto' | 'manual' }
```

and one function reads it:

```ts
splitOvertime(overtime, trackedSeconds)
  → { regularSeconds, overtimeSeconds, totalSeconds }
```

Every caller — the row, the totals, the dialog, the invoice — asks that function instead of
doing the arithmetic itself, so the distinction is impossible to get wrong in one place and
right in another. The test that matters reads like the invoice dispute it prevents:

```ts
assert.equal(total, 1425);              // 12 × 95 + 2 × 95 × 1.5
assert.notEqual(total, 14 * 95 + 285);  // the double-billing bug
```

Two related notes:

- **Absent means the old meaning.** `source` is optional and defaults to `'manual'` —
  exactly what the field meant before policies existed, so entries written last week still
  bill identically. Same trick as §10.
- **The v3→v4 migration turns the policy OFF for existing stores.** New installs get it on;
  an existing user does not get a surcharge applied retroactively to sessions they may have
  already invoiced. (§7 again: preserve meaning, don't apply today's defaults.)

> **Best practice.** When the same field can be filled by a person or by a rule, store which
> one did it. Provenance is not metadata — it changes what the value means.

**Mental model:** *"2 hours" is not a number until you know where the 2 hours came from.*

---

## 12. Defaults propose; they never insist

Four fields in this app now fill themselves in: the price, the overtime hours, the
overtime multiplier, and the job title. Every one of them follows the same three-line
shape, and it is worth naming because getting it wrong produces a field that fights you.

```
1. propose   — fill it from the best guess (last title used, price for these times)
2. release   — the moment the user edits it, stop proposing
3. offer back— give them one click to return to the proposal
```

Step 2 is where the bugs live, and it has two different mechanisms here depending on what
"the user edited it" means:

- **A dirty flag** (`priceDirty`, `overtimeDirty`) when the field should keep tracking its
  source until the user takes over — change the end time and the price follows, type your
  own number and it stops.
- **A one-shot ref** (`didPrefillTitle`) when the proposal should happen exactly once —
  because "the user edited it" includes *clearing* it. Re-running the effect on every
  render would refill the box the instant you emptied it, and the field would be
  impossible to clear.

The failure modes are asymmetric and both are bad: propose too eagerly and the field is
unusable; propose too timidly and the feature does not exist. Step 3 is what lets you be
aggressive about step 1 safely — "Use $1,824.75 instead", "Back to automatic (2 h × 1.5)" —
because a wrong guess is now one click from corrected rather than something to undo by hand.

One more detail worth copying: the prefill waits for `isHydrated`. Filling the field from
the seed data before localStorage has loaded would lock in the wrong title, and the ref
would then block the correction — a stale default that looks like a bug in the data.

> **Best practice.** Any field you fill in for the user needs an explicit answer to "what
> makes it stop?" — and the answer must include the user clearing it.

**Mental model:** *a good default is a suggestion with an undo, not a decision made on your behalf.*

---

## Supporting decisions worth knowing

**A reducer, not eight `useState`s.** Clocking in creates an entry *and* marks it active.
Split state lets those two disagree for a render — or forever, after a bug. A reducer makes
it one atomic transition, and a transition is something you can test without a browser:

```ts
state = reducer(state, { type: 'timer/start',  at: '10:00' });
state = reducer(state, { type: 'timer/pause',  at: '10:30' });
assert.equal(state.entries[0].durationSeconds, 1800);   // paused time is not billed
```

**Hydrate in an effect, never during render.** Next.js renders on the server, where
`localStorage` does not exist. Reading it inside `useEffect` keeps the server HTML and the
first client render identical — that is what avoids hydration mismatch. The `isHydrated`
flag also guards the classic data-loss bug: saving the empty initial state over real data
on mount.

**Provider around the hook.** `useTimeTracker` owns a timer, a storage subscription and a
debounced writer. Calling it in five components would create five competing copies. Context
guarantees exactly one — see §5 for *where* that context has to sit.

**Tokens, not two stylesheets.** `globals.css` defines the palette as CSS variables and dark
mode redefines *only the values*. Components say `bg-surface`, never `bg-white dark:bg-gray-900`.
One theme decision lives in one place, and it is impossible for a component to be styled
correctly in light mode and broken in dark.

**Money in cents-precision, rounded once.** Every earnings calculation ends in
`Math.round(x * 100) / 100`. Floating-point drift is invisible on one row and embarrassing
on a hundred-row invoice.

---

## A checklist you can reuse on the next project

- [ ] Is there a layer that would still make sense without a UI? Put the logic there.
- [ ] Does anything count ticks instead of subtracting timestamps?
- [ ] Does any external dependency get called directly, with no interface in front of it?
- [ ] Is any value stored that could be computed — and is any value computed that should have been frozen as history?
- [ ] Can the core rules be tested without rendering a component?
- [ ] Is every color a token, so the second theme is free?
- [ ] Does shared state sit at a node that stays mounted for as long as anything needs it?
- [ ] Is every background process visible — and stoppable — from every screen it outlives?
- [ ] Does every number that has a unit carry that unit, instead of encoding it in a field name?
- [ ] Is anything persisted outside the process versioned, with a migration path from the shape already in the wild?
- [ ] Does each migration preserve what the old data *meant*, rather than applying today's defaults to it?
- [ ] Is every magic number either universally true, or a default the user can change?
- [ ] Does any effect depend on a derived object rather than a stable identity?
- [ ] Once a form is open, is the user its only writer?
- [ ] Does every collapsed control panel still show what it is currently doing?
- [ ] Does a new concept land in the derivation layer, so every reader gets it for free?
- [ ] Is the new field optional with a safe absent-meaning, so no migration is needed?
- [ ] If a value can be set by a person or by a rule, does the record say which?
- [ ] Does every self-filling field have a defined stopping condition — including the user clearing it?
