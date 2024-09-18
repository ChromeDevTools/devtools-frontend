## Adding new icons:

1. Copy the SVG file into `front_end/Images/src`, using hyphen-case,
   ideally just take the name that the icon has in the Material
   icon set.

2. Add respective entries to `.gni` files.
   - Update the `devtools_image_files` list in `config/gni/devtools_image_files.gni`.
   - Update the `grd_files_release_sources` list in `config/gni/devtools_grd_files.gni`.

3. Use Icon component in the DevTools front-end:
   - Visit https://docs.google.com/document/d/1EA--IokG6YW51y7unS8dIKUx6EtyjETT0uglmvIpfsg for more information on that.

