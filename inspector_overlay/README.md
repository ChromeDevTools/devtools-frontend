# Inspector Overlay

Inspector Overlay provides JS/CSS modules which are responsible for rendering the overlay content when you inspect an element in DevTools.

## How build works

- Overlay modules are built using rollup and copied to $root_gen_dir.
- CSS files are imported using a custom rollup plugin that transforms CSS into a CSSStyleSheet. *Only use CSS imports in the bundle entrypoint*.
- `inspector_overlay_resources.grd` file is copied as well and it defines how modules are packaged in a `.pak` file.
- The Chromium build uses `inspector_overlay_resources.grd` and produces a `.pak` file.
- `inspector_overlay_agent.cc` extracts the modules and inlines them onto the overlay page.

## Inspector overlay constraints

Inspector overlay resources are packaged into a single JS file, and, therefore, require all resources like CSS
or images to be bundled into JS files. Unlike DevTools themselves, inspector overlay does not have an ability to
handle dynamic number of resources because it does not have an embedded server. The backend references a particular
bundle using a generated static resource ID. Therefore, inspector overlay is using a custom rollup plugin to bundle
CSS and that approach should not be used in DevTools itself because importing CSS this way is not standard and DevTools
does not require bundling CSS in JS.

## Local Development

To iterate on the overlay UI locally, start a web server in the root folder and open one of the `debug/*.html` files.

For example:

- `python -m SimpleHTTPServer 8000`
- Go to `http://localhost:8000/inspector_overlay/debug/tool_highlight_top_arrow.html`
- Run `autoninja -C out/Default` to rebuild.

In this mode, JS modules will be served without bundling.

## Importing modules from DevTools

It's possible to re-use modules from DevTools for the overlay implementation.
To import a module, use the `import` statement with a relative path to the module.
It's important to keep the size of the shipped overlay modules minimal so it's better to
include only small standalone utilities. The build tooling will also check the size of the
generated modules and notify you if they are too big.

## Tests

Overlay modules can be unit tested like other parts of DevTools. For an example, see `test/unittests/front_end/inspector_overlay/common_test.ts`.

## Lifecycle of the overlay

When the backend installs an overlay bundle, it installs a global `InspectorOverlayHost` object that
allows the overlay to communicate with the backend. Then it makes the following calls in order:

- `setPlatform('windows'|'mac'|'linux'|'other')` to notify the overlay about the current platform.
- `setOverlay(toolName)` to notify the overlay about what tool is currently enabled.

Then when the overlay is being painted, the following calls are made by the backend:

- `reset(params)` to notify the overlay about actual params of the page such as viewport size, device scale factor and others.
- Invokes tool-specific methods such as `drawHighlight`.

In the overlay code, these calls are received through a global `dispatch(methodName, ...args)` function.