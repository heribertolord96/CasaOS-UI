const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

/**
 * pnpm does not hoist devDependencies to node_modules/<name> by default, but
 * vue.config.js is loaded with require() from the project root. Resolve webpack
 * plugins the same way Node would if they were hoisted.
 */
function requireDep(name) {
	try {
		return require(name);
	} catch (err) {
		if (err.code !== "MODULE_NOT_FOUND") {
			throw err;
		}
	}
	const reqFromCli = createRequire(require.resolve("@vue/cli-service/package.json"));
	try {
		return reqFromCli(name);
	} catch {
		const pnpmDir = path.join(__dirname, "node_modules", ".pnpm");
		if (!fs.existsSync(pnpmDir)) {
			throw new Error(`Cannot resolve "${name}": run pnpm install in CasaOS-UI`);
		}
		const dirents = fs.readdirSync(pnpmDir, { withFileTypes: true });
		const match = dirents.find((d) => d.isDirectory() && d.name.startsWith(`${name}@`));
		if (!match) {
			throw new Error(`Cannot resolve "${name}" under node_modules/.pnpm`);
		}
		return require(path.join(pnpmDir, match.name, "node_modules", name));
	}
}

const webpack = requireDep("webpack");
const NodePolyfillPlugin = requireDep("node-polyfill-webpack-plugin");
const isProd = process.env.NODE_ENV === "prod";

// Ensure .env.dev is applied when resolving the dev proxy (avoids http://undefined:undefined).
try {
	requireDep("dotenv").config({ path: path.join(__dirname, ".env.dev") });
} catch (_) {
	/* optional */
}
const casaosDevTarget = `http://${process.env.VUE_APP_DEV_IP || "localhost"}:${process.env.VUE_APP_DEV_PORT || "4080"}`;

module.exports = {
	publicPath: "/",
	runtimeCompiler: true,
	lintOnSave: false,
	productionSourceMap: false,
	pluginOptions: {},
	css: {
		loaderOptions: {
			sass: {
				sassOptions: {
					includePaths: ["./node_modules", "./src/assets"],
				},
			},
		},
	},

	chainWebpack: (config) => {
		config.module
			.rule("mjs")
			.test(/\.mjs$/)
			.type("javascript/auto")
			.include.add(/node_modules/)
			.end();
		const oneOfsMap = config.module.rule("scss").oneOfs.store;
		oneOfsMap.forEach((item) => {
			item.use("style-resources-loader")
				.loader("style-resources-loader")
				.options({
					patterns: ["./src/assets/scss/common/_variables.scss", "./src/assets/scss/common/_color.scss"],
				})
				.end();
		});
		config.plugin("ignore").use(
			new webpack.IgnorePlugin({
				resourceRegExp: /^\.\/locale$/, // 这是一个示例，忽略所有 locale 文件
				contextRegExp: /moment$/, // 这是一个示例，只在 moment 库中忽略
			})
		);

		config.plugin("define").use(webpack.DefinePlugin, [
			{
				"process.env": JSON.stringify(process.env),
				BUILT_TIME: JSON.stringify(Date()),
			},
		]);
		// 添加 NodePolyfillPlugin wbepack5 专用插件
		config.plugin("node-polyfill").use(NodePolyfillPlugin);

		// Production only
		if (isProd) {
			const CssMinimizerPlugin = requireDep("css-minimizer-webpack-plugin");
			config.output.filename("[name].[contenthash:8].js").end();
			config.output.chunkFilename("[name].[contenthash:8].js").end();
			config.optimization.minimize(true);
			config.optimization.splitChunks({
				chunks: "all",
			});

			config.optimization
				.minimizer("css")
				.use(CssMinimizerPlugin, [
					{ minimizerOptions: { preset: ["default", { discardComments: { removeAll: true } }] } },
				]);
		}
	},
	devServer: {
		open: false,
		port: 8080,
		host: '0.0.0.0',
		hot: true,
		allowedHosts: 'all',
		client: {
			webSocketURL: 'auto://0.0.0.0:0/ws',
			// Do not full-screen overlay for expected API failures (backend down, missing routes) during dev
			overlay: {
				runtimeErrors: (error) => {
					if (!error) return true;
					const msg = error.message || String(error);
					if (msg.includes("Network Error")) return false;
					if (/Request failed with status code (404|5\d\d)\b/.test(msg)) return false;
					return true;
				},
			},
		},
		proxy: {
			"/v1": {
				target: casaosDevTarget,
				changeOrigin: true,
				ws: false,
			},
			"/v2": {
				target: casaosDevTarget,
				changeOrigin: true,
				ws: true,
			},
		},
	},
};
