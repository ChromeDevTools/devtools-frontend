## Expected Findings for `sources-popup-not-displayed`

A high-quality response to "nothing happens when I click on share release notes, there should be a popup appear" will include:
- Identifies `handleOpenShareModal()` in `pages/projects/release-checklist.js` (`ReleaseChecklistPage`, wired to `#open-share-popup-btn`) and `openShareModalDialog(releaseRecord, recipientScope)` in `/assets/projects/release-share-modal.js` (`window.CobaltReleaseShare.openShareModalDialog`) and `pages/projects/release-checklist.js`.
- Explains that `openShareModalDialog` checks `if (releaseRecord.approvalStage !== 'FINALIZED_GA')` and returns `{ visible: false, reason: 'stage-pending' }`.
- Explains that `INITIAL_RELEASE_RECORD.approvalStage` is set to `'RC_VERIFIED'`, so `dialogResult.visible` is `false` and `setIsSharePopupOpen(true)` is never called.
