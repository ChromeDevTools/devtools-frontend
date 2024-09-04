// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as ElementsComponents from './components.js';

describeWithEnvironment('CSSPropertyDocsView', () => {
  it('renders every section', async () => {
    const cssProperty = {
      name: 'display',
      description:
          'In combination with \'float\' and \'position\', determines the type of box or boxes that are generated for an element.',
      syntax:
          '[ <display-outside> || <display-inside> ] | <display-listitem> | <display-internal> | <display-box> | <display-legacy>',
      references: [
        {
          name: 'MDN Reference',
          url: 'https://developer.mozilla.org/docs/Web/CSS/display',
        },
      ],
    };

    const popupComponent = new ElementsComponents.CSSPropertyDocsView.CSSPropertyDocsView(cssProperty);
    renderElementIntoDOM(popupComponent);

    assert.isNotNull(popupComponent.shadowRoot!.querySelector('#description'));
    assert.isNotNull(popupComponent.shadowRoot!.querySelector('#learn-more'));
  });
});
