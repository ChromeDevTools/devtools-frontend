## Adding new icons

1. Out of a spritesheet (if you have a separately saved icon already go to 2.):
   - Open a spritesheet with the icon of interest, like `largeIcons.svg`.
   - Make sure it's the `src/` version of the spritesheet.
   - Copy-paste the icon to a new page. Make sure it preserved its original size.
   - Set the size of the page to match the icon. Ideally 1-2px bigger.
   - Center the icon within the page.
   - Save the icon with `_icon.svg` suffix. For instance `list_icon.svg`.

2. Compress the icon:
   - Put the icon through https://jakearchibald.github.io/svgomg/.

3. Add the compressed icon to `front_end/Images/src` folder.

4. Optimize:
   - `./scripts/optimize_svg_images.py`.

5. Add respective entries to `.gni` files.
   - Update the `devtols_image_files` list in `devtools_image_files.gni`.
   - Update the `grd_files_release_sources` list in `devtools_grd_files.gni`.

6. Use Icon component:
   - Visit go/icon-component-how-to for more information on that.

