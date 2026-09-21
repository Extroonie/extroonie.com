import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkSite } from './check.mjs';
import { siteBaseURL } from './config.mjs';
import { checkWriting, checkDescriptions } from './test-writing.mjs';
const temp = mkdtempSync(join(tmpdir(), 'extroonie-test-'));
try {
	for (const section of ['', 'writing', 'writing/posts', 'writing/essays']) {
		mkdirSync(join(temp, 'content', section), { recursive: true });
		cpSync(join('content', section, '_index.md'), join(temp, 'content', section, '_index.md'));
	}
	for (const fixture of ['math', 'post', 'tagged-post'])
		cpSync(`tests/fixtures/${fixture}.md`, join(temp, `content/writing/${fixture}-test.md`));
	for (const [name, headings] of Object.entries({
		'one-section': '# An in-body title\n\n## One section\n\n#### A minor heading',
		'two-sections': '## First section\n\n### Second section',
		'abstract-only': '',
		'abstract-and-section': '## One section',
	})) {
		writeFileSync(
			join(temp, `content/writing/${name}.md`),
			`---\ntitle: ${name}\ndate: 2026-01-01\nformat: post\n${name.startsWith('abstract-') ? 'abstract: A short abstract.\n' : ''}---\n${headings}\n`,
		);
	}
	const hugo = process.env.HUGO_BIN || 'hugo';
	const build = (...args) => {
		rmSync(join(temp, 'out'), { recursive: true, force: true });
		return spawnSync(
			hugo,
			[
				'--contentDir',
				join(temp, 'content'),
				'--destination',
				join(temp, 'out'),
				'--baseURL',
				siteBaseURL().href,
				...args,
			],
			{ encoding: 'utf8' },
		);
	};
	const result = build();
	assert.equal(result.status, 0, result.stdout + result.stderr);
	checkSite(join(temp, 'out'));
	checkWriting(join(temp, 'out'));
	const page = readFileSync(join(temp, 'out/writing/math-test/index.html'), 'utf8');
	assert(page.includes('katex.min.css'), 'Math stylesheet missing');
	assert(page.includes('katex-mathml'), 'Accessible build-time math missing');
	assert(page.includes('eq-entropy'), 'Equation anchor missing');
	assert(page.includes('href="#eq-entropy"'), 'Equation reference missing');
	assert(!page.includes('>Published'), 'Publication label should not appear');
	assert(!page.includes('>Updated'), 'Update label should not appear');
	assert(page.includes('January 1, 2026'), 'Published date missing');
	assert(page.includes('“quoted”'), 'Smart quotes missing');
	assert(
		page.includes('writer’s') || page.includes('writer&rsquo;s') || page.includes('writer&#39;s'),
		'Smart apostrophe missing',
	);
	assert(
		page.includes('<code>&quot;code&quot;</code>') ||
			page.includes('<code>&#34;code&#34;</code>') ||
			page.includes('<code>"code"</code>'),
		'Code quotes changed: ' + page.match(/<code>[\s\S]*?<\/code>/g),
	);
	assert(!page.includes('katex.min.js'), 'Math should require no client JavaScript');
	const home = readFileSync(join(temp, 'out/index.html'), 'utf8');
	assert(home.includes('class="biography"'), 'Biography missing');
	assert(!home.includes('<details'), 'Homepage biography must be permanently visible');
	assert(home.includes('aria-label="On this page"'), 'Homepage navigation label missing');
	assert(home.includes('href="/writing/">some of my writing</a>'), 'Homepage writing invitation missing');
	assert(!home.includes('class="writing-list"'), 'Article lists must live in the archive');
	assert(home.includes('<a href="/">Ishmaam Khan</a>'), 'Homepage name must reset the URL');
	new HTMLRewriter()
		.on('nav nav', {
			element() {
				assert.fail('Contents must not nest navigation landmarks');
			},
		})
		.transform(home);
	const essays = readFileSync(join(temp, 'out/writing/essays/rss.xml'), 'utf8');
	assert(essays.includes('/writing/math-test/'), 'Essay filtering failed');
	assert(!essays.includes('/writing/tagged-post-test/'), 'Post leaked into essay feed');
	assert(page.includes('/js/contents.'), 'Sectioned essay should load navigation');
	assert(!home.includes('/js/contents.'), 'Homepage should not load article navigation');
	assert(page.includes('aria-controls="article-navigation"'), 'Contents control missing');
	assert(page.includes('aria-label="Close contents"'), 'Accessible sidebar close button missing');
	assert(page.includes('class="contents-reopen"'), 'Sidebar reopening control missing');
	assert(!home.includes('contents-reopen'), 'Homepage should not have sidebar controls');
	assert(page.includes('class="subtitle"'), 'Essay subtitle missing');
	assert(page.includes('href="#abstract">Abstract</a>'), 'Abstract missing from Contents');
	for (const [name, expected] of [
		['one-section', false],
		['two-sections', true],
		['abstract-only', false],
		['abstract-and-section', true],
	]) {
		const article = readFileSync(join(temp, `out/writing/${name}/index.html`), 'utf8');
		for (const marker of ['has-contents', 'class="article-contents"', 'class="contents-reopen"', '/js/contents.'])
			assert.equal(
				article.includes(marker),
				expected,
				`${name}: inconsistent Contents eligibility for ${marker}`,
			);
		assert(!/<details[^>]*\bopen\b/.test(article), 'Inline Contents must start collapsed');
		if (name === 'abstract-and-section') assert(article.includes('href="#abstract">Abstract</a>'));
	}
	const postFixture = readFileSync(join(temp, 'out/writing/post-test/index.html'), 'utf8');
	assert(!postFixture.includes('/js/contents.'), 'Unsectioned article loads unused navigation');
	assert(postFixture.includes('An italic subtitle for a post'), 'Post subtitle missing');
	assert(postFixture.includes('katex-mathml'), 'Post math missing');
	for (const article of [page, postFixture]) {
		assert(article.includes('class="footnote-ref"'), 'Footnote reference missing');
		assert(article.includes('class="footnote-backref"'), 'Footnote return link missing');
		assert(article.includes('/js/footnotes.'), 'Footnote previews missing');
	}
	assert(postFixture.includes('A second paragraph'), 'Multi-paragraph footnote missing');
	assert(postFixture.match(/class="footnote-ref"/g).length === 2, 'Repeated footnote references missing');
	assert(!home.includes('/js/footnotes.'), 'Homepage loads unused footnote script');
	const post = readFileSync(join(temp, 'out/writing/tagged-post-test/index.html'), 'utf8');
	assert(!post.includes('katex.min.css'), 'Non-math post loads math assets');
	const rss = readFileSync(join(temp, 'out/writing/rss.xml'), 'utf8');
	assert(rss.includes('A “quoted” title'), 'RSS typography inconsistent');
	assert(rss.includes('<title>Code &amp; tools</title>'), 'RSS titles must escape XML characters');
	assert(rss.includes('<description>Tools &amp; code for a small project.</description>'));
	assert(page.includes('<pre><code class="language-js">'), 'Fenced code should use plain semantic markup');
	assert(!page.includes('class="chroma"'), 'Unused syntax-token markup should not be generated');
	for (const [shipped, upstream] of [
		['static/licenses/cc0.txt', 'LICENSE'],
		['static/licenses/katex.txt', 'node_modules/katex/LICENSE'],
		['static/licenses/newsreader.txt', 'node_modules/@fontsource-variable/newsreader/LICENSE'],
	])
		assert.equal(readFileSync(shipped, 'utf8'), readFileSync(upstream, 'utf8'), `Outdated license: ${shipped}`);
	const checks = join(temp, 'checks');
	mkdirSync(checks);
	const checkFile = join(checks, 'index.html');
	writeFileSync(checkFile, '<h2 id="café">Heading</h2><a href="#caf%C3%A9">Link</a>');
	checkSite(checks);
	for (const [html, expected] of [
		['<a href="#missing">Broken fragment</a>', /missing fragment/],
		['<img src="missing.png">', /broken asset or link/],
		['<meta property="og:image" content="/missing.png">', /broken asset or link/],
		['<meta name="twitter:image" content="/missing.png">', /broken asset or link/],
		['<h2 id="duplicate"></h2><h2 id="duplicate"></h2>', /duplicate id/],
		['<button aria-controls="missing">Contents</button>', /missing accessible control target/],
	]) {
		writeFileSync(checkFile, html);
		assert.throws(() => checkSite(checks), expected);
	}
	const originalURL = process.env.SITE_BASE_URL;
	try {
		process.env.SITE_BASE_URL = 'https://alternate.example/';
		assert.equal(siteBaseURL().href, process.env.SITE_BASE_URL);
		writeFileSync(checkFile, '<a href="https://alternate.example/missing">Broken absolute link</a>');
		assert.throws(() => checkSite(checks), /broken asset or link/);
		for (const url of [
			'https://example.test/subpath/',
			'file:///tmp/',
			'https://example.test/?q=1',
			'https://example.test/#hash',
			'https://user:pass@example.test/',
		]) {
			process.env.SITE_BASE_URL = url;
			assert.throws(siteBaseURL, /must be an HTTP\(S\) origin/);
		}
	} finally {
		if (originalURL === undefined) delete process.env.SITE_BASE_URL;
		else process.env.SITE_BASE_URL = originalURL;
	}
	const writingIndex = join(temp, 'content/writing/_index.md');
	const originalWriting = readFileSync(writingIndex, 'utf8');
	const changedDescription = 'Notes & ideas about writing.';
	writeFileSync(writingIndex, originalWriting.replace(/^description:.*$/m, `description: "${changedDescription}"`));
	assert.equal(build().status, 0);
	checkDescriptions(join(temp, 'out'), changedDescription);
	assert.equal(
		readFileSync(join(temp, 'out/index.html'), 'utf8'),
		home,
		'Writing changes must not alter the homepage',
	);
	writeFileSync(writingIndex, originalWriting);
	const invalidFile = join(temp, 'content/writing/invalid.md');
	for (const format of ['', 'format: typo\n']) {
		writeFileSync(invalidFile, `---\ntitle: Invalid\ndate: 2026-01-01\n${format}---\nText.\n`);
		const invalid = build();
		assert.notEqual(invalid.status, 0, 'Invalid writing format must fail the build');
		assert((invalid.stdout + invalid.stderr).includes('format must be post or essay'));
	}
	rmSync(invalidFile);
	writeFileSync(
		join(temp, 'content/writing/draft.md'),
		'---\ntitle: Draft\ndate: 2026-01-01\nformat: post\ntags: [programming, draft-only]\ndraft: true\n---\nDraft text.\n',
	);
	assert.equal(build().status, 0);
	assert(!existsSync(join(temp, 'out/writing/draft/index.html')), 'Draft leaked into the production build');
	assert(!existsSync(join(temp, 'out/tags/draft-only/index.html')), 'Draft-only tag leaked into production');
	assert(!readFileSync(join(temp, 'out/tags/index.html'), 'utf8').includes('#draft-only'));
	for (const path of [
		'writing/index.html',
		'writing/posts/index.html',
		'tags/programming/index.html',
		'rss.xml',
		'writing/rss.xml',
		'writing/posts/rss.xml',
	])
		assert(!readFileSync(join(temp, 'out', path), 'utf8').includes('/writing/draft/'), `Draft leaked into ${path}`);
	assert.equal(build('--buildDrafts').status, 0);
	assert(existsSync(join(temp, 'out/writing/draft/index.html')), 'Draft preview omitted draft content');
	assert(
		readFileSync(join(temp, 'out/tags/draft-only/index.html'), 'utf8').includes('/writing/draft/'),
		'Draft tag preview missing',
	);
	rmSync(join(temp, 'content/writing/math-test.md'));
	assert.equal(build().status, 0);
	const emptyEssays = readFileSync(join(temp, 'out/writing/essays/index.html'), 'utf8');
	assert(emptyEssays.includes('No essays yet.'), 'Empty essay archive missing');
	assert(emptyEssays.includes('/writing/essays/rss.xml'), 'Empty essay archive lost its feed');
	assert(!readFileSync(join(temp, 'out/writing/essays/rss.xml'), 'utf8').includes('<item>'));
	for (const name of readdirSync(join(temp, 'content/writing')))
		if (name.endsWith('.md') && name !== '_index.md') rmSync(join(temp, 'content/writing', name));
	assert.equal(build().status, 0);
	checkSite(join(temp, 'out'));
	assert(readFileSync(join(temp, 'out/writing/index.html'), 'utf8').includes('No writing yet.'));
	assert(readFileSync(join(temp, 'out/tags/index.html'), 'utf8').includes('No tags yet.'));
	writeFileSync(
		join(temp, 'content/writing/local-date.md'),
		'---\ntitle: Local date\ndate: 2026-09-20\nformat: post\n---\nA date without a time or offset.\n',
	);
	for (const [clock, published] of [
		['2026-09-19T17:59:59Z', false],
		['2026-09-19T18:00:01Z', true],
	]) {
		const dated = build('--clock', clock);
		assert.equal(dated.status, 0, dated.stdout + dated.stderr);
		const articlePath = join(temp, 'out/writing/local-date/index.html');
		assert.equal(existsSync(articlePath), published, 'Plain dates must use the site timezone');
		for (const path of [
			'writing/index.html',
			'writing/posts/index.html',
			'rss.xml',
			'writing/rss.xml',
			'writing/posts/rss.xml',
		]) {
			const output = readFileSync(join(temp, 'out', path), 'utf8');
			assert.equal(output.includes('/writing/local-date/'), published, `${path}: local publication date differs`);
			if (published && path.endsWith('.xml'))
				assert.match(
					output,
					/<pubDate>Sun, 20 Sep 2026 00:00:00 (?:\+|&#43;)0600<\/pubDate>/,
					'RSS timezone differs',
				);
		}
		if (published) {
			const article = readFileSync(articlePath, 'utf8');
			assert(article.includes('<time datetime="2026-09-20">September 20, 2026</time>'));
		}
	}
	console.log(
		'Passed: writing archives, tags, drafts, empty states, math, equations, typography, dates, timezone, subtitles, biography, RSS, and conditional assets.',
	);
} finally {
	rmSync(temp, { recursive: true, force: true });
}
