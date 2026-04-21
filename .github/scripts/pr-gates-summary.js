module.exports = async ({ github, context, core }) => {
  const lint     = process.env.RESULT_LINT;
  const typecheck = process.env.RESULT_TYPECHECK;
  const test     = process.env.RESULT_TEST;
  const security = process.env.RESULT_SECURITY;
  const coverage = process.env.COVERAGE_PERCENT;

  const icon = (r) =>
    ({ success: '✅', failure: '❌', skipped: '⏭️', cancelled: '🚫' }[r] ?? '❓');

  const covLabel =
    coverage && coverage !== 'N/A'
      ? ` — **${coverage}%** line coverage`
      : '';

  const allPassed = [lint, typecheck, test, security].every(r => r === 'success');

  const body = [
    '## PR Gates Summary',
    '',
    '| Gate | Status |',
    '|------|--------|',
    `| Lint (Prettier)   | ${icon(lint)} \`${lint}\` |`,
    `| Type Check        | ${icon(typecheck)} \`${typecheck}\` |`,
    `| Test + Coverage   | ${icon(test)} \`${test}\`${covLabel} |`,
    `| Security Audit    | ${icon(security)} \`${security}\` |`,
    '',
    allPassed
      ? '**All gates passed ✅ — ready to merge.**'
      : '**One or more gates failed ❌ — merge blocked.**',
  ].join('\n');

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo:  context.repo.repo,
    issue_number: context.issue.number,
  });

  const existing = comments.find(
    c => c.user.type === 'Bot' && c.body.includes('## PR Gates Summary'),
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner:      context.repo.owner,
      repo:       context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      owner:        context.repo.owner,
      repo:         context.repo.repo,
      issue_number: context.issue.number,
      body,
    });
  }
};
