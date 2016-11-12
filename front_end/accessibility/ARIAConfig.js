Accessibility.ARIAMetadata._config = {
  'attributes': {
    'aria-activedescendant': {'type': 'IDREF'},
    'aria-atomic': {'default': 'false', 'type': 'boolean'},
    'aria-autocomplete': {'default': 'none', 'enum': ['inline', 'list', 'both', 'none'], 'type': 'token'},
    'aria-busy': {'default': 'false', 'type': 'boolean'},
    'aria-checked': {'default': 'undefined', 'enum': ['true', 'false', 'mixed', 'undefined'], 'type': 'token'},
    'aria-controls': {'type': 'IDREF_list'},
    'aria-describedby': {'type': 'IDREF_list'},
    'aria-disabled': {'default': 'false', 'type': 'boolean'},
    'aria-dropeffect':
        {'default': 'none', 'enum': ['copy', 'move', 'link', 'execute', 'popup', 'none'], 'type': 'token_list'},
    'aria-expanded': {'default': 'undefined', 'enum': ['true', 'false', 'undefined'], 'type': 'token'},
    'aria-flowto': {'type': 'IDREF_list'},
    'aria-grabbed': {'default': 'undefined', 'enum': ['true', 'false', 'undefined'], 'type': 'token'},
    'aria-haspopup': {'default': 'false', 'type': 'boolean'},
    'aria-hidden': {'default': 'false', 'type': 'boolean'},
    'aria-invalid': {'default': 'false', 'enum': ['grammar', 'false', 'spelling', 'true'], 'type': 'token'},
    'aria-label': {'type': 'string'},
    'aria-labelledby': {'type': 'IDREF_list'},
    'aria-level': {'type': 'integer'},
    'aria-live': {'default': 'off', 'enum': ['off', 'polite', 'assertive'], 'type': 'token'},
    'aria-multiline': {'default': 'false', 'type': 'boolean'},
    'aria-multiselectable': {'default': 'false', 'type': 'boolean'},
    'aria-orientation': {'default': 'vertical', 'enum': ['horizontal', 'vertical'], 'type': 'token'},
    'aria-owns': {'type': 'IDREF_list'},
    'aria-posinset': {'type': 'integer'},
    'aria-pressed': {'default': 'undefined', 'enum': ['true', 'false', 'mixed', 'undefined'], 'type': 'token'},
    'aria-readonly': {'default': 'false', 'type': 'boolean'},
    'aria-relevant':
        {'default': 'additions text', 'enum': ['additions', 'removals', 'text', 'all'], 'type': 'token_list'},
    'aria-required': {'default': 'false', 'type': 'boolean'},
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
    'alert': {'nameFrom': ['author'], 'superclasses': ['region']},
    'alertdialog': {'nameFrom': ['author'], 'superclasses': ['alert', 'dialog']},
    'application': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'article': {'nameFrom': ['author'], 'superclasses': ['document', 'region']},
    'banner': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'button': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['command'],
      'supportedAttributes': ['aria-expanded', 'aria-pressed']
    },
    'checkbox': {'nameFrom': ['contents', 'author'], 'requiredAttributes': ['aria-checked'], 'superclasses': ['input']},
    'columnheader': {
      'nameFrom': ['contents', 'author'],
      'scope': ['row'],
      'superclasses': ['gridcell', 'sectionhead', 'widget'],
      'supportedAttributes': ['aria-sort']
    },
    'combobox': {
      'mustContain': ['listbox', 'textbox'],
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-expanded'],
      'superclasses': ['select'],
      'supportedAttributes': ['aria-autocomplete', 'aria-required']
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
    'dialog': {'nameFrom': ['author'], 'superclasses': ['window']},
    'directory': {'nameFrom': ['contents', 'author'], 'superclasses': ['list']},
    'document': {'nameFrom': ['author'], 'superclasses': ['structure'], 'supportedAttributes': ['aria-expanded']},
    'form': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'grid': {
      'mustContain': ['row', 'rowgroup', 'row'],
      'nameFrom': ['author'],
      'superclasses': ['composite', 'region'],
      'supportedAttributes': ['aria-level', 'aria-multiselectable', 'aria-readonly']
    },
    'gridcell': {
      'nameFrom': ['contents', 'author'],
      'scope': ['row'],
      'superclasses': ['section', 'widget'],
      'supportedAttributes': ['aria-readonly', 'aria-required', 'aria-selected']
    },
    'group': {'nameFrom': ['author'], 'superclasses': ['section'], 'supportedAttributes': ['aria-activedescendant']},
    'heading': {'superclasses': ['sectionhead'], 'supportedAttributes': ['aria-level']},
    'img': {'nameFrom': ['author'], 'superclasses': ['section']},
    'input': {'abstract': true, 'nameFrom': ['author'], 'superclasses': ['widget']},
    'landmark': {'abstract': true, 'nameFrom': ['contents', 'author'], 'superclasses': ['region']},
    'link': {'nameFrom': ['contents', 'author'], 'superclasses': ['command'], 'supportedAttributes': ['aria-expanded']},
    'list': {'mustContain': ['group', 'listitem', 'listitem'], 'nameFrom': ['author'], 'superclasses': ['region']},
    'listbox': {
      'mustContain': ['option'],
      'nameFrom': ['author'],
      'superclasses': ['list', 'select'],
      'supportedAttributes': ['aria-multiselectable', 'aria-required']
    },
    'listitem': {
      'nameFrom': ['contents', 'author'],
      'scope': ['list'],
      'superclasses': ['section'],
      'supportedAttributes': ['aria-level', 'aria-posinset', 'aria-setsize']
    },
    'log': {'nameFrom': ['author'], 'superclasses': ['region']},
    'main': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'marquee': {'superclasses': ['section']},
    'math': {'nameFrom': ['author'], 'superclasses': ['section']},
    'menu': {
      'mustContain': ['group', 'menuitemradio', 'menuitem', 'menuitemcheckbox', 'menuitemradio'],
      'nameFrom': ['author'],
      'superclasses': ['list', 'select']
    },
    'menubar': {'nameFrom': ['author'], 'superclasses': ['menu']},
    'menuitem': {'nameFrom': ['contents', 'author'], 'scope': ['menu', 'menubar'], 'superclasses': ['command']},
    'menuitemcheckbox':
        {'nameFrom': ['contents', 'author'], 'scope': ['menu', 'menubar'], 'superclasses': ['checkbox', 'menuitem']},
    'menuitemradio': {
      'nameFrom': ['contents', 'author'],
      'scope': ['menu', 'menubar'],
      'superclasses': ['menuitemcheckbox', 'radio']
    },
    'navigation': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'note': {'nameFrom': ['author'], 'superclasses': ['section']},
    'option': {
      'nameFrom': ['contents', 'author'],
      'superclasses': ['input'],
      'supportedAttributes': ['aria-checked', 'aria-posinset', 'aria-selected', 'aria-setsize']
    },
    'presentation': {'superclasses': ['structure']},
    'progressbar': {'nameFrom': ['author'], 'superclasses': ['range']},
    'radio': {'nameFrom': ['contents', 'author'], 'superclasses': ['checkbox', 'option']},
    'radiogroup': {
      'mustContain': ['radio'],
      'nameFrom': ['author'],
      'superclasses': ['select'],
      'supportedAttributes': ['aria-required']
    },
    'range': {
      'abstract': true,
      'nameFrom': ['author'],
      'superclasses': ['widget'],
      'supportedAttributes': ['aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext']
    },
    'region': {'nameFrom': ['author'], 'superclasses': ['section']},
    'roletype': {
      'abstract': true,
      'supportedAttributes': [
        'aria-atomic', 'aria-busy', 'aria-controls', 'aria-describedby', 'aria-disabled', 'aria-dropeffect',
        'aria-flowto', 'aria-grabbed', 'aria-haspopup', 'aria-hidden', 'aria-invalid', 'aria-label', 'aria-labelledby',
        'aria-live', 'aria-owns', 'aria-relevant'
      ]
    },
    'row': {
      'mustContain': ['columnheader', 'gridcell', 'rowheader'],
      'nameFrom': ['contents', 'author'],
      'scope': ['grid', 'rowgroup', 'treegrid'],
      'superclasses': ['group', 'widget'],
      'supportedAttributes': ['aria-level', 'aria-selected']
    },
    'rowgroup':
        {'mustContain': ['row'], 'nameFrom': ['contents', 'author'], 'scope': ['grid'], 'superclasses': ['group']},
    'rowheader': {
      'nameFrom': ['contents', 'author'],
      'scope': ['row'],
      'superclasses': ['gridcell', 'sectionhead', 'widget'],
      'supportedAttributes': ['aria-sort']
    },
    'scrollbar': {
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-controls', 'aria-orientation', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
      'superclasses': ['input', 'range']
    },
    'search': {'nameFrom': ['author'], 'superclasses': ['landmark']},
    'section': {
      'abstract': true,
      'nameFrom': ['contents', 'author'],
      'superclasses': ['structure'],
      'supportedAttributes': ['aria-expanded']
    },
    'sectionhead': {
      'abstract': true,
      'nameFrom': ['contents', 'author'],
      'superclasses': ['structure'],
      'supportedAttributes': ['aria-expanded']
    },
    'select': {'abstract': true, 'nameFrom': ['author'], 'superclasses': ['composite', 'group', 'input']},
    'separator': {
      'nameFrom': ['author'],
      'superclasses': ['structure'],
      'supportedAttributes': ['aria-expanded', 'aria-orientation']
    },
    'slider': {
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
      'superclasses': ['input', 'range'],
      'supportedAttributes': ['aria-orientation']
    },
    'spinbutton': {
      'nameFrom': ['author'],
      'requiredAttributes': ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
      'superclasses': ['input', 'range'],
      'supportedAttributes': ['aria-required']
    },
    'status': {'superclasses': ['region']},
    'structure': {'abstract': true, 'superclasses': ['roletype']},
    'tab': {
      'nameFrom': ['contents', 'author'],
      'scope': ['tablist'],
      'superclasses': ['sectionhead', 'widget'],
      'supportedAttributes': ['aria-selected']
    },
    'tablist': {
      'mustContain': ['tab'],
      'nameFrom': ['author'],
      'superclasses': ['composite', 'directory'],
      'supportedAttributes': ['aria-level']
    },
    'tabpanel': {'nameFrom': ['author'], 'superclasses': ['region']},
    'textbox': {
      'nameFrom': ['author'],
      'superclasses': ['input'],
      'supportedAttributes':
          ['aria-activedescendant', 'aria-autocomplete', 'aria-multiline', 'aria-readonly', 'aria-required']
    },
    'timer': {'nameFrom': ['author'], 'superclasses': ['status']},
    'toolbar': {'nameFrom': ['author'], 'superclasses': ['group']},
    'tooltip': {'superclasses': ['section']},
    'tree': {
      'mustContain': ['group', 'treeitem', 'treeitem'],
      'nameFrom': ['author'],
      'superclasses': ['select'],
      'supportedAttributes': ['aria-multiselectable', 'aria-required']
    },
    'treegrid': {'mustContain': ['row'], 'nameFrom': ['author'], 'superclasses': ['grid', 'tree']},
    'treeitem':
        {'nameFrom': ['contents', 'author'], 'scope': ['group', 'tree'], 'superclasses': ['listitem', 'option']},
    'widget': {'abstract': true, 'superclasses': ['roletype']},
    'window': {
      'abstract': true,
      'nameFrom': ['author'],
      'superclasses': ['roletype'],
      'supportedAttributes': ['aria-expanded']
    }
  }
};
