# Tournament Bracket Generator V1 Plan

## Summary
Build a knockout-only bracket generator with manual seeding by default, plus Randomize and Reset-to-registration-order controls. Split the implementation into 5 commit-sized parts: backend schema, generation API, advancement logic, management UI, and public UI/navigation.

## Part 1 — Bracket Schema + Basic Read API
- Add Prisma migration for a new `bracketmatches` table.
- Store bracket nodes with tournament, round, position, nullable teams, winner, linked match, next node, next slot, optional schedule/venue.
- Add model relations in Prisma schema.
- Add `GET /brackets/tournament/:turneuId` for admin/own-organizer.
- Add `GET /brackets/public/tournament/:turneuId` for public read-only.
- Register `bracketsRoutes` in `server.js`.

Suggested commit:
```text
Add bracket match schema and read endpoints
```

## Part 2 — Bracket Generation API
- Add `POST /brackets/tournament/:turneuId/generate`.
- Allow admins and owning organizers only.
- Use only `Aprovuar` registered teams.
- Accept ordered `team_ids` from the frontend.
- Require at least 2 approved teams.
- Validate that every submitted team belongs to the tournament.
- Use next power of two for bracket size.
- Support byes.
- Create first-round bracket nodes.
- Create linked `matches` immediately when both teams are known.
- Auto-advance bye teams into the next round.
- Reject generation if a bracket already exists.
- Add `DELETE /brackets/tournament/:turneuId` reset route, blocked once results/progress exist.

Suggested commit:
```text
Add knockout bracket generation API
```

## Part 3 — Result Advancement Logic
- Update match result permissions so admins and owning organizers can create/update/delete results for their tournament matches.
- For bracket-linked matches:
  - reject draws
  - determine winner from `fitues_id` or score
  - save winner on the bracket node
  - advance winner into the configured next bracket slot
  - create the next linked match once both teams are known
- On result updates, recompute winner and downstream slot.
- On result delete, block deletion if downstream bracket progress already exists.
- Keep standings recalculation behavior unchanged.

Suggested commit:
```text
Advance bracket winners from match results
```

## Part 4 — Admin/Organizer Bracket Management UI
- Add shared management page, for example `frontend/src/pages/admin/Brackets.jsx`.
- Add routes:
  - `/brackets`
  - `/organizer/brackets`
- Add navigation links in admin and organizer sidebars.
- UI includes:
  - tournament selector
  - approved team seed list
  - move up/down controls
  - Randomize Seeds button
  - Reset to Registration Order button
  - start date/time and optional venue selectors
  - Generate Bracket button
  - Reset Bracket button
  - bracket tree grouped by round
- Show match cards with team names, status, score/winner, and linked match id.
- Keep mobile layout stacked and readable.

Suggested commit:
```text
Add bracket management UI
```

## Part 5 — Public Bracket Page + Polish
- Add public page, for example `frontend/src/pages/Users/PublicBrackets.jsx`.
- Add public route `/public/brackets`.
- Add public navbar/footer link.
- Public UI:
  - tournament selector
  - read-only bracket tree
  - empty state when no bracket exists
  - clear champion/final winner display when complete
- Polish dark mode, mobile spacing, loading states, and error states.
- Run final checks.

Suggested commit:
```text
Add public bracket viewer
```

## Test Plan
- Backend:
  - `npx prisma validate`
  - `node --check backend/src/routes/bracketsRoutes.js`
  - `node --check backend/src/routes/matchResultsRoutes.js`
  - `node --check backend/src/server.js`
- Frontend:
  - `npx eslint src/pages/admin/Brackets.jsx src/pages/Users/PublicBrackets.jsx src/App.jsx`
  - `npm run build`
- Manual:
  - generate 4-team bracket
  - generate 5-team bracket and verify byes
  - generate 8-team bracket
  - randomize seeds and verify pairings change
  - reset to registration order and verify seed order returns
  - enter a result and verify winner advances
  - verify next match is created when both teams are known
  - verify organizer can manage only own brackets
  - verify public bracket is read-only
  - verify reset is blocked after bracket progress
  - verify mobile bracket layout does not overflow

## Assumptions
- V1 supports knockout brackets only.
- Manual seed order is default.
- Randomize Seeds is optional and controlled by the user before generation.
- Public brackets are read-only.
- Live chat is deferred until bracket generation is stable.
