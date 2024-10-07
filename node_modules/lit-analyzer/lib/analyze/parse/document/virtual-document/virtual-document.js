"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textPartsToRanges = void 0;
function textPartsToRanges(parts) {
    var offset = 0;
    return parts
        .map(function (p) {
        if (typeof p === "string") {
            var startOffset = offset;
            offset += p.length;
            return {
                start: startOffset,
                end: offset
            };
        }
        else {
            offset += p.getText().length + 3;
        }
        return;
    })
        .filter(function (r) { return r != null; });
}
exports.textPartsToRanges = textPartsToRanges;
