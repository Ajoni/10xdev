/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";
import type { PluginOption, UserConfigFn } from "vite";

function isCloudflareRunner(plugin: PluginOption): boolean {
  return (
    !!plugin &&
    typeof plugin === "object" &&
    !Array.isArray(plugin) &&
    "name" in plugin &&
    plugin.name.startsWith("vite-plugin-cloudflare")
  );
}

function withoutCloudflareRunner(plugins: PluginOption[] | undefined): PluginOption[] | undefined {
  if (!plugins) return plugins;
  const kept: PluginOption[] = [];
  for (const plugin of plugins) {
    if (Array.isArray(plugin)) {
      const nested = withoutCloudflareRunner(plugin);
      if (nested && nested.length > 0) kept.push(nested);
      continue;
    }
    if (isCloudflareRunner(plugin)) continue;
    kept.push(plugin);
  }
  return kept;
}

const resolveConfig: UserConfigFn = getViteConfig({
  test: {
    environment: "node",
    env: { TZ: "America/Los_Angeles" },
    include: ["src/**/*.{test,spec}.ts", "scripts/**/*.test.mjs"],
  },
});

const config: UserConfigFn = async (env) => {
  const resolved = await resolveConfig(env);
  return {
    ...resolved,
    plugins: withoutCloudflareRunner(resolved.plugins),
  };
};

export default config;
