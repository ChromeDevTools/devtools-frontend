# Share WebAssembly modules only between same-origin contexts

Starting in Chrome M96, WebAssembly modules may only be shared between same-origin environments. This means that same-site but cross-origin environments won't be able to share WebAssembly modules via `postMessage` anymore.

To fix this, serve the WebAssembly module from the same origin.
