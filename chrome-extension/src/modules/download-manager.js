// download-manager.js
class DownloadManager {
	constructor(stateManager) {
		console.log('🔧 DownloadManager initializing...');

		if (!stateManager) {
			throw new Error('DownloadManager requires StateManager instance');
		}

		this.state = stateManager;

		// ✅ 다운로드 관련 상수들
		this.UI_EXCLUDE_SELECTORS = [
			'#web-inspector-panel',
			'#ad-container',
			'#crosshair',
			'#coord-tooltip',
			'.highlight-element',
			'.selected-element',
			'.measurement-line',
			'.measurement-text',
			'.child-highlight',
			'.padding-highlight',
			'.external-element-highlight',
			'.center-marker',
			'.iframe-overlay',
			'.t-line-with-markers',
			'.t-line-vertical-with-markers',
			'.connected-tooltip',
			'.cookie-message',
			'[id*="premium"]',
			'[class*="premium"]',
			'.premium-popup',

			// ✅ [추가] Premium Web Tools 광고 컨테이너 관련 선택자들
			'[style*="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"]',
			'[style*="667eea"]',
			'[style*="764ba2"]',
			'[style*="Premium Web Tools"]',
			'[style*="Upgrade for advanced features"]',
			'[style*="ad-free experience"]',

			// ✅ [추가] 특정 스타일 패턴을 가진 요소들
			'[style*="display: flex"][style*="flex-direction: column"][style*="align-items: center"]',
			'[style*="display:flex"][style*="flex-direction:column"][style*="align-items:center"]',

			// ✅ [추가] 광고 컨테이너 내부 요소들
			'#ad-container *',

			// ✅ [추가] size 측정 관련 요소들
			'.size-line-extended',
			'.size-line-vertical-extended',
			'.size-text',
			'.margin-value-text',
			'.padding-value-text',
			'.margin-area',
			'.padding-area',
			'.corner-radius-indicator',
			'.radius-value-text',
			'.corner-fold-indicator',

			// ✅ [추가] 특정 클래스 패턴
			'[class*="svg-measurement"]',
			'[data-inspector-type]',

			// ✅ [추가] 특정 텍스트 내용을 가진 요소들 (내용 기반 필터링)
			':contains("Premium Web Tools")',
			':contains("Upgrade for advanced features")',
			':contains("ad-free experience")',
			':contains("Learn More")'
		];

		console.log('✅ DownloadManager initialized');
	}

	/**
     * ✅ DownloadManager 정리 메서드
     */
    cleanup() {
        console.log('🧹 DownloadManager cleaning up...');
        this.stateManager = null;
        this.isDownloading = false;
        console.log('✅ DownloadManager cleaned up');
    }

    completeCleanup() {
        this.cleanup();
    }

	//############################################################################################################ DOWNLOAD FEATURE START
	// HTML 다운로드 함수 - 웹 페이지 전체 다운로드 (수정된 버전)
	downloadFullPage() {
		if (this.state.isDownloading) {
			console.log('Download already in progress');
			return;
		}

		this.state.isDownloading = true;
		console.log('Starting download...');

		// ✅ 프리미엄 여부 확인
		chrome.storage.sync.get(['downloadCount', 'isPremium', 'formatHtml'], (data) => {
			console.log('-------> premium data.formatHtml:', data.formatHtml);

			// ✅ formatHtml 옵션이 없을 경우 기본값 true로 설정
			const shouldFormatHtml = data.formatHtml !== undefined ? data.formatHtml : true;
			console.log('-------> premium shouldFormatHtml:', shouldFormatHtml);

			const downloadCount = data.downloadCount || 0;
			const isPremium = data.isPremium || false;

			if (!isPremium && downloadCount >= 5) {
				this.showCookieMessage('Download limit exceeded. Please upgrade to premium.', 'error');
				setTimeout(() => {
					this.openPremiumPopup();
				}, 1000);
				this.state.isDownloading = false; // ✅ 다운로드 상태 해제
				return;
			}

			try {
				// ✅ DOM을 복제하여 UI 요소 제거
				const clonedDoc = document.cloneNode(true);
				this.removeUIElementsFromClone(clonedDoc);

				// ✅ HTML 문자열로 변환
				let cleanHtml = clonedDoc.documentElement.outerHTML;

				// ✅ HTML 정렬 (옵션에 따라)
				if (shouldFormatHtml) {
					cleanHtml = this.formatHtml(cleanHtml);
				}

				// ✅ 외부 리소스 처리
				this.processExternalResources(cleanHtml, (processedHtml) => {
					try {
						// ✅ CSS 스타일 시트 수집
						let styles = this.collectAllStyles();

						// ✅ 최종 HTML 생성
						const fullHtml = this.createCompleteHtmlDocument(processedHtml, styles);

						// ✅ 잠시 대기 후 HTML 캡처 (UI가 완전히 숨겨진 후)
						setTimeout(() => {
							try {
								// ✅ 다운로드 실행
								this.triggerDownload(fullHtml, this.getFileName() + '.html').then(() => {
									// 살짝 대기...
									setTimeout(() => {
										console.log('HTML download successful!')
									}, 100);
								}).catch(error => {
									console.error('Download error:', error);
									this.showCookieMessage('Download failed. Please try again.', 'error');
								});
							} catch (error) {
								console.error('Download error:', error);
								this.showCookieMessage('Download failed. Please try again.', 'error');
							}
						}, 100);

						// ✅ 다운로드 횟수 업데이트
						if (!isPremium) {
							chrome.storage.sync.set({ downloadCount: downloadCount + 1 }, () => {
								this.showCookieMessage('Downloads remaining: ' + (4 - downloadCount), 'info');
							});
						} else {
							this.showCookieMessage('Page downloaded successfully!', 'success');
						}

					} catch (error) {
						console.error('Download processing error:', error);
						this.showCookieMessage('Download failed. Please try again.', 'error');
					} finally {
						this.state.isDownloading = false; // ✅ 다운로드 상태 해제
					}
				});

			} catch (error) {
				console.error('Download error:', error);
				this.showCookieMessage('Download failed. Please try again.', 'error');
				this.state.isDownloading = false; // ✅ 다운로드 상태 해제
			}
		});
	}

	// ✅ 추가: 복제된 DOM에서 UI 요소 제거
	removeUIElementsFromClone(clonedDoc) {
		this.UI_EXCLUDE_SELECTORS.forEach(selector => {
			try {
				const elements = clonedDoc.querySelectorAll(selector);
				elements.forEach(element => {
					if (element && element.parentNode) {
						element.parentNode.removeChild(element);
					}
				});
			} catch (error) {
				console.log('Error removing element:', selector, error);
			}
		});
	}

	// ✅ 추가: 다운로드 트리거 함수 수정 - 중복 방지
	triggerDownload(content, filename) {
		return new Promise((resolve, reject) => {
			try {
				const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
				const url = URL.createObjectURL(blob);

				// ✅ 기존 다운로드 링크 제거
				const existingDownload = document.getElementById('downloadId');
				if (existingDownload && existingDownload.parentNode) {
					existingDownload.parentNode.removeChild(existingDownload);
				}

				const a = document.createElement('a');
				a.id = 'downloadId';
				a.href = url;
				a.download = filename;
				a.style.display = 'none';

				document.body.appendChild(a);

				// ✅ setTimeout으로 다운로드 트리거 (더 안정적)
				setTimeout(() => {
					try {
						// ✅ 직접 click 이벤트 발생 (한 번만)
						a.click();

						// ✅ 잠시 후 정리
						setTimeout(() => {
							try {
								if (a.parentNode) {
									a.parentNode.removeChild(a);
									resolve(); // cleanup 에러는 무시하고 성공 처리
								}
								URL.revokeObjectURL(url);
							} catch (e) {
								console.log('Cleanup error:', e);
							}
						}, 1000);
					} catch (clickError) {
						console.error('Click error:', clickError);
						reject(clickError);
					}
				}, 100);

			} catch (error) {
				console.error('Trigger download error:', error);
				reject(error);
			}
		});
	}

	// 파일 이름 생성 함수
	getFileName() {
		const title = document.title || 'webpage';
		const domain = window.location.hostname || 'page';
		const date = new Date().toISOString().slice(0, 10);

		// 파일명에 사용할 수 없는 문자 제거
		return (title + '_' + domain + '_' + date)
			.replace(/[^a-zA-Z0-9가-힣-_]/g, '_')
			.replace(/_+/g, '_')
			.substring(0, 50);
	}

	// 외부 리소스 처리 함수
	processExternalResources(html, callback) {
		// DOM 파서를 사용하여 HTML 처리
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		// 이미지 처리 - Base64로 변환 시도
		const images = doc.querySelectorAll('img[src]');
		let processedCount = 0;
		const totalImages = images.length;

		if (totalImages === 0) {
			callback(doc.documentElement.outerHTML);
			return;
		}

		images.forEach(img => {
			const src = img.getAttribute('src');
			if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
				// 외부 이미지인 경우 Base64로 변환 시도
				this.convertImageToBase64(src, (base64) => {
					if (base64) {
						img.setAttribute('src', base64);
					} else {
						// 변환 실패 시 원본 URL 유지
						img.setAttribute('data-original-src', src);
					}

					processedCount++;
					if (processedCount === totalImages) {
						callback(doc.documentElement.outerHTML);
					}
				});
			} else {
				processedCount++;
				if (processedCount === totalImages) {
					callback(doc.documentElement.outerHTML);
				}
			}
		});
	}

	// ✅ 수정: 완전한 HTML 문서 생성 함수 - 템플릿 리터럴 문법 오류 수정
	createCompleteHtmlDocument(html, styles) {
		return `<!DOCTYPE html>
			<html>
			<head>
			<meta charset="utf-8">
			<title>${document.title || 'Exported Web Page'}</title>
			<meta name="generator" content="Web Inspector">
			<style>
				${styles}
				
				/* 리소스 로드 실패 시 대체 스타일 */
				.resource-load-failed {
					background-color: #ffcccc !important;
					border: 2px dashed #ff4757 !important;
					padding: 10px !important;
					color: #ff4757 !important;
				}
				
				img.resource-load-failed {
					min-width: 50px;
					min-height: 50px;
				}
				
				/* 레이아웃 유지를 위한 기본 스타일 */
				body {
					margin: 0;
					padding: 0;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				}
			</style>
			</head>
			<body>
			${html}
			</body>
			</html>`;
	}

	// 이미지를 Base64로 변환하는 함수
	convertImageToBase64(url, callback) {
		// 동일 출처 이미지만 처리
		if (!url.startsWith(window.location.origin) && !url.startsWith('/')) {
			callback(null);
			return;
		}

		// 상대 경로인 경우 절대 경로로 변환
		let absoluteUrl = url;
		if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
			try {
				absoluteUrl = new URL(url, window.location.href).href;
			} catch (e) {
				callback(null);
				return;
			}
		}

		// Fetch API를 사용하여 이미지 가져오기
		fetch(absoluteUrl)
			.then(response => response.blob())
			.then(blob => {
				const reader = new FileReader();
				reader.onloadend = () => {
					callback(reader.result);
				};
				reader.readAsDataURL(blob);
			})
			.catch(error => {
				console.warn('Could not convert image to Base64:', absoluteUrl, error);
				callback(null);
			});
	}

	// 모든 스타일 수집 함수
	collectAllStyles() {
		let styles = '';
		const styleSheets = document.styleSheets;

		for (let i = 0; i < styleSheets.length; i++) {
			try {
				// 동일 출처 스타일시트만 처리
				if (styleSheets[i].href && styleSheets[i].href.startsWith(window.location.origin)) {
					const rules = styleSheets[i].cssRules;
					if (rules) {
						for (let j = 0; j < rules.length; j++) {
							styles += rules[j].cssText + '\n';
						}
					}
				} else if (!styleSheets[i].href) {
					// 인라인 스타일시트 처리
					const rules = styleSheets[i].cssRules;
					if (rules) {
						for (let j = 0; j < rules.length; j++) {
							styles += rules[j].cssText + '\n';
						}
					}
				}
			} catch (e) {
				// CORS 오류는 무시하고 경고만 출력
				console.warn('Could not access stylesheet: ', styleSheets[i].href);
			}
		}

		// 인라인 스타일 추가
		const inlineStyles = document.querySelectorAll('style');
		inlineStyles.forEach(style => {
			if (style.sheet) {
				try {
					const rules = style.sheet.cssRules;
					if (rules) {
						for (let j = 0; j < rules.length; j++) {
							styles += rules[j].cssText + '\n';
						}
					}
				} catch (e) {
					console.warn('Could not access inline style: ', e);
					styles += style.innerHTML + '\n';
				}
			} else {
				styles += style.innerHTML + '\n';
			}
		});

		return styles;
	}

	// 쿠키 메시지 표시 함수
	showCookieMessage(message, type) {
		// 기존 메시지 제거
		const existingMessage = document.querySelector('.cookie-message');
		if (existingMessage) {
			document.body.removeChild(existingMessage);
		}

		const messageDiv = document.createElement('div');
		messageDiv.className = 'cookie-message ' + type;
		messageDiv.textContent = message;
		messageDiv.style.position = 'fixed';
		messageDiv.style.bottom = '20px';
		messageDiv.style.right = '20px';
		messageDiv.style.backgroundColor = type === 'error' ? '#ff4757' :
			type === 'info' ? '#3498db' : '#2ed573';
		messageDiv.style.color = 'white';
		messageDiv.style.padding = '10px 15px';
		messageDiv.style.borderRadius = '5px';
		messageDiv.style.zIndex = this.state.Z_INDEX_LAYERS.PANEL; // ✅ stateManager의 z-index 사용
		messageDiv.style.fontFamily = 'Arial, sans-serif';
		messageDiv.style.fontSize = '14px';

		document.body.appendChild(messageDiv);

		// 3초 후 자동 제거
		setTimeout(() => {
			if (messageDiv.parentNode) {
				document.body.removeChild(messageDiv);
			}
		}, 3000);
	}

	// 프리미엄 팝업 열기 함수
	openPremiumPopup() {
		const popup = document.createElement('div');
		popup.className = 'premium-popup';
		popup.style.position = 'fixed';
		popup.style.top = '50%';
		popup.style.left = '50%';
		popup.style.transform = 'translate(-50%, -50%)';
		popup.style.zIndex = this.state.Z_INDEX_LAYERS.PANEL;
		popup.style.background = 'white';
		popup.style.padding = '20px';
		popup.style.borderRadius = '8px';
		popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
		popup.style.width = '300px';
		popup.style.textAlign = 'center';

		popup.innerHTML = `
            <h3 style="margin-top:0; color:#6a11cb;">Upgrade to Premium</h3>
            <p>Get unlimited HTML downloads and ad-free experience!</p>
            <ul style="text-align:left; margin-bottom:20px;">
                <li>Unlimited HTML downloads</li>
                <li>No advertisements</li>
                <li>Priority support</li>
            </ul>
            <button id="purchase-premium" style="background:linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:600;">Purchase Premium</button>
            <button id="close-popup" style="background:#f1f2f6; color:#57606f; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; margin-left:10px;">Close</button>
        `;

		document.body.appendChild(popup);

		// 구매 버튼 이벤트
		document.getElementById('purchase-premium').addEventListener('click', (e) => {
			e.stopPropagation();
			this.showCookieMessage('Premium purchase is not available yet. Please try again later.', 'info');
		});

		// 닫기 버튼 이벤트
		document.getElementById('close-popup').addEventListener('click', (e) => {
			e.stopPropagation();
			document.body.removeChild(popup);
		});

		// 팝업 자체 클릭 이벤트 차단
		popup.addEventListener('click', (e) => {
			e.stopPropagation();
		});
	}

	//----------------------------------------------------- beautify feature, START
	// ✅ 추가: HTML 정렬 및 beautify 함수
	formatHtml(html) {
		try {
			// ✅ 간단한 HTML 정렬 함수
			let formatted = '';
			let indentLevel = 0;
			const lines = html.split(/\r?\n/);
			const indentStr = '    '; // 4 spaces

			for (let line of lines) {
				line = line.trim();

				if (!line) continue;

				// 닫는 태그면 indent 감소
				if (line.startsWith('</')) {
					indentLevel = Math.max(0, indentLevel - 1);
				}

				// 현재 라인에 indent 추가
				formatted += indentStr.repeat(indentLevel) + line + '\n';

				// 여는 태그이고 self-closing이 아니면 indent 증가
				if (line.startsWith('<') && !line.startsWith('</') &&
					!line.endsWith('/>') && !line.includes('<!') &&
					!line.includes('<meta') && !line.includes('<link') &&
					!line.includes('<img') && !line.includes('<br') &&
					!line.includes('<hr') && !line.includes('<input')) {
					indentLevel++;
				}
			}
			return formatted;

		} catch (error) {
			console.log('HTML formatting error, returning original:', error);
			return html; // 에러 발생 시 원본 HTML 반환
		}
	}

	// ✅ 추가: 고급 HTML 정렬 옵션 (선택적)
	advancedHtmlFormat(html) {
		try {
			// HTML 파싱 및 재구성
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');

			// ✅ HTML을 깔끔하게 재생성
			return this.formatNode(doc.documentElement, 0);
		} catch (error) {
			console.log('Advanced HTML formatting failed:', error);
			return this.formatHtml(html); // 기본 포맷팅으로 fallback
		}
	}

	formatNode(node, depth) {
		const indent = '    '.repeat(depth);
		let result = '';

		if (node.nodeType === Node.ELEMENT_NODE) {
			// 요소 노드
			const tagName = node.tagName.toLowerCase();
			const attributes = Array.from(node.attributes)
				.map(attr => `${attr.name}="${attr.value}"`)
				.join(' ');

			const attributesStr = attributes ? ' ' + attributes : '';

			if (node.childNodes.length === 0) {
				// 자식이 없는 요소
				result += `${indent}<${tagName}${attributesStr} />\n`;
			} else if (node.childNodes.length === 1 &&
				node.childNodes[0].nodeType === Node.TEXT_NODE) {
				// 텍스트만 있는 요소
				const text = node.textContent.trim();
				result += `${indent}<${tagName}${attributesStr}>${text}</${tagName}>\n`;
			} else {
				// 자식이 있는 요소
				result += `${indent}<${tagName}${attributesStr}>\n`;

				// 자식 노드 처리
				Array.from(node.childNodes).forEach(child => {
					if (child.nodeType === Node.TEXT_NODE) {
						const text = child.textContent.trim();
						if (text) {
							result += `${indent}    ${text}\n`;
						}
					} else {
						result += this.formatNode(child, depth + 1);
					}
				});

				result += `${indent}</${tagName}>\n`;
			}
		} else if (node.nodeType === Node.TEXT_NODE) {
			// 텍스트 노드
			const text = node.textContent.trim();
			if (text) {
				result += `${indent}${text}\n`;
			}
		}

		return result;
	}
	//----------------------------------------------------- beautify feature, END

	
}