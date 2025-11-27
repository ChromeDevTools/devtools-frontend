import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class FrameworkIgnoreListSettingsTab extends UI.Widget.VBox implements UI.ListWidget.Delegate<Common.Settings.RegExpSettingItem> {
    private readonly list;
    private readonly setting;
    private editor?;
    constructor();
    wasShown(): void;
    private settingUpdated;
    private addButtonClicked;
    private createSettingGroup;
    renderItem(item: Common.Settings.RegExpSettingItem, editable: boolean): Element;
    removeItemRequested(_item: Common.Settings.RegExpSettingItem, index: number): void;
    commitEdit(item: Common.Settings.RegExpSettingItem, editor: UI.ListWidget.Editor<Common.Settings.RegExpSettingItem>, isNew: boolean): void;
    beginEdit(item: Common.Settings.RegExpSettingItem): UI.ListWidget.Editor<Common.Settings.RegExpSettingItem>;
    private createEditor;
}
