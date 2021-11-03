// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
process.env.ESLINT_SKIP_GRD_UPDATE = 1;

const rule = require('../lib/migrate_create_shadow_root_with_styles.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const MIGRATION_ERROR_MESSAGE = 'Import CSS file instead of passing a string into createShadowRootWithStyles';
const MANUALLY_MIGRATE_ERROR_ESSAGE =
    'Please manually migrate this file. Got error: Cannot read properties of undefined (reading \'properties\')';

ruleTester.run('check_migrate_RegisterRequiredCSS', rule, {
  valid: [
    {
      code: `
      import smallBubbleStyles from './smallBubbleStyles.css.js';
      export class Component extends UI.Widget.Widget {
        constructor(){
          const shadow = createShadowRootWithCoreStyles(this,
            {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      import smallBubbleStyles from './smallBubbleStyles.css.js';
      export class Component extends UI.Widget.Widget {
        constructor(){
          const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
            {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = createShadowRootWithCoreStyles(this,
    {delegatesFocus: undefined});
  }
}`,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {delegatesFocus: undefined});
  }
}`,
      filename: 'front_end/components/test.ts',
    },

  ],
  invalid: [
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = createShadowRootWithCoreStyles(this,
      {cssFile: 'components/smallBubble.css', delegatesFocus: undefined});
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = createShadowRootWithCoreStyles(this,
      {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
      {cssFile: 'components/smallBubble.css', delegatesFocus: undefined});
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
      {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
      {cssFile: 'ui/smallBubble.css', delegatesFocus: undefined});
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from '../ui/smallBubble.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
      {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
      {cssFile: 'ui/legacy/smallBubble.css', delegatesFocus: undefined});
  }
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from '../ui/legacy/smallBubble.css.js';
export class Component extends UI.Widget.Widget {
  constructor(){
    const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
      {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  }
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = createShadowRootWithCoreStyles(this,
    {cssFile: 'components/smallBubble.css', delegatesFocus: undefined});
  const root = createShadowRootWithCoreStyles(this,
    {cssFile: 'components/test.css', delegatesFocus: undefined});
}
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}, {message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = createShadowRootWithCoreStyles(this,
    {cssFile: 'components/test.css', delegatesFocus: undefined});
}
}`
    },
    {
      code: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = createShadowRootWithCoreStyles(this,
    {cssFile: 'components/test.css', delegatesFocus: undefined});
}
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = createShadowRootWithCoreStyles(this,
    {cssFile: [testStyles], delegatesFocus: undefined});
}
}`
    },
    {
      code: `export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: 'components/smallBubble.css', delegatesFocus: undefined});
  const root = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: 'components/test.css', delegatesFocus: undefined});
}
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}, {message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: 'components/test.css', delegatesFocus: undefined});
}
}`
    },
    {
      code: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: 'components/test.css', delegatesFocus: undefined});
}
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import testStyles from './test.css.js';
import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [testStyles], delegatesFocus: undefined});
}
}`
    },
    {
      code: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: 'components/smallBubble.css', delegatesFocus: undefined});
}
}`,
      filename: 'front_end/components/test.ts',
      errors: [{message: MIGRATION_ERROR_MESSAGE}],
      output: `import smallBubbleStyles from './smallBubble.css.js';
export class Component extends UI.Widget.Widget {
constructor(){
  const shadow = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
  const root = UI.Utils.createShadowRootWithCoreStyles(this,
    {cssFile: [smallBubbleStyles], delegatesFocus: undefined});
}
}`
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        constructor(){
          const shadow = createShadowRootWithCoreStyles(this);
        }
      }
      `,
      filename: 'front_end/components/test.ts',
      errors: [{message: MANUALLY_MIGRATE_ERROR_ESSAGE}],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        constructor(){
          const shadow = UI.Utils.createShadowRootWithCoreStyles(this);
        }
      }
      `,
      filename: 'front_end/components/test.ts',
      errors: [{message: MANUALLY_MIGRATE_ERROR_ESSAGE}],
    },
  ]
});
