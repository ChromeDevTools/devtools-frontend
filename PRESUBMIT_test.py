# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import unittest
import PRESUBMIT


class MockChange:

    def __init__(self, description):
        self._description = description

    def FullDescriptionText(self):
        return self._description


class MockInputApi:

    def __init__(self, description):
        self.change = MockChange(description)


class MockOutputApi:

    class PresubmitResult:

        def __init__(self, message, items=None, long_text=''):
            self.message = message
            self.items = items or []
            self.long_text = long_text

        def __repr__(self):
            return f'{self.__class__.__name__}({self.message!r})'

    class PresubmitError(PresubmitResult):
        pass


class PiperTagsPresubmitTest(unittest.TestCase):

    def testValidCleanDescription(self):
        description = (
            '[devtools] Add cool feature\n\n'
            'This is a clean commit description.\n\n'
            'Bug: 123456\n'
            'Change-Id: I1234567890abcdef1234567890abcdef12345678\n')
        input_api = MockInputApi(description)
        output_api = MockOutputApi()

        errors = PRESUBMIT.CheckNoPiperTagsInDescription(input_api, output_api)
        self.assertEqual(errors, [])

    def testValidWithFixedAndNone(self):
        description = ('[devtools] Fix issue\n\n'
                       'Fixed: 123456, 7890\n')
        input_api = MockInputApi(description)
        output_api = MockOutputApi()

        errors = PRESUBMIT.CheckNoPiperTagsInDescription(input_api, output_api)
        self.assertEqual(errors, [])

        description_none = ('[devtools] Minor cleanup\n\n'
                            'Bug: None\n')
        input_api_none = MockInputApi(description_none)
        errors_none = PRESUBMIT.CheckNoPiperTagsInDescription(
            input_api_none, output_api)
        self.assertEqual(errors_none, [])

    def testValidMidLineTags(self):
        description = (
            '[devtools] Update docs\n\n'
            'We previously fixed a bug where TAG=agy was incorrectly emitted.\n'
            'Also noted that BUG=123 is discussed in comments.\n\n'
            'Bug: 123456\n')
        input_api = MockInputApi(description)
        output_api = MockOutputApi()

        errors = PRESUBMIT.CheckNoPiperTagsInDescription(input_api, output_api)
        self.assertEqual(errors, [])

    def testValidExcludedKeys(self):
        description = (
            '[devtools] Roll deps\n\n'
            'Roll third_party/something\n\n'
            'R=chrome-devtools-waterfall-gardener-emea-oncall@google.com\n'
            'TBR=someone@chromium.org\n'
            'CC=someone@chromium.org\n'
            'Bug: None\n')
        input_api = MockInputApi(description)
        output_api = MockOutputApi()

        errors = PRESUBMIT.CheckNoPiperTagsInDescription(input_api, output_api)
        self.assertEqual(errors, [])

    def testRejectsPiperTags(self):
        rejected_keys = [
            'TAG=agy',
            'CONV=c29008c7-cac9-4486-adb8-a74b42bd015e',
            'BUG=123456',
            'FIXED=123456',
            'MARKDOWN=true',
            'ORIGINAL_AUTHOR=author@example.com',
            'WANT_LGTM=1',
            'AUTOSUBMIT_BEHAVIOR=1',
            'R_FUTURE=someone@example.com',
        ]
        output_api = MockOutputApi()

        for tag in rejected_keys:
            with self.subTest(tag=tag):
                description = f'[devtools] Change\n\nExplanation.\n\n{tag}\nBug: 123\n'
                input_api = MockInputApi(description)
                errors = PRESUBMIT.CheckNoPiperTagsInDescription(
                    input_api, output_api)
                self.assertEqual(len(errors), 1,
                                 f'Expected {tag} to be rejected')
                self.assertIsInstance(errors[0], output_api.PresubmitError)
                self.assertIn(tag, errors[0].message)
                self.assertIn('Bug:', errors[0].message)
                self.assertIn('Fixed:', errors[0].message)
                self.assertIn('cl.upload-conversation-id', errors[0].message)

    def testRejectsMultipleOffendingLines(self):
        description = ('[devtools] Change\n\n'
                       'Explanation.\n\n'
                       'TAG=agy\n'
                       'CONV=c29008c7-cac9-4486-adb8-a74b42bd015e\n'
                       'BUG=12345\n'
                       'Bug: 12345\n')
        input_api = MockInputApi(description)
        output_api = MockOutputApi()

        errors = PRESUBMIT.CheckNoPiperTagsInDescription(input_api, output_api)
        self.assertEqual(len(errors), 1)
        self.assertIn('TAG=agy', errors[0].message)
        self.assertIn('CONV=c29008c7-cac9-4486-adb8-a74b42bd015e',
                      errors[0].message)
        self.assertIn('BUG=12345', errors[0].message)


if __name__ == '__main__':
    unittest.main()
