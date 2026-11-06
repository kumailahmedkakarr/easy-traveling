# Easetraveling

A website to book **bus** and **2D car** seats between Quetta, Karachi, Lahore and Islamabad.

**Customers**
- Home page with search, popular routes, onboard features, payment methods, FAQ, About and Contact.
- **No account.** Booking form: name, CNIC, contact, current city, route and a pickup point on the map.
- Real seat map, fixed fares, instant ticket with QR code, WhatsApp share, print.
- Pay by Easypaisa or bank (cash on 2D car). The ticket shows where to send the money.
- "My Bookings" on the device, and track / cancel with booking number + phone.

**Owner (hidden admin panel)**
- Opens only at a secret URL. Dashboard with 7-day chart, all bookings with passenger details, filters,
  **CSV export (Excel)**, **printable trip manifest**, cancel bookings, contact-message inbox.

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
| `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`, `SUPPORT_EMAIL` | Replace the default details on the Contact page. Empty = keep the defaults |
| `PAY_EASYPAISA`, `PAY_BANK_NAME`, `PAY_BANK_ACCOUNT` | Where customers send money (website + ticket) |
| `DATABASE_URL` | MySQL link (`mysql://user:password@host:3306/database?ssl=true`). If set, MySQL is used |
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

## 4. Put it live on Vercel

Vercel runs the site as small "serverless functions": there is **no hard disk to save data** and no
server that stays on. So on Vercel you **must use a MySQL database** (an online one). This project
is ready for that (`vercel.json` and `api/index.js`).

**Step 1: get a free online MySQL** (any of these, you will get a connection link)
- TiDB Cloud Serverless (free), Aiven (free MySQL), or Railway.
- The link looks like: `mysql://USER:PASSWORD@HOST:3306/DATABASE?ssl=true`
- Create / note the database name. The tables are created automatically.

**Step 2: upload the project to GitHub and import it in Vercel** (Framework: *Other*, no build command).

**Step 3: add these Environment Variables** (Vercel > Project > Settings > Environment Variables), then **Redeploy**:

| Name | Value |
|------|-------|
| `DATABASE_URL` | your MySQL link from Step 1 |
| `AUTH_SECRET` | any long random text |
| `ADMIN_PATH` | your secret word, e.g. `quetta-panel-93` |
| `ADMIN_EMAIL` | your admin email |
| `ADMIN_PASSWORD` | a strong password |
| `PAY_EASYPAISA`, `PAY_BANK_NAME`, `PAY_BANK_ACCOUNT` | (optional) your payment accounts |
| `SUPPORT_PHONE`, `SUPPORT_EMAIL`, `SUPPORT_WHATSAPP` | (optional) contact details |

**Step 4: check it.** Open `https://YOUR-SITE.vercel.app/api/health`. You must see:
```
"database": { "driver": "mysql", "connected": true }
```
- `"driver": "memory"` means `DATABASE_URL` is missing (add it, then Redeploy). Bookings cannot be saved on Vercel in this mode.
- `"connected": false` means the link / password is wrong, or the database blocks the connection (check SSL: add `?ssl=true`).
- A message like "AUTH_SECRET must be set in production" means a variable above is missing.
- For any other error open **Vercel > your project > Logs**.

Your admin panel is at `https://YOUR-SITE.vercel.app/<ADMIN_PATH>/`.

Other hosts (Render, Railway, a VPS) work too: `npm install` then `npm start` with the same variables.

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
│   ├── index.html, css/app.css
│   ├── js/app/                 navigation, home, map, search, rides, seats, details, ticket, trips, site
│   └── assets/images/          logo + 2 bus photos
├── admin/                      the hidden admin panel
├── api/index.js                Vercel entry (serverless function)
├── vercel.json                 Vercel settings
└── tests/                      automated tests
```

### API

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET | `/api/health` | all | server + database status |
| GET | `/api/meta` | all | cities, popular routes, payment accounts, contact info |
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
- Payments are manual: the ticket shows the Easypaisa / bank account, and you confirm the money yourself. Automatic confirmation needs the provider's API.
- Tailwind CSS, Font Awesome and Leaflet load from CDNs and need internet.
