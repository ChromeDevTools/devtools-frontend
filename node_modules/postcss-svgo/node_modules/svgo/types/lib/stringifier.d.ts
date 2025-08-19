export function stringifySvg(data: import("./types.js").XastRoot, userOptions?: import("./types.js").StringifyOptions | undefined): string;
export type Options = Required<import("./types.js").StringifyOptions>;
export type State = {
    indent: string;
    textContext: import("./types.js").XastElement | null;
    indentLevel: number;
};
