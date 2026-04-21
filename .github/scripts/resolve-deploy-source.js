module.exports = async ({ github, context, core }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  async function findMergedPr(sha) {
    const { data: prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
      owner,
      repo,
      commit_sha: sha,
    });
    return prs.find((pr) => pr.merged_at && pr.base.ref === 'master') ?? null;
  }

  if (context.eventName === 'push') {
    const sha = context.sha;
    const pr = await findMergedPr(sha);

    if (!pr) {
      core.warning(`Push commit ${sha.slice(0, 7)} is not PR-backed — skipping deploy`);
      core.setOutput('should_deploy', 'false');
      return;
    }

    core.info(`Push backed by PR #${pr.number} — deploying`);
    core.setOutput('should_deploy', 'true');
    core.setOutput('deploy_ref', sha);
    core.setOutput('pr_number', String(pr.number));
    core.setOutput('pr_url', pr.html_url);
    return;
  }

  if (context.eventName === 'workflow_run') {
    const run = context.payload.workflow_run;

    if (run.conclusion !== 'success') {
      core.warning(`Upstream workflow ended with '${run.conclusion}' — skipping deploy`);
      core.setOutput('should_deploy', 'false');
      return;
    }

    // For workflow_run events, GitHub exposes the current default-branch SHA as context.sha.
    // That is the merged commit we want to deploy after PR Auto Merge completes.
    const sha = context.sha || run.head_sha;
    const pr = await findMergedPr(sha);

    if (!pr) {
      core.warning(
        `No merged PR found for commit ${sha.slice(0, 7)} (upstream head ${run.head_sha.slice(0, 7)}) — skipping deploy`,
      );
      core.setOutput('should_deploy', 'false');
      return;
    }

    core.info(`workflow_run backed by PR #${pr.number} — deploying`);
    core.setOutput('should_deploy', 'true');
    core.setOutput('deploy_ref', sha);
    core.setOutput('pr_number', String(pr.number));
    core.setOutput('pr_url', pr.html_url);
    return;
  }

  core.warning(`Unexpected event: ${context.eventName}`);
  core.setOutput('should_deploy', 'false');
};
