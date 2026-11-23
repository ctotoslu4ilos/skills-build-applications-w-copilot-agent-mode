# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. Its presentation, logic, and data tiers are separated so each can be implemented and verified through its contracts.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Look up a user by email and prefer workouts whose `focus` matches their fitness goal or mapped recent activity pattern; include a `reason` explaining the recommendation. An unknown email returns a deliberate 4xx (`404`). |

## Implementation decisions

- Presentation tier decision: React route components use a shared `getJson` client, relative `/api` paths, and a shared card for loading, empty, and accessible error states. The screens display API data for activities, teams, leaderboard rankings, and workout suggestions; the workout screen requests suggestions for the seeded Mona account (`mona@example.com`).
- Logic tier decision: Express routes delegate to service functions. The API validates request bodies and ObjectId formats, checks referenced users/teams, and returns deliberate 4xx responses for invalid or missing resources.
- Data tier decision: Mongoose schemas require the user identity and fitness goal, team name and mascot, activity references/type/minutes/points/date, and workout title/focus/minutes/difficulty. Team members default to an empty array. The seed uses stable upserts and reconciles a seeded user's previous team membership without clearing unrelated records.
- Activity tracking approach: `GET /api/activities` lists records. `POST /api/activities` accepts `userId`, `teamId`, `type`, and positive `minutes`; it validates IDs and existing references, stores the references/type/minutes, assigns points equal to minutes, and sets `occurredAt` to the current time.
- Team management approach: `GET /api/teams` lists teams. `POST /api/teams` requires nonblank `name` and `mascot`, accepts an optional array of valid existing user IDs as `members`, and returns the created team.
- Leaderboard approach: Aggregate activity points by team, include teams with no activities at zero points, sort descending by total points (team name breaks ties), and assign 1-based ranks.
- Workout suggestions approach: Look up a user by case-insensitive email and return `404` when none exists. Analyze that user's ten most recent activities, map common types such as run/cycle to endurance and strength to strength, and prefer matching workouts; without activity history, use the user's fitness goal. Suggestions include a reason describing the activity pattern or goal.

## Test plan

- `npm run test:data --prefix octofit-tracker/backend` — passed; 1 test file, 5 tests.
- `npm run test:api --prefix octofit-tracker/backend` — passed; 1 test file, 4 tests.
- `npm test --prefix octofit-tracker/frontend` — passed; 1 test file, 15 tests.
- `npm run build --prefix octofit-tracker/backend` — passed; TypeScript check completed.
- `npm run build --prefix octofit-tracker/frontend` — passed; TypeScript check and Vite production build completed.
