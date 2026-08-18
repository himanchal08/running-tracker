---
name: Movement Premium Indie
colors:
  surface: '#0f0e1c'
  surface-dim: '#14121c'
  surface-bright: '#3a3843'
  surface-container-lowest: '#0e0d17'
  surface-container-low: '#1c1a25'
  surface-container: '#201e29'
  surface-container-high: '#2a2933'
  surface-container-highest: '#35333f'
  on-surface: '#e5e0ef'
  on-surface-variant: '#b9cac2'
  inverse-surface: '#e5e0ef'
  inverse-on-surface: '#312f3a'
  outline: '#84948d'
  outline-variant: '#3b4a44'
  surface-tint: '#00e0b3'
  primary: '#bbffe6'
  on-primary: '#00382b'
  primary-container: '#0af0c0'
  on-primary-container: '#006852'
  inverse-primary: '#006b54'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#f3efff'
  on-tertiary: '#302f40'
  tertiary-container: '#d6d2e9'
  on-tertiary-container: '#5c5a6d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#35fecd'
  primary-fixed-dim: '#00e0b3'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#00513f'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#e4e0f7'
  tertiary-fixed-dim: '#c8c4da'
  on-tertiary-fixed: '#1b1a2a'
  on-tertiary-fixed-variant: '#464557'
  background: '#14121c'
  on-background: '#e5e0ef'
  surface-variant: '#35333f'
  card: '#151424'
  accent-gradient: 'linear-gradient(135deg, #0af0c0 0%, #3b82f6 100%)'
  text-primary: '#ffffff'
  text-muted: '#8e8da0'
typography:
  display-hero:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  stat-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 40px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-ui:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
  section-gap: 48px
  card-padding: 24px
---

## Brand & Style

The design system embodies a **Premium Indie** aesthetic—a fusion of high-end editorial craftsmanship and modern technical depth. It is designed for an audience that values intentionality, curated data, and "quiet luxury" in digital tools. The personality is handcrafted and opinionated, moving away from generic SaaS interfaces toward something that feels like a bespoke digital journal.

The visual style is **Atmospheric Minimalism** with a **Glassmorphic** layer. It utilizes a deep, "inky" foundation to allow high-contrast typography and vibrant teal-to-blue gradients to stand out. The layout philosophy is strictly editorial, favoring asymmetrical balance, left-aligned compositions, and generous whitespace that evokes the feeling of a premium physical magazine.

## Colors

The palette is rooted in a "Deep Obsidian" spectrum. The primary interaction model relies on a vibrant **Teal-to-Blue gradient** that represents energy and motion against the static, dark background.

- **Background (#07060f):** A deep blue-black that serves as the infinite canvas.
- **Surface (#0f0e1c):** Used for secondary layout regions to provide subtle depth.
- **Card (#151424):** The primary container color, designed to float subtly above the background.
- **Accents:** Use the gradient for high-impact moments (primary actions, progress indicators). Use the flat Teal (#0af0c0) for small interactive elements to maintain legibility.

## Typography

This system employs a high-contrast typographic pairing to reinforce its editorial roots.

- **Display & Headlines (Playfair Display):** Bold, serif weights are used for hero numbers, screen titles, and section headers. This introduces a "handcrafted" feel and traditional authority.
- **UI & Data (Inter):** A clean geometric sans-serif is used for all functional labels, body text, and small statistics. This ensures maximum legibility at small sizes.
- **Alignment:** All text should be **left-aligned** to maintain the editorial grid. Avoid centered text except within floating pill components.

## Layout & Spacing

The layout is governed by a **fixed grid** with wide margins that frame the content like a book page. 

- **Grid:** Use a 12-column grid for desktop and a 4-column grid for mobile.
- **Editorial Alignment:** Elements should lean heavily into the left margin. Use "asymmetrical whitespace"—leave significant room on the right side of headlines to create a sense of breath.
- **Topographic Texture:** Every screen must include a subtle topographic contour line texture anchored to the bottom. This texture should be stroke-only, using `#ffffff` at 5% opacity, creating an ambient sense of place.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Glassmorphism** rather than traditional drop shadows.

- **Surface Tiering:** Depth is visualised by moving from the Deep Black background to the Deep Blue surfaces and then to the Card layer.
- **The Floating Dock:** The primary navigation uses a "Floating Pill" style. It must have a `90%` opacity of the `surface` color with a `20px` backdrop blur. 
- **Backdrop Blurs:** Use blurs on all floating overlays to maintain the "atmospheric" quality of the UI.
- **Low-Contrast Outlines:** Instead of shadows, cards and inputs use a 1px solid border of `#ffffff` at 10% opacity to define their edges against the dark background.

## Shapes

The shape language is sophisticated and generous. While the grid is rigid and editorial, the containers are soft.

- **Cards:** Use a consistent 20-24px radius (`rounded-xl` or `rounded-2xl`). This softens the "tech" feel and makes the UI feel more like a physical object.
- **Interactive Pills:** Buttons and the navigation bar use a "full" pill-shape (999px) to contrast against the rectangular card structure.
- **Data Points:** Charts and progress bars should use rounded end-caps.

## Components

### Buttons
- **Primary:** Filled with the Teal-to-Blue gradient, using white `label-ui` text. Pill-shaped.
- **Secondary:** Ghost style with a 1px white border (20% opacity) and white text.

### Floating Tab Bar
- A pill-shaped container floating at the bottom center of the screen.
- Features `90%` opacity and heavy backdrop blur. 
- Active states are indicated by the icon transitioning to the Primary Teal color.

### Editorial Cards
- Background: `#151424`.
- Padding: `24px` internally.
- Header: Small `label-caps` in `text-muted` placed above a `headline-lg` title.

### Input Fields
- Subtle recessed fill using the `surface` color.
- 1px border that glows Teal on focus.
- Typography: `body-md` for user input.

### Statistics & Metrics
- Hero numbers must use `stat-lg` (Playfair Display).
- Associated units (e.g., "km", "bpm") should be in `label-caps` and placed to the right or below the number.

### Ambient Texture
- All screens should include the topographic line art at the base. This is a decorative, non-functional element that reinforces the brand's "Movement" narrative.