(() => {
	let choice = 'system';
	try {
		choice = localStorage.getItem('theme') || 'system';
	} catch {}
	if (!['light', 'dark', 'system'].includes(choice)) choice = 'system';
	const dark = choice === 'dark' || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
	document.documentElement.dataset.themeChoice = choice;
})();
