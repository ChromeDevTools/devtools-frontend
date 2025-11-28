import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { Issue, IssueCategory, IssueKind } from './Issue.js';
import { type MarkdownIssueDescription } from './MarkdownIssueDescription.js';
export declare class GenericIssue extends Issue<Protocol.Audits.GenericIssueDetails> {
    constructor(issueDetails: Protocol.Audits.GenericIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel | null, issueId?: Protocol.Audits.IssueId);
    requests(): Iterable<Protocol.Audits.AffectedRequest>;
    getCategory(): IssueCategory;
    primaryKey(): string;
    getDescription(): MarkdownIssueDescription | null;
    getKind(): IssueKind;
    static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel | null, inspectorIssue: Protocol.Audits.InspectorIssue): GenericIssue[];
}
export declare const genericFormLabelForNameError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormInputWithNoLabelError: {
    file: string;
    links: never[];
};
export declare const genericFormAutocompleteAttributeEmptyError: {
    file: string;
    links: never[];
};
export declare const genericFormDuplicateIdForInputError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormAriaLabelledByToNonExistingIdError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormEmptyIdAndNameAttributesForInputError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormInputAssignedAutocompleteValueToIdOrNameAttributeError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormInputHasWrongButWellIntendedAutocompleteValue: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormLabelForMatchesNonExistingIdError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericFormLabelHasNeitherForNorNestedInputError: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericResponseWasBlockedbyORB: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
export declare const genericNavigationEntryMarkedSkippable: {
    file: string;
    links: {
        link: string;
        linkTitle: () => import("../../core/platform/UIString.js").LocalizedString;
    }[];
};
