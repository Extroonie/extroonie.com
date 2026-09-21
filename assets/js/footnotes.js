(() => {
	const references = document.querySelectorAll('.footnote-ref');
	if (!references.length) return;
	const preview = document.createElement('span');
	preview.id = 'footnote-preview';
	preview.className = 'footnote-preview';
	preview.setAttribute('role', 'note');
	preview.hidden = true;
	document.body.append(preview);
	let active;
	let timer;
	function close() {
		clearTimeout(timer);
		if (active && preview.contains(document.activeElement)) active.focus({ preventScroll: true });
		active?.removeAttribute('aria-controls');
		active = null;
		preview.hidden = true;
	}
	function scheduleClose() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (!preview.contains(document.activeElement) && document.activeElement !== active) close();
		}, 180);
	}
	function show(reference) {
		if (active === reference) {
			clearTimeout(timer);
			return;
		}
		close();
		const note = document.getElementById(decodeURIComponent(reference.hash.slice(1)));
		if (!note) return;
		const content = note.cloneNode(true);
		content.querySelectorAll('.footnote-backref').forEach((link) => link.remove());
		content.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));

		preview.replaceChildren(...content.childNodes);
		active = reference;
		reference.setAttribute('aria-controls', preview.id);
		preview.setAttribute('aria-label', `Footnote ${reference.textContent}`);
		reference.closest('sup').after(preview);
		preview.hidden = false;
		const rect = reference.getBoundingClientRect();
		const gap = 8;
		const inset = 16;
		const left = Math.max(inset, Math.min(rect.left, innerWidth - preview.offsetWidth - inset));
		const below = rect.bottom + gap;
		const top = below + preview.offsetHeight <= innerHeight - inset ? below : rect.top - preview.offsetHeight - gap;
		preview.style.left = `${left}px`;
		preview.style.top = `${Math.max(inset, top)}px`;
	}
	for (const reference of references) {
		reference.closest('sup').tabIndex = -1;
		const note = document.getElementById(decodeURIComponent(reference.hash.slice(1)));
		if (note) note.tabIndex = -1;
		reference.addEventListener('pointerenter', (event) => {
			if (event.pointerType === 'mouse') show(reference);
		});
		reference.addEventListener('pointerleave', scheduleClose);
		reference.addEventListener('focus', () => {
			if (reference.matches(':focus-visible')) show(reference);
		});
		reference.addEventListener('blur', scheduleClose);
		reference.addEventListener('click', close);
	}
	preview.addEventListener('pointerenter', () => clearTimeout(timer));
	preview.addEventListener('pointerleave', scheduleClose);
	preview.addEventListener('focusin', () => clearTimeout(timer));
	preview.addEventListener('focusout', scheduleClose);
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') close();
	});
	window.addEventListener('resize', close);
	window.addEventListener(
		'scroll',
		() => {
			if (!preview.contains(document.activeElement)) close();
		},
		{ passive: true },
	);
})();
