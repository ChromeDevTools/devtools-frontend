import '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class PlayerMessagesView extends UI.Widget.VBox {
    #private;
    private readonly headerPanel;
    private readonly bodyPanel;
    private messageLevelSelector?;
    constructor();
    private createDropdown;
    private createFilterInput;
    performUpdate(): void;
    regenerateMessageDisplayCss(hiddenLevels: string[]): void;
    private filterByString;
    addMessage(message: Protocol.Media.PlayerMessage): void;
    private renderError;
    addError(error: Protocol.Media.PlayerError): void;
}
