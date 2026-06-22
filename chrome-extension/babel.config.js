module.exports = {
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					browsers: ['last 2 Chrome versions']
				},
				useBuiltIns: 'usage',
				corejs: 3
			}
		]
	]
};