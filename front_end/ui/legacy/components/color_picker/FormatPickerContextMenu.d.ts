import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';
type OnSelectFn = (color: Common.Color.Color) => void;
export declare class FormatPickerContextMenu {
    #private;
    constructor(color: Common.Color.Color);
    show(e: Event, onSelect: OnSelectFn): Promise<void>;
    addColorToSection(newColor: Common.Color.Color, section: UI.ContextMenu.Section, onSelect: OnSelectFn): void;
}
export {};
