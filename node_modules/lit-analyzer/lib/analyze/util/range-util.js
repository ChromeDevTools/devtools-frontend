"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intersects = exports.sfRangeToDocumentRange = exports.documentRangeToSFRange = exports.rangeFromNode = exports.rangeFromHtmlNode = exports.rangeFromHtmlNodeAttr = exports.makeDocumentRange = exports.makeSourceFileRange = void 0;
function makeSourceFileRange(range) {
    return range;
}
exports.makeSourceFileRange = makeSourceFileRange;
function makeDocumentRange(range) {
    return range;
}
exports.makeDocumentRange = makeDocumentRange;
function rangeFromHtmlNodeAttr(htmlAttr) {
    return documentRangeToSFRange(htmlAttr.document, htmlAttr.location.name);
    //return { document: htmlAttr.document, ...htmlAttr.location.name };
}
exports.rangeFromHtmlNodeAttr = rangeFromHtmlNodeAttr;
function rangeFromHtmlNode(htmlNode) {
    return documentRangeToSFRange(htmlNode.document, htmlNode.location.name);
    //return { document: htmlNode.document, ...htmlNode.location.name };
}
exports.rangeFromHtmlNode = rangeFromHtmlNode;
function rangeFromNode(node) {
    //return { file: node.getSourceFile(), start: node.getStart(), end: node.getEnd() };
    return makeSourceFileRange({ start: node.getStart(), end: node.getEnd() });
}
exports.rangeFromNode = rangeFromNode;
function documentRangeToSFRange(document, range) {
    return makeSourceFileRange({
        start: document.virtualDocument.documentOffsetToSFPosition(range.start),
        end: document.virtualDocument.documentOffsetToSFPosition(range.end)
    });
}
exports.documentRangeToSFRange = documentRangeToSFRange;
function sfRangeToDocumentRange(document, range) {
    return makeDocumentRange({
        start: document.virtualDocument.sfPositionToDocumentOffset(range.start),
        end: document.virtualDocument.sfPositionToDocumentOffset(range.end)
    });
}
exports.sfRangeToDocumentRange = sfRangeToDocumentRange;
/**
 * Returns if a position is within start and end.
 * @param position
 * @param start
 * @param end
 */
//export function intersects(position: SourceFilePosition | SourceFileRange, { start, end }: SourceFileRange): boolean;
//export function intersects(position: DocumentOffset | DocumentRange, { start, end }: DocumentRange): boolean;
function intersects(position, _a) {
    var start = _a.start, end = _a.end;
    if (typeof position === "number") {
        return start <= position && position <= end;
    }
    else {
        return start <= position.start && position.end <= end;
    }
}
exports.intersects = intersects;
