import { TextSpan } from "typescript";
import { AnalysisStats } from "./diagnostic-formatter.js";
export declare function generalReport(stats: AnalysisStats): string;
export declare function relativeFileName(fileName: string): string;
export declare function markText(text: string, range: TextSpan, colorFunction?: (str: string) => string): string;
export declare function textPad(str: string, { width, fill, dir }: {
    width: number;
    fill?: string;
    dir?: "left" | "right";
}): string;
//# sourceMappingURL=util.d.ts.map