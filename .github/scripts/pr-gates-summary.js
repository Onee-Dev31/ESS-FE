module.exports = async ({ github, context, core }) => {
  const icon = (result) => {
    if (result === 'success') return '✅';
    if (result === 'failure') return '❌';
    if (result === 'cancelled') return '⏭️';
    return '⏳';
  };

  const lint = process.env.RESULT_LINT;
  const typecheck = process.env.RESULT_TYPECHECK;
  const test = process.env.RESULT_TEST;
  const security = process.env.RESULT_SECURITY;
  const coverage = process.env.COVERAGE_PERCENT || 'N/A';

  const allPassed = [lint, typecheck, test, security].every((r) => r === 'success');

  const body = [
    `## PR Gates Summary ${allPassed ? '🎉' : '🚨'}`,
    '',
    '| Check | Result |',
    '|-------|--------|',
    `| Lint (Prettier) | ${icon(lint)} ${lint} |`,
    `| Type Check | ${icon(typecheck)} ${typecheck} |`,
    `| Test + Coverage | ${icon(test)} ${test} |`,
    `| Security Audit | ${icon(security)} ${security} |`,
    '',
    `**Line Coverage:** ${coverage}%`,
  ].join('\n');

  if (!context.payload.pull_request) {
    core.info('Not a pull_request event — skipping comment.');
    core.info(body);
    return;
  }

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.payload.pull_request.number,
  });

  const existing = comments.find(
    (c) => c.user.type === 'Bot' && c.body.includes('PR Gates Summary'),
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body,
    });
  }
};
