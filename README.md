# SafeTrip – Journey Safety App

Final-year project for sharing a live cab / auto / bike trip with trusted contacts so they can see where you are, get an ETA, and receive an SOS if something goes wrong.

Repository: [https://github.com/Kourpreetika/safeTrip](https://github.com/Kourpreetika/safeTrip)

## Problem statement

When a person travels alone in a cab, auto, or bike taxi, family members often have no way to follow the trip unless the traveller keeps sending WhatsApp locations. If the vehicle takes a strange route, or if the traveller needs help, there is a delay before anyone notices. SafeTrip is a web application that watches one journey at a time: the traveller starts a trip with pickup, destination, driver and vehicle details, and selected contacts can follow a live map. The system also checks whether the GPS point is still near the planned route and whether the traveller has reached the destination.

## Objectives

1. Let a registered user add trusted contacts and start a journey with start/destination and ride details.
2. Show live location, planned route, and ETA on a map (for the traveller and for people with the tracking link).
3. Notify contacts when a journey starts, when the user goes off-route, when they arrive, and when SOS is pressed.
4. Provide a shareable tracking URL so contacts do not need an account to watch the map.
5. Store past journeys so the user can look at history after the trip.

## Tech stack (and why I used it)

| Layer | Technology | Why |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Easy to split the app into pages (login, dashboard, map). TypeScript helps catch mistakes in forms and API responses. |
| Styling | Tailwind CSS | Faster than writing a large CSS file by hand; still just utility classes. |
| Map | Leaflet + OpenStreetMap | Free map tiles. No Google Maps billing key needed. |
| Backend | Node.js + Express | Same language as the frontend. REST APIs are straightforward to explain. |
| Real-time | Socket.IO | Contacts see location updates without refreshing the page. |
| Database | PostgreSQL + Prisma | Postgres keeps users, contacts, and history after deploys. Local: `docker compose up -d`. Hosted: set `DATABASE_URL` to a Render/Neon Postgres URL (not SQLite). |
| Routing | OSRM | Live remaining-route ETA on the real road network (not a straight-line guess). |
| Alerts | Telegram Bot API | Trusted contacts get location, ETA, and the tracking link in Telegram. Free. |
| Geocoding | Nominatim (OpenStreetMap) | Address search and reverse geocoding for the start/destination fields. |

## Modules / screens

| Screen | What it does |
| --- | --- |
| Home (`/`) | Public landing: what SafeTrip does, features, how it works, who it is for. Header: Home, Login, Register (or Dashboard / Create Journey / Contacts / History / Profile if logged in). |
| Login / Register | JWT cookie auth. Password must be 8+ characters with a letter and a number. |
| Dashboard | Counts of trips, completed journeys, km, SOS events. Link to start a trip. Incoming trips if someone listed you as a contact. |
| Contacts | Add / edit / remove trusted people (name, phone, optional email). |
| Create journey | Pickup, destination, driver, vehicle, ride service, contacts. Search real places or use current GPS as start. |
| Active journey | Live map from the browser Geolocation API, ETA, SOS, cancel SOS, end trip. |
| Public track (`/track/:token`) | Same map for anyone who has the link. No login required. |
| History | Past journeys with status and whether SOS was used. |
| Profile | Name and phone. Email cannot be changed. |

## Architecture

The browser talks to Express over REST for login, contacts, and journeys. While a trip is active, the frontend posts GPS points from `navigator.geolocation`. The backend stores each point, recalculates ETA and off-route status, and emits a Socket.IO event so open map pages update. Contacts who have a SafeTrip account (same email as in the contact list) also get in-app notifications.

```mermaid
flowchart LR
  Traveller[Traveller browser] --> API[Express API]
  Contact[Contact browser / track link] --> API
  API --> DB[(PostgreSQL)]
  API --> IO[Socket.IO]
  IO --> Contact
  API --> OSM[Nominatim + OSRM]
  Traveller --> OSM
```

```
Traveller  --REST-->  Express  --Prisma-->  PostgreSQL
                 |
                 +-- Socket.IO --> contact / track page
                 +-- Nominatim (search address)
                 +-- OSRM (planned driving route)
```

## Database tables

PostgreSQL tables are created by Prisma (`backend/prisma/schema.prisma`). Locally, start Postgres with `docker compose up -d` then `npm run db:push --prefix backend`.

```mermaid
erDiagram
  User ||--o{ TrustedContact : has
  User ||--o{ Journey : starts
  User ||--o{ Notification : receives
  Journey ||--o{ JourneyContact : notifies
  TrustedContact ||--o{ JourneyContact : selected
  Journey ||--o{ LocationUpdate : gps
  Journey ||--o{ SosEvent : sos
```

- **User** – account (email, hashed password, name, phone).
- **TrustedContact** – people the user wants to notify. Email is optional; if it matches another User, they get in-app alerts.
- **Journey** – one trip: start/destination coordinates, driver, vehicle, status (`draft` / `active` / `completed`), current lat/lng, ETA, off-route flag, share token.
- **JourneyContact** – join table: which contacts were selected for that journey.
- **LocationUpdate** – each GPS ping with lat, lng, optional speed.
- **SosEvent** – when SOS was pressed; can be cancelled.
- **Notification** – in-app messages for registered contacts.

## Main APIs

Most routes except auth, health, geo, and public track need a logged-in cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (sets cookie) |
| POST | `/api/auth/logout` | Clear cookie |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/contacts` | List / add contacts |
| PUT/DELETE | `/api/contacts/:id` | Edit / remove a contact |
| GET | `/api/journeys` | My journey history |
| GET | `/api/journeys/incoming` | Active trips where I am a contact |
| GET | `/api/journeys/stats` | Dashboard numbers + current active trip |
| POST | `/api/journeys` | Create a journey (draft) |
| POST | `/api/journeys/:id/start` | Start tracking and notify contacts |
| POST | `/api/journeys/:id/end` | End the trip manually |
| POST | `/api/journeys/:id/locations` | Send a GPS point from the browser |
| POST | `/api/journeys/:id/sos` | Trigger SOS |
| POST | `/api/journeys/:id/sos/cancel` | Cancel SOS |
| GET | `/api/track/:token` | Public live map payload |
| GET | `/api/geo/search` | India place / PIN search (Nominatim) |
| GET | `/api/geo/route` | Live driving route + ETA (Google traffic if configured, else OSRM) |
| GET | `/api/notifications` | In-app alerts |
| PATCH | `/api/users/me` | Update name / phone |

## How live tracking, SOS, and route deviation work

**Distance (Haversine).** Two GPS points are converted to metres using the Haversine formula (great-circle distance on Earth, radius 6371 km). This is used for remaining distance, arrival, and how far the user is from the route.

**Live tracking.** Every few seconds the active-journey page reads the browser Geolocation API (`watchPosition`) and sends `lat` / `lng` to `POST /api/journeys/:id/locations`. The server saves a `LocationUpdate`, updates `currentLat` / `currentLng` on the journey, and broadcasts `location:update` on Socket.IO rooms `track:<shareToken>` and `journey:<id>`. The public track page joins the same room, so the marker moves without a full reload. If SOS is on, the frontend polls GPS more often (about 3 seconds instead of 8). If location permission is denied or GPS times out, the app shows an error and does not invent coordinates.

**ETA.** The server asks OSRM for the remaining drive from the *current* GPS point to the destination (not a fixed number typed at the start). If that fails, the last known live ETA is kept and the UI shows “Updating…”. The route is refreshed about every 45 seconds (sooner if the user is off the planned path). If a new path is clearly shorter, the map polyline is replaced.

**Telegram to trusted contacts.** Contacts must have a valid Indian mobile number (10 digits, starts with 6–9). They open `@SafeTripAlertBot`, tap Start, and send that same number. Then journey start, SOS, off-route, and arrival alerts go to Telegram with location, ETA, destination, and the `/track/...` link. Frequency follows the *latest* ETA:

- under 15 minutes → every 3 minutes
- 15–40 minutes → every 4 minutes
- above 40 minutes → every 5 minutes

Journey start, SOS, and arrival send immediately. If the bot token is missing, or a contact has not linked Telegram, trips still work; in-app alerts still send.

**Destination arrival.** If the current point is within **120 metres** of the destination (a simple radius / geofence), the journey is marked completed and contacts are notified. This avoids waiting for an exact coordinate match.

**Route deviation.** The planned route is a list of lat/lng points (a polyline). For each new GPS point we compute the shortest distance to any segment of that line. If that distance is more than **350 metres**, the point is treated as off-route. One bad GPS jump should not raise an alarm, so the server waits for **3 off-route points in a row** before setting `offRoute` and notifying contacts.

**SOS.** The red SOS button asks for confirmation, then `POST /api/journeys/:id/sos` stores an `SosEvent` using the current (or last known) GPS position, sets `sosActive`, and notifies registered contacts with driver name, vehicle number, ride ID, and a Google Maps link. The traveller can cancel if it was a mistake (`/sos/cancel`). Contacts still see the live map.

**Share link.** Each journey gets a random `shareToken` (nanoid). `/track/:token` does not require login. Only people who have the URL can open that map.

## How to run

Needs Node.js 20+. After `db:push` the database is empty — register your own account. There are no pre-made users.

```bash
npm install
npm run setup
npm run dev
```

Or step by step:

```bash
npm install
cd backend && npm install && npx prisma generate && npx prisma db push
cd ../frontend && npm install
cd ..
docker compose up -d
cd backend && npx prisma db push
cd ..
npm run dev
```

- Frontend: http://localhost:5173
- API health: http://localhost:4000/api/health

Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL` to Postgres (local docker: `postgresql://safetrip:safetrip@localhost:5432/safetrip`). Set `TELEGRAM_BOT_TOKEN` from [@BotFather](https://t.me/BotFather). Contacts open `t.me/SafeTripAlertBot`, tap Start, and send their 10-digit mobile. `/api/health` reports `telegramConfigured`.

Location search (OpenStreetMap) and OSRM routing do not need extra keys.

On Render, create a **Postgres** database, copy its Internal Database URL into the **safeTrip** service as `DATABASE_URL`, then deploy. Do not use `file:./dev.db` on Render — that file is deleted when the free instance sleeps, which wipes accounts, contacts, and history.

### Get started

1. Open http://localhost:5173 and **Register** with your name, email, and password.
2. Add at least one **trusted contact** (name and a valid Indian mobile number).
3. **Create Journey**: search start and destination anywhere in India (place name or PIN code), or **Use my current location** for start. Wait for the live ETA, then start.
4. Allow location when the browser asks. The map follows your GPS and the ETA is recalculated from the remaining route. Share the live `/track/...` link.
5. Contacts can watch the map, see ETA, and get notified for off-route, arrival, or SOS. End the journey (or wait until you are within 120 m of the destination). Open **History**.

To show SOS or off-route in a viva, use a real trip: trigger SOS from the active screen (it uses your actual GPS), or walk/drive away from the planned route until three GPS points in a row are more than 350 m off the line.

## Tests

```bash
cd backend && npm test
```

These check Haversine distance, the 120 m arrival radius, off-route detection, Indian mobile numbers, and Telegram alert timing bands.

## Future scope

- Android app with background GPS, so the browser tab does not need to stay open.
- Support more than one active journey per user.
- Option to call a local emergency number from the SOS screen.
- Filter noisy GPS points before checking off-route (current logic only uses the 3-point streak).
