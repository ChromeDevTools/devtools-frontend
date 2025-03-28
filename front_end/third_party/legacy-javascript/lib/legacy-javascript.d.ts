interface Pattern {
    name: string;
    expression: string;
    estimateBytes?: (content: string) => number;
}

interface PatternMatchResult {
    name: string;
    line: number;
    column: number;
}

interface Result {
    matches: PatternMatchResult[];
    estimatedByteSavings: number;
}

export function detectLegacyJavaScript(content: string, map: any): Result;
