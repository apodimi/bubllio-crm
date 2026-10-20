---
name: Bubllio CRM Customer Operations Board
description: A compact customer-operations workspace built from an ink-navy shell, ruled ledgers, and precise blue state signals.
colors:
  signal-blue: "#005bef"
  signal-blue-bright: "#1473ff"
  selected-blue: "#eaf2ff"
  ink-navy: "#0f1f38"
  work-plane: "#f7f8fa"
  paper-white: "#ffffff"
  overdue-red: "#d32f2f"
  attention-amber: "#ed6c02"
typography:
  display:
    fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif'
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  headline:
    fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.025em"
  title:
    fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: '"Inter", "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Manrope", "Inter", "Segoe UI", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: ".01em"
rounded:
  none: "0"
  rail: "4px"
  control: "8px"
  floating: "12px"
spacing:
  hairline: "1px"
  half: "4px"
  unit: "8px"
  compact: "12px"
  standard: "16px"
  section: "24px"
  page: "36px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "38px"
  button-primary-touch:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "44px"
  field-outlined:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-navy}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "38px"
  nav-active:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.rail}"
    padding: "6px 12px"
    height: "40px"
  metric-cell:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
    height: "78px"
  exposure-field:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.rail}"
    padding: "24px"
---

# Design System: Bubllio CRM Customer Operations Board

## Overview

**Creative North Star: "The Customer Operations Board"**

Bubllio behaves like a well-kept dispatch board: an ink-navy labeled shell anchors a near-white work plane, while rules, columns, and narrow state rails make operational priority visible before decoration. It is compact and information-led, but never cramped; every region should help a person find a customer, understand exposure, or take the next action.

The system preserves the Bubllio mark and blue brand signal while avoiding generic card grids. White paper, fine dividers, and strong alignment carry most of the hierarchy. A dark exposure field is used selectively to mark financially consequential information. This supports the product's direct, tenant-safe workflows on both desktop and mobile.

**Key Characteristics:**

- Ink-navy navigation shell beside a near-white operational plane.
- Ruled metrics and ledger rows instead of floating dashboard cards.
- Signal blue reserved for navigation, primary action, focus, and current state.
- Compact geometry with one-pixel state rails and tabular operational figures.
- Responsive reading order of tasks, exposure, then metrics on small screens.

## Colors

The palette reads like ink, paper, and annotation: navy establishes authority, white and near-white keep dense work legible, and blue marks decisions.

### Primary

- **Signal Blue:** The Bubllio action color for primary buttons, links, keyboard focus, active navigation rails, and current-state labels.
- **Bright Signal Blue:** A supporting brand blue for identity and moments that require a brighter secondary signal; it must not compete with the primary action.

### Secondary

- **Selected Blue:** A pale state wash for selected controls, active rows, avatars, and focus support. It is state, not decoration.

### Tertiary

- **Overdue Red:** A semantic exception color for overdue tasks and errors.
- **Attention Amber:** A semantic attention color for pending invitations and warnings.

### Neutral

- **Ink Navy:** Primary text, the full navigation shell, and the dashboard exposure field.
- **Work Plane:** The application canvas and sticky header ground.
- **Paper White:** Inputs, ruled metric cells, floating surfaces, and inverse text on navy.

### Named Rules

**The Blue Means Action Rule.** Use blue only for selection, navigation, focus, links, and primary action; never scatter it as ambient decoration.

**The Exposure Field Rule.** Reserve the solid ink-navy content field for high-consequence operational summaries such as financial exposure, not ordinary cards.

**The Paper-and-Ink Rule.** Build hierarchy with the work plane, paper surfaces, ink text, and dividers before introducing another hue.

## Typography

**Display Font:** Manrope (with Inter, Segoe UI, and sans-serif fallbacks)  
**Body Font:** Inter (with Segoe UI and sans-serif fallbacks)  
**Label Font:** Manrope (with Inter, Segoe UI, and sans-serif fallbacks)

**Character:** Manrope gives titles, controls, and navigation a decisive operational voice; Inter keeps tables, forms, and supporting copy quiet and readable. Hierarchy comes from weight, alignment, and density more than dramatic scale changes.

### Hierarchy

- **Display** (700, 2rem, 1.25): Compact page titles; sentence case with tight tracking.
- **Headline** (700, 1.5rem, 1.2): Major operational figures or page-level secondary headings.
- **Title** (600, 1.25rem, 1.4): Ledger and panel headings.
- **Body** (400, 0.875rem, 1.5): Forms, explanatory copy, record details, and table content.
- **Label** (600, 0.75rem, .01em): Table headings, status labels, controls, and restrained metadata.

Operational numbers use tabular numerals. Large exposure values may reach 2.4rem, but they retain the Manrope display voice and tight negative tracking. Sidebar group labels may use compact uppercase overlines with wider tracking; page titles remain sentence case.

### Named Rules

**The Working Scale Rule.** Keep ordinary interface type close to the 14px base and create hierarchy with weight and alignment; reserve enlarged type for page identity and consequential figures.

**The Stable Number Rule.** Use tabular numerals for dates, times, counts, currency, and other values that users compare vertically.

## Layout

Desktop uses a 248px labeled ink-navy sidebar that can collapse to a 72px icon rail. The sticky 56px workspace header provides context and account controls; route navigation remains in the rail. Main content is centered and may expand to 1600px, with horizontal padding stepping from 12px on phones to 24px and 36px on larger screens.

The dashboard begins with a compact title row. Its desktop reading order places the four-cell ruled metric tape first, then an asymmetric work region with the task ledger taking roughly two-thirds and the exposure field at least 300px. At small widths, the source order becomes task ledger, exposure field, then a 2×2 metric matrix. This task → exposure → metrics sequence is intentional.

Use the 8px base rhythm with 4px micro-adjustments, 12–16px control spacing, and 24–36px section or page spacing. Repeated records use aligned table or ledger columns on desktop and full-width rows on mobile. Nested service areas may add a contextual secondary sidebar; their mobile links return to the main drawer.

### Named Rules

**The Board Before Cards Rule.** Prefer a single ruled region, ledger, or table over a grid of individually rounded cards.

**The Mobile Decision Order Rule.** On phones, show the next work first, consequential exposure second, and broad workspace metrics third.

## Elevation & Depth

The work plane is flat by default. Borders, inverse fields, and tonal contrast create structure; ordinary cards and page sections do not float. Shadows belong to genuinely elevated UI such as menus, dialogs, drawers, and transient overlays. The theme's restrained elevation ladder moves from a 2px/8px ambient shadow through 6px/20px and 10px/32px layers, with the strongest overlay using an 18px/54px shadow.

### Shadow Vocabulary

- **Ambient Low:** A nearly imperceptible shadow for the first lifted layer.
- **Floating Menu:** A soft middle shadow for menus and small popovers.
- **Dialog / Drawer:** A broader shadow for modal and off-canvas surfaces.
- **Overlay High:** The maximum elevation for transient surfaces above the application shell.

### Named Rules

**The Flat Work Rule.** Page content stays border-defined and shadowless; elevation communicates actual layering, never ornament.

## Shapes

The system uses compact rectilinear geometry. Ledger cells and ruled regions are square; state rails are one pixel wide. The dark exposure field uses a restrained 4px corner, while normal controls, inputs, buttons, and reusable containers use 8px corners. Menus and other floating surfaces may soften to 12px because they sit above the work plane.

Pills are not the default. Status appears as a small rectangular marker or text beside a rail. Avoid nested rounded containers: one boundary should explain one grouping.

### Named Rules

**The Compact Geometry Rule.** Use 0–4px corners for board structure, 8px for controls, and 12px only for floating surfaces.

**The One Boundary Rule.** Do not place bordered cards inside bordered cards; use spacing, rules, or columns to express the inner structure.

## Components

### Buttons

- **Shape:** Compact and gently squared (8px radius), normally 38px high and at least 44px on coarse pointers.
- **Primary:** Signal-blue field with white Manrope label and 14px inline padding.
- **Hover / Focus:** Fine-pointer hover may add a pale-blue ambient shadow. Keyboard focus uses a clearly visible blue or pale-blue outline; active press scales only to 0.985.
- **Secondary / Ghost:** Keep the paper or transparent field, ink or signal-blue text, and a structural border only when the action needs a boundary.

### Chips

- **Style:** Small rectangular state markers with compact padding and restrained corners; use semantic text and borders rather than decorative filled pills.
- **State:** Selected state may use the pale-blue wash and signal-blue text. Overdue and warning variants use their semantic colors only where the status is actionable.

### Cards / Containers

- **Corner Style:** Square to compact (0–8px), selected by whether the region is a ledger, signature field, or reusable container.
- **Background:** Paper white on the work plane; ink navy only for the exposure field.
- **Shadow Strategy:** Flat at rest; see the Flat Work Rule.
- **Border:** Fine ink-derived dividers organize rows and columns.
- **Internal Padding:** Usually 16–24px for panels and 8–12px for dense rows.

### Inputs / Fields

- **Style:** Paper-white field, 8px corners, compact 14px text, and a quiet ink-derived outline.
- **Focus:** Signal-blue one-pixel border plus a three-pixel translucent blue halo.
- **Error / Disabled:** Error shifts border and halo to semantic red; disabled fields use a quiet tonal fill. Coarse-pointer fields are at least 44px high and 16px text to prevent mobile zoom.

### Navigation

The desktop shell is an ink-navy field with grouped intent labels and 40px rows. Default items use translucent white; hover raises contrast without moving the row. Active items use an inverse wash, full white text, and a one-pixel signal-blue rail at the leading edge. The expanded shell is 248px, the collapsed icon rail is 72px, and mobile uses a drawer up to 280px wide. Every icon-only item retains a tooltip and accessible name.

### Ruled Metric Tape

Four paper cells share top and bottom rules and one-pixel vertical dividers. The number is Manrope, bold, tightly tracked, and tabular; its caption remains small and quiet. Desktop uses a single row around 78px high, while mobile uses an 84px 2×2 matrix. Interactive cells change only their background state.

### Task Ledger

Each task is a minimum 64px row with stable desktop columns for completion, task, customer, state, and due time. A one-pixel leading rail carries current or overdue state. Mobile collapses customer and state beneath the task title while keeping completion and due time reachable. Rows never translate on hover.

### Exposure Field

The financial panel is a compact 4px ink-navy field with white figures, low-contrast white rules, and tabular currency. The overdue figure leads, open and collected values share a ruled sub-grid, and the action uses a fine inverse border. This is the dashboard's deliberate depth anchor, not a reusable generic card color.

## Do's and Don'ts

### Do:

- **Do** preserve the ink-navy shell, near-white plane, and rare blue signal as the system's primary visual hierarchy.
- **Do** use rules, aligned columns, and state rails to make operational relationships scannable.
- **Do** preserve the mobile reading order: tasks, exposure, metrics.
- **Do** provide visible keyboard focus, a skip target, 44px coarse-pointer targets, and contrast that meets WCAG AA.
- **Do** keep motion to color, opacity, width, drawer, and subtle press feedback in the 140–250ms range; collapse it under reduced-motion preferences.

### Don't:

- **Don't** turn the dashboard into a collection of floating, rounded metric cards.
- **Don't** use pale blue or signal blue as general decoration; every blue region must communicate state or action.
- **Don't** use the exposure field treatment for ordinary content or nest cards inside it.
- **Don't** make essential information, navigation, or action depend on hover.
- **Don't** translate ledger rows or rearrange their geometry on hover; operational comparison depends on stable alignment.
