import { readFileSync } from 'node:fs';

export function siteBaseURL() {
	const { baseURL } = Bun.TOML.parse(readFileSync(new URL('../hugo.toml', import.meta.url), 'utf8'));
	const url = new URL(process.env.SITE_BASE_URL || baseURL);
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.pathname !== '/' ||
		url.search ||
		url.hash ||
		url.username ||
		url.password
	)
		throw new Error(
			'SITE_BASE_URL/baseURL must be an HTTP(S) origin without a subpath, query, fragment, or credentials.',
		);
	return url;
}
