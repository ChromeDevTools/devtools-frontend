#!/usr/bin/env lucicfg
# Tell lucicfg what files it is allowed to touch
lucicfg.config(
    config_dir = 'generated',
    tracked_files = [
        'commit-queue.cfg',
        'cr-buildbucket.cfg',
        'luci-logdog.cfg',
        'luci-milo.cfg',
        'luci-scheduler.cfg',
        'project.cfg',
    ],
    fail_on_warnings = True,
)
# Copy the not-yet migrated files to the generated outputs
# TODO(https://crbug.com/1011908) Migrate the configuration in these files to starlark
[lucicfg.emit(dest = f, data = io.read_file(f)) for f in (
    'commit-queue.cfg',
    'cr-buildbucket.cfg',
    'luci-logdog.cfg',
    'luci-milo.cfg',
    'luci-scheduler.cfg',
    'project.cfg',
)]