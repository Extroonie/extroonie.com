import * as React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import Seo from '../components/seo';
import smartypants from '../util/smartypants';

const WritingIndex = ({ data, location }) => {
	const siteTitle = data.site.siteMetadata?.title || `Title`;
	const posts = data.allMarkdownRemark.nodes;

	return (
		<Layout location={location} title={siteTitle}>
			<header>
				<h1>My Writing</h1>
				<p>
					{smartypants(
						`I wouldn't exactly call it a blog, given the lack of a regular posting schedule, but there are times when I put pen to paper (or fingers to keys), and the result is worth sharing. You might find something enjoyable in one of these musings.`,
					)}
				</p>
			</header>
			<ol style={{ listStyle: `none` }}>
				{posts.map((post) => {
					const title = smartypants(post.frontmatter.title || post.fields.slug);

					return (
						<li key={post.fields.slug}>
							<article className="post-list-item" itemScope itemType="http://schema.org/Article">
								<header>
									<h2>
										<Link to={`/writing${post.fields.slug}`} itemProp="url">
											<span itemProp="headline">{title}</span>
										</Link>
									</h2>
									<small>{post.frontmatter.date}</small>
								</header>
								<section>
									<p
										dangerouslySetInnerHTML={{
											__html: smartypants(post.frontmatter.description || post.excerpt),
										}}
										itemProp="description"
									/>
								</section>
							</article>
						</li>
					);
				})}
			</ol>
		</Layout>
	);
};

export default WritingIndex;

/**
 * Head export to define metadata for the page
 *
 * See: https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-head/
 */
export const Head = () => (
	<Seo
		title="My Writing"
		description={smartypants(
			`I wouldn't exactly call it a blog, given the lack of a regular posting schedule, but there are times when I put pen to paper (or fingers to keys), and the result is worth sharing. You might find something enjoyable in one of these musings.`,
		)}
	/>
);

export const pageQuery = graphql`
	{
		site {
			siteMetadata {
				title
			}
		}
		allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
			nodes {
				excerpt
				fields {
					slug
				}
				frontmatter {
					date(formatString: "MMMM DD, YYYY")
					title
					description
				}
			}
		}
	}
`;
