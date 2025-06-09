// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { TestCase } from '../framework/types.js';

export interface ActionAgentArgs {
  objective: string;
  reasoning: string;
  hint?: string;
  input_data?: string;
}

// Basic search interaction test
export const basicClickTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-click-001',
  name: 'Search with Text Entry and Click',
  description: 'Test entering text in search field and clicking search button',
  url: 'https://www.google.com',
  tool: 'action_agent',
  input: {
    objective: 'Type "DevTools automation" in the search box and then click the "Google Search" button',
    reasoning: 'Testing multi-step interaction: text input followed by button click',
    hint: 'First fill the search input field, then find and click the search button'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully located the search input field',
        'Entered "DevTools automation" text in the search box',
        'Located the Google Search button after entering text',
        'Successfully clicked the search button',
        'Search was executed and results page loaded'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify text "DevTools automation" was entered in the search field',
          'Check if search results page loaded with relevant results',
          'Confirm the search was executed (URL changed to results page)',
          'Ensure search results are related to "DevTools automation"'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'multi-step', 'search', 'form-fill', 'click', 'google', 'basic']
  }
};

// Form fill action test
export const formFillTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-form-001',
  name: 'Fill Search Query',
  description: 'Test filling a search input field with specific text',
  url: 'https://www.google.com',
  tool: 'action_agent',
  input: {
    objective: 'Fill the search box with "Chrome DevTools automation testing"',
    reasoning: 'Testing form input capability with a specific search query'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully identified the search input field',
        'Used perform_action with fill method',
        'Correctly filled the field with the specified text',
        'Verified the field accepted the input',
        'No formatting or encoding issues with the text'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to confirm text was entered in the search field',
          'Verify the exact text "Chrome DevTools automation testing" is visible',
          'Check if search suggestions or autocomplete dropdown appeared',
          'Ensure no input validation errors are shown'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'form-fill', 'input', 'google', 'basic']
  }
};

// Complex navigation test
export const navigationClickTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-nav-001',
  name: 'Navigate via Menu Click',
  description: 'Test clicking navigation menu items to navigate between pages',
  url: 'https://www.wikipedia.org',
  tool: 'action_agent',
  input: {
    objective: 'Click on the "English" language link to navigate to English Wikipedia',
    reasoning: 'Testing navigation through link clicks on a multilingual site'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Identified the correct language link among many options',
        'Successfully clicked the English link',
        'Navigation occurred to the English Wikipedia',
        'Used appropriate tools to verify navigation success',
        'Handled the multilingual page structure correctly'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to verify navigation from Wikipedia homepage to English Wikipedia',
          'Check if the page language and content changed to English',
          'Verify the URL changed to en.wikipedia.org',
          'Confirm the English Wikipedia main page is displayed'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'navigation', 'click', 'wikipedia', 'multilingual']
  }
};

// E-commerce action test
export const ecommerceActionTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-ecommerce-001',
  name: 'Add Product to Cart',
  description: 'Test clicking "Add to Cart" button on an e-commerce product page',
  url: 'https://www.homedepot.com/p/Husky-20-Gal-Professional-Duty-Waterproof-Storage-Container-with-Hinged-Lid-in-Red-249160/313799634',
  tool: 'action_agent',
  input: {
    objective: 'Click the "Add to Cart" button for this storage container',
    reasoning: 'Testing e-commerce interaction with product cart functionality'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the Add to Cart button on the product page',
        'Successfully clicked the button',
        'Handled any popups or confirmations that appeared',
        'Verified the item was added (cart count changed or confirmation shown)',
        'Dealt with page dynamics after clicking'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to verify the Add to Cart button was clicked',
          'Check if cart count indicator increased or shows the item was added',
          'Look for any confirmation popup or notification about the item being added',
          'Verify the button state changed (e.g., to "Added to Cart" or disabled)'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'ecommerce', 'click', 'homedepot', 'cart'],
    timeout: 180000, // 3 minutes - e-commerce sites can be slow
    retries: 3,
    flaky: true // E-commerce sites often have dynamic content
  }
};

// Checkbox/radio button test
export const checkboxActionTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-checkbox-001',
  name: 'Toggle Newsletter Checkbox',
  description: 'Test clicking checkbox elements for form options',
  url: 'https://www.w3schools.com/html/tryit.asp?filename=tryhtml_checkbox',
  tool: 'action_agent',
  input: {
    objective: 'Click the checkbox labeled "I have a bike" to check it',
    reasoning: 'Testing interaction with checkbox form elements'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Identified the correct checkbox among multiple options',
        'Used click action on the checkbox element',
        'Checkbox state changed from unchecked to checked',
        'Handled the iframe structure if present',
        'No errors with form element interaction'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to verify the checkbox state changed from unchecked to checked',
          'Confirm the "I have a bike" checkbox now shows a checkmark',
          'Verify the checkbox visual indicator (checkmark) is clearly visible',
          'Ensure no other checkboxes were accidentally modified'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'checkbox', 'form', 'w3schools', 'input']
  }
};

// Toggle checkbox test - using HTML form test site
export const toggleCheckboxTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-checkbox-002',
  name: 'Check Extra Cheese Checkbox',
  description: 'Test checking a specific checkbox using the check method',
  url: 'https://httpbin.org/forms/post',
  tool: 'action_agent',
  input: {
    objective: 'Find and check the "Extra Cheese" checkbox in the Pizza Toppings section',
    reasoning: 'Testing checkbox interaction functionality using check method',
    hint: 'Look for the Extra Cheese checkbox and use the check method to select it'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the Extra Cheese checkbox in the Pizza Toppings section',
        'Used the check method instead of click for better reliability',
        'Checkbox became checked (if it wasn\'t already)',
        'No errors occurred during checkbox interaction',
        'Form maintained its structure after checkbox selection'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the Extra Cheese checkbox is now checked (shows checkmark)',
          'Check that the checkbox shows proper visual feedback for checked state',
          'Confirm the form structure remained intact',
          'Ensure the checkbox for Extra Cheese was specifically targeted and checked'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'checkbox', 'check', 'form', 'httpbin'],
    timeout: 45000,
    retries: 2,
    flaky: false
  }
};

// Radio button selection test
export const radioButtonTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-radio-001',
  name: 'Select Radio Button Option',
  description: 'Test selecting a specific radio button option using click method',
  url: 'https://httpbin.org/forms/post',
  tool: 'action_agent',
  input: {
    objective: 'Select the "Medium" pizza size from the Pizza Size radio button group',
    reasoning: 'Testing radio button selection functionality',
    hint: 'Look for the Medium radio button in the Pizza Size section and click it to select'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the Medium radio button in the Pizza Size section',
        'Successfully clicked the Medium radio button',
        'Radio button became selected (checked state)',
        'Other radio buttons in the same group became unselected',
        'Form maintained its structure after radio button selection'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the Medium radio button is now selected (shows filled circle)',
          'Check that other pizza size options (Small, Large) are no longer selected',
          'Confirm the form structure remained intact',
          'Ensure the Medium pizza size radio button was specifically targeted'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'radio', 'click', 'form', 'httpbin'],
    timeout: 45000,
    retries: 2,
    flaky: false
  }
};

// Dropdown selection test
export const dropdownActionTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-dropdown-001',
  name: 'Select Dropdown Option',
  description: 'Test selecting an option from a dropdown menu',
  url: 'https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_select',
  tool: 'action_agent',
  input: {
    objective: 'Select "Audi" from the car brands dropdown menu',
    reasoning: 'Testing dropdown selection interaction'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the dropdown/select element',
        'Identified the correct option to select',
        'Successfully selected the Audi option',
        'Dropdown value changed to the selected option',
        'Handled select element interaction properly'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to verify the dropdown selection changed',
          'Confirm "Audi" is now displayed as the selected option',
          'Check if the dropdown is closed after selection',
          'Verify no other form elements were affected by the selection'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'dropdown', 'select', 'form', 'w3schools']
  }
};

// Multi-step form test
export const multiStepFormTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-multistep-001',
  name: 'Complete Search and Submit',
  description: 'Test filling a search form and then clicking the submit button',
  url: 'https://www.bing.com',
  tool: 'action_agent',
  input: {
    objective: 'Fill the search box with "automated testing tools" and then click the search button',
    reasoning: 'Testing multi-step form interaction combining fill and click actions',
    hint: 'This requires two actions: first fill the search field, then click the search button'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Recognized this requires multiple actions',
        'First filled the search input correctly',
        'Then located and clicked the search button',
        'Both actions completed successfully in sequence',
        'Search was initiated with the correct query'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the search input contains "automated testing tools" text',
          'Confirm the search was submitted and results page loaded',
          'Check that search results are related to the query',
          'Ensure the multi-step action completed fully with both fill and click'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'multi-step', 'form-fill', 'click', 'bing', 'search']
  }
};

// Dynamic content interaction test
export const dynamicContentTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-dynamic-001',
  name: 'Click Dynamic Load Button',
  description: 'Test clicking a button that loads dynamic content',
  url: 'https://the-internet.herokuapp.com/dynamic_loading/1',
  tool: 'action_agent',
  input: {
    objective: 'Click the "Start" button to trigger dynamic content loading',
    reasoning: 'Testing interaction with dynamically loaded content'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Found and clicked the Start button',
        'Handled the dynamic loading process',
        'Recognized that content changes after clicking',
        'No timing issues with the dynamic content',
        'Successfully triggered the loading animation'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to verify dynamic content loaded after clicking Start',
          'Check if loading animation or spinner was displayed',
          'Confirm new content appeared that was previously hidden',
          'Verify the Start button state changed or was replaced after clicking'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'dynamic', 'click', 'ajax', 'loading']
  }
};

// Login form test
export const loginFormTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-login-001',
  name: 'Fill Login Credentials',
  description: 'Test filling username and password fields in a login form',
  url: 'https://the-internet.herokuapp.com/login',
  tool: 'action_agent',
  input: {
    objective: 'Fill the username field with "tomsmith" and password field with "SuperSecretPassword!"',
    reasoning: 'Testing form fill with multiple fields including password type',
    input_data: '<username>tomsmith</username><password>SuperSecretPassword!</password>'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Identified both username and password fields',
        'Filled username field with correct value',
        'Filled password field with correct value', 
        'Handled password field type appropriately',
        'Used the provided input_data XML format correctly'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the username field shows "tomsmith" entered',
          'Confirm the password field has dots/asterisks indicating password entry',
          'Check that both fields are properly filled before submission',
          'Ensure no validation errors are shown for the filled fields'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'login', 'form-fill', 'authentication', 'multi-field']
  }
};

// Hover action test
export const hoverActionTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-hover-001',
  name: 'Hover to Reveal Menu',
  description: 'Test hovering over an element to reveal hidden content',
  url: 'https://the-internet.herokuapp.com/hovers',
  tool: 'action_agent',
  input: {
    objective: 'Hover over the first user avatar image to reveal the hidden caption',
    reasoning: 'Testing hover interaction to reveal dynamic content'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the first user avatar image',
        'Used appropriate hover action method',
        'Successfully triggered the hover state',
        'Hidden caption became visible after hover',
        'Handled mouse interaction correctly'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Compare screenshots to verify hover revealed hidden content',
          'Check that caption or overlay appeared over the first avatar',
          'Confirm the hover state is visually active on the image',
          'Verify user information or caption text is now visible'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'hover', 'mouse', 'dynamic', 'reveal']
  }
};

// Accessibility-focused test
export const accessibilityActionTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-a11y-001',
  name: 'Click Using ARIA Label',
  description: 'Test clicking an element identified primarily by ARIA attributes',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/examples/button/',
  tool: 'action_agent',
  input: {
    objective: 'Click the button with aria-label "Print Page"',
    reasoning: 'Testing action selection using accessibility attributes'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Used accessibility tree to find elements',
        'Correctly identified element by ARIA label',
        'Successfully clicked the target button',
        'Demonstrated understanding of accessibility attributes',
        'No reliance on visual appearance alone'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the Print Page button was successfully clicked',
          'Check if any print dialog or print preview appeared',
          'Confirm the button showed visual feedback (pressed state)',
          'Ensure the action was performed on the correct accessibility-labeled element'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'accessibility', 'aria', 'click', 'a11y']
  }
};

// Error recovery test
export const errorRecoveryTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-error-001',
  name: 'Handle Missing Element',
  description: 'Test agent behavior when target element is not found',
  url: 'https://www.google.com',
  tool: 'action_agent',
  input: {
    objective: 'Click the "Sign Up" button',
    reasoning: 'Testing error handling when element does not exist',
    hint: 'There is no Sign Up button on Google homepage - agent should handle gracefully'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Attempted to find the requested element',
        'Recognized that the element does not exist',
        'Provided clear error message or explanation',
        'Did not crash or produce confusing output',
        'Suggested alternatives or explained the issue'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the page remains in a stable state despite the missing element',
          'Confirm no error dialogs or broken UI elements appeared',
          'Check that the agent handled the missing element gracefully',
          'Ensure the page was properly analyzed even though the target was not found'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'error-handling', 'missing-element', 'recovery', 'edge-case'],
    timeout: 60000, // 1 minute - should fail quickly
    retries: 1 // Only retry once for error tests
  }
};

// Date and Time Picker Tests
export const datePickerTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-datepicker-001',
  name: 'Select Date from Calendar',
  description: 'Test clicking date input and selecting a specific date from calendar popup',
  url: 'https://jqueryui.com/datepicker/',
  tool: 'action_agent',
  input: {
    objective: 'Click the date input field and select March 15, 2024 from the calendar picker',
    reasoning: 'Testing interaction with calendar popup widgets'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located and clicked the date input field',
        'Calendar popup opened successfully',
        'Navigated to correct month/year if needed',
        'Selected the specific date (March 15, 2024)',
        'Date input field shows the selected date'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the date input field contains the selected date',
          'Check if the calendar widget opened and closed properly',
          'Confirm the correct date was highlighted and selected',
          'Ensure the date format matches expected output'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'datepicker', 'calendar', 'form', 'popup']
  }
};

export const dateRangePickerTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-daterange-001',
  name: 'Select Date Range',
  description: 'Test selecting a date range with start and end dates',
  url: 'https://www.daterangepicker.com/',
  tool: 'action_agent',
  input: {
    objective: 'Select a date range from February 1, 2024 to February 28, 2024',
    reasoning: 'Testing complex date range selection with start and end dates'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Opened the date range picker interface',
        'Selected the start date (February 1, 2024)',
        'Selected the end date (February 28, 2024)',
        'Date range was properly applied',
        'Input field shows the complete date range'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify both start and end dates are displayed in the input',
          'Check if the date range picker shows the selected range',
          'Confirm the format matches expected date range display',
          'Ensure both dates were selected in sequence'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'daterange', 'date-picker', 'form', 'complex']
  }
};

export const timePickerTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-timepicker-001',
  name: 'Select Time from Picker',
  description: 'Test setting time using time picker controls',
  url: 'https://timepicker.co/',
  tool: 'action_agent',
  input: {
    objective: 'Set the time to 2:30 PM using the time picker controls',
    reasoning: 'Testing time selection with hour/minute controls'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the time picker interface',
        'Set the hour to 2 (14 for 24-hour format)',
        'Set the minutes to 30',
        'Selected PM or appropriate time format',
        'Time input shows 2:30 PM or equivalent'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the time input displays 2:30 PM or 14:30',
          'Check if hour and minute were set correctly',
          'Confirm AM/PM selection if applicable',
          'Ensure the time picker interface was properly used'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'timepicker', 'time', 'form', 'clock']
  }
};

// File Upload Tests
export const fileUploadTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-upload-001',
  name: 'Upload File via Input',
  description: 'Test clicking file input and uploading a test file',
  url: 'https://the-internet.herokuapp.com/upload',
  tool: 'action_agent',
  input: {
    objective: 'Click the file input and upload a test file',
    reasoning: 'Testing file upload interaction through input elements'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the file input element',
        'Triggered file selection dialog',
        'Selected a file for upload',
        'File name appears in the input field',
        'Upload process initiated successfully'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify file name appears in the upload input field',
          'Check if file selection was successful',
          'Confirm upload button is available or file is ready',
          'Ensure no upload errors are displayed'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'upload', 'file', 'input', 'form']
  }
};

// Modal and Popup Tests
export const modalDialogTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-modal-001',
  name: 'Open and Close Modal',
  description: 'Test opening modal dialog and closing it with X button',
  url: 'https://getbootstrap.com/docs/5.0/components/modal/',
  tool: 'action_agent',
  input: {
    objective: 'Click to open the modal dialog, then close it using the X button',
    reasoning: 'Testing modal dialog interaction patterns'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located and clicked the modal trigger button',
        'Modal dialog opened successfully',
        'Modal content was visible and accessible',
        'Found and clicked the close (X) button',
        'Modal closed and page returned to normal state'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify modal opened with visible content',
          'Check if modal overlay appeared correctly',
          'Confirm modal was closed after clicking X',
          'Ensure page background is accessible again'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'modal', 'dialog', 'popup', 'overlay']
  }
};

// TODO: Figure out how to handle browser alert dialogs since they block the main thread
// export const alertDialogTest: TestCase<ActionAgentArgs> = {
//   id: 'action-agent-alert-001',
//   name: 'Handle Browser Alert',
//   description: 'Test clicking button that triggers browser alert and accepting it',
//   url: 'https://the-internet.herokuapp.com/javascript_alerts',
//   tool: 'action_agent',
//   input: {
//     objective: 'Click the "Click for JS Alert" button and accept the alert dialog',
//     reasoning: 'Testing browser alert dialog handling'
//   },
//   validation: {
//     type: 'llm-judge',
//     llmJudge: {
//       criteria: [
//         'Located and clicked the JS Alert button',
//         'Browser alert dialog appeared',
//         'Successfully accepted/dismissed the alert',
//         'Page showed confirmation of alert interaction',
//         'No hanging dialogs or error states'
//       ],
//       visualVerification: {
//         enabled: true,
//         captureBeforeAction: true,
//         captureAfterAction: true,
//         verificationPrompts: [
//           'Verify the alert button was clicked',
//           'Check if result text shows alert was handled',
//           'Confirm no alert dialog is still visible',
//           'Ensure page returned to normal interactive state'
//         ]
//       }
//     }
//   },
//   metadata: {
//     tags: ['action', 'alert', 'dialog', 'javascript', 'browser']
//   }
// };

export const contextMenuTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-context-001',
  name: 'Right Click Context Menu',
  description: 'Test right-clicking to open context menu',
  url: 'https://the-internet.herokuapp.com/context_menu',
  tool: 'action_agent',
  input: {
    objective: 'Right-click on the context menu area to open the context menu',
    reasoning: 'Testing right-click context menu interaction'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the designated context menu area',
        'Performed right-click action correctly',
        'Context menu appeared with options',
        'Successfully triggered the right-click event',
        'Alert or confirmation appeared as expected'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify right-click was performed on correct area',
          'Check if context menu or alert appeared',
          'Confirm right-click event was properly triggered',
          'Ensure the expected response occurred'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'context-menu', 'right-click', 'mouse', 'menu']
  }
};

// Advanced Form Pattern Tests
export const sliderTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-slider-001',
  name: 'Adjust Range Slider',
  description: 'Test moving slider to set a specific value',
  url: 'https://jqueryui.com/slider/',
  tool: 'action_agent',
  input: {
    objective: 'Move the slider to set the value to 75',
    reasoning: 'Testing slider/range input manipulation'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the slider control element',
        'Successfully moved the slider handle',
        'Set the slider value to approximately 75',
        'Slider position reflects the target value',
        'Any associated display shows the correct value'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify slider handle moved to represent value 75',
          'Check if value display shows 75 or close to it',
          'Confirm slider position visually matches target',
          'Ensure slider interaction was smooth and successful'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'slider', 'range', 'form', 'drag']
  }
};

export const multiSelectTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-multiselect-001',
  name: 'Select Multiple Options',
  description: 'Test selecting multiple options from a multi-select dropdown',
  url: 'https://www.w3schools.com/tags/tryit.asp?filename=tryhtml_select_multiple',
  tool: 'action_agent',
  input: {
    objective: 'Select both "Volvo" and "Audi" from the multi-select dropdown',
    reasoning: 'Testing multiple selection in select elements'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the multi-select dropdown element',
        'Successfully selected Volvo option',
        'Successfully selected Audi option',
        'Both options remain selected simultaneously',
        'Used appropriate multi-select interaction method'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify both Volvo and Audi appear selected',
          'Check if both options are highlighted/marked',
          'Confirm multi-select functionality worked correctly',
          'Ensure no other options were accidentally selected'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'multi-select', 'dropdown', 'form', 'multiple']
  }
};

export const autocompleteTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-autocomplete-001',
  name: 'Use Autocomplete Search',
  description: 'Test typing in autocomplete field and selecting from suggestions',
  url: 'https://jqueryui.com/autocomplete/',
  tool: 'action_agent',
  input: {
    objective: 'Type "Java" in the autocomplete field and select "JavaScript" from suggestions',
    reasoning: 'Testing autocomplete/typeahead interaction patterns'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the autocomplete input field',
        'Typed "Java" to trigger suggestions',
        'Autocomplete dropdown appeared with suggestions',
        'Selected "JavaScript" from the suggestion list',
        'Input field shows the selected value'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify "JavaScript" appears in the input field',
          'Check if autocomplete suggestions appeared',
          'Confirm the correct suggestion was selected',
          'Ensure dropdown closed after selection'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'autocomplete', 'typeahead', 'search', 'suggestions']
  }
};

// Tab and Navigation Pattern Tests
export const tabPanelTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-tabs-001',
  name: 'Navigate Tab Panels',
  description: 'Test clicking tab to switch between tab panels',
  url: 'https://jqueryui.com/tabs/',
  tool: 'action_agent',
  input: {
    objective: 'Click on the "Nunc tincidunt" tab to switch to that panel',
    reasoning: 'Testing tab panel navigation'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the "Nunc tincidunt" tab button',
        'Successfully clicked the tab',
        'Tab panel content switched to the selected tab',
        'Active tab visual state changed appropriately',
        'Content area updated to show the new panel'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the "Nunc tincidunt" tab is now active/highlighted',
          'Check if the content panel changed to show new content',
          'Confirm the tab switching animation completed',
          'Ensure the correct tab content is visible'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'tabs', 'navigation', 'panels', 'ui']
  }
};

export const accordionTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-accordion-001',
  name: 'Expand Accordion Section',
  description: 'Test clicking to expand an accordion panel',
  url: 'https://jqueryui.com/accordion/',
  tool: 'action_agent',
  input: {
    objective: 'Click to expand the "Section 2" accordion panel',
    reasoning: 'Testing accordion expand/collapse interaction'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the Section 2 accordion header',
        'Successfully clicked to expand the section',
        'Section 2 content became visible',
        'Other sections collapsed appropriately',
        'Accordion animation completed smoothly'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify Section 2 is now expanded and content visible',
          'Check if other accordion sections collapsed',
          'Confirm the expansion animation completed',
          'Ensure Section 2 header shows expanded state'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'accordion', 'expand', 'collapse', 'ui']
  }
};

// Table Interaction Tests
export const tableSortTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-tablesort-001',
  name: 'Sort Table Column',
  description: 'Test clicking table column header to sort data',
  url: 'https://datatables.net/examples/basic_init/zero_configuration.html',
  tool: 'action_agent',
  input: {
    objective: 'Click on the "Name" column header to sort the table by name',
    reasoning: 'Testing table column sorting interaction'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the Name column header',
        'Successfully clicked the column header',
        'Table data reordered by name alphabetically',
        'Sort indicator appeared on the Name column',
        'Table sorting completed without errors'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify table rows are now sorted alphabetically by name',
          'Check if sort arrow/indicator appears on Name column',
          'Confirm the data order changed from before to after',
          'Ensure table structure remained intact after sorting'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'table', 'sort', 'column', 'data']
  }
};

export const tableSelectTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-tableselect-001',
  name: 'Select Table Row',
  description: 'Test clicking to select a table row',
  url: 'https://datatables.net/examples/api/select_single_row.html',
  tool: 'action_agent',
  input: {
    objective: 'Click on the first row to select it',
    reasoning: 'Testing table row selection patterns'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the first table row',
        'Successfully clicked the row',
        'Row became highlighted/selected',
        'Selection state is visually apparent',
        'Only one row is selected at a time'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the first row is now highlighted/selected',
          'Check if row selection visual feedback is clear',
          'Confirm only the clicked row is selected',
          'Ensure row selection styling is properly applied'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'table', 'select', 'row', 'highlight']
  }
};

// Media and Rich Content Tests
export const videoControlsTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-video-001',
  name: 'Control Video Playback',
  description: 'Test starting video playback using click + spacebar',
  url: 'https://www.w3schools.com/html/html5_video.asp',
  tool: 'action_agent',
  input: {
    objective: 'Click the video element to focus it, then press spacebar to start playback',
    reasoning: 'Testing video control using standard keyboard interaction (click to focus + spacebar to play)',
    hint: 'First click the Video element to focus it, then use keyboard input to press the spacebar key to start playback'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the Video element in the accessibility tree',
        'Successfully clicked the Video element to focus it',
        'Used keyboard input to press spacebar',
        'Video playback started after spacebar press',
        'No errors occurred during the interaction sequence'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify video player is visible on the page',
          'Check if the play button was clicked (may show pause button after)',
          'Look for visual indicators that video started playing',
          'Ensure no error messages appeared during video interaction'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'video', 'media', 'controls', 'playback'],
    timeout: 90000, // 1.5 minutes - video loading can be slow
    retries: 3,
    flaky: true // Video controls can be finicky
  }
};

// Simple play button test
export const videoPlayButtonTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-video-002',
  name: 'Click Video Play Button Specifically',
  description: 'Test clicking the specific play button (not the video element)',
  url: 'https://www.w3schools.com/html/html5_video.asp',
  tool: 'action_agent',
  input: {
    objective: 'Find and click the button that has name="play" (not the Video element itself)',
    reasoning: 'Testing specific targeting of the play button element',
    hint: 'Target the button element with text or label "play", do not click the Video element'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Found a button element (not Video element) with "play" in the name',
        'Successfully clicked the play button specifically',
        'Did not click on the Video element itself',
        'Play button click was executed correctly',
        'Video responded to the button click'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify the play button (not video element) was clicked',
          'Check if video started playing after button click',
          'Confirm the target was the button, not the video container',
          'Look for changes in video player state'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'video', 'button', 'specific-targeting'],
    timeout: 60000,
    retries: 2,
    flaky: false
  }
};

// Keyboard Navigation Test
export const keyboardNavTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-keyboard-001',
  name: 'Keyboard Tab Navigation',
  description: 'Test using keyboard navigation to move between elements',
  url: 'https://www.w3.org/WAI/ARIA/apg/patterns/menubar/examples/menubar-navigation/',
  tool: 'action_agent',
  input: {
    objective: 'Use Tab key to navigate between menu items and Enter to activate',
    reasoning: 'Testing keyboard-only navigation patterns'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Successfully used keyboard navigation',
        'Tab key moved focus between menu items',
        'Focus indicators were visible during navigation',
        'Enter key activated the focused menu item',
        'Keyboard navigation followed accessibility standards'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify focus indicators are visible on menu items',
          'Check if keyboard navigation moved focus correctly',
          'Confirm Enter key activated the focused item',
          'Ensure accessibility navigation patterns worked'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'keyboard', 'navigation', 'accessibility', 'focus']
  }
};

// Advanced State Interaction Tests
export const searchFilterTest: TestCase<ActionAgentArgs> = {
  id: 'action-agent-filter-001',
  name: 'Apply Search Filters',
  description: 'Test applying search filters to modify results',
  url: 'https://www.w3schools.com/howto/howto_js_filter_lists.asp',
  tool: 'action_agent',
  input: {
    objective: 'Type "Anna" in the search filter to filter the list',
    reasoning: 'Testing search filter application'
  },
  validation: {
    type: 'llm-judge',
    llmJudge: {
      criteria: [
        'Located the search filter input',
        'Typed "a" in the filter field',
        'List items filtered to show only matching results',
        'Non-matching items were hidden or removed from view',
        'Filter functionality worked as expected'
      ],
      visualVerification: {
        enabled: true,
        captureBeforeAction: true,
        captureAfterAction: true,
        verificationPrompts: [
          'Verify search input contains "Anna"',
          'Check if list shows only items containing "Anna"',
          'Confirm non-matching items are not visible',
          'Ensure filter functionality reduced the visible list items'
        ]
      }
    }
  },
  metadata: {
    tags: ['action', 'filter', 'search', 'list', 'dynamic']
  }
};

// All action agent tests
export const actionAgentTests: TestCase<ActionAgentArgs>[] = [
  // Original tests
  basicClickTest,
  formFillTest,
  navigationClickTest,
  ecommerceActionTest,
  checkboxActionTest,
  toggleCheckboxTest,
  radioButtonTest,
  dropdownActionTest,
  multiStepFormTest,
  dynamicContentTest,
  loginFormTest,
  hoverActionTest,
  accessibilityActionTest,
  errorRecoveryTest,
  
  // Date and Time tests
  datePickerTest,
  dateRangePickerTest,
  timePickerTest,
  
  // File Upload tests
  fileUploadTest,
  
  // Modal and Popup tests
  modalDialogTest,
  // alertDialogTest, // TODO: Commented out - browser alerts block main thread
  contextMenuTest,
  
  // Advanced Form tests
  sliderTest,
  multiSelectTest,
  autocompleteTest,
  
  // Tab and Navigation tests
  tabPanelTest,
  accordionTest,
  
  // Table Interaction tests
  tableSortTest,
  tableSelectTest,
  
  // Media tests
  videoControlsTest,
  videoPlayButtonTest,
  
  // Keyboard Navigation tests
  keyboardNavTest,
  
  // Advanced State tests
  searchFilterTest
];

// Get basic tests for quick validation
export function getBasicActionTests(): TestCase<ActionAgentArgs>[] {
  return [
    basicClickTest,
    formFillTest,
    navigationClickTest
  ];
}

// Get tests by action type
export function getActionTestsByType(actionType: string): TestCase<ActionAgentArgs>[] {
  return actionAgentTests.filter(test => test.metadata.tags.includes(actionType));
}