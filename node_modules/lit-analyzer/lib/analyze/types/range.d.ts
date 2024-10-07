export interface Range {
    start: number;
    end: number;
}
export type DocumentOffset = number;
export type SourceFilePosition = number;
export type DocumentRange = {
    start: DocumentOffset;
    end: DocumentOffset;
} & {
    _brand: "document";
};
export type SourceFileRange = {
    start: SourceFilePosition;
    end: SourceFilePosition;
} & {
    _brand: "sourcefile";
};
//# sourceMappingURL=range.d.ts.map