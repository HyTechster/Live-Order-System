# Live Order Queue

A small real-time ordering system for a mamak or café. Customers order from their phone, the kitchen sees the order instantly, and customers watch their order move from **Received → Preparing → Ready** without refreshing.

Built with **Express.js** and **Socket.io**. No database, no frontend framework, no build step.

---

## Screens

| Screen | URL | Who uses it |
|---|---|---|
| Order page | `/` | Customers on a phone. Menu grouped by Food and Drinks, quantity steppers, optional table number and note, sticky cart with total. |
| Status page | `/status.html?id=<id>` | Customers after ordering. Big queue number, 4-step progress, item list. The whole page turns green and the phone vibrates when the order is ready. |
| Kitchen board | `/kitchen.html` | Staff on a tablet or TV. Three columns (Received, Preparing, Ready), one large button per card to move it forward, minutes since ordered, new-order highlight and optional chime. |

The order page has a **Kitchen view** link in the top right that opens the kitchen board in a new tab, which is handy for demos.

All screens support light and dark mode and respect reduced-motion settings.

---

## Quick start

Requires **Node.js 20 or newer**.

```bash
npm install
npm run dev     # restarts on file changes (node --watch)
# or
npm start
```

Then open:

- Customer: http://localhost:3000
- Kitchen: http://localhost:3000/kitchen.html

To try the live updates, open both side by side, place an order, and advance it from the kitchen.

### Configuration

Copy `.env.example` to `.env` to change the port:

```
PORT=3000
```

`.env` is optional. Without it the server uses port 3000.

---

## Why Express.js

This project has a narrow job: serve a few static pages, expose five REST endpoints, and share one HTTP server with Socket.io. Express fits that job with the least ceremony.

- **It works with Socket.io out of the box.** Socket.io attaches to a plain Node `http.Server`. Express is a request handler for that same server, so both run on one port with three lines of setup. No adapters or plugins.
- **Static files and JSON are built in.** `express.static` serves the `public/` folder and `express.json` parses request bodies. That covers everything the frontend needs without a bundler or template engine.
- **It keeps the no-build-step promise.** Plain JavaScript with ES modules runs directly on Node. No TypeScript compile, no framework CLI, nothing between editing a file and seeing it.
- **Errors go through one place.** Validation lives in the store and throws errors with a status code; a single error middleware turns them into `{ "error": "..." }` responses. Routes stay about four lines each.
- **Anyone can read it.** Express is the most widely used Node web framework, with years of docs, answers and examples. A new contributor, or the café owner's nephew, can follow the code without learning a framework first.
- **Two dependencies total.** `express` and `socket.io`. Fewer moving parts means fewer things to update or break.

### Alternatives considered

| Option | Why not, for this project |
|---|---|
| **Fastify** | Faster and has built-in schema validation, but raw throughput is not the bottleneck for one café's orders, and it adds plugin conventions to learn. A good upgrade path if the API grows. |
| **Next.js / Nuxt** | Full-stack frameworks with a build step, routing conventions and a frontend framework. Far more than three pages of plain HTML need. |
| **Koa / Hono** | Clean and modern, but smaller ecosystems and no real advantage at this size. |
| **Node's built-in `http` only** | Possible, but you end up rewriting routing, JSON parsing, static file serving and error handling by hand. |

The project uses Express 4. Route handlers here are synchronous, so thrown errors reach the error middleware without extra wrappers. If handlers become `async` (for example, when a database is added), either wrap them or move to Express 5, which forwards rejected promises automatically.

---

## How it works

```
 Customer phone                 Server (Express + Socket.io)            Kitchen screen
 ──────────────                 ────────────────────────────            ──────────────
 POST /api/orders  ───────────► store.createOrder()
                                 emit "order:new" ─────────────────────► new card appears

                                 store.advanceStatus()  ◄──────────────── PATCH /api/orders/:id/status
 status page updates ◄────────── emit "order:updated" ─────────────────► card moves column
```

- **Changes go through REST, updates come back over sockets.** Clients never change data over a socket. This keeps validation in one place and makes every action testable with curl.
- **The server is the source of truth for prices.** It copies item names and prices from the menu and computes the total. Prices sent by the client are ignored.
- **Status only moves forward:** `received → preparing → ready → collected`. Skipping or going back returns `400`.
- **Reconnect-safe.** On every socket (re)connect, a client re-joins its room and re-fetches its state over REST, so updates missed while offline are recovered.
- **Full objects, never diffs.** Every broadcast carries the whole order; clients just replace their copy.

---

## API

All money values are **integer sen** (`450` = RM 4.50).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/menu` | | Menu items |
| POST | `/api/orders` | `{ items: [{ menuId, qty }], table?, note? }` | Created order, `201` |
| GET | `/api/orders/:id` | | One order, or `404` |
| GET | `/api/orders?active=1` | | Orders not yet collected, oldest first |
| PATCH | `/api/orders/:id/status` | `{ status }` | Updated order |

Validation: at least one item, `menuId` must exist, `qty` is a whole number from 1 to 20, `note` is at most 140 characters, `table` at most 10. Errors come back as `{ "error": "message" }` with the matching status code.

### Try it with curl

```bash
# Place an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"menuId":"roti-canai","qty":2},{"menuId":"teh-tarik","qty":1}],"table":"7","note":"Kurang manis"}'

# Move it forward (use the id from the response)
curl -X PATCH http://localhost:3000/api/orders/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'

# Active orders
curl "http://localhost:3000/api/orders?active=1"
```

### Socket.io events

| Direction | Event | Payload | Purpose |
|---|---|---|---|
| client → server | `kitchen:join` | none | Join the `kitchen` room |
| client → server | `order:watch` | `{ id }` | Join the `order:<id>` room |
| server → client | `order:new` | full order | Sent to `kitchen` |
| server → client | `order:updated` | full order | Sent to `kitchen` and `order:<id>` |

The server logs one line per order event, for example `[order] #1024 preparing`.

---

## Project structure

```
├── server.js           Express + Socket.io bootstrap, error handler
├── src/
│   ├── menu.js         Static menu (prices in sen)
│   ├── store.js        In-memory order store; the only code that changes orders
│   ├── routes.js       REST endpoints
│   └── sockets.js      Socket.io rooms and emit helpers
└── public/
    ├── index.html      Order page
    ├── status.html     Live status page
    ├── kitchen.html    Kitchen board
    ├── css/            styles.css (design tokens + shared), order.css, status.css, kitchen.css
    └── js/             api.js (fetch wrappers), ui.js (DOM helpers), order.js, status.js, kitchen.js
```

To change the menu, edit `src/menu.js`. Each item has `id`, `name`, `price` (sen), `category` (`food` or `drink`) and a short `description`.

---

## Limitations

This is a v1 meant for a single outlet on a local network.

- **Orders live in memory.** Restarting the server clears the queue and resets numbering to 1001.
- **The kitchen board is open.** Anyone who can reach the server can open `/kitchen.html` and change order statuses. Add a PIN or hide the Kitchen view link before real customers use it.
- **Single instance only.** Socket.io rooms are in-process. Running more than one server needs sticky sessions and a shared adapter.
- **Vibration depends on the browser.** Some mobile browsers only allow `navigator.vibrate` after the user has tapped the page.
- No payments, login, menu editor or receipt printing.

## Roadmap

- Persist orders to SQLite (`better-sqlite3`) so restarts keep the queue
- Kitchen PIN
- QR code per table that pre-fills the table number
- Deployment notes for running behind a reverse proxy
