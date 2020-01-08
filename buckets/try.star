load('//lib/builders.star',
  'builder',
  'acls',
  'defaults',
  'dimensions',
)

BUCKET_NAME='try'
SERVICE_ACCOUNT="devtools-frontend-try-builder@chops-service-accounts.iam.gserviceaccount.com"

luci.bucket(
  name=BUCKET_NAME,
  acls=[
    acls.readers,
    acl.entry(
      roles=acl.BUILDBUCKET_TRIGGERER,
      groups=[
        'project-devtools-committers',
        'service-account-cq',
      ]
    ),
  ],
)

try_builders=[]

def try_builder(**kvargs):
  builder(
    bucket=BUCKET_NAME,
    mastername="tryserver.devtools-frontend",
    service_account=SERVICE_ACCOUNT,
    **kvargs
  )
  try_builders.append(kvargs['name'])

def presubmit_builder(name, dimensions):
  try_builder(
    name=name,
    recipe_name="run_presubmit",
    dimensions=dimensions,
    properties={
      "runhooks":True,
      "solution_name":"devtools-frontend"
    },
    priority=25,
    execution_timeout=5 * time.minute,
  )

presubmit_builder(
  name="devtools_frontend_presubmit",
  dimensions=dimensions.ubuntu,
)

presubmit_builder(
  name="dtf_presubmit_win64",
  dimensions=dimensions.win10,
)

try_builder(
  name="devtools_frontend_linux_blink_rel",
  recipe_name="chromium_trybot",
  dimensions=dimensions.ubuntu,
  execution_timeout=2 * time.hour,
  build_numbers=True,
)

try_builder(
  name="devtools_frontend_linux_blink_light_rel",
  recipe_name="chromium_trybot",
  dimensions=dimensions.baremetal_ubuntu,
  execution_timeout=2 * time.hour,
  build_numbers=True,
)

try_builder(
  name="devtools_frontend_linux_rel",
  recipe_name="devtools/devtools-frontend",
  dimensions=dimensions.ubuntu,
  execution_timeout=2 * time.hour,
)

luci.list_view(
  name="tryserver",
  title="Tryserver",
  favicon=defaults.favicon,
  entries =[luci.list_view_entry(builder=b) for b in try_builders],
)

cq_acls=[
  acl.entry(
    [acl.CQ_COMMITTER],
    groups=['project-devtools-committers']
  ),
  acl.entry(
    [acl.CQ_DRY_RUNNER],
    groups=['project-devtools-committers']
  )
]

cq_retry_config=cq.retry_config(
  single_quota=2,
  global_quota=4,
  failure_weight=2,
  transient_failure_weight=1,
  timeout_weight=4,
)

cq_master_builders=[
  ('devtools_frontend_linux_blink_light_rel'),
  ('devtools_frontend_linux_rel'),
  ('devtools_frontend_presubmit'),
  ('dtf_presubmit_win64')
]

luci.cq_group(
  name="master",
  watch=cq.refset(
    repo="https://chromium.googlesource.com/devtools/devtools-frontend",
    refs=["refs/heads/master"]
  ),
  acls=cq_acls,
  tree_status_host="devtools-status.appspot.com",
  retry_config=cq_retry_config,
  verifiers=[
    luci.cq_tryjob_verifier(
        builder=builder,
        disable_reuse=("presubmit" in builder)
    ) for builder in cq_master_builders
  ],
)

luci.cq_group(
  name="infra/config",
  watch=cq.refset(
    repo="https://chromium.googlesource.com/devtools/devtools-frontend",
    refs=["refs/heads/infra/config"]
  ),
  acls=cq_acls,
  retry_config=cq_retry_config,
  verifiers=[
    luci.cq_tryjob_verifier(builder="devtools_frontend_presubmit", disable_reuse=True)
  ],
)