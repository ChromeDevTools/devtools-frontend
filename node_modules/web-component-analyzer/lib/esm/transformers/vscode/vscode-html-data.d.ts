export interface HtmlDataAttrValue {
    name: string;
    description?: string;
}
export interface HtmlDataAttr {
    name: string;
    description?: string;
    values?: HtmlDataAttrValue[];
    valueSet?: string;
}
export interface HtmlDataTag {
    name: string;
    description?: string;
    attributes: HtmlDataAttr[];
}
export interface HtmlDataValueSet {
    name: string;
    values: HtmlDataAttrValue[];
}
export interface HtmlDataV1 {
    version: 1;
    tags?: HtmlDataTag[];
    globalAttributes?: HtmlDataAttr[];
    valueSets?: HtmlDataValueSet[];
}
export type VscodeHtmlData = HtmlDataV1;
//# sourceMappingURL=vscode-html-data.d.ts.map