import { LitAnalyzerContext } from "../../../lit-analyzer-context.js";
import { HtmlDocument } from "../../../parse/document/text-document/html-document/html-document.js";
import { HtmlNode } from "../../../types/html-node/html-node-types.js";
import { LitCompletion } from "../../../types/lit-completion.js";
import { DocumentPositionContext } from "../../../util/get-position-context-in-document.js";
export declare function completionsForHtmlNodes(document: HtmlDocument, intersectingClosestNode: HtmlNode | undefined, { offset, leftWord, rightWord, beforeWord, afterWord }: DocumentPositionContext, { htmlStore }: LitAnalyzerContext): LitCompletion[];
//# sourceMappingURL=completions-for-html-nodes.d.ts.map