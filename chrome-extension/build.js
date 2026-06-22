const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building Web Inspector Extension...');

// 먼저 파일 존재 여부 확인
const requiredFiles = [
	'src/content.js',
	'src/background.js',
	'src/panel.js',
	'src/options.js'
];

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
	if (fs.existsSync(file)) {
		console.log(`✅ ${file}`);
	} else {
		console.log(`❌ ${file} - NOT FOUND`);
	}
});

try {
	// Webpack 빌드 실행
	console.log('📦 Running webpack build...');
	execSync('npx webpack --config webpack.config.js', { stdio: 'inherit' });

	// 정적 파일 복사
	console.log('📁 Copying static files...');
	const staticFiles = [
		'panel.html',
		'panel.css',
		'content.css',
		'options.html',
		'options.css',
		'manifest.json'
	];

	staticFiles.forEach(file => {
		if (fs.existsSync(file)) {
			const dest = path.join('dist', path.basename(file));
			fs.copyFileSync(file, dest);
			console.log(`✅ Copied ${file}`);
		} else {
			console.log(`⚠️ ${file} - Skipped (not found)`);
		}
	});

	// icons 폴더 복사
	if (fs.existsSync('icons')) {
		fs.cpSync('icons', 'dist/icons', { recursive: true });
		console.log('✅ Copied icons folder');
	}

	console.log('✅ Build completed successfully!');

} catch (error) {
	console.error('❌ Build failed:', error);
	process.exit(1);
}