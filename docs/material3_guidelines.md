# Material 3 for DevTools

## Colors

### Backgrounds

All backgrounds should be either a surface or a container
- default toolbar color: `--sys-color-cdt-base-container`
- secondary toolbar color (e.g. Sources sidebar section headers like 'Watch' or 'Breakpoints'): `--sys-color-surface2`
- default data grid row color: `--sys-color-cdt-base-container`
- alternating grid row color: `--sys-color-surface1`
- warning message: `--sys-color-surface-yellow`
- error message: `--sys-color-surface-error`
- info message: `--sys-color-cdt-base-container`
- info bar background: `--sys-color-neutral-container`

States:

- hovered: `--sys-color-state-hover-on-subtle` (see Troubleshooting > 1 for details)
- selected: `--sys-color-tonal-container`
- focus-visible: `--sys-color-state-focus-highlight`
- text selection over focus: `--sys-color-state-focus-select`

### Text

Text should generally use on-surface, on-container
- regular (old text-primary): `--sys-color-on-surface`
- fainter (old text-secondary): `--sys-color-on-surface-subtle`
- disabled (old text-disabled): `--sys-color-text-disabled`

For warnings, errors, text on selected/focused UI elements:
- `--sys-color-on-surface-yellow`
- `--sys-color-on-surface-error`
- `--sys-color-on-tonal-container`

### Syntax highlighting

Syntax highlighting should use token-something colors defined [here](crsrc.org/c/third_party/devtools-frontend/src/front_end/ui/legacy/themeColors.css;l=355)

### Icons

Regular (dark grey) icons should also use on-something colors
- default: `--sys-color-on-surface-subtle`
- on hover: `--sys-color-on-surface`
- disabled: `--sys-color-state-disabled`

For colored icons, please use icon application color tokens
In case you need to add a new icon application color token, reference `--sys-color-something-bright`

### Other elements

In case you can’t reuse a component and need to add some new UI element, please follow the [spec](https://www.figma.com/file/5xWeeSmVQTd4yW3s6aFJ1f/CDDS-UX%2FEng-Spec-(NO-LONGER-UPDATED)?node-id=35%3A2599&mode=dev)

### Troubleshooting

1. For hover/focus colors for elements which background color is other than `--sys-color-cdt-base-container`
    or in case you need an opaque hover color use [state layer technique](https://carbon.googleplex.com/google-material-3/pages/interaction-states/state-layers).
    See [example CL](crrev.com/c/5003859)

