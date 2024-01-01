import * as React from 'react';
import { Link } from 'gatsby';

import { rhythm } from '../util/typography';

const Layout = ({ location, children }) => {
	const rootPath = `${__PATH_PREFIX__}/`;
	const isRootPath = location.pathname === rootPath;
	const isPostPath =
		location.pathname.startsWith(`${rootPath}writing/`) && !location.pathname.endsWith(`${rootPath}writing/`);

	const header = !isRootPath && (
		<>
			<Link className="header-link-home" to="/">
				Home
			</Link>
			{isPostPath && (
				<Link className="header-link-all-posts" to="/writing">
					All posts
				</Link>
			)}
		</>
	);

	return (
		<div
			className="global-wrapper"
			style={{
				marginLeft: 'auto',
				marginRight: 'auto',
				maxWidth: rhythm(24),
				padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
			}}
		>
			{header && <header className="global-header">{header}</header>}
			<main>{children}</main>
		</div>
	);
};

export default Layout;
