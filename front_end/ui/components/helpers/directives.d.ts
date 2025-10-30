import * as Lit from '../../lit/lit.js';
/**
 * Provides a hook to get a callback when a Lit node is rendered into the DOM:
 * @example
 *
 * ```
 * <p on-render=${nodeRenderedCallback(node => ...)}>
 * ```
 */
declare class NodeRenderedCallback extends Lit.Directive.Directive {
    constructor(partInfo: Lit.Directive.PartInfo);
    update(part: Lit.Directive.ElementPart, [callback]: Lit.Directive.DirectiveParameters<this>): void;
    render(_callback: (domNode: Element) => void): void;
}
export declare const nodeRenderedCallback: (_callback: (domNode: Element) => void) => Lit.Directive.DirectiveResult<typeof NodeRenderedCallback>;
export {};
