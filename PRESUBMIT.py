# Copyright 2014 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
DevTools presubmit script

See http://goo.gle/devtools-testing-guide#Presubmit-checks for more how to
run presubmit checks in DevTools.

See http://dev.chromium.org/developers/how-tos/depottools/presubmit-scripts
for more details about the presubmit API built into gcl.

`git cl presubmit -v -v` to debug presubmit checks.
"""

import re
import sys
import six
import time

from pathlib import Path

USE_PYTHON3 = True
PRESUBMIT_VERSION = '2.0.0'

_EXCLUDED_PATHS = [
    r'^extensions[\\/]cxx_debugging[\\/]e2e[\\/]runner\.py$',  # Lines too long
    r'^front_end[\\/]core[\\/]common[\\/]Color\.ts$',  # Apple copyright
    r'^front_end[\\/]core[\\/]common[\\/]Object\.ts$',  # Apple copyright
    r'^front_end[\\/]core[\\/]common[\\/]ResourceType\.ts$',  # Apple copyright
    # Apple copyright
    r'^front_end[\\/]core[\\/]dom_extension[\\/]DOMExtension\.ts$',
    r'^front_end[\\/]core[\\/]platform[\\/]UIString\.ts$',  # Apple copyright
    r'^front_end[\\/]core[\\/]sdk[\\/]Resource\.ts$',  # Apple copyright
    r'^front_end[\\/]core[\\/]sdk[\\/]Script\.ts$',  # Apple copyright
    r'^front_end[\\/]third_party[\\/].*',  # 3rd party code
    # Apple copyright
    r'^front_end[\\/]ui[\\/]legacy[\\/]components[\\/]data_grid[\\/]DataGrid\.ts$',
    r'^node_modules[\\/].*',  # 3rd party code
    r'^scripts[\\/]build[\\/]build_inspector_overlay\.py$',  # Lines too long
    r'^scripts[\\/]build[\\/]code_generator_frontend\.py$',
    r'^scripts[\\/]deps[\\/]manage_node_deps\.py$',  # Lines too long
    r'front_end[\\/]generated[\\/]ARIAProperties\.ts$'  # Auto-generated files
    # Auto-generated files
    r'front_end[\\/]generated[\\/]InspectorBackendCommands\.ts$'
]


def _ExecuteSubProcess(input_api,
                       output_api,
                       script_path,
                       script_arguments=None,
                       message=None):
    if isinstance(script_path, six.string_types):
        script_path = [input_api.python3_executable, script_path]

    start_time = time.time()
    process = input_api.subprocess.Popen(script_path +
                                         (script_arguments or []),
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    end_time = time.time()
    time_difference = end_time - start_time
    return [
        output_api.PresubmitError(
            "%s (%.1fs): %s" %
            (message if message is not None else script_path, time_difference,
             out.decode('utf-8').strip()))
    ] if process.returncode != 0 else []


def _IsEnvCog(input_api):
    old_sys_path = sys.path[:]
    devtools_root = input_api.PresubmitLocalPath()
    depot_tools = input_api.os_path.join(devtools_root, 'third_party',
                                         'depot_tools')
    try:
        sys.path.append(depot_tools)
        from gclient_utils import IsEnvCog
        if IsEnvCog():
            return True
    finally:
        sys.path = old_sys_path
    return False


def _GetAffectedFiles(input_api, parent_directories, excluded_actions,
                      accepted_endings):
    """Return absolute file paths of affected files (not due to an excluded action)
       under a parent directory with an accepted file ending.
    """
    local_paths = [
        f.AbsoluteLocalPath() for f in input_api.AffectedFiles()
        if all(f.Action() != action for action in excluded_actions)
    ]
    affected_files = [
        file_name for file_name in local_paths
        if any(parent_directory in file_name
               for parent_directory in parent_directories) and (
                   len(accepted_endings) == 0 or any(
                       file_name.endswith(accepted_ending)
                       for accepted_ending in accepted_endings))
    ]
    return affected_files


def _CheckWithNodeScript(input_api,
                         output_api,
                         script_path,
                         script_arguments=None,
                         allow_typescript=False,
                         message=None):
    original_sys_path = sys.path
    try:
        sys.path = sys.path + [
            input_api.os_path.join(input_api.PresubmitLocalPath(), 'scripts')
        ]
        import devtools_paths
    finally:
        sys.path = original_sys_path

    process = [devtools_paths.node_path(), script_path]

    if allow_typescript:
        process.insert(1, '--no-warnings=ExperimentalWarning')
        process.insert(1, '--experimental-strip-types')

    return _ExecuteSubProcess(input_api,
                              output_api,
                              process,
                              script_arguments=script_arguments,
                              message=message)


def _GetFilesToLint(input_api, lint_config_files, default_linted_directories,
                    accepted_endings):
    run_full_check = False
    files_to_lint = []

    # We are changing the lint configuration; run the full check.
    if len(lint_config_files) != 0:
        run_full_check = True
    else:
        # Only run the linter on files that are relevant, to save PRESUBMIT time.
        files_to_lint = _GetAffectedFiles(input_api,
                                          default_linted_directories, ['D'],
                                          accepted_endings)

        # Exclude front_end/third_party and front_end/generated files.
        files_to_lint = [
            file for file in files_to_lint
            if "front_end/third_party" not in file
            and "front_end/generated" not in file
        ]

    should_bail_out = len(files_to_lint) == 0 and not run_full_check
    return should_bail_out, files_to_lint


def _CheckFormat(input_api, output_api):
    if _IsEnvCog(input_api):
        return [
            output_api.PresubmitPromptWarning(
                'Non-git environment detected, skipping _CheckFormat.')
        ]

    return _ExecuteSubProcess(input_api,
                              output_api, ['git', 'cl', 'format', '--js'],
                              message='Format')


def CheckBugAssociationOnCommit(input_api, output_api):
    results = []
    bugs = input_api.change.BugsFromDescription()
    message = (
        "Each CL should be associated with a bug, use \'Bug:\' or \'Fixed:\' lines in\n"
        "the footer of the commit description. If you explicitly don\'t want to\n"
        "set a bug, use \'Bug: none\' in the footer of the commit description.\n\n"
        "Note: The footer of the commit description is the last block of lines in\n"
        "the commit description that doesn't contain empty lines. This means that\n"
        "any \'Bug:\' or \'Fixed:\' lines that are eventually followed by an empty\n"
        "line are not detected by this presubmit check.")

    if not bugs:
        results.append(output_api.PresubmitError(message))

    return results


def CheckExperimentTelemetry(input_api, output_api):
    experiment_telemetry_files = [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'entrypoints', 'main', 'MainImpl.ts'),
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'front_end',
                               'core', 'host', 'UserMetrics.ts')
    ]
    affected_main_files = _GetAffectedFiles(input_api,
                                            experiment_telemetry_files, [],
                                            ['.ts'])
    if len(affected_main_files) == 0:
        return []

    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                         'scripts', 'check_experiments.js')
    return _CheckWithNodeScript(input_api,
                                output_api,
                                script_path,
                                message='Experiment telemetry')


def CheckESBuildVersion(input_api, output_api):
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                         'scripts',
                                         'check_esbuild_versions.js')
    return _CheckWithNodeScript(input_api,
                                output_api,
                                script_path,
                                message='ESBuild version')


def CheckDevToolsLint(input_api, output_api):
    lint_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                       'scripts', 'test', 'run_lint_check.mjs')

    front_end_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'front_end')

    inspector_overlay_directory = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'inspector_overlay')
    test_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                            'test')
    scripts_directory = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                               'scripts')

    default_linted_directories = [
        front_end_directory,
        test_directory,
        scripts_directory,
        inspector_overlay_directory,
    ]

    lint_related_files = [
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               'eslint.config.mjs'),
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               '.stylelintrc.json'),
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               '.stylelintignore'),
        # This file includes the LitAnalyzer rules
        input_api.os_path.join(input_api.PresubmitLocalPath(),
                               'tsconfig.json'),
        input_api.os_path.join(scripts_directory, 'test',
                               'run_lint_check.mjs'),
    ]

    lint_related_directories = [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules'),
    ]

    lint_config_files = _GetAffectedFiles(
        input_api, lint_related_directories,
        [], [".js", ".mjs", ".ts"]) + _GetAffectedFiles(
            input_api, lint_related_files, [], [])

    should_bail_out, files_to_lint = _GetFilesToLint(
        input_api, lint_config_files, default_linted_directories,
        ['.css', '.mjs', '.js', '.ts'])
    if should_bail_out:
        return []

    # If there are more than 50 files to check, don't bother and check
    # everything, so as to not run into command line length limits on Windows.
    if len(files_to_lint) > 50:
        files_to_lint = []

    results = []
    results.extend(
        _CheckWithNodeScript(input_api,
                             output_api,
                             lint_path,
                             script_arguments=files_to_lint,
                             allow_typescript=True,
                             message="Lint"))

    results.extend(_CheckFormat(input_api, output_api))
    return results


def CheckGeneratedFiles(input_api, output_api):
    v8_directory_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                               'v8')
    blink_directory_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'third_party', 'blink')
    scripts_build_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                                'scripts', 'build')
    scripts_generated_output_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'front_end', 'generated')

    generated_aria_path = input_api.os_path.join(scripts_build_path,
                                                 'generate_aria.py')
    generated_supported_css_path = input_api.os_path.join(
        scripts_build_path, 'generate_supported_css.py')
    generated_deprecation_path = input_api.os_path.join(
        scripts_build_path, 'generate_deprecations.py')
    generated_protocol_path = input_api.os_path.join(
        scripts_build_path, 'code_generator_frontend.py')
    generated_protocol_typescript_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'scripts', 'protocol_typescript')
    concatenate_protocols_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'third_party', 'inspector_protocol',
        'concatenate_protocols.py')

    affected_files = _GetAffectedFiles(input_api, [
        v8_directory_path,
        blink_directory_path,
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'third_party',
                               'pyjson5'),
        generated_aria_path,
        generated_supported_css_path,
        generated_deprecation_path,
        concatenate_protocols_path,
        generated_protocol_path,
        scripts_generated_output_path,
        generated_protocol_typescript_path,
    ], [], ['.pdl', '.json5', '.py', '.js', '.ts'])

    if len(affected_files) == 0:
        return []

    generate_protocol_resources_path = input_api.os_path.join(
        input_api.PresubmitLocalPath(), 'scripts', 'deps',
        'generate_protocol_resources.py')

    return _ExecuteSubProcess(input_api,
                              output_api,
                              generate_protocol_resources_path,
                              message='Generated files')


def CheckL10nStrings(input_api, output_api):
    devtools_root = input_api.PresubmitLocalPath()
    devtools_front_end = input_api.os_path.join(devtools_root, 'front_end')
    script_path = input_api.os_path.join(devtools_root, 'third_party', 'i18n',
                                         'check-strings.js')
    affected_front_end_files = _GetAffectedFiles(
        input_api, [devtools_front_end, script_path], [], ['.js', '.ts'])
    if len(affected_front_end_files) == 0:
        return []
    return _CheckWithNodeScript(input_api,
                                output_api,
                                script_path, [devtools_front_end],
                                message='l10n strings')


def CheckForTooLargeFiles(input_api, output_api):
    """Avoid large files, especially binary files, in the repository since
  git doesn't scale well for those. They will be in everyone's repo
  clones forever, forever making Chromium slower to clone and work
  with."""
    # Uploading files to cloud storage is not trivial so we don't want
    # to set the limit too low, but the upper limit for "normal" large
    # files seems to be 1-2 MB, with a handful around 5-8 MB, so
    # anything over 20 MB is exceptional.
    TOO_LARGE_FILE_SIZE_LIMIT = 20 * 1024 * 1024  # 10 MB
    too_large_files = []
    for f in input_api.AffectedFiles():
        # Check both added and modified files (but not deleted files).
        if f.Action() in ('A', 'M'):
            size = input_api.os_path.getsize(f.AbsoluteLocalPath())
            if size > TOO_LARGE_FILE_SIZE_LIMIT:
                too_large_files.append("%s: %d bytes" % (f.LocalPath(), size))
    if too_large_files:
        message = (
            'Do not commit large files to git since git scales badly for those.\n'
            +
            'Instead put the large files in cloud storage and use DEPS to\n' +
            'fetch them.\n' + '\n'.join(too_large_files))
        return [
            output_api.PresubmitError('Too large files found in commit',
                                      long_text=message + '\n')
        ]
    return []


def CheckObsoleteScreenshotGoldens(input_api, output_api):
    script_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                         'scripts', 'test',
                                         'check_obsolete_goldens.js')
    return _CheckWithNodeScript(input_api,
                                output_api,
                                script_path,
                                script_arguments=[],
                                message='Obsolete screenshot images')


def CheckNodeModules(input_api, output_api):
    files = ['.clang-format', 'OWNERS', 'README.chromium']
    results = []
    for file in files:
        file_path = input_api.os_path.join(input_api.PresubmitLocalPath(),
                                           'node_modules', file)
        if not Path(file_path).is_file():
            results.extend([
                output_api.PresubmitError(
                    "node_modules/%s is missing. Use `npm run install-deps` to re-create it."
                    % file)
            ])

    node_module_files = _GetAffectedFiles(input_api, [
        input_api.os_path.join(input_api.PresubmitLocalPath(), 'node_modules')
    ], [], [])

    # If the changes are above 100 assume that touching the node_modules
    # was intentional
    if len(node_module_files) == 0 or len(node_module_files) > 100:
        return results

    message = (
        "Changes to `node_modules` detected.\n" +
        "This is third party code and should not be modified.\n" +
        "`node_module` are mainly used in testing infra\n" +
        "For bug fixes and features usually you should not need this change.\n"
        + "Was this change intentional?")
    results.extend([
        output_api.PresubmitPromptWarning(
            message,
            locations=[
                output_api.PresubmitResultLocation(
                    # Location expects relative path
                    # But _GetAffectedFiles returns us absolute path
                    input_api.os_path.relpath(
                        node_module_files[0],
                        input_api.PresubmitLocalPath()), ),
            ])
    ])

    return results


def CheckNoUncheckedFiles(input_api, output_api):
    if _IsEnvCog(input_api):
        return []

    process = input_api.subprocess.Popen(['git', 'diff', '--exit-code'],
                                         stdout=input_api.subprocess.PIPE,
                                         stderr=input_api.subprocess.STDOUT)
    out, _ = process.communicate()
    if process.returncode != 0:
        files_changed_process = input_api.subprocess.Popen(
            ['git', 'diff'],
            stdout=input_api.subprocess.PIPE,
            stderr=input_api.subprocess.STDOUT)
        files_changed, _ = files_changed_process.communicate()

        return [
            output_api.PresubmitError(
                'You have changed files that need to be committed:\n%s' %
                (files_changed.decode('utf-8').strip()))
        ]

    return []


def CheckKnownContextValues(input_api, output_api):
    """Ensure all additions to `KnownContextValues.ts` following the naming convention.

    This check ensures that all new cases added to the enum in `KnownContextValues.ts`
    follow the extended Kebab Case naming convention. Specifically it doesn't look at
    unchanged lines, because there are various existing values that cannot be changed
    (easily).
    """
    # This regexp matches the one we use in `StringUtilities.isExtendedKebabCase()`.
    kebab_case_re = re.compile(
        r"^([a-z0-9]+(?:-[a-z0-9]+)*\.)*[a-z0-9]+(?:-[a-z0-9]+)*$")
    local_path = input_api.os_path.join('front_end', 'ui', 'visual_logging',
                                        'KnownContextValues.ts')
    invalid_contexts = []
    for f in filter(
            lambda x: (x.LocalPath() == local_path and x.Action() == 'M'),
            input_api.AffectedFiles()):
        # Loop only through the changed lines of the affected file.
        for _, line in f.ChangedContents():
            match = re.search(r"\s+'(.+)',", line)
            if match:
                context = match.group(1)
                if not kebab_case_re.match(context):
                    invalid_contexts.append(context)
                    continue

    if not invalid_contexts:
        return []
    return [
        output_api.PresubmitError(
            message=f"Invalid jslog context(s): {', '.join(invalid_contexts)}",
            long_text=
            ("""The jslog contexts must follow the extended Kebab Case naming convention, where
words are separated with either a dash (`-`) or a dot (`.`), and all characters
must be lower-case alphanumeric.
"""),
            locations=[
                output_api.PresubmitResultLocation(file_path=local_path)
            ],
        )
    ]



# Canned check wrappers below.


def _TextFilesOnlyFilter(file):
    """Filter that yields only text files.

    Filters files based on prefixes and extensions that should not be treated as
    text files for the canned checks below.
    """
    excluded_prefixes = [
        'node_modules',
        'third_party',
        'front_end/third_party',
        'extensions/cxx_debugging/third_party',
    ]
    excluded_extensions = [
        '.png', '.webm', '.svg', '.avif', '.rawresponse', '.gz'
    ]

    if any(file.LocalPath().startswith(prefix)
           for prefix in excluded_prefixes):
        return False
    if any(file.LocalPath().endswith(ext) for ext in excluded_extensions):
        return False
    return True


def CheckChangeHasNoCrAndHasOnlyOneEol(input_api, output_api):
    return input_api.canned_checks.CheckChangeHasNoCrAndHasOnlyOneEol(
        input_api, output_api, source_file_filter=_TextFilesOnlyFilter)


def CheckGenderNeutral(input_api, output_api):
    return input_api.canned_checks.CheckGenderNeutral(input_api, output_api)


def CheckAuthorizedAuthor(input_api, output_api):
    return input_api.canned_checks.CheckAuthorizedAuthor(
        input_api,
        output_api,
        bot_allowlist=[
            'chrome-cherry-picker@chops-service-accounts.iam.gserviceaccount.com',
            'devtools-ci-autoroll-builder@chops-service-accounts.iam.gserviceaccount.com',
        ])


def CheckPanProjectChecksOnCommit(input_api, output_api):
    return input_api.canned_checks.PanProjectChecks(
        input_api, output_api, excluded_paths=_EXCLUDED_PATHS, maxlen=120)
