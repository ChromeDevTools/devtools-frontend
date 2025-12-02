import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export declare class PersistenceUtils {
    static tooltipForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): string;
    static iconForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): LitTemplate | null;
}
export declare class LinkDecorator extends Common.ObjectWrapper.ObjectWrapper<Components.Linkifier.LinkDecorator.EventTypes> implements Components.Linkifier.LinkDecorator {
    constructor(persistence: Persistence.Persistence.PersistenceImpl);
    private bindingChanged;
    linkIcon(uiSourceCode: Workspace.UISourceCode.UISourceCode): LitTemplate | null;
}
