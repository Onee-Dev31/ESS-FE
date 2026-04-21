module.exports = async ({ github, context, core }) => {
  const sha = context.sha;
  const shouldFail = process.env.FAIL_IF_NOT_PR_BACKED !== 'false';

  const { data: prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
    owner: context.repo.owner,
    repo: context.repo.repo,
    commit_sha: sha,
  });

  const mergedPr = prs.find((pr) => pr.merged_at && pr.base.ref === 'master');

  if (!mergedPr) {
    const msg =
      `Direct push blocked: commit ${sha.slice(0, 7)} is not associated with a merged PR targeting master. ` +
      `All changes must come through a PR.`;

    if (shouldFail) {
      core.setFailed(msg);
    } else {
      core.warning(msg);
    }
    return;
  }

  core.info(`Commit ${sha.slice(0, 7)} is backed by PR #${mergedPr.number} — OK`);
};
