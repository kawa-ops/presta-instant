# presta-instant — Product & Code Audit
*Fable 5 review — 2026-07-09. No code was modified as part of this audit.*

Scope reviewed: all 26 API routes, all admin/freelancer/portal pages, gamification engine, schema, notifications, cron jobs, deps.

---

## 🔴 High Impact / Low Effort — quick wins

### 1. Add database indexes (Performance)
**Why:** The schema has **zero indexes** beyond primary keys and unique constraints. Every dashboard load filters `Production` by `assignedToId + status + deadline + archived`, `Notification` by `userId + read`, `XpEvent` by `userId + createdAt` — all full table scans today.
**Impact:** Every page gets faster as data grows; this is the single cheapest perf win available.
**Complexity:** ~30 min — add `@@index` lines + `CREATE INDEX IF NOT EXISTS` in `ensure.ts`.

### 2. Unify the migration strategy (Engineering — latent bug)
**Why:** `ensureSchema()` is only called from `/api/setup` and the new `/api/facturation/details`. Any new column (e.g. `payoutMonth`) silently doesn't exist for other routes until one of those two endpoints is hit on that lambda. The `.catch(() => {})` pattern hides these failures completely.
**Impact:** Eliminates a whole class of "it works after I visit page X" bugs.
**Complexity:** Low — call `ensureSchema()` from a shared `withAuth()` helper, or better: adopt real Prisma migrations (`prisma migrate deploy` in the Vercel build command) and delete `ensure.ts` entirely.

### 3. Extract the duplicated leaderboard/achievements/glass-card JSX (Engineering)
**Why:** The podium leaderboard (~60 lines), achievements showcase (~25 lines), `glass` style object, and Health widget are copy-pasted between the admin dashboard and the freelancer dashboard. `STATUS_COLORS`/`STATUS_LABELS` are re-declared locally in `semaine/page.tsx` instead of importing `lib/statuses`. Every visual tweak now has to be made 2–3 times (this bit us twice this week).
**Impact:** Halves the cost of every future dashboard change.
**Complexity:** Low — `components/Leaderboard.tsx`, `components/AchievementsCard.tsx`, `lib/ui.ts` (glass + shared keyframes).

### 4. Replace native `confirm()` / `alert()` dialogs (UX)
**Why:** "Marquer payé ?", "Retirer de la facturation ?", upload errors — all use browser-native dialogs that clash hard with the premium purple UI and can't be styled or translated.
**Impact:** Instantly more polished; consistent with brand.
**Complexity:** Low — one reusable `<ConfirmModal>` + a toast helper (the toast system already exists in `LiveNotifications`).

### 5. Make CRON_SECRET mandatory (Security)
**Why:** Cron routes check the bearer token *only if the env var is set*. If it's ever unset (env copied to a new project, preview env), reminders/weekly digests become publicly triggerable → notification/WhatsApp spam.
**Impact:** Closes a real, cheap-to-close hole.
**Complexity:** 5 min — return 401 when `CRON_SECRET` is missing.

### 6. Debounce/centralise polling (Performance)
**Why:** `LiveNotifications` polls every 10 s, both dashboards poll stats/gamify/leaderboard every 20 s, plus `focus` and `live-refresh` listeners. An open dashboard fires ~12 requests/min per user, each hitting Postgres.
**Impact:** Lower Vercel/Supabase bills, snappier UI, less lambda cold-start pressure.
**Complexity:** Low — single shared poller context (one `/api/pulse` endpoint returning notifications + stats + gamify in one query batch), interval 30 s, pause when tab hidden (`document.visibilityState`).

### 7. Finish the localisation you started (UX / consistency)
**Why:** The FR/EN/ES switcher is prominent, but Post-productions tables, billing pages, modals, and most forms stay French in EN/ES. A half-translated app reads as broken to the very users the switcher targets.
**Impact:** Either finish coverage or hide the switcher on untranslated pages — both are quick; inconsistency is the only wrong state.
**Complexity:** Low-medium (mechanical `t()` extraction; the i18n system already works).

### 8. Empty/loading state for the Brief button + slow actions (UX)
**Why:** Several actions (Brief du jour, payout expand, avatar upload) have busy states, but many buttons still give no feedback for 1–2 s on cold lambdas. Users double-click, which is how duplicate payout rows happen.
**Impact:** Perceived speed + prevents double submits.
**Complexity:** Low — disable-while-pending pattern on all mutating buttons.

---

## 🟠 High Impact / Medium Effort

### 9. Recompute payouts from productions everywhere (Engineering / data integrity)
**Why:** `MonthlyPayout.validatedAmount` is an *accumulator* (incremented on validation) while the new billing detail recomputes from `payoutMonth`-tagged productions. Two sources of truth: un-validating a production, deleting one, or changing its price outside the billing page silently desyncs the total.
**Impact:** Billing that is always right — critical for money.
**Complexity:** Medium — make `syncPayout()` the only writer (call it on every validation/price change/delete), drop the increment logic; backfill script for history.

### 10. Input validation layer — zod (Security / Engineering)
**Why:** No request body is validated anywhere; fields are destructured and passed to Prisma. `prisma as any` disables the last line of type defence. A malformed `price: "abc"` or unexpected field reaches the DB or produces `NaN` totals.
**Impact:** Prevents data corruption (money fields!) and injection of unexpected fields; restores end-to-end typing.
**Complexity:** Medium — zod schema per route, shared `parseBody(schema, req)` helper; remove `as any` by regenerating the Prisma client and fixing type errors.

### 11. Mobile responsiveness pass (UX)
**Why:** Fixed columns (`1fr 380px`), 7-column planning grid, wide billing rows — the app is desktop-only in practice, but providers will check tasks and upload invoices from their phone, and admins will validate deliveries on the go.
**Impact:** Highest-leverage UX gap for the provider audience.
**Complexity:** Medium — CSS grid `auto-fit`/media queries, planning becomes vertical day-list on mobile, tables become cards. ~2–3 focused sessions.

### 12. Deadline risk & workload view in the planner (Product)
**Why:** The week view shows deadlines but not *capacity*. Overloads only surface after they happen (the "8 deadlines — à déléguer" hint is per-week, not per-person).
**Impact:** The core admin decision — "who takes this job?" — becomes data-driven.
**Complexity:** Medium — per-provider row in Mon planning (swimlanes) + count of open jobs per provider on the assignment dropdown.

### 13. Client portal notifications back to the studio (Product / workflow)
**Why:** When a client approves or comments on the public portal, the assigned provider learns about it only via the admin. Notifying provider + admins directly on `clientApprovedAt`/portal comments removes a relay step.
**Impact:** Cuts hours from the feedback loop — the workflow's slowest edge is the human relay.
**Complexity:** Medium — hooks already exist in `/api/suivi/[token]`; add notification + WhatsApp fan-out and a "client viewed the delivery" event (open-tracking pixel level of effort).

### 14. Activity timeline per production (Product)
**Why:** `ProductionEvent` already records every status change, but no UI shows it. "When did this go to the client? how long did revisions take?" is answerable from data you already store.
**Impact:** Dispute resolution + cycle-time metrics for free.
**Complexity:** Medium — timeline tab in the production expand panel; later, aggregate stats (avg time per stage) on the dashboard.

### 15. Real AI Brief + assistant (AI)
**Why:** `/api/brief` is rules-based. Upgrading to the Claude API (`claude-sonnet-5` or `claude-haiku-4-5` for cost) with the day's productions/deadlines/leaderboard as context unlocks: prioritised action plan, risk callouts ("Saint-Pierre has been in revisions 6 days"), and drafted client messages.
**Impact:** The "Brief du jour" button becomes the daily starting point instead of a novelty.
**Complexity:** Medium — one API route change + `ANTHROPIC_API_KEY`; keep the rules engine as fallback.

### 16. Notification preferences & digest (Product / UX)
**Why:** Every event fires immediately (in-app + email + WhatsApp in some paths). Leaderboard-overtake pings on *every XP grant* will get noisy fast and train users to ignore the channel.
**Impact:** Protects the value of notifications long-term.
**Complexity:** Medium — per-user toggles (instant / daily digest / off per category) + batch the low-priority ones into the existing evening cron.

### 17. Error boundaries + Sentry-class monitoring (Engineering)
**Why:** No React error boundaries and no error reporting: a render crash gives a white screen and you only learn about it when Axel or a provider complains.
**Impact:** You see production errors before users report them.
**Complexity:** Medium — `error.tsx` per route group (styled), plus Sentry (free tier) or Vercel's built-in log drains.

### 18. Test the money paths (Engineering)
**Why:** Zero automated tests. Most of the app tolerates bugs; the payout credit/recalc logic does not. A regression there costs real euros and trust.
**Impact:** Safe iteration on the code you're changing most often.
**Complexity:** Medium — Vitest + a handful of integration tests on `awardXp`, payout credit transition, `syncPayout`, and the details PATCH. ~15 tests cover 90 % of the risk.

---

## 🔵 Long-Term Improvements

### 19. Design system extraction (UX / Engineering)
Inline styles everywhere: ~7 000 lines of JSX with hardcoded rgba strings. Extract tokens (colors, radii, glass, type scale) into Tailwind config or CSS variables + ~10 primitive components (`Card`, `Badge`, `StatCard`, `ProgressBar`, `Modal`). This is the enabler for every future UI change and for mobile. *Do it gradually — new components first, migrate old screens opportunistically.*

### 20. Multi-tenant readiness (Scalability)
Everything assumes one studio: `getLucasId()` hardcodes an email, ranks are role-based, `MonthlyPayout` has no org scope. If instant. ever white-labels this for other agencies (it's genuinely sellable), you'll need an `Organization` model, org-scoped queries, and role config. Decide early whether that's the ambition — retrofitting tenancy is 10× the cost of building with it.

### 21. XP ledger scalability (Performance)
`awardXp` runs `groupBy` over the **entire XpEvent table on every grant** (for overtake detection), and leaderboard/streak computations re-scan history per request. Fine at 8 users; painful at 50. Fix: materialised `UserStats` row (totalXp, level, streak, updated transactionally on grant) + periodic ledger compaction (roll events older than 90 days into a snapshot).

### 22. Real file storage strategy (Engineering)
The Blob public/private saga shows the current setup is fragile. Long term: one public store for avatars (harmless), invoices behind the authenticated `/api/file` proxy with private storage or signed URLs (Supabase Storage would also work since you're already on Supabase — one less vendor).

### 23. Client-facing expansion (Product)
The portal is read-only + approve. Natural roadmap: client accounts with history across productions, deliverable download page with expiry, satisfaction rating after approval (feeds provider stats/XP), and later client-side brief submission → auto-creates a production. This turns the tool from internal ops into a client-experience differentiator for instant.

### 24. Seasonal gamification layer (Gamification)
The foundation (XP, ranks, prestige, ornaments, streaks) is strong. Next tier, in order of motivational return: **weekly team challenge** (studio-wide goal, e.g. "25 livraisons cette semaine" with a collective reward — builds cooperation, offsets the competitive leaderboard), **monthly season** with a season-end recap screen (best streak, fastest delivery, MVP), **quest chains** ("deliver 3 days in a row before noon"), and cosmetic-only rewards (profile banners, title cards) so progression never touches real money fairness. Avoid: daily login rewards (attendance ≠ output) and XP for volume alone (quantity gaming).

### 25. AI operations layer (AI)
Once the Claude API is wired for the Brief (item 15), extend incrementally:
- **Auto-assignment suggestions** — match new productions to providers by current load, past cycle time on similar jobs, and rate.
- **Deadline risk prediction** — flag productions likely to slip based on stage-duration history from `ProductionEvent`.
- **Client message drafting** — delivery emails, revision acknowledgements, delay notices, in the studio's tone.
- **Invoice sanity check** — compare uploaded invoice amount vs. `validatedAmount` before the pay button is enabled.
- **Weekly retro generation** — the evening/weekly crons become narrative summaries with anomalies called out.
Each is a self-contained route; the data model already supports all of them.

### 26. Auth hardening (Security)
Credentials auth is fine for 10 users but has no rate limiting (brute-forceable), no password reset flow (admin resets manually), and no 2FA. Before any client accounts or external users: add login rate limiting (Upstash ratelimit or Vercel firewall rules), magic-link or reset-by-email via Resend, and optional TOTP for admins.

---

## Known open items (carried from this session)
- **Vercel Blob** "access must be public" — awaiting confirmation the new public store works end-to-end.
- **WhatsApp permanent token** — Meta System User token setup not confirmed; the temp token will expire.
- **Ornament openings** — the per-tier `OPENING` percentages in `Avatar.tsx` should be visually checked at tiers 4–10.

## Suggested order of attack
1. Items **1, 2, 5** (an afternoon — indexes, migrations, cron lock) → the platform stops accumulating silent risk.
2. Items **9, 10** (money integrity + validation) → billing becomes trustworthy.
3. Items **3, 4, 6, 8** (dedup + dialogs + polling) → faster and cleaner to build on.
4. Then choose one flagship per week from the 🟠 list — **11 (mobile)** and **15 (AI brief)** have the best value/effort ratio for how the team actually works.
