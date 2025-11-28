import '../../../Images/Images.js';
/**
 * @deprecated
 */
export interface IconWithName {
    iconName: string;
    color?: string;
    width?: string;
    height?: string;
}
/**
 * @deprecated
 */
export type IconData = IconWithName | {
    iconPath: string;
    color?: string;
    width?: string;
    height?: string;
};
/**
 * A simple icon component to display SVG icons from the `front_end/Images/src`
 * folder (via the `--image-file-<name>` CSS variables).
 *
 * Usage is simple:
 *
 * ```js
 * // Instantiate programmatically via the `create()` helper:
 * const icon = createIcon('bin');
 * const iconWithClassName = createIcon('bin', 'delete-icon');
 *
 * // Use within a template:
 * Lit.html`
 *   <devtools-icon name="bin">
 *   </devtools-icon>
 * `;
 * ```
 *
 * The color for the icon defaults to `var(--icon-default)`, while the dimensions
 * default to 20px times 20px. You can change both color and size via CSS:
 *
 * ```css
 * devtools-icon.my-icon {
 *   color: red;
 *   width: 14px;
 *   height: 14px;
 * }
 * ```
 *
 * For `'triangle-up'`, `'triangle-down'`, `'triangle-left'`, and `'triangle-right'`
 * the default dimensions are 14px times 14px, and the default `vertical-align` is
 * `baseline` (instead of `sub`).
 *
 * @property name - The `"name"` attribute is reflected as property.
 * @property data - Deprecated way to set dimensions, color and name at once.
 * @attribute name - The basename of the icon file (not including the `.svg` suffix). For
 *              backwards compatibility we also support a full URL here, but that
 *              should not be used in newly written code.
 */
export declare class Icon extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    constructor();
    /**
     * @deprecated use `name` and CSS instead.
     */
    get data(): IconData;
    /**
     * @deprecated use `name` and CSS instead.
     */
    set data(data: IconData);
    /**
     * Yields the value of the `"name"` attribute of this `Icon` (`null` in case
     * there's no `"name"` on this element).
     */
    get name(): string | null;
    /**
     * Changes the value of the `"name"` attribute of this `Icon`. If you pass
     * `null` the `"name"` attribute will be removed from this element.
     *
     * @param name the new icon name or `null` to unset.
     */
    set name(name: string | null);
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
}
/**
 * Helper function to programmatically create an `Icon` isntance with a given
 * `name` and an optional CSS `className`.
 *
 * @param name the name of the icon to use.
 * @param className optional CSS class name(s) to put onto the element.
 * @returns the newly created `Icon` instance.
 */
export declare const createIcon: (name: string, className?: string) => Icon;
declare global {
    interface HTMLElementTagNameMap {
        'devtools-icon': Icon;
    }
}
