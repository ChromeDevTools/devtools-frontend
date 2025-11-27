import '../../../ui/kit/kit.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare class DevicesSettingsTab extends UI.Widget.VBox implements UI.ListWidget.Delegate<EmulationModel.EmulatedDevices.EmulatedDevice> {
    #private;
    containerElement: HTMLElement;
    private readonly addCustomButton;
    private readonly ariaSuccessMessageElement;
    private muteUpdate;
    private emulatedDevicesList;
    private editor?;
    constructor();
    wasShown(): void;
    private devicesUpdated;
    private muteAndSaveDeviceList;
    private addCustomDevice;
    private toNumericInputValue;
    renderItem(device: EmulationModel.EmulatedDevices.EmulatedDevice, editable: boolean): Element;
    removeItemRequested(item: EmulationModel.EmulatedDevices.EmulatedDevice): void;
    commitEdit(device: EmulationModel.EmulatedDevices.EmulatedDevice, editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>, isNew: boolean): void;
    beginEdit(device: EmulationModel.EmulatedDevices.EmulatedDevice): UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>;
    private createEditor;
}
