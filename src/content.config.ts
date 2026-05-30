import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { changelogsLoader } from 'starlight-changelogs/loader';

export const collections = {
	docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
	changelogs: defineCollection({
		loader: changelogsLoader([
			{
				provider: 'keep-a-changelog',
				base: 'changelog/ergo',
				changelog: '.ergo-source/CHANGELOG.md',
				title: '@centralping/ergo',
			},
			{
				provider: 'keep-a-changelog',
				base: 'changelog/ergo-router',
				changelog: '.ergo-router-source/CHANGELOG.md',
				title: '@centralping/ergo-router',
			},
		]),
	}),
};
