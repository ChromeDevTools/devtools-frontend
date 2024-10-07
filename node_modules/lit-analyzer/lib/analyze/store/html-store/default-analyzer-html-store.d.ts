import { HtmlAttr, HtmlAttrTarget, HtmlCssPart, HtmlDataCollection, HtmlEvent, HtmlMember, HtmlProp, HtmlSlot, HtmlTag, NamedHtmlDataCollection } from "../../parse/parse-html-data/html-tag.js";
import { HtmlNodeAttr, IHtmlNodeAttr, IHtmlNodeAttrEventListener, IHtmlNodeAttrProp, IHtmlNodeBooleanAttribute } from "../../types/html-node/html-node-attr-types.js";
import { HtmlNode } from "../../types/html-node/html-node-types.js";
import { AnalyzerHtmlStore } from "../analyzer-html-store.js";
import { HtmlDataSourceKind } from "./html-data-source-merged.js";
export declare class DefaultAnalyzerHtmlStore implements AnalyzerHtmlStore {
    private dataSource;
    absorbSubclassExtension(name: string, extension: HtmlTag): void;
    absorbCollection(collection: HtmlDataCollection, register: HtmlDataSourceKind): void;
    forgetCollection(collection: NamedHtmlDataCollection, register: HtmlDataSourceKind): void;
    getHtmlTag(htmlNode: HtmlNode | string): HtmlTag | undefined;
    getGlobalTags(): Iterable<HtmlTag>;
    getAllAttributesForTag(htmlNode: HtmlNode | string): Iterable<HtmlAttr>;
    getAllPropertiesForTag(htmlNode: HtmlNode | string): Iterable<HtmlProp>;
    getAllEventsForTag(htmlNode: HtmlNode | string): Iterable<HtmlEvent>;
    getAllSlotsForTag(htmlNode: HtmlNode | string): Iterable<HtmlSlot>;
    getAllCssPartsForTag(htmlNode: HtmlNode | string): Iterable<HtmlCssPart>;
    getAllCssPropertiesForTag(htmlNode: HtmlNode | string): Iterable<HtmlCssPart>;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttrProp): HtmlProp | undefined;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttr | IHtmlNodeBooleanAttribute): HtmlAttr | undefined;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttr | IHtmlNodeBooleanAttribute | IHtmlNodeAttrProp): HtmlMember | undefined;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttrEventListener): HtmlEvent | undefined;
    getHtmlAttrTarget(htmlNodeAttr: HtmlNodeAttr): HtmlAttrTarget | undefined;
}
//# sourceMappingURL=default-analyzer-html-store.d.ts.map