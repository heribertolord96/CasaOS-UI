module.exports = {
	presets: [
		// useBuiltIns/corejs live here — @vue/cli-plugin-babel already bundles @babel/preset-env
		[
			"@vue/cli-plugin-babel/preset",
			{
				useBuiltIns: "entry",
				corejs: 3,
			},
		],
		[
			"@babel/preset-typescript", // 引用Typescript插件
			{
				allExtensions: true, // 支持所有文件扩展名，否则在vue文件中使用ts会报错
			},
		],
	],
};
