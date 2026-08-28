export declare class SecurityOrigin {
    #private;
    private constructor();
    static create(urlOrigin: string): SecurityOrigin;
    static createUniqueOpaque(): SecurityOrigin;
    isSameOriginWith(other: SecurityOrigin): boolean;
    isOpaque(): boolean;
    siteId(): string;
}
