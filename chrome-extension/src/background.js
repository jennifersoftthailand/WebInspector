// 백그라운드 서비스 워커
// background.js

// ✅ 수정: 성능 모니터링
const performanceMetrics = {
	startTime: Date.now(),
	activationCount: 0,
	downloadCount: 0
};


// ✅ 백그라운드에서만 관리하는 중앙 기본값
const WEB_INSPECTOR_DEFAULT_OPTIONS = {
	// 기본 색상 옵션
	highlightColor: '#03d100',
	selectedColor: '#FF9800',
	//rulerColor: '#1a9c2e',
	rulerColor: '#f8f9fa',
	crosshairColor: '#0F9D58',

	// 측정 모드 색상
	viewportColor: '#a000e4',
	elementColor: '#2b8f00',
	marginColor: '#cd0000',
	paddingColor: '#0057e4',
	childrenColor: '#41433a',
	sizeColor: '#bd5e00',
	borderRadiusColor: '#ff00c8',

	// 스타일 옵션
	crosshairStyle: 'partial',
	panelPosition: 'right',
	decimalPlaces: 0,
	defaultDepthLevel: 2,
	formatHtml: true,

	// 선 두께 옵션
	viewportLineThickness: 1,
	elementLineThickness: 0.25,
	marginLineThickness: 0.25,
	paddingLineThickness: 0.25,
	childrenLineThickness: 0.25,
	sizeLineThickness: 0.5,

	// 투명도 옵션
	viewportLineOpacity: 0.9,
	elementLineOpacity: 0.8,
	marginLineOpacity: 0.8,
	paddingLineOpacity: 0.8,
	childrenLineOpacity: 0.8,
	sizeLineOpacity: 0.8,
	childrenBgOpacity: 0.2,

	// 기타 옵션
	tooltipFontSize: '10px',
	mtooltipFontSize: '12px',
	ptooltipFontSize: '12px',
	defaultMeasurementMode: 'element',

	// 고급 기능 옵션
	enableHighZIndexAdjustment: true,
	enableIframeOverlay: true,
	enableIsolation: true
};

// ✅ 측정 모드 상수
const MEASUREMENT_MODES = {
	VIEWPORT: 'viewport',
	ELEMENT: 'element',
	MARGIN: 'margin',
	PADDING: 'padding',
	CHILDREN: 'children',
	SIZE: 'size',
	BORDER_RADIUS: 'borderRadius',
	MEASUREMENT_MODES: 'iframeOverlay'
};

// ✅ Z-Index 레이어 상수
const Z_INDEX_LAYERS = {
	HIGHLIGHT: 2147482031,
	SELECTED: 2147482031,
	AD_CONTAINER: 2147482040,

	CHILDREN: 2147482045,
	EXTERNAL: 2147482045,
	PADDING_HL: 2147482045,
	SIZE_LINE: 2147482045,
	PADDING_LINE: 2147482045,
	MARGIN_LINE: 2147482045,
	VIEWPORT_LINE: 2147482045,
	RADIAL_GUIDE: 2147482045,
	CENTER_MARKER: 2147482045,
	BORDER_RADIUS: 2147482045,
	
	ELEMENT_LINE: 2147482045,
	TEXT: 2147482146,

	PANEL: 2147483646
};

// ✅ 추가: 설치/업데이트 시 탭별 환경 설정
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        console.log(`🚀 ${details.reason} detected, initializing tab-independent environment`);
        
        // ✅ 모든 탭 상태 초기화
        activeTabs.clear();
        tabInstances.clear();
        
        // ✅ 모든 탭 아이콘 상태 초기화
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                updateActionIcon(tab.id, false);
            });
        });
        
        console.log('✅ Tab-independent environment initialized');
    }
});

// 확장 프로그램 설치 시 기본 설정 초기화
// ✅ [수정] 설치 시 기본 설정 - 활성 모드 포함
// ✅ [수정] 설치 시 통합 config만 저장
// ✅ [수정] 설치 시 기본 설정 - iframe-overlay 통합
// ✅ [수정] 설치 시 기본 설정 - iframe-overlay 활성화로 변경
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        console.log('🚀 Web Inspector installing...');

        // ✅ 통합 config 준비 - iframe-overlay를 기본 활성화
        const configData = {
            options: WEB_INSPECTOR_DEFAULT_OPTIONS,
            measurementModes: MEASUREMENT_MODES,
            zIndexLayers: Z_INDEX_LAYERS,
            activeModes: [ 
                'viewport', 'element', 'margin', 'padding', 
                'children', 'size', 'borderRadius',
                'iframeOverlay' // ✅ iframeOverlay를 기본 활성 모드에 추가
            ],
            advancedFeatures: {
                highZIndexAdjustment: true,
                isolation: true
                // ✅ iframeOverlay는 advancedFeatures에서 제거됨
            },
            showButtonPanel: true,
            currentDepthLevel: 2,
            timestamp: Date.now(),
            version: '1.2'
        };

        // ✅ 통합 config만 저장
        await chrome.storage.sync.set({
            webinspector_config: configData
        });

        console.log('✅ Unified config saved during installation - iframeOverlay enabled by default');

        // ✅ 로컬 캐시에도 통합 config 저장
        try {
            localStorage.setItem('webinspector_config', JSON.stringify(configData));
        } catch (e) {
            console.log('Local storage save error:', e);
        }

        // 설치 환영 메시지 표시
        chrome.tabs.create({
            url: chrome.runtime.getURL('options.html')
        });
    }
    
    // ✅ [추가] 업데이트 시에도 iframe-overlay 기본값 마이그레이션
    else if (details.reason === 'update') {
        console.log('🔄 Web Inspector updating...');

        try {
            // ✅ 업데이트 시 기존 config 가져오기
            const result = await chrome.storage.sync.get('webinspector_config');
            const existingConfig = result.webinspector_config || {};

            // ✅ 활성 모드 마이그레이션 - iframeOverlay가 없으면 추가
            let activeModes = existingConfig.activeModes;
            if (!activeModes || !Array.isArray(activeModes)) {
                // ✅ 기존 사용자를 위한 기본 활성 모드 설정 (iframeOverlay 포함)
                activeModes = [
                    'viewport', 'element', 'margin', 'padding', 
                    'children', 'size', 'borderRadius',
                    'iframeOverlay' // ✅ 업데이트 시에도 iframeOverlay 추가
                ];
                console.log('🔄 Migrating to new active modes system with iframeOverlay');
            } else if (!activeModes.includes('iframeOverlay')) {
                // ✅ 기존 활성 모드에 iframeOverlay가 없으면 추가
                activeModes.push('iframeOverlay');
                console.log('🔄 Adding iframeOverlay to existing active modes');
            }

            // ✅ 새로운 config 생성 (기존 값 보존)
            const updatedConfig = {
                options: { ...WEB_INSPECTOR_DEFAULT_OPTIONS, ...(existingConfig.options || {}) },
                measurementModes: existingConfig.measurementModes || MEASUREMENT_MODES,
                zIndexLayers: existingConfig.zIndexLayers || Z_INDEX_LAYERS,
                activeModes: activeModes, // ✅ iframeOverlay 포함된 활성 모드
                advancedFeatures: { ...{
                    highZIndexAdjustment: true,
                    isolation: true
                }, ...(existingConfig.advancedFeatures || {}) },
                showButtonPanel: existingConfig.showButtonPanel !== undefined ? 
                    existingConfig.showButtonPanel : true,
                currentDepthLevel: existingConfig.currentDepthLevel || 2,
                timestamp: Date.now(),
                version: '1.2'
            };

            // ✅ 업데이트된 config 저장
            await chrome.storage.sync.set({ webinspector_config: updatedConfig });

            console.log('✅ Config updated during extension update with iframeOverlay enabled');

        } catch (error) {
            console.log('Storage update error:', error);
        }
    }
});

//##########################################################################################

// 확장 프로그램의 전역 상태를 관리하고 아이콘 클릭을 처리합니다.
let isActive = false;
let activeTabs = new Set(); // ✅ 추가: 활성 탭 추적
const tabInstances = new Map();


// 콘텐츠 스크립트 주입 함수
// ✅ 수정: 콘텐츠 스크립트 주입 함수 - 지연 최소화
// ✅ 수정: 콘텐츠 스크립트 주입 함수 - 인스턴스 상태 관리
function injectContentScripts(tabId, activate) {

	console.log('Injecting content scripts for tab:', tabId);

	const tabState = tabInstances.get(tabId) || { isActive: false, retryCount: 0 };
	chrome.scripting.executeScript({
		target: { tabId: tabId },
		files: ['main-content.js']
	}).then(() => {
		chrome.scripting.insertCSS({
			target: { tabId: tabId },
			files: ['modules/main-content.css']
		}).then(() => {
			if (activate) {
				// 약간의 지연 후 활성화 메시지 전송
				setTimeout(() => {
					if (activate) {
						chrome.tabs.sendMessage(tabId, {
							action: 'activate'
						}).catch(e => {
							console.log('Activation message error after reload:', e);
							tabState.retryCount++;
							tabInstances.set(tabId, tabState);
						});
					}
				}, 1000);
			}
		});
	}).catch(error => {
		console.log('Script injection failed:', error);
		tabState.isActive = false;
		activeTabs.delete(tabId);
		updateActionIcon(tabId, false);
		tabInstances.set(tabId, tabState);
	});
}

//============================================================================>>>> 초기화 START

// ✅ 추가: 강제 비활성화 함수
// ✅ 수정: 강제 비활성화 함수 - 완벽한 정리 보장
// ✅ 수정: 강제 비활성화 함수 - 측정 요소 완전 제거 보장
// ✅ 수정: 안전한 강제 비활성화 함수 - 웹페이지 콘텐츠 보존
function forceDeactivateInspector() {
	console.log('Force deactivating inspector...');

	try {
		let totalRemoved = 0;

		// ✅ 1. 웹 인스펙터 관련 요소만 정확히 제거 (안전한 선택자)
		const inspectorSelectors = [
			// 주요 UI 요소
			'#web-inspector-panel', '#ad-container', '#coord-tooltip', '#crosshair',
			'#ruler-x', '#ruler-y', '#downloadId',

			// 측정 요소 (정확한 클래스 이름)
			'.measurement-line', '.measurement-text',
			'.size-line-extended', '.size-line-vertical-extended',
			'.margin-value-text', '.padding-value-text', '.size-text',
			'.margin-area', '.padding-area',
			'.external-element-highlight', '.child-highlight', '.padding-highlight',
			'.t-line-with-markers', '.t-line-vertical-with-markers',
			'.connected-tooltip', '.center-marker',
			'.corner-radius-indicator', '.radius-value-text',
			'.corner-fold-indicator',

			// Iframe 오버레이
			'.iframe-overlay', '.svg-overlay',

			// UI 메시지
			'.cookie-message', '.premium-popup',

			// 데이터 속성 (웹 인스펙터 전용)
			'[data-web-inspector]', '[data-inspector-type]',
			'[data-measurement]', '[data-selected-element]'
		];

		inspectorSelectors.forEach(selector => {
			try {
				const elements = document.querySelectorAll(selector);
				elements.forEach(element => {
					try {
						if (element && element.parentNode) {
							// ✅ 웹페이지의 원래 요소인지 확인
							const isOriginalElement = isWebPageOriginalElement(element);
							if (!isOriginalElement) {
								element.parentNode.removeChild(element);
								totalRemoved++;
							}
						}
					} catch (e) {
						console.log('Error removing element:', e);
					}
				});
			} catch (e) {
				console.log('Error querying selector:', selector, e);
			}
		});

		// ✅ 2. 웹 인스펙터가 생성한 요소만 제거 (안전한 방법)
		try {
			// 생성 시간으로 식별 (웹 인스펙터 실행 후 생성된 요소만)
			const inspectorStartTime = window.__webInspectorStartTime || Date.now() - 10000;

			document.querySelectorAll('*').forEach(element => {
				try {
					// ✅ 웹 인스펙터가 생성한 요소인지 확인하는 여러 조건
					if (isInspectorCreatedElement(element, inspectorStartTime)) {
						if (element.parentNode) {
							element.parentNode.removeChild(element);
							totalRemoved++;
						}
					}
				} catch (e) {
					// 무시
				}
			});
		} catch (e) {
			console.log('Error removing inspector-created elements:', e);
		}

		// ✅ 3. 이벤트 리스너 제거 (기존 코드 유지)
		const events = ['mousemove', 'click', 'keydown', 'keyup', 'scroll', 'resize'];
		events.forEach(event => {
			try {
				document.removeEventListener(event, handleMouseMove, false);
				document.removeEventListener(event, handleElementClick, true);
				// ... 기타 이벤트 제거
			} catch (e) {
				// 무시
			}
		});

		console.log('Force deactivation completed. Removed:', totalRemoved, 'inspector elements');
		return true;

	} catch (error) {
		console.log('Force deactivation error:', error);
		return false;
	}
}
// ✅ 추가: 웹페이지 원본 요소인지 확인
function isWebPageOriginalElement(element) {
	if (!element) return true;

	// ✅ 웹 인스펙터 요소가 아닌 경우 true 반환 (삭제하지 않음)
	if (!element.classList || !element.id) return true;

	// ✅ 웹 인스펙터 관련 클래스/ID가 없으면 원본 요소
	const inspectorClasses = [
		'measurement', 'highlight', 'selected', 'size', 'margin',
		'padding', 'child', 'external', 'line', 'marker', 'tooltip',
		'area', 'radius', 'corner', 'iframe-overlay', 'svg-overlay'
	];

	const inspectorIds = [
		'web-inspector-panel', 'ad-container', 'coord-tooltip',
		'crosshair', 'ruler-x', 'ruler-y', 'downloadId'
	];

	const hasInspectorClass = inspectorClasses.some(cls =>
		element.classList.contains(cls) ||
		Array.from(element.classList).some(c => c.includes(cls))
	);

	const hasInspectorId = inspectorIds.includes(element.id);

	// 웹 인스펙터 요소가 아니면 원본 요소
	return !hasInspectorClass && !hasInspectorId;
}

// ✅ 추가: 웹 인스펙터가 생성한 요소인지 확인
function isInspectorCreatedElement(element, inspectorStartTime) {
	if (!element) return false;

	// ✅ 생성 시간 확인 (MutationObserver로 추적하는 것이 더 안전함)
	if (element.__webInspectorCreated) {
		return true;
	}

	// ✅ z-index로 확인 (웹 인스펙터 전용 z-index 범위)
	try {
		const style = window.getComputedStyle(element);
		const zIndex = parseInt(style.zIndex);

		if (!isNaN(zIndex) && zIndex >= 2147483620 && zIndex <= 2147483647) {
			return true;
		}
	} catch (e) {
		// 무시
	}

	// ✅ 데이터 속성으로 확인
	if (element.hasAttribute('data-web-inspector') ||
		element.hasAttribute('data-inspector-type') ||
		element.hasAttribute('data-measurement') ||
		element.hasAttribute('data-selected-element')) {
		return true;
	}

	return false;
}


//################################################################################################## 초기화 END





// 확장 프로그램 아이콘 클릭 시 토글 기능 수정
// ✅ 수정: 아이콘 클릭 리스너 - 인스턴스 상태 관리
// ✅ 수정: 아이콘 클릭 리스너 (기존 기능 유지하면서 상태 동기화 추가)
// ✅ 수정: 아이콘 클릭 리스너 - 탭별 독립 실행 보장
chrome.action.onClicked.addListener(async (tab) => {
    console.log('🎯 Icon clicked for tab:', tab.id);

    let tabState = tabInstances.get(tab.id);
    if (!tabState) {
        tabState = { isActive: false, tabId: tab.id };
        tabInstances.set(tab.id, tabState);
    }

    // ✅ 상태 동기화 시도 (에러 처리 강화)
    try {
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'syncStatus'
        }).catch(() => ({ 
            isActive: tabState.isActive,
            tabId: tabState.tabId 
        }));

        // ✅ 상태 불일치 시 보정
        if (tabState.isActive !== response.isActive) {
            console.log(`🔄 State mismatch corrected for tab ${tab.id}:`, tabState.isActive, '->', response.isActive);
            tabState.isActive = response.isActive;
        }
    } catch (error) {
        console.log('❌ Status sync failed, using background state for tab:', tab.id);
    }

    const shouldActivate = !tabState.isActive;

    if (shouldActivate) {
        console.log(`🔧 Activating inspector for tab: ${tab.id}`);
        tabState.isActive = true;
        activeTabs.add(tab.id);
        updateActionIcon(tab.id, true);

        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'activate' });
            console.log(`✅ Activation message sent to tab: ${tab.id}`);
        } catch (error) {
            console.log(`❌ Activation failed for tab ${tab.id}, injecting scripts:`, error);
            await injectContentScripts(tab.id, true);
        }

    } else {
        console.log(`🔴 Deactivating inspector for tab: ${tab.id}`);
        tabState.isActive = false;
        activeTabs.delete(tab.id);
        updateActionIcon(tab.id, false);

        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'deactivate',
                completeShutdown: true
            });
            console.log(`✅ Deactivation message sent to tab: ${tab.id}`);
        } catch (error) {
            console.log(`❌ Deactivation failed for tab ${tab.id}, forcing cleanup:`, error);
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: forceDeactivateInspector
            });
        }
    }

    tabInstances.set(tab.id, tabState);
    console.log(`✅ Tab ${tab.id} state updated:`, tabState);
});




// ✅ 추가: 탭 업데이트 시 더 정확한 상태 관리
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        console.log(`🔄 Tab ${tabId} loading, cleaning up state`);
        cleanupTab(tabId);
    } else if (changeInfo.status === 'complete') {
        console.log(`✅ Tab ${tabId} loaded completely`);
        // ✅ 탭이 완전히 로드되면 상태 재확인
        setTimeout(() => {
            if (tabInstances.has(tabId)) {
                const tabState = tabInstances.get(tabId);
                if (tabState.isActive) {
                    console.log(`🔧 Reactivating inspector for reloaded tab: ${tabId}`);
                    // 탭 리로드 후 자동 재활성화
                    chrome.tabs.sendMessage(tabId, { action: 'activate' }).catch(err => {
                        console.log(`❌ Auto-reactivation failed for tab ${tabId}:`, err);
                    });
                }
            }
        }, 1000);
    }
});


// ✅ 추가: 탭 정리 함수
// ✅ 추가: 탭별 상태 관리 함수 개선
function cleanupTab(tabId) {
    console.log(`🧹 Cleaning up tab: ${tabId}`);
    
    if (activeTabs.has(tabId)) {
        activeTabs.delete(tabId);
        updateActionIcon(tabId, false);
    }

    if (tabInstances.has(tabId)) {
        const tabState = tabInstances.get(tabId);
        console.log(`📊 Tab ${tabId} state before cleanup:`, tabState);
        tabInstances.delete(tabId);
    }
    
    console.log(`✅ Tab ${tabId} cleanup completed`);
}

// ✅ 추가: 모든 탭 정리
function cleanupAllTabs() {
	activeTabs.forEach(tabId => {
		try {
			chrome.tabs.sendMessage(tabId, {
				action: 'deactivate',
				completeShutdown: true
			});
		} catch (error) {
			console.log('Cleanup error for tab', tabId, error);
		}
	});
	activeTabs.clear();
	isActive = false;
}




// ✅ 추가: 탭이 닫힐 때 상태 정리
// ✅ 수정: 탭 이벤트 리스너
chrome.tabs.onRemoved.addListener((tabId) => {
	cleanupTab(tabId);
});
// 탭이 업데이트될 때 아이콘 상태 초기화
// ✅ 수정: 탭 업데이트 시 상태 정리
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	if (changeInfo.status === 'loading') {
		cleanupTab(tabId);
	}
});

// ✅ 추가: 확장 프로그램 종료 시 정리
chrome.runtime.onSuspend.addListener(() => {
	cleanupAllTabs();
});

// ✅ 쿠키 메시지 전송 함수
function sendCookieMessageToTab(tabId, message, type = 'info') {
	try {
		chrome.tabs.sendMessage(tabId, {
			action: 'showCookieMessage',
			message: message,
			type: type
		}).catch(error => {
			console.log('Could not send cookie message to tab:', error);
		});
	} catch (error) {
		console.log('Cookie message sending error:', error);
	}
}

//============================================================================>>>> 초기화 END



// 아이콘 상태 업데이트 함수
function updateActionIcon(tabId, active) {
	const iconPath = active ?
		{ "16": "icons/icon16-active.png", "48": "icons/icon48-active.png", "128": "icons/icon128-active.png" } :
		{ "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" };

	// ✅ 탭 존재 여부 확인 후 아이콘 업데이트
	chrome.tabs.get(tabId).then(() => {
		chrome.action.setIcon({
			tabId: tabId,
			path: iconPath
		});

		chrome.action.setTitle({
			tabId: tabId,
			title: active ? "Web Inspector (Active)" : "Web Inspector (Inactive)"
		});
	}).catch(error => {
		console.log('Tab not found for icon update:', error);
	});
}

// ✅ 추가: 탭별 config 업데이트 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'tabConfigUpdated' && sender.tab) {
        console.log(`📊 Tab ${sender.tab.id} config updated - Active: ${request.isActive}`);
        // ✅ 탭별 상태 추적 업데이트
        const tabState = tabInstances.get(sender.tab.id);
        if (tabState) {
            tabState.isActive = request.isActive;
            tabInstances.set(sender.tab.id, tabState);
            
            if (request.isActive) {
                activeTabs.add(sender.tab.id);
            } else {
                activeTabs.delete(sender.tab.id);
            }
            updateActionIcon(sender.tab.id, request.isActive);
        }
        sendResponse({ success: true });
        return true;
    }
    return false;
});

// ✅ 추가: 상태 요청 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'statusChanged' && sender.tab) {
		// ✅ content.js에서 보낸 상태 변경 메시지 처리
		if (request.isActive) {
			activeTabs.add(sender.tab.id);
		} else {
			activeTabs.delete(sender.tab.id);
		}
		updateActionIcon(sender.tab.id, request.isActive);
	}
	return false;
});

// ✅ 추가: 고급 기능 토글 메시지 처리
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'downloadHTML') {
		console.log('Download request received from content script');

		// 현재 활성 탭에서 다운로드 실행
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			if (tabs[0]) {
				try {
					chrome.tabs.sendMessage(tabs[0].id, {
						action: 'forceDownload',
						url: request.url
					}).catch(err => {
						console.log('Force download message error:', err);
					});
				} catch (error) {
					console.log('Error sending force download:', error);
				}
			}
		});

		sendResponse({ success: true });
		return true;
	}
	return false;
});

// ✅ 수정: 모든 메시지 리스너에 에러 처리 추가
function createSafeMessageListener(handler) {
	return (request, sender, sendResponse) => {
		try {
			return handler(request, sender, sendResponse);
		} catch (error) {
			console.log('Message handler error:', error);
			sendResponse({ success: false, error: error.message });
			return true;
		}
	};
}

// ✅ 수정: 다른 메시지 리스너들도 탭 필터링 적용
chrome.runtime.onMessage.addListener(createSafeMessageListener((request, sender, sendResponse) => {
    // ✅ sender가 없거나 탭이 아니면 무시 (background에서 온 메시지)
    if (!sender.tab) {
        console.log('⏭️ Ignoring message without sender tab');
        sendResponse({ success: false, error: 'No sender tab' });
        return false;
    }

    const tabId = sender.tab.id;
    
    switch (request.action) {
        case 'openOptions':
            chrome.runtime.openOptionsPage();
            sendResponse({ success: true });
            return true;
            
        case 'updateDepthLevel':
        case 'toggleMeasuring':
        case 'changeMeasurementMode':
        case 'downloadHTML':
            console.log(`🔧 Processing ${request.action} for tab: ${tabId}`);
            // ✅ 이미 해당 탭에서 온 메시지이므로 다시 보낼 필요 없음
            // 대신 content script가 직접 처리하도록 함
            sendResponse({ success: true, handled: true });
            return true;
            
        case 'statusChanged':
            // ✅ 탭 상태 변경 처리
            console.log(`📊 Status changed for tab ${tabId}:`, request.isActive);
            if (request.isActive) {
                activeTabs.add(tabId);
            } else {
                activeTabs.delete(tabId);
            }
            updateActionIcon(tabId, request.isActive);
            
            // ✅ 탭 인스턴스 상태 업데이트
            let tabState = tabInstances.get(tabId);
            if (!tabState) {
                tabState = { isActive: request.isActive, tabId: tabId };
            } else {
                tabState.isActive = request.isActive;
            }
            tabInstances.set(tabId, tabState);
            
            sendResponse({ success: true });
            return true;
            
        default:
            console.log(`❌ Unknown action from tab ${tabId}:`, request.action);
            sendResponse({ success: false, error: 'Unknown action' });
            return false;
    }
}));


// ✅ 수정: 다운로드 기능 처리 (에러 처리 추가)
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
	try {
		// 웹 인스펙터에서 생성된 다운로드인지 확인
		if (item.url.startsWith('blob:') && item.filename === 'element-export.html') {
			// 파일명 제안
			suggest({
				filename: 'webpage-element-export.html',
				conflictAction: 'uniquify'
			});
		}
	} catch (error) {
		console.log('Download filename error:', error);
	}
});



// ✅ 수정: 컨텍스트 메뉴 추가 (에러 처리)
chrome.runtime.onInstalled.addListener(() => {
	try {
		// 요소 검사 컨텍스트 메뉴
		chrome.contextMenus.create({
			id: 'inspect-element',
			title: 'Inspect Element with Web Inspector',
			contexts: ['all']
		});

		// HTML 다운로드 컨텍스트 메뉴
		chrome.contextMenus.create({
			id: 'download-html',
			title: 'Download HTML with Web Inspector',
			contexts: ['page']
		});
	} catch (error) {
		console.log('Context menu creation error:', error);
	}
});

// ✅ 수정: 컨텍스트 메뉴 클릭 처리 - 탭별 실행
chrome.contextMenus.onClicked.addListener((info, tab) => {
    try {
        if (info.menuItemId === 'inspect-element') {
            console.log(`🔧 Context menu: Inspect element for tab: ${tab.id}`);
            // ✅ 현재 탭에서만 활성화
            chrome.tabs.sendMessage(tab.id, {
                action: 'activate'
            }).catch(err => {
                console.log(`❌ Tab ${tab.id} not ready for message:`, err);
                injectContentScripts(tab.id, true);
            });
        } else if (info.menuItemId === 'download-html') {
            console.log(`📥 Context menu: Download HTML for tab: ${tab.id}`);
            // ✅ 현재 탭에서만 다운로드
            chrome.tabs.sendMessage(tab.id, {
                action: 'downloadHTML'
            }).catch(err => {
                console.log(`❌ Tab ${tab.id} not ready for download:`, err);
            });
        }
    } catch (error) {
        console.log(`❌ Context menu click error for tab ${tab.id}:`, error);
    }
});

// ✅ 수정: 탭 변경 시 아이콘 상태 업데이트
chrome.tabs.onActivated.addListener((activeInfo) => {
	const isActive = activeTabs.has(activeInfo.tabId);
	updateActionIcon(activeInfo.tabId, isActive);
});



// ✅ 수정: 스토리지 변경 감지 (통합 config 방식)
// ✅ [수정] storage 변경 감지 - 개별 옵션 무시
// ✅ 수정: storage 변경 감지 - 크로스-탭 브로드캐스트 제거
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        try {
            // ✅ webinspector_config 변경만 처리
            if (changes.webinspector_config) {
                const newConfig = changes.webinspector_config.newValue;
                console.log('🔄 Unified config change detected in background');


                // ✅ 대신: 활성 탭들에만 알림 (선택적)
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    tabs.forEach(tab => {
                        if (tab.url && tab.url.startsWith('http')) {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'updateConfig',
                                config: newConfig
                            }).catch(err => {
                                console.log('Active tab not ready for config update:', err);
                            });
                        }
                    });
                });

                console.log('✅ Config update sent to active tabs only');
            }
        } catch (error) {
            console.log('Storage change error:', error);
        }
    }
});



// ✅ 수정: 확장 프로그램 시작 시 모든 탭 상태 초기화
chrome.runtime.onStartup.addListener(() => {
	isActive = false;
	activeTabs.clear();
	chrome.tabs.query({}, (tabs) => {
		tabs.forEach(tab => {
			updateActionIcon(tab.id, false);
		});
	});
});

// ✅ 수정: 권한 요청 처리
chrome.runtime.onMessage.addListener(createSafeMessageListener((request, sender, sendResponse) => {
	if (request.action === 'requestPermission') {
		chrome.permissions.request({
			permissions: request.permissions
		}, (granted) => {
			sendResponse({ granted: granted });
		});
		return true;
	}
	return false;
}));

// ✅ 수정: 에러 처리
chrome.runtime.onMessage.addListener(createSafeMessageListener((request, sender, sendResponse) => {
	if (request.action === 'reportError') {
		console.error('Web Inspector Error:', request.error);
		sendResponse({ success: true });
		return true;
	}
	return false;
}));

chrome.runtime.onMessage.addListener(createSafeMessageListener((request, sender, sendResponse) => {
	if (request.action === 'getMetrics') {
		sendResponse(performanceMetrics);
		return true;
	} else if (request.action === 'activate') {
		performanceMetrics.activationCount++;
	} else if (request.action === 'downloadHTML') {
		performanceMetrics.downloadCount++;
	}
	return false;
}));

// ✅ 수정: 정기적인 상태 체크 (에러 처리)
// ✅ 수정: 정기적인 상태 체크 - 탭별 처리
setInterval(() => {
    try {
        // 메모리 사용량 모니터링
        if (chrome && chrome.system && chrome.system.memory) {
            chrome.system.memory.getInfo((info) => {
                if (info && info.availableCapacity / info.capacity < 0.1) {
                    // ✅ 메모리 부족 시 비활성 탭에서만 인스펙터 비활성화
                    chrome.tabs.query({ active: false }, (tabs) => {
                        tabs.forEach(tab => {
                            try {
                                // ✅ 비활성 탭이고 웹 인스펙터가 실행 중인 경우만 비활성화
                                if (activeTabs.has(tab.id)) {
                                    chrome.tabs.sendMessage(tab.id, {
                                        action: 'deactivate',
                                        reason: 'memory_optimization'
                                    }).catch(err => {
                                        console.log(`❌ Memory cleanup failed for inactive tab ${tab.id}:`, err);
                                    });
                                }
                            } catch (error) {
                                console.log(`❌ Memory cleanup error for tab ${tab.id}:`, error);
                            }
                        });
                    });
                    console.log('🧹 Memory optimization: Deactivated inspectors in inactive tabs');
                }
            });
        }
    } catch (error) {
        console.log('Periodic check error:', error);
    }
}, 60000); // 1분마다 체크