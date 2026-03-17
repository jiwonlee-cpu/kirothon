# PptxGenJS Tutorial

## Setup & Basic Structure

```javascript
const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';  // or 'LAYOUT_16x10', 'LAYOUT_4x3', 'LAYOUT_WIDE'
pres.author = 'Your Name';
pres.title = 'Presentation Title';

let slide = pres.addSlide();
slide.addText("Hello World!", { x: 0.5, y: 0.5, fontSize: 36, color: "363636" });

pres.writeFile({ fileName: "Presentation.pptx" });
```

## Layout Dimensions

Slide dimensions (coordinates in inches):
- `LAYOUT_16x9`: 10" × 5.625" (default)
- `LAYOUT_16x10`: 10" × 6.25"
- `LAYOUT_4x3`: 10" × 7.5"
- `LAYOUT_WIDE`: 13.3" × 7.5"

---

## Text & Formatting

```javascript
// Basic text
slide.addText("Simple Text", {
  x: 1, y: 1, w: 8, h: 2, fontSize: 24, fontFace: "Arial",
  color: "363636", bold: true, align: "center", valign: "middle"
});

// Character spacing (use charSpacing, not letterSpacing which is silently ignored)
slide.addText("SPACED TEXT", { x: 1, y: 1, w: 8, h: 1, charSpacing: 6 });

// Rich text arrays
slide.addText([
  { text: "Bold ", options: { bold: true } },
  { text: "Italic ", options: { italic: true } }
], { x: 1, y: 3, w: 8, h: 1 });

// Multi-line text (requires breakLine: true)
slide.addText([
  { text: "Line 1", options: { breakLine: true } },
  { text: "Line 2", options: { breakLine: true } },
  { text: "Line 3" }
], { x: 0.5, y: 0.5, w: 8, h: 2 });

// Text box margin (internal padding)
slide.addText("Title", {
  x: 0.5, y: 0.3, w: 9, h: 0.6,
  margin: 0  // Use 0 when aligning text with other elements
});
```

**Tip:** Text boxes have internal margin by default. Set `margin: 0` when you need text to align precisely with shapes, lines, or icons.

---

## Lists & Bullets

```javascript
// CORRECT: Multiple bullets
slide.addText([
  { text: "First item", options: { bullet: true, breakLine: true } },
  { text: "Second item", options: { bullet: true, breakLine: true } },
  { text: "Third item", options: { bullet: true } }
], { x: 0.5, y: 0.5, w: 8, h: 3 });

// WRONG: Never use unicode bullets
// slide.addText("• First item", { ... });  // Creates double bullets

// Sub-items and numbered lists
{ text: "Sub-item", options: { bullet: true, indentLevel: 1 } }
{ text: "First", options: { bullet: { type: "number" }, breakLine: true } }
```

---

## Shapes

```javascript
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 0.8, w: 1.5, h: 3.0,
  fill: { color: "FF0000" }, line: { color: "000000", width: 2 }
});

slide.addShape(pres.shapes.OVAL, { x: 4, y: 1, w: 2, h: 2, fill: { color: "0000FF" } });

slide.addShape(pres.shapes.LINE, {
  x: 1, y: 3, w: 5, h: 0, line: { color: "FF0000", width: 3, dashType: "dash" }
});

// With transparency
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "0088CC", transparency: 50 }
});

// Rounded rectangle
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" }, rectRadius: 0.1
});

// With shadow
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" },
  shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 }
});
```

Shadow options:

| Property | Type | Range | Notes |
|----------|------|-------|-------|
| `type` | string | `"outer"`, `"inner"` | |
| `color` | string | 6-char hex | No `#` prefix |
| `blur` | number | 0-100 pt | |
| `offset` | number | 0-200 pt | Must be non-negative |
| `angle` | number | 0-359 degrees | 135 = bottom-right, 270 = upward |
| `opacity` | number | 0.0-1.0 | |

---

## Images

```javascript
// From file
slide.addImage({ path: "images/logo.png", x: 0.5, y: 0.5, w: 2, h: 1 });

// From URL
slide.addImage({ path: "https://example.com/image.png", x: 1, y: 1, w: 4, h: 3 });

// With rounding (for circular images)
slide.addImage({ path: "photo.jpg", x: 1, y: 1, w: 2, h: 2, rounding: true });
```

---

## Charts

```javascript
// Bar chart
slide.addChart(pres.charts.BAR, [
  { name: "Series 1", labels: ["Q1", "Q2", "Q3"], values: [10, 20, 30] }
], { x: 1, y: 1, w: 8, h: 4 });

// Pie chart
slide.addChart(pres.charts.PIE, [
  { name: "Breakdown", labels: ["A", "B", "C"], values: [40, 35, 25] }
], { x: 1, y: 1, w: 6, h: 4, showPercent: true });
```

---

## Tables

```javascript
let rows = [
  [{ text: "Header 1", options: { bold: true } }, { text: "Header 2", options: { bold: true } }],
  ["Row 1 Col 1", "Row 1 Col 2"],
  ["Row 2 Col 1", "Row 2 Col 2"],
];

slide.addTable(rows, {
  x: 0.5, y: 1, w: 9,
  colW: [4.5, 4.5],
  border: { type: "solid", color: "CFCFCF" },
  fill: { color: "F7F7F7" },
  fontSize: 14,
});
```

---

## Master Slides & Backgrounds

```javascript
// Solid background
slide.background = { color: "1E2761" };

// Image background
slide.background = { path: "bg.jpg" };

// Using a master
pres.defineSlideMaster({
  title: "MASTER_SLIDE",
  background: { color: "FFFFFF" },
  objects: [
    { rect: { x: 0, y: 5.3, w: "100%", h: 0.3, fill: { color: "1E2761" } } },
  ],
});
let slide = pres.addSlide({ masterName: "MASTER_SLIDE" });
```
