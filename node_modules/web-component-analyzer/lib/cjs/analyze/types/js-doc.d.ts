import { JSDoc, JSDocTag } from "typescript";
export interface JsDocTagParsed {
    tag: string;
    name?: string;
    type?: string;
    optional?: boolean;
    default?: unknown;
    description?: string;
    className?: string;
    namespace?: string;
}
export interface JsDocTag {
    node?: JSDocTag;
    comment?: string;
    tag: string;
    parsed: () => JsDocTagParsed;
}
export interface JsDoc {
    node?: JSDoc;
    description?: string;
    tags?: JsDocTag[];
}
//# sourceMappingURL=js-doc.d.ts.map