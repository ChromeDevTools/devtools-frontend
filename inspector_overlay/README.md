# Inspector Overlay

Inspector Overlay provides JS/CSS modules which are responsible for rendering the overlay content when you inspect an element in DevTools.

## How build works

- Overlay modules are built using rollup and copied to $root_gen_dir.
- `inspector_overlay_resources.grd` file is copied as well and it defines how modules are packaged in a `.pak` file.
- The Chromium build uses `inspector_overlay_resources.grd` and produces a `.pak` file.
- `inspector_overlay_agent.cc` extracts the modules and inlines them onto the overlay page.

## Local Development

To iterate on the overlay UI locally, start a web server in the root folder and open one of the `debug/*.html` files.

For example:

- `python -m SimpleHTTPServer 8000`
- Go to `http://localhost:8000/front_end/inspector_overlay/debug/tool_highlight_top_arrow.html`

In this mode, JS modules will be served without bundling.

## Importing modules from DevTools

It's possible to re-use modules from DevTools for the overlay implementation.
To import a module, use the `import` statement with a relative path to the module.
It's important to keep the size of the shipped overlay modules minimal so it's better to
include only small standalone utilities. The build tooling will also check the size of the
generated modules and notify you if they are too big.

## Tests

Overlay modules can be unit tested like other parts of DevTools. For an example, see `test/unittests/front_end/inspector_overlay/common_test.ts`.
