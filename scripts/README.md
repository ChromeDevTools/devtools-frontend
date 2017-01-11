# DevTools Scripts

## Development workflow scripts

These are scripts that can be useful to run independently as you're working on Chrome DevTools front-end.

The newer scripts such as for testing and hosted mode are written in Node.js, which has become the standard toolchain for web apps. The older scripts such as building (e.g. bundling and minifying) are written in Python, which has first-class support in Chromium's infrastructure.

## Overview

### Folders

- build - Python package for generating DevTools debug and release mode
- chrome_debug_launcher - automagically finds Chrome Canary and launches it with debugging flags (e.g. remote debugging port)
- closure - see section on Closure Compiler below
- gulp - experimental build process written in node.js & gulp to remove the dependency on Chromium-specific build tools (i.e. gn and ninja)
- hosted_mode - run DevTools on a localhost development server
- jsdoc_validator - enforces the use of Closure type annotations
- local_node - installs a local runtime of node.js

### Python Scripts
- convert_svg_images_to_png.py - manually run when adding svg images
- compile_frontend.py - runs closure compiler to do static type analysis
    - Note: the compiled outputs are not actually used to run DevTools
- install_node_deps.py - installs node.js & npm modules
- lint_javascript.py - run eslint
- optimize_png_images.py - manually run when adding png images

### Node.js scripts

The easiest way to run the node.js scripts is to use `npm run` which displays all the commands. For more information on the specific `npm run` commands, take a look at the primary devtools front-end readme (`../readme.md`).

## Closure

DevTools manually rolls the closure compiler to ./closure. If you manually roll closure compiler, you will need to re-generate the closure_runner (in ./closure) and jsdoc_validator custom jars using the python scripts in their respective directory.