# Easetraveling

Book **bus** and **2D car** seats between Quetta, Karachi, Lahore and Islamabad.

**For customers (website + installable app)**
- Opening splash, hero, popular routes, real seat map, pickup pin on the map, instant ticket with QR code.
- **No account.** Booking form: name, CNIC, contact, current city, route, pickup point.
- Pay choices: Easypaisa, JazzCash, Raast, Bank (and Cash for 2D car).
- "My trips" on the device, track / cancel with booking number + phone, share ticket on WhatsApp.
- Installs like an app (PWA): "Install app" button, home-screen icon, opens full screen.

**For the owner (hidden admin panel)**
- Opens only at a secret URL. Dashboard with 7-day chart, all bookings with passenger details, filters,
  **CSV export (Excel)**, **printable trip manifest** per date, cancel bookings, contact-message inbox.

---

## 1. Run it now (no database needed)

1. Install **Node.js** (LTS, version 18 or newer) from nodejs.org.
2. Extract the zip, open the folder **`easetraveling`** in Terminal / Command Prompt:
   ```
   cd easetraveling
   npm start
   ```
   That is all. No `npm install`, no `.env`, no MySQL needed for testing.
3. Open `http://localhost:3000`.
   The secret admin link is printed in the terminal (default `http://localhost:3000/secret-admin/`).

Test admin login: `admin@easetraveling.pk` / `Admin@12345`.

While testing, data is kept in a small file (`server/data/dev-data.json`) so bookings survive a restart.
Delete that file to start fresh.

`npm run dev` restarts automatically when you change a file. `npm test` runs the automated tests.

---

## 2. Settings (optional): the `.env` file

Copy `.env.example` to `.env` (Windows: `copy .env.example .env`) and change what you need:

| Setting | What it does |
|---------|--------------|
| `ADMIN_PATH` | Your **secret word** for the admin URL: `http://localhost:3000/<ADMIN_PATH>/` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin login (changing the password here changes it at the next start) |
| `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`, `SUPPORT_EMAIL` | Shown in the "Need help?" section. Empty = hidden |
| `SERVICE_FEE` | Fixed fee added to bus bookings (Rs.) |
| `DB_DRIVER` | `memory` (no database, default) or `mysql` |

---

## 3. Connect the database later (MySQL)

The whole project already supports MySQL. When you are ready:

1. Start MySQL (XAMPP: press Start next to MySQL).
2. In the project folder run once: `npm install` (installs the `mysql2` package).
3. In `.env` set:
   ```
   DB_DRIVER=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=easetraveling
   ```
4. `npm start`. The server creates the database and all tables by itself.
   (The tables are also in `server/db/schema.sql` if you prefer phpMyAdmin.)

Nothing else changes. The website, admin panel and API work the same on both.
Both modes are checked by the same automated tests.

---

## 4. Put it live

1. Upload the project to GitHub and create a **Web Service** on Render / Railway.
   Build command: `npm install`. Start command: `npm start`.
2. Use an online MySQL (Aiven, Railway...) and set the variables below.
3. In production the server **refuses to start** if a secret is missing.

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DB_DRIVER` | `mysql` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` | from your MySQL provider |
| `AUTH_SECRET` | long random text |
| `ADMIN_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | your secret admin link and login |
| `SUPPORT_*` | your phone / WhatsApp / email |

Use HTTPS (Render gives it automatically). The app install button and service worker need HTTPS.

---

## 5. Project structure

```
easetraveling/
├── server/
│   ├── index.js, app.js        start the server, handle requests
│   ├── routes/index.js         ALL API URLs in one place
│   ├── controllers/            read request -> call service -> send answer
│   ├── services/               business rules (booking, admin, login, seed)
│   ├── db/
│   │   ├── index.js            picks memory or MySQL (DB_DRIVER)
│   │   ├── memory-store.js     no-database mode
│   │   ├── sql-store.js        ALL SQL of the project
│   │   ├── mysql.js, schema.sql  MySQL connection and tables
│   │   └── sqlite.js           test-only adapter
│   ├── middleware/, utils/, data/catalog.js
├── public/                     the website
│   ├── index.html, css/app.css, sw.js, manifest.webmanifest
│   ├── js/app/                 map, search, rides, seats, details, ticket, trips, pwa, site
│   └── assets/                 images (logo + 2 bus photos) and app icons
├── admin/                      the hidden admin panel
└── tests/api.test.js
```

### API

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET | `/api/meta` | all | cities, popular routes, payment methods, support info |
| GET | `/api/buses`, `/api/buses/:id/seats` | all | buses and seat map |
| POST | `/api/bus-bookings` | all | book bus seats |
| GET | `/api/cars/operators`, `/api/cars/seats` | all | cars and seat map |
| POST | `/api/car-bookings` | all | book car seats |
| GET | `/api/bookings/track?id=&phone=` | booking no. + phone | find booking |
| PATCH | `/api/bookings/:id/cancel` | booking no. + phone | cancel booking |
| POST | `/api/contact` | all | contact form |
| POST | `/api/admin/login` | admin | sign in |
| GET | `/api/admin/stats`, `/bookings`, `/messages`, `/routes` | admin | panel data |
| PATCH | `/api/admin/bookings/:id/cancel` | admin | cancel any booking |

### Backend rules

- **No double booking:** a seat can belong to only one booking per trip (checked in one step; in MySQL also by a primary key).
- **Prices are calculated on the server.**
- **Validation:** CNIC, mobile number, dates (no past dates), seats, payment method.
- **Guests** find or cancel a booking only with the booking number **and** the phone used for it.
- **Admin password** is hashed (scrypt), login tokens are signed and expire, login attempts are limited.
- Security headers, rate limiting, HTML escaping, path-traversal protection.

## 6. Notes

- Maps: Leaflet + OpenStreetMap (free, no key). If they cannot load, a simple built-in map is shown.
- Payments are only **recorded**. Real payment confirmation needs the provider's API (Easypaisa, JazzCash, Raast).
- Tailwind CSS, Font Awesome and Leaflet load from CDNs and need internet.
