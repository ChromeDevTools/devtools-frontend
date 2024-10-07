import { HtmlAttr, HtmlCssPart, HtmlDataCollection, HtmlEvent, HtmlProp, HtmlSlot, HtmlTag, NamedHtmlDataCollection, HtmlCssProperty } from "../../parse/parse-html-data/html-tag.js";
export declare enum HtmlDataSourceKind {
    DECLARED = 0,
    USER = 1,
    BUILT_IN = 2,
    BUILT_IN_DECLARED = 3
}
export declare class HtmlDataSourceMerged {
    private subclassExtensions;
    private htmlDataSources;
    private combinedHtmlDataSource;
    private relatedForTagName;
    get globalTags(): ReadonlyMap<string, HtmlTag>;
    invalidateCache(collection: NamedHtmlDataCollection): void;
    mergeDataSourcesAndInvalidate(collection: NamedHtmlDataCollection): void;
    forgetCollection(collection: NamedHtmlDataCollection, dataSource?: HtmlDataSourceKind): void;
    absorbCollection(collection: HtmlDataCollection, register: HtmlDataSourceKind): void;
    getHtmlTag(tagName: string): HtmlTag | undefined;
    absorbSubclassExtension(name: string, extension: HtmlTag): void;
    getSubclassExtensions(tagName?: string): HtmlTag[];
    getAllAttributesForTag(tagName: string): ReadonlyMap<string, HtmlAttr>;
    getAllPropertiesForTag(tagName: string): ReadonlyMap<string, HtmlProp>;
    getAllEventsForTag(tagName: string): ReadonlyMap<string, HtmlEvent>;
    getAllSlotForTag(tagName: string): ReadonlyMap<string, HtmlSlot>;
    getAllCssPartsForTag(tagName: string): ReadonlyMap<string, HtmlCssPart>;
    getAllCssPropertiesForTag(tagName: string): ReadonlyMap<string, HtmlCssProperty>;
    private iterateGlobalAttributes;
    private iterateGlobalEvents;
    private iterateGlobalProperties;
    private iterateGlobalSlots;
    private iterateGlobalCssParts;
    private iterateGlobalCssProperties;
    private iterateAllPropertiesForNode;
    private iterateAllEventsForNode;
    private iterateAllAttributesForNode;
    private iterateAllSlotsForNode;
    private iterateAllCssPartsForNode;
    private iterateAllCssPropertiesForNode;
}
//# sourceMappingURL=html-data-source-merged.d.ts.map