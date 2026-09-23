# DESIGN.md: Live Order Queue

The single design source for this project. Every HTML/CSS change reads this first.
It adapts the installed taste skills (`.claude/skills/`) to the CLAUDE.md stack:
plain HTML + CSS + vanilla JS, no build step, no framework, no icon library.

**Precedence:** CLAUDE.md (stack, constraints) > this file (tokens, rules) > skill defaults.
When a skill says React, Tailwind, Motion, GSAP, shadcn, next/font or an icon package, ignore that part.

---

## 1. Design read

> Reading this as: product UI for a mamak / café, used by customers on a phone
> (one hand, standing at the counter) and by kitchen staff on a tablet or TV
> (read from 2 metres, tapped with busy hands). Calm, fast, legible. Leaning toward
> native CSS custom properties + system font stack + restrained CSS transitions.

## 2. Dials

| Surface | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---|---|---|---|
| Customer pages (`index.html`, `status.html`) | 3 | 3 | 5 |
| Kitchen board (`kitchen.html`) | 2 | 3 | 6 |

Symmetry and predictability beat novelty here. Motion is feedback only.

## 3. Which skills apply

| Skill | Use it for |
|---|---|
| `design-taste-frontend` | Anti-slop rules (sec. 4.2, 4.4, 4.5, 4.6, 6, 8, 9) and the Pre-Flight Check. Skip its stack, hero, landing-page and GSAP sections. |
| `minimalist-ui` | Palette restraint, 1px borders, flat surfaces, pill status badges. Skip the serif headings and scroll-reveal. |
| `web-design-guidelines` | Final accessibility / UX review of `public/**/*.html`, `public/**/*.css`, `public/**/*.js`. |
| `redesign-existing-projects` | Only when revisiting screens after v1 ships. |
| Not used | `gpt-taste`, `high-end-visual-design`, `industrial-brutalist-ui`, `brandkit`, `image-to-code`, `imagegen-*`, `stitch-design-taste`, `design-taste-frontend-v1` (image-gen, GSAP or aesthetic directions that conflict with this brief). |

## 4. Tokens (live in `public/css/styles.css` on `:root`)

- **Neutrals:** one cool zinc family. Never `#000` or `#fff` for page background or body text.
- **Accent (one):** cobalt `#2F54D6` light / `#7B96FF` dark. Used for primary actions, focus rings, links.
- **Status colours (semantic, not accents):**
  - received: neutral zinc
  - preparing: amber (`#F59E0B` family)
  - ready: green (`#16A34A` family)
- **Type:** system font stack, no web font. `font-variant-numeric: tabular-nums` on all prices, times and queue numbers.
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48 px.
- **Shape lock:** controls (buttons, inputs, steppers) `12px`, surfaces (cards, panels) `16px`, status badges full pill. Nothing else.
- **Shadows:** almost none. Sticky bars get one soft tinted shadow; cards use a 1px border.

## 5. Rules

- Mobile first for customer pages, large-screen first for the kitchen.
- Light + dark via `prefers-color-scheme`. Test both before calling a screen done.
- Touch targets at least 44px. Kitchen action buttons at least 64px tall.
- Labels above inputs. No placeholder-as-label. Error text below or near the action.
- Every screen has loading, empty and error states.
- Motion only for feedback or state change (new order highlight, status change). Animate `transform` / `opacity` only. Everything sits behind `prefers-reduced-motion: no-preference`.
- No emojis, no decorative dots (the one live-connection dot is real state), no eyebrow labels above every heading, no hand-drawn SVG icons.
- Copy: short, friendly, English. Malay item names stay as is. **No em dashes or en dashes anywhere.**
- User text (`note`, `table`) is set with `textContent` only.

## 6. Screens

- **Order:** menu grouped Food / Drinks, add button that becomes a stepper, details (table, note with counter), sticky bottom bar with item count, total and one "Place order" button.
- **Status:** giant queue number, status headline + one line, 4-step progress, item list. Ready = whole page turns green + `navigator.vibrate`. Live / reconnecting indicator.
- **Kitchen:** three equal columns (Received, Preparing, Ready). Card: number, table or takeaway, minutes since ordered, items, note, one big advance button coloured by the next status. New cards flash once; optional soft chime behind a Sound toggle.

## 7. Pre-flight (subset of design-taste-frontend sec. 14 that applies)

- [ ] Zero `—` or `–` in any visible string
- [ ] One accent, one neutral family, status colours only for status
- [ ] Shape lock respected
- [ ] Button + form contrast WCAG AA in both themes
- [ ] No button label wraps at its intended width
- [ ] Loading / empty / error states present
- [ ] Reduced motion honoured
- [ ] Dark mode checked
- [ ] Copy re-read for clarity
