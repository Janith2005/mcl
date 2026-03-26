# Design System — Influence Pirates

## Product Context
- **What this is:** AI-powered content coaching platform that discovers topics, develops angles via the Contrast Formula, generates hooks/scripts, and learns from performance data
- **Who it's for:** Creators, solopreneurs ($50K-$500K), technical power users, and content agencies
- **Space/industry:** Creator tools / content intelligence (peers: VidIQ, TubeBuddy, Metricool, Jasper)
- **Project type:** Data-rich SaaS web app + CLI

## Theme: Holo Prism (Light Mode — primary, ship first)

- **Creative North Star:** "The Luminous Lab"
- **Core Aesthetic:** Vibrant, glassmorphic, high-energy. Soft lavender-pink washes, white glass cards, gradient CTAs.

### Color Tokens (CSS custom properties — single source of truth)

```
--ip-bg:               #F5EDF5        /* lavender-pink page wash */
--ip-bg-subtle:        #FAF5FA        /* lighter variant for contrast */
--ip-surface:          #FFFFFF        /* card backgrounds */
--ip-surface-hover:    #FDF8FD        /* card hover state */
--ip-surface-glass:    rgba(255,255,255,0.7)  /* glassmorphic panels */
--ip-glass-blur:       12px

--ip-text:             #1A1A1A        /* primary text */
--ip-text-secondary:   #6B7280        /* muted/secondary text */
--ip-text-tertiary:    #9CA3AF        /* labels, timestamps */
--ip-text-brand:       #5B2C6F        /* brand plum — headings, links */

--ip-border:           #E8D8E8        /* soft lavender borders */
--ip-border-subtle:    #F0E4F0        /* very subtle dividers */

--ip-primary:          #A666AA        /* fuchsia — primary accent */
--ip-primary-end:      #E879A8        /* pink — gradient end */
--ip-primary-gradient: linear-gradient(135deg, #A666AA 0%, #E879A8 100%)
--ip-primary-text:     #FFFFFF        /* text on primary buttons */

--ip-accent-plum:      #5B2C6F        /* deep plum for contrast text */
--ip-accent-maroon:    #7B3F5E        /* logo/icon accent from designs */

--ip-sidebar-bg:       linear-gradient(180deg, #FFFFFF 0%, #F5EDF5 100%)
--ip-sidebar-active:   var(--ip-primary-gradient)  /* pill-shaped active item */
--ip-sidebar-text:     #374151
--ip-sidebar-text-active: #FFFFFF
--ip-sidebar-width:    200px
--ip-sidebar-width-collapsed: 64px
```

### Pipeline Stage Colors
```
--ip-stage-discover:   #0EA5E9        /* sky blue */
--ip-stage-angle:      #8B5CF6        /* violet */
--ip-stage-hook:       #F59E0B        /* amber */
--ip-stage-script:     #10B981        /* emerald */
--ip-stage-publish:    #EC4899        /* pink */
--ip-stage-analyze:    #6366F1        /* indigo */
```

### Semantic Colors
```
--ip-success:          #10B981
--ip-warning:          #F59E0B
--ip-error:            #EF4444
--ip-info:             #3B82F6
```

### Scoring Heat Map
```
--ip-score-low:        #EF4444        /* 1-3 */
--ip-score-below:      #F59E0B        /* 4-5 */
--ip-score-good:       #3B82F6        /* 6-7 */
--ip-score-strong:     #10B981        /* 8-9 */
--ip-score-perfect:    #D4AF37        /* 10 — gold */
```

## Typography
- **Display/Hero:** Space Grotesk — geometric, bold personality. Used for page titles, hero stats, brand headings.
- **Body/UI:** Geist — legible at small sizes, modern. All body text, nav items, form labels.
- **Data/Tables:** Geist Mono (tabular-nums) — scores, metrics, pipeline counts.
- **Accent/Italic:** Serif italic for emphasis words (e.g., "Agent Brain *Maturity*" from brain screen). Use CSS `font-style: italic` with a system serif or Instrument Serif.

```
--ip-font-display:     'Space Grotesk', sans-serif
--ip-font-body:        'Geist Variable', sans-serif
--ip-font-mono:        'Geist Mono', monospace
--ip-font-serif:       'Instrument Serif', Georgia, serif  /* italic accent only */
```

### Type Scale
```
--ip-text-xs:    0.75rem / 1rem      /* 12px — labels, metadata, timestamps */
--ip-text-sm:    0.875rem / 1.25rem  /* 14px — body small, table cells, nav */
--ip-text-base:  1rem / 1.5rem       /* 16px — body */
--ip-text-lg:    1.125rem / 1.75rem  /* 18px — card titles */
--ip-text-xl:    1.25rem / 1.75rem   /* 20px — section headers */
--ip-text-2xl:   1.5rem / 2rem       /* 24px — page titles */
--ip-text-3xl:   1.875rem / 2.25rem  /* 30px — hero stats */
--ip-text-4xl:   2.25rem / 2.5rem    /* 36px — dashboard hero numbers */
```

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable

```
--ip-space-1:   4px
--ip-space-2:   8px
--ip-space-3:   12px
--ip-space-4:   16px
--ip-space-5:   20px
--ip-space-6:   24px
--ip-space-8:   32px
--ip-space-10:  40px
--ip-space-12:  48px
--ip-space-16:  64px
```

## Border Radius
```
--ip-radius-sm:    8px              /* small elements, inputs */
--ip-radius-md:    12px             /* cards, dropdowns */
--ip-radius-lg:    16px             /* larger cards, modals */
--ip-radius-xl:    24px             /* hero cards, feature sections */
--ip-radius-full:  9999px           /* pills, active nav items, avatar */
```

## Shadows & Elevation
```
--ip-shadow-sm:    0 1px 3px rgba(166, 102, 170, 0.06)
--ip-shadow-md:    0 4px 12px rgba(166, 102, 170, 0.08)
--ip-shadow-lg:    0 8px 24px rgba(166, 102, 170, 0.12)
--ip-shadow-glow:  0 0 20px rgba(166, 102, 170, 0.15)   /* accent glow on hover */
```

## Layout

### Sidebar (canonical — all screens use this)
From the dashboard design (the most complete sidebar):
```
Navigation items (top to bottom):
  - Dashboard       (LayoutDashboard icon)
  - Topics          (Compass icon)
  - Angles          (Diamond icon)
  - Hooks           (Anchor icon)
  - Scripts         (FileText icon)
  - Analytics       (BarChart3 icon)
  - Brain           (Brain icon)

Bottom section:
  - Settings        (Settings icon)
  - Support         (HelpCircle icon)
  - User avatar     (user profile)

Fixed elements:
  - "+ New Content" CTA button (gradient, bottom-left area)
  - Brand logo + "Influence Pirates" at top
```

### Three-Column Layout (most screens)
```
[Sidebar 200px] [Main Content flex-1] [Tactical Assistant 320px]
```
The right panel ("Tactical Assistant") is the AI coaching chat — present on most screens, collapsible.

### Grid
- **Desktop (1280px+):** 12-column
- **Tablet (768px-1279px):** 8-column, sidebar collapses
- **Mobile (<768px):** Single column, bottom tab nav
- **Max content width:** 1440px

## Motion
```
--ip-duration-micro:   50ms
--ip-duration-short:   150ms
--ip-duration-medium:  250ms
--ip-duration-long:    400ms

--ip-ease-enter:       ease-out
--ip-ease-exit:        ease-in
--ip-ease-move:        cubic-bezier(0.4, 0, 0.2, 1)
```

### Motion Rules
- Pipeline funnel: stagger entrance by 50ms per stage
- Score changes: countup animation on numbers
- Card hover: subtle lift (translate -2px) + glow shadow
- Page transitions: fade 200ms
- Sidebar expand/collapse: 250ms ease-in-out

## Component Patterns (from designs)

### Cards
- White surface, `--ip-radius-lg`, `--ip-shadow-md`
- Hover: `--ip-shadow-glow` + subtle scale(1.01)
- Content padding: `--ip-space-6`

### Buttons
- **Primary:** `--ip-primary-gradient`, white text, `--ip-radius-full`, shadow
- **Secondary:** White bg, plum border, plum text
- **Ghost:** No bg, plum text, hover: subtle bg

### Pipeline Funnel (Dashboard)
- Horizontal pills with stage colors
- Count number inside each pill
- Connected by subtle arrow/line between stages

### Scoring Badges
- Rounded pill with score number
- Background uses heat map color at 10% opacity
- Text uses heat map color at full

### Tactical Assistant Panel
- Right-side fixed panel, 320px
- Tabs: Chat | Insights | Logs (or Context | AI Coach | Live Feed)
- Chat input at bottom with gradient send button
- White/glass surface with subtle left border

## Hook Pattern Visual System
| Pattern | Color | Badge Style |
|---------|-------|-------------|
| The Question | `#EF4444` | Red pill |
| The Stat | `#3B82F6` | Blue pill |
| The Negative Stake | `#F59E0B` | Amber pill |
| The Contrarian | `#8B5CF6` | Violet pill |
| The Visual Bridge | `#10B981` | Emerald pill |
| The Direct Payoff | `#EC4899` | Pink pill |

## Swappability

All visual decisions flow through CSS custom properties prefixed `--ip-`. To change the entire look:

1. **Colors:** Edit `--ip-*` vars in `packages/web/src/styles/theme.css`
2. **Fonts:** Change `--ip-font-*` vars + update Google Fonts link
3. **Radius:** Change `--ip-radius-*` vars (round vs sharp)
4. **Spacing density:** Scale all `--ip-space-*` vars
5. **Mode toggle:** Dark mode overrides all `--ip-*` vars with Obsidian Plunder values

No component should hardcode colors, fonts, or radii. Always reference tokens.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | Dual theme system (Holo Prism / Obsidian Plunder) | Different modes for different work — creative exploration vs data analysis |
| 2026-03-26 | Space Grotesk + Geist stack | Space Grotesk for brand personality, Geist for body legibility |
| 2026-03-26 | Gold/Brass accent in dark mode | Distinctive premium feel, no one in creator tools space uses this |
| 2026-03-26 | Pipeline stage color system | 6 stages need instant visual recognition across all screens |
| 2026-03-26 | Renamed from MCL to Influence Pirates | Brand direction change |
| 2026-03-26 | Canonical sidebar from dashboard design | Sidebar was inconsistent across Stitch screens — standardized to dashboard version |
| 2026-03-26 | CSS custom properties for swappability | All tokens in one file, no hardcoded values in components |
| 2026-03-26 | Light mode first (Holo Prism) | Ship light mode, add dark mode later |
