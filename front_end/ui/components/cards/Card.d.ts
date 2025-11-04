/**
 * A simple card component to display a Material card with a heading and content.
 *
 * Usage is simple:
 *
 * ```
 * // Instantiate programmatically:
 * const card = document.createElement('devtools-card');
 * card.heading = 'My awesome card';
 * card.append(content1, content2);
 *
 * // Use within a template:
 * html`
 *   <devtools-card heading="My awesome card">
 *     <div>content1</div>
 *     <div>content2</div>
 *   </devtools-card>
 * `;
 * ```
 *
 * The heading can be further customized with a prefix and a suffix if needed.
 * These are arbitrary children that can be slotted into the `"heading-prefix"`
 * and `"heading-suffix"` slots if required. Example:
 *
 * ```
 * html`
 *   <devtools-card heading="Rich heading">
 *     <devtools-icon name="folder" slot="heading-prefix"></devtools-icon>
 *     <devtools-button slot="heading-suffix">Remove</devtools-button>
 *   </devtools-card>
 * `;
 * ```
 *
 * @property heading - The `"heading"` attribute is reflect as property.
 * @attribute heading - The heading text.
 */
export declare class Card extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    constructor();
    /**
     * Yields the value of the `"heading"` attribute of this `Card`.
     *
     * @returns the value of the `"heading"` attribute or `null` if the attribute
     *          is absent.
     */
    get heading(): string | null;
    /**
     * Changes the value of the `"heading"` attribute of this `Card`. If you pass
     * `null`, the `"heading"` attribute will be removed from this element.
     *
     * @param heading the new heading of `null` to unset.
     */
    set heading(heading: string | null);
    attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-card': Card;
    }
}
