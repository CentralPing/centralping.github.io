// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://centralping.github.io",
  integrations: [
    starlight({
      title: "ergo",
      tagline: "Fast Fail REST API toolkit for Node.js",
      logo: {
        src: "./src/assets/logo.svg",
      },
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
          ],
        },
        {
          label: "Packages",
          items: [
            { label: "ergo", slug: "packages/ergo" },
            { label: "ergo-router", slug: "packages/ergo-router" },
          ],
        },
      ],
      customCss: [],
    }),
  ],
});
