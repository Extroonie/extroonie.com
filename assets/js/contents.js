(() => {
	const contents = document.querySelector('.article-contents');
	if (!contents) return;
	const reopen = document.querySelector('.contents-reopen');
	const closeButton = contents.querySelector('.contents-close');
	const title = contents.querySelector('.contents-heading');
	const wide = matchMedia('(min-width: 64rem)');
	let desktopOpen = true;
	let mobileOpen = false;
	const links = [...contents.querySelectorAll('nav a')];
	const headings = links.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))));
	function render() {
		contents.classList.toggle('sidebar', wide.matches);
		contents.open = wide.matches ? desktopOpen : mobileOpen;
		title.hidden = !wide.matches;
		reopen.hidden = !wide.matches || desktopOpen;
		reopen.setAttribute('aria-expanded', String(desktopOpen));
	}
	function close() {
		desktopOpen = false;
		render();
		reopen.focus({ preventScroll: true });
	}
	closeButton.addEventListener('click', close);
	contents.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && wide.matches && desktopOpen) close();
	});
	reopen.addEventListener('click', () => {
		desktopOpen = true;
		render();
		closeButton.focus({ preventScroll: true });
	});
	contents.querySelector('summary').addEventListener('click', (event) => {
		if (wide.matches) return;
		event.preventDefault();
		mobileOpen = !contents.open;
		render();
	});
	contents.addEventListener('click', (event) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		const link = event.target.closest('nav a');
		if (!link) return;
		if (!wide.matches) {
			mobileOpen = false;
			render();
		}
		const heading = headings[links.indexOf(link)];
		heading?.focus({ preventScroll: true });
	});
	wide.addEventListener('change', render);
	let scheduled = false;
	function update() {
		scheduled = false;
		let current = -1;
		headings.forEach((heading, index) => {
			if (heading && heading.getBoundingClientRect().top <= 120) current = index;
		});
		links.forEach((link, index) => {
			if (index === current) link.setAttribute('aria-current', 'location');
			else link.removeAttribute('aria-current');
		});
	}
	window.addEventListener(
		'scroll',
		() => {
			if (!scheduled) {
				scheduled = true;
				requestAnimationFrame(update);
			}
		},
		{ passive: true },
	);
	window.addEventListener('resize', update);
	render();
	update();
})();
