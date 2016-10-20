# DevTools Scripts

## Python build scripts

- compile_frontend.py - runs closure compiler to do static type analysis
    - Note: the compiled outputs are not actually used to run DevTools
- optimize_png_images.py - manually run when adding png images
- convert_svg_images_to_png.py - manually run when adding svg images

## Closure

DevTools manually rolls the closure compiler to ./closure. If you manually roll closure compiler, you will need to re-generate the compiler-runner and jsdoc-validator custom jars using the python scripts in their respective directory. Make sure you use JDK 7 to compile these jars, otherwise they won't run on buildbot. If you compile with JDK 7, anyone with Java 7 or Java 8 should be able to run the jar.
