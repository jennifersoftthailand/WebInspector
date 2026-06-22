// main-content.js
(function () {
	'use strict';

	console.log('🚀 Web Inspector Main Content Script starting...');

	// main-content.js - 완전한 라이프사이클 관리
	let componentInitializationCount = 0;
	let lastCleanupTime = 0;

	// ✅ 추가: 스크롤 상태 관리 변수들
	let lastMousePosition = { 
		clientX: 0, 
		clientY: 0,
		lastUpdated: 0
	};
	let scrollTimeout = null;
	const SCROLL_END_DELAY = 150; // 스크롤 끝난 후 표시까지 딜레이
	let isScrolling = false;

	// ✅ [수정] 전역 변수들만 선언하고 초기화는 지연
	let stateManager = null;
	let elementAnalyzer = null;
	let uiManager = null;
	let downloadManager = null;
	let util = null;
	let toggleManager = null;
	let elementInfo = null;

	// ✅ [수정] 초기화 플래그 추가
	let isInitialized = false;
	let initializationPending = false;

	// ✅ 전역 변수로 ESC 타이밍 관리
	let escTimeout = null;
	let isWaitingForSecondEsc = false;

	// ✅ [ConfigManager 연동] window.ConfigManager 참조 (모듈 로드 순서: config-manager.js → state-manager.js → ... → main-content.js)
	// ConfigManager는 사용자 설정(색상, 두께, 투명도 등)을 중앙 관리
	// StateManager는 세션 상태(활성 모드, Depth 등)를 관리
	const configManager = window.ConfigManager;


	// 전역에 노출 (디버깅용) 맨 아래 window.WebInspector = window.webInspector; 선언 필요.
	// 외부 class에서 _XXXXX 메소드를 호출 할 수 있도록 함.
	window.webInspector = {
		// ✅ [수정] 게터로 지연 초기화 제공
		get stateManager() { return initializeIfNeeded().stateManager; },
		get elementAnalyzer() { return initializeIfNeeded().elementAnalyzer; },
		get uiManager() { return initializeIfNeeded().uiManager; },
		get toggleManager() { return initializeIfNeeded().toggleManager; },
		get elementInfo() { return initializeIfNeeded().elementInfo; },
		activateInspector,
		deactivateInspector,

		// ✅ [수정] 안전한 메서드들 - 초기화 확인 후 실행
		_safeStorageSet: function (items, callback) {
			if (!isInitialized) {
				console.log('🔄 Web Inspector not initialized, skipping storage set');
				if (callback) callback();
				return;
			}
			console.log('++++++++++++++>>> _safeStorageSet');
			safeStorageSet(items, callback);
		},

		_restoreAdjustedElements: function () {
			if (!isInitialized) {
				console.log('🔄 Web Inspector not initialized, skipping restore');
				return;
			}
			console.log('++++++++++++++>>> _restoreAdjustedElements');
			restoreAdjustedElements();
		},

		_safePostMessage: function (targetWindow, message, targetOrigin) {
			if (!isInitialized) {
				console.log('🔄 Web Inspector not initialized, skipping post message');
				return false;
			}
			console.log('++++++++++++++>>> _safePostMessage');
			return safePostMessage(targetWindow, message, targetOrigin);
		},

		// ✅ [추가] 초기화 상태 확인 메서드
		isInitialized: function() {
			return isInitialized;
		},

		// ✅ [추가] 강제 초기화 메서드 (activate 시 사용)
		forceInitialize: function() {
			return initializeComponents();
		}
	};

	// ✅ [추가] 필요한 경우에만 초기화하는 함수
	function initializeIfNeeded() {
		if (!isInitialized && !initializationPending) {
			console.log('⚠️ Web Inspector components accessed before initialization - forcing activation');
			// 필요한 경우 즉시 초기화 시도
			activateInspector();
		}
		
		// 초기화 여부에 따라 다른 객체 반환
		if (isInitialized) {
			return {
				stateManager,
				util,
				elementAnalyzer,
				uiManager,
				downloadManager,
				toggleManager,
				elementInfo,
			};
		} else {
			console.error('❌ Components not initialized yet');
			return {
				stateManager: null,
				util: null,
				elementAnalyzer: null,
				uiManager: null,
				downloadManager: null,
				toggleManager: null,
				elementInfo: null,
			};
		}
	}


	/**
	 * ✅ 완전한 컴포넌트 초기화 - ToggleManager 재초기화 보장, 중첩 인스턴스 방지 강화
	 */
	function initializeComponents() {
		// ✅ 이미 초기화되고 유효한지 확인
		if (isInitialized && isComponentValid('stateManager') && componentInitializationCount > 0) {
			console.log('✅ Using existing valid components');
			return Promise.resolve();
		}

		// ✅ 초기화 진행 중 확인
		if (initializationPending) {
			console.log('🔄 Initialization in progress, waiting...');
			return waitForInitialization();
		}

		initializationPending = true;
		componentInitializationCount++;
		
		console.log(`🔄 Initializing components (attempt ${componentInitializationCount})...`);

		return new Promise((resolve, reject) => {
			try {
				// ✅ 1. 완전 정리
				completeComponentCleanup();
				
				// ✅ 2. StateManager 생성 및 즉시 검증
				stateManager = new StateManager();
				
				// ✅ 3. 나머지 컴포넌트들 생성
				util = new Util(stateManager);
				stateManager.util = util;
				
				elementInfo = new ElementInfo(stateManager);
				toggleManager = new ToggleManager(stateManager);
				elementAnalyzer = new ElementAnalyzer(stateManager);
				uiManager = new UIManager(stateManager, elementAnalyzer, toggleManager);
				downloadManager = new DownloadManager(stateManager);

				// ✅ 4. 상태 관리자 연결
				stateManager.uiManager = uiManager;
				stateManager.elementAnalyzer = elementAnalyzer;
				stateManager.downloadManager = downloadManager;
				stateManager.toggleManager = toggleManager;
				stateManager.elementInfo = elementInfo;
				
				// ✅ 5. 초기 상태 설정
				stateManager.isInspectorActive = false;

				isInitialized = true;
				initializationPending = false;
				
				console.log(`✅ Components initialized successfully (count: ${componentInitializationCount})`);
				resolve();
			} catch (error) {
				initializationPending = false;
				console.error('❌ Components initialization failed:', error);
				completeComponentCleanup();
				reject(error);
			}
		});
	}


	/**
	 * ✅ completeComponentCleanup - ToggleManager 우선 정리
	 */
	function completeComponentCleanup() {
		console.log('🧹 COMPLETE: Cleaning up all components...');
		lastCleanupTime = Date.now();
		
		// ✅ 1. 글로벌 이벤트 리스너 제거
		removeAllEventListeners();
		
		// ✅ 2. ToggleManager 먼저 정리 (드래그 시스템 정리를 위해)
		if (toggleManager) {
			console.log('🧹 Cleaning up ToggleManager (priority)...');
			if (typeof toggleManager.completeCleanup === 'function') {
				toggleManager.completeCleanup();
			} else if (typeof toggleManager.cleanup === 'function') {
				toggleManager.cleanup();
			}
			toggleManager = null;
		}
		
		// ✅ 3. ElementAnalyzer 정리
		if (elementAnalyzer) {
			console.log('🧹 Cleaning up ElementAnalyzer...');
			if (typeof elementAnalyzer.completeCleanup === 'function') {
				elementAnalyzer.completeCleanup();
			} else if (typeof elementAnalyzer.cleanup === 'function') {
				elementAnalyzer.cleanup();
			}
			elementAnalyzer = null;
		}
		
		// ✅ 4. 나머지 컴포넌트 정리
		if (elementInfo) {
			console.log('🧹 Cleaning up ElementInfo...');
			if (typeof elementInfo.completeCleanup === 'function') {
				elementInfo.completeCleanup();
			} else if (typeof elementInfo.cleanup === 'function') {
				elementInfo.cleanup();
			}
			elementInfo = null;
		}
		
		if (uiManager) {
			console.log('🧹 Cleaning up UIManager...');
			if (typeof uiManager.completeCleanup === 'function') {
				uiManager.completeCleanup();
			} else if (typeof uiManager.cleanup === 'function') {
				uiManager.cleanup();
			}
			uiManager = null;
		}
		
		if (downloadManager) {
			console.log('🧹 Cleaning up DownloadManager...');
			if (typeof downloadManager.completeCleanup === 'function') {
				downloadManager.completeCleanup();
			} else if (typeof downloadManager.cleanup === 'function') {
				downloadManager.cleanup();
			}
			downloadManager = null;
		}
		
		if (util) {
			console.log('🧹 Cleaning up Util...');
			if (typeof util.completeCleanup === 'function') {
				util.completeCleanup();
			} else if (typeof util.cleanup === 'function') {
				util.cleanup();
			}
			util = null;
		}
		
		// ✅ 5. StateManager 마지막에 정리 (다른 컴포넌트 참조 제거 후)
		if (stateManager) {
			console.log('🧹 Cleaning up StateManager...');
			if (typeof stateManager.completeCleanup === 'function') {
				stateManager.completeCleanup();
			}
			stateManager = null;
		}
		
		// ✅ 6. 글로벌 상태 초기화
		isInitialized = false;
		initializationPending = false;
		
		// ✅ 7. UI 요소 강제 정리
		emergencyCleanup();
		
		console.log('✅ All components completely cleaned up');
	}

	//########################################################################################################################>>> START
	/**
	 * ✅ [이벤트 핸들러] onMouseMove - 통일된 명명 규칙
	 */
	function onMouseMove(e) {
		if (!stateManager || !stateManager.isInspectorActive) return;
		
		// ✅ [수정] 항상 현재 마우스 위치 업데이트
		lastMousePosition.clientX = e.clientX;
		lastMousePosition.clientY = e.clientY;
		lastMousePosition.lastUpdated = Date.now();
		
		// ✅ 스크롤 중이면 마우스 이동으로 요소 인식하지 않음
		if (isScrolling) {
			return;
		}
		
		const viewportX = e.clientX;
		const viewportY = e.clientY;
		
		window.lastMouseX = viewportX;
		window.lastMouseY = viewportY;

		const documentX = viewportX + window.scrollX;
		const documentY = viewportY + window.scrollY;

		// ✅ 좌표 툴팁 업데이트
		if (stateManager.coordTooltip) {
			stateManager.coordTooltip.textContent = `X: ${viewportX} px, Y: ${viewportY} px`;
			stateManager.coordTooltip.style.display = 'block';
			if (uiManager) {
				uiManager.updateCoordTooltipPosition();
			}
		}

		// UI 요소에서는 측정하지 않음
		if (elementAnalyzer && elementAnalyzer.isUIElement(e.target)) {
			if (!stateManager.selectedElement) {
				stateManager.currentElement = null;
				stateManager.lastMeasuredElement = null;
			}
			return;
		}

		// ✅ 요소 인식
		if (elementAnalyzer) {
			elementAnalyzer.highlightElementAtPoint(documentX, documentY);
		}
	}

	/**
	 * ✅ [이벤트 핸들러] onElementClick - 통일된 명명 규칙
	 */
	function onElementClick(e) {
		// ✅ [수정] 안전한 접근
		if (!stateManager || !stateManager.isInspectorActive) return;

		// UI 요소 클릭 무시
		if (e.target.closest('#web-inspector-panel') ||
			e.target.closest('.premium-popup') ||
			e.target.closest('.cookie-message')) {
			return false;
		}

		// ✅ elementAnalyzer 안전하게 접근
		if (elementAnalyzer && elementAnalyzer.isMeasurementElement(e.target) && !e.target.classList.contains('iframe-overlay')) {
			e.stopPropagation();
			e.preventDefault();
			return false;
		}

		if (elementAnalyzer && elementAnalyzer.isUIElement(e.target)) return;

		e.preventDefault();
		e.stopPropagation();

		let clickedElement = e.target;
		if (e.target.classList.contains('iframe-overlay')) {
			const iframe = elementAnalyzer.findIframeFromOverlay(e.target);
			if (iframe) {
				clickedElement = iframe;
			}
		}

		if (elementAnalyzer && elementAnalyzer.isAdOrIframeElement(clickedElement)) {
			const container = elementAnalyzer.findAdIframeContainer(clickedElement);
			if (container) {
				clickedElement = container;
			}
		}

		// ✅ 같은 요소 클릭 시 선택 해제만 수행
		if (stateManager.selectedElement === clickedElement) {
			if (elementAnalyzer) {
				elementAnalyzer.removeSelectedElement();
				elementAnalyzer.closeBasicInformationAccordion();
			}
			return false;
		}
		
		// 요소 선택 로직
		if (stateManager.selectedElement === clickedElement) {
			// 같은 요소 클릭 시 선택 해제
			if (elementAnalyzer) {
				elementAnalyzer.removeSelectedElement();
				// ✅ 패널도 숨기기
				if (stateManager.uiManager) {
					stateManager.uiManager.hidePanel();
				}
			}
			return false;
		}

		// 새로운 요소 선택
		if (elementAnalyzer) {
			elementAnalyzer.selectElement(clickedElement);
		}
		return false;
	}

	//------------------------------------------------------------------------------------------------- Esc START
	/**
	 * ✅ 단일 ESC 액션 (A)
	 */
	function executeSingleEscAction() {
		console.log('🔄 Toggling panel visibility');
		if (uiManager) {
			uiManager.togglePanelVisibility();
		}
	}

	/**
	 * ✅ 더블 ESC 액션 (B) 
	 */
	function executeDoubleEscAction() {
		
		console.log('음하하하하하하하하 - Double ESC completed!');
	}

	//------------------------------------------------------------------------------------------------- Esc END

	/**
	 * ✅ [이벤트 핸들러] onKeyDown - 통일된 명명 규칙
	 */
	function onKeyDown(e) {
		// ✅ [수정] 안전한 접근 + 단축키 작동 보장
		if (!stateManager || !stateManager.isInspectorActive) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			
			// ✅ 이미 두 번째 ESC 입력을 기다리는 중인지 확인
			if (isWaitingForSecondEsc) {
				// ✅ 두 번째 ESC 입력 감지 - 더블 ESC (B 실행)
				console.log('🔑🔑 Double ESC detected - Executing B');
				clearTimeout(escTimeout);
				isWaitingForSecondEsc = false;
				
				// ✅ B 실행: 전체 종료
				executeDoubleEscAction();
				
			} else {
				// ✅ 첫 번째 ESC 입력 - 타임아웃 설정 (A는 아직 실행 안 함)
				console.log('🔑 First ESC - Waiting for second...');
				isWaitingForSecondEsc = true;
				
				// ✅ 1.5초 동안 두 번째 ESC 입력 대기
				escTimeout = setTimeout(() => {
					// ✅ 타임아웃 시 단일 ESC (A 실행)
					console.log('🔑 Single ESC - Executing A');
					isWaitingForSecondEsc = false;
					
					// ✅ A 실행: 패널 토글
					executeSingleEscAction();
				}, 200);
			}
			
			return;
		}

		// ✅ [수정] Ctrl + Alt 단축키 처리 - 작동 보장
		if (e.ctrlKey && e.altKey && !e.shiftKey) {
			e.preventDefault();
			e.stopPropagation();

			const key = e.key.toLowerCase();
			console.log(`⌨️ Shortcut pressed: Ctrl+Alt+${key}`);

			const modeMap = {
				'a': 'viewport',
				's': 'element',
				'z': 'margin', 
				'x': 'padding',
				'w': 'children',
				'd': 'size',
				'e': 'borderRadius',
				'f': 'iframeOverlay'
			};

			if (modeMap[key]) {
				
				console.log(`🔧 Toggling measurement mode: ${modeMap[key]}`);
				if (uiManager) {
					// ✅ [수정] UI Manager를 통한 모드 토글 (작동 보장)
					uiManager.toggleMeasurementModeManager(modeMap[key]);
				} else if (stateManager) {
					// ✅ [추가] UI Manager 없을 때 직접 StateManager 호출
					stateManager.saveToggleMeasurementMode(modeMap[key]);
					console.log(`✅ Mode toggled directly: ${modeMap[key]}`);
				}
				
			} else {
				console.log(`❌ No mapping for key: ${key}`);
			}
			return;
		}

		// ✅ [수정] 추가 단축키: Ctrl + Shift 단축키 작동 보장
		if (e.ctrlKey && e.shiftKey && !e.altKey) {
			e.preventDefault();
			e.stopPropagation();

			const key = e.key.toLowerCase();
			console.log(`⌨️ Additional shortcut: Ctrl+Shift+${key}`);

			const shiftModeMap = {
				'1': 'setDepth1',
				'2': 'setDepth2', 
				'3': 'setDepth3',
				'4': 'setDepth4',
				'5': 'setDepth5',
				'r': 'resetMeasurements',
				'c': 'clearSelection'
			};

			if (shiftModeMap[key]) {
				switch(shiftModeMap[key]) {
					case 'setDepth1':
					case 'setDepth2':
					case 'setDepth3':
					case 'setDepth4':
					case 'setDepth5':
						const depthLevel = parseInt(key);
						if (stateManager) {
							stateManager.updateDepthLevel(depthLevel);
							console.log(`🎯 Depth level set to ${depthLevel} via shortcut`);
						}
						break;
						
					case 'resetMeasurements':
						if (elementAnalyzer) {
							elementAnalyzer.removeCurrentMeasurements();
							console.log('🗑️ Measurements reset via shortcut');
						}
						break;
						
					case 'clearSelection':
						if (elementAnalyzer) {
							elementAnalyzer.removeSelectedElement();
							console.log('🔴 Selection cleared via shortcut');
						}
						break;
				}
			}
		}

		// ✅ [추가] Alt 단독 단축키
		if (e.altKey && !e.ctrlKey && !e.shiftKey) {
			const key = e.key.toLowerCase();
			
			const altModeMap = {
				'h': 'toggleHighlight',
				'm': 'toggleMeasuring',
				'p': 'togglePanel'
			};

			if (altModeMap[key]) {
				e.preventDefault();
				e.stopPropagation();
				
				switch(altModeMap[key]) {
					case 'toggleHighlight':
						// 하이라이트 토글 로직
						console.log('🎯 Toggling highlight via Alt+H');
						break;
						
					case 'toggleMeasuring':
						if (uiManager) {
							uiManager.toggleMeasuring();
							console.log('📏 Toggling measuring via Alt+M');
						}
						break;
						
					case 'togglePanel':
						if (uiManager) {
							uiManager.togglePanelVisibility();
							console.log('🔄 Toggling panel via Alt+P');
						}
						break;
				}
			}
		}
	}

	/**
	 * ✅ [이벤트 핸들러] onScroll - 통일된 명명 규칙
	 */
	function onScroll() {
		// ✅ 기본 상태 검사
		if (!stateManager || !stateManager.isInspectorActive) return;

		// ✅ 스크롤 시작 시 즉시 모든 측정값 숨기기
		if (!isScrolling) {
			isScrolling = true;
			
			// ✅ 1. 먼저 모든 위치 업데이트 (깜빡임 방지)
			updateAllElementPositions();
			
			// ✅ 2. 그 다음 모든 측정값 숨기기
			hideAllMeasurementsInstantly();
			
			console.log('📜 Scroll started - positions updated, measurements hidden');
		}

		// ✅ 스크롤 중 실시간 위치 업데이트 (부드러운 이동)
		requestAnimationFrame(() => {
			updateAllElementPositions();
		});

		// ✅ 스크롤 종료 후 완전한 복원
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			isScrolling = false;
			
			// ✅ 1. 먼저 모든 위치 업데이트
			updateAllElementPositions();
			
			// ✅ 2. 그 다음 모든 측정값 표시
			showAllMeasurementsInstantly();
			
			// ✅ 3. 마지막으로 현재 마우스 위치에서 요소 인식
			setTimeout(() => {
				recognizeElementAtExactMousePosition();
			}, 10);
			
			console.log('📜 Scroll ended - complete restoration');
		}, SCROLL_END_DELAY);
	}

	/**
	 * ✅ [내부] _performSafeDirectActivation - private 함수로 변경
	 */
	function _performSafeDirectActivation() {
		return new Promise((resolve, reject) => {
			try {
				// ✅ 상태 설정 전 최종 검증
				if (!stateManager || !stateManager.InspectorState) {
					throw new Error('StateManager or InspectorState not available');
				}
				
				// ✅ 활성화 상태 설정 (안전하게)
				stateManager.InspectorState.isActivating = true;
				
				// ✅ 직접 활성화 수행
				directActivation();
				
				// ✅ 활성화 상태 설정
				stateManager.isInspectorActive = true;
				stateManager.InspectorState.isActivating = false;
				
				console.log('✅ Safe direct activation completed');
				
				// ✅ 상태 동기화
				syncInspectorStatus(true);
				
				resolve();
			} catch (error) {
				// ✅ 에러 발생 시 상태 안전하게 복원
				safeResetActivationState();
				reject(error);
			}
		});
	}

	/**
	 * ✅ [내부] _handleActivationError - private 함수로 변경
	 */
	function _handleActivationError(error) {
		console.error('❌ Activation error handled:', error.message);
		safeResetActivationState();
		
		// ✅ 상태 동기화
		syncInspectorStatus(false);
		
		// ✅ 필요한 경우 컴포넌트 재생성
		if (error.message.includes('StateManager') || error.message.includes('InspectorState')) {
			console.log('🔄 Scheduling component recreation due to StateManager error');
			setTimeout(() => {
				completeComponentCleanup();
			}, 1000);
		}
	}

	// 활성화/비활성화 함수들
	// ✅ [수정] 활성화 함수 - 초기화 통합
	// ✅ [수정] 활성화 함수 - Config 먼저 로드
	// ✅ [수정] 활성화 함수 - 에러 처리 강화
	/**
	 * ✅ activateInspector - 토글버튼 통합 강화 (중첩 실행 방지)
	 */
	/**
	 * ✅ [수정] activateInspector - 내부 함수 호출 업데이트
	 */
	function activateInspector() {
		console.log('🎯 activateInspector called from toggle button');
		
		// ✅ 이미 활성화되었으면 무시 (안전한 접근)
		if (window.webInspector && window.webInspector.getStatus && window.webInspector.getStatus().isActive) {
			console.log('✅ Web Inspector already active, skipping activation');
			return Promise.resolve();
		}
		
		// ✅ 초기화 진행 중이면 명확한 대기
		if (initializationPending) {
			console.log('🔄 Initialization in progress, deferring activation...');
			return new Promise((resolve) => {
				// ✅ 최대 3초 대기 후 타임아웃
				const startTime = Date.now();
				const maxWaitTime = 3000;
				
				const waitForInitialization = () => {
					if (!initializationPending && isInitialized && stateManager) {
						console.log('✅ Initialization completed, proceeding with activation');
						activateInspector().then(resolve);
					} else if (Date.now() - startTime > maxWaitTime) {
						console.error('❌ Activation timeout waiting for initialization');
						resolve();
					} else {
						setTimeout(waitForInitialization, 100);
					}
				};
				
				waitForInitialization();
			});
		}

		// ✅ 컴포넌트 초기화 (동기적으로 상태 관리)
		return initializeComponents().then(() => {
			console.log('🔄 Components initialized, starting activation process...');
			
			// ✅ StateManager 검증 (강화된 검사)
			if (!isComponentValid('stateManager')) {
				throw new Error('StateManager validation failed after initialization');
			}
			
			return stateManager.loadConfig().catch(error => {
				console.log('⚠️ Config load failed, using defaults:', error);
				// ✅ config 로드 실패해도 진행
				return null;
			});
		}).then(() => {
			console.log('✅ Config loaded, performing direct activation');

			// ✅ [ConfigManager 연동] ConfigManager의 사용자 설정을 StateManager.options에 병합
			// StateManager.loadConfig()는 세션 상태(활성 모드, Depth 등)를 관리하고,
			// ConfigManager는 사용자 설정(색상, 두께, 투명도 등 44개)을 중앙 관리합니다.
			// 따라서 StateManager.options의 값은 ConfigManager.getAll()로 덮어씁니다.
			if (configManager) {
				const userSettings = configManager.getAll();
				if (userSettings && Object.keys(userSettings).length > 0) {
					// ConfigManager의 모든 사용자 설정을 StateManager.options에 병합
					// 기존 options 값은 보존하고 ConfigManager 값이 우선 적용됨
					const mergedOptions = { ...stateManager.options, ...userSettings };
					stateManager.options = mergedOptions;
					console.log('✅ [ConfigManager] 사용자 설정(색상/두께/투명도 등)을 StateManager에 병합 완료');
					
					// ✅ Depth 레벨 동기화 (ConfigManager의 defaultDepthLevel을 우선 사용)
					if (userSettings.defaultDepthLevel !== undefined) {
						stateManager.currentDepthLevel = parseInt(userSettings.defaultDepthLevel) || 2;
						console.log('✅ [ConfigManager] Depth 레벨 동기화:', stateManager.currentDepthLevel);
					}
				} else {
					console.log('ℹ️ [ConfigManager] 저장된 사용자 설정 없음, 기본값 유지');
				}
			} else {
				console.log('ℹ️ [ConfigManager] ConfigManager를 찾을 수 없음 (로드 순서 확인)');
			}
			
			// ✅ 최종 StateManager 검증
			if (!isComponentValid('stateManager')) {
				throw new Error('StateManager not available for direct activation');
			}
			
			return _performSafeDirectActivation(); // ✅ _performSafeDirectActivation으로 변경
		}).then(() => {
			console.log('✅ Activation completed successfully');
			return true;
		}).catch(error => {
			console.error('❌ Activation process failed:', error);
			_handleActivationError(error); // ✅ _handleActivationError로 변경
			return false;
		});
	}
	//########################################################################################################################>>> END

	// ✅ 기존 스크롤 이벤트 리스너 제거 후 새로운 핸들러 등록
	/**
	 * ✅ [수정] setupEventListenersFallback - 이벤트 핸들러 호출 업데이트
	 */
	function setupEventListenersFallback() {
		console.log('Setting up fallback event listeners...');

		try {
			// ✅ 간소화: 이벤트 타입만 정의하고 일괄 등록
			const eventTypes = [
				{ type: 'mousemove', handler: onMouseMove, useCapture: false },        // ✅ onMouseMove로 변경
				{ type: 'click', handler: onElementClick, useCapture: true },          // ✅ onElementClick로 변경
				{ type: 'keydown', handler: onKeyDown, useCapture: false },            // ✅ onKeyDown로 변경
				{ type: 'scroll', handler: onScroll, useCapture: false }               // ✅ onScroll로 변경
			];

			eventTypes.forEach(({ type, handler, useCapture }) => {
				document.addEventListener(type, handler, useCapture);
			});

			console.log('✅ Fallback event listeners setup completed');
		} catch (error) {
			console.error('Error setting up event listeners:', error);
		}
	}

	//################################################################################################################################

	
	// ✅ [신규] 모든 요소 위치 업데이트 함수 - 깜빡임 방지 핵심
	function updateAllElementPositions() {
		if (!stateManager) return;
		
		// ✅ 선택된 요소 하이라이트 위치 업데이트
		if (stateManager.selectedElement && stateManager.selectedElementHighlight) {
			const rect = stateManager.selectedElement.getBoundingClientRect();
			const isVisible = isElementInViewport(rect);
			
			if (isVisible) {
				stateManager.selectedElementHighlight.style.left = `${rect.left}px`;
				stateManager.selectedElementHighlight.style.top = `${rect.top}px`;
				stateManager.selectedElementHighlight.style.width = `${rect.width}px`;
				stateManager.selectedElementHighlight.style.height = `${rect.height}px`;
				stateManager.selectedElementHighlight.style.display = 'block';
			} else {
				stateManager.selectedElementHighlight.style.display = 'none';
			}
		}
		
		// ✅ 현재 요소 하이라이트 위치 업데이트
		if (stateManager.currentElement && stateManager.highlightElement) {
			const rect = stateManager.currentElement.getBoundingClientRect();
			const isVisible = isElementInViewport(rect);
			
			if (isVisible) {
				stateManager.highlightElement.style.left = `${rect.left}px`;
				stateManager.highlightElement.style.top = `${rect.top}px`;
				stateManager.highlightElement.style.width = `${rect.width}px`;
				stateManager.highlightElement.style.height = `${rect.height}px`;
				stateManager.highlightElement.style.display = 'block';
			} else {
				stateManager.highlightElement.style.display = 'none';
			}
		}
	}

	// ✅ [신규] 엄격한 뷰포트 내부 검사 함수
	function isElementInViewport(rect) {
		return (
			rect.width > 0 && 
			rect.height > 0 &&
			rect.right >= -10 &&      // ✅ 약간의 여유 있게
			rect.bottom >= -10 &&
			rect.left <= window.innerWidth + 10 &&
			rect.top <= window.innerHeight + 10
		);
	}
	// ✅ [재설계] 즉시 숨기기 함수 - 뷰포트 경계 문제 해결
	function hideAllMeasurementsInstantly() {
		if (!stateManager) return;

		// ✅ 모든 측정 관련 요소들 즉시 숨기기
		const measurementSelectors = [
			'.measurement-line', '.measurement-text',
			'.size-line-extended', '.size-line-vertical-extended',
			'.margin-value-text', '.padding-value-text', '.size-text',
			'.margin-area', '.padding-area',
			'.external-element-highlight', '.child-highlight', '.padding-highlight',
			'.t-line-with-markers', '.t-line-vertical-with-markers',
			'.corner-radius-indicator', '.radius-value-text',
			'.corner-fold-indicator'
		];

		measurementSelectors.forEach(selector => {
			const elements = document.querySelectorAll(selector);
			elements.forEach(element => {
				if (element && !element.classList.contains('selected-element')) {
					// ✅ visibility로 즉시 완전 숨기기
					element.style.visibility = 'hidden';
					element.style.display = 'none';
				}
			});
		});

		// ✅ UI 요소들 숨기기
		if (stateManager.coordTooltip) stateManager.coordTooltip.style.visibility = 'hidden';
	}
	// ✅ [재설계] 즉시 표시 함수 - 한 번에 깔끔하게
	function showAllMeasurementsInstantly() {
		if (!stateManager) return;

		// ✅ 모든 측정 관련 요소들 즉시 표시
		const measurementSelectors = [
			'.measurement-line', '.measurement-text',
			'.size-line-extended', '.size-line-vertical-extended',
			'.margin-value-text', '.padding-value-text', '.size-text',
			'.margin-area', '.padding-area',
			'.external-element-highlight', '.child-highlight', '.padding-highlight',
			'.t-line-with-markers', '.t-line-vertical-with-markers',
			'.corner-radius-indicator', '.radius-value-text',
			'.corner-fold-indicator'
		];

		measurementSelectors.forEach(selector => {
			const elements = document.querySelectorAll(selector);
			elements.forEach(element => {
				if (element && !element.classList.contains('selected-element')) {
					// ✅ visibility로 즉시 완전 표시
					element.style.visibility = 'visible';
					element.style.display = 'block';
				}
			});
		});

		// ✅ UI 요소들 표시
		if (stateManager.coordTooltip) stateManager.coordTooltip.style.visibility = 'visible';

		// ✅ 선택된 요소가 있으면 해당 요소 측정값 업데이트
		if (stateManager.selectedElement && elementAnalyzer) {
			setTimeout(() => {
				elementAnalyzer.updateSelectedElementMeasurements();
			}, 0);
		}
	}


	// ✅ [신규] 현재 마우스 커서 위치에서 요소 인식 함수
	// ✅ [수정] 현재 마우스 커서 위치에서 요소 인식 함수 - 선택된 요소 우선 처리
	// ✅ [재설계] 정확한 마우스 위치 요소 인식 함수
	// ✅ [수정] 정확한 마우스 위치 요소 인식 함수 - 올바른 함수 호출
	// ✅ [수정] 정확한 마우스 위치 요소 인식 함수 - 선택된 요소 있어도 하이라이트 허용
	function recognizeElementAtExactMousePosition() {
		if (!stateManager || !elementAnalyzer) return;
		
		// ✅ [수정] 선택된 요소가 있어도 하이라이트는 허용 (측정값만 차단)
		if (stateManager.selectedElement) {
			console.log('🎯 Selected element exists - allowing highlight only (no measurements)');
			
			// ✅ 선택된 요소 측정값 업데이트
			setTimeout(() => {
				if (elementAnalyzer && stateManager.selectedElement) {
					elementAnalyzer.updateSelectedElementMeasurements();
				}
			}, 50);
			
			// ✅ [핵심 수정] 선택된 요소가 있어도 현재 마우스 위치 하이라이트 표시
			const currentViewportX = lastMousePosition.clientX;
			const currentViewportY = lastMousePosition.clientY;
			
			const documentX = currentViewportX + window.scrollX;
			const documentY = currentViewportY + window.scrollY;
			
			console.log(`🎯 Showing highlight with selected element - Viewport: (${currentViewportX}, ${currentViewportY})`);
			
			// ✅ 선택된 요소가 있어도 하이라이트 표시 (측정값은 생성 안됨)
			elementAnalyzer.highlightElementAtPoint(documentX, documentY);
			return;
		}
		
		// ✅ 선택된 요소가 없을 때는 일반적인 마우스 위치 기반 요소 인식
		const currentViewportX = lastMousePosition.clientX;
		const currentViewportY = lastMousePosition.clientY;
		
		const documentX = currentViewportX + window.scrollX;
		const documentY = currentViewportY + window.scrollY;
		
		console.log(`🎯 Exact mouse recognition (no selected element) - Viewport: (${currentViewportX}, ${currentViewportY})`);
		
		elementAnalyzer.highlightElementAtPoint(documentX, documentY);
	}

	
	// ✅ 수정: 측정값 위치 업데이트 함수
	function updateAllMeasurementPositions() {
		// 선택된 요소가 있으면 해당 요소 측정값 업데이트
		if (stateManager.selectedElement) {
			//console.log('🔄 Updating selected element measurements after scroll');
			stateManager.elementAnalyzer.updateSelectedElementMeasurements();
		}
		// 현재 하이라이트 요소가 있으면 해당 요소 측정값 업데이트
		else if (stateManager.currentElement) {
			//console.log('🔄 Updating current element measurements after scroll');
			stateManager.elementAnalyzer.updateMeasurements();
		}
	}



	/**
	 * ✅ 컴포넌트 유효성 검사
	 */
	function isComponentValid(componentName) {
		switch(componentName) {
			case 'stateManager':
				const isValid = stateManager && 
							stateManager.InspectorState && 
							typeof stateManager.InspectorState === 'object';
				if (!isValid) {
					console.error('❌ StateManager validation failed:', {
						stateManager: !!stateManager,
						InspectorState: !!stateManager?.InspectorState,
						type: typeof stateManager?.InspectorState
					});
				}
				return isValid;
				
			default:
				return false;
		}
	}


	
	/**
	 * ✅ 인스펙터 상태 동기화
	 */
	function syncInspectorStatus(isActive) {
		try {
			chrome.runtime.sendMessage({
				action: 'statusChanged',
				isActive: isActive
			});
		} catch (e) {
			console.log('Status sync message failed:', e);
		}
	}

	// ✅ [수정] directActivation 함수 - 초기화 확인
	// ✅ [수정] directActivation 함수 - Config 적용 후 UI 생성
	// ✅ [수정] directActivation 함수 - 동기 함수로 유지
	function directActivation() {
		console.log('Performing direct activation');

		// ✅ 초기화 확인
		if (!isInitialized) {
			console.error('❌ Components not initialized for activation');
			throw new Error('Web Inspector components not initialized');
		}

		try {
			stateManager.isInspectorActive = true;


			// 기존 UI 요소 완전 제거
			uiManager.removeAllUIElements();


			// ✅ UI 요소 생성 (Config 적용 후)
			try {
				uiManager.createUIElements();
			} catch (uiError) {
				console.error('❌ UI creation failed:', uiError);
				throw uiError;
			}

			// 이벤트 리스너 등록
			setupEventListenersFallback();

			// 초기 설정
			uiManager.updateCoordTooltipPosition();

			console.log('✅ Direct activation completed successfully');

		} catch (error) {
			console.error('❌ Direct activation failed:', error);
			stateManager.isInspectorActive = false;
			stateManager.InspectorState.reset();
			throw error;
		} finally {
			stateManager.InspectorState.isActivating = false;
		}
	}


	/**
	 * ✅ 안전한 활성화 상태 리셋
	 */
	function safeResetActivationState() {
		try {
			if (stateManager) {
				stateManager.isInspectorActive = false;
				if (stateManager.InspectorState) {
					stateManager.InspectorState.isActivating = false;
					stateManager.InspectorState.isDeactivating = false;
				}
			}
		} catch (error) {
			console.log('⚠️ Error during safe state reset:', error);
		}
	}
	

	
	/**
	 * ✅ deactivateInspector - 토글버튼 통합 강화
	 */
	function deactivateInspector(completeShutdown = true) {
		console.log('🔴 Deactivating inspector from toggle button, complete shutdown:', completeShutdown);

		// ✅ 초기화되지 않았거나 초기화 중이면 무시
		if (!isInitialized || initializationPending) {
			console.log('🔄 Web Inspector not properly initialized, skipping deactivation');
			return;
		}

		// ✅ 상태 먼저 변경하여 추가 활성화 방지
		if (stateManager) {
			stateManager.isInspectorActive = false;
			stateManager.InspectorState.isDeactivating = true;
		}

		try {
			// ✅ 모든 이벤트 리스너 즉시 제거
			removeAllEventListeners();
			
			// ✅ 토글버튼으로부터의 종료는 항상 완전 종료
			completeComponentCleanup();
			
			// ✅ 상태 동기화 메시지
			try {
				chrome.runtime.sendMessage({
					action: 'statusChanged', 
					isActive: false
				});
			} catch (e) {
				console.log('Status sync message failed:', e);
			}

		} catch (error) {
			console.error('❌ Deactivation error from toggle button:', error);
			// ✅ 에러 발생 시에도 emergencyCleanup 보장
			emergencyCleanup();
		} finally {
			if (stateManager) {
				stateManager.InspectorState.isDeactivating = false;
			}
		}
		
		console.log('✅ Deactivation completed from toggle button');
	}






	// ✅ 모든 이벤트 리스너 제거 함수
	function removeAllEventListeners() {
		console.log('🔇 Removing all event listeners...');
		
		const events = ['mousemove', 'click', 'keydown', 'keyup', 'scroll', 'resize'];
		events.forEach(event => {
			document.removeEventListener(event, onMouseMove, false);
			document.removeEventListener(event, onElementClick, true);
			document.removeEventListener(event, onKeyDown, false);
			document.removeEventListener(event, onScroll, false);
		});
		
		// ✅ window 메시지 리스너 제거 시도
		try {
			window.removeEventListener('message', windowMessageHandler);
		} catch (e) {}
		
		console.log('✅ All event listeners removed');
	}


	// emergencyCleanup은 DOM 요소 강제 제거에 집중해야 함
	function emergencyCleanup() {
		console.log('🚨 EMERGENCY: Performing aggressive cleanup...');
		
		try {
			// ✅ 컴포넌트 정리는 completeComponentCleanup에서 처리하므로 여기서는 제거
			// ❌ 삭제: 다음 코드들은 completeComponentCleanup과 중복됨
			/*
			if (elementAnalyzer) {
				elementAnalyzer.cleanup();
				elementAnalyzer = null;
			}
			// ... 다른 컴포넌트들도 마찬가지
			*/

			// ✅ DOM 요소 강제 제거에만 집중
			const aggressiveSelectors = [
				'#web-inspector-panel', '#ad-container', '#coord-tooltip', '#crosshair',
				'#downloadId', '#floating-button-panel', '.ruler-button-container',
				'.measurement-line', '.measurement-text',
				'.size-line-extended', '.size-line-vertical-extended',
				'.margin-value-text', '.padding-value-text', '.size-text',
				'.margin-area', '.padding-area',
				'.external-element-highlight', '.child-highlight', '.padding-highlight',
				'.t-line-with-markers', '.t-line-vertical-with-markers',
				'.connected-tooltip', '.center-marker',
				'.iframe-overlay', '.ruler-mode-btn',
				'.cookie-message', '.premium-popup',
				'[class*="svg-measurement"]', '[data-inspector-type]',
				'.viewport-tooltip', '.depth-control-container'
			];

			aggressiveSelectors.forEach(selector => {
				try {
					const elements = document.querySelectorAll(selector);
					elements.forEach(element => {
						if (element?.parentNode) {
							element.parentNode.removeChild(element);
						}
					});
				} catch (error) {
					console.log('Error removing element with selector', selector, error);
				}
			});

			// ✅ 상태 동기화 메시지
			try {
				chrome.runtime.sendMessage({
					action: 'statusChanged',
					isActive: false
				});
			} catch (e) {
				console.log('Status sync message failed:', e);
			}

			console.log('✅ Aggressive emergency cleanup finished');

		} catch (error) {
			console.error('❌ Emergency cleanup error:', error);
		}
	}


	
	


	function safeStorageSet(items, callback) {
		try {
			if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
				console.log('Chrome storage API not available');
				if (callback) setTimeout(callback, 100);
				return;
			}

			chrome.storage.sync.set(items, function () {
				if (chrome.runtime.lastError) {
					console.log('Storage set error (non-critical):', chrome.runtime.lastError);
				}
				if (callback) callback();
			});
		} catch (error) {
			console.log('Storage set exception (non-critical):', error);
			if (callback) setTimeout(callback, 100);
		}
	}

	function restoreAdjustedElements() {
		stateManager.temporarilyAdjustedElements.forEach(item => {
			if (item.element && item.element.style) {
				item.element.style.setProperty('opacity', item.originalOpacity, 'important');
				item.element.style.setProperty('pointer-events', item.originalPointerEvents, 'important');
			}
		});
		stateManager.temporarilyAdjustedElements = [];
	}

	// 메시지 리스너 설정
	// ✅ [수정] 메시지 리스너 설정 - 초기화 통합
	function setupMessageListeners() {
		let currentTabId = null;
		
		// ✅ 현재 탭 ID 가져오기
		if (typeof chrome !== 'undefined' && chrome.tabs) {
			chrome.tabs.getCurrent((tab) => {
				if (tab) currentTabId = tab.id;
			});
		}

		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			// ✅ sender 탭 ID 확인 (크로스-탭 메시지 필터링)
			const isFromSameTab = sender.tab && currentTabId && sender.tab.id === currentTabId;
			const isFromBackground = !sender.tab; // background script에서 온 메시지
			
			console.log(`📨 Message received - From tab: ${sender.tab?.id}, Current tab: ${currentTabId}, Same: ${isFromSameTab}`);

			// ✅ 같은 탭에서 온 메시지만 처리 (크로스-탭 메시지 무시)
			if (!isFromSameTab && !isFromBackground) {
				console.log('⏭️ Ignoring cross-tab message');
				return;
			}

			switch (request.action) {

				case 'toggleMeasuring':
					// ✅ 안전한 실행 사용
					CoordinateLayoutUtils.safeExecute('uiManager', 'toggleMeasuring');
					sendResponse({ success: true });
					return true;

				case 'changeMeasurementMode':
					// ✅ 안전한 실행 사용
					CoordinateLayoutUtils.safeExecute('uiManager', 'toggleMeasurementMode', request.mode);
					sendResponse({ success: true });
					return true;

				case 'downloadHTML':
					console.log('📥 Download HTML requested');
					// ✅ 안전한 실행 사용
					const result = CoordinateLayoutUtils.safeExecute('stateManager', 'downloadManager.downloadFullPage');
					sendResponse({ success: !!result });
					return true;
					
				case 'updateConfig':
					// ✅ config에 탭 ID가 있으면 확인
					if (request.config && request.config.tabId) {
						if (stateManager && request.config.tabId !== stateManager.tabId) {
							console.log('⏭️ Ignoring config from different tab');
							sendResponse({ success: true });
							return true;
						}
					}
					
					// ✅ [ConfigManager 연동] options.js에서 updateOptions 액션으로 보낸 설정 업데이트
					if (configManager && request.config && request.config.options) {
						configManager.setMultiple(request.config.options);
						console.log('✅ [ConfigManager] updateConfig 동기화 완료');
					}
					
					handleConfigUpdate(request.config);
					sendResponse({ success: true });
					return true;

				case 'activate':
					console.log('🎯 Activation requested for current tab');
					activateInspector().then(() => {
						sendResponse({ success: true });
					}).catch(error => {
						console.error('❌ Activation failed:', error);
						sendResponse({ success: false, error: error.message });
					});
					return true;

				case 'deactivate':
					console.log('🔴 Deactivation requested for current tab');
					if (stateManager) {
						deactivateInspector(request.completeShutdown);
					}
					sendResponse({ success: true });
					return true;

				case 'syncStatus':
					// ✅ 상태 동기화 메시지 (안전한 접근)
					sendResponse({ 
						isActive: stateManager ? stateManager.isInspectorActive : false,
						isInitialized: isInitialized
					});
					return true;

				// ✅ [수정] 다른 액션들 - 안전한 접근
				// ✅ [수정] 간소화
				case 'updateDepthLevel':
					if (stateManager) {
						stateManager.updateDepthLevel(request.depthLevel);
					}
					sendResponse({ success: true });
					return true;

				case 'changeMeasurementMode':
					if (stateManager && uiManager) {
						uiManager.toggleMeasurementModeManager(request.mode);
					}
					sendResponse({ success: true });
					return true;

				case 'toggleMeasuring':
					if (stateManager && uiManager) {
						uiManager.toggleMeasuring();
					}
					sendResponse({ success: true });
					return true;

				case 'updatePanelPosition':
					if (stateManager && stateManager.panelFrame && uiManager) {
						const newPosition = request.position;
						stateManager.options.panelPosition = newPosition;
						uiManager.updatePanelPosition();
						uiManager.updatePanelPositionUI(newPosition);
						
						if (window.toggleManager) {
							window.toggleManager.updatePanelPositionIndicator(newPosition);
						}
					}
					sendResponse({ success: true });
					return true;

				case 'downloadHTML':
					// ✅ [수정] 다운로드 매니저 직접 호출로 복구
					console.log('📥 Download HTML requested');
					if (stateManager && stateManager.downloadManager) {
						stateManager.downloadManager.downloadFullPage();
						sendResponse({ success: true });
					} else {
						console.error('❌ Download manager not available');
						sendResponse({ success: false, error: 'Download manager not available' });
					}
					return true;

				case 'showCookieMessage':
					showCookieMessage(request.message, request.type);
					sendResponse({ success: true });
					return true;

				case 'getStatus':
					sendResponse({
						isActive: stateManager ? stateManager.isInspectorActive : false,
						isInitialized: isInitialized,
						activeModes: stateManager ? Array.from(stateManager.activeModes) : [],
						currentDepthLevel: stateManager ? stateManager.currentDepthLevel : 2
					});
					return true;
				
				default:
					sendResponse({ success: false, error: 'Unknown action' });
					return false;
			}
		});

		// 윈도우 메시지 리스너
		// ✅ 윈도우 메시지 리스너도 탭 필터링
		window.addEventListener('message', function (event) {
			try {
				
				//------------------------------------------------------------------------------------>>> Tab별 관리 START ( 메시지 리스너 탭 필터링)
				// ✅ 현재 탭의 StateManager가 있는지 확인
				if (!stateManager || !isInitialized) {
					return;
				}

				// ✅ 패널에서 온 메시지만 처리 (다른 탭의 패널 메시지 무시)
				const isFromCurrentTabPanel = event.source === window && 
											event.data && 
											event.data.type;
				
				if (!isFromCurrentTabPanel) {
					return;
				}

				// ✅ 활성화 상태 확인
				if (!stateManager.isInspectorActive) {
					console.log('🔄 Inspector not active, ignoring window message');
					return;
				}

				// ✅ 메시지 처리 (기존 로직 유지)
				if (event.data.type === 'TOGGLE_MEASUREMENT_MODE_FROM_PANEL') {
					console.log('🔧 Panel requested mode toggle:', event.data.mode);
					if (uiManager && uiManager.toggleMeasurementModeManager) {
						uiManager.toggleMeasurementModeManager(event.data.mode);
					}
				}
				//------------------------------------------------------------------------------------>>> Tab별 관리 END

				// ✅ 패널에서 온 측정 모드 토글 메시지 처리
				if (event.data.type === 'TOGGLE_MEASUREMENT_MODE_FROM_PANEL') {
					console.log('🔧 Panel requested mode toggle:', event.data.mode);
					
					if (uiManager && uiManager.toggleMeasurementModeManager) {
						uiManager.toggleMeasurementModeManager(event.data.mode);
					}
				}
				// ✅ 패널 위치 변경 메시지 처리
				else if (event.data.type === 'PANEL_POSITION_CHANGED') {
					
					// ✅ 패널 위치 업데이트
					stateManager.options.panelPosition = event.data.position;
					if (uiManager) {
						uiManager.updatePanelPosition();
						uiManager.updatePanelPositionUI(event.data.position);
					}
					
					// ✅ storage에 저장
					if (window.WebInspector && window.WebInspector._safeStorageSet) {
						window.WebInspector._safeStorageSet({ panelPosition: event.data.position });
					}
				}
				else if (event.data.type === 'TGLPNL_VISIBILITY') { //----> Esc: 패널 숨기기
					if (uiManager) {
						uiManager.togglePanelVisibility();
					}
					return true;
				}
				else if (event.data.type === 'TGLPNL_CLOSE') { //----> 패널 숨기기
					console.log('--------------->>> TGLPNL_CLOSE');
					if (uiManager) {
						uiManager.togglePanelVisibilityOnOff(true);
					}
					return true;
				}
				// ... 기타 메시지 처리 (모두 stateManager와 uiManager 안전하게 접근)
				
			} catch (error) {
				console.log('❌ Window message handling error:', error);
			}
		});
	}


	// ✅ [추가] 글로벌 에러 핸들러
	window.addEventListener('error', function(e) {
		// ✅ "Cannot read properties of null" 에러 무시 또는 로깅
		if (e.error && e.message && e.message.includes('Cannot read properties of null')) {
			console.log('⚠️ Safe null reference error (ignored):', e.message);
			e.preventDefault();
			e.stopPropagation();
			return true;
		}
	});

	// ✅ [추가] Promise rejection 핸들러
	window.addEventListener('unhandledrejection', function(e) {
		if (e.reason && e.reason.message && e.reason.message.includes('Cannot read properties of null')) {
			console.log('⚠️ Safe null reference in promise (ignored):', e.reason.message);
			e.preventDefault();
			e.stopPropagation();
			return true;
		}
	});

	
	function updateDepthLevel(depthLevel) {
		stateManager.currentDepthLevel = Math.max(1, Math.min(5, depthLevel));
		if (stateManager.selectedElement || stateManager.currentElement) {
			elementAnalyzer.updateMeasurements();
		}
	}

	function safePostMessage(targetWindow, message, targetOrigin) {
		try {
			// ✅ targetWindow 유효성 확인
			if (!targetWindow || !targetWindow.postMessage) {
				console.log('Invalid target window for postMessage');
				return false;
			}

			// ✅ 같은 origin인지 확인
			let actualTargetOrigin = targetOrigin;

			try {
				if (targetWindow.location && targetWindow.location.origin) {
					if (targetWindow.location.origin === window.location.origin) {
						actualTargetOrigin = targetOrigin;
					} else {
						// ✅ 다른 origin인 경우 cautious하게 처리
						actualTargetOrigin = '*';
						console.log('Different origin, using wildcard for postMessage');
					}
				}
			} catch (securityError) {
				// ✅ Cross-origin 접근 오류 (정상적인 경우)
				actualTargetOrigin = '*';
			}

			// ✅ 메시지 전송
			targetWindow.postMessage(message, actualTargetOrigin);
			return true;

		} catch (error) {
			console.log('Post message error:', error);
			return false;
		}
	}

	function showCookieMessage(message, type) {
		// 기존 showCookieMessage 함수 구현
		console.log('Cookie message:', message, type);
	}

	//------------------------------------------------------------------------------------------------------->>> Tab 관리 (독립적인 초기화 시스템) START
	// 초기화
	// ✅ [수정] 초기화 함수 - 최소한의 설정만 수행
	// main-content.js - initialize 함수 수정
	function initialize() {
		// ✅ 이미 초기화되었으면 로그 출력하지 않음
		if (isInitialized) {
			return true;
		}
		
		console.log('🔄 Initializing Web Inspector for independent tab...');

		try {
			// ✅ 탭별 고유 설정
			// ✅ 탭별 고유 설정 --------------------------------------------------------------------->>> TAB 관리 START
			setupTabSpecificEnvironment();
			// ✅ 탭별 고유 설정 --------------------------------------------------------------------->>> TAB 관리 END
			setupMessageListeners();
			loadOptions();
			initializeMouseTracking();
			
			console.log('✅ Web Inspector initialized for independent tab');
			return true;
		} catch (error) {
			console.error('❌ Web Inspector: Initialization failed', error);
			return false;
		}
	}

	// ✅ 탭별 고유 설정 --------------------------------------------------------------------->>> TAB 관리 START
	/**
	 * ✅ 탭별 독립 환경 설정
	 */
	function setupTabSpecificEnvironment() {
		// ✅ 탭별 스토리지 키 설정
		if (!window.webInspectorTabId) {
			window.webInspectorTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		}
		
		console.log(`🔧 Setting up environment for tab: ${window.webInspectorTabId}`);
		
		cleanupPotentialCrossTabResources();
		// ✅ 기존 다른 탭의 리소스 정리 (안전 장치)
		cleanupOtherTabResources();
	}

	/**
	 * ✅ 다른 탭의 리소스 정리 (안전 장치)
	 */
	function cleanupPotentialCrossTabResources() {
		console.log('🧹 Cleaning up potential cross-tab resources...');
		
		// ✅ 현재 StateManager가 없으면 아직 탭 ID를 모르므로 건너뜀
		if (!stateManager || !stateManager.tabId) {
			console.log('⏭️ Skipping cross-tab cleanup - StateManager not ready');
			return;
		}
		
		// ✅ data-tab-id 속성이 있고 현재 탭 ID와 다른 요소 제거
		const elementsWithTabId = document.querySelectorAll('[data-tab-id]');
		elementsWithTabId.forEach(element => {
			const elementTabId = element.getAttribute('data-tab-id');
			if (elementTabId && elementTabId !== stateManager.tabId) {
				try {
					if (element.parentNode) {
						element.parentNode.removeChild(element);
						console.log('🧹 Removed cross-tab element with tab-id:', elementTabId);
					}
				} catch (e) {
					console.log('Error removing cross-tab element:', e);
				}
			}
		});
	}
	// ✅ 탭별 고유 설정 --------------------------------------------------------------------->>> TAB 관리 END

	// ✅ 탭별 고유 설정 --------------------------------------------------------------------->>> TAB 관리 END
	/**
	 * ✅ 다른 탭의 리소스 정리 (안전 장치)
	 */
	function cleanupOtherTabResources() {
		console.log('🧹 Cleaning up potential cross-tab resources...');
		
		// ✅ 현재 탭의 ID와 일치하지 않는 리소스 제거
		const inspectorElements = document.querySelectorAll('[id*="inspector"], [class*="inspector"]');
		inspectorElements.forEach(element => {
			if (!element.getAttribute('data-tab-id') || 
				element.getAttribute('data-tab-id') !== window.webInspectorTabId) {
				try {
					if (element.parentNode) {
						element.parentNode.removeChild(element);
						console.log('🧹 Removed cross-tab element:', element.id || element.className);
					}
				} catch (e) {}
			}
		});
	}
	//------------------------------------------------------------------------------------------------------->>> Tab 관리 (독립적인 초기화 시스템) END

	// ✅ [신규] 마우스 위치 추적 초기화 함수
	function initializeMouseTracking() {
		console.log('🖱️ Initializing mouse position tracking...');
		
		// ✅ 초기 마우스 위치 설정 (화면 중앙)
		lastMousePosition = {
			clientX: window.innerWidth / 2,
			clientY: window.innerHeight / 2,
			lastUpdated: Date.now()
		};
		
		// ✅ 문서 클릭 시에도 마우스 위치 업데이트
		document.addEventListener('click', function(e) {
			if (stateManager && stateManager.isInspectorActive) {
				lastMousePosition.clientX = e.clientX;
				lastMousePosition.clientY = e.clientY;
				lastMousePosition.lastUpdated = Date.now();
				console.log(`🖱️ Mouse position updated from click: (${e.clientX}, ${e.clientY})`);
			}
		}, true);

		// ✅ 마우스 이동 시 위치 지속적으로 업데이트
		document.addEventListener('mousemove', function(e) {
			lastMousePosition.clientX = e.clientX;
			lastMousePosition.clientY = e.clientY;
			lastMousePosition.lastUpdated = Date.now();
		}, true);

		console.log('✅ Mouse position tracking initialized');
	}

	//------------------------------------------------------------------------------------------------------->>> TAB 관리 START

	// ✅ [수정] 통합 config 업데이트 처리 - 컴포넌트 없이도 동작, 활성 모드 강제 동기화, Depth 동기화 강화
	/**
	 * ✅ handleConfigUpdate - 탭 ID 확인 강화 + ConfigManager 동기화
	 * 
	 * options.js가 ConfigManager 기반으로 변경되었으므로,
	 * updateOptions 메시지가 오면 ConfigManager와 StateManager를 동시에 업데이트합니다.
	 */
	// main-content.js - handleConfigUpdate 완전 수정
	function handleConfigUpdate(config) {
		if (!config) {
			console.log('❌ No config to process');
			return;
		}

		console.log('🎯 Processing config update in main content');

		// ✅ [ConfigManager 연동] options.js에서 전송한 updateOptions 메시지를 받으면
		// ConfigManager에도 업데이트하여 StateManager와의 일관성 유지
		if (configManager && config.options) {
			// ConfigManager.setMultiple()을 호출하여 설정 동기화
			// options 객체의 모든 설정을 ConfigManager에 저장
			configManager.setMultiple(config.options);
			console.log('✅ [ConfigManager] 설정 동기화 완료 (options.js → ConfigManager)');
		}

		// ✅ 탭 ID 확인: 다른 탭의 config이면 즉시 무시
		if (config.tabId) {
			if (stateManager && config.tabId !== stateManager.tabId) {
				console.log('⏭️ Ignoring config from different tab:', config.tabId, 'Current tab:', stateManager.tabId);
				return;
			}
		} else {
			// ✅ tabId가 없는 config (레거시)는 현재 탭에서만 처리
			console.log('⚠️ Config without tabId (legacy), processing for current tab only');
			
			// ✅ 레거시 config에 현재 탭 ID 추가
			if (stateManager && stateManager.tabId) {
				config.tabId = stateManager.tabId;
				console.log('✅ Added current tab ID to legacy config:', stateManager.tabId);
			}
		}

		// ✅ 캐시에 저장 (StateManager가 있으면 탭별, 없으면 통합)
		try {
			if (stateManager && stateManager.tabId) {
				localStorage.setItem(stateManager.localStorageKey, JSON.stringify(config));
				console.log(`✅ Config saved to tab-specific cache: ${stateManager.localStorageKey}`);
			} else {
				localStorage.setItem('webinspector_config', JSON.stringify(config));
				console.log('✅ Config saved to unified cache (StateManager not ready)');
			}
		} catch (e) {
			console.error('❌ Config cache save error:', e);
		}

		// ✅ 컴포넌트가 이미 초기화되어 있으면 적용
		if (isInitialized && stateManager) {
			console.log('🎯 Applying config to initialized components');
			
			// ✅ 활성 모드 적용
			if (config.activeModes && Array.isArray(config.activeModes)) {
				stateManager.activeModes = new Set(config.activeModes);
				console.log('✅ Active modes applied:', Array.from(stateManager.activeModes));
			}
			
			// ✅ Depth 값 적용
			if (config.currentDepthLevel !== undefined) {
				stateManager.currentDepthLevel = config.currentDepthLevel;
				console.log('✅ Depth level applied:', stateManager.currentDepthLevel);
			}
			
			// ✅ 옵션 적용
			if (config.options && Object.keys(config.options).length > 0) {
				stateManager.updateOptions(config.options);
				console.log('✅ Options applied');
			}
			
			// ✅ UI 동기화
			if (toggleManager) {
				setTimeout(() => {
					toggleManager.updateAllRulerButtonsFromState();
					toggleManager.syncDepthFromState();
					console.log('✅ UI synchronized with new config');
				}, 100);
			}
			
			// ✅ 측정값 업데이트
			if (stateManager.selectedElement || stateManager.currentElement) {
				setTimeout(() => {
					if (elementAnalyzer && elementAnalyzer.updateMeasurements) {
						elementAnalyzer.updateMeasurements();
						console.log('✅ Measurements updated with new config');
					}
				}, 200);
			}
		} else {
			console.log('⏭️ Config received but components not initialized yet');
		}
		
		console.log('✅ Config processing completed');
	}

	/**
 	* ✅ loadOptions - 탭별 환경에서도 동작하도록 수정
	*/
	function loadOptions() {
		console.log('📥 Loading options for future use...');

		// ✅ StateManager가 있으면 탭별 로드, 없으면 통합 로드
		if (stateManager && stateManager.tabId) {
			console.log(`🔄 Loading options for tab: ${stateManager.tabId}`);
			// StateManager의 loadCachedOptions 사용
		} else {
			console.log('🔄 Loading unified options (StateManager not ready)');
			// 기존 통합 로드 로직
			chrome.storage.sync.get(null, function (savedOptions) {
				if (chrome.runtime.lastError) {
					console.error('Storage error:', chrome.runtime.lastError);
					return;
				}

				if (Object.keys(savedOptions).length > 0) {
					console.log('✅ Unified options loaded for future use');
					try {
						localStorage.setItem('webinspector_options', JSON.stringify(savedOptions));
					} catch (e) {
						console.log('Cache save error:', e);
					}
				} else {
					console.log('✅ No saved unified options found');
				}
			});
		}
	}
	//------------------------------------------------------------------------------------------------------->>> TAB 관리 END

	
	// 초기화 실행
	initialize();

	console.log('🎉 Web Inspector Main Content Script loaded successfully!');


})();

// 상단에 window.WebInspector 정의(구현) 필요...
window.WebInspector = window.webInspector;
