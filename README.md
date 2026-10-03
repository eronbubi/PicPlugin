# ClaudePicture

Claude Code plugin `picture`: `/picture <description>` makes Claude draw the image itself. Claude writes the picture as SVG, renders it to PNG with a locally installed Chromium browser (Chrome, Edge, Brave), checks the result and corrects it. No image API, no key, nothing leaves the machine.

Pictures are only made when you type `/picture`. The command cannot be triggered by Claude on its own.

    /picture a fox sitting in a snowy forest at dusk
    /picture minimalist logo for a coffee shop, 1536x1024, transparent

Output goes to `pictures/<slug>.svg` and `pictures/<slug>.png` in the current project.

## Install

    /plugin marketplace add eronbubi/PicPlugin
    /plugin install picture@picture-local

## Requirements

- Node.js
- Chrome, Edge, Brave or Chromium for the PNG step. Without one you still get the SVG. Set `PICTURE_BROWSER` to a browser executable to use a specific one.

## Renderer

    node plugins/picture/bin/render.js <in.svg> [out.png] [--scale N] [--transparent]

## License

Copyright (c) 2026 Eron. Licensed under [CC BY-ND 4.0](LICENSE): you may use and share this plugin, with credit, but you may not modify it or distribute modified versions.
