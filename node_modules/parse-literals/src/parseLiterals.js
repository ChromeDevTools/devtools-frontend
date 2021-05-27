"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLiterals = void 0;
const typescript_1 = require("./strategies/typescript");
function parseLiterals(source, options = {}) {
    const strategy = {
        ...typescript_1.default,
        ...(options.strategy || {})
    };
    const literals = [];
    const visitedTemplates = [];
    strategy.walkNodes(strategy.getRootNode(source, options.fileName), node => {
        if (strategy.isTaggedTemplate(node)) {
            const template = strategy.getTaggedTemplateTemplate(node);
            visitedTemplates.push(template);
            literals.push({
                tag: strategy.getTagText(node),
                parts: strategy.getTemplateParts(template)
            });
        }
        else if (strategy.isTemplate(node) && !visitedTemplates.includes(node)) {
            literals.push({
                parts: strategy.getTemplateParts(node)
            });
        }
    });
    return literals;
}
exports.parseLiterals = parseLiterals;
//# sourceMappingURL=parseLiterals.js.map