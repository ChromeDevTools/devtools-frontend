#!/usr/bin/env lucicfg

# Tell lucicfg what files it is allowed to touch
lucicfg.config(
  config_dir='generated',
  tracked_files=[
    'commit-queue.cfg',
    'cr-buildbucket.cfg',
    'luci-logdog.cfg',
    'luci-milo.cfg',
    'luci-scheduler.cfg',
    'project.cfg',
  ],
  fail_on_warnings=True,
)

luci.project(
  name='devtools-frontend',
  buildbucket='cr-buildbucket.appspot.com',
  logdog="luci-logdog",
  milo="luci-milo",
  scheduler='luci-scheduler',
  swarming='chromium-swarm.appspot.com',
  acls=[
    acl.entry(
      [
        acl.BUILDBUCKET_READER,
        acl.LOGDOG_READER,
        acl.PROJECT_CONFIGS_READER,
        acl.SCHEDULER_READER,
      ],
      groups=["all"],
    ),
    acl.entry(
      [acl.SCHEDULER_OWNER],
      groups=[
        'project-devtools-sheriffs',
        'project-v8-admins',
      ]
    ),
    acl.entry(
      [acl.LOGDOG_WRITER],
      groups=['luci-logdog-chromium-writers']
    )
  ],
)

luci.milo(
  logo="https://storage.googleapis.com/chrome-infra-public/logo/devtools.svg",
)

luci.logdog(gs_bucket="chromium-luci-logdog")

luci.cq(
  submit_max_burst=1,
  submit_burst_delay=60 * time.second,
  status_host="chromium-cq-status.appspot.com",
)

exec('//buckets/ci.star')
exec('//buckets/try.star')