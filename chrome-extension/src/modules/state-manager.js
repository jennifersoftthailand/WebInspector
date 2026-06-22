// state-manager.js - 완전 통합 버전
class StateManager {

    /**
	 * ✅ [수정] 생성자 - initializeDependencies 호출
	 */
	constructor() {
		console.log('🏗️ StateManager initializing...');

		// ✅ 가장 먼저 tabId 생성 (동기적으로)
		this.tabId = this.generateTabId();
		this.storageKey = `webinspector_config_${this.tabId}`;
		this.localStorageKey = `webinspector_config_${this.tabId}`;
		
		// ✅ 초기화 상태 추적
		this.initializationState = {
			isInitializing: false,
			initializationTime: 0,
			initializationAttempts: 0,
			MAX_INITIALIZATION_ATTEMPTS: 3
		};

		// ✅ 기본값 구조만 설정
		this.options = this.getEmptyOptions();
		this.MEASUREMENT_MODES = this.getEmptyMeasurementModes();
		this.Z_INDEX_LAYERS = this.getEmptyZIndexLayers();
		
		// ✅ [수정] 룰러 버튼 영역 높이 상수 제거 또는 0으로 설정
		this.RULER_BUTTONS_HEIGHT = 0;
		this.RULER_X_HEIGHT = 0;  
		this.RULER_Y_WIDTH = 0;

		// ✅ 기본 상태 변수들
		this.initializeDefaultState();

		// 마우스 이벤트
		this.events = {};


		// ✅ 쓰기 제한 관련 변수 추가
		this.lastStorageWriteTime = 0;
		this.STORAGE_WRITE_COOLDOWN = 1000;
		this.pendingStorageWrite = null;
		this.isWritingToStorage = false;

		// StateManager 생성자에 추가
		this.isPanelVisible = false;

		// ✅ 활성 모드 기본값 명시적 설정
		this.initializeActiveModes();

		console.log('✅ StateManager initialized');
	}

	//-------------------------------------------------------------------------------------------------------------------------
	// 이벤트 등록
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    // 이벤트 발생
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    // 이벤트 제거
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

	//########################################################################################################################>>> START
	/**
	 * ✅ [통합] completeCleanup - 모든 컴포넌트에서 통일
	 */
	completeCleanup() {
		console.log(`🧹 STATE MANAGER: Complete cleanup for tab: ${this.tabId}`);
		
		// ✅ 초기화 상태 리셋
		this.initializationState = {
			isInitializing: false,
			initializationTime: 0,
			initializationAttempts: 0,
			MAX_INITIALIZATION_ATTEMPTS: 3
		};

		// ✅ ToggleManager 먼저 정리
		if (this.toggleManager) {
			try {
				this.toggleManager.completeCleanup();
				this.toggleManager = null;
			} catch (error) {
				console.log('ToggleManager cleanup error:', error);
			}
		}
		
		// ✅ ElementInfo 정리
		if (this.elementInfo) {
			try {
				this.elementInfo.completeCleanup();
				this.elementInfo = null;
			} catch (error) {
				console.log('ElementInfo cleanup error:', error);
			}
		}
		
		// ✅ UIManager 정리
		if (this.uiManager) {
			try {
				this.uiManager.completeCleanup();
				this.uiManager = null;
			} catch (error) {
				console.log('UIManager cleanup error:', error);
			}
		}
		
		// ✅ ElementAnalyzer 정리
		if (this.elementAnalyzer) {
			try {
				this.elementAnalyzer.completeCleanup();
				this.elementAnalyzer = null;
			} catch (error) {
				console.log('ElementAnalyzer cleanup error:', error);
			}
		}
		
		// ✅ DownloadManager 정리
		if (this.downloadManager) {
			try {
				this.downloadManager.completeCleanup();
				this.downloadManager = null;
			} catch (error) {
				console.log('DownloadManager cleanup error:', error);
			}
		}
		
		// ✅ Util 정리
		if (this.util) {
			try {
				this.util.completeCleanup();
				this.util = null;
			} catch (error) {
				console.log('Util cleanup error:', error);
			}
		}
		
		// ✅ 탭별 로컬 스토리지 정리
		try {
			if (this.localStorageKey) {
				localStorage.removeItem(this.localStorageKey);
				console.log(`✅ Local storage cleaned for tab: ${this.tabId}`);
			}
		} catch (e) {
			console.log('Local storage cleanup error:', e);
		}

		// ✅ 모든 상태 변수 완전 초기화
		this.isInspectorActive = false;
		this.isMeasuringActive = false;
		this.currentElement = null;
		this.selectedElement = null;
		this.highlightElement = null;
		this.selectedElementHighlight = null;
		this.measureElements = [];
		this.coordTooltip = null;
		this.currentDepthLevel = 2;
		this.maxDepthLevel = 5;
		this.textPositions = [];
		this.verticalTooltipPositions = [];
		this.horizontalTooltipPositions = [];
		this.guideLinePositions = [];

		// ✅ 컬렉션 완전 초기화
		this.activeModes = new Set();
		this.iframeOverlays = [];
		this.externalElementHighlights = [];
		this.outlineHighlights = [];
		this.temporarilyAdjustedElements = [];
		
		// ✅ 캐시 완전 클리어
		if (this.externalElementCache) {
			this.externalElementCache.clear();
		}
		this.lastStableKey = null;
		this.lastMeasuredElement = null;
		this.lastMeasurementTime = 0;
		this.isDownloading = false;

		// ✅ 옵션과 설정 완전 초기화
		this.options = this.getEmptyOptions();
		this.MEASUREMENT_MODES = this.getEmptyMeasurementModes();
		this.Z_INDEX_LAYERS = this.getEmptyZIndexLayers();
		
		// ✅ Advanced Features 초기화
		this.advancedFeatures = {
			highZIndexAdjustment: true,
			iframeOverlay: false,
			isolation: true
		};

		// ✅ 룰러 버튼 상태 초기화
		this.showButtonPanel = true;

		// ✅ Inspector 상태 완전 리셋
		if (this.InspectorState && typeof this.InspectorState.reset === 'function') {
			this.InspectorState.reset();
		}
		
		// ✅ 스토리지 관련 변수 초기화
		this.lastStorageWriteTime = 0;
		this.pendingStorageWrite = null;
		this.isWritingToStorage = false;

		// ✅ 웹 인스펙터 리소스 정리
		this.cleanupResources();

		console.log('✅ State manager completely cleaned and reset');
	}

	

	//########################################################################################################################>>> END
	
	/**
     * ✅ 안전한 초기화 - 중첩 호출 방지
     */
    safeInitialize() {
        if (this.initializationState.isInitializing) {
            console.log('🔄 StateManager initialization already in progress');
            return Promise.resolve();
        }

        const now = Date.now();
        if (now - this.initializationState.initializationTime < 1000) {
            console.log('⏳ StateManager initialization too frequent, waiting...');
            return new Promise(resolve => {
                setTimeout(() => {
                    this.safeInitialize().then(resolve);
                }, 1000 - (now - this.initializationState.initializationTime));
            });
        }

        this.initializationState.isInitializing = true;
        this.initializationState.initializationTime = now;
        this.initializationState.initializationAttempts++;

        if (this.initializationState.initializationAttempts > this.initializationState.MAX_INITIALIZATION_ATTEMPTS) {
            console.error('❌ StateManager: Maximum initialization attempts reached');
            this.initializationState.isInitializing = false;
            return Promise.reject(new Error('Maximum initialization attempts reached'));
        }

        console.log(`🔄 StateManager safe initialization (attempt ${this.initializationState.initializationAttempts})`);

        return this.loadConfig().finally(() => {
            this.initializationState.isInitializing = false;
        });
    }


	/**
     * ✅ 완전 정리 - 모든 리소스 해제
     */
    completeCleanup() {
		console.log(`🧹 STATE MANAGER: Complete cleanup for tab: ${this.tabId}`);
		
		// ✅ 초기화 상태 리셋
		this.initializationState = {
			isInitializing: false,
			initializationTime: 0,
			initializationAttempts: 0,
			MAX_INITIALIZATION_ATTEMPTS: 3
		};

		// ✅ ToggleManager 먼저 정리
		if (this.toggleManager) {
			try {
				if (typeof this.toggleManager.completeCleanup === 'function') {
					this.toggleManager.completeCleanup();
				} else if (typeof this.toggleManager.cleanup === 'function') {
					this.toggleManager.cleanup();
				}
				this.toggleManager = null;
			} catch (error) {
				console.log('ToggleManager cleanup error:', error);
			}
		}
		
		// ✅ ElementInfo 정리
		if (this.elementInfo) {
			try {
				if (typeof this.elementInfo.completeCleanup === 'function') {
					this.elementInfo.completeCleanup();
				} else if (typeof this.elementInfo.cleanup === 'function') {
					this.elementInfo.cleanup();
				}
				this.elementInfo = null;
			} catch (error) {
				console.log('ElementInfo cleanup error:', error);
			}
		}
		
		// ✅ UIManager 정리
		if (this.uiManager) {
			try {
				if (typeof this.uiManager.completeCleanup === 'function') {
					this.uiManager.completeCleanup();
				} else if (typeof this.uiManager.cleanup === 'function') {
					this.uiManager.cleanup();
				}
				this.uiManager = null;
			} catch (error) {
				console.log('UIManager cleanup error:', error);
			}
		}
		
		// ✅ ElementAnalyzer 정리
		if (this.elementAnalyzer) {
			try {
				if (typeof this.elementAnalyzer.completeCleanup === 'function') {
					this.elementAnalyzer.completeCleanup();
				} else if (typeof this.elementAnalyzer.cleanup === 'function') {
					this.elementAnalyzer.cleanup();
				}
				this.elementAnalyzer = null;
			} catch (error) {
				console.log('ElementAnalyzer cleanup error:', error);
			}
		}
		
		// ✅ DownloadManager 정리
		if (this.downloadManager) {
			try {
				if (typeof this.downloadManager.completeCleanup === 'function') {
					this.downloadManager.completeCleanup();
				} else if (typeof this.downloadManager.cleanup === 'function') {
					this.downloadManager.cleanup();
				}
				this.downloadManager = null;
			} catch (error) {
				console.log('DownloadManager cleanup error:', error);
			}
		}
		
		// ✅ Util 정리
		if (this.util) {
			try {
				if (typeof this.util.completeCleanup === 'function') {
					this.util.completeCleanup();
				} else if (typeof this.util.cleanup === 'function') {
					this.util.cleanup();
				}
				this.util = null;
			} catch (error) {
				console.log('Util cleanup error:', error);
			}
		}
		
		// ✅ 탭별 로컬 스토리지 정리
		try {
			if (this.localStorageKey) {
				localStorage.removeItem(this.localStorageKey);
				console.log(`✅ Local storage cleaned for tab: ${this.tabId}`);
			}
		} catch (e) {
			console.log('Local storage cleanup error:', e);
		}

		// ✅ 모든 상태 변수 완전 초기화
		this.isInspectorActive = false;
		this.isMeasuringActive = false;
		this.currentElement = null;
		this.selectedElement = null;
		this.highlightElement = null;
		this.selectedElementHighlight = null;
		this.measureElements = [];
		this.coordTooltip = null;
		this.currentDepthLevel = 2;
		this.maxDepthLevel = 5;
		this.textPositions = [];
		this.verticalTooltipPositions = [];
		this.horizontalTooltipPositions = [];
		this.guideLinePositions = [];

		// ✅ 컬렉션 완전 초기화
		this.activeModes = new Set();
		this.iframeOverlays = [];
		this.externalElementHighlights = [];
		this.outlineHighlights = [];
		this.temporarilyAdjustedElements = [];
		
		// ✅ 캐시 완전 클리어
		if (this.externalElementCache) {
			this.externalElementCache.clear();
		}
		this.lastStableKey = null;
		this.lastMeasuredElement = null;
		this.lastMeasurementTime = 0;
		this.isDownloading = false;

		// ✅ 옵션과 설정 완전 초기화
		this.options = this.getEmptyOptions();
		this.MEASUREMENT_MODES = this.getEmptyMeasurementModes();
		this.Z_INDEX_LAYERS = this.getEmptyZIndexLayers();
		
		// ✅ Advanced Features 초기화
		this.advancedFeatures = {
			highZIndexAdjustment: true,
			iframeOverlay: false,
			isolation: true
		};

		// ✅ 룰러 버튼 상태 초기화
		this.showButtonPanel = true;

		// ✅ Inspector 상태 완전 리셋
		if (this.InspectorState && typeof this.InspectorState.reset === 'function') {
			this.InspectorState.reset();
		}
		
		// ✅ 스토리지 관련 변수 초기화
		this.lastStorageWriteTime = 0;
		this.pendingStorageWrite = null;
		this.isWritingToStorage = false;

		// ✅ 웹 인스펙터 리소스 정리
		this.cleanupResources();

		console.log('✅ State manager completely cleaned and reset');
	}

	// ✅ 활성 모드 초기화 함수
    // ✅ [수정] 활성 모드 초기화 함수 - 저장된 값 우선
	// ✅ [수정] 활성 모드 초기화 - iframe-overlay 통합
	// ✅ [선택적 수정] 활성 모드 초기화 - iframe-overlay 기본 활성화
	initializeActiveModes() {
		// ✅ 저장된 활성 모드가 있으면 사용, 없으면 기본값 (iframe-overlay 포함)
		if (this.activeModes && this.activeModes.size > 0) {
			console.log('✅ Active modes already initialized from config:', Array.from(this.activeModes));
			return;
		}
		
		// ✅ 기본 활성 모드 설정 (iframe-overlay 기본 활성화)
		this.activeModes = new Set([
			'viewport', 'element', 'margin', 'padding', 
			'children', 'size', 'borderRadius',
			'iframeOverlay' // ✅ 여기에도 추가 (이중 보장)
		]);
		console.log('✅ Active modes initialized with defaults (iframeOverlay enabled):', Array.from(this.activeModes));
	}


    // ✅ 기본 상태 초기화 (기존 initializeDefaultState)
    initializeDefaultState() {
        this.forceElementDistanceUpdate = false;
        this.isInspectorActive = false;
        this.isMeasuringActive = false;
        this.currentElement = null;
        this.selectedElement = null;
        this.highlightElement = null;
        this.selectedElementHighlight = null;
        this.measureElements = [];
        this.coordTooltip = null;
        this.elementInfo = null;
        this.currentDepthLevel = 2;
        this.maxDepthLevel = 5;
        this.textPositions = [];
        this.verticalTooltipPositions = [];
        this.horizontalTooltipPositions = [];
        this.guideLinePositions = [];

        // 배열 관리
        this.iframeOverlays = [];
        this.externalElementHighlights = [];
        this.outlineHighlights = [];

        // 캐시 및 상태
        this.externalElementCache = new Map();
        this.lastStableKey = null;
        this.lastMeasuredElement = null;
        this.lastMeasurementTime = 0;
        this.isDownloading = false;

        // Advanced Features 기본값
        this.advancedFeatures = {
            highZIndexAdjustment: true,
            iframeOverlay: false,
            isolation: true
        };

        // 활성 모드 - 빈 Set으로 초기화 (loadConfig에서 채움)
        this.activeModes = new Set();

        // 룰러 버튼 표시 상태
        this.showButtonPanel = true;

        // Inspector 상태
        this.InspectorState = {
            isActivating: false,
            isDeactivating: false,
            activationQueue: [],
            lastActivationTime: 0,
            ACTIVATION_COOLDOWN: 500,

            canActivate: function () {
                if (this.isActivating || this.isDeactivating) {
                    console.log('Activation blocked: already in progress');
                    return false;
                }
                const now = Date.now();
                if (now - this.lastActivationTime < 100) {
                    console.log('Activation blocked: cooldown period');
                    return false;
                }
                return true;
            },

            enqueueActivation: function (callback) {
                const now = Date.now();
                if (now - this.lastActivationTime < this.ACTIVATION_COOLDOWN) {
                    if (!this.activationQueue.includes(callback)) {
                        this.activationQueue.push(callback);
                    }
                    return false;
                }
                this.lastActivationTime = now;
                return true;
            },

            processNextActivation: function () {
                if (this.activationQueue.length > 0) {
                    const callback = this.activationQueue.shift();
                    this.lastActivationTime = Date.now();
                    setTimeout(() => callback(), 100);
                }
            },

            reset: function () {
                this.isActivating = false;
                this.isDeactivating = false;
                this.activationQueue = [];
                this.lastActivationTime = 0;
            }
        };

        // 리소스 추적
        this.webInspectorResources = {
            eventListeners: [],
            elements: [],
            intervals: [],
            timeouts: [],
            observers: [],
            rafIds: []
        };
    }

    // ==================== CONFIG 관리 시스템 ====================

   

	// ✅ [신규] 패널 위치 정보 가져오기 함수
	getPanelPosition() {
		const panel = document.getElementById('floating-button-panel');
		if (!panel) return null;
		
		return {
			top: panel.style.top,
			left: panel.style.left,
			width: panel.offsetWidth,
			height: panel.offsetHeight
		};
	}
	// ✅ [신규] 패널 위치 적용 함수
	applyPanelPosition(position) {
		if (!position) return;
		
		const panel = document.getElementById('floating-button-panel');
		if (!panel) return;
		
		if (position.top && position.left) {
			panel.style.top = position.top;
			panel.style.left = position.left;
			panel.style.right = 'auto';
			panel.style.bottom = 'auto';
		}
	}



	



	//=======================================================================================================>>> Tab 별 관리 START
	
	
	
	
	/**
     * ✅ 빠른 tabId 생성 (동기적으로)
     */
    generateTabId() {
        // ✅ 간단하고 빠른 ID 생성 (URL 없이)
        return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }


	/**
     * ✅ 탭별 독립 Config 저장
     */
	// ✅ 통합 Config 저장 (기존 saveUnifiedConfig + Chrome Storage 동기화)
    // ✅ 통합 Config 저장 시스템 개선
	// ✅ [수정] 통합 Config 저장 - 쓰기 제한 적용 및 단일 저장소로 통합
	/**
     * ✅ saveConfig - 탭별 저장소 사용
     */
    saveConfig() {
        // ✅ 활성 모드 초기화 확인
        if (!this.activeModes || this.activeModes.size === 0) {
            console.log('⚠️ Active modes empty, checking storage...');
            const savedConfig = this.loadUnifiedConfig();
            if (savedConfig && savedConfig.activeModes) {
                this.activeModes = new Set(savedConfig.activeModes);
            } else {
                this.activeModes = new Set([
                    'viewport', 'element', 'margin', 'padding', 
                    'children', 'size', 'borderRadius', 'iframeOverlay'
                ]);
            }
        }

        const config = {
            options: this.options,
            measurementModes: this.MEASUREMENT_MODES,
            zIndexLayers: this.Z_INDEX_LAYERS,
            activeModes: Array.from(this.activeModes),
            advancedFeatures: this.advancedFeatures,
            showButtonPanel: this.showButtonPanel,
            currentDepthLevel: this.currentDepthLevel,
            timestamp: Date.now(),
            version: '1.3',
            tabId: this.tabId // ✅ 탭 ID 포함
        };

        console.log(`💾 Saving config for tab: ${this.tabId}`);

        // ✅ 탭별 저장소 사용
        this.saveToTabSpecificStorage(config);
        
        // ✅ broadcastConfigChange 호출 (수정된 버전)
        this.broadcastConfigChange(config);
        
        return true;
    }
	/**
     * ✅ saveToTabSpecificStorage - 탭별 저장소 사용
     */
    saveToTabSpecificStorage(config) {
        // ✅ 로컬 스토리지 (탭별)
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(config));
            console.log(`✅ Config saved to local storage for tab: ${this.tabId}`);
        } catch (e) {
            console.log('Local storage save error:', e);
        }

        // ✅ Chrome Storage (탭별)
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            const storageObj = {};
            storageObj[this.storageKey] = config;
            
            chrome.storage.sync.set(storageObj, () => {
                if (chrome.runtime.lastError) {
                    console.log('Chrome storage save error:', chrome.runtime.lastError);
                } else {
                    console.log(`✅ Config saved to Chrome storage for tab: ${this.tabId}`);
                }
            });
        }
    }

    // ✅ 통합 Config 로드 (기존 loadUnifiedConfig + initializeSafeState 통합)
    // ✅ [수정] Config 로드 함수 - Promise 반환 보장
	/**
     * ✅ loadConfig - 탭별 저장소 우선 사용
     */
    loadConfig() {
        console.log(`🔄 Loading config for tab: ${this.tabId}`);
        
        return new Promise((resolve) => {
            // 1. Chrome Storage에서 탭별 로드
            this.loadFromTabSpecificChromeStorage().then(chromeConfig => {
                if (chromeConfig && chromeConfig.tabId === this.tabId) {
                    console.log(`✅ Config loaded from Chrome storage for tab: ${this.tabId}`);
                    this.applyConfig(chromeConfig);
                    resolve(chromeConfig);
                    return;
                }
                
                // 2. 로컬 캐시에서 탭별 로드
                const localConfig = this.loadFromTabSpecificLocalCache();
                if (localConfig && localConfig.tabId === this.tabId) {
                    console.log(`✅ Config loaded from local cache for tab: ${this.tabId}`);
                    this.applyConfig(localConfig);
                    resolve(localConfig);
                    return;
                }

                // 3. 통합 config에서 기본값 로드
                this.loadFromUnifiedConfig().then(unifiedConfig => {
                    if (unifiedConfig) {
                        console.log(`✅ Using unified config as base for tab: ${this.tabId}`);
                        // ✅ 통합 config에 현재 탭 ID 추가
                        unifiedConfig.tabId = this.tabId;
                        this.applyConfig(unifiedConfig);
                        resolve(unifiedConfig);
                    } else {
                        // 4. 기본값 사용
                        console.log(`🔄 Using default config for tab: ${this.tabId}`);
                        this.initializeWithDefaults();
                        this.validateAndFixOptions();
                        resolve(null);
                    }
                });
            }).catch(error => {
                console.log(`❌ Config load error for tab ${this.tabId}, using defaults:`, error);
                this.initializeWithDefaults();
                this.validateAndFixOptions();
                resolve(null);
            });
        });
    }

	/**
     * ✅ loadFromTabSpecificChromeStorage - 탭별 Chrome Storage 로드
     */
    /**
     * ✅ 탭별 Chrome Storage 로드
     */
    loadFromTabSpecificChromeStorage() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get(this.storageKey, (result) => {
                    if (chrome.runtime.lastError) {
                        console.log('Chrome storage load error:', chrome.runtime.lastError);
                        resolve(null);
                        return;
                    }
                    
                    const config = result[this.storageKey];
                    if (config && config.tabId === this.tabId) {
                        // ✅ 로컬 캐시에 백업
                        try {
                            localStorage.setItem(this.localStorageKey, JSON.stringify(config));
                        } catch (e) {
                            console.log('Cache backup error:', e);
                        }
                        resolve(config);
                    } else {
                        console.log(`❌ No config in Chrome storage for tab: ${this.tabId}`);
                        resolve(null);
                    }
                });
            } else {
                console.log('Chrome storage not available');
                resolve(null);
            }
        });
    }


	/**
     * ✅ loadFromTabSpecificLocalCache - 탭별 로컬 캐시 로드
     */
    loadFromTabSpecificLocalCache() {
        try {
            const cached = localStorage.getItem(this.localStorageKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.tabId === this.tabId) {
                    console.log(`✅ Config found in local cache for tab: ${this.tabId}`);
                    return parsed;
                } else {
                    console.log('⏭️ Ignoring config from different tab in local cache');
                }
            }
        } catch (e) {
            console.log(`❌ Local cache load error for tab ${this.tabId}:`, e);
        }
        return null;
    }

	/**
	 * ✅ loadFromUnifiedConfig - webinspector_config를 탭별로 수정
	 */
	loadFromUnifiedConfig() {
		return new Promise((resolve) => {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.get('webinspector_config', (result) => {
					if (chrome.runtime.lastError) {
						console.log('Unified config load error:', chrome.runtime.lastError);
						resolve(null);
						return;
					}
					
					const unifiedConfig = result.webinspector_config;
					if (unifiedConfig) {
						console.log(`✅ Loaded unified config as base for tab: ${this.tabId}`);
						
						// ✅ 통합 config를 현재 탭용으로 변환
						const tabConfig = {
							...unifiedConfig,
							tabId: this.tabId, // ✅ 현재 탭 ID로 설정
							timestamp: Date.now(),
							source: 'unified_base'
						};
						
						// ✅ 탭별 저장소에 백업
						try {
							localStorage.setItem(this.localStorageKey, JSON.stringify(tabConfig));
							console.log(`✅ Unified config backed up to tab cache: ${this.tabId}`);
						} catch (e) {
							console.log('Tab cache backup error:', e);
						}
						
						resolve(tabConfig);
					} else {
						console.log('❌ No unified config found in Chrome storage');
						resolve(null);
					}
				});
			} else {
				console.log('Chrome storage not available for unified config');
				resolve(null);
			}
		});
	}

	/**
	 * ✅ loadUnifiedConfig - webinspector_config를 탭별 인식으로 수정
	 */
	loadUnifiedConfig() {
		try {
			// ✅ 1. 탭별 캐시 우선 확인
			const tabCached = localStorage.getItem(this.localStorageKey);
			if (tabCached) {
				const parsed = JSON.parse(tabCached);
				if (parsed.tabId === this.tabId) {
					console.log(`✅ Unified config loaded from tab cache: ${this.tabId}`);
					return parsed;
				}
			}
			
			// ✅ 2. 레거시 통합 캐시 확인
			const legacyCached = localStorage.getItem('webinspector_config');
			if (legacyCached) {
				const parsedConfig = JSON.parse(legacyCached);
				console.log('✅ Unified config loaded from legacy cache');
				
				// ✅ 현재 탭의 config인지 확인 (tabId가 없으면 모든 탭에서 사용됨)
				if (!parsedConfig.tabId || parsedConfig.tabId === this.tabId) {
					return parsedConfig;
				} else {
					console.log('⏭️ Ignoring unified config from different tab');
					return null;
				}
			}
		} catch (e) {
			console.log('❌ Unified config parse error:', e);
		}
		return null;
	}


    // ✅ 추가: 캐시된 옵션 로드 함수
    /**
     * ✅ loadCachedOptions - 탭별로 수정
     */
    loadCachedOptions() {
        try {
            // ✅ 탭별 옵션 시도
            const tabCached = localStorage.getItem(this.localStorageKey);
            if (tabCached) {
                const parsed = JSON.parse(tabCached);
                if (parsed.tabId === this.tabId && parsed.options) {
                    console.log(`✅ Loaded options from tab cache for tab: ${this.tabId}`);
                    return parsed.options;
                }
            }

            // ✅ 레거시 통합 옵션 시도
            const legacyCached = localStorage.getItem('webinspector_options');
            if (legacyCached) {
                const parsedOptions = JSON.parse(legacyCached);
                console.log('✅ Loaded options from legacy cache');
                return parsedOptions;
            }
        } catch (e) {
            console.log('❌ Cache load error:', e);
        }

        // ✅ Chrome Storage에서도 시도
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(null, function(items) {
                if (items && items.webinspector_config && items.webinspector_config.options) {
                    try {
                        localStorage.setItem('webinspector_options', JSON.stringify(items.webinspector_config.options));
                    } catch (e) {
                        console.log('Cache save error:', e);
                    }
                }
            });
        }

        return null;
    }


	/**
	 * ✅ getDefaultOptions - webinspector_config 의존성 제거
	 */
	getDefaultOptions() {
		console.log('🔄 Loading default options with tab-specific priority...');

		// ✅ 1. 탭별 config에서 옵션 로드
		const tabConfig = this.loadFromTabSpecificLocalCache();
		if (tabConfig && tabConfig.options) {
			console.log(`✅ Loaded options from tab config for tab: ${this.tabId}`);
			return tabConfig.options;
		}

		// ✅ 2. 통합 config에서 옵션 로드 (webinspector_config)
		const unifiedConfig = this.loadUnifiedConfig();
		if (unifiedConfig && unifiedConfig.options) {
			console.log('✅ Loaded options from unified config (webinspector_config)');
			return unifiedConfig.options;
		}

		// ✅ 3. 레거시 개별 옵션 캐시에서 로드
		try {
			const cached = localStorage.getItem('webinspector_options');
			if (cached) {
				const parsedOptions = JSON.parse(cached);
				console.log('✅ Loaded options from legacy individual cache');
				return parsedOptions;
			}
		} catch (e) {
			console.log('❌ Legacy options cache parse error:', e);
		}

		// ✅ 4. background.js의 기본값 사용 (WEB_INSPECTOR_DEFAULT_OPTIONS)
		console.log('🔄 Using background default options (WEB_INSPECTOR_DEFAULT_OPTIONS)');
		return this.getEmptyOptions();
	}



	/**
	 * ✅ getMeasurementModes - webinspector_config 의존성 제거
	 */
	getMeasurementModes() {
		// ✅ 1. 탭별 config에서 로드
		const tabConfig = this.loadFromTabSpecificLocalCache();
		if (tabConfig && tabConfig.measurementModes) {
			console.log(`✅ Loaded measurement modes from tab config for tab: ${this.tabId}`);
			return tabConfig.measurementModes;
		}

		// ✅ 2. 통합 config에서 로드 (webinspector_config)
		const unifiedConfig = this.loadUnifiedConfig();
		if (unifiedConfig && unifiedConfig.measurementModes) {
			console.log('✅ Loaded measurement modes from unified config (webinspector_config)');
			return unifiedConfig.measurementModes;
		}

		// ✅ 3. 레거시 개별 캐시에서 로드
		const cached = localStorage.getItem('webinspector_measurement_modes');
		if (cached) {
			try {
				const parsedModes = JSON.parse(cached);
				console.log('✅ Loaded measurement modes from legacy individual cache');
				return parsedModes;
			} catch (e) {
				console.log('❌ Legacy measurement modes cache parse error:', e);
			}
		}
		
		// ✅ 4. 하드코딩된 기본값 사용
		console.log('🔄 Using hardcoded measurement modes');
		return {
			VIEWPORT: 'viewport',
			ELEMENT: 'element', 
			MARGIN: 'margin',
			PADDING: 'padding',
			CHILDREN: 'children',
			SIZE: 'size',
			BORDER_RADIUS: 'borderRadius',
			IFRAMEOVERLAY: 'iframeOverlay'
		};
	}


	/**
	 * ✅ getZIndexLayers - webinspector_config 의존성 제거
	 */
	getZIndexLayers() {
		// ✅ 1. 탭별 config에서 로드
		const tabConfig = this.loadFromTabSpecificLocalCache();
		if (tabConfig && tabConfig.zIndexLayers) {
			console.log(`✅ Loaded z-index layers from tab config for tab: ${this.tabId}`);
			return tabConfig.zIndexLayers;
		}

		// ✅ 2. 통합 config에서 로드 (webinspector_config)
		const unifiedConfig = this.loadUnifiedConfig();
		if (unifiedConfig && unifiedConfig.zIndexLayers) {
			console.log('✅ Loaded z-index layers from unified config (webinspector_config)');
			return unifiedConfig.zIndexLayers;
		}

		// ✅ 3. 레거시 개별 캐시에서 로드
		const cached = localStorage.getItem('webinspector_zindex_layers');
		if (cached) {
			try {
				const parsedLayers = JSON.parse(cached);
				console.log('✅ Loaded z-index layers from legacy individual cache');
				return parsedLayers;
			} catch (e) {
				console.log('❌ Legacy z-index layers cache parse error:', e);
			}
		}

		// ✅ 4. 하드코딩된 기본값 사용
		console.log('🔄 Using hardcoded z-index layers');
		return {
			HIGHLIGHT: 2147483631,
			SELECTED: 2147483631,
			CHILDREN: 2147483645,
			EXTERNAL: 2147483645,
			PADDING_HL: 2147483645,
			SIZE_LINE: 2147483645,
			PADDING_LINE: 2147483645,
			MARGIN_LINE: 2147483645,
			ELEMENT_LINE: 2147483645,
			VIEWPORT_LINE: 2147483645,
			TEXT: 2147483645,
			RADIAL_GUIDE: 2147483633,
			CENTER_MARKER: 2147483632,
			CONNECTED_TOOLTIP: 2147483636,
			BORDER_RADIUS: 2147483626,
			AD_CONTAINER: 2147483640,
			PANEL: 2147483647
		};
	}




	// ✅ [수정] Chrome Storage 저장 함수 단순화 (Tab별 관리)
	saveToChromeStorage(config) {
		if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
			console.log('Chrome storage not available');
			return;
		}

		const now = Date.now();
		
		if (now - this.lastStorageWriteTime < this.STORAGE_WRITE_COOLDOWN) {
			console.log('⏳ Storage write cooldown, skipping...');
			return;
		}

		this.isWritingToStorage = true;
		
		// ✅ 수정: 통합 키 대신 탭별 키 사용
		const storageObj = {};
		// storageObj['webinspector_config'] = config; // ❌ 기존 통합 키
		storageObj[this.storageKey] = config; // ✅ 탭별 키 사용
		
		chrome.storage.sync.set(storageObj, () => {
			this.lastStorageWriteTime = Date.now();
			this.isWritingToStorage = false;
			
			if (chrome.runtime.lastError) {
				console.log('Chrome storage save error:', chrome.runtime.lastError);
			} else {
				console.log(`✅ Config saved to Chrome storage for tab: ${this.tabId}`);
			}
			
			if (this.pendingStorageWrite) {
				const pendingConfig = this.pendingStorageWrite;
				this.pendingStorageWrite = null;
				setTimeout(() => this.saveToChromeStorage(pendingConfig), this.STORAGE_WRITE_COOLDOWN);
			}
		});
	}
	
	/**
	 * ✅ syncToChromeStorage - 탭별로 수정
	 */
	syncToChromeStorage(config) {
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
			// ✅ 탭별 키 사용
			const storageObj = {};
			storageObj[this.storageKey] = config;
			
			chrome.storage.sync.set(storageObj, () => {
				if (chrome.runtime.lastError) {
					console.log('Chrome storage sync error:', chrome.runtime.lastError);
				} else {
					console.log(`✅ Config synced to Chrome storage for tab: ${this.tabId}`);
				}
			});
		}
	}

    // ✅ Config 변경 사항 브로드캐스트 (독립된 Background.js만 알려줌.)
    broadcastConfigChange(config) {
		
        // ✅ 대신 현재 탭의 background script에만 알림 (필요한 경우)
		if (typeof chrome !== 'undefined' && chrome.runtime) {
			try {
				chrome.runtime.sendMessage({
					action: 'configUpdated',
					tabId: this.tabId, // ✅ 탭 ID 포함
					config: config
				});
			} catch (e) {
				console.log('Background message failed:', e);
			}
		}
    }

    // ✅ Chrome Storage에서 Config 로드
    // ✅ [수정] Chrome Storage에서 Config 로드 - 에러 처리 강화 (Tab별 관리)
	loadFromChromeStorage() {
		return new Promise((resolve) => {
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				// ✅ 수정: 통합 키 대신 탭별 키 사용
				// chrome.storage.sync.get('webinspector_config', (result) => { // ❌ 기존
				chrome.storage.sync.get(this.storageKey, (result) => { // ✅ 수정
					if (chrome.runtime.lastError) {
						console.log('Chrome storage load error:', chrome.runtime.lastError);
						resolve(null);
						return;
					}
					
					// ✅ 수정: 통합 키 대신 탭별 키 접근
					// const config = result.webinspector_config; // ❌ 기존
					const config = result[this.storageKey]; // ✅ 수정
					
					if (config && config.tabId === this.tabId) {
						try {
							localStorage.setItem(this.localStorageKey, JSON.stringify(config));
						} catch (e) {
							console.log('Cache backup error:', e);
						}
						resolve(config);
					} else {
						console.log(`❌ No config in Chrome storage for tab: ${this.tabId}`);
						resolve(null);
					}
				});
			} else {
				console.log('Chrome storage not available');
				resolve(null);
			}
		});
	}

    /**
	 * ✅ loadFromLocalCache - webinspector_config를 탭별로 수정
	 */
	loadFromLocalCache() {
		try {
			// ✅ 1. 먼저 탭별 캐시 확인
			const tabCached = localStorage.getItem(this.localStorageKey);
			if (tabCached) {
				const parsed = JSON.parse(tabCached);
				if (parsed.tabId === this.tabId) {
					console.log(`✅ Config loaded from tab-specific local cache: ${this.tabId}`);
					return parsed;
				} else {
					console.log('⏭️ Ignoring tab cache from different tab');
				}
			}
			
			// ✅ 2. 레거시 통합 캐시 확인 (하위 호환성)
			const legacyCached = localStorage.getItem('webinspector_config');
			if (legacyCached) {
				const parsedConfig = JSON.parse(legacyCached);
				console.log('✅ Config loaded from legacy unified cache');
				
				// ✅ 레거시 config에 현재 탭 ID 추가
				parsedConfig.tabId = this.tabId;
				console.log('✅ Added current tab ID to legacy config');
				
				return parsedConfig;
			}
		} catch (e) {
			console.log('❌ Local cache load error:', e);
		}
		return null;
	}

	

	//=======================================================================================================>>> Tab 별 관리 END
	

	

    // ✅ 기본값으로 초기화 (getSafeDefaultValue + initializeSafeState 통합)
    initializeWithDefaults() {
		// 기본 옵션 설정
		this.options = this.getDefaultOptions();
		
		// 기본 측정 모드 설정
		this.MEASUREMENT_MODES = this.getMeasurementModes();
		this.Z_INDEX_LAYERS = this.getZIndexLayers();
		
		// ✅ 활성 모드 기본값 명시적 설정
		this.initializeActiveModes();

		// Advanced Features 기본값
		this.advancedFeatures = {
			highZIndexAdjustment: true,
			iframeOverlay: false,
			isolation: true
		};

		// Depth 레벨 기본값
		this.currentDepthLevel = 2;
		this.maxDepthLevel = 5;
		
		// 룰러 버튼 표시 상태
		this.showButtonPanel = true;
		
		console.log('✅ Default config initialized with active modes:', Array.from(this.activeModes));
	}

    // ✅ 옵션 검증 및 수정 (validateEssentialOptions 통합)
    validateAndFixOptions() {
        const essentialColors = [
            'viewportColor', 'elementColor', 'marginColor', 'paddingColor',
            'childrenColor', 'sizeColor', 'borderRadiusColor',
            'highlightColor', 'selectedColor', 'crosshairColor', 'rulerColor'
        ];

        const defaults = this.getDefaultOptions();
        
        essentialColors.forEach(key => {
            if (!this.options[key] || this.options[key] === 'undefined' || this.options[key] === 'null') {
                this.options[key] = defaults[key];
                console.log('⚠️ Fixed missing option:', key, '=', defaults[key]);
            }
        });

        // 필수 옵션 기본값 보장
        if (!this.options.panelPosition) {
            this.options.panelPosition = 'right';
        }
        if (!this.options.defaultDepthLevel) {
            this.options.defaultDepthLevel = 2;
        }
        if (!this.options.crosshairStyle) {
            this.options.crosshairStyle = 'partial';
        }
    }

    // ==================== CONFIG 적용 시스템 ====================

    // ✅ Config 적용 (applyConfig + updateActiveModes 통합)
    // ✅ Config 적용 시 활성 모드 복원 강화
    // ✅ [수정] Config 적용 함수 - 활성 모드 완전히 보존
	// ✅ [수정] Config 적용 - 활성 모드 완전 보존
	// ✅ [수정] Config 적용 - iframe-overlay 상태 동기화 제거
	// ✅ [추가] Config 적용 시 Depth 값 복원 강화
	applyConfig(config) {
		if (!config) {
			console.log('❌ No config to apply');
			return;
		}

		console.log('🎯 Applying config to state manager');

		// ✅ 활성 모드 적용
		if (config.activeModes && Array.isArray(config.activeModes)) {
			this.activeModes = new Set(config.activeModes);
		}

		// ✅ [핵심 수정] Depth 값 우선 적용
		if (config.currentDepthLevel !== undefined) {
			this.currentDepthLevel = config.currentDepthLevel;
			console.log('✅ Depth level restored from config:', this.currentDepthLevel);
		}

		// ✅ 옵션 적용
		if (config.options && Object.keys(config.options).length > 0) {
			const defaultOptions = this.getDefaultOptions();
			const { rulerColor, rulerOpacity, rulerUnit, rulerStep, ...cleanOptions } = config.options;
			this.options = { ...defaultOptions, ...cleanOptions };
		}

		// ✅ 플로팅 패널 표시 상태
		if (config.showButtonPanel !== undefined) {
			this.showButtonPanel = config.showButtonPanel;
		}

		// ✅ Advanced Features 적용
		if (config.advancedFeatures) {
			const { iframeOverlay, ...otherAdvancedFeatures } = config.advancedFeatures;
			this.advancedFeatures = { ...this.advancedFeatures, ...otherAdvancedFeatures };
		}

		console.log('✅ Config applied - Depth:', this.currentDepthLevel, 'Active modes:', Array.from(this.activeModes));
	}

	// ✅ Advanced Features와 activeModes 동기화
    syncAdvancedFeaturesToActiveModes() {
        // iframeOverlay 동기화
        if (this.advancedFeatures.iframeOverlay) {
            this.activeModes.add('iframeOverlay');
        } else {
            this.activeModes.delete('iframeOverlay');
        }
        console.log('✅ Advanced features synced to active modes:', Array.from(this.activeModes));
    }


    // ✅ 옵션 업데이트 (updateOptions 통합)
    /**
	 * ✅ [수정] updateOptions - 내부 함수 호출 업데이트
	 */
	updateOptions(newOptions) {
		console.log('⚙️ Updating options:', Object.keys(newOptions));

		// ✅ 옵션 병합
		const baseOptions = this.options || this.getDefaultOptions();
		this.options = { ...baseOptions, ...newOptions };

		// ✅ Depth 레벨 업데이트
		this.currentDepthLevel = this.options.defaultDepthLevel || 2;

		// ✅ 특정 옵션에 대한 즉시 실행 로직
		this._handleSpecialOptions(newOptions); // ✅ _handleSpecialOptions로 변경

		// ✅ Config 저장
		this.saveConfig();

		// ✅ UI 업데이트
		this.updateAllUI();

		console.log('✅ Options updated successfully');
		return this.options;
	}

    // ✅ 특정 옵션 즉시 처리
    handleSpecialOptions(newOptions) {
        
        // 패널 위치 변경 알림
        if (newOptions.panelPosition && this.uiManager) {
            console.log('🔄 Panel position changed:', newOptions.panelPosition);
            this.uiManager.handlePanelPositionChange(newOptions.panelPosition);
        }

        // 십자선 스타일 변경
        if (newOptions.crosshairStyle && this.uiManager) {
            this.uiManager.updateCrosshairStyle();
        }
    }

    
    // ✅ 전체 UI 업데이트 (immediatelyUpdateUI + forceColorUpdate 통합)
    updateAllUI() {
        console.log('🎨 Updating all UI components');

        // 1. 십자선 스타일 업데이트
        if (this.uiManager) {
            this.uiManager.updateCrosshairStyle();
        }

        
        // 3. 룰러 버튼 색상 업데이트
        if (this.toggleManager && this.toggleManager.updateAllRulerButtons) {
            this.toggleManager.updateAllRulerButtons();
        }

        // 4. 측정 요소 강제 재생성
        this.forceElementDistanceUpdate = true;
        if (this.elementAnalyzer) {
            this.elementAnalyzer.removeCurrentMeasurements();
            this.elementAnalyzer.removeExternalElementHighlights();
            
            if (this.selectedElement || this.currentElement) {
                setTimeout(() => {
                    if (this.elementAnalyzer.updateMeasurements) {
                        this.elementAnalyzer.updateMeasurements();
                    }
                }, 100);
            }
        }

        // 5. 패널 위치 업데이트
        if (this.uiManager) {
            this.uiManager.updatePanelPosition();
        }

        console.log('✅ All UI components updated');
    }

    // ==================== 공개 메서드들 ====================

    // ✅ 활성화 시 호출 (기존 loadOptionsOnActivation 대체)
    // ✅ 활성화 시 호출 - 활성 모드 초기화 보장
    loadOptionsOnActivation() {
        console.log('🔄 Loading options on activation...');
        return this.loadConfig().then(() => {
            this.initializeActiveModesOnActivation();
        });
    }

    /// ✅ 활성 모드 활성화 시 초기화
    // ✅ [수정] 활성화 시 활성 모드 초기화 - 저장된 값 보존
	initializeActiveModesOnActivation() {
		console.log('🔄 Initializing active modes on activation...');
		
		// ✅ 저장된 활성 모드가 없을 때만 iframeOverlay 기본값 처리
		if (this.activeModes.size === 0) {
			if (this.options.enableIframeOverlay) {
				this.activeModes.add('iframeOverlay');
				this.advancedFeatures.iframeOverlay = true;
				console.log('✅ iframeOverlay added to active modes from options');
			} else {
				this.activeModes.delete('iframeOverlay');
				this.advancedFeatures.iframeOverlay = false;
				console.log('✅ iframeOverlay removed from active modes from options');
			}
		}
		
		console.log('✅ Active modes after activation:', Array.from(this.activeModes));
	}


	// ✅ 측정 모드 토글 시 저장 보장
    // ✅ [수정] 측정 모드 토글 - 즉시 저장
	// ✅ [수정] 측정 모드 토글 - iframe-overlay 통합 처리
	saveToggleMeasurementMode(mode) {
		if (!this.activeModes) {
			this.activeModes = new Set();
		}

		const wasActive = this.activeModes.has(mode);
		
		if (wasActive) {
			this.activeModes.delete(mode);
			console.log(`🔴 Mode deactivated: ${mode}`);
		} else {
			this.activeModes.add(mode);
			console.log(`🟢 Mode activated: ${mode}`);
		}

		// ✅ [수정] iframe-overlay 특별 처리 제거 - 통합 관리
		// iframe-overlay는 이제 activeModes에서만 관리됨
		// advancedFeatures.iframeOverlay는 더 이상 사용하지 않음

		// ✅ [핵심] 즉시 저장
		this.saveConfig();

		console.log(`✅ ${mode} mode toggled. Active modes:`, Array.from(this.activeModes));
		return !wasActive;
	}


    // ✅ Advanced Features 토글
    toggleAdvancedFeature(feature) {
        if (this.advancedFeatures.hasOwnProperty(feature)) {
            this.advancedFeatures[feature] = !this.advancedFeatures[feature];
            
            // ✅ options 객체와 동기화
            this.syncAdvancedFeaturesToOptions();
            
            // ✅ 통합 저장 시스템 사용
            this.saveConfig();
            
            console.log(`✅ ${feature} toggled to:`, this.advancedFeatures[feature]);
            return this.advancedFeatures[feature];
        }
        return false;
    }

    // ✅ Advanced Features를 options와 동기화
    syncAdvancedFeaturesToOptions() {
        this.options.enableHighZIndexAdjustment = this.advancedFeatures.highZIndexAdjustment;
        this.options.enableIframeOverlay = this.advancedFeatures.iframeOverlay;
        this.options.enableIsolation = this.advancedFeatures.isolation;
        
        console.log('🔄 Synced advanced features to options:', this.advancedFeatures);
    }

    // ✅ 룰러 버튼 영역 토글
    toggleRulerButtons() {
        this.showButtonPanel = !this.showButtonPanel;
        
        // ✅ 통합 저장 시스템 사용
        this.saveConfig();
        
        console.log('✅ Ruler buttons toggled to:', this.showButtonPanel);
        return this.showButtonPanel;
    }

    // ✅ Depth 레벨 업데이트
    // ✅ [수정] Depth 레벨 업데이트 - 저장 로직 강화
	updateDepthLevel(level) {
		const newLevel = Math.max(1, Math.min(this.maxDepthLevel, level));
		
		// ✅ 값이 실제로 변경되었는지 확인
		if (this.currentDepthLevel === newLevel) {
			console.log(`⏭️ Depth level unchanged: ${newLevel}`);
			return newLevel;
		}
		
		console.log(`🔄 Updating depth level: ${this.currentDepthLevel} → ${newLevel}`);
		this.currentDepthLevel = newLevel;
		
		// ✅ options에도 동기화
		this.options.defaultDepthLevel = newLevel;
		this.options.currentDepthLevel = newLevel;
		
		// ✅ [핵심] 즉시 저장 (activeModes와 동일한 방식)
		this.saveConfig();
		
		// ✅ UI 업데이트
		if (this.elementAnalyzer && (this.selectedElement || this.currentElement)) {
			setTimeout(() => {
				this.elementAnalyzer.updateMeasurements();
			}, 50);
		}
		
		return this.currentDepthLevel;
	}


    // ==================== 기존 유틸리티 메서드들 유지 ====================

    // ✅ [추가] 빈 옵션 제공 함수
	getEmptyOptions() {
		console.log('🔄 Providing empty options structure');
		return {
			// 기본값 구조만 제공, 실제 값은 activate 시 로드
			highlightColor: '#03d100ff',
			selectedColor: '#FF9800',
			rulerColor: '#f8f9fa',
			crosshairColor: '#0F9D58',
			viewportColor: '#6A0DAD',
			elementColor: '#007800',
			marginColor: '#FF5252',
			paddingColor: '#4285F4',
			childrenColor: '#41433a',
			sizeColor: '#0026ffff',
			borderRadiusColor: '#ff00c8',
			iframeOverlayColor: '#ff6b35',
			crosshairStyle: 'partial',
			panelPosition: 'right',
			defaultDepthLevel: 2,
			enableIframeOverlay: false, // ✅ 기본값 false
			enableHighZIndexAdjustment: true,
			enableIsolation: true,
			// ✅ 필수 옵션들 추가

			// 선 두께 옵션
			viewportLineThickness: 1,
			elementLineThickness: 0.5,
			marginLineThickness: 0.5,
			paddingLineThickness: 0.5,
			childrenLineThickness: 0.5,
			sizeLineThickness: 0.5,

			// 투명도 옵션
			viewportLineOpacity: 0.8,
			elementLineOpacity: 0.8,
			marginLineOpacity: 0.8,
			paddingLineOpacity: 0.8,
			childrenLineOpacity: 0.8,
			sizeLineOpacity: 0.8,
			childrenBgOpacity: 0.2,

			tooltipFontSize: '12px',
			mtooltipFontSize: '10px',
			ptooltipFontSize: '10px',
			defaultMeasurementMode: 'element',
			decimalPlaces: 0,
			formatHtml: true
		};
	}

    // ✅ [추가] 빈 측정 모드 제공
	getEmptyMeasurementModes() {
		return {
			VIEWPORT: 'viewport',
			ELEMENT: 'element',
			MARGIN: 'margin', 
			PADDING: 'padding',
			CHILDREN: 'children',
			SIZE: 'size',
			BORDER_RADIUS: 'borderRadius',
			IFRAMEOVERLAY: 'iframeOverlay'
		};
	}

    // ✅ [추가] 빈 Z-Index 레이어 제공
	getEmptyZIndexLayers() {
		return {
			HIGHLIGHT: 2147483631,
			SELECTED: 2147483631,
			CHILDREN: 2147483645,
			EXTERNAL: 2147483645,
			PADDING_HL: 2147483645,
			SIZE_LINE: 2147483645,
			PADDING_LINE: 2147483645,
			MARGIN_LINE: 2147483645,
			ELEMENT_LINE: 2147483645,
			VIEWPORT_LINE: 2147483645,
			TEXT: 2147483645,
			RADIAL_GUIDE: 2147483633,
			CENTER_MARKER: 2147483632,
			BORDER_RADIUS: 2147483626,
			AD_CONTAINER: 2147483645,
			PANEL: 2147483647
		};
	}

    
	
	//#########################################################################################################

	// 리소스 추적
	trackEventListener(target, event, handler, options) {
		target.addEventListener(event, handler, options);
		this.webInspectorResources.eventListeners.push({ target, event, handler, options });
	}

	trackElement(element) {
		this.webInspectorResources.elements.push(element);
		return element;
	}

	trackInterval(intervalId) {
		if (!this.webInspectorResources.intervals) {
			this.webInspectorResources.intervals = [];
		}
		this.webInspectorResources.intervals.push(intervalId);
		return intervalId;
	}

	trackTimeout(timeoutId) {
		if (!this.webInspectorResources.timeouts) {
			this.webInspectorResources.timeouts = [];
		}
		this.webInspectorResources.timeouts.push(timeoutId);
		return timeoutId;
	}

	trackObserver(observer) {
		this.webInspectorResources.observers.push(observer);
		return observer;
	}

	trackRaf(rafId) {
		if (!this.webInspectorResources.rafIds) {
			this.webInspectorResources.rafIds = [];
		}
		this.webInspectorResources.rafIds.push(rafId);
		return rafId;
	}

	// 상태 리셋
	reset() {
		console.log('🔄 Resetting StateManager...');

		this.isInspectorActive = false;
		this.isMeasuringActive = false;
		this.currentElement = null;
		this.selectedElement = null;
		this.highlightElement = null;
		this.selectedElementHighlight = null;
		this.measureElements = [];
		this.crosshair = null;
		this.coordTooltip = null;
		this.elementInfo = null;
		this.currentDepthLevel = 2;
		this.textPositions = [];
		this.verticalTooltipPositions = [];
		this.horizontalTooltipPositions = [];
		this.guideLinePositions = [];

		this.temporarilyAdjustedElements = [];
		this.iframeOverlays = [];
		this.externalElementHighlights = [];
		this.outlineHighlights = [];

		this.externalElementCache.clear();
		this.lastMeasuredElement = null;
		this.lastMeasurementTime = 0;
		this.isDownloading = false;

		this.activeModes = new Set([
			this.MEASUREMENT_MODES.VIEWPORT,
			this.MEASUREMENT_MODES.ELEMENT,
			this.MEASUREMENT_MODES.MARGIN,
			this.MEASUREMENT_MODES.PADDING,
			this.MEASUREMENT_MODES.CHILDREN,
			this.MEASUREMENT_MODES.SIZE,
			this.MEASUREMENT_MODES.BORDER_RADIUS,
			this.MEASUREMENT_MODES.IFRAMEOVERLAY
		]);

		this.InspectorState.reset();

		console.log('✅ StateManager reset complete');
	}


	// 리소스 정리
	cleanupResources() {
		console.log('🧹 Cleaning up resources...');

		// 인터벌 정리
		if (this.webInspectorResources.intervals) {
			this.webInspectorResources.intervals.forEach(intervalId => {
				try {
					clearInterval(intervalId);
				} catch (error) {
					console.log('Error clearing interval:', error);
				}
			});
			this.webInspectorResources.intervals = [];
		}

		// 타임아웃 정리
		if (this.webInspectorResources.timeouts) {
			this.webInspectorResources.timeouts.forEach(timeoutId => {
				try {
					clearTimeout(timeoutId);
				} catch (error) {
					console.log('Error clearing timeout:', error);
				}
			});
			this.webInspectorResources.timeouts = [];
		}

		// RAF 정리
		if (this.webInspectorResources.rafIds) {
			this.webInspectorResources.rafIds.forEach(rafId => {
				try {
					cancelAnimationFrame(rafId);
				} catch (error) {
					console.log('Error clearing RAF:', error);
				}
			});
			this.webInspectorResources.rafIds = [];
		}

		// Observer 정리
		if (this.webInspectorResources.observers) {
			this.webInspectorResources.observers.forEach(observer => {
				try {
					observer.disconnect();
				} catch (error) {
					console.log('Error disconnecting observer:', error);
				}
			});
			this.webInspectorResources.observers = [];
		}

		// 이벤트 리스너 정리
		if (this.webInspectorResources.eventListeners) {
			this.webInspectorResources.eventListeners.forEach(({ target, event, handler, options }) => {
				try {
					target.removeEventListener(event, handler, options);
				} catch (error) {
					console.log('Error removing event listener:', error);
				}
			});
			this.webInspectorResources.eventListeners = [];
		}

		// 요소 정리
		if (this.webInspectorResources.elements) {
			this.webInspectorResources.elements.forEach(element => {
				try {
					if (element && element.parentNode) {
						element.parentNode.removeChild(element);
					}
				} catch (error) {
					console.log('Error removing element:', error);
				}
			});
			this.webInspectorResources.elements = [];
		}
		
		console.log('✅ Resource cleanup complete');
	}

	

    // ... 나머지 기존 메서드들 (cleanup, reset, trackXXX 등) 유지
}