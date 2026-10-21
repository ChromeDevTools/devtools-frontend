#!/usr/bin/env vpython3
# Copyright 2026 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Unit tests for the node_modules archive tooling in manage_node_deps.py."""

import contextlib
import io
import os
import shutil
import tarfile
import tempfile
import textwrap
import unittest
from unittest import mock

import manage_node_deps


def write(root, relpath, content='', mode=None):
    full = os.path.join(root, relpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)
    if mode is not None:
        os.chmod(full, mode)
    return full


def symlink(root, relpath, target):
    full = os.path.join(root, relpath)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    os.symlink(target, full)
    return full


class PostProcessTest(unittest.TestCase):
    """The package.json rewrites that run after `npm install`."""

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.tmp = tmpdir.name
        self.node_modules = os.path.join(self.tmp, 'node_modules')
        self.package_json = os.path.join(self.tmp, 'package.json')
        for name, value in (('node_modules_path', self.node_modules),
                            ('package_json_path', self.package_json)):
            patcher = mock.patch.object(manage_node_deps.devtools_paths,
                                        name,
                                        return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def read(self, relpath):
        with open(os.path.join(self.tmp, relpath), encoding='utf-8') as f:
            return f.read()

    def test_remove_package_json_entries_drops_dependencies(self):
        write(
            self.tmp, 'package.json',
            textwrap.dedent("""\
                {
                  "name": "devtools-frontend",
                  "dependencies": {
                    "left-pad": "1.0.0"
                  },
                  "devDependencies": {
                    "typescript": "5.0.0"
                  }
                }
                """))
        with contextlib.redirect_stdout(io.StringIO()):
            failed = manage_node_deps.remove_package_json_entries()
        self.assertFalse(failed)
        self.assertEqual(
            self.read('package.json'),
            textwrap.dedent("""\
                {
                  "name": "devtools-frontend",
                  "devDependencies": {
                    "typescript": "5.0.0"
                  }
                }
                """))

    def test_strip_private_fields_removes_underscore_keys(self):
        write(
            self.node_modules, 'pkg/package.json',
            textwrap.dedent("""\
                {
                  "name": "pkg",
                  "_resolved": "https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz",
                  "version": "1.0.0",
                  "_integrity": "sha512-abc"
                }
                """))
        with contextlib.redirect_stdout(io.StringIO()):
            failed = manage_node_deps.strip_private_fields()
        self.assertFalse(failed)
        self.assertEqual(
            self.read('node_modules/pkg/package.json'),
            textwrap.dedent("""\
                {
                  "name": "pkg",
                  "version": "1.0.0"
                }
                """))

    def test_strip_private_fields_leaves_clean_files_untouched(self):
        # Re-serializing would still change files without private fields,
        # e.g. json.dump escapes non-ASCII that npm writes verbatim. Such
        # files must stay byte-identical so a plain install leaves a clean
        # tree clean.
        original = '{"name":"fast-uri","author":{"name":"Gürgün Dayıoğlu"}}\n'
        write(self.node_modules, 'fast-uri/package.json', original)
        with contextlib.redirect_stdout(io.StringIO()):
            failed = manage_node_deps.strip_private_fields()
        self.assertFalse(failed)
        self.assertEqual(self.read('node_modules/fast-uri/package.json'),
                         original)


class ArchiveTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.tmp = tmpdir.name
        self.tree = os.path.join(self.tmp, 'node_modules')
        os.makedirs(self.tree)

    def make_tree(self):
        write(self.tree, 'pkg/package.json', '{"name": "pkg"}')
        write(self.tree, 'pkg/bin/pkg.js', '#!/usr/bin/env node\n', 0o755)
        write(self.tree, 'pkg/index.d.ts', 'export {};')
        write(self.tree, '@scope/other/index.js', 'module.exports = 1;')
        symlink(self.tree, '.bin/pkg', '../pkg/bin/pkg.js')

    def archive(self, name='out.tar.gz'):
        out = os.path.join(self.tmp, name)
        digest, tar_digest = manage_node_deps.create_archive(self.tree, out)
        # The tar-stream digest is what --check falls back to; it must describe
        # exactly the bytes inside the gzip container.
        with open(out, 'rb') as f:
            self.assertEqual(manage_node_deps.tar_stream_sha256(f), tar_digest)
        return out, digest

    def test_archive_is_deterministic(self):
        self.make_tree()
        _, first = self.archive('first.tar.gz')
        # Metadata that must not influence the result.
        for dirpath, _, filenames in os.walk(self.tree):
            for filename in filenames:
                full = os.path.join(dirpath, filename)
                if not os.path.islink(full):
                    os.utime(full, (1234567890, 1234567890))
        os.chmod(os.path.join(self.tree, 'pkg', 'index.d.ts'), 0o600)
        _, second = self.archive('second.tar.gz')
        self.assertEqual(first, second)

    def test_archive_layout_and_normalization(self):
        self.make_tree()
        out, _ = self.archive()
        with tarfile.open(out, 'r:gz') as tar:
            members = tar.getmembers()
        names = [m.name for m in members]
        self.assertEqual(names, sorted(names))
        self.assertIn('pkg/package.json', names)
        self.assertIn('@scope/other/index.js', names)
        self.assertNotIn('node_modules/pkg/package.json', names)
        by_name = {m.name: m for m in members}
        self.assertTrue(by_name['.bin/pkg'].issym())
        self.assertEqual(by_name['.bin/pkg'].linkname, '../pkg/bin/pkg.js')
        self.assertEqual(by_name['pkg/bin/pkg.js'].mode, 0o755)
        self.assertEqual(by_name['pkg/index.d.ts'].mode, 0o644)
        self.assertEqual(by_name['pkg'].mode, 0o755)
        for member in members:
            self.assertEqual((member.uid, member.gid, member.uname,
                              member.gname, member.mtime), (0, 0, '', '', 0))

    def test_archive_skips_gclient_artifacts_at_root(self):
        self.make_tree()
        write(self.tree, 'node_modules.tar.gz', 'stale')
        write(self.tree, '.devtools-frontend_abc_hash', 'abc')
        write(self.tree, '.devtools-frontend_abc_is_first_class_gcs', '1')
        write(self.tree, '.devtools-frontend_abc_content_names', '[]')
        write(self.tree, 'pkg/.deep_hash', 'kept, only root artifacts skip')
        out, _ = self.archive()
        with tarfile.open(out, 'r:gz') as tar:
            names = tar.getnames()
        self.assertNotIn('node_modules.tar.gz', names)
        self.assertFalse([n for n in names if n.startswith('.devtools')])
        self.assertIn('pkg/.deep_hash', names)

    def test_archive_rebuilt_from_extracted_tree_matches(self):
        self.make_tree()
        out, original = self.archive()
        extracted = os.path.join(self.tmp, 'extracted')
        os.makedirs(extracted)
        with tarfile.open(out, 'r:gz') as tar:
            tar.extractall(extracted, filter='data')
        # What gclient leaves behind in the dependency directory.
        shutil.copy(out, os.path.join(extracted, 'node_modules.tar.gz'))
        write(extracted, '.devtools-frontend_x_hash', original)
        write(extracted, '.devtools-frontend_x_is_first_class_gcs', '1')
        write(extracted, '.devtools-frontend_x_content_names', '[]')
        rebuilt, _ = manage_node_deps.create_archive(
            extracted, os.path.join(self.tmp, 'rebuilt.tar.gz'))
        self.assertEqual(original, rebuilt)

    def test_archive_rejects_dangling_symlink(self):
        self.make_tree()
        symlink(self.tree, '.bin/gone', '../gone/bin/gone.js')
        with self.assertRaises(ValueError):
            self.archive()

    def test_archive_rejects_symlink_escaping_tree(self):
        self.make_tree()
        outside = write(self.tmp, 'outside.js', '')
        symlink(self.tree, '.bin/outside', outside)
        with self.assertRaises(ValueError):
            self.archive()

    def test_archive_rejects_missing_or_empty_tree(self):
        out = os.path.join(self.tmp, 'out.tar.gz')
        with self.assertRaises(ValueError):
            manage_node_deps.create_archive(
                os.path.join(self.tmp, 'does_not_exist'), out)
        with self.assertRaises(ValueError):
            manage_node_deps.create_archive(self.tree, out)  # exists, empty
        # Only gclient artifacts present is still "empty".
        write(self.tree, 'node_modules.tar.gz', 'stale')
        with self.assertRaises(ValueError):
            manage_node_deps.create_archive(self.tree, out)
        self.assertFalse(os.path.exists(out))


class DepsTest(unittest.TestCase):

    DEPS = textwrap.dedent("""\
        deps = {
          'third_party/esbuild': {
            'packages': [{'package': 'infra/3pp/tools/esbuild/${{platform}}',
                          'version': 'version:3@0.28.2.chromium.2'}],
            'dep_type': 'cipd',
          },
          'node_modules': {
            'dep_type': 'gcs',
            'bucket': 'chromium-nodejs',
            'condition': 'non_git_source',
            'objects': [
              {
                'object_name': 'devtools-frontend/%s',
                'sha256sum': '%s',
                'size_bytes': 33012345,
                'generation': 1790681952304657,
                'output_file': 'node_modules.tar.gz',
              },
            ],
          },
          'third_party/node/linux': {
            'dep_type': 'gcs',
            'bucket': 'chromium-nodejs',
            'objects': [{'object_name': 'other', 'sha256sum': '%s',
                         'size_bytes': 1, 'generation': 2}],
          },
        }
        """) % ('a' * 64, 'a' * 64, 'b' * 64)

    def test_parse_deps_entry(self):
        entry = manage_node_deps.parse_deps_entry(self.DEPS)
        self.assertEqual(
            entry, {
                'object_name': 'devtools-frontend/' + 'a' * 64,
                'sha256sum': 'a' * 64,
                'size_bytes': 33012345,
                'generation': 1790681952304657,
            })

    def test_parse_deps_entry_missing(self):
        self.assertIsNone(
            manage_node_deps.parse_deps_entry(self.DEPS, 'does_not_exist'))
        self.assertIsNone(
            manage_node_deps.parse_deps_entry(self.DEPS,
                                              'third_party/esbuild'))

    def test_parse_deps_entry_accepts_double_quotes(self):
        # DEPS mixes quote styles (see the ai_evals entry in DEPS).
        entry = manage_node_deps.parse_deps_entry(self.DEPS.replace("'", '"'))
        self.assertEqual(entry['object_name'], 'devtools-frontend/' + 'a' * 64)
        self.assertEqual(entry['size_bytes'], 33012345)

    def test_format_deps_entry_round_trips(self):
        snippet = manage_node_deps.format_deps_entry(
            'devtools-frontend/' + 'e' * 64, 'e' * 64, 42, 7)
        deps_text = 'deps = {\n%s\n}\n' % snippet
        self.assertEqual(
            manage_node_deps.parse_deps_entry(deps_text), {
                'object_name': 'devtools-frontend/' + 'e' * 64,
                'sha256sum': 'e' * 64,
                'size_bytes': 42,
                'generation': 7,
            })
        self.assertIn("'output_file': 'node_modules.tar.gz'", snippet)
        self.assertIn("'condition': 'non_git_source'", snippet)

    def test_extract_json_blob(self):
        output = ('Uploading out/node_modules.tar.gz as gs://x/y\n'
                  '{\n  "path": {"objects": [{"generation": 5}]}\n}\n')
        blob = manage_node_deps.extract_json_blob(output)
        self.assertEqual(blob['path']['objects'][0]['generation'], 5)
        with self.assertRaises(ValueError):
            manage_node_deps.extract_json_blob('no json here')

    def test_update_deps_without_entry_prints_snippet(self):
        with tempfile.TemporaryDirectory() as tmp:
            deps = write(tmp, 'DEPS', "deps = {\n  'a': {'url': 'x'},\n}\n")
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                failed = manage_node_deps.update_deps(
                    deps, 'devtools-frontend/' + 'c' * 64, 'c' * 64, 10, 7)
        self.assertFalse(failed)
        # Whatever was printed must be a valid entry once pasted into DEPS.
        printed = out.getvalue()[out.getvalue().index("  'node_modules'"):]
        self.assertEqual(
            manage_node_deps.parse_deps_entry('deps = {\n%s}\n' %
                                              printed)['sha256sum'], 'c' * 64)

    def test_update_deps_runs_setdep(self):
        with tempfile.TemporaryDirectory() as tmp:
            deps = write(tmp, 'DEPS', self.DEPS)
            with mock.patch.object(manage_node_deps.subprocess,
                                   'check_call') as check_call:
                with contextlib.redirect_stdout(io.StringIO()):
                    failed = manage_node_deps.update_deps(
                        deps, 'devtools-frontend/' + 'd' * 64, 'd' * 64, 11, 9)
        self.assertFalse(failed)
        cmd = check_call.call_args[0][0]
        self.assertIn('setdep', cmd)
        self.assertIn(
            'node_modules@devtools-frontend/%s,%s,11,9' % ('d' * 64, 'd' * 64),
            cmd)
        self.assertIn('--deps-file=%s' % deps, cmd)

    def test_update_deps_is_noop_when_current(self):
        with tempfile.TemporaryDirectory() as tmp:
            deps = write(tmp, 'DEPS', self.DEPS)
            with mock.patch.object(manage_node_deps.subprocess,
                                   'check_call') as check_call:
                with contextlib.redirect_stdout(io.StringIO()):
                    failed = manage_node_deps.update_deps(
                        deps, 'devtools-frontend/' + 'a' * 64, 'a' * 64,
                        33012345, 1790681952304657)
        self.assertFalse(failed)
        check_call.assert_not_called()


class ReferencesTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.root = tmpdir.name
        self.node_modules = os.path.join(self.root, 'node_modules')
        write(
            self.root, 'scripts/build/typescript.gni', """
            inputs = [
              "//node_modules/@types/node/index.d.ts",
              "../../node_modules/typescript/lib/tsc.js",
            ]
            node_modules_dir = "node_modules/"
            glob = "node_modules/*"
            """)
        write(self.root, 'scripts/tool.py',
              "p = path.join(root, 'node_modules/svgo/package.json')\n")
        # Another project's node_modules directory, not ours.
        write(self.root, 'extensions/e2e/runner.py',
              "x = 'extensions/e2e/node_modules/nested/index.js'\n")
        # Not scanned: wrong suffix, test fixtures, or skipped directories.
        write(self.root, 'front_end/a.ts', "import 'node_modules/ignored/x';")
        write(self.root, 'scripts/x_unittest.py', "'node_modules/fixture/y'")
        write(self.root, 'node_modules/x.py', "'node_modules/also/ignored'")
        write(self.root, 'third_party/x.gni', "'node_modules/not/scanned'")

    def test_collects_references(self):
        refs = manage_node_deps.referenced_node_module_paths(self.root)
        self.assertEqual(refs, {
            '@types/node/index.d.ts', 'typescript/lib/tsc.js',
            'svgo/package.json'
        })

    def test_verify_references(self):
        write(self.node_modules, '@types/node/index.d.ts')
        write(self.node_modules, 'typescript/lib/tsc.js')
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            failed = manage_node_deps.verify_references(
                self.node_modules, self.root)
        self.assertTrue(failed)
        self.assertIn('svgo/package.json', out.getvalue())

        write(self.node_modules, 'svgo/package.json')
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertFalse(
                manage_node_deps.verify_references(self.node_modules,
                                                   self.root))


@unittest.skipIf(shutil.which('rsync') is None, 'rsync is not installed')
class FilterTest(unittest.TestCase):

    def setUp(self):
        tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(tmpdir.cleanup)
        self.tmp = tmpdir.name
        self.node_modules = os.path.join(self.tmp, 'node_modules')
        write(self.node_modules, 'pkg/package.json', '{}')
        write(self.node_modules, 'pkg/bin/pkg.js', '', 0o755)
        write(self.node_modules, 'pkg/index.d.ts')
        write(self.node_modules, 'pkg/src/index.ts')
        write(self.node_modules, 'pkg/README.md')
        write(self.node_modules, 'pkg/LICENSE.md')
        write(self.node_modules, 'pkg/test/pkg_test.js')
        write(self.node_modules, 'pkg/.github/workflows/ci.yml')
        write(self.node_modules, '.package-lock.json', '{}')
        symlink(self.node_modules, '.bin/pkg', '../pkg/bin/pkg.js')
        self.exclude = write(
            self.tmp, 'npm_exclude.txt',
            textwrap.dedent("""\
                + /.bin/
                + /.bin/***
                + *.d.ts
                + LICENSE*
                */.*
                */test/
                *.md
                *.ts
                """))

    def test_filter_applies_rules_and_swaps_tree(self):
        staging = os.path.join(self.tmp, 'staging')
        with contextlib.redirect_stdout(io.StringIO()):
            failed = manage_node_deps.filter_node_modules(
                self.exclude, self.node_modules, staging)
        self.assertFalse(failed)
        self.assertFalse(os.path.exists(staging))
        self.assertFalse(os.path.exists(self.node_modules + '.old'))

        remaining = set()
        for dirpath, _, filenames in os.walk(self.node_modules):
            for filename in filenames:
                remaining.add(
                    os.path.relpath(os.path.join(dirpath, filename),
                                    self.node_modules))
        self.assertEqual(
            remaining, {
                '.bin/pkg', '.package-lock.json', 'pkg/package.json',
                'pkg/bin/pkg.js', 'pkg/index.d.ts', 'pkg/LICENSE.md'
            })
        self.assertTrue(
            os.path.islink(os.path.join(self.node_modules, '.bin', 'pkg')))
        self.assertTrue(
            os.access(os.path.join(self.node_modules, 'pkg/bin/pkg.js'),
                      os.X_OK))

    def test_filter_requires_exclude_file(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertTrue(
                manage_node_deps.filter_node_modules(
                    os.path.join(self.tmp, 'missing.txt'), self.node_modules,
                    os.path.join(self.tmp, 'staging')))
        self.assertTrue(os.path.isdir(self.node_modules))

    def test_filter_stages_next_to_node_modules(self):
        # Staging must share node_modules' filesystem (os.rename fails across
        # devices), so the default is a sibling directory, not out/.
        with contextlib.redirect_stdout(io.StringIO()):
            failed = manage_node_deps.filter_node_modules(
                self.exclude, self.node_modules)
        self.assertFalse(failed)
        self.assertFalse(os.path.exists(self.node_modules + '.filtered'))
        self.assertFalse(os.path.exists(self.node_modules + '.old'))
        self.assertTrue(
            os.path.isfile(os.path.join(self.node_modules, 'pkg/index.d.ts')))

    def test_filter_restores_tree_when_swap_fails(self):
        original = set()
        for dirpath, _, filenames in os.walk(self.node_modules):
            for filename in filenames:
                original.add(
                    os.path.relpath(os.path.join(dirpath, filename),
                                    self.node_modules))
        real_rename = os.rename

        def failing_rename(src, dst):
            if src.endswith('.filtered'):
                raise OSError(18, 'Invalid cross-device link')
            return real_rename(src, dst)

        with mock.patch.object(manage_node_deps.os, 'rename', failing_rename):
            with contextlib.redirect_stdout(io.StringIO()):
                failed = manage_node_deps.filter_node_modules(
                    self.exclude, self.node_modules)
        self.assertTrue(failed)
        restored = set()
        for dirpath, _, filenames in os.walk(self.node_modules):
            for filename in filenames:
                restored.add(
                    os.path.relpath(os.path.join(dirpath, filename),
                                    self.node_modules))
        self.assertEqual(restored, original)
        self.assertFalse(os.path.exists(self.node_modules + '.old'))
        self.assertFalse(os.path.exists(self.node_modules + '.filtered'))


class MainTest(unittest.TestCase):

    def setUp(self):
        for name in ('run_npm_command', 'filter_node_modules',
                     'add_marker_files', 'verify_references',
                     'archive_node_modules', 'upload_archive',
                     'check_archive'):
            patcher = mock.patch.object(manage_node_deps,
                                        name,
                                        return_value=False)
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def test_default_only_installs(self):
        self.assertEqual(manage_node_deps.main([]), 0)
        self.run_npm_command.assert_called_once()
        self.filter_node_modules.assert_not_called()
        self.archive_node_modules.assert_not_called()
        self.upload_archive.assert_not_called()

    def test_install_failure_stops(self):
        self.run_npm_command.return_value = True
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(manage_node_deps.main(['--filter']), 1)
        self.filter_node_modules.assert_not_called()

    def test_filter_then_archive(self):
        argv = [
            '--skip-install', '--filter', '--archive', '--archive-path',
            '/tmp/x.tar.gz'
        ]
        self.assertEqual(manage_node_deps.main(argv), 0)
        self.run_npm_command.assert_not_called()
        self.filter_node_modules.assert_called_once_with(None)
        self.add_marker_files.assert_called_once()
        self.verify_references.assert_called_once()
        self.archive_node_modules.assert_called_once_with('/tmp/x.tar.gz')

    def test_upload_implies_archive(self):
        argv = [
            '--skip-install', '--upload', '--archive-path', '/tmp/x.tar.gz'
        ]
        self.assertEqual(manage_node_deps.main(argv), 0)
        self.archive_node_modules.assert_called_once_with('/tmp/x.tar.gz')
        self.upload_archive.assert_called_once_with('/tmp/x.tar.gz', None)

    def test_check_does_not_install(self):
        argv = [
            '--check', '--archive-path', '/tmp/x.tar.gz', '--deps-file',
            '/tmp/DEPS'
        ]
        self.assertEqual(manage_node_deps.main(argv), 0)
        self.run_npm_command.assert_not_called()
        self.check_archive.assert_called_once_with('/tmp/x.tar.gz',
                                                   '/tmp/DEPS')
        self.archive_node_modules.assert_not_called()


if __name__ == '__main__':
    unittest.main()
