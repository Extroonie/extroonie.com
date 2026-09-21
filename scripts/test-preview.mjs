import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const temp = mkdtempSync(join(tmpdir(), 'extroonie-preview-'));
try {
	writeFileSync(
		join(temp, 'hugo.toml'),
		"baseURL = 'https://example.test/'\ndisableKinds = ['taxonomy', 'term', 'rss', 'sitemap']\n",
	);
	mkdirSync(join(temp, 'content'));
	mkdirSync(join(temp, 'layouts/_default'), { recursive: true });
	writeFileSync(join(temp, 'layouts/index.html'), 'Preview homepage');
	writeFileSync(join(temp, 'layouts/_default/single.html'), '{{ .Content }}');
	writeFileSync(join(temp, 'content/draft.md'), '---\ntitle: Draft\ndraft: true\n---\nDraft preview content.\n');
	for (const drafts of [false, true]) {
		const socket = createServer().listen(0, '127.0.0.1');
		await once(socket, 'listening');
		const { port } = socket.address();
		await new Promise((resolve) => socket.close(resolve));
		const server = spawn(
			process.execPath,
			[resolve('scripts/preview.mjs'), ...(drafts ? ['--drafts'] : []), '--port', String(port)],
			{
				cwd: temp,
				env: { ...process.env, HUGO_BIN: process.env.HUGO_BIN || 'hugo' },
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		);
		let output = '';
		server.stdout.on('data', (chunk) => {
			output += chunk;
		});
		server.stderr.on('data', (chunk) => {
			output += chunk;
		});
		try {
			let ready = false;
			for (let attempt = 0; attempt < 50; attempt++) {
				assert.equal(server.exitCode, null, output);
				try {
					const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) });
					if (response.ok) {
						ready = true;
						break;
					}
				} catch {}
				await delay(100);
			}
			assert(ready, `Preview did not become ready: ${output}`);
			const response = await fetch(`http://127.0.0.1:${port}/draft/`, { signal: AbortSignal.timeout(1000) });
			assert.equal(response.status, drafts ? 200 : 404, 'Draft preview flag was not honored');
			if (drafts) assert((await response.text()).includes('Draft preview content.'));
		} finally {
			if (server.exitCode === null && server.signalCode === null) {
				const closed = once(server, 'close');
				server.kill('SIGTERM');
				await closed;
			}
		}
	}
	console.log('Passed: real Hugo preview startup, configurable ports, opt-in drafts, and shutdown.');
} finally {
	rmSync(temp, { recursive: true, force: true });
}
