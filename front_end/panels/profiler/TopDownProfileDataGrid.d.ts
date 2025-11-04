import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import type * as UI from '../../ui/legacy/legacy.js';
import { type Formatter, ProfileDataGridNode, ProfileDataGridTree } from './ProfileDataGrid.js';
export declare class TopDownProfileDataGridNode extends ProfileDataGridNode {
    remainingChildren: CPUProfile.ProfileTreeModel.ProfileNode[];
    constructor(profileNode: CPUProfile.ProfileTreeModel.ProfileNode, owningTree: TopDownProfileDataGridTree);
    static sharedPopulate(container: TopDownProfileDataGridTree | TopDownProfileDataGridNode): void;
    static excludeRecursively(container: TopDownProfileDataGridTree | TopDownProfileDataGridNode, aCallUID: string): void;
    populateChildren(): void;
}
export declare class TopDownProfileDataGridTree extends ProfileDataGridTree {
    remainingChildren: CPUProfile.ProfileTreeModel.ProfileNode[];
    constructor(formatter: Formatter, searchableView: UI.SearchableView.SearchableView, rootProfileNode: CPUProfile.ProfileTreeModel.ProfileNode, total: number);
    focus(profileDataGridNode: ProfileDataGridNode): void;
    exclude(profileDataGridNode: ProfileDataGridNode): void;
    restore(): void;
    populateChildren(): void;
}
