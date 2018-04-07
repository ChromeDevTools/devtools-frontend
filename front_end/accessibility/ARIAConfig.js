// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Accessibility.ARIAMetadata._config = {
  'attributes': {
    'aria-activedescendant': {'type': 'IDREF'},
    'aria-atomic': {'default': 'false', 'type': 'boolean'},
    'aria-autocomplete': {'default': 'none', 'enum': ['inline', 'list', 'both', 'none'], 'type': 'token'},
    'aria-busy': {'default': 'false', 'type': 'boolean'},
    'aria-checked': {'default': 'undefined', 'enum': ['true', 'false', 'mixed', 'undefined'], 'type': 'token'},
    'aria-colcount': {'type': 'integer'},
    'aria-colindex': {'type': 'integer'},
    'aria-colspan': {'type': 'integer'},
    'aria-controls': {'type': 'IDREF_list'},
    'aria-current':
        {'default': 'false', 'enum': ['page', 'step', 'location', 'date', 'time', 'true', 'false'], 'type': 'token'},
    'aria-describedby': {'type': 'IDREF_list'},
    'aria-details': {'type': 'IDREF'},
    'aria-disabled': {'default': 'false', 'type': 'boolean'},
    'aria-dropeffect':
        {'default': 'none', 'enum': ['copy', 'move', 'link', 'execute', 'popup', 'none'], 'type': 'token_list'},
    'aria-errormessage': {'type': 'IDREF'},
    'aria-expanded': {'default': 'undefined', 'enum': ['true', 'false', 'undefined'], 'type': 'token'},
    'aria-flowto': {'type': 'IDREF_list'},
    'aria-grabbed': {'default': 'undefined', 'enum': ['true', 'false', 'undefined'], 'type': 'token'},
    'aria-haspopup':
        {'default': 'false', 'enum': ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog'], 'type': 'token'},
    'aria-hidden': {'default': 'undefined', 'enum': ['true', 'false', 'undefined'], 'type': 'token'},
    'aria-invalid': {'default': 'false', 'enum': ['grammar', 'false', 'spelling', 'true'], 'type': 'token'},
    'aria-keyshortcuts': {'type': 'string'},
    'aria-label': {'type': 'string'},
    'aria-labelledby': {'type': 'IDREF_list'},
    'aria-level': {'type': 'integer'},
    'aria-live': {'default': 'off', 'enum': ['off', 'polite', 'assertive'], 'type': 'token'},
    'aria-modal': {'default': 'false', 'type': 'boolean'},
    'aria-multiline': {'default': 'false', 'type': 'boolean'},
    'aria-multiselectable': {'default': 'false', 'type': 'boolean'},
    'aria-orientation': {'default': 'undefined', 'enum': ['horizontal', 'undefined', 'vertical'], 'type': 'token'},
    'aria-owns': {'type': 'IDREF_list'},
    'aria-placeholder': {'type': 'string'},
    'aria-posinset': {'type': 'integer'},
    'aria-pressed': {'default': 'undefined', 'enum': ['true', 'false', 'mixed', 'undefined'], 'type': 'token'},
    'aria-readonly': {'default': 'false', 'type': 'boolean'},
    'aria-relevant':
        {'default': 'additions text', 'enum': ['additions', 'removals', 'text', 'all'], 'type': 'token_list'},
    'aria-required': {'default': 'false', 'type': 'boolean'},
    'aria-roledescription': {'type': 'string'},
    'aria-rowcount': {'type': 'integer'},
    'aria-rowindex': {'type': 'integer'},
    'aria-rowspan': {'type': 'integer'},
    'aria-selected': {'default': 'undefined', 'enum': ['true', 'false', 'undefined'], 'type': 'token'},
    'aria-setsize': {'type': 'integer'},
    'aria-sort': {'default': 'none', 'enum': ['ascending', 'descending', 'none', 'other'], 'type': 'token'},
    'aria-valuemax': {'type': 'decimal'},
    'aria-valuemin': {'type': 'decimal'},
    'aria-valuenow': {'type': 'decimal'},
    'aria-valuetext': {'type': 'string'},
    'tabindex': {'type': 'integer'}
  },
  'roles': {
    'alert': {
      'nameFrom': ['author'],
      'superclasses': ['section'],
      'implicitValues': {'aria-live': 'assertive', 'aria-atomic': 'true'}
    },
    'alertdialog': {'nameFrom': ['author'], 'superclasses': ['alert', 'dialog'], 'nameRequired': true},
    'application': {'nameFrom': ['author'], 'superclasses': ['structure'], 'nameRequired': true},
    'article': {
      'nameFrom': ['author'],
      'superclasses': ['document'],
      'supportedAttributes': ['aria-posinset', 'aria-setsize']
    },
    'banner': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'button': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['command'],
      'supportedAttributes': ['aria-expanded', 'aria-pressed'],
      'nameRequired': true,
      'childrenPresentational': true
    },
    'cell': {
      'namefrom': ['contents', 'author'],
      'scope': 'row',
      'superclasses': ['section'],
      'supportedAttributes': ['aria-colindex', 'aria-colspan', 'aria-rowindex', 'aria-rowspan']
    },
    'checkbox': {
      'nameFrom': ['contents', 'author'],
      'requiredAttributes': ['aria-checked'],
      'superclasses': ['input'],
      'supportedAttributes': ['aria-readonly'],
      'nameRequired': true,
      'implicitValues': {'aria-checked': false}
    },
    'columnheader': {
      'nameFrom': ['contents', 'author'],
      'scope': ['row'],
      'superclasses': ['gridcell', 'sectionhead', 'widget'],
      'supportedAttributes': ['aria-sort'],
      'nameRequired': true
    },
    'combobox': {
      // TODO(aboxhall): Follow up with Nektarios and Aaron regarding role on textbox
      'mustContain': ['textbox'],
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-controls', 'aria-expanded'],
      'superclasses': ['select'],
      'supportedAttributes': ['aria-autocomplete', 'aria-readonly', 'aria-required'],
      'nameRequired': true,
      'implicitValues': {'aria-expanded': 'false', 'aria-haspopup': 'listbox'}
    },
    'command': {'abstract': true, 'nameFrom': ['author'], 'superclasses': ['widget']},
    'complementary': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'composite': {
      'abstract': true,
      'nameFrom': ['author'],
      'superclasses': ['widget'],
      'supportedAttributes': ['aria-activedescendant'],
    },
    'contentinfo': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'definition': {'nameFrom': ['author'], 'superclasses': ['section']},
    'dialog': {'nameFrom': ['author'], 'superclasses': ['window'], 'nameRequired': true},
    'directory': {'nameFrom': ['author'], 'superclasses': ['list']},
    'document': {
      'nameFrom': ['author'],
      'superclasses': ['structure'],
      'supportedAttributes': ['aria-expanded'],
      'nameRequired': false
    },
    'feed': {'nameFrom': ['author'], 'superclasses': ['list'], 'mustContain': ['article'], 'nameRequired': false},
    'figure': {'namefrom': ['author'], 'superclasses': ['section'], 'nameRequired': false},
    'form': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'grid': {
      'nameFrom': ['author'],
      'superclasses': ['composite', 'table'],
      // TODO(aboxhall): Figure out how to express "rowgroup --> row" here.
      'mustContain': ['row'],
      'supportedAttributes': ['aria-level', 'aria-multiselectable', 'aria-readonly'],
      'nameRequired': true
    },
    'gridcell': {
      'nameFrom': ['contents', 'author'],
      'scope': ['row'],
      'superclasses': ['cell', 'widget'],
      'supportedAttributes': ['aria-readonly', 'aria-required', 'aria-selected'],
      'nameRequired': true
    },
    'group': {'nameFrom': ['author'], 'superclasses': ['section'], 'supportedAttributes': ['aria-activedescendant']},
    'heading': {
      'namefrom': ['contents', 'author'],
      'superclasses': ['sectionhead'],
      'supportedAttributes': ['aria-level'],
      'nameRequired': true,
      'implicitValues': {'aria-level': '2'}
    },
    'img': {'nameFrom': ['author'], 'superclasses': ['section'], 'nameRequired': true, 'childrenPresentational': true},
    'input': {'abstract': true, 'nameFrom': ['author'], 'superclasses': ['widget']},
    'landmark': {'abstract': true, 'nameFrom': ['author'], 'superclasses': ['section'], 'nameRequired': false},
    'link': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['command'],
      'supportedAttributes': ['aria-expanded'],
      'nameRequired': true
    },
    'list': {
      // TODO(aboxhall): Figure out how to express "group --> listitem"
      'mustContain': ['listitem'],
      'nameFrom': ['author'],
      'superclasses': ['section'],
      'implicitValues': {'aria-orientation': 'vertical'}
    },
    'listbox': {
      'nameFrom': ['author'],
      'superclasses': ['select'],
      'mustContain': ['option'],
      'supportedAttributes': ['aria-multiselectable', 'aria-readonly', 'aria-required'],
      'nameRequired': true,
      'implicitValues': {'aria-orientation': 'vertical'},
    },
    'listitem': {
      'nameFrom': ['author'],
      'superclasses': ['section'],
      'scope': ['group', 'list'],
      'supportedAttributes': ['aria-level', 'aria-posinset', 'aria-setsize']
    },
    'log': {
      'nameFrom': ['author'],
      'superclasses': ['section'],
      'nameRequired': true,
      'implicitValues': {'aria-live': 'polite'}
    },
    'main': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'marquee': {'nameFrom': ['author'], 'superclasses': ['section'], 'nameRequired': true},
    'math': {
      'nameFrom': ['author'],
      'superclasses': ['section'],
      'nameRequired': true,
      // TODO(aboxhall/aleventhal): this is what the spec says, but seems wrong.
      childrenPresentational: true
    },
    'menu': {
      'mustContain': ['group', 'menuitemradio', 'menuitem', 'menuitemcheckbox', 'menuitemradio'],
      'nameFrom': ['author'],
      'superclasses': ['select'],
      'implicitValues': {'aria-orientation': 'vertical'}
    },
    'menubar': {
      'nameFrom': ['author'],
      'superclasses': ['menu'],
      // TODO(aboxhall): figure out how to express "group --> {menuitem, menuitemradio, menuitemcheckbox}"
      'mustContain': ['menuitem', 'menuitemradio', 'menuitemcheckbox'],
      'implicitValues': {'aria-orientation': 'horizontal'}
    },
    'menuitem': {
      'nameFrom': ['contents', 'author'],
      'scope': ['group', 'menu', 'menubar'],
      'superclasses': ['command'],
      'nameRequired': true
    },
    'menuitemcheckbox': {
      'nameFrom': ['contents', 'author'],
      'scope': ['menu', 'menubar'],
      'superclasses': ['checkbox', 'menuitem'],
      'nameRequired': true,
      'childrenPresentational': true,
      'implicitValues': {'aria-checked': false}
    },
    'menuitemradio': {
      'nameFrom': ['contents', 'author'],
      'scope': ['menu', 'menubar', 'group'],
      'superclasses': ['menuitemcheckbox', 'radio'],
      'nameRequired': true,
      'childrenPresentational': true,
      'implicitValues': {'aria-checked': false}
    },
    'navigation': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'none': {'superclasses': ['structure']},
    'note': {'nameFrom': ['author'], 'superclasses': ['section']},
    'option': {
      'nameFrom': ['contents', 'author'],
      'scope': ['listbox'],
      'superclasses': ['input'],
      'requiredAttributes': ['aria-selected'],
      'supportedAttributes': ['aria-checked', 'aria-posinset', 'aria-setsize'],
      'nameRequired': true,
      'childrenPresentational': true,
      'implicitValues': {'aria-selected': 'false'}
    },
    'presentation': {'superclasses': ['structure']},
    'progressbar':
        {'nameFrom': ['author'], 'superclasses': ['range'], 'nameRequired': true, 'childrenPresentational': true},
    'radio': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['input'],
      'requiredAttributes': ['aria-checked'],
      'supportedAttributes': ['aria-posinset', 'aria-setsize'],
      'nameRequired': true,
      'childrenPresentational': true,
      'implicitValues': {'aria-checked': 'false'}
    },
    'radiogroup': {
      'nameFrom': ['author'],
      'superclasses': ['select'],
      'mustContain': ['radio'],
      'supportedAttributes': ['aria-readonly', 'aria-required'],
      'nameRequired': true
    },
    'range': {
      'abstract': true,
      'nameFrom': ['author'],
      'superclasses': ['widget'],
      'supportedAttributes': ['aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext']
    },
    'region': {'nameFrom': ['author'], 'superclasses': ['landmark'], 'nameRequired': true},
    'roletype': {
      'abstract': true,
      'supportedAttributes': [
        'aria-atomic',   'aria-busy',       'aria-controls',       'aria-current', 'aria-describedby', 'aria-details',
        'aria-disabled', 'aria-dropeffect', 'aria-errormessage',   'aria-flowto',  'aria-grabbed',     'aria-haspopup',
        'aria-hidden',   'aria-invalid',    'aria-keyshortcuts',   'aria-label',   'aria-labelledby',  'aria-live',
        'aria-owns',     'aria-relevant',   'aria-roledescription'
      ]
    },
    'row': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['group', 'widget'],
      'mustContain': ['cell', 'columnheader', 'gridcell', 'rowheader'],
      'scope': ['grid', 'rowgroup', 'table', 'treegrid'],
      // TODO(aboxhall/aleventhal): This is not in the spec yet, but
      // setsize and posinset are included here for treegrid
      // purposes. Issue already filed on spec. Remove this comment
      // when spec updated.
      'supportedAttributes':
          ['aria-colindex', 'aria-level', 'aria-rowindex', 'aria-selected', 'aria-setsize', 'aria-posinset']
    },
    'rowgroup': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['structure'],
      'mustContain': ['row'],
      'scope': ['grid', 'table', 'treegrid'],
    },
    'rowheader': {
      'nameFrom': ['contents', 'author'],
      'scope': ['row'],
      'superclasses': ['cell', 'gridcell', 'sectionhead'],
      'supportedAttributes': ['aria-sort'],
      'nameRequired': true
    },
    'scrollbar': {
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-controls', 'aria-orientation', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
      'superclasses': ['range'],
      'nameRequired': false,
      'childrenPresentational': true,
      'implicitValues': {'aria-orientation': 'vertical', 'aria-valuemin': '0', 'aria-valuemax': '100'}
    },
    'search': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'searchbox': {'nameFrom': ['author'], 'superclasses': ['textbox'], 'nameRequired': true},
    'section': {'abstract': true, 'superclasses': ['structure'], 'supportedAttributes': ['aria-expanded']},
    'sectionhead': {
      'abstract': true,
      'nameFrom': ['contents', 'author'],
      'superclasses': ['structure'],
      'supportedAttributes': ['aria-expanded']
    },
    'select': {'abstract': true, 'nameFrom': ['author'], 'superclasses': ['composite', 'group']},
    'separator': {
      'nameFrom': ['author'],
      // TODO(aboxhall): superclass depends on focusability, but
      // doesn't affect required/supported attributes
      'superclasses': ['structure'],
      // TODO(aboxhall): required attributes depend on focusability
      'supportedAttributes': ['aria-orientation', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext']
    },
    'slider': {
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
      'superclasses': ['input', 'range'],
      'supportedAttributes': ['aria-orientation'],
      'nameRequired': true,
      'childrenPresentational': true,
      // TODO(aboxhall): aria-valuenow default is halfway between
      // aria-valuemin and aria-valuemax
      'implicitValues': {'aria-orientation': 'horizontal', 'aria-valuemin': '0', 'aria-valuemax': '100'}
    },
    'spinbutton': {
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
      'superclasses': ['composite', 'input', 'range'],
      'supportedAttributes': ['aria-required', 'aria-readonly'],
      'nameRequired': true,
      'implicitValues': {'aria-valuenow': '0'}
    },
    'status': {
      'nameFrom': ['author'],
      'superclasses': ['section'],
      'implicitValues': {'aria-live': 'polite', 'aria-atomic': 'true'}
    },
    'structure': {'abstract': true, 'superclasses': ['roletype']},
    'switch': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['checkbox'],
      'requiredAttributes': ['aria-checked'],
      'nameRequired': true,
      'childrenPresentational': true,
      'implicitValues': {'aria-checked': 'false'}
    },
    'tab': {
      'nameFrom': ['contents', 'author'],
      'scope': ['tablist'],
      'superclasses': ['sectionhead', 'widget'],
      'supportedAttributes': ['aria-selected'],
      'childrenPresentational': true,
      'implicitValues': {'aria-selected': 'false'}
    },
    'table': {
      'nameFrom': ['author'],
      'superclasses': ['section'],
      // TODO(aboxhall): Figure out how to express "rowgroup --> row"
      'mustContain': ['row'],
      'supportedAttributes': ['aria-colcount', 'aria-rowcount'],
      'nameRequired': true
    },
    'tablist': {
      'nameFrom': ['author'],
      'superclasses': ['composite'],
      'mustContain': ['tab'],
      'supportedAttributes': ['aria-level', 'aria-multiselectable', 'aria-orientation'],
      'implicitValues': {'aria-orientation': 'horizontal'}
    },
    'tabpanel': {'nameFrom': ['author'], 'superclasses': ['section'], 'nameRequired': true},
    'term': {'nameFrom': ['author'], 'superclasses': ['section']},
    'textbox': {
      'nameFrom': ['author'],
      'superclasses': ['input'],
      'supportedAttributes': [
        'aria-activedescendant', 'aria-autocomplete', 'aria-multiline', 'aria-placeholder', 'aria-readonly',
        'aria-required'
      ],
      'nameRequired': true
    },
    'timer': {'nameFrom': ['author'], 'superclasses': ['status']},
    'toolbar': {
      'nameFrom': ['author'],
      'superclasses': ['group'],
      'supportedAttributes': ['aria-orientation'],
      'implicitValues': {'aria-orientation': 'horizontal'}
    },
    'tooltip': {'nameFrom': ['contents', 'author'], 'superclasses': ['section'], 'nameRequired': true},
    'tree': {
      'nameFrom': ['author'],
      'mustContain': ['group', 'treeitem'],
      'superclasses': ['select'],
      'supportedAttributes': ['aria-multiselectable', 'aria-required'],
      'nameRequired': true,
      'implicitValues': {'aria-orientation': 'vertical'}
    },
    'treegrid': {
      // TODO(aboxhall): Figure out how to express "rowgroup --> row"
      'mustContain': ['row'],
      'nameFrom': ['author'],
      'superclasses': ['grid', 'tree'],
      'nameRequired': true
    },
    'treeitem': {
      'nameFrom': ['contents', 'author'],
      'scope': ['group', 'tree'],
      'superclasses': ['listitem', 'option'],
      'nameRequired': true
    },
    'widget': {'abstract': true, 'superclasses': ['roletype']},
    'window': {
      'abstract': true,
      'nameFrom': ['author'],
      'superclasses': ['roletype'],
      'supportedAttributes': ['aria-expanded', 'aria-modal']
    }
  }
};
