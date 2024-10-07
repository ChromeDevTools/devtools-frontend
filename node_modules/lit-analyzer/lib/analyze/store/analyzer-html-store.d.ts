import { HtmlAttr, HtmlAttrTarget, HtmlCssPart, HtmlCssProperty, HtmlEvent, HtmlMember, HtmlProp, HtmlSlot, HtmlTag } from "../parse/parse-html-data/html-tag.js";
import { HtmlNodeAttr, IHtmlNodeAttr, IHtmlNodeAttrEventListener, IHtmlNodeAttrProp, IHtmlNodeBooleanAttribute } from "../types/html-node/html-node-attr-types.js";
import { HtmlNode } from "../types/html-node/html-node-types.js";
export interface AnalyzerHtmlStore {
    getHtmlTag(htmlNode: HtmlNode | string): HtmlTag | undefined;
    getGlobalTags(): Iterable<HtmlTag>;
    getAllAttributesForTag(htmlNode: HtmlNode | string): Iterable<HtmlAttr>;
    getAllPropertiesForTag(htmlNode: HtmlNode | string): Iterable<HtmlProp>;
    getAllEventsForTag(htmlNode: HtmlNode | string): Iterable<HtmlEvent>;
    getAllSlotsForTag(htmlNode: HtmlNode | string): Iterable<HtmlSlot>;
    getAllCssPartsForTag(htmlNode: HtmlNode | string): Iterable<HtmlCssPart>;
    getAllCssPropertiesForTag(htmlNode: HtmlNode | string): Iterable<HtmlCssProperty>;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttrProp): HtmlProp | undefined;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttr | IHtmlNodeBooleanAttribute): HtmlAttr | undefined;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttr | IHtmlNodeBooleanAttribute | IHtmlNodeAttrProp): HtmlMember | undefined;
    getHtmlAttrTarget(htmlNodeAttr: IHtmlNodeAttrEventListener): HtmlEvent | undefined;
    getHtmlAttrTarget(htmlNodeAttr: HtmlNodeAttr): HtmlAttrTarget | undefined;
    getHtmlAttrTarget(htmlNodeAttr: HtmlNodeAttr): HtmlAttrTarget | undefined;
}
//# sourceMappingURL=analyzer-html-store.d.ts.map