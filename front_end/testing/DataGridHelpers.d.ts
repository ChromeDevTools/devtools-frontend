export declare const getFocusableCell: (node: ParentNode) => HTMLTableCellElement;
export declare const getCellByIndexes: (node: ParentNode, indexes: {
    column: number;
    row: number;
}) => HTMLTableCellElement;
export declare const getHeaderCells: (node: ParentNode, options?: {
    onlyVisible: boolean;
    withJslog?: boolean;
}) => HTMLTableCellElement[];
export declare const getAllRows: (node: ParentNode, options?: {
    withJslog?: boolean;
}) => HTMLTableRowElement[];
export declare const assertGridContents: (gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) => Element;
export declare const assertGridWidgetContents: (gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) => Element;
export declare const emulateUserKeyboardNavigation: (shadowRoot: ShadowRoot, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => void;
export declare const getValuesOfAllBodyRows: (node: ParentNode, options?: {
    onlyVisible: boolean;
    withJslog?: boolean;
}) => string[][];
