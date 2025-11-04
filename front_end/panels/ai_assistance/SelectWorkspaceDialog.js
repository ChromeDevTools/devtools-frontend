// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import selectWorkspaceDialogStyles from './selectWorkspaceDialog.css.js';
/*
* Strings that don't need to be translated at this time.
*/
const UIStringsNotTranslate = {
    /**
     * @description Heading of dialog box which asks user to select a workspace folder.
     */
    selectFolder: 'Select folder',
    /**
     * @description Heading of dialog box which asks user to select a workspace folder for a11y clients.
     */
    selectFolderAccessibleLabel: 'Select a folder to apply changes',
    /**
     * @description Button text for canceling workspace selection.
     */
    cancel: 'Cancel',
    /**
     * @description Button text for confirming the selected workspace folder.
     */
    select: 'Select',
    /**
     * @description Button text for adding a workspace folder.
     */
    addFolder: 'Add folder',
    /**
     * @description Explanation for selecting the correct workspace folder.
     */
    selectProjectRoot: 'Source code from the selected folder is sent to Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Explanation for selecting the correct workspace folder when enterprise logging is off.
     */
    selectProjectRootNoLogging: 'Source code from the selected folder is sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
};
const lockedString = i18n.i18n.lockedString;
export const SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW = (input, _output, target) => {
    const hasFolders = input.folders.length > 0;
    // clang-format off
    render(html `
      <style>${selectWorkspaceDialogStyles}</style>
      <h2 class="dialog-header">${lockedString(UIStringsNotTranslate.selectFolder)}</h2>
      <div class="main-content">
        <div class="select-project-root">${input.selectProjectRootText}</div>
        ${input.showAutomaticWorkspaceNudge ? html `
          <!-- Hardcoding, because there is no 'getFormatLocalizedString' equivalent for 'lockedString' -->
          <div>
            Tip: provide a
            <x-link
              class="devtools-link"
              href="https://goo.gle/devtools-automatic-workspace-folders"
              jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context('automatic-workspaces-documentation')}
            >com.chrome.devtools.json</x-link>
            file to automatically connect your project to DevTools.
          </div>
        ` : nothing}
      </div>
      ${hasFolders ? html `
        <ul role="listbox" aria-label=${lockedString(UIStringsNotTranslate.selectFolder)}
          aria-activedescendant=${input.folders.length > 0 ? `option-${input.selectedIndex}` : ''}>
          ${input.folders.map((folder, index) => {
        const optionId = `option-${index}`;
        return html `
              <li
                id=${optionId}
                @mousedown=${() => input.onProjectSelected(index)}
                @keydown=${input.onListItemKeyDown}
                class=${index === input.selectedIndex ? 'selected' : ''}
                aria-selected=${index === input.selectedIndex ? 'true' : 'false'}
                title=${folder.path}
                role="option"
                tabindex=${index === input.selectedIndex ? '0' : '-1'}
              >
                <devtools-icon class="folder-icon" name="folder"></devtools-icon>
                <span class="ellipsis">${folder.name}</span>
              </li>`;
    })}
        </ul>
      ` : nothing}
      <div class="buttons">
        <devtools-button
          title=${lockedString(UIStringsNotTranslate.cancel)}
          aria-label="Cancel"
          .jslogContext=${'cancel'}
          @click=${input.onCancelButtonClick}
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}>${lockedString(UIStringsNotTranslate.cancel)}</devtools-button>
        <devtools-button
          class="add-folder-button"
          title=${lockedString(UIStringsNotTranslate.addFolder)}
          aria-label="Add folder"
          .iconName=${'plus'}
          .jslogContext=${'add-folder'}
          @click=${input.onAddFolderButtonClick}
          .variant=${hasFolders ? "tonal" /* Buttons.Button.Variant.TONAL */ : "primary" /* Buttons.Button.Variant.PRIMARY */}>${lockedString(UIStringsNotTranslate.addFolder)}</devtools-button>
        ${hasFolders ? html `
          <devtools-button
            title=${lockedString(UIStringsNotTranslate.select)}
            aria-label="Select"
            @click=${input.onSelectButtonClick}
            .jslogContext=${'select'}
            .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}>${lockedString(UIStringsNotTranslate.select)}</devtools-button>
        ` : nothing}
      </div>
    `, target);
    // clang-format on
};
export class SelectWorkspaceDialog extends UI.Widget.VBox {
    #view;
    #workspace = Workspace.Workspace.WorkspaceImpl.instance();
    #selectedIndex = 0;
    #onProjectSelected;
    #dialog;
    #automaticFileSystemManager = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
    #folders = [];
    constructor(options, view) {
        super();
        this.#onProjectSelected = options.onProjectSelected;
        this.#dialog = options.dialog;
        this.#updateProjectsAndFolders();
        if (options.currentProject) {
            this.#selectedIndex = Math.max(0, this.#folders.findIndex(folder => folder.project === options.currentProject));
        }
        this.#view = view ?? SELECT_WORKSPACE_DIALOG_DEFAULT_VIEW;
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.contentElement?.querySelector('.selected')?.focus();
        });
    }
    wasShown() {
        super.wasShown();
        this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
        this.#workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
    }
    willHide() {
        super.willHide();
        this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectAdded, this.#onProjectAdded, this);
        this.#workspace.removeEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#onProjectRemoved, this);
    }
    #onListItemKeyDown(event) {
        switch (event.key) {
            case 'ArrowDown': {
                event.preventDefault();
                this.#selectedIndex = Math.min(this.#selectedIndex + 1, this.#folders.length - 1);
                const targetItem = this.contentElement.querySelectorAll('li')[this.#selectedIndex];
                targetItem?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                targetItem?.focus({ preventScroll: true });
                this.requestUpdate();
                break;
            }
            case 'ArrowUp': {
                event.preventDefault();
                this.#selectedIndex = Math.max(this.#selectedIndex - 1, 0);
                const targetItem = this.contentElement.querySelectorAll('li')[this.#selectedIndex];
                targetItem?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                targetItem?.focus({ preventScroll: true });
                this.requestUpdate();
                break;
            }
            case 'Enter':
                event.preventDefault();
                this.#onSelectButtonClick();
                break;
        }
    }
    #onSelectButtonClick() {
        const selectedFolder = this.#folders[this.#selectedIndex];
        if (selectedFolder.project) {
            this.#dialog.hide();
            this.#onProjectSelected(selectedFolder.project);
        }
        else {
            void this.#connectToAutomaticFilesystem();
        }
    }
    performUpdate() {
        const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
            Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
        const viewInput = {
            folders: this.#folders,
            selectedIndex: this.#selectedIndex,
            selectProjectRootText: noLogging ? lockedString(UIStringsNotTranslate.selectProjectRootNoLogging) :
                lockedString(UIStringsNotTranslate.selectProjectRoot),
            showAutomaticWorkspaceNudge: this.#automaticFileSystemManager.automaticFileSystem === null &&
                this.#automaticFileSystemManager.availability === 'available',
            onProjectSelected: (index) => {
                this.#selectedIndex = index;
                this.requestUpdate();
            },
            onSelectButtonClick: this.#onSelectButtonClick.bind(this),
            onCancelButtonClick: () => {
                this.#dialog.hide();
            },
            onAddFolderButtonClick: () => {
                void this.#addFileSystem();
            },
            onListItemKeyDown: this.#onListItemKeyDown.bind(this),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    async #addFileSystem() {
        await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
        this.contentElement?.querySelector('[aria-label="Select"]')?.shadowRoot?.querySelector('button')?.focus();
    }
    async #connectToAutomaticFilesystem() {
        const success = await this.#automaticFileSystemManager.connectAutomaticFileSystem(/* addIfMissing= */ true);
        // In the success-case, we will receive a 'ProjectAdded' event and handle it in '#onProjectAdded'.
        // Only the failure-case is handled here.
        if (!success) {
            this.#dialog.hide();
        }
    }
    #updateProjectsAndFolders() {
        this.#folders = [];
        const automaticFileSystem = this.#automaticFileSystemManager.automaticFileSystem;
        // The automatic workspace folder is always added in first position.
        if (automaticFileSystem) {
            this.#folders.push({
                name: Common.ParsedURL.ParsedURL.extractName(automaticFileSystem.root),
                path: automaticFileSystem.root,
                automaticFileSystem,
            });
        }
        const projects = this.#workspace.projectsForType(Workspace.Workspace.projectTypes.FileSystem)
            .filter(project => project instanceof Persistence.FileSystemWorkspaceBinding.FileSystem &&
            project.fileSystem().type() ===
                Persistence.PlatformFileSystem.PlatformFileSystemType.WORKSPACE_PROJECT);
        for (const project of projects) {
            // Deduplication prevents a connected automatic workspace folder from being listed twice.
            if (automaticFileSystem && project === this.#workspace.projectForFileSystemRoot(automaticFileSystem.root)) {
                this.#folders[0].project = project;
                continue;
            }
            this.#folders.push({
                name: Common.ParsedURL.ParsedURL.encodedPathToRawPathString(project.displayName()),
                path: Common.ParsedURL.ParsedURL.urlToRawPathString(project.id(), Host.Platform.isWin()),
                project,
            });
        }
    }
    #onProjectAdded(event) {
        const addedProject = event.data;
        // After connecting to an automatic workspace folder, wait for the 'projectAdded' event,
        // then close the dialog and continue with the selected project.
        const automaticFileSystem = this.#automaticFileSystemManager.automaticFileSystem;
        if (automaticFileSystem && addedProject === this.#workspace.projectForFileSystemRoot(automaticFileSystem.root)) {
            this.#dialog.hide();
            this.#onProjectSelected(addedProject);
            return;
        }
        this.#updateProjectsAndFolders();
        const projectIndex = this.#folders.findIndex(folder => folder.project === addedProject);
        if (projectIndex !== -1) {
            this.#selectedIndex = projectIndex;
        }
        this.requestUpdate();
        void this.updateComplete.then(() => {
            this.contentElement?.querySelector('.selected')?.scrollIntoView();
        });
    }
    #onProjectRemoved() {
        const selectedProject = (this.#selectedIndex >= 0 && this.#selectedIndex < this.#folders.length) ?
            this.#folders[this.#selectedIndex].project :
            null;
        this.#updateProjectsAndFolders();
        if (selectedProject) {
            const projectIndex = this.#folders.findIndex(folder => folder.project === selectedProject);
            // If the previously selected project still exists, select it again.
            // If the previously selected project has been removed, select the project which is now in its
            // position. If the previously selected and now removed project was in last position, select
            // the project which is now in last position.
            this.#selectedIndex =
                projectIndex === -1 ? Math.min(this.#folders.length - 1, this.#selectedIndex) : projectIndex;
        }
        else {
            this.#selectedIndex = 0;
        }
        this.requestUpdate();
    }
    static show(onProjectSelected, currentProject) {
        const dialog = new UI.Dialog.Dialog('select-workspace');
        dialog.setAriaLabel(UIStringsNotTranslate.selectFolderAccessibleLabel);
        dialog.setMaxContentSize(new Geometry.Size(384, 340));
        dialog.setSizeBehavior("SetExactWidthMaxHeight" /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */);
        dialog.setDimmed(true);
        new SelectWorkspaceDialog({ dialog, onProjectSelected, currentProject }).show(dialog.contentElement);
        dialog.show();
    }
}
//# sourceMappingURL=SelectWorkspaceDialog.js.map