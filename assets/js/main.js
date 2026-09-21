(() => {
	const root = document.documentElement;
	const toggle = document.querySelector('.theme-toggle');
	const system = matchMedia('(prefers-color-scheme: dark)');
	let manual = ['light', 'dark'].includes(root.dataset.themeChoice);
	function setTheme(theme) {
		root.dataset.theme = theme;
		toggle?.setAttribute('aria-checked', String(theme === 'dark'));
	}
	if (toggle) {
		toggle.hidden = false;
		setTheme(root.dataset.theme || (system.matches ? 'dark' : 'light'));
		toggle.addEventListener('click', () => {
			const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
			manual = true;
			root.dataset.themeChoice = theme;
			setTheme(theme);
			try {
				localStorage.setItem('theme', theme);
			} catch {}
		});
		system.addEventListener('change', () => {
			if (!manual) setTheme(system.matches ? 'dark' : 'light');
		});
		window.addEventListener('storage', (event) => {
			if (event.key !== 'theme' && event.key !== null) return;
			manual = ['light', 'dark'].includes(event.newValue);
			root.dataset.themeChoice = manual ? event.newValue : 'system';
			setTheme(manual ? event.newValue : system.matches ? 'dark' : 'light');
		});
	}
	function fragmentTarget(hash = location.hash) {
		let id;
		try {
			id = decodeURIComponent(hash.slice(1));
		} catch {
			return;
		}
		return id ? document.getElementById(id) : null;
	}
	function focusFragment() {
		const target = fragmentTarget();
		if (!target) return;
		requestAnimationFrame(() => {
			target.scrollIntoView({ block: 'start' });
			target.focus({ preventScroll: true });
		});
	}
	window.addEventListener('hashchange', focusFragment);
	if (location.hash) focusFragment();
	const notice = document.querySelector('.notice');
	let timer;
	document.querySelectorAll('[data-copy]').forEach((button) => {
		const fallback = button.parentElement.querySelector('.discord-fallback');
		button.hidden = false;
		fallback.hidden = true;
		button.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(button.dataset.copy);
				notice.textContent = 'Discord username copied.';
			} catch {
				fallback.hidden = false;
				notice.textContent = 'Select the username to copy it.';
			}
			clearTimeout(timer);
			notice.classList.add('visible');
			timer = setTimeout(() => notice.classList.remove('visible'), 3000);
		});
	});
})();
