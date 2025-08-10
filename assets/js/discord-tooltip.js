document.addEventListener('DOMContentLoaded', function () {
	const discordElement = document.querySelector('a[title*="Discord"]');

	if (discordElement) {
		discordElement.removeAttribute('title');

		const tooltip = document.createElement('div');
		tooltip.className = 'discord-tooltip';
		tooltip.textContent = 'Discord: Extroonie';
		document.body.appendChild(tooltip);

		let isTooltipVisible = false;

		function showTooltip(e) {
			const rect = discordElement.getBoundingClientRect();
			tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
			tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';

			tooltip.classList.add('show');
			isTooltipVisible = true;
		}

		function hideTooltip() {
			tooltip.classList.remove('show');
			isTooltipVisible = false;
		}

		function showCopiedMessage() {
			tooltip.textContent = 'Copied Discord username: Extroonie';
			tooltip.classList.add('copied');

			setTimeout(() => {
				tooltip.textContent = 'Discord: Extroonie';
				tooltip.classList.remove('copied');
			}, 2000);
		}

		function copyUsername() {
			const textArea = document.createElement('textarea');
			textArea.value = 'Extroonie';
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			textArea.style.top = '-999999px';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			try {
				const successful = document.execCommand('copy');
				document.body.removeChild(textArea);
				return successful;
			} catch (err) {
				document.body.removeChild(textArea);
				return false;
			}
		}

		const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		if (isMobile) {
			discordElement.addEventListener('click', function (e) {
				e.preventDefault();
				showTooltip(e);

				if (copyUsername()) {
					tooltip.textContent = 'Discord username: Extroonie (copied)';
				} else {
					tooltip.textContent = 'Copy failed - try manually';
				}
			});
		} else {
			discordElement.addEventListener('mouseenter', showTooltip);
			discordElement.addEventListener('mouseleave', hideTooltip);

			discordElement.addEventListener('click', function (e) {
				e.preventDefault();

				if (isTooltipVisible) {
					if (copyUsername()) {
						showCopiedMessage();
					} else {
						tooltip.textContent = 'Copy failed - try manually';
						setTimeout(() => {
							tooltip.textContent = 'Discord: Extroonie';
						}, 2000);
					}
				}
			});
		}

		document.addEventListener('click', function (e) {
			if (!discordElement.contains(e.target) && !tooltip.contains(e.target)) {
				hideTooltip();
			}
		});

		window.addEventListener('scroll', hideTooltip);
		window.addEventListener('resize', hideTooltip);
	}
});
