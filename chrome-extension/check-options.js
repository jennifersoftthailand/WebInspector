const fs = require('fs');
const path = require('path');

console.log('🔍 Checking options files...\n');

const optionsFiles = [
	{ path: 'options.html', location: 'root' },
	{ path: 'options.css', location: 'root' }
];

optionsFiles.forEach(fileInfo => {
	const exists = fs.existsSync(fileInfo.path);
	console.log(`${exists ? '✅' : '❌'} ${fileInfo.path} (${fileInfo.location})`);

	if (exists) {
		const stats = fs.statSync(fileInfo.path);
		console.log(`   Size: ${stats.size} bytes, Type: ${stats.isDirectory() ? 'directory' : 'file'}`);
	}
});

// 어떤 options.html을 사용할지 결정
console.log('\n💡 Recommendation:');
if (fs.existsSync('options.html') && fs.existsSync('options.html')) {
	console.log('❌ Duplicate files detected!');
	console.log('   Use the one in root folder for options_page');
	console.log('   Delete the duplicate in src/options/');
} else if (fs.existsSync('options.html')) {
	console.log('✅ Use options.html from root folder');
} else if (fs.existsSync('options.html')) {
	console.log('✅ Use options.html from src/options/ folder');
} else {
	console.log('❌ No options.html found!');
}