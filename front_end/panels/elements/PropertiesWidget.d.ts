import '../../ui/legacy/legacy.js';
import * as UI from '../../ui/legacy/legacy.js';
interface PropertiesWidgetInput {
    onFilterChanged: (e: CustomEvent<string>) => void;
    treeOutlineElement: HTMLElement;
    displayNoMatchingPropertyMessage: boolean;
}
type View = (input: PropertiesWidgetInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PropertiesWidget extends UI.Widget.VBox {
    #private;
    private node;
    private readonly showAllPropertiesSetting;
    private filterRegex;
    private readonly treeOutline;
    private lastRequestedNode?;
    constructor(view?: View);
    private onFilterChanged;
    private filterAndScheduleUpdate;
    private internalFilterProperties;
    private setNode;
    performUpdate(): Promise<void>;
    private onNodeChange;
}
export {};
