import { type GridLabelState } from './css_grid_label_helpers.js';
/** TODO(alexrudenko): Grid label unit tests depend on this style so it cannot be extracted yet. **/
export declare const gridStyle = "\n/* Grid row and column labels */\n.grid-label-content {\n  position: absolute;\n  -webkit-user-select: none;\n  padding: 2px;\n  font-family: Menlo, monospace;\n  font-size: 10px;\n  min-width: 17px;\n  min-height: 15px;\n  border-radius: 2px;\n  box-sizing: border-box;\n  z-index: 1;\n  background-clip: padding-box;\n  pointer-events: none;\n  text-align: center;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n\n.grid-label-content[data-direction=row] {\n  background-color: var(--row-label-color, #1A73E8);\n  color: var(--row-label-text-color, #121212);\n}\n\n.grid-label-content[data-direction=column] {\n  background-color: var(--column-label-color, #1A73E8);\n  color: var(--column-label-text-color,#121212);\n}\n\n.line-names ul,\n.line-names .line-name {\n  margin: 0;\n  padding: 0;\n  list-style: none;\n}\n\n.line-names .line-name {\n  max-width: 100px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.line-names .grid-label-content,\n.line-numbers .grid-label-content,\n.track-sizes .grid-label-content {\n  border: 1px solid white;\n  --inner-corner-avoid-distance: 15px;\n}\n\n.grid-label-content.top-left.inner-shared-corner,\n.grid-label-content.top-right.inner-shared-corner {\n  transform: translateY(var(--inner-corner-avoid-distance));\n}\n\n.grid-label-content.bottom-left.inner-shared-corner,\n.grid-label-content.bottom-right.inner-shared-corner {\n  transform: translateY(calc(var(--inner-corner-avoid-distance) * -1));\n}\n\n.grid-label-content.left-top.inner-shared-corner,\n.grid-label-content.left-bottom.inner-shared-corner {\n  transform: translateX(var(--inner-corner-avoid-distance));\n}\n\n.grid-label-content.right-top.inner-shared-corner,\n.grid-label-content.right-bottom.inner-shared-corner {\n  transform: translateX(calc(var(--inner-corner-avoid-distance) * -1));\n}\n\n.line-names .grid-label-content::before,\n.line-numbers .grid-label-content::before,\n.track-sizes .grid-label-content::before {\n  position: absolute;\n  z-index: 1;\n  pointer-events: none;\n  content: \"\";\n  width: 3px;\n  height: 3px;\n  border: 1px solid white;\n  border-width: 0 1px 1px 0;\n}\n\n.line-names .grid-label-content[data-direction=row]::before,\n.line-numbers .grid-label-content[data-direction=row]::before,\n.track-sizes .grid-label-content[data-direction=row]::before {\n  background: var(--row-label-color, #1A73E8);\n}\n\n.line-names .grid-label-content[data-direction=column]::before,\n.line-numbers .grid-label-content[data-direction=column]::before,\n.track-sizes .grid-label-content[data-direction=column]::before {\n  background: var(--column-label-color, #1A73E8);\n}\n\n.grid-label-content.bottom-mid::before {\n  transform: translateY(-1px) rotate(45deg);\n  top: 100%;\n}\n\n.grid-label-content.top-mid::before {\n  transform: translateY(-3px) rotate(-135deg);\n  top: 0%;\n}\n\n.grid-label-content.left-mid::before {\n  transform: translateX(-3px) rotate(135deg);\n  left: 0%\n}\n\n.grid-label-content.right-mid::before {\n  transform: translateX(3px) rotate(-45deg);\n  right: 0%;\n}\n\n.grid-label-content.right-top::before {\n  transform: translateX(3px) translateY(-1px) rotate(-90deg) skewY(30deg);\n  right: 0%;\n  top: 0%;\n}\n\n.grid-label-content.right-bottom::before {\n  transform: translateX(3px) translateY(-3px) skewX(30deg);\n  right: 0%;\n  top: 100%;\n}\n\n.grid-label-content.bottom-right::before {\n  transform:  translateX(1px) translateY(-1px) skewY(30deg);\n  right: 0%;\n  top: 100%;\n}\n\n.grid-label-content.bottom-left::before {\n  transform:  translateX(-1px) translateY(-1px) rotate(90deg) skewX(30deg);\n  left: 0%;\n  top: 100%;\n}\n\n.grid-label-content.left-top::before {\n  transform: translateX(-3px) translateY(-1px) rotate(180deg) skewX(30deg);\n  left: 0%;\n  top: 0%;\n}\n\n.grid-label-content.left-bottom::before {\n  transform: translateX(-3px) translateY(-3px) rotate(90deg) skewY(30deg);\n  left: 0%;\n  top: 100%;\n}\n\n.grid-label-content.top-right::before {\n  transform:  translateX(1px) translateY(-3px) rotate(-90deg) skewX(30deg);\n  right: 0%;\n  top: 0%;\n}\n\n.grid-label-content.top-left::before {\n  transform:  translateX(-1px) translateY(-3px) rotate(180deg) skewY(30deg);\n  left: 0%;\n  top: 0%;\n}\n\n@media (forced-colors: active) {\n  .grid-label-content {\n      border-color: Highlight;\n      background-color: Canvas;\n      color: Text;\n      forced-color-adjust: none;\n  }\n  .grid-label-content::before {\n    background-color: Canvas;\n    border-color: Highlight;\n  }\n}";
export interface GridHighlight {
    gridBorder: Array<string | number>;
    writingMode: string;
    rowGaps: Array<string | number>;
    rotationAngle: number;
    columnGaps: Array<string | number>;
    rows: Array<string | number>;
    columns: Array<string | number>;
    areaNames: Record<string, Array<string | number>>;
    gridHighlightConfig: {
        gridBorderDash: boolean;
        rowLineDash: boolean;
        columnLineDash: boolean;
        showGridExtensionLines: boolean;
        showPositiveLineNumbers: boolean;
        showNegativeLineNumbers: boolean;
        rowLineColor: string;
        columnLineColor: string;
        rowHatchColor: string;
        columnHatchColor: string;
        showLineNames: boolean;
        gridBackgroundColor?: string;
        gridBorderColor?: string;
        rowGapColor?: string;
        columnGapColor?: string;
        areaBorderColor?: string;
    };
}
export declare function drawLayoutGridHighlight(highlight: GridHighlight, context: CanvasRenderingContext2D, deviceScaleFactor: number, canvasWidth: number, canvasHeight: number, emulationScaleFactor: number, labelState: GridLabelState): void;
