# KeuanganKu — Design System MASTER (Playful 7/6/4)

**Project:** KeuanganKu Family Finance
**Dial:** VARIANCE 7 / MOTION 6 / DENSITY 4
**Stack:** React + Vite + Tailwind v4 + shadcn/ui + Motion
**Vibe:** warm playful-professional, trust-first tapi tidak kaku. Keluarga, bukan enterprise.

## Tokens
- --rose-strong #f43f5e (primary), --orange #fb923c, --teal #0d9488, --violet #7c3aed, --blue #2563eb, --green #16a34a, --red #e11d48
- --bg #fff7ed → --bg-soft #fff1f2 / dark #171210, --panel 0.84, --panel-strong 0.94, --soft 0.7
- --line 0.1, --line-strong 0.18, --shadow 18/45, --accent-glow rose 10/28, --gradient-brand 135deg rose→orange, --gradient-bg radial + linear, --field bg/border, --skeleton
- Radius: 28 card, 22 inner, 18 header, 16 chip, 999 pill. Consistency lock: cards 28, buttons 18-22, inputs 18, nav 28.
- Space scale: 4,8,12,16,24,32,48 (density 4 uses 16-24 as base, section py-16-24)
- Font: Display Bricolage Grotesque 600-700, Body Plus Jakarta Sans 400-600, numbers tabular. Base 16, scale 11/13/14/16/18/20/28, line-height 1.5.

## Style Rules
- Max 1 accent (rose), slate/stone neutrals, no AI-purple glow. One palette per page, warm grey lock.
- Icon family lucide-react 2px stroke only, no emoji.
- Cards only when hierarchy needed; else divide-y. Shadows tinted to bg.
- Eyebrow max 1 per 3 sections. Hero fit viewport: headline ≤2 lines, subtext ≤20 words.

## Motion (6)
- Tokens: enter 280ms cubic(0.16,1,0.3,1), exit 180ms, stagger 40ms, spring 100/20.
- Every key view animates 1-2 elements max, reduced-motion collapses to static.
- Transform/opacity only. Tap scale 0.98 + lift -1px.

## Layout
- Mobile-first, max-w 430 phone frame, gutters 16, bottom inset 116 for nav+FAB. Breakpoints 640/768/1024.
- Grid over flex-math. Bento rhythm: alternate 2+3, hero+4.

## Navigation
- BottomBar 4 top-level (Home Catat Budget Laporan) + center FAB action separated (pertahankan). Avatar dropdown for secondary nav (Profil/Logout) with aria-expanded, focus-not-obscured.

## Charts
- trend → line (saldo), comparison → bar (trendBars), proportion → donut (allocation). All with legend, tooltip, pattern+color, table fallback, keyboard focus.

## Accessibility & Performance
- Contrast 4.5:1, focus ring 2px rose, 44px touch, 8px gap, skeleton shimmer, lazy below-fold, CLS reserve.
