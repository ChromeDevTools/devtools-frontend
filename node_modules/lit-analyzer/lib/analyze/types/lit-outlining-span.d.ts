import { SourceFileRange } from "./range.js";
export declare enum LitOutliningSpanKind {
    Comment = "comment",
    Region = "region",
    Code = "code",
    Imports = "imports"
}
export interface LitOutliningSpan {
    location: SourceFileRange;
    bannerText: string;
    autoCollapse?: boolean;
    kind: LitOutliningSpanKind;
}
//# sourceMappingURL=lit-outlining-span.d.ts.map