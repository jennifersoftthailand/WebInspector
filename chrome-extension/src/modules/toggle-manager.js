/*
toggle-manager.js
버튼 클릭 
    → toggleMeasurementMode() 호출 
    → StateManager 상태 변경 
    → 즉시 저장 
    → UI 업데이트
*/
class ToggleManager {

	constructor(stateManager) {
        console.log('🔧 ToggleManager initializing...');
        
        this.state = null;
        this.isInitialized = false;
        this.initializationAttempts = 0;
        this.dragSystemInitialized = false;
        
        // ✅ 드래그 관련 변수들
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panelStartX = 0;
        this.panelStartY = 0;
        
        // ✅ 티스토리 방어 관련 변수들
        this.tistoryDefenseInterval = null;
        this.tistoryDefenseObserver = null;
        this.boundDocumentMouseDown = null;
        this.boundDocumentMouseMove = null;
        this.boundDocumentMouseUp = null;
        
        this.toggleContent = null;
        this.state = stateManager;
        this.buttonContainer = null;
        
        // ✅ StateManager 검증
        if (!this.state) {
            console.error('❌ ToggleManager: StateManager is undefined');
            this.isInitialized = false;
            return;
        }
        
        // ✅ 초기화 시도 (에러 처리)
        try {
            this.initializeAfterConfigLoad();
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ ToggleManager initialization failed:', error);
            this.isInitialized = false;
        }
    }

	//########################################################################################################################>>> START
	/**
	 * ✅ [통합] completeCleanup - 모든 컴포넌트에서 통일
	 */
	completeCleanup() {
		console.log('🧹 ToggleManager: Complete cleanup...');
		
		// ✅ 모든 이벤트 리스너 제거
		this.removeAllEventListeners();
		
		// ✅ 모든 스타일 제거
		this.removeAllStyles();
		
		// ✅ 버튼 컨테이너 제거
		if (this.buttonContainer?.parentNode) {
			try {
				this.buttonContainer.parentNode.removeChild(this.buttonContainer);
				console.log('✅ Button container removed');
			} catch (error) {
				console.log('Error removing button container:', error);
			}
			this.buttonContainer = null;
		}
		
		// ✅ StateManager 참조 제거 (안전하게)
		this.state = null;
		this.isInitialized = false;
		this.dragSystemInitialized = false;
		
		console.log('✅ ToggleManager completely cleaned up');
	}

	/**
	 * ✅ [내부] _handleDocumentMouseDown - private 함수로 변경
	 */
	_handleDocumentMouseDown(e) {
		// ✅ 버튼 패널에서 발생한 이벤트인지 확인 (입력 요소 제외)
		if (!e.target.closest || !e.target.closest('#floating-button-panel')) return;
		if (this.isInputElement(e.target)) {
			console.log('⏭️ Input element clicked, skipping drag');
			return;
		}
		
		console.log('💥 DOCUMENT CAPTURED BUTTON PANEL MOUSEDOWN (FRESH)');
		
		// ✅ 즉시 모든 제어권 확보
		this.isDragging = true;
		this.dragStartX = e.clientX;
		this.dragStartY = e.clientY;
		
		const rect = this.buttonContainer.getBoundingClientRect();
		this.panelStartX = rect.left;
		this.panelStartY = rect.top;
		
		// ✅ 문서 레벨 이벤트 리스너 등록 (캡처 단계)
		document.addEventListener('mousemove', this.boundDocumentMouseMove, true);
		document.addEventListener('mouseup', this.boundDocumentMouseUp, true);
		
		// ✅ 시각적 피드백
		this.buttonContainer.style.cursor = 'grabbing';
		
		// ✅ 모든 이벤트 전파 완전 차단
		e.stopPropagation();
		e.stopImmediatePropagation();
		e.preventDefault();
		return false;
	}

	/**
	 * ✅ [내부] _handleDocumentMouseMove - private 함수로 변경
	 */
	_handleDocumentMouseMove(e) {
		if (!this.isDragging) return;
		
		// ✅ 모든 이벤트 전파 즉시 차단
		e.stopPropagation();
		e.stopImmediatePropagation();
		
		const deltaX = e.clientX - this.dragStartX;
		const deltaY = e.clientY - this.dragStartY;
		
		const newX = this.panelStartX + deltaX;
		const newY = this.panelStartY + deltaY;
		
		// ✅ 화면 경계
		const maxX = window.innerWidth - this.buttonContainer.offsetWidth;
		const maxY = window.innerHeight - this.buttonContainer.offsetHeight;
		
		this.buttonContainer.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
		this.buttonContainer.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
		this.buttonContainer.style.right = 'auto';
		this.buttonContainer.style.bottom = 'auto';
		
		// ✅ 추가 보험: 모든 기본 동작 방지
		e.preventDefault();
		return false;
	}

	/**
	 * ✅ [내부] _handleDocumentMouseUp - private 함수로 변경
	 */
	_handleDocumentMouseUp(e) {
		if (!this.isDragging) return;
		
		console.log('💥 BUTTON PANEL DRAG ENDED (FRESH)');
		this.isDragging = false;
		this.buttonContainer.style.cursor = 'move';
		
		// ✅ 이벤트 리스너 제거
		document.removeEventListener('mousemove', this.boundDocumentMouseMove, true);
		document.removeEventListener('mouseup', this.boundDocumentMouseUp, true);
		
		this.saveButtonPanelPosition(this.buttonContainer);
		
		// ✅ 모든 전파 차단
		e.stopPropagation();
		e.stopImmediatePropagation();
		e.preventDefault();
		return false;
	}
	
	//########################################################################################################################>>> END

    /**
     * ✅ 드래그 시스템 완전 제거
     */
    removeDragSystem() {
        console.log('🧹 Removing drag system...');
        
        // ✅ 모든 드래그 관련 이벤트 리스너 제거
        try {
            if (this.boundDocumentMouseDown) {
                document.removeEventListener('mousedown', this.boundDocumentMouseDown);
            }
            if (this.boundDocumentMouseMove) {
                document.removeEventListener('mousemove', this.boundDocumentMouseMove);
            }
            if (this.boundDocumentMouseUp) {
                document.removeEventListener('mouseup', this.boundDocumentMouseUp);
            }

        } catch (e) {
            // 무시
        }
        
        // ✅ 바운드 함수 참조 제거
        this.boundDocumentMouseDown = null;
        this.boundDocumentMouseMove = null;
        this.boundDocumentMouseUp = null;
        
        this.dragSystemInitialized = false;
        console.log('✅ Drag system removed');
    }

    /**
     * ✅ 티스토리 방어 시스템 정리
     */
    cleanupTistoryDefense() {
        console.log('🧹 Cleaning up Tistory defense...');
        
        // ✅ 인터벌 제거
        if (this.tistoryDefenseInterval) {
            clearInterval(this.tistoryDefenseInterval);
            this.tistoryDefenseInterval = null;
        }
        
        // ✅ 옵저버 제거
        if (this.tistoryDefenseObserver) {
            this.tistoryDefenseObserver.disconnect();
            this.tistoryDefenseObserver = null;
        }
        
        console.log('✅ Tistory defense cleaned up');
    }

	/**
     * ✅ 모든 이벤트 리스너 제거 - 강화된 버전
     */
    removeAllEventListeners() {
        console.log('🔇 Removing all event listeners...');
        
        // ✅ 버튼 컨테이너의 모든 이벤트 리스너 제거
        if (this.buttonContainer) {
            const buttons = this.buttonContainer.querySelectorAll('button');
            buttons.forEach(button => {
                const newButton = button.cloneNode(true);
                if (button.parentNode) {
                    button.parentNode.replaceChild(newButton, button);
                }
            });
        }
        
        // ✅ 티스토리 방어 시스템 정리
        this.cleanupTistoryDefense();
        
        // ✅ 드래그 시스템 정리
        this.removeDragSystem();
        
        console.log('✅ ToggleManager event listeners removed');
    }

    /**
     * ✅ 모든 스타일 제거
     */
    removeAllStyles() {
        console.log('🎨 Removing all styles...');
        
        const styleIds = [
            'tistory-button-panel-bypass',
            'tistory-drag-atomic',
            'nuclear-drag-styles',
            'web-inspector-panel-styles'
        ];
        
        styleIds.forEach(styleId => {
            const style = document.getElementById(styleId);
            if (style?.parentNode) {
                try {
                    style.parentNode.removeChild(style);
                    console.log(`✅ Removed style: ${styleId}`);
                } catch (error) {
                    console.log(`Error removing style ${styleId}:`, error);
                }
            }
        });
        
        console.log('✅ All styles removed');
    }

    /**
     * ✅ ToggleManager 완전 정리 - 드래그 시스템 완전 제거
     */
    completeCleanup() {
        console.log('🧹 ToggleManager: Complete cleanup...');
        
        // ✅ 모든 이벤트 리스너 제거
        this.removeAllEventListeners();
        
        // ✅ 모든 스타일 제거
        this.removeAllStyles();
        
        // ✅ 버튼 컨테이너 제거
        if (this.buttonContainer?.parentNode) {
            try {
                this.buttonContainer.parentNode.removeChild(this.buttonContainer);
                console.log('✅ Button container removed');
            } catch (error) {
                console.log('Error removing button container:', error);
            }
            this.buttonContainer = null;
        }
        
        // ✅ StateManager 참조 제거 (안전하게)
        this.state = null;
        this.isInitialized = false;
        this.dragSystemInitialized = false;
        
        console.log('✅ ToggleManager completely cleaned up');
    }

    
	/**
     * ✅ Config 로드 후 초기화 함수 - 재초기화 보장
     */
    initializeAfterConfigLoad() {
        // ✅ 이미 초기화되었으면 정리 후 재초기화
        if (this.isInitialized && this.buttonContainer) {
            console.log('🔄 ToggleManager already initialized, cleaning up for reinitialization...');
            this.completeCleanup();
        }

        

        if (this.state.options && Object.keys(this.state.options).length > 0) {
            console.log('✅ Config loaded, creating toggle button container');
            this.createToggleButtonContainer();
            this.setupOptionChangeListeners();
            this.isInitialized = true;
        }
    }


	// ✅ [단순화] StateManager에서 Depth 상태 동기화 함수
	syncDepthFromState() {
		const currentDepth = this.state.currentDepthLevel || 2;
		this.updateDepthSliderValue(currentDepth);
	}

	//----------------------------------------------------------------------------------------------->>> TAB 관리 (UI 요소에 탭 ID 표시) START
	// ✅ [수정] createToggleButtonContainer - Config 값 사용 보장 + 티스토리 드래그 방지 우회
	/**
     * ✅ createToggleButtonContainer - 완전한 재생성 보장
     */
    createToggleButtonContainer() {
        console.log('🎯 Creating toggle button container with fresh drag system...');
    
        // ✅ 기존 버튼 컨테이너 완전 제거
        if (this.buttonContainer?.parentNode) {
            this.buttonContainer.parentNode.removeChild(this.buttonContainer);
            this.buttonContainer = null;
        }
        
        // ✅ 새로운 버튼 컨테이너 생성
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.className = 'ruler-button-container';
        this.buttonContainer.id = 'floating-button-panel';
        
        // ✅ 탭 ID를 데이터 속성으로 저장
        this.buttonContainer.setAttribute('data-tab-id', this.state.tabId);
        this.buttonContainer.setAttribute('data-inspector-element', 'true');
        
        this.buttonContainer.style.cssText = `
			cursor: move !important;
            position: fixed;
            top: 10px;
            left: 50px;
            z-index: ${this.state.Z_INDEX_LAYERS.PANEL};
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            gap: 4px;
            cursor: move;
            user-select: none;
        `;
        
        // ✅ 새로운 드래그 시스템 설정 (기존 시스템 완전 제거 후)
        this.removeDragSystem();
        this.setupTistoryDragSystem();
        
        // ✅ 왼쪽 영역: 측정 모드 버튼들
        const buttonGrid = document.createElement('div');
        buttonGrid.style.cssText = `
			cursor: move !important;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 3px;
            margin-bottom: 8px;
        `;
        
        // 측정 모드 버튼들 생성
        this.createMeasurementModeButtons(buttonGrid);
        
        // ✅ 하단 컨트롤 영역
        const controlSection = document.createElement('div');
        controlSection.style.cssText = `
			cursor: move !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            padding-top: 8px;
            border-top: 1px solid #dee2e6;
        `;
        
        // ✅ Depth 컨트롤
        const depthControl = this.createCompactDepthControl();
        controlSection.appendChild(depthControl);
        
        
        this.buttonContainer.appendChild(buttonGrid);
        this.buttonContainer.appendChild(controlSection);
        
        document.body.appendChild(this.buttonContainer);
        
        this.loadPanelPosition();
        
        // ✅ 티스토리 방어 시스템 시작 (새로운 인스턴스)
        this.startTistoryDefenseBypass();
        
        // ✅ [추가] 초기 버튼 상태 강제 동기화
        setTimeout(() => {
            this.updateAllRulerButtonsFromState();
            console.log('✅ Initial button state synchronization completed');
        }, 300);
        
        console.log('✅ Toggle button container created with fresh drag system');
    }

	
    /**
	 * ✅ [수정] setupTistoryDragSystem - 전용 강제 드래그 시스템, 내부 함수 호출 업데이트
	 */
	setupTistoryDragSystem() {
		console.log('💥 Setting up FRESH TISTORY drag system...');
		
		const dragHandle = this.buttonContainer;
		if (!dragHandle) return;
		
		// ✅ 기존 드래그 시스템 완전 제거
		this.removeDragSystem();
		
		// ✅ 바운드 함수 생성 (메모리 누수 방지)
		this.boundDocumentMouseDown = this._handleDocumentMouseDown.bind(this); // ✅ _handleDocumentMouseDown으로 변경
		this.boundDocumentMouseMove = this._handleDocumentMouseMove.bind(this); // ✅ _handleDocumentMouseMove으로 변경
		this.boundDocumentMouseUp = this._handleDocumentMouseUp.bind(this);     // ✅ _handleDocumentMouseUp으로 변경
		
		// ✅ 새로운 드래그 시스템 설정
		document.addEventListener('mousedown', this.boundDocumentMouseDown, true);
		
		this.dragSystemInitialized = true;
		console.log('✅ Fresh Tistory drag system ready');
	}


	//----------------------------------------------------------------------------------------------->>> TAB 관리 (UI 요소에 탭 ID 표시) END


	// ✅ 추가: 일반 룰러 버튼 생성 함수
	createRulerButton(icon, title, onClick) {
		const button = document.createElement('button');
		button.innerHTML = icon;
		button.setAttribute('title', title);
		
		button.style.cssText = `
			width: 24px;
			height: 24px;
			border: 1px solid #ddd;
			border-radius: 3px;
			background: #ffffff;
			color: #333;
			font-size: 11px;
			cursor: pointer;
			transition: all 0.2s ease;
			display: flex;
			align-items: center;
			justify-content: center;
		`;

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			onClick();
		});

		return button;
	}
	

	// ✅ [신규] 버튼 패널 위치 저장 함수
	/**
     * ✅ 버튼 패널 위치 저장 - 안전하게 수정
     */
    saveButtonPanelPosition(panel) {
        // ✅ state 존재 여부 확인
        if (!this.state) {
            console.log('⚠️ Cannot save panel position: state not available');
            return;
        }

        const position = {
            top: panel.style.top,
            left: panel.style.left
        };
        
        console.log('💾 Saving button panel position:', position);
        
        try {
            // ✅ 안전한 localStorage 접근
            localStorage.setItem('webinspector_button_panel_position', JSON.stringify(position));
        } catch (e) {
            console.log('Button panel position save error:', e);
        }
        
        // ✅ Chrome Storage에도 저장 (안전하게)
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            try {
                chrome.storage.sync.set({
                    webinspector_button_panel_position: position
                });
            } catch (e) {
                console.log('Chrome storage save error:', e);
            }
        }
    }


	// ✅ [신규] 티스토리 방어 실시간 무력화
	/**
     * ✅ 티스토리 방어 실시간 무력화 - 재초기화 보장
     */
    /**
     * ✅ 티스토리 방어 실시간 무력화 - 재초기화 보장
     */
    startTistoryDefenseBypass() {
        console.log('💥 Starting FRESH Tistory defense bypass...');
        
        // ✅ 기존 방어 시스템 정리
        this.cleanupTistoryDefense();
        
        // ✅ 1. 지속적인 스타일 재주입 (새로운 인터벌)
        this.tistoryDefenseInterval = setInterval(() => {
            this.injectTistoryBypassStyles();
        }, 300);
        
        // ✅ 2. MutationObserver로 티스토리의 스타일 변경 감지 및 무력화 (새로운 옵저버)
        this.tistoryDefenseObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    // 버튼 패널 스타일이 변경되면 즉시 복원
                    if (this.isButtonPanelRelated(mutation.target)) {
                        this.restoreButtonPanelStyles();
                    }
                }
            });
        });
        
        this.tistoryDefenseObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
        });
        
        console.log('✅ Fresh Tistory defense bypass started');
    }


	// ✅ [신규] 티스토리 우회 스타일 주입
	/**
     * ✅ 티스토리 우회 스타일 주입
     */
    injectTistoryBypassStyles() {
        const styleId = 'tistory-button-panel-bypass';
        let style = document.getElementById(styleId);
        
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }
        
        style.textContent = `
            /* 티스토리의 모든 시도 무력화 */
            #floating-button-panel {
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -webkit-user-drag: auto !important;
                pointer-events: auto !important;
                cursor: move !important;
            }
            
            #floating-button-panel *:not(button):not(input):not(select):not(textarea) {
                user-select: auto !important;
                -webkit-user-select: auto !important;
                -webkit-user-drag: auto !important;
                pointer-events: auto !important;
            }
            
            /* 버튼 패널 내부 버튼들은 정상 작동 */
            #floating-button-panel button {
                cursor: pointer !important;
                pointer-events: auto !important;
            }
            
            /* 티스토리의 body 레벨 제한 무력화 */
            body {
                user-select: auto !important;
                -webkit-user-select: auto !important;
            }
        `;
    }

	// ✅ [신규] 버튼 패널 관련 요소 확인
	/**
     * ✅ 버튼 패널 관련 요소 확인
     */
    isButtonPanelRelated(element) {
        if (!element) return false;
        
        if (element === this.buttonContainer) return true;
        if (element.id === 'floating-button-panel') return true;
        
        if (element.closest) {
            return !!element.closest('#floating-button-panel');
        }
        
        let current = element;
        while (current && current !== document.documentElement) {
            if (current.id === 'floating-button-panel') {
                return true;
            }
            current = current.parentElement;
        }
        
        return false;
    }

	// ✅ [신규] 버튼 패널 스타일 복원
	/**
     * ✅ 버튼 패널 스타일 복원
     */
    restoreButtonPanelStyles() {
        if (!this.buttonContainer) return;
        
        this.buttonContainer.style.userSelect = 'auto';
        this.buttonContainer.style.webkitUserSelect = 'auto';
        this.buttonContainer.style.pointerEvents = 'auto';
        this.buttonContainer.style.cursor = 'move';
    }

	// ✅ [추가] 입력 요소인지 확인하는 함수
	/**
     * ✅ 입력 요소인지 확인하는 함수
     */
    isInputElement(element) {
        if (!element) return false;
        
        const inputTags = ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'];
        const inputTypes = ['range', 'button', 'submit', 'checkbox', 'radio'];
        
        if (inputTags.includes(element.tagName)) {
            return true;
        }
        
        if (element.tagName === 'INPUT' && inputTypes.includes(element.type)) {
            return true;
        }
        
        if (element.classList.contains('ruler-mode-btn') || 
            element.getAttribute('data-mode') !== null) {
            return true;
        }
        
        return false;
    }

	

	// ✅ [수정] 패널 위치 불러오기 함수 - 티스토리 대응
	/**
     * ✅ 버튼 패널 위치 불러오기 - 안전하게 수정
     */
    loadPanelPosition() {
        const panel = document.getElementById('floating-button-panel');
        if (!panel) return;
        
        let savedPosition = null;
        
        try {
            const localPosition = localStorage.getItem('webinspector_button_panel_position');
            if (localPosition) {
                savedPosition = JSON.parse(localPosition);
            }
        } catch (e) {
            console.log('Local storage position load error:', e);
        }
        
        if (!savedPosition && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            // ✅ 안전한 Chrome Storage 접근
            try {
                chrome.storage.sync.get('webinspector_button_panel_position', (result) => {
                    if (result.webinspector_button_panel_position) {
                        this.applyButtonPanelPosition(result.webinspector_button_panel_position);
                    }
                });
            } catch (e) {
                console.log('Chrome storage position load error:', e);
            }
        } else if (savedPosition) {
            this.applyButtonPanelPosition(savedPosition);
        }
    }


	// ✅ [신규] 버튼 패널 위치 적용 함수
	/**
     * ✅ 버튼 패널 위치 적용 - 안전하게 수정
     */
    applyButtonPanelPosition(position) {
        const panel = document.getElementById('floating-button-panel');
        if (!panel || !position) return;
        
        console.log('🔄 Applying saved button panel position:', position);
        
        if (position.top && position.left) {
            panel.style.top = position.top;
            panel.style.left = position.left;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }
    }

	// ✅ [수정] 컴팩트 Depth 컨트롤 생성 함수 - 저장 로직 추가
	// ✅ [재작성] 컴팩트 Depth 컨트롤 - 강력한 저장 및 동기화
	// ✅ [단순화] 컴팩트 Depth 컨트롤 - activeModes와 동일한 저장 방식 사용
	createCompactDepthControl() {
		const container = document.createElement('div');
		container.className = 'depth-control-container';
		container.style.cssText = `
			cursor: grabbing !important;
			display: flex;
			align-items: center;
			gap: 3px;
			font-size: 10px;
		`;

		const depthLabel = document.createElement('span');
		depthLabel.textContent = 'D:';
		depthLabel.style.cssText = `
			cursor: grabbing !important;
			font-weight: 600;
			font-size: 9px;
			color: #333;
		`;

		const depthSlider = document.createElement('input');
		depthSlider.type = 'range';
		depthSlider.min = '1';
		depthSlider.max = this.state.maxDepthLevel;
		depthSlider.className = 'depth-slider';
		
		// ✅ StateManager의 currentDepthLevel 사용
		const initialDepth = this.state.currentDepthLevel || 2;
		depthSlider.value = initialDepth.toString();
		
		depthSlider.style.cssText = `
			cursor: grabbing !important;
			width: 40px;
			height: 2px;
			background: #ddd;
			outline: none;
		`;

		const depthValue = document.createElement('span');
		depthValue.className = 'depth-value';
		depthValue.textContent = initialDepth.toString();
		depthValue.style.cssText = `
			cursor: grabbing !important;
			min-width: 10px;
			text-align: center;
			font-weight: 600;
			font-size: 9px;
			color: #333;
		`;

		// ✅ [단순화] input 이벤트로만 처리 (실시간 UI 업데이트)
		depthSlider.addEventListener('input', (e) => {
			const level = parseInt(e.target.value) || 2;
			depthValue.textContent = level.toString();
		});

		// ✅ [핵심 수정] change 이벤트에서만 저장 (activeModes와 동일)
		depthSlider.addEventListener('change', (e) => {
			const level = parseInt(e.target.value) || 2;
			
			// ✅ StateManager를 통한 업데이트 (저장 포함)
			this.state.updateDepthLevel(level);
			
			console.log(`✅ Depth level changed and saved: ${level}`);
			e.stopPropagation();
		});

		container.appendChild(depthLabel);
		container.appendChild(depthSlider);
		container.appendChild(depthValue);

		return container;
	}

	// ✅ 추가: 측정 모드 버튼들 생성 함수
	createMeasurementModeButtons(container) {
		const modes = [
			{ key: 'viewport', label: 'A', title: 'Viewport (Ctrl+Alt+A)', color: '#6A0DAD' },
			{ key: 'element', label: 'S', title: 'Element (Ctrl+Alt+S)', color: '#8BC34A' },
			{ key: 'margin', label: 'Z', title: 'Margin (Ctrl+Alt+Z)', color: '#FFD700' },
			{ key: 'padding', label: 'X', title: 'Padding (Ctrl+Alt+X)', color: '#FF5252' },
			{ key: 'children', label: 'W', title: 'Children (Ctrl+Alt+W)', color: '#9C27B0' },
			{ key: 'size', label: 'D', title: 'Size (Ctrl+Alt+D)', color: '#ff0000' },
			{ key: 'borderRadius', label: 'E', title: 'Border Radius (Ctrl+Alt+E)', color: '#ff00c8' },
			{ key: 'iframeOverlay', label: 'F', title: 'Iframe Overlay (Ctrl+Alt+F)', color: '#ff6b35' }
		];

		modes.forEach(mode => {
			const button = this.createMeasurementModeButton(mode);
			container.appendChild(button);
		});
	}

	// ✅ [수정] 측정 모드 버튼 생성 - 직접적인 상태 변경 로직 추가
	createMeasurementModeButton(mode) {
		const button = document.createElement('button');
		button.className = 'ruler-mode-btn';
		button.setAttribute('data-mode', mode.key);
		button.setAttribute('title', mode.title);
		button.textContent = mode.label;

		// ✅ 기존 스타일 설정
		button.style.width = '24px';
		button.style.height = '24px';
		button.style.border = '1px solid #ddd';
		button.style.borderRadius = '3px';
		button.style.background = '#ffffff';
		button.style.color = '#333';
		button.style.fontSize = '11px';
		button.style.fontWeight = '500';
		button.style.cursor = 'pointer';
		button.style.transition = 'all 0.2s ease';
		button.style.display = 'flex';
		button.style.alignItems = 'center';
		button.style.justifyContent = 'center';

		// ✅ 초기 스타일 적용
		this.updateRulerButtonStyle(button, mode, this.state.activeModes.has(mode.key));

		// ✅ [수정] 클릭 이벤트 - 직접적인 상태 변경 로직
		button.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();

			console.log(`🔧 Button clicked: ${mode.key}`);

			// ✅ [핵심 수정] 직접적인 상태 변경 로직 호출
			this.toggleMeasurementModeDirect(mode.key);

			// ✅ 즉시 UI 업데이트
			setTimeout(() => {
				const verifiedState = this.state.activeModes.has(mode.key);
				this.updateRulerButtonStyle(button, mode, verifiedState);
				console.log(`✅ ${mode.key} mode toggled to: ${verifiedState}`);
			}, 50);
		});

		return button;
	}

	// ✅ [추가] 직접적인 측정 모드 토글 함수
	toggleMeasurementModeDirect(mode) {
		console.log(`🎯 ToggleManager direct toggling mode: ${mode}`);
		
		// ✅ StateManager에 모든 로직 위임
		const newState = this.state.saveToggleMeasurementMode(mode);
		
		// ✅ UI 업데이트
		this.updateAllRulerButtonsFromState();
		
		// ✅ UI Manager에도 알림
		if (this.state.uiManager) {
			this.state.uiManager.handleMeasurementModeChange(mode, newState);
		}
		
		return newState;
	}

	// ✅ [수정] 현재 모드 색상 가져오기 - Config 값 우선 사용
	getCurrentModeColor(modeKey) {
		console.log(`🎨 [DEBUG] Getting color for mode: ${modeKey}`);

		const optionKeyMap = {
			'viewport': 'viewportColor',
			'element': 'elementColor',
			'margin': 'marginColor',
			'padding': 'paddingColor',
			'children': 'childrenColor',
			'size': 'sizeColor',
			'borderRadius': 'borderRadiusColor',
			'iframeOverlay': 'iframeOverlayColor'
		};

		const optionKey = optionKeyMap[modeKey];
		console.log(`🎨 [DEBUG] Mapped option key: ${optionKey} for mode: ${modeKey}`);

		if (!optionKey) {
			console.warn(`⚠️ Unknown mode key: ${modeKey}`);
			return '#4285F4';
		}

		// ✅ [수정] StateManager의 options에서 직접 색상 가져오기 (Config 값 우선)
		const currentColor = this.state.options[optionKey];
		
		// ✅ 기본 색상 폴백 (모든 모드 동일)
		const defaultColors = {
			'viewport': '#6A0DAD',
			'element': '#8BC34A',
			'margin': '#FFD700',
			'padding': '#FF5252',
			'children': '#9C27B0',
			'size': '#ff0000',
			'borderRadius': '#ff00c8',
			'iframeOverlay': '#ff6b35'
		};

		// ✅ [수정] Config 값이 있으면 사용, 없으면 기본값
		const finalColor = currentColor || defaultColors[modeKey] || '#4285F4';
		console.log(`🎨 Final color for ${modeKey}: ${finalColor} (from config: ${!!currentColor})`);

		return finalColor;
	}

	// ✅ [수정] 룰러 버튼 상태 업데이트 - ruler-system.js와 동일한 방식
	updateRulerButtonStyle(button, mode, isActive) {
		const currentColor = this.getCurrentModeColor(mode.key);
		const textColor = this.state.util.getContrastColor(currentColor);

		if (isActive) {
			button.style.backgroundColor = `${currentColor}30`;
			button.style.border = `2px solid ${currentColor}`;
			button.style.color = textColor;
			button.style.fontWeight = '600';
			button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
		} else {
			button.style.backgroundColor = '#ffffff';
			button.style.border = '1px solid #ddd';
			button.style.color = '#666';
			button.style.fontWeight = '500';
			button.style.boxShadow = 'none';
		}

		button.setAttribute('data-active', isActive);
	}

	//---------------------------------------------------------------------------------------------------------->>> TAB 관리 START
	// ✅ [수정] 옵션 변경 리스너 설정 - 강화된 동기화
	// ✅ [추가] Config 변경 시 Depth 동기화 강화
	// ✅ [단순화] 옵션 변경 리스너 설정 (tab별 저장)
	// toggle-manager.js - setupOptionChangeListeners 안전하게 수정
	setupOptionChangeListeners() {
		// ✅ state 존재 여부 확인
		if (!this.state) {
			console.log('⚠️ ToggleManager: State not ready, skipping option change listeners');
			return;
		}

		// ✅ storage 변경 감지 - 안전한 접근
		if (chrome && chrome.storage && chrome.storage.onChanged) {
			chrome.storage.onChanged.addListener((changes, namespace) => {
				if (namespace === 'sync') {
					// ✅ state 다시 확인
					if (!this.state) {
						console.log('⚠️ ToggleManager: State not available during storage change');
						return;
					}

					// ✅ 탭별 config 변경만 처리
					if (changes[this.state.storageKey]) {
						console.log('🔄 Tab-specific config change detected in toggle manager');
						
						const newConfig = changes[this.state.storageKey].newValue;
						
						// ✅ 현재 탭의 config인지 확인
						if (newConfig && newConfig.tabId === this.state.tabId) {
							setTimeout(() => {
								// ✅ 안전한 메서드 호출
								if (this.updateAllRulerButtonsFromState) {
									this.updateAllRulerButtonsFromState();
								}
								if (this.syncDepthFromState) {
									this.syncDepthFromState();
								}
								console.log('✅ Toggle manager updated from tab-specific config');
							}, 100);
						} else {
							console.log('⏭️ Ignoring config change from different tab');
						}
					}
					
					// ✅ 통합 config 변경은 무시
					if (changes.webinspector_config) {
						console.log('⏭️ Ignoring unified config change in toggle manager');
					}
				}
			});
		}

		// ✅ 초기 상태 설정 (안전하게)
		setTimeout(() => {
			if (this.state) {
				if (this.updateAllRulerButtonsFromState) {
					this.updateAllRulerButtonsFromState();
				}
				if (this.syncDepthFromState) {
					this.syncDepthFromState();
				}
				console.log('✅ Toggle manager initial state synchronized');
			} else {
				console.log('⚠️ ToggleManager: State not available for initial sync');
			}
		}, 500);
	}

	//---------------------------------------------------------------------------------------------------------->>> TAB 관리 END

	// ✅ [추가] 활성 모드와 config 동기화 함수
	syncActiveModesWithConfig() {
		if (!this.state || !this.state.activeModes) return;

		console.log('🔄 Syncing active modes with config...');

		const buttons = this.buttonContainer?.querySelectorAll('.ruler-mode-btn');
		if (!buttons) return;

		buttons.forEach(button => {
			const modeKey = button.getAttribute('data-mode');
			const isActiveInUI = button.getAttribute('data-active') === 'true';
			const isActiveInState = this.state.activeModes.has(modeKey);

			if (isActiveInUI !== isActiveInState) {
				console.log(`🔄 Correcting ${modeKey} state mismatch: UI=${isActiveInUI}, State=${isActiveInState}`);
				this.updateRulerButtonState(button, modeKey, isActiveInState);
			}
		});
	}

	// ✅ [추가] 버튼 상태 검증 및 동기화 함수
	verifyAndSyncButtonStates() {
		console.log('🔍 Verifying and syncing button states...');

		const buttons = this.buttonContainer?.querySelectorAll('.ruler-mode-btn');
		if (!buttons) return;

		buttons.forEach(button => {
			const modeKey = button.getAttribute('data-mode');
			const currentState = this.state.activeModes.has(modeKey);
			const displayedState = button.getAttribute('data-active') === 'true';

			if (currentState !== displayedState) {
				console.log(`🔄 Correcting ${modeKey} display: ${displayedState} -> ${currentState}`);
				this.updateRulerButtonState(button, modeKey, currentState);
			}
		});
	}

	// ✅ [수정] 모든 룰러 버튼 상태 업데이트 - StateManager 신뢰
	updateAllRulerButtonsFromState() {
		console.log('🔄 Updating all ruler buttons from state manager');

		const buttons = this.buttonContainer?.querySelectorAll('.ruler-mode-btn');
		if (!buttons) return;

		buttons.forEach(button => {
			const modeKey = button.getAttribute('data-mode');
			const isActive = this.state.activeModes.has(modeKey);

		// ✅ StateManager의 상태를 절대적으로 신뢰
			this.updateRulerButtonState(button, modeKey, isActive);
		});

		console.log('✅ Ruler buttons updated from state');
	}

	// ✅ 룰러 버튼 상태 업데이트 함수
	updateRulerButtonState(button, modeKey, isActive) {
		const currentColor = this.getCurrentModeColor(modeKey);
		const textColor = this.state.util.getContrastColor(currentColor);

		if (isActive) {
			button.style.backgroundColor = `${currentColor}30`;
			button.style.border = `2px solid ${currentColor}`;
			button.style.color = textColor;
			button.style.fontWeight = '600';
			button.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
		} else {
			button.style.backgroundColor = '#ffffff';
			button.style.border = '1px solid #ddd';
			button.style.color = '#666';
			button.style.fontWeight = '500';
			button.style.boxShadow = 'none';
		}

		button.setAttribute('data-active', isActive);
	}

	// ✅ [수정] Depth 슬라이더 값 업데이트 함수 - 강화된 동기화
	// ✅ [단순화] Depth 슬라이더 값 업데이트 함수
	updateDepthSliderValue(level) {
		const depthSlider = this.buttonContainer?.querySelector('.depth-slider');
		const depthValue = this.buttonContainer?.querySelector('.depth-value');
		
		const currentLevel = level || this.state.currentDepthLevel || 2;
		
		if (depthSlider && depthSlider.value !== currentLevel.toString()) {
			depthSlider.value = currentLevel.toString();
		}
		if (depthValue) {
			depthValue.textContent = currentLevel.toString();
		}
	}

	// ✅ 추가: 룰러 버튼 영역 가시성 토글
	toggleButtonPanelVisibility() {
		console.log('📍 Toggling floating button panel visibility');
		
		const panel = document.getElementById('floating-button-panel');
		if (panel) {
			const isVisible = panel.style.display !== 'none';
			panel.style.display = isVisible ? 'none' : 'flex';
			
			this.state.showButtonPanel = !isVisible;
			this.state.saveConfig();
		}
	}
}