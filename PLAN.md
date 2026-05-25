**Live Matches Enhancement Plan**

**Summary**
The live-match feature now has the main pieces needed for a strong demo: live scores, match events, editable/deletable event lifecycle, public live list, and a public single-match detail page.

Socket rooms are intentionally deferred. The current global Socket.IO events are good enough for this project stage, and the next work should stay focused on visible user-facing value.

**Completed**
- Backend:
  - Added `GET /matches/:id/events`.
  - Added `POST /matches/:id/events`.
  - Added `PUT /match-events/:eventId`.
  - Added `DELETE /match-events/:eventId`.
  - Added `PATCH /matches/:id/status`.
  - Added `POST /matches/:id/finish`.
  - Added `GET /matches/public/live/:id`.
  - Goal events update `matchresults` automatically.
  - Edited/deleted goal events keep score consistent.
  - Event mutations are restricted to admins, organizers, and assigned referees.
  - Finished matches reject event mutations.
  - Socket updates emit after create/update/delete and score changes.
- Database:
  - Extended `matchevents` with optional `player_name`, `description`, and `created_by_user_id`.
  - Added Prisma migration for event metadata.
- Frontend:
  - Restyled `frontend/src/pages/Users/LiveMatches.jsx` to match the existing dashboard UI.
  - Added quick Goal/Yellow/Red event controls with optional player/minute/description fields.
  - Added event edit/delete controls in the live feed.
  - Added `frontend/src/pages/Users/PublicLiveMatch.jsx`.
  - Added `/live-matches/:id` route.
  - Linked the live match dashboard to the public detail page.
  - Kept `/live-matches`, `/admin/live-matches`, `/organizer/live-matches`, and `/referee/live-matches` sharing the same live dashboard component.

**Current Priority**
Finish the visible public live-match flow.

1. Manually test `/live-matches`.
2. Click a match `Details` link and confirm `/live-matches/:id` opens.
3. Confirm the public detail page shows score, timer, match metadata, timeline, and snapshot cards.
4. As admin/organizer/referee, add Goal/Yellow/Red events and confirm the public detail page updates.
5. Check light and dark mode on both live pages.

**Recommended Next Work**
- Polish the public detail page after manual testing:
  - Improve empty states if no event exists.
  - Add a clearer “recently finished” state.
  - Add better mobile spacing if needed.
- Add player selection later if the player data is reliable for both teams.
- Add richer match stats later, such as shots, fouls, possession, and MVP.
- Centralize winner calculation when finishing matches.

**Deferred**
- Socket.IO match rooms.
- Match-specific chat.
- Full audit logs.
- Bracket auto-refresh from live results.
- Separate spectator-only and staff-only live pages.

**Verification Commands**
- Backend syntax:
  - `node --check backend/src/routes/matchEventsRoutes.js`
  - `node --check backend/src/routes/matchesRoutes.js`
- Frontend:
  - `npx eslint src\pages\Users\LiveMatches.jsx src\pages\Users\PublicLiveMatch.jsx src\App.jsx`
  - `npm run build`

**Assumptions**
- Keep global socket broadcasts for now.
- Keep the shared live dashboard for public/admin/organizer/referee routes.
- Keep backend route style inside Express route files unless duplication becomes painful.
- Do not build more socket infrastructure until the visible live-match flow is fully tested.
