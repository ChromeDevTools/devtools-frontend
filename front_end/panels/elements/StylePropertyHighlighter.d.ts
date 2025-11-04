import type * as SDK from '../../core/sdk/sdk.js';
import type { StylesSidebarPane } from './StylesSidebarPane.js';
export declare class StylePropertyHighlighter {
    private readonly styleSidebarPane;
    constructor(ssp: StylesSidebarPane);
    /**
     * Expand all shorthands, find the given property, scroll to it and highlight it.
     */
    highlightProperty(cssProperty: SDK.CSSProperty.CSSProperty): Promise<void>;
    findAndHighlightSectionBlock(sectionBlockName: string): void;
    findAndHighlightSection(sectionName: string, blockName: string): void;
    /**
     * Find the first non-overridden property that matches the provided name, scroll to it and highlight it.
     */
    findAndHighlightPropertyName(propertyName: string, sectionName?: string, blockName?: string): boolean;
    private findTreeElementFromSection;
    private scrollAndHighlightTreeElement;
}
