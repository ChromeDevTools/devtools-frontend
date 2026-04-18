import '../../ui/legacy/legacy.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
interface PropertiesWidgetInput {
    onFilterChanged: (e: CustomEvent<string>) => void;
    onRegexToggled: () => void;
    isRegex: boolean;
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree | null;
    allChildrenFiltered: boolean;
}
type View = (input: PropertiesWidgetInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PropertiesWidget extends UI.Widget.VBox {
    #private;
    private readonly showAllPropertiesSetting;
    private filterRegex;
    constructor(view?: View);
    private onFilterChanged;
    private onRegexToggled;
    private setNode;
    performUpdate(): Promise<void>;
    private onNodeChange;
}
export {};
