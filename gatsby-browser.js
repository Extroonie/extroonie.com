// custom typefaces
import '@fontsource-variable/montserrat';
import '@fontsource/merriweather';
// normalize CSS across browsers
import './src/normalize.css';
// custom CSS styles
import './src/style.css';

// Highlighting for code blocks
import 'prismjs/themes/prism.css';

export const onRouteUpdate = ({ location }) => {
	const hash = location.hash;

	if (!hash) {
		window.scrollTo(0, 0);
	}
};
