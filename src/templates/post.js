import * as React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import Seo from '../components/seo';
import { rhythm } from '../util/typography';
import smartypants from '../util/smartypants';

const PostTemplate = ({ data: { previous, next, site, markdownRemark: post }, location }) => {
	const siteTitle = site.siteMetadata?.title || `Title`;

	return (
		<Layout location={location} title={siteTitle}>
			<article className="post" itemScope itemType="http://schema.org/Article">
				<header>
					<h1
						style={{
							marginTop: rhythm(1),
							marginBottom: rhythm(1),
						}}
						itemProp="headline"
					>
						{smartypants(post.frontmatter.title)}
					</h1>
					<p>{post.frontmatter.date}</p>
				</header>
				<section dangerouslySetInnerHTML={{ __html: post.html }} itemProp="articleBody" />
				<hr />
			</article>
			<nav className="post-nav">
				<ul
					style={{
						display: `flex`,
						flexWrap: `wrap`,
						justifyContent: `space-between`,
						listStyle: `none`,
						padding: 0,
					}}
				>
					<li>
						{previous && (
							<Link to={previous.fields.slug} rel="prev">
								← {previous.frontmatter.title}
							</Link>
						)}
					</li>
					<li>
						{next && (
							<Link to={next.fields.slug} rel="next">
								{next.frontmatter.title} →
							</Link>
						)}
					</li>
				</ul>
			</nav>
		</Layout>
	);
};

export const Head = ({ data: { markdownRemark: post } }) => {
	return <Seo title={post.frontmatter.title} description={post.frontmatter.description || post.excerpt} />;
};

export default PostTemplate;

export const pageQuery = graphql`
	query PostBySlug($id: String!, $previousPostId: String, $nextPostId: String) {
		site {
			siteMetadata {
				title
			}
		}
		markdownRemark(id: { eq: $id }) {
			id
			excerpt(pruneLength: 160)
			html
			frontmatter {
				title
				date(formatString: "MMMM DD, YYYY")
				description
			}
		}
		previous: markdownRemark(id: { eq: $previousPostId }) {
			fields {
				slug
			}
			frontmatter {
				title
			}
		}
		next: markdownRemark(id: { eq: $nextPostId }) {
			fields {
				slug
			}
			frontmatter {
				title
			}
		}
	}
`;
