# Label System Documentation

This document explains how the label designer/printing feature works end-to-end. It is intended to onboard a new engineer or AI agent from zero to full productivity. It covers architecture, data models, Supabase schema, rendering and printing pipelines, interaction models (drag & drop, resize), free-design mode, template management, and known limitations.

## Goals and Scope

- Generate professional Zebra-compatible labels with a sharp visual preview and consistent print size (target paper: 104 × 50.8 mm).
- Enable printing from the web browser without any local agent or pre-installation.
- Allow two workflows:
  - Standard Label: Form-driven labels with anchored elements (title/logo, product name, details, barcode).
  - Free Label: Free-design (serbest) mode to add text/barcode/image elements with full positioning and sizing control.
- Provide a robust template system stored in Supabase (save, update, open with catalog previews and search).
- Allow company logo selection from Supabase (`company_logo` table) without breaking positions/sizes.

## High-level Architecture

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- State: React hooks (`useState`, `useEffect`, `useRef`)
- Preview: HTML Canvas for pixel-accurate rendering
- Barcodes: Custom EAN-13 generator (checksum + raster drawing)
- Printing: Browser print dialog of the canvas image (`window.print`) sized exactly to the target paper via `@page` CSS
- Persistence: LocalStorage for user tuning (zoom, element anchors, styles, visibility), Supabase for templates and logos

## File Map (key files)

- `src/pages/LabelGenerator.tsx`: Main label designer and printer page
- `src/lib/supabase.ts`: Supabase client initialization
- `create_label_templates.sql`: SQL for `label_templates` table (id, name, data JSONB, created_at, updated_at, thumbnail)
- `label.md`: This documentation

## Default Parameters

- Paper size: 104 mm (W) × 50.8 mm (H)
- Default DPI for raster math: 203 (also supports 300/600)
- Preview darkness: 2.0 (200%)
- ZPL darkness: 30 (max ~30)

## Units and Conversions

- Millimeter to pixels on canvas: `px = round(mm × (dpi / 25.4))`
- Millimeter to ZPL dots: `dots = round(mm × (dpi / 25.4))`
- The preview canvas’ intrinsic pixel size is set from the selected DPI and paper mm to ensure crisp output.

## Data Shapes (TypeScript)

```ts
interface LabelData {
  productName: string;
  serialNumber: string;
  entryDate: string;     // ISO yyyy-mm-dd
  expiryDate: string;    // ISO yyyy-mm-dd
  amount: string;
  invoiceNumber: string;
  batchNumber: string;
  supplier: string;
  logo: string;          // not strictly used; selection by company name
  barcode?: string;      // EAN-13 (12 or 13 digits)
}

type AnchorKey = 'title' | 'productName' | 'details' | 'barcode';

// Positions (in mm)
type Pos = { x: number; y: number };

// Element styles (in mm)
interface ElementStyles {
  title: { font: number; widthMm: number };
  productName: { font: number; wrapWidth: number };
  details: { font: number; lineGap: number; widthMm: number };
  barcode: { height: number; widthMm: number };
}

// Free-design items (serbest mod)
type FreeItemType = 'text' | 'barcode' | 'image';
interface FreeItem {
  id: string;            // uuid
  type: FreeItemType;
  x: number;             // mm
  y: number;             // mm
  widthMm?: number;      // barcode/image
  heightMm?: number;     // barcode/image
  text?: string;         // text/barcode digits
  fontMm?: number;       // text
  wrapWidthMm?: number;  // text
  src?: string;          // image data url
}
```

## LocalStorage Keys

- `label_zoom`: overall preview zoom
- `label_anchors_v1`: positions (mm) of anchored elements (`AnchorKey` → `Pos`)
- `label_styles_v1`: per-element sizes (mm)
- `label_visibility_v1`: visibility toggle per anchored element

## Supabase Schema

### Tables

1) `company_logo`
- `company_name` TEXT (PK or unique)
- `logo_url` TEXT (public URL of the logo)

Used by the UI to list selectable logos. On selection, the title/logo element uses the same position and size but renders the chosen brand image if preloaded; otherwise falls back to text.

2) `label_templates`
- `id` UUID (PK, default `gen_random_uuid()`)
- `name` TEXT (template display name)
- `data` JSONB (full serialized state; see below)
- `thumbnail` TEXT (Base64 PNG preview; optional)
- `created_at` TIMESTAMPTZ DEFAULT now()
- `updated_at` TIMESTAMPTZ DEFAULT now()

Row-Level Security is optional depending on environment. If enabled, add policies to restrict templates per authenticated user.

### Serialized Template Payload (`data` JSONB)

```json
{
  "labelData": { ... },
  "labelType": "Koli etiketi" | "Numune Etiketi" | "Yarı Mamül Etiketi",
  "labelWidth": 104,
  "labelHeight": 50.8,
  "dpi": 203,
  "darkness": 2,
  "zplDarkness": 30,
  "anchors": { "title": {"x":6,"y":6}, ... },
  "styles": { "productName": {"font":4, "wrapWidth": 92}, ... },
  "selectedCompany": "Olivos",
  "visible": { "title": true, "productName": true, ... },
  "freeMode": true | false,
  "freeItems": [ { "id":"...", "type":"text", ... }, ... ]
}
```

## Workflows

### Two Tabs

- Standard Etiket
  - Structured form inputs map to `labelData`.
  - Anchored elements draw onto canvas: title/logo, product name (wrapped), detail lines, barcode.
  - Template actions: Save, Update, Open (catalog with thumbnails & search).
- Serbest Etiket
  - Launches “Serbest Mod Penceresi” (separate modal workspace) where the user can add Text/Barcode/Image items.
  - Live drag & drop and corner-resize with immediate visual feedback.
  - “Önizlemeye Aktar” copies workspace items to main preview (`freeMode = true`, `freeItems = wsItems`).

### Template Management

- Save (new) / Update (existing) send `data` JSONB and `thumbnail` to Supabase.
- Open shows a catalog (grid) with preview thumbnails and search; clicking loads the full serialized state and re-renders immediately.
- After loading, any change toggles “dirty” state to enable Update.

## Rendering Pipeline (Canvas)

1) Compute pixels per mm: `pxPerMm = dpi / 25.4`.
2) Set canvas width/height to `round(mm × pxPerMm)` to get a true physical scale.
3) Clear white background; set `ctx.textBaseline = 'top'`.
4) Draw anchored elements:
   - Title/logo: if selected logo is preloaded, draw scaled by font-height target; else draw text fallback (OLIVOS) with bold font size.
   - Product name: wrapped with a simple greedy word-breaker up to `styles.productName.wrapWidth`.
   - Details: several lines (amount, serial, batch, invoice, entry/expiry, supplier) with `styles.details.font` and `styles.details.lineGap`.
   - Barcode EAN-13: see below.
5) Draw free-design items (`freeMode`): text (wrap), barcode (EAN-13), image (drawImage when loaded).
6) Apply preview darkness: multiply each color channel (grayscale assumption) to strengthen blacks for raster print simulation.

### EAN-13 Generation

- Input: 12 or 13 digits. If 12, compute checksum as `10 − ((sum(d_i × (i%2?3:1)) mod 10)) mod 10`.
- If 13 digits provided, reject if checksum mismatches.
- Encoding: 95 modules (start, left-6, center, right-6, end) using L/G/R parity sets.
- Draw each “1” as a black rect of `modulePx` width and label height; guards extend +2 mm below.
- Human-readable digits rendered under bars.

## Interactions

### Standard Mode (Anchored Elements)

- Drag: Pointer moves update `anchors[key]` (in mm) while staying within label bounds.
- Resize: Right-bottom handle modifies element-specific dimensions in `styles`:
  - `title`: width and font
  - `productName`: wrap width and font
  - `details`: width, line gap, font
  - `barcode`: width and height
- Remove: In edit mode, each anchored element shows a small × button; a custom confirmation dialog toggles its `visible[key] = false` immediately.

### Free Mode (Serbest)

- Separate modal workspace with its own zoom.
- Add items:
  - Text (content, font mm, wrap width mm, position mm)
  - Barcode (EAN-13 digits, width mm, height mm, position mm)
  - Image (data URL, width mm, height mm, position mm)
- Drag moves `x,y` only (no distortion).
- Resize changes width/height for barcode/image; for text, it changes wrap width and font.
- Delete: Red × at top-right shows a confirmation modal; on confirm item is removed instantly.
- Preview: “Önizlemeye Aktar” closes workspace and copies items to main preview (`freeMode=true`, `freeItems=wsItems`).

### Z-Index Strategy (to avoid stacking issues)

- Modal background `z-[100]`, modal content `z-[101]`
- Free-dialog `z-[103]`, remove-dialog `z-[102]`
- Interactive overlays within modal use inline `z-index` where necessary to guarantee they render above the canvas.

## Printing Pipeline (No Local Agent)

- We render the final canvas and open a print window (`window.open`).
- The print HTML uses:

```css
@page { size: 104mm 50.8mm; margin: 0; }
img { width: 104mm; height: 50.8mm; image-rendering: pixelated; }
```

- This ensures the printer driver sees the correct physical size. The sharpness is maximized via `image-rendering: pixelated` and a true-size canvas.
- Darkness slider affects only preview raster; ZPL darkness is included when generating ZPL (see below).

## ZPL Generation (for download)

- We generate a simple representative ZPL program per label type using `^PW`, `^LL`, `^MD`, and a handful of `^FO` + `^A0N`/`^BCN`/`^BQN` commands.
- The downloaded ZPL can be sent to a Zebra printer through any external workflow if desired.

## Templates – Save/Update/Open

- Save creates `label_templates` row with serialized JSON and a small PNG thumbnail (from the preview canvas via `toDataURL`).
- Update modifies existing rows and stamps `updated_at`.
- Open fetches rows (ordered by latest) and shows a grid of cards with thumbnails and names; clicking a card loads and applies the full serialized state.

## Company Logos

- On boot, we query `company_logo` (`company_name, logo_url`), preload images, and pick a default (Olivos when available).
- When the logo changes, positions and sizes remain the same; only the drawn image updates.

## Configuration & Running Locally

- Install & run:

```bash
npm install
npm run dev
```

- Environment (in `src/lib/supabase.ts`):
  - `supabaseUrl` and `supabaseAnonKey` are used for client initialization.
  - In production, keep keys in environment variables or a secure vault.

## Known Limitations and Notes

- Printing is done via rasterized canvas; we do not open raw TCP/IP or local agents (by requirement).
- Preview darkness is a visual multiplier; the physical printer’s final darkness is also controlled in ZPL via `^MD` (0–30) but driver/printer settings can still affect results.
- Barcode generation supports EAN-13; other symbologies would require new encoders.
- Image uploads are data URLs kept in component state; for large images or security, consider server-side storage or validation.
- RLS is not mandated in this project but recommended if templates are user-specific.

## Troubleshooting

- White screen after edits: restart Vite dev server (`npm run dev`) and perform a hard refresh; sometimes HMR cache causes stale exports.
- Canvas looks blurry: ensure DPI settings and CSS do not scale the canvas element; the code sets intrinsic size from mm.
- Elements appear behind modal: confirm z-index assignments as described.
- Barcode distortions during drag: the code separates drag (x/y) from resize (width/height) to prevent stretching while moving.

## Extensibility

- Add new label types by extending the switch-case in rendering and ZPL generation.
- Add new free item types (e.g., QR) by introducing new `FreeItemType` plus rendering logic.
- Export to PDF: capture canvas and pipe to PDF renderer sized to 104 × 50.8 mm.
- Multi-label sheets: lay out multiple canvases or use a paginated print CSS.

## Security

- Do not embed secrets in the frontend. Use environment variables and restrict Supabase RLS where necessary.
- Thumbnails are Base64 PNGs; verify size limits or migrate to object storage if needed.

## Summary

- Two fully supported workflows (Standard + Free) with live drag/resize and a crisp, true-to-size preview.
- No local agent: single-click browser printing.
- Professional EAN-13 rendering and adjustable darkness.
- Supabase-backed templates and logo management.
- Clean state serialization for reliable round-trip template loading.
