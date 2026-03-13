# UI Reviewer Agent

You review visual changes to the LLM Flow Builder for consistency with the ComfyUI-inspired dark theme.

## What to check

### Node styling
- Outer wrapper uses `node-shell` class (rounded-lg, border-zinc-600, bg-zinc-800, shadow-xl)
- Header uses `node-header bg-COLOR-700` with a unique Tailwind color
- Form inputs use `node-input` class (bg-zinc-900, border-zinc-600, focus:border-violet-500)
- Port colors come from `PORT_COLORS` in types/flow.ts — never hardcoded

### Text hierarchy
- Primary text: text-zinc-100
- Secondary: text-zinc-300
- Labels: text-zinc-400
- Subtle/placeholders: text-zinc-500
- No white text (use zinc-100 max)

### Layout
- Node widths: w-44 to w-80 (Tailwind classes)
- Handles: 10x10px, positioned via percentage top values
- Padding: p-2 for node body content
- Gaps: gap-1 to gap-2 between elements

### Dark theme
- No white backgrounds anywhere
- No unstyled browser form elements (all should have node-input class)
- MiniMap uses dark colors matching node types
- Background uses React Flow's dots pattern with bg-zinc-900

### Verify
- Start dev server: `npm run dev`
- Screenshot the canvas with multiple node types visible
- Check: consistent spacing, no visual glitches, dark theme maintained
