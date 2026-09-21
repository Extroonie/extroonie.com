import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import assert from 'node:assert/strict';
import { siteBaseURL } from './config.mjs';

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

export function checkSite(directory = 'dist') {
	const files = walk(directory);
	const pages = new Map();
	for (const file of files.filter((file) => file.endsWith('.html'))) {
		const html = readFileSync(file, 'utf8');
		const page = { ids: new Set(), links: [], controls: [], structuredData: [] };
		new HTMLRewriter()
			.on('*', {
				element(element) {
					const id = element.getAttribute('id');
					if (id) {
						assert(!page.ids.has(id), `${file}: duplicate id ${id}`);
						page.ids.add(id);
					}
					for (const name of ['src', 'href']) {
						const value = element.getAttribute(name);
						if (value) page.links.push(value);
					}
					if (
						element.tagName === 'meta' &&
						['og:image', 'twitter:image'].includes(
							element.getAttribute('property') || element.getAttribute('name'),
						)
					) {
						const value = element.getAttribute('content');
						if (value) page.links.push(value);
					}
					for (const name of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
						const value = element.getAttribute(name);
						if (value) page.controls.push(...value.trim().split(/\s+/));
					}
				},
			})
			.on('script[type="application/ld+json"]', {
				element() {
					page.structuredData.push('');
				},
				text(chunk) {
					page.structuredData[page.structuredData.length - 1] += chunk.text;
				},
			})
			.transform(html);
		for (const json of page.structuredData) JSON.parse(json);
		for (const id of page.controls) assert(page.ids.has(id), `${file}: missing accessible control target ${id}`);
		assert(!html.includes('github.githubassets.com'), `${file}: external GitHub CSS`);
		pages.set(file, page);
	}
	const origin = siteBaseURL();
	function checkLink(file, value) {
		const base = new URL(
			relative(directory, file)
				.replaceAll('\\', '/')
				.replace(/index\.html$/, ''),
			origin,
		);
		const url = new URL(value, base);
		if (url.origin !== origin.origin) return;
		let target = join(directory, decodeURIComponent(url.pathname));
		assert(existsSync(target), `${file}: broken asset or link ${value}`);
		if (statSync(target).isDirectory()) target = join(target, 'index.html');
		assert(existsSync(target), `${file}: missing index for ${value}`);
		if (url.hash && pages.has(target)) {
			const id = decodeURIComponent(url.hash.slice(1));
			assert(pages.get(target).ids.has(id), `${file}: missing fragment ${value}`);
		}
	}
	for (const [file, page] of pages) for (const link of page.links) checkLink(file, link);
	for (const file of files.filter((file) => file.endsWith('.css'))) {
		for (const match of readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g))
			checkLink(file, match[1]);
	}
	return pages;
}

if (import.meta.main) {
	const pages = checkSite();
	for (const route of [
		'index.html',
		'writing/index.html',
		'writing/posts/index.html',
		'writing/essays/index.html',
		'tags/index.html',
		'404.html',
		'rss.xml',
		'writing/rss.xml',
		'writing/posts/rss.xml',
		'writing/essays/rss.xml',
		'sitemap.xml',
		'robots.txt',
	])
		assert(existsSync(`dist/${route}`), `Missing route ${route}`);
	for (const id of ['computers', 'science', 'philosophy', 'other-things'])
		assert(pages.get('dist/index.html').ids.has(id), `Missing homepage anchor ${id}`);
	console.log(`Checked ${pages.size} HTML pages, links, fragments, control targets, CSS assets, and JSON-LD.`);
}
