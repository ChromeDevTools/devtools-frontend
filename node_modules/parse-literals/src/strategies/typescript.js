"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
let currentRoot;
exports.default = {
    getRootNode(source, fileName = '') {
        return ts.createSourceFile(fileName, source, ts.ScriptTarget.ESNext);
    },
    walkNodes(root, visit) {
        currentRoot = root;
        this.walkChildNodes(root, visit);
        currentRoot = undefined;
    },
    walkChildNodes(node, visit) {
        visit(node);
        ts.forEachChild(node, child => {
            this.walkChildNodes(child, visit);
        });
    },
    isTaggedTemplate: ts.isTaggedTemplateExpression,
    getTagText(node) {
        return node.tag.getText(currentRoot);
    },
    getTaggedTemplateTemplate(node) {
        return node.template;
    },
    isTemplate: ts.isTemplateLiteral,
    getTemplateParts(node) {
        if (ts.isNoSubstitutionTemplateLiteral(node)) {
            // "`string`"
            return [this.getHeadTemplatePart(node)];
        }
        else {
            return [
                // "`head${" "}middle${" "}tail`"
                this.getHeadTemplatePart(node.head),
                ...node.templateSpans.map(templateSpan => this.getMiddleTailTemplatePart(templateSpan.literal))
            ];
        }
    },
    getHeadTemplatePart(node) {
        let fullText = node.getFullText(currentRoot);
        // ignore prefix spaces and comments
        const startOffset = fullText.indexOf('`') + 1;
        const endOffset = ts.isTemplateHead(node) ? -2 : -1;
        return {
            text: fullText.slice(startOffset, fullText.length + endOffset),
            start: node.pos + startOffset,
            end: node.end + endOffset
        };
    },
    getMiddleTailTemplatePart(node) {
        // Use text, not fullText, to avoid prefix comments, which are part of the
        // expression.
        const text = node.getText(currentRoot);
        const endOffset = ts.isTemplateMiddle(node) ? 2 : 1;
        return {
            text: text.slice(1, text.length - endOffset),
            // Use getStart() and not node.pos, which may include prefix comments,
            // which are part of the expression
            start: node.getStart(currentRoot) + 1,
            end: node.end - endOffset
        };
    }
};
//# sourceMappingURL=typescript.js.map