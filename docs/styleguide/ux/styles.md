# Styles

[TOC]

## Colors

We define three sets of color token types, **reference/palette tokens**,
**system tokens**, and **application tokens**.

[**Reference or palette
tokens**](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/tokens.css)
(e.g. `--ref-palette-X`) are a set of base colors that get updated on [Chrome
color theme change](###) and should not be directly used.

[**System
tokens**](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/themeColors.css)
(e.g. `--sys-color-X`) are a set of semantic tokens (use is often clear from
name e.g. `--sys-color-error-container`). They reference palette tokens and
incorporate light / dark mode switches and should be used in the code directly.
You can view all system tokens in their light and dark variant when running the
component server with `npm run components-server` under *Theme Colors*.

[**Application
tokens**](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/applicationColorTokens.css)
(e.g. `--app-color-X`) reference palette tokens, and add more semantic meaning
and handle exception cases, where system tokens are not enough. Should be
defined for both light and dark modes. An example CL that adds application
tokens can be found
[here](https://crrev.com/c/5471945/10/front_end/ui/legacy/themeColors.css).

Each token follows a naming structure that describes its role. Important
keywords that are used for color roles are defined in the following table:

| Role                         | Description                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Surface                      | Universal background colors                                                                        |
| Primary, Secondary, Tertiary | Colors that are used to emphasize or de-emphasize elements                                         |
| Containers                   | Background colors for components                                                                   |
| On                           | For text on top a surface/container that is used                                                   |
| Variant                      | Color that is used in combination with the "non-variant" counterpart, that should be de-emphasized |

### Custom Color Theming

DevTools adapts its own theme depending on [Chrome's custom theming
feature](https://blog.google/products/chrome/new-ways-to-customize-chrome-on-your-desktop/).
On theme changes, the *reference tokens* are automatically updated to align with
Chrome's theme change. Since all *system tokens*) make use of *reference
tokens*, they are updated, too.

Chrome's theming differentiates between two *default* color schemes (a blue
**default** and a **grey default**), and a number of **accent** color schemes
(blue, purple, yellow, and so on). In DevTools, the default schemes are defined
as `baseline-grayscale` and `baseline-default` css classes in
[themeColors.css](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/themeColors.css).
The accent color schemes don't require extra color definitions and will adapt
with the reference colors.

If DevTools doesn't receive any theming information from Chrome, it defaults to
use the blue default scheme.

### Usage

#### Defaults

Below, we present harmonious color combinations suitable for various scenarios,
covering default choices for backgrounds, text, and icons.

##### Default colors

  * background: `--sys-color-cdt-base-container`
  * text default: `--sys-color-on-surface`
  * text fainter (use rarely): `--sys-color-on-surface-subtle`
  * icon: `--sys-color-on-surface-subtle`
  * divider lines: `--sys-color-divider`

##### Selected colors

(when DevTools is focused window)

  * background: `--sys-color-tonal-container`
  * text: `--sys-color-on-tonal-container`

(when DevTools is unfocused)

  * background: `--sys-color-neutral-container`
  * text: `--sys-color-on-surface`

##### Disabled colors

  * background: `--sys-color-state-disabled-container`
  * text: `--sys-color-state-disabled`
  * icons: `--sys-color-state-disabled`

##### Warning colors

  * background: `--sys-color-surface-yellow`
  * text: `--sys-color-on-surface-yellow`
  * icons: `--sys-color-orange-bright`

##### Error colors

  * background: `--sys-color-surface-error`
  * text: `--sys-color-error`
  * icons: `--sys-color-error-bright`

##### State layer colors

  * hovered: `--sys-color-state-hover-on-subtle`
  * keyboard focus outline: `--sys-color-state-focus-ring`
  * active: `--sys-color-state-ripple-primary`,
    `--sys-color-state-ripple-neutral-on-subtle` or
    `--sys-color-state-ripple-on-prominent` (see explanation below)

Ripple colors are for the transparent state layer of the pressed state
(`active`). They have different intensity and are used for different base
colors:

  * `--sys-color-state-ripple-primary` is used when elements with the primary
    color are pressed. Primary buttons use this ripple color for example.
    -on-prominent is a bit stronger than it's counter parts, making it more
    visible on primary.
  * `--sys-color-state-ripple-neutral-on-subtle` is used on light surfaces,
    grays or transparent backgrounds. This should be the default "pressed" color
    for everything else.
  * `--sys-color-state-ripple-on-prominent` is used for inverted components
    (that are using `--sys-color-inverse-surface` and
    `--sys-color-inverse-on-surface` colors).

#### Usage of colors by category

In the following we present general guidelines and examples on color choices by
category (background, text, icon, and syntax highlighting).

##### Background colors

All backgrounds should be either a surface or a container.

  * default toolbar color: `--sys-color-cdt-base-container`
  * secondary toolbar color (e.g. Sources sidebar section headers like 'Watch'
    or 'Breakpoints'): `--sys-color-surface2`
  * default data grid row color: `--sys-color-cdt-base-container`
  * alternating grid row color: `--sys-color-surface1`
  * warning message: `--sys-color-surface-yellow`
  * error message: `--sys-color-surface-error`
  * info message: `--sys-color-cdt-base-container`
  * info bar background: `--sys-color-neutral-container`

##### Text colors

Text should generally use on-surface, on-container.

  * regular: `--sys-color-on-surface`
  * fainter: `--sys-color-on-surface-subtle`
  * disabled: `--sys-color-state-disabled`

##### Icon colors

Regular (dark grey) icons should also use on-something colors:

  * default: `--sys-color-on-surface-subtle`
  * on hover: `--sys-color-on-surface`
  * disabled: `--sys-color-state-disabled`

For colored icons, please use icon application color tokens: `--app-`. In case
you need to add a new icon application color token, reference
`--sys-color-something-bright`

##### Syntax highlighting

Syntax highlighting should use `--sys-color-token-X` colors.

#### Dos and Don'ts

##### Dos

  * Use system colors (`--sys-color-X`)
  * Use application colors (`--app-color-X`) for *rare* deviations

##### Don'ts

  * Don't use reference palette colors (`--ref-palette-X`)
  * Don't use syntax tokens for anything other than highlighting code

### Token reference

*Note: You can view all system tokens in their light and dark variant when
running the component server with `npm run components-server` under Theme
Colors.*

| Sys color token                     | CSS                                               | Figma                                   | Usage                                                                                     |
| ----------------------------------- | ------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| base                                | `--sys-color-base`                                | sys/base                                |                                                                                           |
| base-container                      | `--sys-color-base-container`                      | sys/base-container                      |                                                                                           |
| base-container-elevated             | `--sys-color-base-container-elevated`             | sys/base-container-elevated             |                                                                                           |
| blue                                | `--sys-color-blue`                                | sys/blue                                |                                                                                           |
| blue-bright                         | `--sys-color-blue-bright`                         | sys/blue-bright                         | Bright blue for icons                                                                     |
| cdt-base                            | `--sys-color-cdt-base`                            | sys/cdt-base                            | Default DevTools surface background                                                       |
| cdt-base-container                  | `--sys-color-cdt-base-container`                  | sys/cdt-base-container                  | Default DevTools container background                                                     |
| cyan                                | `--sys-color-cyan`                                | sys/cyan                                |                                                                                           |
| cyan-bright                         | `--sys-color-cyan-bright`                         | sys/cyan-bright                         | Bright cyan for icons                                                                     |
| divider                             | `--sys-color-divider`                             | sys/divider                             | Color for dividers                                                                        |
| divider-on-tonal-container          | `--sys-color-divider-on-tonal-container`          | sys/divider-on-tonal-container          | Color for dividers on top of a container with tonal colors                                |
| divider-prominent                   | `--sys-color-divider-prominent`                   | sys/divider-prominent                   |                                                                                           |
| error                               | `--sys-color-error`                               | sys/error                               |                                                                                           |
| error-bright                        | `--sys-color-error-bright`                        | sys/error-bright                        | Bright red for icons                                                                      |
| error-container                     | `--sys-color-error-container`                     | sys/error-container                     |                                                                                           |
| error-outline                       | `--sys-color-error-outline`                       | sys/error-outline                       |                                                                                           |
| gradient-primary                    | `--sys-color-gradient-primary`                    | sys/gradient-primary                    |                                                                                           |
| gradient-tertiary                   | `--sys-color-gradient-tertiary`                   | sys/gradient-tertiary                   |                                                                                           |
| green                               | `--sys-color-green`                               | sys/green                               |                                                                                           |
| green-bright                        | `--sys-color-green-bright`                        | sys/green-bright                        |                                                                                           |
| inverse-on-surface                  | `--sys-color-inverse-on-surface`                  | sys/inverse-on-surface                  |                                                                                           |
| inverse-primary                     | `--sys-color-inverse-primary`                     | sys/inverse-primary                     |                                                                                           |
| inverse-surface                     | `--sys-color-inverse-surface`                     | sys/inverse-surface                     |                                                                                           |
| neutral-bright                      | `--sys-color-neutral-bright`                      | sys/neutral-bright                      |                                                                                           |
| neutral-container                   | `--sys-color-neutral-container`                   | sys/neutral-container                   |                                                                                           |
| neutral-outline                     | `--sys-color-neutral-outline`                     | sys/neutral-outline                     |                                                                                           |
| omnibox-container                   | `--sys-color-omnibox-container`                   | sys/omnibox-container                   |                                                                                           |
| on-base                             | `--sys-color-on-base`                             | sys/on-base                             |                                                                                           |
| on-base-divider                     | `--sys-color-on-base-divider`                     | sys/on-base-divider                     |                                                                                           |
| on-blue                             | `--sys-color-on-blue`                             | sys/on-blue                             |                                                                                           |
| on-cyan                             | `--sys-color-on-cyan`                             | sys/on-cyan                             |                                                                                           |
| on-error                            | `--sys-color-on-error`                            | sys/on-error                            |                                                                                           |
| on-error-container                  | `--sys-color-on-error-container`                  | sys/on-error-container                  |                                                                                           |
| on-green                            | `--sys-color-on-green`                            | sys/on-green                            |                                                                                           |
| on-orange                           | `--sys-color-on-orange`                           | sys/on-orange                           |                                                                                           |
| on-pink                             | `--sys-color-on-pink`                             | sys/on-pink                             |                                                                                           |
| on-primary                          | `--sys-color-on-primary`                          | sys/on-primary                          |                                                                                           |
| on-purple                           | `--sys-color-on-purple`                           | sys/on-purple                           |                                                                                           |
| on-secondary                        | `--sys-color-on-secondary`                        | sys/on-secondary                        |                                                                                           |
| on-surface                          | `--sys-color-on-surface`                          | sys/on-surface                          |                                                                                           |
| on-surface-error                    | `--sys-color-on-surface-error`                    | sys/on-surface-error                    |                                                                                           |
| on-surface-green                    | `--sys-color-on-surface-green`                    | sys/on-surface-green                    |                                                                                           |
| on-surface-primary                  | `--sys-color-on-surface-primary`                  | sys/on-surface-primary                  |                                                                                           |
| on-surface-secondary                | `--sys-color-on-surface-secondary`                | sys/on-surface-secondary                |                                                                                           |
| on-surface-subtle                   | `--sys-color-on-surface-subtle`                   | sys/on-surface-subtle                   |                                                                                           |
| on-surface-yellow                   | `--sys-color-on-surface-yellow`                   | sys/on-surface-yellow                   |                                                                                           |
| on-tertiary                         | `--sys-color-on-tertiary`                         | sys/on-tertiary                         |                                                                                           |
| on-tertiary-container               | `--sys-color-on-tertiary-container`               | sys/on-tertiary-container               |                                                                                           |
| on-tonal-container                  | `--sys-color-on-tonal-container`                  | sys/on-tonal-container                  |                                                                                           |
| on-yellow                           | `--sys-color-on-yellow`                           | sys/on-yellow                           |                                                                                           |
| on-yellow-container                 | `--sys-color-on-yellow-container`                 | sys/on-yellow-container                 |                                                                                           |
| orange                              | `--sys-color-orange`                              | sys/orange                              |                                                                                           |
| orange-bright                       | `--sys-color-orange-bright`                       | sys/orange-bright                       |                                                                                           |
| outline                             | `--sys-color-outline`                             | sys/outline                             |                                                                                           |
| pink                                | `--sys-color-pink`                                | sys/pink                                |                                                                                           |
| pink-bright                         | `--sys-color-pink-bright`                         | sys/pink-bright                         |                                                                                           |
| primary                             | `--sys-color-primary`                             | sys/primary                             |                                                                                           |
| primary-bright                      | `--sys-color-primary-bright`                      | sys/primary-bright                      |                                                                                           |
| purple                              | `--sys-color-purple`                              | sys/purple                              |                                                                                           |
| purple-bright                       | `--sys-color-purple-bright`                       | sys/purple-bright                       |                                                                                           |
| secondary                           | `--sys-color-secondary`                           | sys/secondary                           |                                                                                           |
| state-disabled                      | `--sys-color-state-disabled`                      | sys/state-disabled                      |                                                                                           |
| state-disabled-container            | `--sys-color-state-disabled-container`            | sys/state-disabled-container            |                                                                                           |
| state-focus-highlight               | `--sys-color-state-focus-highlight`               | sys/state-focus-highlight               |                                                                                           |
| state-focus-ring                    | `--sys-color-state-focus-ring`                    | sys/state-focus-ring                    |                                                                                           |
| state-focus-select                  | `--sys-color-state-focus-select`                  | sys/state-focus-select                  |                                                                                           |
| state-header-hover                  | `--sys-color-state-header-hover`                  | sys/state-header-hover                  |                                                                                           |
| state-hover-bright-blend-protection | `--sys-color-state-hover-bright-blend-protection` | sys/state-hover-bright-blend-protection |                                                                                           |
| state-hover-dim-blend-protection    | `--sys-color-state-hover-dim-blend-protection`    | sys/state-hover-dim-blend-protection    |                                                                                           |
| state-hover-on-prominent            | `--sys-color-state-hover-on-prominent`            | sys/state-hover-on-prominent            |                                                                                           |
| state-hover-on-subtle               | `--sys-color-state-hover-on-subtle`               | sys/state-hover-on-subtle               |                                                                                           |
| state-on-header-hover               | `--sys-color-state-on-header-hover`               | sys/state-on-header-hover               |                                                                                           |
| state-ripple-neutral-on-prominent   | `--sys-color-state-ripple-neutral-on-prominent`   | sys/state-ripple-neutral-on-prominent   |                                                                                           |
| state-ripple-neutral-on-subtle      | `--sys-color-state-ripple-neutral-on-subtle`      | sys/state-ripple-neutral-on-subtle      |                                                                                           |
| state-ripple-primary                | `--sys-color-state-ripple-primary`                | sys/state-ripple-primary                |                                                                                           |
| surface                             | `--sys-color-surface`                             | sys/surface                             | Universal surface color                                                                   |
| surface1                            | `--sys-color-surface1`                            | sys/surface1                            | Universal surface color                                                                   |
| surface2                            | `--sys-color-surface2`                            | sys/surface2                            | Universal surface color                                                                   |
| surface3                            | `--sys-color-surface3`                            | sys/surface3                            | Universal surface color                                                                   |
| surface4                            | `--sys-color-surface4`                            | sys/surface4                            | Universal surface color                                                                   |
| surface5                            | `--sys-color-surface5`                            | sys/surface5                            | Universal surface color                                                                   |
| surface-error                       | `--sys-color-surface-error`                       | sys/surface-error                       | Surface for error backgrounds                                                             |
| surface-green                       | `--sys-color-surface-green`                       | sys/surface-green                       |                                                                                           |
| surface-variant                     | `--sys-color-surface-variant`                     | sys/surface-variant                     |                                                                                           |
| surface-yellow                      | `--sys-color-surface-yellow`                      | sys/surface-yellow                      | Yellow surface colors used e.g. for warnings                                              |
| surface-yellow-high                 | `--sys-color-surface-yellow-high`                 | sys/surface-yellow-high                 |                                                                                           |
| tertiary                            | `--sys-color-tertiary`                            | sys/tertiary                            |                                                                                           |
| tertiary-container                  | `--sys-color-tertiary-container`                  | sys/tertiary-container                  | Background color for de-emphasizing a container next to a primary and secondary container |
| token-atom                          | `--sys-color-token-atom`                          | sys/token-atom                          | Syntax highlighting                                                                       |
| token-attribute                     | `--sys-color-token-attribute`                     | sys/token-attribute                     | Syntax highlighting                                                                       |
| token-attribute-value               | `--sys-color-token-attribute-value`               | sys/token-attribute-value               | Syntax highlighting                                                                       |
| token-builtin                       | `--sys-color-token-builtin`                       | sys/token-builtin                       | Syntax highlighting                                                                       |
| token-comment                       | `--sys-color-token-comment`                       | sys/token-comment                       | Syntax highlighting for comments                                                          |
| token-definition                    | `--sys-color-token-definition`                    | sys/token-definition                    | Syntax highlighting                                                                       |
| token-deleted                       | `--sys-color-token-deleted`                       | sys/token-deleted                       | Syntax highlighting                                                                       |
| token-inserted                      | `--sys-color-token-inserted`                      | sys/token-inserted                      | Syntax highlighting                                                                       |
| token-keyword                       | `--sys-color-token-keyword`                       | sys/token-keyword                       | Syntax highlighting for keywords                                                          |
| token-meta                          | `--sys-color-token-meta`                          | sys/token-meta                          | Syntax highlighting                                                                       |
| token-number                        | `--sys-color-token-number`                        | sys/token-number                        | Syntax highlighting for numbers                                                           |
| token-property                      | `--sys-color-token-property`                      | sys/token-property                      | Syntax highlighting for properties                                                        |
| token-property-special              | `--sys-color-token-property-special`              | sys/token-property-special              | Syntax highlighting                                                                       |
| token-pseudo-element                | `--sys-color-token-pseudo-element`                | sys/token-pseudo-element                | Syntax highlighting for pseudo elements                                                   |
| token-string                        | `--sys-color-token-string`                        | sys/token-string                        | Syntax highlighting for strings                                                           |
| token-string-special                | `--sys-color-token-string-special`                | sys/token-string-special                | Syntax highlighting                                                                       |
| token-subtle                        | `--sys-color-token-subtle`                        | sys/token-subtle                        | Syntax highlighting                                                                       |
| token-tag                           | `--sys-color-token-tag`                           | sys/token-tag                           | Syntax highlighting                                                                       |
| token-type                          | `--sys-color-token-type`                          | sys/token-type                          | Syntax highlighting                                                                       |
| token-variable                      | `--sys-color-token-variable`                      | sys/token-variable                      | Syntax highlighting for variables                                                         |
| token-variable-special              | `--sys-color-token-variable-special`              | sys/token-variable-special              |                                                                                           |
| tonal-container                     | `--sys-color-tonal-container`                     | sys/tonal-container                     | Background color for selected containers                                                  |
| tonal-outline                       | `--sys-color-tonal-outline`                       | sys/tonal-outline                       | Outline color for selected containers with `--sys-color-tonal-container`                  |
| yellow                              | `--sys-color-yellow`                              | sys/yellow                              |                                                                                           |
| yellow-bright                       | `--sys-color-yellow-bright`                       | sys/yellow-bright                       | Yellow color for icons                                                                    |
| yellow-container                    | `--sys-color-yellow-container`                    | sys/yellow-container                    |                                                                                           |
| yellow-outline                      | `--sys-color-yellow-outline`                      | sys/yellow-outline                      | Yellow outline for containers using `--sys-color-yellow-container`                        |

### Edge cases

In rare edge cases, you might want to define new tokens. If you do so, don't
define `--sys-color-X` tokens, since these are reserved for Material's design
system, but instead create an application token `--app-color-X`. Be aware that
you need to define light, dark and dynamic theme colors for this new token. An
example CL that adds application tokens can be found
[here](https://crrev.com/c/5471945/10/front_end/ui/legacy/themeColors.css).

### Resources

  * [Reference color
    tokens](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/tokens.css)
  * [System color
    tokens](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/themeColors.css)
  * [Application color
    tokens](https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/legacy/applicationColorTokens.css)
  * [Color definitions in the CDT
    Figma](https://www.figma.com/design/A5iQBBNAe5zPFpJvUzUgW8/CDT-design-kit?node-id=337-5217&m=dev)
