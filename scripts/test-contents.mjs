import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

class Element {
	listeners = {};
	attributes = {};
	hidden = false;
	open = false;
	classes = new Set();
	classList = { toggle: (name, enabled) => (enabled ? this.classes.add(name) : this.classes.delete(name)) };
	addEventListener(name, fn) {
		this.listeners[name] = fn;
	}
	setAttribute(name, value) {
		this.attributes[name] = value;
	}
	removeAttribute(name) {
		delete this.attributes[name];
	}
	focus() {
		this.focused = true;
	}
	emit(name, event = {}) {
		this.listeners[name]?.({ button: 0, ...event });
	}
}

for (const initiallyWide of [false, true]) {
	const contents = new Element();
	const reopen = new Element();
	const close = new Element();
	const title = new Element();
	const summary = new Element();
	const media = new Element();
	media.matches = initiallyWide;
	const links = [new Element(), new Element()];
	links.forEach((link, i) => {
		link.hash = `#section-${i}`;
	});
	const headings = links.map(() => new Element());
	headings.forEach((heading, i) => {
		heading.getBoundingClientRect = () => ({ top: i * 500 });
	});
	contents.querySelector = (selector) =>
		({ '.contents-close': close, '.contents-heading': title, summary })[selector];
	contents.querySelectorAll = () => links;
	const window = new Element();
	runInNewContext(readFileSync('assets/js/contents.js', 'utf8'), {
		document: {
			querySelector: (selector) => (selector === '.article-contents' ? contents : reopen),
			getElementById: (id) => headings[Number(id.split('-').at(-1))],
		},
		window,
		matchMedia: (query) => {
			assert.equal(query, '(min-width: 64rem)');
			return media;
		},
		requestAnimationFrame: (fn) => fn(),
	});
	assert.equal(contents.open, initiallyWide);
	assert.equal(reopen.hidden, true);
	assert.equal(title.hidden, !initiallyWide);
	media.matches = true;
	media.emit('change');
	assert(contents.open);
	close.emit('click');
	assert(!contents.open && !reopen.hidden && reopen.focused);
	assert.equal(reopen.attributes['aria-expanded'], 'false');
	reopen.emit('click');
	assert(contents.open && reopen.hidden && close.focused);
	contents.emit('keydown', { key: 'Escape' });
	assert(!contents.open && !reopen.hidden, 'Escape must close the sidebar');
	reopen.emit('click');
	contents.emit('click', { target: { closest: () => links[1] } });
	assert(contents.open, 'Desktop section navigation must leave the sidebar visible');
	assert(headings[1].focused);
	close.emit('click');
	media.matches = false;
	media.emit('change');
	assert(!contents.open && reopen.hidden && title.hidden);
	assert(!contents.classes.has('sidebar'));
	summary.emit('click', { preventDefault() {} });
	assert(contents.open);
	media.matches = true;
	media.emit('change');
	assert(!contents.open, 'Resizing must preserve the desktop closed choice');
	media.matches = false;
	media.emit('change');
	assert(contents.open, 'Resizing must preserve the mobile open choice');
	for (const modifier of [
		{ ctrlKey: true },
		{ metaKey: true },
		{ shiftKey: true },
		{ altKey: true },
		{ button: 1 },
	]) {
		contents.emit('click', { ...modifier, target: { closest: () => links[0] } });
		assert(contents.open, 'Modified navigation must not change the current disclosure');
		assert(!headings[0].focused, 'Modified navigation must not move focus in the current page');
	}
	contents.emit('click', { target: { closest: () => links[0] } });
	assert(!contents.open, 'Mobile section navigation should collapse the disclosure');
	assert.equal(links[0].attributes['aria-current'], 'location');
	assert.equal(links[1].attributes['aria-current'], undefined);
}
console.log(
	'Passed: contents defaults, close/reopen, focus, responsive state, section navigation, and current section.',
);
