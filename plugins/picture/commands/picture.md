---
description: Draw a picture from a description - Claude writes it as SVG and renders it to PNG
argument-hint: "<what to draw> [optional: size like 1920x1080, style, transparent]"
disable-model-invocation: true
---

Draw this picture yourself: $ARGUMENTS

If the description above is empty, ask the user what to draw and stop.

You are the image generator. Do not call any image API, do not download images, do not search the web for pictures. You draw by writing SVG by hand.

1. Plan the picture before writing: subject, composition, light direction, a palette of 5-8 colors, style. Use what the user specified; choose the rest yourself without asking.
2. Write the SVG to `pictures/<short-kebab-slug>.svg` in the current working directory (create the folder; if the file exists, append `-2`, `-3`, ...).
   - Root element needs `xmlns`, `width`, `height` and a matching `viewBox`. Default size 1024x1024; use the size or aspect ratio the user asked for (landscape 1536x1024, portrait 1024x1536).
   - Fill the whole canvas with a background unless the user asked for transparent.
   - Aim for a real illustration, not a diagram: layered shapes back to front, `linearGradient`/`radialGradient` for light and volume, `filter` (`feGaussianBlur`, `feTurbulence`, `feDropShadow`) for glow, texture and depth, `clipPath`/`mask` where needed, curves (`path` with C/Q/A) instead of boxes.
   - Everything self-contained: no external images, no external fonts, no `<script>`. Text only if the user asked for text; then use generic font families.
3. Render it:

       node "${CLAUDE_PLUGIN_ROOT}/bin/render.js" pictures/<slug>.svg

   This writes `pictures/<slug>.png` next to the SVG. Options: `--scale 2` for double resolution, `--transparent` to keep a transparent background.
4. Look at the result: Read the PNG. Check it against the description - wrong proportions, overlapping or cut-off shapes, unreadable parts, empty areas. Fix the SVG and render again. At most 2 correction rounds.
5. Show the final PNG to the user (send or link the file) with one line: what it shows, size, both file paths.

If the renderer reports that no browser was found, keep the SVG, tell the user it opens in any browser, and repeat the renderer's hint about `PICTURE_BROWSER`.

This command is the only way pictures get made. Outside of `/picture`, do not generate images.
