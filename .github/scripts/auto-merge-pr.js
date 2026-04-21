module.exports = async ({ github, context, core }) => {
  const run = context.payload.workflow_run;
  const mergeMethod = (process.env.MERGE_METHOD || 'MERGE').toLowerCase();

  const { data: prs } = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    base: 'master',
    head: `${context.repo.owner}:${run.head_branch}`,
  });

  if (prs.length === 0) {
    core.warning(`No open PR found for branch: ${run.head_branch}`);
    return;
  }

  const pr = prs[0];

  if (pr.draft) {
    core.info(`PR #${pr.number} is a draft — skipping`);
    return;
  }

  if (pr.state !== 'open') {
    core.info(`PR #${pr.number} is ${pr.state} — skipping`);
    return;
  }

  if (pr.base.ref !== 'master') {
    core.info(`PR #${pr.number} targets '${pr.base.ref}', not master — skipping`);
    return;
  }

  core.info(`Merging PR #${pr.number}: ${pr.title}`);

  await github.rest.pulls.merge({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pr.number,
    merge_method: mergeMethod,
  });

  core.info(`PR #${pr.number} merged successfully`);
};
