/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/
 */

const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);

// Define the template for post
const post = path.resolve(`./src/templates/post.js`);

/**
 * @type {import('gatsby').GatsbyNode['createPages']}
 */
exports.createPages = async ({ graphql, actions, reporter }) => {
	const { createPage } = actions;

	// Get all markdown posts sorted by date
	const result = await graphql(`
		{
			allMarkdownRemark(sort: { frontmatter: { date: ASC } }, limit: 1000) {
				nodes {
					id
					fields {
						slug
					}
				}
			}
		}
	`);

	if (result.errors) {
		reporter.panicOnBuild(`There was an error loading your posts`, result.errors);
		return;
	}

	const posts = result.data.allMarkdownRemark.nodes;

	// Create posts pages
	// But only if there's at least one markdown file found at "content/posts" (defined in gatsby-config.js)
	// `context` is available in the template as a prop and as a variable in GraphQL

	if (posts.length > 0) {
		posts.forEach((post_, index) => {
			const previousPostId = index === 0 ? null : posts[index - 1].id;
			const nextPostId = index === posts.length - 1 ? null : posts[index + 1].id;

			createPage({
				path: `/writing${post_.fields.slug}`,
				component: post,
				context: {
					id: post_.id,
					previousPostId,
					nextPostId,
				},
			});
		});
	}
};

/**
 * @type {import('gatsby').GatsbyNode['onCreateNode']}
 */
exports.onCreateNode = ({ node, actions, getNode }) => {
	const { createNodeField } = actions;

	if (node.internal.type === `MarkdownRemark` || node.internal.type === `Mdx`) {
		const value = createFilePath({ node, getNode });

		createNodeField({
			name: `slug`,
			node,
			value,
		});
	}
};

/**
 * @type {import('gatsby').GatsbyNode['createSchemaCustomization']}
 */
exports.createSchemaCustomization = ({ actions }) => {
	const { createTypes } = actions;

	// Explicitly define the siteMetadata {} object
	// This way those will always be defined even if removed from gatsby-config.js

	// Also explicitly define the Markdown frontmatter
	// This way the "MarkdownRemark" queries will return `null` even when no
	// posts are stored inside "content/blog" instead of returning an error
	createTypes(`
    type SiteSiteMetadata {
      author: String
      siteUrl: String
      social: Social
    }

    type Social {
      twitter: String
    }

    type MarkdownRemark implements Node {
      frontmatter: Frontmatter
      fields: Fields
    }

    type Frontmatter {
      title: String
      description: String
      date: Date @dateformat
    }

    type Fields {
      slug: String
    }
  `);
};
