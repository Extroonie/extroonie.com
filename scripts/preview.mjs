import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
const { values } = parseArgs({
	options: {
		host: { type: 'string', default: '127.0.0.1' },
		port: { type: 'string', default: process.env.DEV_PORT || '1313' },
		drafts: { type: 'boolean', default: false },
	},
});
const server = spawn(
	process.env.HUGO_BIN || 'hugo',
	[
		'server',
		'--bind',
		values.host,
		'--port',
		values.port,
		'--baseURL',
		`http://localhost:${values.port}/`,
		'--appendPort=false',
		'--disableLiveReload',
		'--disableFastRender',
		...(values.drafts ? ['--buildDrafts'] : []),
	],
	{ stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('error', (error) => {
	console.error(`Unable to start Hugo: ${error.message}`);
	process.exit(1);
});
server.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
