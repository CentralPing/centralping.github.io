// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightChangelogs from "starlight-changelogs";
import { createStarlightTypeDocPlugin } from "starlight-typedoc";

const [ergoTypeDoc, ergoSidebarGroup] = createStarlightTypeDocPlugin();
const [routerTypeDoc, routerSidebarGroup] = createStarlightTypeDocPlugin();

export default defineConfig({
  site: "https://centralping.github.io",
  markdown: {
    // @astrojs/mdx@5.x reads this from config.markdown (not the processor options).
    // Astro 6.4 moved the default into unified() internals, leaving this undefined.
    // Explicit true restores GFM for MDX until Starlight upgrades to @astrojs/mdx@6.x.
    gfm: true,
  },
  redirects: {
    "/architecture": "/concepts/architecture/",
  },
  integrations: [
    starlight({
      title: "ergo",
      tagline: "Fast Fail REST API toolkit for Node.js",
      logo: {
        src: "./src/assets/logo.svg",
      },
      plugins: [
        starlightChangelogs(),
        ergoTypeDoc({
          entryPoints: [
            ".ergo-source/http/index.js",
            ".ergo-source/lib/cookie/index.js",
            ".ergo-source/lib/json-api-query/index.js",
            ".ergo-source/utils/buffers/index.js",
            ".ergo-source/utils/iterables/index.js",
            ".ergo-source/utils/observables/index.js",
            ".ergo-source/utils/streams/index.js",
          ],
          tsconfig: "./tsconfig.typedoc.json",
          output: "api/ergo",
          sidebar: {
            label: "ergo",
            collapsed: true,
          },
          typeDoc: {
            entryFileName: "index",
            skipErrorChecking: true,
            excludeExternals: true,
            excludePrivate: true,
            excludeProtected: true,
          },
        }),
        routerTypeDoc({
          entryPoints: [".ergo-router-source/index.js"],
          tsconfig: "./tsconfig.typedoc-router.json",
          output: "api/ergo-router",
          sidebar: {
            label: "ergo-router",
            collapsed: true,
          },
          typeDoc: {
            entryFileName: "index",
            skipErrorChecking: true,
            excludeExternals: true,
            excludePrivate: true,
            excludeProtected: true,
          },
        }),
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/CentralPing",
        },
      ],
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Why ergo?", slug: "why-ergo" },
            { label: "Getting Started", slug: "getting-started" },
          ],
        },
        {
          label: "Concepts",
          items: [
            { label: "Architecture", slug: "concepts/architecture" },
            {
              label: "Accumulator Reference",
              slug: "concepts/accumulator",
            },
            {
              label: "Error Response Reference",
              slug: "concepts/error-responses",
            },
            { label: "Fast Fail Pipeline", slug: "concepts/fast-fail" },
            {
              label: "Standards Compliance",
              slug: "concepts/standards",
            },
            { label: "Security", slug: "concepts/security" },
          ],
        },
        {
          label: "Packages",
          items: [
            { label: "ergo", slug: "packages/ergo" },
            { label: "ergo-router", slug: "packages/ergo-router" },
          ],
        },
        {
          label: "Middleware",
          collapsed: true,
          items: [{ autogenerate: { directory: "middleware" } }],
        },
        {
          label: "Recipes",
          collapsed: true,
          items: [{ autogenerate: { directory: "recipes" } }],
        },
        {
          label: "API Reference",
          items: [ergoSidebarGroup, routerSidebarGroup],
        },
        {
          label: "Performance",
          items: [{ label: "Benchmarks", slug: "benchmarks" }],
        },
        {
          label: "Changelog",
          items: [
            { label: "ergo", link: "/changelog/ergo/" },
            { label: "ergo-router", link: "/changelog/ergo-router/" },
          ],
        },
      ],
      customCss: ["./src/styles/packages.css", "./src/styles/benchmarks.css"],
    }),
  ],
});
