import * as UI from '../../ui/legacy/legacy.js';
export declare class RenderingOptionsView extends UI.Widget.VBox {
    #private;
    constructor();
}
export declare class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
