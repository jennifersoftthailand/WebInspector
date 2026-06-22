const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
// const JavaScriptObfuscator = require('webpack-obfuscator'); // ❌ 제거: 과도한 난독화로 심사 통과 어려움

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	// 소스맵 설정: CSP 호환되는 cheap-module-source-map 사용
	// devtool: 'cheap-module-source-map', // ❌ 제거: 프로덕션에서는 소스맵 제거
	devtool: false, // ✅ 수정: 프로덕션 빌드 시 소스맵 비활성화

	// 모드 설정: production으로 변경하여 최적화 활성화
	mode: 'production',

	// 진입점(Entry Points) 설정
	entry: {
		content: './src/content.js',
		background: './src/background.js',
		panel: './src/panel.js',
		options: './src/options.js'
	},

	// 출력(Output) 설정
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		clean: true, // 빌드 전에 출력 디렉토리 정리
	},

	// 모듈(Module) 규칙 설정
	module: {
		rules: [
			// CSS 파일 처리 규칙
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader, // CSS를 별도 파일로 추출
					'css-loader' // CSS를 JavaScript에서 import 가능하게 변환
				]
			},
			// JavaScript 파일 처리 규칙 (Babel 변환)
			{
				test: /\.js$/,
				exclude: /node_modules/, // node_modules 제외
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							['@babel/preset-env', {
								// 대상 브라우저 설정
								targets: {
									browsers: [
										'last 2 Chrome versions',
										'last 2 Firefox versions',
										'last 2 Edge versions'
										// 'ie >= 11'  // ❌ 제거: IE 지원 종료, Chrome 확장 프로그램에서는 불필요
									]
								},
								useBuiltIns: 'usage', // ✅ 폴리필 사용 방식 설정
								corejs: 3, // ✅ 코어 JS 버전 지정
								modules: false, // ✅ 모듈 변환 비활성화 (Webpack이 처리)
								// loose: true, // ❌ 제거: 호환성 문제 가능성
								debug: false // ✅ 디버깅을 위한 내부 도우미 사용
							}]
						]
					}
				}
			}
		]
	},

	// 최적화(Optimization) 설정
	optimization: {
		minimize: true, // 코드 최소화 활성화
		minimizer: [
			new TerserPlugin({
				parallel: true, // 병렬 처리로 빌드 속도 향상
				terserOptions: {
					// 압축 옵션
					compress: {
						drop_console: true, // ✅ 콘솔 로그 제거 (보안X, 깔끔함O)
						drop_debugger: true, // ✅ 디버거 문 제거
						// pure_funcs: ['console.log', 'console.info', 'console.debug'], // ❌ 제거: drop_console으로 충분
						unused: true, // ✅ 사용되지 않는 코드 제거
						dead_code: true, // ✅ 죽은 코드 제거
						booleans: true, // ✅ 불린 표현식 최적화
						if_return: true, // ✅ if-return 최적화
						join_vars: true, // ✅ 변수 선언 결합
						collapse_vars: true, // ✅ 변수 축소
						reduce_vars: true // ✅ 변수 사용 감소
					},
					// 난독화 옵션
					mangle: {
						toplevel: true, // ✅ 최상위 변수명 난독화 (기본 수준)
						// keep_fnames: false, // ❌ 제거: 기본값 사용 (함수명 유지 필요)
						// keep_classnames: false // ❌ 제거: 기본값 사용 (클래스명 유지 필요)
					},
					// 출력 옵션
					output: {
						comments: false, // ✅ 모든 주석 제거
						beautify: false, // ✅ beautify 비활성화
						ascii_only: true // ✅ ASCII 문자만 사용 (이슈 방지)
					},
					// 기타 옵션
					ecma: 2015, // ECMAScript 버전 지정
					// safari10: true // ❌ 제거: Chrome 확장 프로그램에서는 불필요
				},
				extractComments: false, // ✅ 주석 추출 파일 생성 비활성화
			})
		],
		// 코드 분할 설정 (Chrome 확장 프로그램에는 기본 분할 사용)
		splitChunks: {
			chunks: 'async', // 비동기 chunk에만 분할 적용
			minSize: 20000, // chunk 최소 크기 (20KB)
			maxSize: 0, // chunk 최대 크기 제한 없음
		}
	},

	// 플러그인(Plugins) 설정
	plugins: [
		// ❌ JavaScript Obfuscator 플러그인 제거 (심사 통과 어려움)
		/*
		new JavaScriptObfuscator({
			rotateStringArray: true,
			stringArray: true,
			stringArrayThreshold: 0.75,
			splitStrings: true,
			splitStringsChunkLength: 10,
			transformObjectKeys: true,
			numbersToExpressions: true,
			simplify: true,
			identifierNamesGenerator: 'hexadecimal',
			renameGlobals: false,
			selfDefending: true,
			deadCodeInjection: true,
			deadCodeInjectionThreshold: 0.4,
			disableConsoleOutput: true,
			debugProtection: false,
			debugProtectionInterval: 0,
			target: 'browser',
			ignoreRequireImports: false,
			log: false
		}, [
			'content.js',
			'background.js', 
			'panel.js',
			'options.js'
		]),
		*/

		// ✅ 파일 복사 플러그인 (변경 없음)
		new CopyWebpackPlugin({
			patterns: [
				{ from: 'src/_locales', to: '_locales' },
				{ from: 'src/icons', to: 'icons' },
				{ from: 'src/options.html', to: 'options.html' },
				{ from: 'src/panel.html', to: 'panel.html' },
				{ from: 'src/options.css', to: 'options.css' },
				{ from: 'src/panel.css', to: 'panel.css' },
				{ from: 'src/content.css', to: 'content.css' }
			]
		}),

		// ✅ CSS 추출 플러그인 (변경 없음)
		new MiniCssExtractPlugin({
			filename: '[name].css',
			chunkFilename: '[id].css'
		}),

		// ✅ Manifest 생성 플러그인 (변경 없음)
		new WebpackManifestPlugin({
			fileName: 'manifest.json',
			generate: (seed, files, entries) => {
				const manifest = {
					"manifest_version": 3,
					"name": "__MSG_extensionName__",
					"version": "1.3.0",
					"description": "__MSG_extensionDescription__",
					"default_locale": "en",
					"permissions": [
						"activeTab",
						"storage",
						"scripting",
						"downloads",
						"contextMenus"
					],
					"host_permissions": [
						"<all_urls>"
					],
					"background": {
						"service_worker": "background.js"
					},
					"content_scripts": [
						{
							"matches": [
								"<all_urls>"
							],
							"js": [
								"content.js"
							],
							"css": [
								"content.css"
							],
							"run_at": "document_idle"
						}
					],
					"action": {
						"default_title": "__MSG_toggleInspector__",
						"default_icon": {
							"16": "icons/icon16.png",
							"48": "icons/icon48.png",
							"128": "icons/icon128.png"
						}
					},
					"options_ui": {
						"page": "options.html",
						"open_in_tab": true
					},
					"web_accessible_resources": [
						{
							"resources": [
								"panel.html",
								"panel.css",
								"panel.js",
								"content.css",
								"icons/*.png"
							],
							"matches": [
								"<all_urls>"
							]
						}
					],
					"icons": {
						"16": "icons/icon16.png",
						"48": "icons/icon48.png",
						"128": "icons/icon128.png"
					},
					"commands": {
						"toggle-inspector": {
							"suggested_key": {
								"default": "Ctrl+Shift+I",
								"mac": "Command+Shift+I"
							},
							"description": "__MSG_toggleInspector__"
						},
						"toggle-measurement": {
							"suggested_key": {
								"default": "Ctrl+Shift+M",
								"mac": "Command+Shift+M"
							},
							"description": "__MSG_toggleMeasurement__"
						}
					},
					"content_security_policy": {
						"extension_pages": "script-src 'self'; object-src 'self'"
					}
				};
				return manifest;
			}
		})
	],

	// ✅ 성능 힌트 설정 (변경 없음)
	performance: {
		hints: 'warning',
		maxEntrypointSize: 512000,
		maxAssetSize: 512000
	},

	// ✅ 해결(Resolution) 설정 (변경 없음)
	resolve: {
		extensions: ['.js', '.json'],
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},

	// ✅ 통계 출력 설정 (변경 없음)
	stats: {
		colors: true,
		modules: false,
		children: false,
		chunks: false,
		chunkModules: false
	}
};