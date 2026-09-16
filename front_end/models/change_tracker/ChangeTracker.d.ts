import type * as CommentManager from '../comment_manager/comment_manager.js';
export type ChangeRecord = CommentManager.CommentManager.ChangeRecord;
export declare const MAX_RECORDS = 1000;
export declare class ChangeTracker {
    #private;
    constructor(commentManager: CommentManager.CommentManager.CommentManager, maxRecords?: number);
    get maxRecords(): number;
    get isTracking(): boolean;
    trackChange(description: string, anchor: CommentManager.CommentManager.CommentAnchorSignature): ChangeRecord | null;
    getChanges(): ChangeRecord[];
    getLastChange(): ChangeRecord | undefined;
    clear(): void;
}
