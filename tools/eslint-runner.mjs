import { ESLint } from 'eslint';

async function run() {
  const eslint = new ESLint({
    overrideConfigFile: './.eslintrc.cjs',
    ignore: false,
    fix: true,
  });

  console.log('Running ESLint programmatically (ignore: false, fix: true) on src/ ...');
  const results = await eslint.lintFiles(['src']);
  await ESLint.outputFixes(results);
  const formatter = await eslint.loadFormatter('stylish');
  const resultText = formatter.format(results);
  console.log(resultText || 'No issues found or all issues fixed.');

  const errorCount = results.reduce((s, r) => s + r.errorCount, 0);
  const warningCount = results.reduce((s, r) => s + r.warningCount, 0);
  console.log(`ESLint completed. Errors: ${errorCount}, Warnings: ${warningCount}`);
  if (errorCount > 0) process.exit(2);
}

run().catch(err => {
  console.error('ESLint runner failed:', err);
  process.exit(1);
});
