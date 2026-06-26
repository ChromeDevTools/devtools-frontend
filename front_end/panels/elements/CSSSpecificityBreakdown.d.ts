import type * as Protocol from '../../generated/protocol.js';
export interface SpecificityBreakdown {
    ids: string[];
    classes: string[];
    types: string[];
}
export declare function getSpecificityBreakdown(specificity: Protocol.CSS.Specificity): SpecificityBreakdown;
/**
 * Formats the specificity breakdown into a human-readable multi-line string
 * suitable for displaying in a tooltip.
 *
 * Example output for selector "div#main .active:hover":
 *   Specificity: (1,2,1)
 *   (a) ID-like: #main
 *   (b) Class-like: .active, :hover
 *   (c) Type-like: div
 */
export declare function formatSpecificitySummary(specificity: Protocol.CSS.Specificity): string;
export declare function getSpecificityBreakdownLines(specificity: Protocol.CSS.Specificity): string[];
export declare function formatSpecificityTooltip(specificity: Protocol.CSS.Specificity): string;
