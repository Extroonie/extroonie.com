import { spawnSync } from 'node:child_process';

const result = spawnSync(
	process.execPath,
	[
		'node_modules/prettier/bin/prettier.cjs',
		...process.argv.slice(2),
		'assets/**/*.{css,js}',
		'scripts/*.mjs',
		'*.json',
		'*.yaml',
		'.github/workflows/*.yml',
		'.prettierrc.json',
		'layouts/**/*.html',
	],
	{ stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
