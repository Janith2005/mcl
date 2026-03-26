# Design System Specification

## 1. Overview & Creative North Star

The Creative North Star for this design system is **"The Luminous Lab."** 

This aesthetic moves beyond the standard SaaS "white-box" template by treating the interface as a high-energy, clinical yet ethereal environment. We achieve a "High-End Editorial" feel by combining the precision of **Space Grotesk** with a hyper-fluid layout strategy. Instead of rigid grids, we use **intentional asymmetry** and **overlapping glass layers** to create a sense of movement. 

The system thrives on the tension between "Clean Tech" (vast white space, technical type) and "High-Energy" (vibrant, blurred gradients and sharp, dark ink-trapped text). We reject the "boxed-in" web by favoring organic depth and tonal transitions over structural lines.

---

## 2. Colors & Surface Logic

Our palette is rooted in a pristine base, punctuated by high-chroma energy.

### Color Strategy
*   **The "No-Line" Rule:** We do not use 1px solid borders to separate sections. Sectioning must be achieved through background shifts using `surface` vs. `surface_container_low`. A clean break in color is more premium than a thin gray line.
*   **Surface Hierarchy & Nesting:** Depth is created by stacking.
    *   **Foundation:** `background` (#fcf8fb)
    *   **Component Base:** `surface_container_lowest` (#ffffff) for primary cards to create a "lift" from the off-white base.
    *   **In-Page Depth:** Use `surface_container` (#f0edef) for recessed areas like code blocks or secondary navigation.
*   **The "Glass & Gradient" Rule:** Floating elements (Modals, Hover states, Navigation bars) must utilize **Glassmorphism**. Combine `surface` at 70% opacity with a `backdrop-filter: blur(20px)`.
*   **Signature Textures:** For primary calls to action or hero section highlights, use a **Vibrant Gradient**: `linear-gradient(135deg, #814586 0%, #9c423f 100%)`.

---

## 3. Typography

The typographic system balances technical authority with approachable modernism.

*   **Display & Headlines (Space Grotesk):** This is our "Technical Soul." Space Grotesk’s geometric quirks provide a high-end, engineered feel. Use `display-lg` for hero statements with tight letter-spacing (-0.02em) to command attention.
*   **Body & Labels (Inter):** Inter provides the "Friendly Utility." It is highly legible and neutral, allowing the accent colors and headlines to be the stars.
*   **Contrast:** We maintain a "Dark Ink" feel by using `on_surface` (#1b1b1d) for all primary text. Never use pure black; this deep charcoal feels more intentional and premium.

---

## 4. Elevation & Depth

We eschew traditional shadows in favor of **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** To lift a card, place a `surface_container_lowest` container on a `surface_container_low` background. The subtle shift in hex code provides enough contrast for the eye without visual clutter.
*   **Ambient Shadows:** Where physical separation is required (e.g., a floating Action Button), use a shadow that mimics a soft light source: `box-shadow: 0 20px 40px rgba(129, 69, 134, 0.08)`. Note the use of the `primary` color tint in the shadow—this prevents the UI from looking "muddy."
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility (e.g., input fields), use a **Ghost Border**: `outline_variant` at 20% opacity.
*   **Glassmorphism Depth:** For overlays, use a `1px` border using `primary_fixed_dim` at 10% opacity to simulate the "edge" of a glass pane.

---

## 5. Components

### Buttons
*   **Primary:** A vibrant gradient background (Primary to Secondary) with `on_primary` text. Roundedness: `full`. No shadow, but a subtle scale-up (1.02x) on hover.
*   **Secondary:** `surface_container_highest` background with `primary` text. Provides a soft, tactile feel.
*   **Tertiary:** Transparent background, `primary` text, with an underline that appears only on hover.

### Input Fields
*   **Style:** `surface_container_lowest` background, `sm` (0.5rem) rounded corners.
*   **States:** On focus, the border shifts to a 1px `primary` glow with a soft ambient shadow. Forbid high-contrast black borders.

### Chips & Badges
*   **Action Chips:** High-energy accents. Use `primary_fixed` backgrounds with `on_primary_fixed` text for a soft, tech-forward "pill" look.
*   **Selection:** Use `md` (1.5rem) rounding.

### Cards
*   **Rule:** Forbid divider lines. Use `spacing.8` (2rem) of vertical white space to separate card headers from content. Use `surface_container_lowest` to make cards "pop" against the `surface` background.

### Premium Extras: "Energy Orbs"
*   **Component:** Blurred gradient spheres (`primary` and `secondary` colors) placed behind content at 10-15% opacity. These provide the "High-Energy" vibe without interfering with readability.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme whitespace. If a layout feels "full," add another `spacing.12` (3rem) of padding.
*   **Do** overlap elements. Let a glass-morphic image container slightly overlap a headline to create depth.
*   **Do** use `Space Grotesk` for all numeric data; its tabular figures feel high-tech and precise.

### Don't
*   **Don't** use 1px gray borders (`#D1D1D1`). Use background color steps instead.
*   **Don't** use standard "drop shadows" (e.g., `rgba(0,0,0,0.5)`). They kill the "Clean Tech" vibe.
*   **Don't** use sharp 90-degree corners. Everything must feel approachable through `ROUND_TWELVE` or higher.
*   **Don't** center-align long-form body text. Keep it left-aligned for an editorial, structured feel.