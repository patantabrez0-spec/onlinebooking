# RoomEase

RoomEase is a small hotel-room booking starter app. The Express server serves the
frontend and JSON API from one origin, and MongoDB stores users, rooms, bookings,
and payment records.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection string

## Run locally

1. Open a terminal in `RoomEase/backend`.
2. Install dependencies with `npm install`.
3. Configure `backend/.env` with your MongoDB connection string and a private
   JWT secret (at least 32 characters). Optionally set `ADMIN_EMAIL` and
   `ADMIN_PASSWORD` to create the first admin account on startup.
4. Start the server with `npm run dev` (or `npm start`).
5. Open `http://localhost:3000`.

The server creates the admin account only when the configured email is not
already registered. Do not use sample credentials in production.

Bookings are recorded as pending; this starter does not process payments.
Payment records are modeled for a future payment-provider integration.
