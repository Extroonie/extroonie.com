import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

let focused;
class Element {
	listeners = {};
	attributes = {};
	children = [];
	style = {};
	offsetWidth = 240;
	offsetHeight = 160;
	addEventListener(name, listener) {
		this.listeners[name] = listener;
	}
	emit(name, event = {}) {
		this.listeners[name]?.(event);
	}
	setAttribute(name, value) {
		this.attributes[name] = value;
	}
	removeAttribute(name) {
		delete this.attributes[name];
	}
	replaceChildren(...children) {
		this.children = children;
	}
	contains(element) {
		return this.children.includes(element);
	}
	focus(options) {
		focused = this;
		this.focusOptions = options;
		this.emit('focus');
	}
}
const reference = new Element();
reference.hash = '#fn:1';
reference.textContent = '1';
reference.matches = () => true;
reference.getBoundingClientRect = () => ({ left: 960, top: 730, bottom: 750 });
const superscript = new Element();
superscript.after = () => {};
reference.closest = () => superscript;
const link = new Element();
const note = new Element();
note.cloneNode = () => ({ childNodes: [link], querySelectorAll: () => [] });
const preview = new Element();
const document = new Element();
Object.defineProperty(document, 'activeElement', { get: () => focused });
document.querySelectorAll = () => [reference];
document.createElement = () => preview;
document.getElementById = (id) => (id === 'fn:1' ? note : null);
document.body = { append() {} };
const window = new Element();
runInNewContext(readFileSync('assets/js/footnotes.js', 'utf8'), {
	document,
	window,
	innerWidth: 1000,
	innerHeight: 800,
	setTimeout,
	clearTimeout,
});
assert(preview.hidden);
reference.emit('pointerenter', { pointerType: 'touch' });
assert(preview.hidden, 'Touch should retain native endnote navigation');
reference.focus();
assert(!preview.hidden && reference.attributes['aria-controls'] === 'footnote-preview');
assert.equal(preview.style.left, '744px');
assert.equal(preview.style.top, '562px');
link.focus();
window.emit('scroll');
assert(!preview.hidden, 'Scrolling must not hide the focused preview');
window.emit('resize');
assert(preview.hidden && focused === reference, 'Resize must not leave focus in a hidden preview');
assert.equal(reference.focusOptions.preventScroll, true);
assert.equal(reference.attributes['aria-controls'], undefined);
reference.focus();
link.focus();
document.emit('keydown', { key: 'Escape' });
assert(preview.hidden && focused === reference, 'Escape must return focus to the reference');
reference.focus();
const elsewhere = new Element();
elsewhere.focus();
window.emit('resize');
assert(preview.hidden && focused === elsewhere, 'Closing must not steal unrelated focus');
reference.focus();
reference.emit('click');
assert(preview.hidden, 'Endnote navigation must close the preview');
console.log('Passed: simulated footnote focus restoration, dismissal, touch fallback, and viewport positioning.');
