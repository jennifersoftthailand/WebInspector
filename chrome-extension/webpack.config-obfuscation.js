const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');

const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	// 소스맵 설정: CSP 호환되는 cheap-module-source-map 사용
	devtool: 'cheap-module-source-map',

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
										'last 2 Edge versions',
										'ie >= 11'  // ✅ IE 지원 (폴리필 필요)
									]
								},
								useBuiltIns: 'usage', // ✅ 폴리필 사용 방식 설정
								corejs: 3, // ✅ 코어 JS 버전 지정
								modules: false, // ✅ 모듈 변환 비활성화 (Webpack이 처리)
								loose: true, // ✅ 느슨한 모드로 변환 (더 나은 호환성)
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
						drop_console: true, // 콘솔 로그 제거
						drop_debugger: true, // 디버거 문 제거
						pure_funcs: ['console.log', 'console.info', 'console.debug'], // 특정 함수 호출 제거
						unused: true, // 사용되지 않는 코드 제거
						dead_code: true, // 죽은 코드 제거
						booleans: true, // 불린 표현식 최적화
						if_return: true, // if-return 최적화
						join_vars: true, // 변수 선언 결합
						collapse_vars: true, // 변수 축소
						reduce_vars: true // 변수 사용 감소
					},
					// 난독화 옵션
					mangle: {
						toplevel: true, // 최상위 변수명 난독화
						keep_fnames: false, // 함수 이름 유지하지 않음
						keep_classnames: false // 클래스 이름 유지하지 않음
					},
					// 출력 옵션
					output: {
						comments: false, // 모든 주석 제거
						beautify: false, // beautify 비활성화
						ascii_only: true // ASCII 문자만 사용 (이슈 방지)
					},
					// 기타 옵션
					ecma: 2015, // ECMAScript 버전 지정
					safari10: true // Safari 10 이슈 해결
				},
				extractComments: false, // 주석 추출 파일 생성 비활성화
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
		// JavaScript Obfuscator 플러그인 (강력한 난독화)
		new JavaScriptObfuscator({
			// 문자열 관련 옵션
			rotateStringArray: true, // 문자열 배열 무작위 회전
			stringArray: true, // 문자열을 배열로 추출
			stringArrayThreshold: 0.75, // 75% 이상 사용된 문자열만 배열화
			splitStrings: true, // 문자열 분할
			splitStringsChunkLength: 10, // 문자열 분할 최대 길이

			// 변환 옵션
			transformObjectKeys: true, // 객체 키 변환
			numbersToExpressions: true, // 숫자를 표현식으로 변환
			simplify: true, // 코드 단순화

			// 식별자 옵션
			identifierNamesGenerator: 'hexadecimal', // 식별자 이름을 16진수로 생성
			renameGlobals: false, // 글로벌 변수 이름 변경 비활성화 (Chrome 확장 프로그램 호환)

			// 보호 옵션
			selfDefending: true, // 자기 방어 기능 (디버깅 방지)
			deadCodeInjection: true, // 데드 코드 삽입
			deadCodeInjectionThreshold: 0.4, // 데드 코드 삽입 비율

			// 디버깅 옵션
			disableConsoleOutput: true, // 콘솔 출력 비활성화
			debugProtection: false, // 디버그 보호 비활성화 (확장 프로그램 안정성)
			debugProtectionInterval: 0, // 디버그 보호 간격

			// 기타 옵션
			target: 'browser', // 대상 환경: 브라우저
			ignoreRequireImports: false, // require imports 무시하지 않음
			log: false // 로그 출력 비활성화
		}, [
			// 난독화 적용할 파일 지정
			'content.js',
			'background.js',
			'panel.js',
			'options.js'
		]),

		// 파일 복사 플러그인
		new CopyWebpackPlugin({
			patterns: [
				{ from: 'src/_locales', to: '_locales' },    // 다국어 파일 복사
				{ from: 'src/icons', to: 'icons' },          // 아이콘 파일 복사
				{ from: 'src/options.html', to: 'options.html' }, // 옵션 페이지 HTML
				{ from: 'src/panel.html', to: 'panel.html' },     // 패널 페이지 HTML
				{ from: 'src/options.css', to: 'options.css' },   // 옵션 페이지 CSS
				{ from: 'src/panel.css', to: 'panel.css' },       // 패널 페이지 CSS
				{ from: 'src/content.css', to: 'content.css' }    // 콘텐트 스크립트 CSS
			]
		}),

		// CSS 추출 플러그인
		new MiniCssExtractPlugin({
			filename: '[name].css', // CSS 파일명 패턴
			chunkFilename: '[id].css' // 청크 CSS 파일명 패턴
		}),

		// 📜 Manifest 생성 플러그인: Chrome 확장 프로그램의 핵심 설정 파일 생성
		new WebpackManifestPlugin({
			// 🔤 생성할 매니페스트 파일명
			fileName: 'manifest.json',

			// 🔄 매니페스트 내용 생성 함수
			// - seed: 초기값 (일반적으로 빈 객체)
			// - files: Webpack이 생성한 모든 파일 목록
			// - entries: entry point에서 정의된 청크 정보
			generate: (seed, files, entries) => {
				// 🏗️ Chrome 확장 프로그램 매니페스트 객체 생성 (Manifest V3 기준)
				const manifest = {
					// 🔢 매니페스트 버전: 3 (최신 버전)
					// - V2와 차이점: background page → service worker, 보안 강화 등
					"manifest_version": 3,

					// 🔤 확장 프로그램 이름 (다국어 지원)
					// - __MSG_extensionName__: _locales 폴더의 메시지에서 값을 가져옴
					"name": "__MSG_extensionName__",

					// 🔢 확장 프로그램 버전 (semantic versioning)
					"version": "1.3.0",

					// 📝 확장 프로그램 설명 (다국어 지원)
					"description": "__MSG_extensionDescription__",

					// 🌐 기본 언어 설정
					"default_locale": "en",

					// 🔐 필요한 권한 목록
					"permissions": [
						"activeTab",       // ✅ 현재 활성화된 탭 접근 권한
						"storage",         // ✅ 로컬/동기화 저장소 사용 권한
						"scripting",       // ✅ 스크립트 주입 및 실행 권한
						"downloads",       // ✅ 파일 다운로드 관리 권한
						"contextMenus"     // ✅ 우클릭 컨텍스트 메뉴 생성 권한
					],

					// 🌐 호스트 권한: 접근 가능한 웹사이트 도메인
					"host_permissions": [
						"<all_urls>"      // 🌍 모든 URL에 접근 허용
					],

					// 🔄 백그라운드 서비스 워커 설정
					// - Manifest V3에서 background page를 대체
					// - 가벼우며 리소스 사용이 적음
					"background": {
						"service_worker": "background.js"  // 📄 서비스 워커 진입점
					},

					// 📄 콘텐트 스크립트: 웹 페이지에 주입될 스크립트
					"content_scripts": [
						{
							"matches": [
								"<all_urls>"  // 🌍 모든 웹사이트에서 실행
							],
							"js": [
								"content.js"  // 📄 주입할 JavaScript 파일
							],
							"css": [
								"content.css" // 🎨 주입할 CSS 파일
							],
							"run_at": "document_idle"  // ⏰ 실행 시점: 페이지 로드 완료 후
						}
					],

					// 🎯 확장 프로그램 액션 (도구 모음 아이콘)
					"action": {
						"default_title": "__MSG_toggleInspector__",  // 🔤 아이콘 호버 시 툴팁
						"default_icon": {  // 🖼️ 아이콘 설정 (여러 크기 제공)
							"16": "icons/icon16.png",   // 📱 작은 아이콘 (16x16)
							"48": "icons/icon48.png",   // 💻 중간 아이콘 (48x48)
							"128": "icons/icon128.png"  // 🖥️  큰 아이콘 (128x128)
						}
					},

					// ⚙️ 옵션 페이지 설정
					"options_ui": {
						"page": "options.html",    // 📄 옵션 페이지 HTML
						"open_in_tab": true        // 🔖 새 탭에서 열기 여부
					},

					// 🌐 웹에서 접근 가능한 리소스 (웹 페이지에서 사용 가능한 파일)
					"web_accessible_resources": [
						{
							"resources": [
								"panel.html",      // 📄 패널 HTML 파일
								"panel.css",       // 🎨 패널 CSS 파일
								"panel.js",        // 📄 패널 JavaScript 파일
								"content.css",     // 🎨 콘텐트 CSS 파일
								"icons/*.png"      // 🖼️ 아이콘 이미지 파일들
							],
							"matches": [
								"<all_urls>"      // 🌍 모든 웹사이트에서 접근 허용
							]
						}
					],

					// 🖼️ 확장 프로그램 아이콘 설정
					"icons": {
						"16": "icons/icon16.png",   // 📱 Chrome 웹 스토어 및 작은 UI
						"48": "icons/icon48.png",   // 💻 확장 프로그램 관리 페이지
						"128": "icons/icon128.png"  // 🖥️  Chrome 웹 스토어 대표 이미지
					},

					// ⌨️ 키보드 단축키 설정
					"commands": {
						"toggle-inspector": {  // 🔍 검사기 토글 단축키
							"suggested_key": {
								"default": "Ctrl+Shift+I",      // 🪟 Windows/Linux 단축키
								"mac": "Command+Shift+I"        // 🍎 macOS 단축키
							},
							"description": "__MSG_toggleInspector__"  // 🔤 단축키 설명
						},
						"toggle-measurement": {  // 📏 측정 도구 토글 단축키
							"suggested_key": {
								"default": "Ctrl+Shift+M",      // 🪟 Windows/Linux 단축키
								"mac": "Command+Shift+M"        // 🍎 macOS 단축키
							},
							"description": "__MSG_toggleMeasurement__"  // 🔤 단축키 설명
						}
					},

					// 🛡️ 콘텐트 보안 정책 (CSP)
					"content_security_policy": {
						// 🔒 확장 프로그램 페이지에 대한 보안 정책
						"extension_pages": "script-src 'self'; object-src 'self'"
						// - script-src 'self': 자신의 스크립트만 실행 허용
						// - object-src 'self': 자신의 객체만 로드 허용
						// - 외부 스크립트 차단으로 보안 강화
					}
				};

				// 📤 생성된 매니페스트 객체 반환
				// - Webpack이 이 객체를 manifest.json 파일로 저장
				return manifest;
			}
		})
	],

	// 성능 힌트 설정
	performance: {
		hints: 'warning', // 성능 경고 표시
		maxEntrypointSize: 512000, // 진입점 최대 크기 (500KB)
		maxAssetSize: 512000 // 에셋 최대 크기 (500KB)
	},

	// 해결(Resolution) 설정
	resolve: {
		extensions: ['.js', '.json'], // 확장자 자동 해결
		alias: {
			'@': path.resolve(__dirname, 'src') // 별칭 설정 (선택사항)
		}
	},

	// 통계 출력 설정
	stats: {
		colors: true, // 컬러 출력
		modules: false, // 모듈 정보 숨김
		children: false, // 자식 컴파일러 정보 숨김
		chunks: false, // chunk 정보 숨김
		chunkModules: false // chunk 모듈 정보 숨김
	}
};