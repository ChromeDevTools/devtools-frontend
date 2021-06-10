## Adding new icons:

1. Out of a spritesheet (if you have a separately saved icon already go to 2.):
   - Open a spritesheet with the icon of interest, like `largeIcons.svg` in
     Inkscape.
   - Make sure it's the `src/` version of the spritesheet.
   - Copy-paste the icon to a new page. Make sure it preserved its
     original size and aspect ratio, and isn't otherwise altered.
   - To make sure step (3) below doesn't destroy the icon, it might be
     necessary to resize it. Just select everything and use the elements
     in the top toolbar to resize the icon (make sure the aspect ratio is
     preserved).
   - Set the size of the page to match the icon. You may use Inkscape's
     Edit>Resize Page to Selection command to accomplish this.
   - If you chose to include padding in the icon, make sure the icon is
     centered within the page.
   - Save the icon with `_icon.svg` suffix. For instance `list_icon.svg`.

2. Add respective entries to `.gni` files.
   - Update the `devtols_image_files` list in `config/gni/devtools_image_files.gni`.
   - Update the `grd_files_release_sources` list in `config/gni/devtools_grd_files.gni`.

3. Use Icon component in the DevTools front-end:
   - Visit https://docs.google.com/document/d/1EA--IokG6YW51y7unS8dIKUx6EtyjETT0uglmvIpfsg/edit#heading=h.xgjl2srtytjt for more information on that.

