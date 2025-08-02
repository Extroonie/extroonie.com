---
title: "Why I don't like Node.js workspaces"
date: 2024-01-02
description: "Monorepos are cool, but the way they're implemented using workspaces... isn't."
---

I dislike the workspaces feature of package managers in Node.js, and I will explain why in this post.

## What are workspaces?

If you don't know what workspaces are, here's a brief description from [npm Docs](https://docs.npmjs.com/cli/v7/using-npm/workspaces):

> Workspaces is a generic term that refers to the set of features in the npm cli that provides support to managing multiple packages from your local files system from within a singular top-level, root package.
>
> This set of features makes up for a much more streamlined workflow handling linked packages from the local file system. Automating the linking process as part of `npm install` and avoiding manually having to use `npm link` in order to add references to packages that should be symlinked into the current `node_modules` folder.
>
> We also refer to these packages being auto-symlinked during `npm install` as a single workspace, meaning it's a nested package within the current local file system that is explicitly defined in the [`package.json`](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#workspaces) `workspaces` configuration.

It exists in most of the package managers, including [pnpm](https://pnpm.io/workspaces) and [Yarn](https://yarnpkg.com/features/workspaces). They can also be intergated with build tools such as [Turborepo](https://turbo.build/repo) and [nx](https://nx.dev/).

## The problem

In a monorepo setup, workspaces allow you to install dependencies separately for each package or application in the repo. This is different from a traditional setup where all dependencies would be installed at the root of the repo.

A key distinction exists between regular dependencies and developer dependencies like linting/testing tools. Regular dependencies can be installed at the package root as usual with workspaces. However, developer dependencies typically need to be hoisted and installed only at the workspace root.

This can be problematic because it means each workspace must install its own copies of all the various dev tools needed, leading to duplication. There is no central place to consolidate tooling.

## The solution

> I've grown increasingly convinced over the past year that the TypeScript monorepos should move towards installing everything at the root of the monorepo. This is also what Nx recommends, at least for brand-new monorepos:
>
> ![img.png](/images/nodejs-workspaces-img.png)
>
> This strategy has a lot of elegance to it, as it makes working in the repo ultra-simple and rips out a ton of the crappy complexity that we had before:
>
> 1. You only have one `node_modules` directory, and it's at the root of the monorepo. The mental model here is super clean.
> 2. You don't use the "workspaces" feature of the package manager whatsoever. It's very annoying to have to remember to put in workspace-related command-line flags whenever e.g. adding a new dep. This brings parity between "normal" single-project repos and monorepos.
> 3. You don't have to worry about making somewhat-arbitrary distinctions between "ESLint-like" deps that should apply to the entire mono-repo, and "library-like" deps that should only apply to specific packages. Everything just goes into the root as a normal dep or a dev dep (in the same way that a normal/single repo does it).
> 4. Updating dependencies becomes ultra simple - you don't need some over-engineered monorepo tool to do it! You can just run conventional tools like [`npm-check-updates`](https://github.com/raineorshine/npm-check-updates), and then after updating a single "package.json" file, you can simply run `npm/yarn/pnpm install`.
>    - And checking for breaking changes after a new dep update also becomes easy. After updating, we can trigger a commit, and TypeScript will take over and let you know in CI in any of the new API changes broke one of your existing packages. Then we can revert the commit if needed, or continue to go on and make another commit to fix to the individual broken packages (or coordinate with other teams, if necessary).
>    - In some monorepos, some packages are published to npm, so they need their own individual "package.json" files. Nx offers the option to automatically create package.json files when publishing, but sometimes you will want more control over them, and will choose to manually manage them yourself. (Does Turborepo have an analogous feature?) If you do manually manage "package.json" files, then you need an additional tool to propagate version changes downward from the root "package.json". With that said, even in this situation, I think it is preferable to use simple tools like [`syncpack`](https://github.com/JamieMason/syncpack) to do this, rather than complicated tools like e.g. `lerna`. (`syncpack` is essentially just a glorified copy-paster, so even in this situation, we are still maintaining the simple mental model of how dependencies work.)

[Source](https://github.com/vercel/turbo/issues/2060#issuecomment-1416135197)
