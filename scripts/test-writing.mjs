import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { siteBaseURL } from './config.mjs';

function select(html, selector) {
	const matches = [];
	new HTMLRewriter()
		.on(selector, {
			element(element) {
				matches.push({ attributes: Object.fromEntries(element.attributes), text: '' });
			},
			text(chunk) {
				matches.at(-1).text += chunk.text;
			},
		})
		.transform(html);
	return matches;
}

export function checkDescriptions(directory, expected) {
	const read = (path) => readFileSync(join(directory, path), 'utf8');
	const rendered =
		expected === undefined
			? select(read('writing/index.html'), '.writing-introduction')[0].text
			: expected.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
	for (const path of ['writing/', 'writing/posts/', 'writing/essays/']) {
		const html = read(`${path}index.html`);
		assert.equal(select(html, '.writing-introduction')[0].text, rendered, `${path}: visible introduction differs`);
		for (const selector of ['meta[name="description"]', 'meta[property="og:description"]'])
			assert.equal(
				select(html, selector)[0].attributes.content,
				rendered,
				`${path}: preview description differs`,
			);
	}
	for (const path of ['', 'writing/', 'writing/posts/', 'writing/essays/']) {
		const feed = read(`${path}rss.xml`);
		const channel = feed.split('<item>')[0];
		assert(channel.includes(`<description>${rendered}</description>`), `${path || '/'}: feed description differs`);
	}
}

export function checkWriting(directory) {
	const read = (path) => readFileSync(join(directory, path), 'utf8');
	const entries = (html) => select(html, '.writing-entry h2 a').map(({ attributes }) => attributes.href);
	const all = read('writing/index.html');
	const posts = read('writing/posts/index.html');
	const essays = read('writing/essays/index.html');
	const topic = read('tags/programming/index.html');
	const node = read('tags/nodejs/index.html');
	const post = read('writing/tagged-post-test/index.html');
	const essay = read('writing/math-test/index.html');
	const untagged = read('writing/post-test/index.html');
	const home = read('index.html');
	const tags = read('tags/index.html');
	checkDescriptions(directory);
	assert.equal(select(home, 'link[rel="alternate"]')[0].attributes.href, new URL('rss.xml', siteBaseURL()).href);
	const writing = entries(all);
	assert.equal(writing.length, 7, 'Writing archive must list every published article');
	assert.equal(new Set(writing).size, writing.length, 'Archive entries must not repeat');
	assert.equal(writing[0], '/writing/post-test/', 'Newest writing should appear first');
	assert.equal(writing.at(-1), '/writing/tagged-post-test/', 'Publication date must determine order, not lastmod');
	assert.deepEqual(
		entries(posts),
		writing.filter((path) => path !== '/writing/math-test/'),
	);
	assert.deepEqual(entries(essays), ['/writing/math-test/']);
	assert.deepEqual(
		entries(topic),
		['/writing/math-test/', '/writing/tagged-post-test/'],
		'Tags must include both formats',
	);
	assert.deepEqual(entries(node), ['/writing/tagged-post-test/'], 'Unrelated articles leaked into a tag');
	assert.deepEqual(entries(read('tags/mathematics/index.html')), ['/writing/math-test/']);
	for (const [path, html, label] of [
		['writing/', all, 'Writing'],
		['writing/posts/', posts, 'Posts'],
		['writing/essays/', essays, 'Essays'],
	]) {
		assert.equal(select(html, 'main h1')[0].text, 'My Writing');
		assert.equal(select(html, '.writing-introduction').length, 1);
		assert.equal(select(html, '.writing-filters a[aria-current="page"]')[0].attributes.href, `/${path}`);
		assert.equal(select(html, '.rss-link')[0].attributes.href, `/${path}rss.xml`);
		assert.equal(select(html, 'link[rel="alternate"]')[0].attributes.title, `Ishmaam Khan — ${label}`);
		const feed = read(`${path}rss.xml`);
		assert(feed.includes(`<title>Ishmaam Khan — ${label}</title>`));
		assert(feed.includes(`<link>${new URL(path, siteBaseURL()).href}</link>`), 'Feed must link to its archive');
	}
	for (const [path, html] of [
		['writing/', all],
		['writing/posts/', posts],
		['writing/essays/', essays],
		['tags/programming/', topic],
		['tags/', tags],
	]) {
		assert.equal(select(html, 'link[rel="canonical"]')[0].attributes.href, new URL(path, siteBaseURL()).href);
		assert(!html.includes('http-equiv="refresh"'), 'Archives must not redirect');
		assert(!html.includes('noindex'), 'Production archives must be indexable');
		assert.equal(select(html, '.writing-filters a').length, 4, 'Archive navigation must use native links');
		assert.equal(select(html, '.article-contents').length, 0, 'Archives should not have article Contents');
	}
	assert.equal(select(topic, 'main h1')[0].text, 'Writing tagged #programming');
	assert.equal(
		select(topic, 'meta[name="description"]')[0].attributes.content,
		'Posts and essays tagged #programming by Ishmaam Khan.',
	);
	assert.equal(
		select(topic, '.writing-filters [aria-current]').length,
		0,
		'A topic must not masquerade as an unfiltered archive',
	);
	assert(!existsSync(join(directory, 'tags/programming/rss.xml')), 'Tag feeds were not requested');
	assert(!existsSync(join(directory, 'tags/rss.xml')), 'Tag index should not generate a feed');
	assert(!existsSync(join(directory, 'categories')), 'Unused categories should not be generated');
	assert.equal(select(tags, 'main h1')[0].text, 'Tags');
	assert.equal(select(tags, '.writing-filters a[aria-current="page"]')[0].attributes.href, '/tags/');
	assert.deepEqual(
		select(tags, '.tag-index a').map(({ text }) => text),
		['#mathematics', '#nodejs', '#programming'],
	);
	assert.deepEqual(
		select(tags, '.tag-index a').map(({ attributes }) => attributes.href),
		['/tags/mathematics/', '/tags/nodejs/', '/tags/programming/'],
	);
	for (const html of [all, posts, essays, topic, node]) {
		const paths = entries(html);
		const dates = select(html, '.writing-metadata time');
		assert.equal(dates.length, paths.length, 'Every list entry needs a publication date');
		for (const [index, path] of paths.entries()) {
			const article = read(`${path.slice(1)}index.html`);
			assert.deepEqual(dates[index], select(article, '.publication time')[0], 'List and article dates differ');
		}
	}
	assert.equal(select(node, '.writing-metadata time')[0].text, 'January 2, 2024', 'Lists must not use lastmod');
	assert.equal(
		select(essays, '.writing-entry p')[0].text,
		select(essay, 'meta[name="description"]')[0].attributes.content,
		'List and preview descriptions must agree',
	);
	assert.equal(select(posts, '.writing-entry p').length, 1, 'Missing descriptions must not become excerpts');
	for (const article of [post, essay, untagged]) {
		assert.equal(select(article, 'a[href="/writing/"]').length, 1, 'Article should have one archive link');
		assert.equal(select(article, '.article-intro > a.all-writing')[0].text, '← All writing');
		assert(
			article.indexOf('class="all-writing"') < article.indexOf('<h1>'),
			'Return link must precede the article title',
		);
	}
	assert.equal(select(untagged, '.tags').length, 0, 'Untagged articles must not have an empty tag row');
	assert.deepEqual(
		select(post, '.article-intro .tags a').map(({ text }) => text),
		['#programming', '#nodejs'],
	);
	assert.deepEqual(
		select(post, '.article-intro .tags a').map(({ attributes }) => attributes.href),
		['/tags/programming/', '/tags/nodejs/'],
	);
	assert(essay.indexOf('class="subtitle"') < essay.indexOf('class="tags"'));
	assert(essay.indexOf('class="tags"') < essay.indexOf('class="publication"'));
}
