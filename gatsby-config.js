/**
 * Configure your Gatsby site with this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-config/
 */

/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
	siteMetadata: {
		title: `Ishmaam Khan`,
		author: `Ishmaam Khan`,
		description: `Hi, I'm Ishmaam! I'm a student who spends most of my time developing software and exploring the frontiers of science and philosophy.`,
		siteUrl: `htpps://extroonie.com`,
		social: {
			twitter: `Extroonie`,
		},
	},
	plugins: [
		`gatsby-plugin-image`,
		{
			resolve: `gatsby-plugin-mdx`,
			options: {
				gatsbyRemarkPlugins: [
					{
						resolve: `gatsby-remark-smartypants`,
						options: {
							dashes: 'oldschool',
						},
					},
				],
			},
		},
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				name: `pages`,
				path: `${__dirname}/src/pages`,
			},
		},
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				path: `${__dirname}/src/content/posts`,
				name: `posts`,
			},
		},
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				name: `images`,
				path: `${__dirname}/src/images`,
			},
		},
		{
			resolve: `gatsby-transformer-remark`,
			options: {
				plugins: [
					{
						resolve: `gatsby-remark-images`,
						options: {
							maxWidth: 630,
						},
					},
					{
						resolve: `gatsby-remark-responsive-iframe`,
						options: {
							wrapperStyle: `margin-bottom: 1.0725rem`,
						},
					},
					{
						resolve: `gatsby-remark-autolink-headers`,
						options: {
							icon: false,
						},
					},
					`gatsby-remark-prismjs`,
					{
						resolve: `gatsby-remark-smartypants`,
						options: {
							dashes: 'oldschool',
						},
					},
				],
			},
		},
		`gatsby-transformer-sharp`,
		`gatsby-plugin-sharp`,
		{
			resolve: `gatsby-plugin-feed`,
			options: {
				query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
				feeds: [
					{
						serialize: ({ query: { site, allMarkdownRemark } }) => {
							return allMarkdownRemark.nodes.map((node) => {
								return Object.assign({}, node.frontmatter, {
									description: node.excerpt,
									date: node.frontmatter.date,
									url: site.siteMetadata.siteUrl + node.fields.slug,
									guid: site.siteMetadata.siteUrl + node.fields.slug,
									custom_elements: [{ 'content:encoded': node.html }],
								});
							});
						},
						query: `{
              allMarkdownRemark(sort: {frontmatter: {date: DESC}}) {
                nodes {
                  excerpt
                  html
                  fields {
                    slug
                  }
                  frontmatter {
                    title
                    date
                  }
                }
              }
            }`,
						output: '/rss.xml',
						title: `Ishmaam Khan's Posts RSS Feed`,
					},
				],
			},
		},
		{
			resolve: `gatsby-plugin-manifest`,
			options: {
				name: `Ishmaam Khan`,
				short_name: `Ishmaam`,
				start_url: `/`,
				background_color: `#ffffff`,
				// This will impact how browsers show your PWA/website
				// https://css-tricks.com/meta-theme-color-and-trickery/
				// theme_color: `#663399`,
				display: `minimal-ui`,
				icon: `src/images/Pale_Blue_Dot.png`, // This path is relative to the root of the site.
			},
		},
		{
			resolve: `gatsby-plugin-typography`,
			options: {
				pathToConfigModule: `src/util/typography`,
			},
		},
	],
};
