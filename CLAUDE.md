# CLAUDE.md: Live Order Queue (Mamak / Café)

Customers order from a web page. The kitchen screen shows new orders instantly. Customers see live status (Received → Preparing → Ready) without refreshing.

This is a **small, simple project**. Prefer the boring solution. No build step, no framework on the frontend, no database until it is actually needed.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 20+ | ES modules (`"type": "module"`) |
| Server | Express 4 | REST for actions, static file serving |
| Real-time | Socket.io 4 | Broadcast only, rooms per audience |
| Storage | In-memory `Map` | Resets on restart. Fine for v1 |
| Frontend | Plain HTML + CSS + vanilla JS | Served from `public/`, no bundler |
| Dev | `node --watch` | No nodemon needed |

Do not add TypeScript, React, a database, an ORM, or a CSS framework unless asked.

---

## 2. Folder structure

```
live-order-queue/
├── CLAUDE.md
├── DESIGN.md             # design tokens + which .claude/skills apply (read before UI work)
├── .claude/
│   ├── settings.json     # permission allowlist (npm, curl, guidelines fetch)
│   └── skills/           # installed taste skills (see §7 for which ones apply)
├── package.json
├── .env.example          # PORT=3000
├── server.js             # entry: Express + Socket.io bootstrap
├── src/
│   ├── menu.js           # static menu data
│   ├── store.js          # in-memory order store (the only place that mutates orders)
│   ├── routes.js         # REST endpoints
│   └── sockets.js        # Socket.io rooms + emit helpers
└── public/
    ├── index.html        # customer: menu + cart + place order
    ├── status.html       # customer: live status for one order (?id=...)
    ├── kitchen.html      # kitchen display board
    ├── css/
    │   ├── styles.css    # design tokens + shared styles
    │   ├── order.css     # index.html only
    │   ├── status.css    # status.html only
    │   └── kitchen.css   # kitchen.html only
    └── js/
        ├── api.js        # fetch wrappers
        ├── ui.js         # h() DOM helper (textContent only), formatRM, status list
        ├── order.js      # logic for index.html
        ├── status.js     # logic for status.html
        └── kitchen.js    # logic for kitchen.html
```

Keep files small. If a file passes ~200 lines, split it.

---

## 3. Data model

```js
// Order
{
  id: "a1b2c3",            // short random id (crypto.randomUUID().slice(0, 6))
  number: 1024,            // human queue number shown on screens, increments from 1001
  table: "7",              // optional, string; empty string for takeaway
  items: [
    { menuId: "roti-canai", name: "Roti Canai", qty: 2, price: 150 }
  ],
  note: "Kurang manis",    // optional, max 140 chars
  total: 300,              // in sen (integer)
  status: "received",      // received | preparing | ready | collected
  createdAt: 1737600000000,
  updatedAt: 1737600000000
}
```

Rules:

- **Money is always integer sen.** Format to `RM 3.00` only in the UI.
- **Status only moves forward:** `received → preparing → ready → collected`. Reject anything else with 400.
- The server computes `total` and copies `name`/`price` from `menu.js`. Never trust prices from the client.
- `store.js` is the single source of truth. Routes call store functions, then call emit helpers from `sockets.js`.

Menu (`src/menu.js`) starter items: Roti Canai, Roti Telur, Nasi Lemak, Mee Goreng Mamak, Teh Tarik, Milo Ais. Each has `id`, `name`, `price` (sen), `category` (`food` | `drink`).

---

## 4. REST API

Mutations go through REST, not sockets. This keeps validation in one place and makes testing with curl easy.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/menu` | | menu array |
| POST | `/api/orders` | `{ items: [{menuId, qty}], table?, note? }` | created order (201) |
| GET | `/api/orders/:id` | | one order, or 404 |
| GET | `/api/orders?active=1` | | orders not yet `collected`, oldest first |
| PATCH | `/api/orders/:id/status` | `{ status }` | updated order |

Validation: `qty` is an integer 1 to 20, `menuId` must exist, at least one item. Return `{ error: "message" }` with the right status code.

---

## 5. Socket.io design

Sockets are **server → client broadcasts only**. The only client → server events are for joining rooms.

**Rooms**

- `kitchen`: every kitchen screen
- `order:<id>`: the customer watching one order

**Client → server**

| Event | Payload | Effect |
|---|---|---|
| `kitchen:join` | none | socket joins `kitchen` |
| `order:watch` | `{ id }` | socket joins `order:<id>` |

**Server → client**

| Event | Sent to | Payload |
|---|---|---|
| `order:new` | `kitchen` | full order |
| `order:updated` | `kitchen` and `order:<id>` | full order |

Always send the **full order object**, never a partial diff. The client just replaces its copy.

**Reconnect rule:** on every `connect` event (first load and reconnects), the client re-joins its room **and** re-fetches state over REST (`GET /api/orders?active=1` for kitchen, `GET /api/orders/:id` for status page). This covers any events missed while offline.

---

## 6. Screens

**Customer order page (`index.html`)**
Menu grouped by Food / Drinks, qty steppers, sticky cart summary with total, optional table number and note, one clear "Place order" button. On success, redirect to `status.html?id=<id>`.

**Customer status page (`status.html`)**
Big queue number, current status as a 4-step progress indicator, item list. When status becomes `ready`, make it obvious (colour change + short vibration via `navigator.vibrate` if available). Must work on a phone held in one hand.

**Kitchen board (`kitchen.html`)**
Three columns: Received, Preparing, Ready. Each card shows number, table, items, note, and minutes since ordered. One big button per card to advance status. New orders get a brief highlight and an optional soft sound. Designed for a tablet or TV, readable from 2 metres away.

---

## 7. Frontend design: use the taste skills

**Before writing or changing any HTML/CSS, read `DESIGN.md` at the project root, then load the skills it lists.** Skills live in `.claude/skills/`. The wiring:

| Skill | When |
|---|---|
| `design-taste-frontend` | Before any HTML/CSS change. Use its anti-slop rules and Pre-Flight Check; ignore its React/Tailwind/Motion/GSAP stack. |
| `minimalist-ui` | Palette, borders, surfaces, badges. |
| `web-design-guidelines` | Review pass on `public/` at build step 7 (fetches rules from raw.githubusercontent.com). |
| `redesign-existing-projects` | Only when revisiting shipped screens. |

The other skills in `.claude/skills/` (image generation, GSAP, brutalist, brandkit, Stitch) do not apply to this project. Precedence: this file > `DESIGN.md` > skill defaults. Skills still override generic defaults; apply them within these project constraints:

- Plain CSS only. Put design tokens (colours, spacing, radius, font sizes) as custom properties on `:root` in `styles.css`.
- Mobile first for customer pages, large-screen first for the kitchen board.
- Support light and dark mode via `prefers-color-scheme`.
- One accent colour. Status colours: received (neutral), preparing (amber), ready (green).
- Touch targets at least 44px. Kitchen buttons larger.
- Use one Google Font at most. System font stack is fine.
- Motion is subtle and respects `prefers-reduced-motion`.
- UI copy is short and friendly. English by default; Malay item names stay as they are (Teh Tarik, not "pulled tea").
- No em dashes in UI copy.

---

## 8. Commands

```bash
npm install
npm run dev     # node --watch server.js
npm start       # node server.js
```

`package.json` dependencies: `express`, `socket.io`. Nothing else for v1.

Open:

- http://localhost:3000 (customer)
- http://localhost:3000/kitchen.html (kitchen)

---

## 9. Conventions

- ES modules, `const` by default, async/await, no callbacks.
- Small pure functions in `store.js`, easy to test.
- No secrets in the repo. `PORT` from `.env` (default 3000).
- Log one line per order event on the server: `[order] #1024 preparing`.
- Escape user text (`note`, `table`) before inserting into the DOM. Use `textContent`, never `innerHTML` with user data.

---

## 10. Build order

Work in this order and check each step runs before moving on:

1. `server.js` + static `public/` + `GET /api/menu`
2. `store.js` + order REST endpoints (test with curl)
3. `sockets.js` rooms + emits wired into routes
4. `kitchen.html` board (live new orders + advance buttons)
5. `index.html` ordering flow
6. `status.html` live status
7. Design pass with the taste skills across all three screens
8. Manual test: two browsers side by side, place order, advance status, kill and restart Wi-Fi to confirm reconnect resync

---

## 11. Out of scope for v1

Payments, login, admin menu editor, database persistence, multiple outlets, printing receipts. Note ideas in a `## Later` list at the bottom of this file instead of building them.

## Later

- Persist orders to SQLite (`better-sqlite3`) so restarts keep the queue
- Kitchen PIN to stop customers opening the kitchen board
- QR code per table that pre-fills the table number
- Deploy on Coolify with a sticky-session note for Socket.io if scaling beyond one instance
