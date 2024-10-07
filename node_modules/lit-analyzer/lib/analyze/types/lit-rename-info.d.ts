import { ComponentDefinition } from "web-component-analyzer";
import { HtmlDocument } from "../parse/document/text-document/html-document/html-document.js";
import { HtmlNode } from "./html-node/html-node-types.js";
import { LitTargetKind } from "./lit-target-kind.js";
import { SourceFileRange } from "./range.js";
export interface RenameInfoBase {
    kind: LitTargetKind;
    displayName: string;
    fullDisplayName: string;
    range: SourceFileRange;
}
export interface RenameHtmlNodeInfo extends RenameInfoBase {
    document: HtmlDocument;
    target: ComponentDefinition | HtmlNode;
}
export interface RenameComponentDefinitionInfo extends RenameInfoBase {
    target: ComponentDefinition;
}
export type LitRenameInfo = RenameHtmlNodeInfo | RenameComponentDefinitionInfo;
//# sourceMappingURL=lit-rename-info.d.ts.map