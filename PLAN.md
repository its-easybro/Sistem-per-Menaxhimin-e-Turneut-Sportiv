**Live Matches Enhancement Plan**

**Summary**
The project already has a basic live-match foundation: `matches.statusi`, `matchresults` for scores, `matchevents` for card events, Socket.IO broadcasts, a match cron, a simple simulator, and a public `/live-matches` page. The next work should build on this instead of replacing it.

Implement first: **MatchEvents API + live event creation**, because it unlocks detailed timelines, goal-driven score updates, status events, and the public match page.

**1. What Already Exists**
- Database:
  - `matches` has teams, tournament, date/time, `statusi`, `faza`, and `kohezgjatja`.
  - `matchresults` stores `golat_shtepiak`, `golat_mysafir`, `fitues_id`, notes, MVP.
  - `matchevents` already exists in `schema.prisma` with `ndeshja_id`, `lojtari_id`, `ekipi_id`, `lloji`, `minuta`, `created_at`.
- Backend:
  - Routes are implemented directly under `backend/src/routes`; there are no controller files.
  - `matchesRoutes.js` has CRUD, `GET /matches/public/live`, and `PATCH /matches/:id/score`.
  - `matchCron.js` automatically changes `Planifikuar -> Live -> Përfunduar`.
  - `matchSimulator.js` creates random yellow/red card events.
  - Socket.IO is configured in `server.js` and currently emits global events: `match_live`, `match_finished`, `score_update`, `card_event`.
- Frontend:
  - Shared socket client exists in `frontend/src/socket.js`.
  - Public `/live-matches` page exists and displays live/recent matches, scores, timer, status, and card timeline.
  - Admin match modal can update live score.
  - Admin/organizer/referee routes reuse the same LiveMatches page.

**2. What Is Missing**
- No dedicated public detail page like `/live-matches/:id`.
- No backend route for creating/updating/deleting match events manually.
- Current events are mostly “card events”; no clean support for `Goal`, `YellowCard`, `RedCard`, `Substitution`, `HalfTime`, `FullTime`.
- Goal events do not automatically update score.
- Status changes do not have dedicated endpoints like start, half-time, finish.
- Sockets are global broadcasts only; no per-match rooms like `match-{id}`.
- `matchevents` lacks useful demo fields: free-text `player_name`, `description`, and `created_by_user_id`.
- Winner calculation is not centralized; `fitues_id` is mostly manually handled through match results.
- Organizer/referee live controls are incomplete: no add-event form, no event timeline management.

**3. Database Changes Needed**
- Keep existing `matches`, `matchresults`, and `matchevents`; extend rather than replace.
- Update `matchevents` with:
  - `player_name String?`
  - `description String?`
  - `created_by_user_id Int?` relation to `User`
- Standardize `matchevents.lloji` values in backend validation:
  - `Goal`, `YellowCard`, `RedCard`, `Substitution`, `HalfTime`, `FullTime`, `Penalty`, `OwnGoal`
- Optional but recommended:
  - Add `started_at DateTime?` and `finished_at DateTime?` to `matches`.
  - Keep `statusi` as current Albanian values for compatibility: `Planifikuar`, `Live`, `Pjesa e parë`, `Përfunduar`, `Shtyrë`, `Anuluar`, or use `HalfTime` only if all frontend/backend status handling is updated together.
- Create a Prisma migration for these changes; baseline migration currently does not appear to include `matchevents`, so verify DB migration history before applying.

**4. Files To Edit**
- Backend:
  - `backend/prisma/schema.prisma`
  - Add migration under `backend/prisma/migrations/...`
  - `backend/src/routes/matchesRoutes.js`
  - Add `backend/src/routes/matchEventsRoutes.js`
  - `backend/src/server.js`
  - `backend/src/services/matchCron.js`
  - `backend/src/services/matchSimulator.js`
  - Add small service helper, preferably `backend/src/services/matchLiveService.js`, for event creation, score updates, status updates, and winner calculation.
- Frontend:
  - `frontend/src/App.jsx`
  - `frontend/src/pages/Users/LiveMatches.jsx`
  - Add `frontend/src/pages/Users/PublicLiveMatch.jsx`
  - Add reusable live UI pieces if needed, such as `MatchTimeline`, `LiveScoreBoard`, `MatchEventForm`, `MatchStatusControls`.
  - `frontend/src/pages/admin/Matches.jsx`
  - `frontend/src/pages/organizator/Matches.jsx`
  - Possibly `frontend/src/socket.js` only if room helpers are centralized.

**5. Feature To Implement First**
Implement **MatchEvents API + live event creation** first.

This should include:
- `GET /matches/:id/events`
- `POST /matches/:id/events`
- `PUT /match-events/:eventId`
- `DELETE /match-events/:eventId`
- Validation for event type, minute, team, player name, and match status.
- If event type is `Goal` or `OwnGoal`, update `matchresults` automatically.
- Emit Socket.IO events to `match-{id}`:
  - `match-event-created`
  - `score-updated`
  - `match-status-updated` when relevant

**Public API / Socket Changes**
- Add REST:
  - `GET /matches/public/live/:id`
  - `GET /matches/:id/events`
  - `POST /matches/:id/events`
  - `PATCH /matches/:id/status`
  - `POST /matches/:id/finish`
- Add Socket.IO rooms:
  - Client emits `join-match` with `matchId`.
  - Server joins `match-${matchId}`.
  - Server emits match-specific updates to that room.
- Keep old events temporarily for compatibility:
  - `score_update`, `card_event`, `match_live`, `match_finished`
- Add new clearer events:
  - `score-updated`
  - `match-event-created`
  - `match-status-updated`
  - `match-finished`

**Test Plan**
- Backend:
  - Create a goal event and verify `matchevents` row is saved.
  - Verify goal event increments the correct score.
  - Verify events cannot be added to `Përfunduar` matches.
  - Verify negative scores and invalid minutes are rejected.
  - Verify organizer can only update matches in their tournaments.
  - Verify referee can update only assigned matches.
- Frontend:
  - Open admin/organizer live controls and public page in two tabs.
  - Add goal, yellow card, red card, and substitution.
  - Confirm timeline updates without refresh.
  - Confirm score updates without refresh.
  - Finish match and confirm status/winner display updates.
- Socket:
  - Confirm users only receive updates for joined match rooms.
  - Confirm `/live-matches` list still updates for broad live status changes.

**Assumptions**
- Keep current route style: Express routes contain controller logic unless a helper service reduces duplication.
- Keep current Albanian database field names and status labels for compatibility.
- Focus on one public live match detail page and event timeline before dashboard live cards or bracket updates.
- Do not implement live bracket updates, notifications, audit logs, or full match stats in this first pass.
