# Styling Components

Components are styled by a CSS file that is co-located next to the TypeScript source file. The only difference in file name is the extension and that for CSS files, the first letter is lowercase:

```
- ElementsBreadcrumbs.ts
- elementsBreadcrumbs.css
```

To import this file you use a regular `import` statement, and import the filename with `.js` appended:

```ts
import elementsBreadcrumbsStyles from './elementsBreadcrumbs.css.js';
```

As part of the build tool step, each CSS file is converted into a JS file that exports a `CSSStyleSheet` instance. This is done by Rollup in [`generate_css_js_files`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/scripts/build/generate_css_js_files.js;l=1;drc=28af9fbe783d82aa64bfa5f9b9509572dc2b3efe).

## `BUILD.gn` changes

Use the `generate_css` action (`scripts/build/ninja/generate_css.gni`) to declare stylesheets:

```gn
import("scripts/build/ninja/generate_css.gni") // Edit path correctly: this must be relative

generate_css("css_files") {
  sources = [ "elementsBreadcrumbs.css"]
}
```

And then add `:css_files` as a dependency to the `devtools_entrypoint`:

```gn
devtools_entrypoint("bundle") {
  deps = [  ":css_files" ,  "..."]
}
```

## Adopting the stylesheet

Importing the stylesheet is not enough to have it apply to the component's ShadowDOM, it must be adopted. The `connectedCallback` method is the best place for this:

```ts
connectedCallback() {
  this.#shadow.adoptedStyleSheets = [elementsBreadcrumbs];
}
```

## Tips for writing CSS.

Use `:host` to style the component itself. By default elements are `display: inline`. Often it can be useful to set `display: block`.

Remember to use theme colors (`var(--sys-color-on-surface)`) when styling elements to ensure consistency across DevTools.

If you want your component to have its colors configurable by users, consider defining `--override` variables. In your component's CSS, you would have something like:

```css
:host {
  color: var(--override-custom-color, var(--sys-color-on-surface));
}
```

This allows someone to define that `--override-custom-color` variable, but also ensures if it isn't defined that the default `color-text-primary` will be used. **Be careful with this!** We try to ensure consistent colors across DevTools; so most of the time you shouldn't allow configurable colors and should use the correct theme variables.


