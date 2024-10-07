"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSourceLocation = void 0;
function getSourceLocation(node) {
    var nodeWithLocation = node;
    return nodeWithLocation.sourceCodeLocation || nodeWithLocation.__location;
}
exports.getSourceLocation = getSourceLocation;
