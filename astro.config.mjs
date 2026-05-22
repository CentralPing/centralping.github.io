// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

export default defineConfig({
  site: "https://centralping.github.io",
  redirects: {
    "/api/ergo-router": "/packages/ergo-router/",
    "/architecture": "/why-ergo/",
  },
  integrations: [
    starlight({
      title: "ergo",
      tagline: "Fast Fail REST API toolkit for Node.js",
      logo: {
        src: "./src/assets/logo.svg",
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: [".ergo-source/http/index.js"],
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
          label: "API Reference",
          items: [typeDocSidebarGroup],
        },
        {
          label: "Performance",
          items: [
            { label: "Benchmarks", slug: "benchmarks" },
          ],
        },
      ],
      customCss: ["./src/styles/packages.css", "./src/styles/benchmarks.css"],
    }),
  ],
});
