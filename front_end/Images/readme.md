## Adding new icons

1. Use Inkscape 0.92 or newer.
1. Choose an existing spritesheet, like `largeIcons.svg` to add the icon to.
  - Make sure to edit the `src/` version of the svg!
1. Open that file with Inkscape and import the new SVG into the document
1. Place in an open spot, and use guides to scale the icon to a good size, relative to other icons
1. Any straight lines should be snapped to the closest pixel value.
   - Use the `Edit paths by nodes` tool (F2) to edit the path directly.
   - Tweak the X, Y values at the top to be integers.
 1. Optimize SVGs:
   - `./scripts/optimize_svg_images.py`
1. In `ui/Icon.js` add an entry in `UI.Icon.Descriptors`.
   - Look at the spritesheet's axes to identify the correct grid position.
1. You may want to regenerate devtools resources:
   - `ninja -C ~/chromium/src/out/Release/ devtools_frontend_resources`

