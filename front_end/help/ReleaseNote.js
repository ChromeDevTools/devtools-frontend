// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Help.ReleaseNoteView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('help/releaseNote.css');
    var releaseNoteElement = this._createReleaseNoteElement(Help.latestReleaseNote());
    this.contentElement.appendChild(releaseNoteElement);
  }

  /**
   * @param {!Help.ReleaseNote} releaseNote
   * @return {!Element}
   */
  _createReleaseNoteElement(releaseNote) {
    var container = createElementWithClass('div', 'release-note-container');
    var textContainer = container.createChild('div', 'release-note-text-container');
    textContainer.createChild('div', 'release-note-header').textContent =
        Common.UIString('New in DevTools %d', releaseNote.version);
    var highlightContainer = textContainer.createChild('ul', 'release-note-highlight-container');
    for (var highlight of releaseNote.highlights) {
      var className = highlight.featured ? 'release-note-featured-link' : 'release-note-link';
      var highlightLink = UI.createExternalLink(highlight.link, highlight.text, className);
      highlightContainer.createChild('li').appendChild(highlightLink);
    }

    var viewMoreButton = UI.createTextButton(Common.UIString('And more...'), event => {
      event.consume(true);
      InspectorFrontendHost.openInNewTab(releaseNote.link);
    });
    textContainer.appendChild(viewMoreButton);

    var closeButton = UI.createTextButton(Common.UIString('Dismiss'), event => {
      event.consume(true);
      UI.inspectorView.closeDrawerTab(Help._releaseNoteViewId, true);
    }, 'close-release-note');
    textContainer.appendChild(closeButton);

    var imageLink = UI.createExternalLink(releaseNote.link, ' ', 'release-note-image-container');
    container.appendChild(imageLink);
    var image = imageLink.createChild('img', 'release-note-image');
    image.src = releaseNote.image.src;
    image.addEventListener('mouseover', e => container.classList.add('image-hover'));
    image.addEventListener('mouseout', e => container.classList.remove('image-hover'));
    return container;
  }
};
