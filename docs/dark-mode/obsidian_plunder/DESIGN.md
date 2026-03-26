# Design System Strategy: The Technical Vanguard

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Sovereign Navigator."** 

We are moving away from the "coaching" clichés of soft bubbles and friendly faces. Instead, we are building a high-performance instrument for content creators who treat their output like a tactical operation. The aesthetic is inspired by high-end developer tools and maritime navigation interfaces—dense, precise, and authoritative. 

We break the "standard SaaS" look by utilizing **Hyper-Density** and **Asymmetric Information Grouping**. Rather than centering everything in comfortable containers, we push data to the edges, use monospaced accents for technical grounding, and rely on tonal depth rather than structural lines to define the workspace.

## 2. Colors & Surface Architecture
The palette is rooted in a "Void-First" philosophy. We use deep, obsidian grays to reduce eye strain for power users, punctuated by high-vis accents that represent "Gold" (Value/Primary) and "Sea-foam" (Growth/Secondary).

### The "No-Line" Rule
Standard 1px borders are strictly prohibited for sectioning. Structural separation must be achieved through:
*   **Background Shifts:** Distinguish the sidebar (`surface_container_low`) from the main canvas (`surface`) solely through the shift in hex value.
*   **Tonal Transitions:** Use a `surface_container_highest` block to anchor a data visualization against a `surface_dim` background.

### Surface Hierarchy & Nesting
Treat the UI as a series of machined layers.
1.  **Base Layer:** `surface` (#0e0e0e) – The infinite canvas.
2.  **Navigation/Context:** `surface_container_low` (#131313) – Recessed utility areas.
3.  **Active Workspaces:** `surface_container` (#191a1a) – The primary focal point.
4.  **Floating Palettes:** `surface_bright` (#2c2c2c) – Temporary overlays or command menus.

### The "Glass & Gradient" Rule
To prevent the UI from feeling "flat" or "dead," use **Linear Micro-Gradients** on primary actions. A button should not be a flat `#e9c349`; it should transition subtly from `primary` to `primary_dim` at a 145-degree angle. This mimics the sheen of polished brass or hardware.

## 3. Typography: The Editorial Edge
We employ a dual-type system to balance readability with technical "crunch."

*   **Inter (Sans):** Our workhorse. Used for all `body`, `headline`, and `display` scales. It provides the neutral, Swiss-inspired clarity required for data-heavy content coaching.
*   **Space Grotesk (Label):** Reserved for `label-md` and `label-sm`. This is our "instrumentation" font. Use it for metadata, timestamps, and technical specs (e.g., "CPM," "ENGAGEMENT RATE," "HOOK STRENGTH"). It signals to the user that they are looking at data, not just text.

**The Power-User Scale:** 
Maintain high information density. Use `body-sm` (0.75rem) for secondary metadata and `label-sm` for tags. We prioritize scanning speed over "breathing room" in the dashboard views.

## 4. Elevation & Depth
In this design system, shadows are a last resort, not a default.

*   **Tonal Layering:** Depth is achieved by "stacking." A `surface_container_lowest` card sitting on a `surface_container_low` section creates a natural "well" effect, suggesting the card is recessed into the interface.
*   **Ambient Shadows:** For floating modals (like a Command + K menu), use a "Shadow Tint." The shadow should be 20% opacity of the `surface_tint` (#e9c349) with a 64px blur. This creates a subtle "glow" rather than a dark smudge, making the element feel energized.
*   **The Ghost Border Fallback:** Where accessibility requires a border (e.g., input fields), use the `outline_variant` (#484848) at **15% opacity**. It should be felt, not seen.

## 5. Components & UI Patterns

### Buttons (The "Tactical" Variants)
*   **Primary:** Background `primary` (#e9c349), text `on_primary`. Apply a `sm` (0.125rem) corner radius for a sharp, technical look.
*   **Secondary:** Background `secondary_container` (#00443c) with `on_secondary_container` text. Use for growth-related actions.
*   **Tertiary/Ghost:** No background. Use `label-md` (Space Grotesk) in All-Caps.

### Inputs & Form Fields
*   **Execution:** Forgo the traditional "box." Use a `surface_container_highest` background with a bottom-only 1px highlight using `primary` at 30% opacity when focused. 
*   **Density:** Use `0.5rem` (Spacing 2.5) for internal padding to keep input fields compact.

### Cards & Data Lists
*   **The Divider Prohibition:** Never use horizontal lines to separate list items. Use a `0.2rem` (Spacing 1) gap between items and alternate background colors slightly (`surface_container_low` vs `surface_container`), or simply use vertical white space.
*   **Data Visualization:** Graphs should use `secondary` (#11c9b4) for positive trends and `error` (#ed7f64) for alerts. Use `0.1rem` (Spacing 0.5) stroke weights for graph lines to maintain the "Technical Precision" aesthetic.

### Additional Specific Components
*   **The "Metric Monolith":** A specialized card for coaching stats. Large `display-sm` value in Inter, paired with a `label-sm` title in Space Grotesk, anchored to the top-left with a `primary` micro-accent bar (2px wide).

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace asymmetry. Align a sidebar's content to the top but allow the main dashboard's content to be offset to create an editorial feel.
*   **Do** use `full` (9999px) rounding *only* for status chips or search bars. Everything else stays at `sm` or `md` for a rigid, engineered vibe.
*   **Do** use `outline_variant` at low opacity for "Ghost Borders" in complex data tables.

### Don't:
*   **Don't** use standard drop shadows (e.g., #000 at 25%). It breaks the "high-performance" feel and looks like a generic template.
*   **Don't** use "Pirate" metaphors literally (no skulls, no anchors). The "Pirate" element is found in the colors (Gold/Sea-foam) and the "Sovereign" attitude of the layout.
*   **Don't** use `primary` for large surface areas. It is a high-energy accent. Use it sparingly to guide the eye to the "Value" or "Success" actions.