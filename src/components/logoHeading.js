/**
 * Logo heading component that adds the profile picture
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/how-to/querying-data/use-static-query/
 */

import * as React from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import Image from 'gatsby-image';

const LogoHeading = () => {
	const data = useStaticQuery(graphql`
		query BioQuery {
			avatar: file(absolutePath: { regex: "/Pale_Blue_Dot.png/" }) {
				childImageSharp {
					fixed(width: 200, height: 200, quality: 80, cropFocus: SOUTH) {
						...GatsbyImageSharpFixed
					}
				}
			}
			site {
				siteMetadata {
					author
				}
			}
		}
	`);

	const { author } = data.site.siteMetadata;
	return (
		<div>
			<Image
				fixed={data.avatar.childImageSharp.fixed}
				alt={author}
				style={{
					marginRight: 1 / 2,
					marginBottom: 0,
					minWidth: 50,
				}}
			/>
		</div>
	);
};

export default LogoHeading;
