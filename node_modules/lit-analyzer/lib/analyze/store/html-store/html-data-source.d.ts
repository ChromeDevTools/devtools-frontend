import { HtmlAttr, HtmlCssPart, HtmlCssProperty, HtmlDataCollection, HtmlEvent, HtmlProp, HtmlSlot, HtmlTag, NamedHtmlDataCollection } from "../../parse/parse-html-data/html-tag.js";
export declare class HtmlDataSource {
    private _globalTags;
    get globalTags(): ReadonlyMap<string, HtmlTag>;
    private _globalAttributes;
    get globalAttributes(): ReadonlyMap<string, HtmlAttr>;
    private _globalEvents;
    get globalEvents(): ReadonlyMap<string, HtmlEvent>;
    private _globalProperties;
    get globalProperties(): ReadonlyMap<string, HtmlProp>;
    private _globalSlots;
    get globalSlots(): ReadonlyMap<string, HtmlSlot>;
    private _globalCssParts;
    get globalCssParts(): ReadonlyMap<string, HtmlCssPart>;
    private _globalCssProperties;
    get globalCssProperties(): ReadonlyMap<string, HtmlCssProperty>;
    absorbCollection(collection: Partial<HtmlDataCollection>): void;
    forgetCollection({ tags, global: { events, attributes, slots, properties, cssParts, cssProperties } }: NamedHtmlDataCollection): void;
    getGlobalTag(tagName: string): HtmlTag | undefined;
    getGlobalAttribute(attrName: string): HtmlAttr | undefined;
    getGlobalEvent(eventName: string): HtmlEvent | undefined;
    getGlobalProperty(propName: string): HtmlProp | undefined;
    getGlobalSlot(slotName: string): HtmlSlot | undefined;
    getGlobalCssPart(partName: string): HtmlCssPart | undefined;
    getGlobalCssProperty(propName: string): HtmlCssProperty | undefined;
}
//# sourceMappingURL=html-data-source.d.ts.map