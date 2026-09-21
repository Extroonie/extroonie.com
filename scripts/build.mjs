import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { siteBaseURL } from './config.mjs';
const run = (command, args) => {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		env: process.env,
	});
	if (result.error) throw result.error;
	if (result.status !== 0) process.exit(result.status || 1);
};
const hugo = process.env.HUGO_BIN || 'hugo';
const baseURL = siteBaseURL();
rmSync('dist', { recursive: true, force: true });
run(hugo, ['--minify', '--baseURL', baseURL.href]);
run(process.execPath, ['scripts/check.mjs']);
