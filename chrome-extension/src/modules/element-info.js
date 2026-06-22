// element-info.js - 완전한 드래그 지원 패널 클래스
class ElementInfo {
    constructor(stateManager) {
        console.log('🔧 Panel initializing...');
        
        if (!stateManager) {
            throw new Error('Panel requires StateManager instance');
        }
        
        this.stateManager = stateManager;
        this.panelElement = null;
        this.isInitialized = false;
        

		//---------------------------------------------------------------------------------
        // ✅ 드래그 관련 변수
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panelStartX = 0;
        this.panelStartY = 0;
		
		// ✅ 전역 상태 관리 객체
		this.dragState = {
			isCycleActive: false,     // 사이클 활성화 여부
			wasDragged: false,        // 드래그 발생 여부
			dragStartX: 0,           // 드래그 시작 X
			dragStartY: 0,           // 드래그 시작 Y
			panelStartX: 0,          // 패널 시작 X
			panelStartY: 0           // 패널 시작 Y
		};

		// ✅ 높이 관리 관련 간단한 추가
        this.DEFAULT_HEIGHT = '800px';
        this.STORAGE_KEY = 'webinspector_panel_state';
		// ✅ 리사이즈 감지용
        this.isResizing = false;
        //---------------------------------------------------------------------------------
		// ✅ 마우스 커서 상태 관리 추가
        this.cursorStyleElement = null;
        this.isCursorHidden = false;
        this.cursorStyles = {
            hidden: `
                * {
                    cursor: crosshair !important;
                }
                .crosshair-part, .crosshair-dashed-part {
                    cursor: none !important;
                }
                body, html {
                    cursor: none !important;
                }
            `,
            normal: `
                /* 기본 커서 스타일 복원 */
                * {
                    cursor: grab !important;
                }
                .crosshair-part, .crosshair-dashed-part {
                    cursor: crosshair !important;
                }
                body, html {
                    cursor: grab !important;
                }
                #web-inspector-panel {
                    cursor: grab !important;
                }
                #panelDragHandle {
                    cursor: move !important;
                }
				.copy-btn, .copy-btn.large, .action-buttons {
					cursor: grab;
				}
            `
        };
		//---------------------------------------------------------------------------------
    }

	//########################################################################################################################>>> START
	/**
	 * ✅ [통합] completeCleanup - 모든 컴포넌트에서 통일
	 */
	completeCleanup() {
		console.log('🧹 Cleaning up panel completely...');
		console.log('🧹 Cleaning up panel completely...');
        
        // ✅ 패널 제거
        this.removePanel();
        
        // ✅ 스타일 제거
        const styles = document.getElementById('web-inspector-panel-styles');
        if (styles?.parentNode) {
            try {
                styles.parentNode.removeChild(styles);
                console.log('✅ Panel styles removed');
            } catch (error) {
                console.log('Error removing panel styles:', error);
            }
        }

        // ✅ 티스토리 방어 스타일 제거
        const tistoryStyles = ['nuclear-drag-styles', 'tistory-drag-atomic'];
        tistoryStyles.forEach(styleId => {
            const style = document.getElementById(styleId);
            if (style?.parentNode) {
                style.parentNode.removeChild(style);
            }
        });

        // ✅ 모든 상태 변수 초기화
        this.isInitialized = false;
        this.panelElement = null;
        this.stateManager = null;
        
        // ✅ 드래그 상태 완전 초기화
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.panelStartX = 0;
        this.panelStartY = 0;
        this.dragState = {
            isCycleActive: false,
            wasDragged: false,
            dragStartX: 0,
            dragStartY: 0,
            panelStartX: 0,
            panelStartY: 0
        };

        // ✅ 리사이즈 관련 변수 초기화
        this.isResizing = false;
        
        // ✅ 높이 관리 변수 초기화
        this.DEFAULT_HEIGHT = '800px';
        this.STORAGE_KEY = 'webinspector_panel_state';

        // ✅ 모든 이벤트 리스너 정리
        this.removeAllEventListeners();

		// 커서 스타일 제거
        this.restoreCursor();
        
        console.log('✅ Panel completely cleaned up');
	}

	/**
	 * ✅ [내부] _handleAccordionClick - private 함수로 변경
	 */
	_handleAccordionClick(e) {
		console.log('⏩ Accordion toggle >>>>>>>>>>>>>>>>>>> '+JSON.parse(e));
		
		// ✅ 드래그 중이면 아코디언 토글 방지
		if (this.isDragging) {
			console.log('⏩ Accordion toggle blocked (dragging)');
			return;
		}
		
		const header = e.currentTarget;
		const section = header.parentElement;
		const content = header.nextElementSibling;
		const icon = header.querySelector('.accordion-icon');

		const isActive = section.classList.contains('active');

		// 다른 모든 섹션 닫기
		this.panelElement.querySelectorAll('.accordion-section').forEach(otherSection => {
			if (otherSection !== section) {
				otherSection.classList.remove('active');
				const otherContent = otherSection.querySelector('.accordion-content');
				const otherIcon = otherSection.querySelector('.accordion-icon');

				if (otherContent) otherContent.classList.remove('active');
				if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
			}
		});

		// 현재 섹션 토글
		if (isActive) {
			section.classList.remove('active');
			if (content) content.classList.remove('active');
			if (icon) icon.style.transform = 'rotate(0deg)';
		} else {
			section.classList.add('active');
			if (content) content.classList.add('active');
			if (icon) icon.style.transform = 'rotate(180deg)';
		}

		// ✅ 아코디언 상태에 따라 패널 높이 자동 조정
		this.adjustPanelHeight();
		
		e.stopPropagation();
	}
	//########################################################################################################################>>> END

	
    /**
     * ✅ 모든 이벤트 리스너 제거
     */
    removeAllEventListeners() {
        // ✅ 문서 레벨 이벤트 리스너 제거
        try {
            document.removeEventListener('mousedown', this.tistoryDragHandler);
            document.removeEventListener('mousemove', this.tistoryDragMoveHandler);
            document.removeEventListener('mouseup', this.tistoryDragUpHandler);
			document.removeEventListener('mouseout', this.forceDefaultCursor);
        } catch (e) {}
        
        // ✅ 패널 내부 이벤트 리스너 제거
        if (this.panelElement) {
            const newPanel = this.panelElement.cloneNode(false);
            if (this.panelElement.parentNode) {
                this.panelElement.parentNode.replaceChild(newPanel, this.panelElement);
            }
        }
        
        console.log('✅ Panel event listeners removed');
    }
    
    /**
     * ✅ 패널 초기화 - 모든 구성 요소 설정
     */
    init() {
        console.log('🎯 Initializing panel with drag system...');
        
        // ✅ 패널 요소 찾기 또는 생성
        //this.panelElement = document.getElementById('web-inspector-panel') || this.findParentPanel();
        
        //if (!this.panelElement) {
            //console.error('❌ Panel element not found, creating new one...');
            this.createPanel();
        //}
        
        //if (!this.panelElement) {
            //console.error('❌ Panel element creation failed');
            //return;
        //}
        
        console.log('✅ Panel element found/created:', this.panelElement);
        
        
    }
    

	//------------------------------------------------------------------------------------------------->>> TAB 관리 (패널 생성 시 탭 ID 추가) START
    /**
	 * ✅ 패널 생성 - 리사이즈 지원 추가
	 */
	createPanel() {
		console.log('🎯 Creating panel with resize support...');
		
		// 기존 패널 제거
		this.removePanel();
		
		// ✅ 화면 높이의 70% 계산 (기본값)
		const screenHeight = window.innerHeight;
		const defaultHeight = Math.min(800, Math.max(500, screenHeight * 0.7)); // 70% 높이, 최소 500px, 최대 800px
		
		// 1. div 패널 생성
		this.stateManager.panelFrame = document.createElement('div');
		this.stateManager.panelFrame.id = 'web-inspector-panel';
		this.stateManager.panelFrame.setAttribute('data-inspector-panel', 'true');
		
		if (this.stateManager && this.stateManager.tabId) {
			this.stateManager.panelFrame.setAttribute('data-tab-id', this.stateManager.tabId);
		}
		
		this.stateManager.panelFrame.className = 'scroller-box very-short';
		this.stateManager.panelFrame.style.cssText = `
			position: fixed;
			top: 100px;
			left: 100px;
			min-width: 350px;
			max-width: 350px;
			height: ${defaultHeight}px !important; /* ✅ 화면 높이의 70%로 설정 */
			max-height: ${screenHeight * 0.9}px !important; /* ✅ 화면 높이의 90%를 최대값으로 */
			background: white;
			z-index: 2147483647;
			display: block;
			visibility: visible;
			overflow: hidden;
			font-family: Arial, sans-serif;
			font-size: 14px;
			resize: both !important; /* ✅ 리사이즈 활성화 */
			box-sizing: border-box;
			//border: 2px solid #2575fc;
		`;
		
		document.body.appendChild(this.stateManager.panelFrame);
		this.panelElement = this.stateManager.panelFrame;

		// 2. HTML 설정
		this.setPanelHTML();
		
		console.log('✅ Panel created with resize support, default height:', defaultHeight + 'px');
	}
	//------------------------------------------------------------------------------------------------->>> TAB 관리 (패널 생성 시 탭 ID 추가) END
    
	diagnosePanelIssues() {
		if (!this.panelElement) return;
		
		const panel = this.panelElement;
		const computed = window.getComputedStyle(panel);
		const bodyComputed = window.getComputedStyle(document.body);
		const htmlComputed = window.getComputedStyle(document.documentElement);
		
		console.log('🔍 PANEL DIAGNOSIS REPORT:');
		console.log('==========================');
		
		// 1. 패널 자체 스타일
		console.log('1. Panel Styles:');
		console.log('   - height:', computed.height);
		console.log('   - min-height:', computed.minHeight);
		console.log('   - max-height:', computed.maxHeight);
		console.log('   - overflow:', computed.overflow);
		console.log('   - resize:', computed.resize);
		console.log('   - box-sizing:', computed.boxSizing);
		
		// 2. 부모 환경
		console.log('2. Parent Environment:');
		console.log('   - body height:', bodyComputed.height);
		console.log('   - body overflow:', bodyComputed.overflow);
		console.log('   - html height:', htmlComputed.height);
		console.log('   - html overflow:', htmlComputed.overflow);
		
		// 3. 실제 크기 vs 설정 크기
		console.log('3. Actual vs Set Dimensions:');
		console.log('   - offsetHeight:', panel.offsetHeight);
		console.log('   - clientHeight:', panel.clientHeight);
		console.log('   - scrollHeight:', panel.scrollHeight);
		console.log('   - style.height:', panel.style.height);
		
		// 4. CSS 충돌 검사
		console.log('4. CSS Conflicts:');
		const allStyles = document.styleSheets;
		let conflictingRules = [];
		
		try {
			for (let sheet of allStyles) {
				try {
					const rules = sheet.cssRules || sheet.rules;
					for (let rule of rules) {
						if (rule.selectorText && 
							(rule.selectorText.includes('#web-inspector-panel') || 
							rule.selectorText.includes('[data-inspector-panel]'))) {
							conflictingRules.push(rule.cssText);
						}
					}
				} catch (e) {
					// CORS 문제로 접근 불가한 스타일시트
				}
			}
			console.log('   - External CSS rules affecting panel:', conflictingRules);
		} catch (e) {
			console.log('   - Cannot access external stylesheets due to CORS');
		}
	}
    
    /**
	 * ✅ 패널 HTML 구조 설정 - 타이밍 조정
	 */
	setPanelHTML() {
		console.log('🔄 Setting panel HTML with proper timing...');
		
		const panelHTML = `
			<div class="panel-container">
				<div class="panel-drag-handle" id="panelDragHandle" style="display: flex; justify-content: space-between; align-items: center; margin-bottom:6px">
					<B>Element Information</B>
					<div style="display: flex; align-items: right; gap: 8px;">
						<span style="font-size:14px;">Esc: ☁️/☀️</span>
						<span class="toggle-icon" id="toggleBtn" style="cursor: pointer;">▼</span>
					</div>
				</div>
				<div class="panel-content" id="panelContent">
					<!-- 기존 컨텐츠 동일하게 유지 -->
					<div class="info-section">
						<div class="info-grid">
							<!-- 1행: Tag와 ID -->
							<div class="info-item">
								<label>Tag:</label>
								<div class="value-container">
									<span id="info-tag">N/A</span>
									<button class="copy-btn" data-copy="info-tag"></button>
								</div>
							</div>
							<div class="info-item">
								<label>ID:</label>
								<div class="value-container">
									<span id="info-id">N/A</span>
									<button class="copy-btn" data-copy="info-id"></button>
								</div>
							</div>
							<!-- 2행: Classes (전체 너비 사용) -->
							<div class="info-item full-width">
								<label>Classes:</label>
								<div class="code-container">
									<pre id="info-classes">No element selected</pre>
									<button class="copy-btn" data-copy="info-classes"></button>
								</div>
							</div>
						</div>
					</div>

					<!-- 크기 정보 -->
					<div class="info-section">
						<h3>Dimensions</h3>
						<div class="info-grid dimensions-grid">
							<div class="info-item">
								<label>Width:</label>
								<div class="value-container">
									<span id="info-width">N/A</span>
									<button class="copy-btn" data-copy="info-width"></button>
								</div>
							</div>
							<div class="info-item">
								<label>Height:</label>
								<div class="value-container">
									<span id="info-height">N/A</span>
									<button class="copy-btn" data-copy="info-height"></button>
								</div>
							</div>
							<div class="info-item">
								<label>Position:</label>
								<div class="value-container">
									<span id="info-position">N/A</span>
									<button class="copy-btn" data-copy="info-position"></button>
								</div>
							</div>
						</div>
					</div>

					<!-- 여백 정보 -->
					<div class="info-section">
						<h3>Spacing</h3>
						<div class="info-grid">
							<div class="info-item">
								<label>Margin:</label>
								<div class="value-container">
									<span id="info-margin">N/A</span>
									<button class="copy-btn" data-copy="info-margin"></button>
								</div>
							</div>
							<div class="info-item">
								<label>Padding:</label>
								<div class="value-container">
									<span id="info-padding">N/A</span>
									<button class="copy-btn" data-copy="info-padding"></button>
								</div>
							</div>
						</div>
					</div>

				
					<!-- 타이포그래피 -->
					<div class="info-section">
						<div class="info-grid">
							<!-- 1행:size color -->
							<div class="info-item">
								<label>Size:</label>
								<div class="value-container">
									<span id="info-font-size">N/A</span>
									<button class="copy-btn" data-copy="info-font-size"></button>
								</div>
							</div>
							<div class="info-item">
								<label>Color:</label>
								<div class="value-container">
									<span id="info-color">N/A</span>
									<button class="copy-btn" data-copy="info-color"></button>
								</div>
							</div>
							<!-- 2행: Classes (전체 너비 사용) -->
							<div class="info-item full-width">
								<label>Font:</label>
								<div class="code-container">
									<pre id="info-font">No element selected</pre>
									<button class="copy-btn" data-copy="info-font"></button>
								</div>
							</div>
						</div>
					</div>


					<!-- 배경 정보 -->
					<div class="info-section">
						<h3>Background</h3>
						<div class="info-grid">
							<div class="info-item">
								<label>Color:</label>
								<div class="value-container">
									<span id="info-bg-color">N/A</span>
									<button class="copy-btn" data-copy="info-bg-color"></button>
								</div>
								<div class="value-subtext" id="info-bg-color-details"></div>
							</div>
							<div class="info-item">
								<label>Image:</label>
								<div class="code-container">
									<pre id="info-bg-image">No element selected</pre>
									<button class="copy-btn" data-copy="info-bg-image"></button>
								</div>
								<div class="value-subtext" id="info-bg-image-details"></div>
							</div>
						</div>
					</div>

					<!-- CSS & HTML -->
					<div class="info-section">
						<h3>CSS Code</h3>
						<div class="code-container">
							<pre id="info-css">No element selected</pre>
							<button class="copy-btn large" data-copy="info-css">Copy CSS</button>
						</div>
					</div>

					<div class="info-section">
						<h3>HTML Code</h3>
						<div class="code-container">
							<pre id="info-html">No element selected</pre>
							<button class="copy-btn large" data-copy="info-html">Copy HTML</button>
						</div>
					</div>

					<div class="action-buttons">
						<button id="download-html" class="action-btn">Download HTML</button>
					</div>
				</div>
			</div>
		`;
		
		// 1. 먼저 HTML 설정
		this.panelElement.innerHTML = panelHTML;
		
		// 2. 상태 복구 시스템 먼저 설정
		setTimeout(() => {
			console.log('⏰ Setting up position and height system...');
			this.setupEnhancedPositionSystem();
		}, 10);
		
		// 3. 잠시 후 스타일 주입 (DOM이 준비된 후)
		setTimeout(() => {
			console.log('⏰ Injecting styles after DOM ready...');
			this.injectPanelStyles();
		}, 20);

		// 4. 스크롤바 시스템 초기화 (스타일 적용 후)
		setTimeout(() => {
			console.log('⏰ Initializing scrollbar system...');
			this.initializeScrollbarSystem();
		}, 50);

		// 5. 나머지 시스템들
		setTimeout(() => {
			console.log('⏰ Setting up other systems...');
			this.setupTistoryDragSystem();
			this.initializePanelFunctions();
			this.initCursorSyncSystem();
			
			// ✅ 리사이즈 후 초기 높이 조정
			setTimeout(() => {
				this.adjustContentHeight();
			}, 200);
		}, 100);

		this.isInitialized = true;

		console.log('✅ Panel HTML set with resize integration');
	}

	/**
	 * ✅ 최종 패널 높이 설정
	 */
	finalizePanelHeight() {
		if (!this.panelElement) return;
		
		const panelContent = this.panelElement.querySelector('#panelContent');
		if (!panelContent) return;
		
		// 실제 컨텐츠 높이 측정
		const contentHeight = panelContent.scrollHeight;
		const containerHeight = panelContent.clientHeight;
		const panelHeight = this.panelElement.offsetHeight;
		
		console.log('📏 Final Height Check:');
		console.log('   - Content Height:', contentHeight);
		console.log('   - Container Height:', containerHeight);
		console.log('   - Panel Height:', panelHeight);
		
		// 불필요한 스크롤 공간이 있는지 확인
		if (contentHeight < containerHeight - 50) { // 50px 여유 공간
			console.log('🔧 Removing unnecessary scroll space');
			// 패널 높이를 컨텐츠에 맞게 조정
			const dragHandle = this.panelElement.querySelector('#panelDragHandle');
			const handleHeight = dragHandle ? dragHandle.offsetHeight : 25;
			const optimalHeight = contentHeight + handleHeight + 10; // 10px 여백
			
			if (optimalHeight < 800) { // 최대 높이 제한
				this.panelElement.style.height = optimalHeight + 'px';
				console.log('📏 Adjusted panel height to:', optimalHeight + 'px');
			}
		}
	}
    

	/**
	 * ✅ 패널 스타일 주입 - 리사이즈 핸들러 숨기기 스타일 추가
	 */
	injectPanelStyles() {
		console.log('🎨 Injecting panel styles with resize handle control...');
		
		// 기존 스타일 완전 제거
		const existingStyles = [
			'web-inspector-panel-styles',
			'nuclear-drag-styles', 
			'tistory-drag-atomic',
			'hidden-cursor-style'
		];
		
		existingStyles.forEach(id => {
			const style = document.getElementById(id);
			if (style && style.parentNode) {
				style.parentNode.removeChild(style);
			}
		});

		const style = document.createElement('style');
		style.id = 'web-inspector-panel-styles';
		style.textContent = `

			@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
			@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500&display=swap');

			/* 옵션 페이지 스타일 */
			/* ✅ 패널 전체 폰트 설정 */
			* {
				font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
			}

			.toggle-icon{
				cursor: pointer !important;
			}

			/* 🔥 핵심: 가장 강력한 스크롤바 시스템 */
			#web-inspector-panel {
				background: transparent !important;
				overflow: visible !important;
				resize: both !important; /* ✅ 리사이즈 강제 활성화 */
				min-width: 400px !important;
				max-width: 400px !important;
			}
			
			/* ✅ 패널이 닫혔을 때 리사이즈 핸들러 완전 숨김 - [신규 추가] */
			#web-inspector-panel.resize-disabled {
				resize: none !important;
				overflow: hidden !important;
			}
			
			#web-inspector-panel.resize-disabled::-webkit-resizer {
				display: none !important;
				visibility: hidden !important;
				opacity: 0 !important;
				width: 0 !important;
				height: 0 !important;
				border: none !important;
			}
			
			/* ✅ 닫힌 상태에서 스크롤바 완전 숨김 - [신규 추가] */
			#web-inspector-panel.resize-disabled .panel-content {
				overflow: hidden !important;
				overflow-y: hidden !important;
				overflow-x: hidden !important;
			}
			
			#web-inspector-panel.resize-disabled .panel-content::-webkit-scrollbar {
				display: none !important;
				width: 0 !important;
				height: 0 !important;
			}
			
			#web-inspector-panel.resize-disabled .panel-content {
				scrollbar-width: none !important;
				-ms-overflow-style: none !important;
			}
			
			/* ✅ 리사이즈 핸들러 스타일링 - 모든 브라우저 호환 */
			#web-inspector-panel {
				/* Firefox */
				resize: both !important;
				overflow: auto !important;
			}
			
			/* Webkit 브라우저 전용 리사이즈 핸들러 - 오리지널 사선 점선 형태 */
			#web-inspector-panel::-webkit-resizer {
				border: 2px solid #2575fc !important;
				border-width: 0 2px 2px 0 !important;
				background: transparent !important;
				width: 12px !important;
				height: 12px !important;
				opacity: 0.7 !important;
				transition: opacity 0.3s ease !important;
				cursor: nwse-resize !important;
				box-shadow: none !important;
			}

			#web-inspector-panel::-webkit-resizer:hover {
				opacity: 1 !important;
				border-color: #1a5fd6 !important;
			}
			
			/* ✅ 성능 최적화 */
			#web-inspector-panel {
				transform: translateZ(0); /* ✅ 하드웨어 가속 */
				will-change: transform; /* ✅ 변화 예고 */
				backface-visibility: hidden; /* ✅ 렌더링 최적화 */
				perspective: 1000px;
			}
			
			#web-inspector-panel.resizing {
				transition: none !important; /* ✅ 리사이즈 중에는 트랜지션 제거 */
			}
			
			#web-inspector-panel .panel-container {
				all: initial !important;
				display: flex !important;
				flex-direction: column !important;
				height: 100% !important;
				position: relative !important;
				overflow: visible !important;
			}

			/*******************************************************/

			#web-inspector-panel .panel-drag-handle {
				//border: 1px solid #324dffff !important;
				border: 0.2px solid #e0e0e0 !important;
				cursor: move !important;
				flex-shrink: 0 !important;
				height: 25px !important;
				display: flex !important;
				align-items: center !important;
				justify-content: space-between !important;
				padding: 0 15px !important;
				//background: linear-gradient(135deg, #f1f1f1 0%, #f1f1f1 100%) !important;
				background: white !important;
				color: #1e1e1e !important;
				box-sizing: border-box !important;
				position: sticky !important;
				top: 0 !important;
				z-index: 10 !important;

				background-image: 
					linear-gradient(45deg, rgba(76, 0, 255, 0.2) 25%, transparent 25%, transparent 50%, 
					rgba(0, 60, 255, 0.2) 50%, rgba(0, 51, 255, 0.2) 75%, transparent 75%, transparent) !important;
				background-size: 160px 170px !important;
				//border: none !important;
			}
			

			/* ✅ 패널 컨텐츠 - 리사이즈 시에도 적응 가능하도록 */
			#web-inspector-panel .panel-content {
				flex: 1 !important;
				overflow-y: auto !important;
				overflow-x: hidden !important;
				padding: 0px !important;
				display: block !important;
				position: relative !important;
				max-height: calc(100% - 25px) !important;
				scrollbar-width: none !important;
				background: transparent !important;
			}

			/* 🔥 웹킷 스크롤바 - 기존과 동일하게 유지 */
			#web-inspector-panel .panel-content::-webkit-scrollbar {
				width: 6px !important;
				height: 6px !important;
				background: transparent !important;
			}

			#web-inspector-panel .panel-content::-webkit-scrollbar-track {
				background: transparent !important;
				border-radius: 3px !important;
				margin: 2px !important;
				border: none !important;
			}

			#web-inspector-panel .panel-content::-webkit-scrollbar-thumb {
				background: rgba(255, 255, 255, 0) !important;
				border-radius: 3px !important;
				border: none !important;
				opacity: 0 !important;
				visibility: hidden !important;
				transition: all 0.5s ease-in-out !important;
			}

			/* ✅ 호버 시에만 표시 */
			#web-inspector-panel .panel-content:hover::-webkit-scrollbar-thumb {
				//background: rgba(0, 0, 0, 0.3) !important;
				background: rgba(255, 255, 255, 1) !important;
				opacity: 1 !important;
				visibility: visible !important;
				transition: opacity 0.2s ease !important;
			}

			#web-inspector-panel .panel-content:hover::-webkit-scrollbar-track {
				background: rgba(0, 0, 0, 0.05) !important;
			}

			/* ✅ 호버 아웃 시 2초 페이드아웃 */
			#web-inspector-panel .panel-content:not(:hover)::-webkit-scrollbar-thumb {
				background: rgba(0, 0, 0, 0.0) !important;
				opacity: 0 !important;
				visibility: hidden !important;
				transition: opacity 2s ease, background 2s ease !important;
			}

			/* 🔥 Firefox 스크롤바 */
			#web-inspector-panel .panel-content {
				scrollbar-width: none !important;
				scrollbar-color: rgba(0,0,0,0) transparent !important;
			}

			#web-inspector-panel .panel-content:hover {
				scrollbar-width: thin !important;
				//scrollbar-color: rgba(0,0,0,0.3) rgba(0,0,0,0.05) !important;
				scrollbar-color: rgba(255, 255, 255, 1) rgba(255, 255, 255, 0.05) !important;
				transition: scrollbar-color 0.3s ease !important;
			}

			#web-inspector-panel .panel-content:not(:hover) {
				scrollbar-width: none !important;
				scrollbar-color: rgba(0,0,0,0) transparent !important;
				transition: scrollbar-color 2s ease !important;
			}

			/******************************************************************************/

			/* 🔥 IE/Edge 대응 */
			#web-inspector-panel .panel-content {
				-ms-overflow-style: none !important;
			}

			/* ✅ 숨김 상태 */
			#web-inspector-panel .panel-content.hidden {
				display: none !important;
			}

			/* 🔥 모든 외부 스타일 무력화 */
			#web-inspector-panel * {
				scrollbar-width: inherit !important;
				scrollbar-color: inherit !important;
			}

			/* 나머지 기존 스타일들 - !important 추가 */
			.info-section {
				margin-bottom: 6px !important;
				background: #f8f9fa !important;
				border-radius: 6px !important;
				padding: 12px !important;
				//border: 1px solid #505050ff !important;
				border: 1px solid #324dffff !important;
				box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
			}
			
			.info-section h3 {
				margin: 0 0 10px 0 !important;
				font-size: 13px !important;
				color: #495057 !important;
				border-bottom: 1px solid #dee2e6 !important;
				padding-bottom: 6px !important;
			}
			
			.info-grid {
				display: grid !important;
				grid-template-columns: 1fr 1fr !important;
				gap: 10px !important;
			}
			
			.dimensions-grid {
				grid-template-columns: 1fr 1fr 1fr !important;
			}
			
			.info-item.full-width {
				grid-column: 1 / -1 !important;
			}
			
			.info-item {
				display: flex !important;
				flex-direction: column !important;
			}
			
			.info-item label {
				font-size: 11px !important;
				font-weight: 600 !important;
				color: #666 !important;
				margin-bottom: 4px !important;
				text-transform: uppercase !important;
			}
			
			.value-container {
				position: relative !important;
				background: #f8f9fa !important;
				border: 1px solid #e9ecef !important;
				border-radius: 4px !important;
				padding: 6px 10px 6px 10px !important;
				min-height: 20px !important;
				font-size: 12px !important;
				overflow: hidden !important;
				text-overflow: ellipsis !important;
				white-space: nowrap !important;
			}
			
			.code-container {
				position: relative !important;
			}
			
			.code-container pre {
				background: #2d2d2d !important;
				color: #f8f8f2 !important;
				padding: 12px !important;
				border-radius: 4px !important;
				font-size: 11px !important;
				overflow: auto !important;
				max-height: 200px !important;
				margin: 0 !important;
				white-space: pre-wrap !important;
				font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
				line-height: 1.5 !important;
			}
			
			.copy-btn {
				position: absolute !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 0 !important;
            height: 0 !important;
            border-style: solid !important;
            border-width: 0 0 12px 12px !important;
            border-color: transparent transparent #ff4757 transparent !important;
            background: transparent !important;
            padding: 0 !important;
            transition: all 0.2s !important;
        }
        
        .copy-btn:hover {
            border-color: transparent transparent #ff3742 transparent !important;
        }
        
        .copy-btn.copied {
            border-color: transparent transparent #2ed573 transparent !important;
        }
        
        .copy-btn.large {
            position: static !important;
            width: auto !important;
            height: auto !important;
            border: none !important;
            padding: 5px 10px !important;
            margin-top: 8px !important;
            font-size: 11px !important;
            background: #ff4757 !important;
            color: white !important;
            border-radius: 4px !important;
        }
        
        .copy-btn.large:hover {
            background: #ff3742 !important;
        }
        
        .copy-btn.large.copied {
            background: #2ed573 !important;
        }
        
        .action-buttons {
            display: flex !important;
            gap: 10px !important;
            margin-top: 20px !important;
        }
        
        .action-btn {
            flex: 1 !important;
            padding: 10px !important;
            border: none !important;
            border-radius: 4px !important;
            background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%) !important;
            color: white !important;
            font-weight: 600 !important;
            transition: opacity 0.2s !important;
        }
    `;
    
    // head의 가장 앞부분에 강제 삽입
    if (document.head.firstChild) {
        document.head.insertBefore(style, document.head.firstChild);
    } else {
        document.head.appendChild(style);
    }
    
    
    console.log('✅ Panel styles injected with resize handle control');
}


	/**
	 * ✅ 리사이즈 이벤트 핸들러 설정
	 */
	setupResizeHandler() {
		if (!this.panelElement) return;
		
		console.log('📐 Setting up resize handler...');
		
		let resizeTimeout;
		let isResizing = false;
		
		// ✅ 리사이즈 시작 감지
		const handleResizeStart = () => {
			isResizing = true;
			console.log('📐 Resize started');
			
			// 리사이즈 중 시각적 피드백
			this.panelElement.style.opacity = '0.95';
			this.panelElement.style.transition = 'opacity 0.2s ease';
		};
		
		// ✅ 리사이즈 종료 감지
		const handleResizeEnd = () => {
			if (!isResizing) return;
			
			isResizing = false;
			console.log('📐 Resize ended');
			
			// 시각적 피드백 복원
			this.panelElement.style.opacity = '1';
			
			// 상태 저장
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				this.savePanelState();
				console.log('💾 Panel state saved after resize');
			}, 500);
		};
		
		// ✅ MutationObserver로 리사이즈 감지
		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				if (entry.target === this.panelElement && !isResizing) {
					handleResizeStart();
				}
			}
		});
		
		resizeObserver.observe(this.panelElement);
		
		// ✅ 마우스 이벤트로 리사이즈 종료 감지
		document.addEventListener('mouseup', () => {
			if (isResizing) {
				handleResizeEnd();
			}
		});
		
		// ✅ 리사이즈 핸들러에 마우스 리스너 추가
		const addResizeHandleListeners = () => {
			// 웹킷 리사이즈 핸들러
			const style = document.createElement('style');
			style.textContent = `
				#web-inspector-panel::-webkit-resizer {
					cursor: nwse-resize !important;
				}
			`;
			document.head.appendChild(style);
		};
		
		addResizeHandleListeners();
		
		console.log('✅ Resize handler setup complete');
	}
	/**
	 * ✅ 완전히 새로운 스크롤바 시스템 - 스크롤 공간 문제 해결
	 */
	initializeScrollbarSystem() {
		if (!this.panelElement) {
			console.error('❌ Panel element not found for scrollbar system');
			return;
		}
		
		const panelContent = this.panelElement.querySelector('.panel-content');
		if (!panelContent) {
			console.error('❌ Panel content not found');
			return;
		}
		
		console.log('🎯 Initializing NEW scrollbar system...');
		
		// ✅ 불필요한 스크롤 공간 제거 함수
		const removeExtraScrollSpace = () => {
			// 임의로 추가된 스크롤 스페이서 제거
			const existingSpacers = panelContent.querySelectorAll('[data-scroll-spacer]');
			existingSpacers.forEach(spacer => {
				if (spacer.parentNode) {
					spacer.parentNode.removeChild(spacer);
				}
			});
			
			// 실제 컨텐츠 높이 측정
			const contentHeight = panelContent.scrollHeight;
			const containerHeight = panelContent.clientHeight;
			
			console.log('📏 Content Height:', contentHeight, 'Container Height:', containerHeight);
			
			// 불필요한 스크롤이 생기지 않도록 조정
			if (contentHeight < containerHeight) {
				panelContent.style.overflowY = 'hidden';
			} else {
				panelContent.style.overflowY = 'auto';
			}
		};
		
		// ✅ 실제 컨텐츠 높이 기반 스크롤 설정
		const setupSmartScroll = () => {
			// MutationObserver로 컨텐츠 변화 감지
			const contentObserver = new MutationObserver(() => {
				setTimeout(removeExtraScrollSpace, 100);
			});
			
			contentObserver.observe(panelContent, {
				childList: true,
				subtree: true,
				characterData: true
			});
			
			// 초기 실행
			removeExtraScrollSpace();
		};
		
		// 인라인 스타일 강제 적용
		const applyInlineStyles = () => {
			panelContent.style.cssText += `
				overflow-y: auto !important;
				overflow-x: hidden !important;
				scrollbar-width: none !important;
				max-height: calc(100% - 25px) !important;
			`;
			console.log('🔧 Applied inline scrollbar styles');
		};
		
		// 초기화 실행
		applyInlineStyles();
		setupSmartScroll();
		
		console.log('✅ NEW scrollbar system initialized');
		
		// 즉시 테스트를 위한 이벤트 리스너
		panelContent.addEventListener('mouseenter', () => {
			console.log('🐭 HOVER DETECTED - Scrollbar should appear');
			// 실제 스크롤이 필요할 때만 스크롤바 표시
			if (panelContent.scrollHeight > panelContent.clientHeight) {
				panelContent.style.scrollbarWidth = 'thin';
				panelContent.style.scrollbarColor = 'rgba(0,0,0,0.3) rgba(0,0,0,0.05)';
			}
		});
		
		panelContent.addEventListener('mouseleave', () => {
			console.log('🐭 HOVER ENDED - Scrollbar should hide in 2s');
			setTimeout(() => {
				panelContent.style.scrollbarWidth = 'none';
				panelContent.style.scrollbarColor = 'rgba(0,0,0,0) transparent';
			}, 2000);
		});
	}

	/**
	 * ✅ 향상된 위치 및 높이 저장 시스템 - 리사이즈 통합
	 */
	setupEnhancedPositionSystem() {
		console.log('💾 Setting up enhanced position and height system with resize...');
		
		// ✅ 저장된 상태 로드 (기존 코드 유지)
		this.loadPanelState();
		
		// ✅ 리사이즈 이벤트 감지 (기존 코드 유지)
		this.setupResizeObserver();
		
		// ✅ 드래그 종료 시 저장 (기존 코드 유지)
		this.setupDragSaveHandler();
		
		// ✅ 리사이즈 핸들러 설정 추가 (강화된 버전)
		this.setupEnhancedResizeHandler();
	}

	/**
	 * ✅ 리사이즈 감지 시스템 - 닫힌 상태에서는 비활성화
	 */
	setupEnhancedResizeHandler() {
		if (!this.panelElement) return;
		
		console.log('📐 Setting up ENHANCED resize handler with state control...');
		
		// ✅ 리사이즈 강제 활성화 (열린 상태에서만)
		this.forceResizeEnable();
		
		// ✅ 리사이즈 이벤트 리스너 (상태에 따라 제어)
		this.setupResizeEventListeners();
		
		console.log('✅ Enhanced resize handler setup complete');
	}

	/**
	 * ✅ 리사이즈 강제 활성화
	 */
	forceResizeEnable() {
		if (!this.panelElement) return;
		
		// CSS 스타일 강제 적용
		this.panelElement.style.resize = 'both';
		this.panelElement.style.overflow = 'auto';
		
		// 인라인 스타일로 모든 제한 무력화
		const inlineStyle = document.createElement('style');
		inlineStyle.textContent = `
			#web-inspector-panel {
				resize: both !important;
				overflow: auto !important;
				min-width: 350px !important;
				max-width: none !important;
				max-height: none !important;
			}
			
			#web-inspector-panel * {
				pointer-events: auto !important;
			}
		`;
		inlineStyle.id = 'force-resize-style';
		document.head.appendChild(inlineStyle);
		
		console.log('🔧 Resize forcibly enabled');
	}

	/**
	 * ✅ 리사이즈 이벤트 리스너 설정 (닫힌 상태에서는 무시)
	 */
	setupResizeEventListeners() {
		let resizeTimeout;
		let isResizing = false;

		// ✅ 마우스 다운 이벤트로 리사이즈 시작 감지
		document.addEventListener('mousedown', (e) => {
			// ✅ 패널이 닫혀있으면 리사이즈 무시
			const panelContent = this.panelElement.querySelector('#panelContent');
			if (panelContent && panelContent.classList.contains('hidden')) {
				console.log('🚫 Resize blocked - panel is closed');
				return;
			}
			
			// 리사이즈 핸들러 영역 클릭 확인 (우측 하단 20x20 영역)
			const rect = this.panelElement.getBoundingClientRect();
			const isResizeHandle = 
				e.clientX >= rect.right - 20 && 
				e.clientY >= rect.bottom - 20;
			
			if (isResizeHandle) {
				isResizing = true;
				this.panelElement.classList.add('resizing');
				console.log('📐 Resize STARTED');
			}
		});

		// ✅ 마우스 업 이벤트로 리사이즈 종료 감지
		document.addEventListener('mouseup', () => {
			if (isResizing) {
				isResizing = false;
				this.panelElement.classList.remove('resizing');
				console.log('📐 Resize ENDED');
				
				// 상태 저장
				clearTimeout(resizeTimeout);
				resizeTimeout = setTimeout(() => {
					this.savePanelState();
					console.log('💾 Panel state saved after resize');
				}, 300);
			}
		});

		// ✅ 리사이즈 옵저버로 크기 변화 감지 (닫힌 상태에서는 무시)
		if (typeof ResizeObserver !== 'undefined') {
			const resizeObserver = new ResizeObserver((entries) => {
				for (let entry of entries) {
					if (entry.target === this.panelElement && isResizing) {
						// ✅ 패널이 닫혀있으면 리사이즈 무시
						const panelContent = this.panelElement.querySelector('#panelContent');
						if (panelContent && panelContent.classList.contains('hidden')) {
							console.log('🚫 Resize observer blocked - panel is closed');
							return;
						}
						
						const { width, height } = entry.contentRect;
						console.log('📏 Resizing:', Math.round(width) + 'x' + Math.round(height));
						
						// 실시간으로 컨텐츠 높이 조정
						this.adjustContentHeight();
					}
				}
			});
			
			resizeObserver.observe(this.panelElement);
		}
	}

	/**
	 * ✅ 패널 상태 로드 (위치, 크기, 높이) - 저장된 값 우선 적용
	 */
	loadPanelState() {
		try {
			const saved = localStorage.getItem(this.STORAGE_KEY);
			if (saved) {
				const state = JSON.parse(saved);
				console.log('📦 Loading saved panel state:', state);
				
				if (this.panelElement) {
					// ✅ 위치 복원 - 저장된 값 우선
					if (state.left && state.top) {
						this.panelElement.style.left = state.left;
						this.panelElement.style.top = state.top;
						this.panelElement.style.right = 'auto';
						this.panelElement.style.bottom = 'auto';
					}
					
					// ✅ 크기 복원 - 저장된 값 우선
					if (state.width) this.panelElement.style.width = state.width;
					if (state.height) {
						this.panelElement.style.height = state.height;
						console.log('📏 Restored saved height:', state.height);
					} else {
						// 기본 높이 설정 (화면 높이의 70%)
						const screenHeight = window.innerHeight;
						const defaultHeight = Math.min(800, Math.max(500, screenHeight * 0.7));
						this.panelElement.style.height = defaultHeight + 'px';
						console.log('📏 Using default height:', defaultHeight + 'px');
					}
					
					// 실제 적용된 높이 저장
					if (state.actualHeight) {
						console.log('📏 Previously actual height:', state.actualHeight);
					}
				}
			} else {
				// ✅ 기본값 설정 - 화면 높이의 70%
				if (this.panelElement) {
					const screenHeight = window.innerHeight;
					const defaultHeight = Math.min(800, Math.max(500, screenHeight * 0.7));
					this.panelElement.style.height = defaultHeight + 'px';
					this.panelElement.style.top = '100px';
					this.panelElement.style.left = '100px';
					console.log('📏 Using initial default height:', defaultHeight + 'px');
				}
			}
		} catch (error) {
			console.error('❌ Error loading panel state:', error);
			// ✅ 에러 시 기본값 - 화면 높이의 70%
			if (this.panelElement) {
				const screenHeight = window.innerHeight;
				const defaultHeight = Math.min(800, Math.max(500, screenHeight * 0.7));
				this.panelElement.style.height = defaultHeight + 'px';
			}
		}
	}

	/**
	 * ✅ 패널 상태 저장 (위치, 크기, 높이) - 실제 크기 저장
	 */
	savePanelState() {
		if (!this.panelElement) return;
		
		try {
			const rect = this.panelElement.getBoundingClientRect();
			const state = {
				left: this.panelElement.style.left,
				top: this.panelElement.style.top,
				width: this.panelElement.style.width || rect.width + 'px',
				height: this.panelElement.style.height || rect.height + 'px',
				actualHeight: rect.height + 'px',
				actualWidth: rect.width + 'px',
				savedAt: Date.now(),
				wasOpen: this.isPanelOpen(),
				screenHeight: window.innerHeight // ✅ 현재 화면 높이도 저장
			};
			
			console.log('💾 Saving panel state:', state);
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
			
			// Chrome 확장 프로그램 저장 (있는 경우)
			if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
				chrome.storage.sync.set({ [this.STORAGE_KEY]: state });
			}
			
		} catch (error) {
			console.error('❌ Error saving panel state:', error);
		}
	}

	/**
	 * ✅ 리사이즈 옵저버 설정 - 반응성 개선 버전
	 */
	setupResizeObserver() {
		if (!this.panelElement || typeof ResizeObserver === 'undefined') return;
		
		let resizeTimeout;
		let isResizing = false;
		let resizeStartTime = 0;

		const resizeObserver = new ResizeObserver((entries) => {
			for (let entry of entries) {
				if (entry.target === this.panelElement) {
					const newWidth = entry.contentRect.width;
					const newHeight = entry.contentRect.height;
					
					// ✅ 실시간으로 컨텐츠 높이 조정 (즉시 반응)
					this.adjustContentHeight();
					
					// ✅ 리사이즈 중 시각적 피드백 (즉시 반응)
					if (!isResizing) {
						isResizing = true;
						resizeStartTime = Date.now();
						this.panelElement.classList.add('resizing');
						console.log('📐 Resize STARTED');
					}
					
					// ✅ 쓰로틀링 시간 단축 (800ms → 300ms)
					clearTimeout(resizeTimeout);
					resizeTimeout = setTimeout(() => {
						const resizeDuration = Date.now() - resizeStartTime;
						isResizing = false;
						this.panelElement.classList.remove('resizing');
						
						// ✅ 리사이즈가 충분히 길었을 때만 저장 (0.5초 이상)
						if (resizeDuration > 500) {
							console.log('💾 Saving state after resize...');
							this.savePanelState();
						} else {
							console.log('⚡ Quick resize - skipping save');
						}
					}, 300); // ✅ 딜레이 시간 단축
				}
			}
		});
		
		resizeObserver.observe(this.panelElement);
		console.log('🔍 Fast resize observer activated');
	}

	/**
	 * ✅ 컨텐츠 높이 자동 조정 - 최적화 버전
	 */
	adjustContentHeight() {
		if (!this.panelElement) return;
		
		const panelContent = this.panelElement.querySelector('#panelContent');
		if (!panelContent) return;
		
		// ✅ requestAnimationFrame으로 부드러운 애니메이션
		requestAnimationFrame(() => {
			const dragHandle = this.panelElement.querySelector('#panelDragHandle');
			const handleHeight = dragHandle ? dragHandle.offsetHeight : 25;
			const availableHeight = this.panelElement.offsetHeight - handleHeight;
			
			panelContent.style.maxHeight = availableHeight + 'px';
			
			// ✅ 디버그 로그는 필요시만 출력 (성능 향상)
			// console.log('📐 Adjusted content max-height to:', availableHeight + 'px');
		});
	}

	/**
	 * ✅ 드래그 종료 시 저장 핸들러
	 */
	setupDragSaveHandler() {
		if (!this.panelElement) return;
		
		// 드래그 핸들러에 저장 기능 연결
		const originalStopDrag = this.stopDrag.bind(this);
		this.stopDrag = (e) => {
			originalStopDrag(e);
			console.log('💾 Saving position after drag...');
			this.savePanelState();
		};
	}

	/**
	 * ✅ 패널 열림 상태 확인
	 */
	isPanelOpen() {
		if (!this.panelElement) return false;
		const panelContent = this.panelElement.querySelector('#panelContent');
		return panelContent && !panelContent.classList.contains('hidden');
	}
	//--------------------------------------------------------------------------------------------------------------------------
	/**
     * ✅ 마우스 커서 상태 동기화 시스템 초기화
     */
    initCursorSyncSystem() {
        console.log('🎯 Initializing cursor sync system...');
        
        // StateManager에서 커서 상태 변경 이벤트 리스너 등록
        if (this.stateManager && this.stateManager.on) {
            this.stateManager.on('cursorStateChanged', (isHidden) => {
                console.log('🔄 Cursor state changed:', isHidden);
                if (isHidden) {
                    this.hideCursor();
                } else {
                    this.restoreCursor();
                }
            });
        }
        
        // 패널 마우스 이벤트 설정
        this.setupPanelMouseEvents();
    }

    /**
     * ✅ 패널 마우스 이벤트 설정
     */
    setupPanelMouseEvents() {
        if (!this.panelElement) return;
        
        // 패널에 마우스 진입 시 커서 복원
        this.panelElement.addEventListener('mouseenter', () => {
            console.log('🐭 Mouse entered panel - restoring cursor');
            this.notifyCursorState(false); // 커서 보이기
        });
        
        // 패널에서 마우스 떠날 때 커서 숨기기
        this.panelElement.addEventListener('mouseleave', (e) => {
            // 마우스가 실제로 창 밖으로 나가지 않고 다른 요소로 이동한 경우만
            if (e.relatedTarget) {
                console.log('🐭 Mouse left panel - hiding cursor');
                this.notifyCursorState(true); // 커서 숨기기
            }
        });
    }

    /**
     * ✅ 커서 상태 변경 알림 (StateManager로 전파)
     */
    notifyCursorState(isHidden) {
		
        // StateManager로 이벤트 전달
        if (this.stateManager && this.stateManager.emit) {
            this.stateManager.emit('cursorStateChanged', isHidden);
        }
        
        // 로컬 상태도 업데이트
        if (isHidden) {
            this.hideCursor();
        } else {
            this.restoreCursor();
        }
    }

    /**
     * ✅ 마우스 커서 숨기기 (element-analyzer.js와 동일한 방식)
     */
    hideCursor() {
        if (this.isCursorHidden) return;
        
        console.log('👁️ Hiding cursor from panel');
        
        const style = document.createElement('style');
        style.id = 'hidden-cursor-style';
        style.textContent = this.cursorStyles.hidden;
        
        // 기존 스타일이 있으면 제거
        if (this.cursorStyleElement && this.cursorStyleElement.parentNode) {
            this.cursorStyleElement.parentNode.removeChild(this.cursorStyleElement);
        }
        
        document.head.appendChild(style);
        this.cursorStyleElement = style;
        this.isCursorHidden = true;
    }

    /**
     * ✅ 마우스 커서 복원
     */
    restoreCursor() {
        if (!this.isCursorHidden) return;
        
        console.log('👁️ Restoring cursor from panel');
        
        // 숨겨진 커서 스타일 제거
        if (this.cursorStyleElement && this.cursorStyleElement.parentNode) {
            this.cursorStyleElement.parentNode.removeChild(this.cursorStyleElement);
            this.cursorStyleElement = null;
        }
        
        this.isCursorHidden = false;
    }
	//--------------------------------------------------------------------------------------------------------------------------


	// =========================================================================
    // ✅ 간단한 높이 관리 시스템 (기존 코드 최소 변경)
    // =========================================================================

    /**
	 * ✅ 높이 복원 - 저장된 실제 높이로 복원
	 */
	restorePanelHeight() {
		if (!this.panelElement) return;
		
		try {
			const saved = localStorage.getItem(this.STORAGE_KEY);
			if (saved) {
				const state = JSON.parse(saved);
				if (state.height && parseInt(state.height) > 100) {
					this.panelElement.style.height = state.height;
					console.log('✅ 저장된 높이 복원:', state.height);
					return;
				}
			}
		} catch (error) {
			console.error('❌ 높이 복원 오류:', error);
		}
		
		// 기본값
		this.panelElement.style.height = this.DEFAULT_HEIGHT;
		console.log('📏 기본 높이 적용:', this.DEFAULT_HEIGHT);
	}

	/**
     * ✅ 현재 높이 저장
     */
    saveCurrentHeight() {
		if (!this.panelElement) return;
		
		const panelContent = this.panelElement.querySelector('#panelContent');
		const isPanelOpen = panelContent && !panelContent.classList.contains('hidden');
		
		// ✅ 패널이 열려있을 때만 저장
		if (isPanelOpen) {
			const currentHeight = this.panelElement.offsetHeight;
			console.log('📏 저장할 높이:', currentHeight + 'px');
			
			if (currentHeight > 100) {
				const savedState = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
				savedState.height = currentHeight + 'px';
				localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedState));
				console.log('💾 높이 저장 완료');
			}
		}
	}


	/**
     * ✅ 리사이즈 감지 (매우 간단하게)
     */
    /**
	 * ✅ 리사이즈 감지 + 헤더 높이 동적 측정
	 */
	setupResizeDetection() {
		if (!this.panelElement) return;
		
		let resizeTimeout;
		
		// ✅ 헤더 높이 측정 함수
		const updateHeaderMinHeight = () => {
			const dragHandle = this.panelElement.querySelector('#panelDragHandle');
			if (dragHandle) {
				const handleHeight = dragHandle.offsetHeight;
				this.panelElement.style.minHeight = handleHeight + 'px';
				console.log('📏 헤더 높이 측정 -> min-height 설정:', handleHeight + 'px');
			}
		};
		
		// ✅ 초기 헤더 높이 설정
		updateHeaderMinHeight();
		
		// ✅ 리사이즈 감지
		if (typeof ResizeObserver !== 'undefined') {
			const observer = new ResizeObserver((entries) => {
				for (let entry of entries) {
					if (entry.target === this.panelElement) {
						clearTimeout(resizeTimeout);
						resizeTimeout = setTimeout(() => {
							console.log('📏 패널 리사이즈 감지');
							this.saveCurrentHeight();
						}, 500);
					}
					
					// ✅ 헤더 리사이즈도 감지
					if (entry.target.id === 'panelDragHandle') {
						console.log('📏 헤더 높이 변경 감지');
						updateHeaderMinHeight();
					}
				}
			});
			
			// ✅ 패널과 헤더 모두 관찰
			observer.observe(this.panelElement);
			
			const dragHandle = this.panelElement.querySelector('#panelDragHandle');
			if (dragHandle) {
				observer.observe(dragHandle);
			}
		}
		
		// ✅ 폰트/스타일 변경도 감지 (MutationObserver)
		const mutationObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && 
					(mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
					console.log('🎨 스타일 변경 감지 - 헤더 높이 재측정');
					setTimeout(updateHeaderMinHeight, 100);
				}
			});
		});
		
		const dragHandle = this.panelElement.querySelector('#panelDragHandle');
		if (dragHandle) {
			mutationObserver.observe(dragHandle, {
				attributes: true,
				attributeFilter: ['style', 'class']
			});
		}
		
		console.log('✅ 동적 헤더 높이 측정 시스템 활성화');
	}


	/**
	 * ✅ 아코디언 열기 - 높이 복원 + 사이즈 변경 & 스크롤 활성화
	 */
	openAccordion() {
		console.log('🔓 패널 열기 - 모든 UI 요소 활성화');
		
		const panelContent = this.panelElement.querySelector('#panelContent');
		const toggleIcon = this.panelElement.querySelector('.toggle-icon');
		
		// ✅ 컨텐츠 보이기
		if (panelContent) {
			panelContent.classList.remove('hidden');
			panelContent.style.display = 'block';
		}
		
		if (toggleIcon) {
			toggleIcon.textContent = '▼';
		}
		
		// ✅ 사이즈 변경 활성화
		this.panelElement.style.resize = 'both';
		this.panelElement.style.overflow = 'auto';
		
		// ✅ 스크롤바 활성화
		if (panelContent) {
			panelContent.style.overflow = 'auto';
			panelContent.style.overflowY = 'auto';
			panelContent.style.overflowX = 'hidden';
		}
		
		// ✅ 저장된 높이로 복원
		this.restorePanelHeight();
		
		// ✅ 리사이즈 핸들러 다시 보이기
		this.showResizeHandle();
		
		// ✅ 컨텐츠 높이 조정
		setTimeout(() => {
			this.adjustContentHeight();
		}, 100);
		
		console.log('✅ 패널 열림 - 모든 UI 요소 활성화 완료');
	}


	/**
	 * ✅ 아코디언 닫기 - 높이 저장 + 사이즈 변경 & 스크롤 완전 비활성화
	 */
	closeAccordion() {
		console.log('🔒 패널 닫기 - 모든 UI 요소 비활성화');
		
		const panelContent = this.panelElement.querySelector('#panelContent');
		const toggleIcon = this.panelElement.querySelector('.toggle-icon');
		const dragHandle = this.panelElement.querySelector('#panelDragHandle');
		
		// ✅ 현재 높이 저장 (닫기 전에)
		this.savePanelState();
		
		// ✅ 컨텐츠 숨기기
		if (panelContent) {
			panelContent.classList.add('hidden');
			panelContent.style.display = 'none';
		}
		
		if (toggleIcon) {
			toggleIcon.textContent = '▲';
		}
		
		// ✅ 패널 높이를 헤더 높이로 설정
		if (dragHandle) {
			const handleHeight = dragHandle.offsetHeight;
			
			// ✅ 사이즈 변경 완전 비활성화
			this.panelElement.style.resize = 'none';
			this.panelElement.style.overflow = 'hidden';
			
			// ✅ 정확한 높이 설정
			this.panelElement.style.height = handleHeight + 'px';
			this.panelElement.style.minHeight = handleHeight + 'px';
			this.panelElement.style.maxHeight = handleHeight + 'px';
			
			// ✅ 모든 스크롤바 완전히 숨기기
			this.panelElement.style.overflow = 'hidden';
			if (panelContent) {
				panelContent.style.overflow = 'hidden';
				panelContent.style.overflowY = 'hidden';
				panelContent.style.overflowX = 'hidden';
			}
			
			console.log('📏 패널 높이 줄임 + 리사이즈/스크롤 비활성화:', handleHeight + 'px');
		}
		
		// ✅ CSS로 리사이즈 핸들러 완전히 숨기기
		this.hideResizeHandle();
		
		console.log('✅ 패널 닫힘 - 모든 UI 요소 비활성화 완료');
	}


	/**
	 * ✅ 리사이즈 핸들러 다시 보이기
	 */
	showResizeHandle() {
		// ✅ 닫힘 상태 제거
		this.panelElement.setAttribute('data-closed', 'false');
		this.panelElement.classList.remove('resize-disabled');
		
		// ✅ 스타일 제거
		const style = document.getElementById('hide-resize-handle');
		if (style && style.parentNode) {
			style.parentNode.removeChild(style);
		}
	}

	/**
	 * ✅ 리사이즈 핸들러 완전히 숨기기
	 */
	hideResizeHandle() {
		const styleId = 'hide-resize-handle';
		let style = document.getElementById(styleId);
		
		if (!style) {
			style = document.createElement('style');
			style.id = styleId;
			document.head.appendChild(style);
		}
		
		style.textContent = `
			/* ✅ 패널이 닫혔을 때 리사이즈 핸들러 완전히 숨기기 */
			#web-inspector-panel[data-closed="true"] {
				resize: none !important;
				overflow: hidden !important;
			}
			
			#web-inspector-panel[data-closed="true"]::-webkit-resizer {
				display: none !important;
				visibility: hidden !important;
				opacity: 0 !important;
				width: 0 !important;
				height: 0 !important;
				border: none !important;
			}
			
			#web-inspector-panel[data-closed="true"] * {
				overflow: hidden !important;
			}
			
			/* ✅ 모든 브라우저에서 리사이즈 핸들러 숨기기 */
			#web-inspector-panel.resize-disabled {
				resize: none !important;
			}
			
			#web-inspector-panel.resize-disabled::-webkit-resizer {
				display: none !important;
				visibility: hidden !important;
				opacity: 0 !important;
			}
			
			/* Firefox */
			#web-inspector-panel.resize-disabled {
				scrollbar-width: none !important;
			}
			
			/* IE/Edge */
			#web-inspector-panel.resize-disabled {
				-ms-overflow-style: none !important;
			}
		`;
		
		// ✅ 패널에 닫힘 상태 표시
		this.panelElement.setAttribute('data-closed', 'true');
		this.panelElement.classList.add('resize-disabled');
	}

	
	


	//-----------
	/**
     * ✅ 기존 위치 저장에 높이도 함께 저장
     */
    saveCurrentPosition() {
        if (!this.panelElement) return;
        
        // ✅ 기존 위치 저장 코드 유지
        const position = {
            top: this.panelElement.style.top,
            left: this.panelElement.style.left,
            right: this.panelElement.style.right,
            bottom: this.panelElement.style.bottom,
            width: this.panelElement.style.width,
            savedAt: Date.now()
        };
        
        // ✅ 높이도 함께 저장
        this.savePanelPosition(position);
    }

    /**
     * ✅ 기존 위치 복원에 높이도 함께 복원
     */
    restorePanelPosition() {
        try {
            console.log('📦 Restoring panel position...');
            
            let savedPosition = null;
            const localPosition = localStorage.getItem(this.STORAGE_KEY);
            
            if (localPosition) {
                savedPosition = JSON.parse(localPosition);
            }
            
            if (savedPosition) {
                // ✅ 기존 위치 적용 코드 유지
                if (savedPosition.left && savedPosition.top) {
                    this.panelElement.style.left = savedPosition.left;
                    this.panelElement.style.top = savedPosition.top;
                    this.panelElement.style.right = 'auto';
                    this.panelElement.style.bottom = 'auto';
                }
                
                // ✅ 높이도 함께 복원
                if (savedPosition.height) {
                    this.panelElement.style.height = savedPosition.height;
                }
                
            } else {
                // ✅ 기본 위치 적용 (상단 오른쪽 5px, 5px)
                this.panelElement.style.top = '5px';
                this.panelElement.style.left = 'auto';
                this.panelElement.style.right = '5px';
                this.panelElement.style.bottom = 'auto';
                this.panelElement.style.height = this.DEFAULT_HEIGHT;
            }
            
        } catch (error) {
            console.error('❌ Position restore error:', error);
        }
    }

    /**
     * ✅ 기존 위치 저장에 높이 추가
     */
    savePanelPosition(position) {
        try {
            // ✅ 현재 높이도 함께 저장
            const enhancedPosition = {
                ...position,
                height: this.panelElement.style.height || this.panelElement.offsetHeight + 'px'
            };
            
            console.log('💾 Saving panel position with height:', enhancedPosition);
            
            // ✅ 기존 저장 코드 유지
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(enhancedPosition));
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.set({
                    [this.STORAGE_KEY]: enhancedPosition
                });
            }
            
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(enhancedPosition));
            
        } catch (error) {
            console.error('❌ Position save error:', error);
        }
    }

    
    /**
     * ✅ 저장된 위치 적용
     */
    applyPanelPosition(position) {
        if (!this.panelElement || !position) return;
        
        console.log('🔄 Applying saved position:', position);
        
        if (position.left && position.top) {
            this.panelElement.style.left = position.left;
            this.panelElement.style.top = position.top;
            this.panelElement.style.right = 'auto';
            this.panelElement.style.bottom = 'auto';
        }
        
        if (position.width) this.panelElement.style.width = position.width;
        if (position.height) this.panelElement.style.height = position.height;
    }



	// =========================================================================<<<
    
    /**
     * ✅ 상위 패널 요소 찾기
     */
    findParentPanel() {
        let element = document.body;
        while (element && element !== document.documentElement) {
            if (element.getAttribute('data-inspector-panel') || 
                element.id === 'web-inspector-panel') {
                return element;
            }
            element = element.parentElement;
        }
        return null;
    }
    
	
	/**
	 * ✅ 원시 마우스 이벤트 시스템 구축
	 */
	setupRawMouseSystem(dragHandle) {
		let isDragging = false;
		let startX, startY, startLeft, startTop;
		
		// 🔥 핵심: document-level 이벤트로 완전 제어
		const handleDocumentMouseMove = (e) => {
			if (!isDragging) return;
			
			this.dragState.wasDragged = true;

			// 모든 이벤트 전파 즉시 차단
			e.stopPropagation();
			e.stopImmediatePropagation();
			
			const deltaX = e.clientX - startX;
			const deltaY = e.clientY - startY;
			
			const newX = startLeft + deltaX;
			const newY = startTop + deltaY;
			
			// 화면 경계
			const maxX = window.innerWidth - this.panelElement.offsetWidth;
			const maxY = window.innerHeight - this.panelElement.offsetHeight;
			
			this.panelElement.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
			this.panelElement.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
			
			// 추가 보험: 모든 기본 동작 방지
			e.preventDefault();
			return false;
		};
		
		const handleDocumentMouseUp = (e) => {
			if (!isDragging) return;
			
			console.log('💥 DRAG ENDED');
			isDragging = false;
			this.panelElement.style.cursor = '';

			// ✅ 1. 드래그가 있었으면 아코디언 토글 무시
			if (this.dragState.wasDragged) {
				console.log('⏩ ACCORDION TOGGLE BLOCKED - Drag detected');
				
			} 
			// ✅ 2. 순수 클릭이면 아코디언 토글 수행
			else {
				console.log('🎯 PURE CLICK - Toggling accordion');
				//this.toggleAccordion();
			}
			this.resetDragState();

			
			// 이벤트 리스너 제거
			document.removeEventListener('mousemove', handleDocumentMouseMove, true);
			document.removeEventListener('mouseup', handleDocumentMouseUp, true);
			
			this.saveCurrentPosition();
			
			// 모든 전파 차단
			e.stopPropagation();
			e.stopImmediatePropagation();
			e.preventDefault();
			return false;
		};
		
		// 🔥 핵심: mousedown 이벤트를 document 레벨에서 캡처
		document.addEventListener('mousedown', (e) => {
			// 드래그 핸들러에서 발생한 이벤트인지 확인
			if (!e.target.closest || !e.target.closest('#panelDragHandle')) return;
			
			console.log('💥 DOCUMENT CAPTURED MOUSEDOWN');
			
			// 즉시 모든 제어권 확보
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			
			const rect = this.panelElement.getBoundingClientRect();
			startLeft = rect.left;
			startTop = rect.top;
			
			// 문서 레벨 이벤트 리스너 등록 (캡처 단계)
			document.addEventListener('mousemove', handleDocumentMouseMove, true);
			document.addEventListener('mouseup', handleDocumentMouseUp, true);
			
			// 시각적 피드백
			this.panelElement.style.cursor = 'grabbing';
			
			// 모든 이벤트 전파 완전 차단
			e.stopPropagation();
			e.stopImmediatePropagation();
			e.preventDefault();
			return false;
			
		}, true); // 🔥 캡처 단계에서 먼저 잡기
		
		console.log('💥 Raw mouse event system ready');
	}
	/**
	 * ✅ 드래그 상태 초기화
	 */
	resetDragState() {
		this.dragState = {
			isCycleActive: false,
			wasDragged: false
		};
		console.log('🔄 Drag state reset');
	}

    
	/**
	 * ✅ 아코디언 상태 변화 감지 Observer
	 */
	setupAccordionObserver() {
		const accordionSection = this.panelElement.querySelector('.accordion-section');
		const accordionContent = this.panelElement.querySelector('.accordion-content');
		
		if (!accordionSection || !accordionContent) return;
		
		// ✅ MutationObserver로 아코디언 클래스 변화 감지
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
					console.log('🔍 Accordion state changed detected');
					
					// ✅ CSS 트랜지션 완료 후 정확한 높이 측정
					setTimeout(() => {
						// ✅ 컨텐츠의 실제 높이 측정을 위해 잠시 display block
						const originalDisplay = accordionContent.style.display;
						accordionContent.style.display = 'block';
						
						this.adjustPanelHeight();
						
						// ✅ 원래 display 값 복원
						setTimeout(() => {
							accordionContent.style.display = originalDisplay;
						}, 10);
					}, 350); // CSS 트랜지션 시간(0.3s)보다 약간 길게
				}
			});
		});
		
		observer.observe(accordionSection, {
			attributes: true,
			attributeFilter: ['class']
		});
		
		// ✅ 컨텐츠 크기 변화도 감지 (내용이 변경될 경우)
		const contentObserver = new MutationObserver(() => {
			setTimeout(() => {
				this.adjustPanelHeight();
			}, 100);
		});
		
		contentObserver.observe(accordionContent, {
			childList: true,
			subtree: true,
			characterData: true
		});
		
		console.log('✅ Precise accordion observer setup complete');
	}


	/**
     * ✅ 드래그 종료
     */
    stopDrag(e) {
        if (!this.isDragging) return;
        
        console.log('🧩 Drag ended');
        
        this.isDragging = false;
        
        // 스타일 복원
        this.panelElement.style.cursor = '';
        this.panelElement.style.opacity = '';
        
		/*
        const dragHandle = this.panelElement.querySelector('#panelDragHandle');
        if (dragHandle) {
            dragHandle.style.background = 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)';
        }
        
        // 최종 위치 저장
        this.saveCurrentPosition();
        */
	   
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // 부모 창에 드래그 종료 알림
        this.postMessageToParent({
            type: 'PANEL_DRAG_ENDED',
            panelId: 'web-inspector-panel'
        });
    }

    /**
     * ✅ 드래그 시작
     */
    startDrag(e) {
        console.log('🧩 Drag started');
        
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        // 현재 패널 위치 저장
        const rect = this.panelElement.getBoundingClientRect();
        this.panelStartX = rect.left;
        this.panelStartY = rect.top;
        
		/*
        // 드래그 중 스타일
        this.panelElement.style.cursor = 'grabbing';
        this.panelElement.style.opacity = '0.95';
        
		
        const dragHandle = this.panelElement.querySelector('#panelDragHandle');
        if (dragHandle) {
            dragHandle.style.background = 'linear-gradient(135deg, #4a0b9c 0%, #155cca 100%)';
        }
		*/
        
        e.preventDefault();
        e.stopPropagation();
        
        // 부모 창에 드래그 시작 알림
        this.postMessageToParent({
            type: 'PANEL_DRAG_STARTED',
            panelId: 'web-inspector-panel'
        });
    }
    
    /**
     * ✅ 터치 시작 처리
     */
    handleTouchStart(e) {
        const touch = e.touches[0];
        const simulatedEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation()
        };
        this.startDrag(simulatedEvent);
    }
    
    /**
     * ✅ 드래그 중 처리
     */
    handleDrag(e) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;
        
        this.updatePanelPosition(deltaX, deltaY);
        e.preventDefault();
    }
    
    /**
     * ✅ 터치 드래그 처리
     */
    handleTouchDrag(e) {
        if (!this.isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.dragStartX;
        const deltaY = touch.clientY - this.dragStartY;
        
        this.updatePanelPosition(deltaX, deltaY);
        e.preventDefault();
    }
    
    /**
     * ✅ 패널 위치 업데이트
     */
    updatePanelPosition(deltaX, deltaY) {
        if (!this.panelElement) return;
        
        const newX = this.panelStartX + deltaX;
        const newY = this.panelStartY + deltaY;
        
        // 화면 경계 검사
        const maxX = window.innerWidth - this.panelElement.offsetWidth;
        const maxY = window.innerHeight - this.panelElement.offsetHeight;
        
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        // 위치 업데이트
        this.panelElement.style.left = `${boundedX}px`;
        this.panelElement.style.top = `${boundedY}px`;
        this.panelElement.style.right = 'auto';
        this.panelElement.style.bottom = 'auto';
        
        // 실시간 저장 (쓰로틀링)
        this.throttledSavePosition();
    }
    
    /**
     * ✅ 쓰로틀링된 위치 저장
     */
    throttledSavePosition() {
        if (!this.saveTimeout) {
            this.saveTimeout = setTimeout(() => {
                this.saveCurrentPosition();
                this.saveTimeout = null;
            }, 100);
        }
    }
    
    
    
    
    
    /**
     * ✅ 패널 기능 초기화
     */
    initializePanelFunctions() {
        console.log('⚙️ Initializing panel functions...');
        
       	// ✅ 아코디언 기능
		//this.initAccordion();
		
		// ✅ 복사 버튼 이벤트
		this.initCopyButtons();
		
		// ✅ 다운로드 버튼
		this.initDownloadButton();

		// 패널 접기 열기
		this.initAccordionButton();
		
		// ✅ 메시지 리스너
		//this.initMessageListener();
		
		// ✅ 키보드 이벤트
		//this.initKeyboardEvents();
		
		// ✅ 2. 리사이즈 감지 (위치 시스템 이후)
		setTimeout(() => {
			this.setupResizeDetection();
		}, 500);

        
        console.log('✅ Panel functions initialized');
    }

    
    /*
     // ✅ 아코디언 초기화
    initAccordion() {
        const accordionHeaders = this.panelElement.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            header.addEventListener('click', this.handleAccordionClick.bind(this));
        });
        
        // 기본적으로 Basic Information 섹션만 열기
        this.onOffSpecificAccordion('CLOSE_ACCORDION', 'basic-information');
        console.log('✅ Accordion initialized with all sections closed');
    }
	
    
    // ✅ 아코디언 클릭 처리
    handleAccordionClick(e) {
		console.log('⏩ Accordion toggle >>>>>>>>>>>>>>>>>>> '+JSON.parse(e));
		// ✅ 드래그 중이면 아코디언 토글 방지
		if (this.isDragging) {
			console.log('⏩ Accordion toggle blocked (dragging)');
			return;
		}
		
		const header = e.currentTarget;
		const section = header.parentElement;
		const content = header.nextElementSibling;
		const icon = header.querySelector('.accordion-icon');

		const isActive = section.classList.contains('active');

		// 다른 모든 섹션 닫기
		this.panelElement.querySelectorAll('.accordion-section').forEach(otherSection => {
			if (otherSection !== section) {
				otherSection.classList.remove('active');
				const otherContent = otherSection.querySelector('.accordion-content');
				const otherIcon = otherSection.querySelector('.accordion-icon');

				if (otherContent) otherContent.classList.remove('active');
				if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
			}
		});

		// 현재 섹션 토글
		if (isActive) {
			section.classList.remove('active');
			if (content) content.classList.remove('active');
			if (icon) icon.style.transform = 'rotate(0deg)';
		} else {
			section.classList.add('active');
			if (content) content.classList.add('active');
			if (icon) icon.style.transform = 'rotate(180deg)';
		}

		// ✅ 아코디언 상태에 따라 패널 높이 자동 조정 (복원)
		this.adjustPanelHeight();
		
		e.stopPropagation();
	}
	*/


	/**
	 * ✅ 패널 높이 자동 조정
	 */
	adjustPanelHeight() {
		if (!this.panelElement) return;
		
		const dragHandle = this.panelElement.querySelector('#panelDragHandle');
		const panelContent = this.panelElement.querySelector('#panelContent');
		
		if (!dragHandle || !panelContent) return;
		
		// ✅ 간단한 높이 계산
		if (panelContent.classList.contains('hidden')) {
			// ✅ 컨텐츠가 숨겨졌을 때: 드래그 핸들러 높이만
			const dragHandleHeight = dragHandle.offsetHeight;
			this.panelElement.style.height = dragHandleHeight + 'px';
		} else {
			// ✅ 컨텐츠가 보일 때: 기본 높이 또는 자동
			this.panelElement.style.height = '';
		}
		
		console.log('📏 Panel height adjusted');
	}
    
    /**
     * ✅ 복사 버튼 초기화
     */
    initCopyButtons() {
        const copyButtons = this.panelElement.querySelectorAll('.copy-btn');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.getAttribute('data-copy');
                this.copyToClipboard(targetId);
                e.preventDefault();
                e.stopPropagation();
            });
        });
    }
    
    /**
     * ✅ 클립보드 복사
     */
    copyToClipboard(elementId) {
        const element = this.panelElement.querySelector(`#${elementId}`);
        if (!element) {
            console.warn(`Element #${elementId} not found for copying`);
            return;
        }
        
        const text = element.textContent;
        this.useFallbackCopyMethod(text, elementId);
    }
    
    /**
     * ✅ 폴백 복사 메서드
     */
    useFallbackCopyMethod(text, elementId) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.copySuccessFeedback(elementId);
            } else {
                this.showCookieMessage('Failed to copy', 'error');
            }
        } catch (err) {
            console.error('Fallback copy failed: ', err);
            this.showCookieMessage('Failed to copy', 'error');
        }
        document.body.removeChild(textarea);
    }
    
    /**
     * ✅ 복사 성공 피드백
     */
    copySuccessFeedback(elementId) {
        const btn = this.panelElement.querySelector(`.copy-btn[data-copy="${elementId}"]`);
        if (btn) {
            btn.classList.add('copied');
            this.showCookieMessage('Copied to clipboard!', 'success');
            setTimeout(() => {
                btn.classList.remove('copied');
            }, 1500);
        }
    }
    
    /**
     * ✅ 다운로드 버튼 초기화
     */
    initDownloadButton() {
        const downloadBtn = this.panelElement.querySelector('#download-html');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.downloadHtml();
            });
        }
    }
    
    /**
     * ✅ HTML 다운로드
     */
    downloadHtml() {
        console.log('📥 Download requested from panel');
		this.stateManager.downloadManager.downloadFullPage();
    }


	/**
     * ✅ 다운로드 버튼 초기화
     */
    initAccordionButton() {
        const accordcionBtn = this.panelElement.querySelector('#toggleBtn');
        if (accordcionBtn) {
            accordcionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleAccordion();
            });
        }
    }
    
	/*
    // ✅ 메시지 리스너 초기화
    initMessageListener() {
        window.addEventListener('message', this.handleMessage.bind(this));
    }
    
    // ✅ 메시지 처리
    handleMessage(event) {
        try {
            const data = event.data;
            console.log('📨 Panel received message:', data.type);
            
            switch(data.type) {
                case 'ELEMENT_INFO':
                    this.displayElementInfo(data.data);
                    break;
                   
                case 'SAVE_PANEL_POSITION':
                    this.savePanelPosition(data.position);
                    break;
                    
                case 'RESTORE_PANEL_POSITION':
                    this.restorePanelPosition();
                    break;
                    
                case 'TOGGLE_PANEL_VISIBILITY':
                    this.togglePanelVisibility(data.visible);
                    break;
                    
                default:
                    if (data.accordionType === 'basic-information') {
                        this.onOffSpecificAccordion(data.type, data.accordionType);
                    }
                    break;
            }
        } catch (error) {
            console.error('❌ Message handling error:', error);
        }
    }
    */

    /**
     * ✅ 키보드 이벤트 초기화
     */
	/*
    initKeyboardEvents() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    */
    /**
     * ✅ 키보드 입력 처리
     */
	/*
    handleKeyDown(e) {
        console.log('🔑 Keydown in panel:', e.key);
        
        if (e.key === 'Escape') {
            console.log('🚪 Escape key in panel - toggling visibility');
            this.stateManager.uiManager.togglePanelVisibility();
            e.stopPropagation();
            e.preventDefault();
            return;
        }
		
        if (e.ctrlKey && e.altKey && !e.shiftKey) {
            const key = e.key.toLowerCase();
            console.log(`⌨️ Panel shortcut: Ctrl+Alt+${key}`);

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
                console.log(`🔧 Sending mode toggle: ${modeMap[key]}`);
                this.postMessageToParent({
                    type: 'TOGGLE_MEASUREMENT_MODE_FROM_PANEL',
                    mode: modeMap[key]
                });
            }
            e.stopPropagation();
            e.preventDefault();
        }
		
    }
    */
    /**
     * ✅ 요소 정보 표시 - UI Manager의 displayElementInfoInPanel 기능 이전
     */
    // 핵심 기능들
    displayElementInfo(info) {
        try {
            console.log('🔄 Displaying element info:', info);
            
            let elementInfo;
            if (info instanceof Element) {
                elementInfo = this.convertElementToInfoObject(info);
            } else if (info && typeof info === 'object') {
                elementInfo = info;
            } else {
                console.error('❌ Invalid info type');
                return;
            }
            
            if (!this.isInitialized || !this.panelElement) {
                this.init();
                setTimeout(() => this.updatePanelInfo(elementInfo), 100);
                return;
            }
            
            this.showPanel();
            this.updatePanelInfo(elementInfo);
            
        } catch (error) {
            console.error('❌ Error displaying element info:', error);
        }
    }
    
    convertElementToInfoObject(element) {
        if (!element) return this.createEmptyInfoObject();
        
        try {
            const computedStyle = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            return {
                tagName: element.tagName ? element.tagName.toLowerCase() : 'unknown',
                id: element.id || 'none',
                classes: element.className || 'none',
                width: `${Math.round(rect.width)}px`,
                height: `${Math.round(rect.height)}px`,
                position: {
                    top: `${Math.round(rect.top)}px`,
                    left: `${Math.round(rect.left)}px`
                },
                margins: {
                    top: computedStyle.marginTop || '0px',
                    right: computedStyle.marginRight || '0px',
                    bottom: computedStyle.marginBottom || '0px',
                    left: computedStyle.marginLeft || '0px'
                },
                padding: {
                    top: computedStyle.paddingTop || '0px',
                    right: computedStyle.paddingRight || '0px',
                    bottom: computedStyle.paddingBottom || '0px',
                    left: computedStyle.paddingLeft || '0px'
                },
                font: {
                    family: computedStyle.fontFamily || 'inherit',
                    size: computedStyle.fontSize || '16px',
                    color: computedStyle.color || '#000000'
                },
                background: this.extractBackgroundInfo(computedStyle),
                html: element.outerHTML || 'No HTML content'
            };
            
        } catch (error) {
            console.error('❌ Error converting element:', error);
            return this.createEmptyInfoObject();
        }
    }
    
    /**
     * ✅ 배경 정보 추출 - 개선된 버전
     * 수정: 배경 색상과 이미지 정보를 더 정확하게 추출
     */
    extractBackgroundInfo(computedStyle) {
        const bgColor = computedStyle.backgroundColor || 'transparent';
        const bgImage = computedStyle.backgroundImage || 'none';
        
        // 색상 분석
        const colorInfo = this.analyzeColor(bgColor);
        
        // 이미지 분석 - 개선된 정보 추출
        const imageInfo = this.analyzeBackgroundImage(bgImage);
        
        return {
            color: bgColor,
            image: bgImage,
            detailed: {
                color: colorInfo,
                image: imageInfo,
                hasBackground: bgColor !== 'transparent' || bgImage !== 'none'
            }
        };
    }
    
    analyzeColor(color) {
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
            return { value: 'transparent', isTransparent: true, opacity: 0 };
        }
        
        try {
            const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
                
                return {
                    value: color,
                    isTransparent: a === 0,
                    opacity: a,
                    hex: this.rgbToHex(r, g, b),
                    rgb: a < 1 ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`
                };
            }
            
            // HEX 코드나 다른 형식 처리
            if (color.startsWith('#')) {
                return {
                    value: color,
                    isTransparent: false,
                    opacity: 1,
                    hex: color,
                    rgb: this.hexToRgb(color)
                };
            }
            
            return { value: color, isTransparent: false, opacity: 1 };
            
        } catch (error) {
            return { value: color, isTransparent: false, opacity: 1 };
        }
    }
    
    /**
     * ✅ 배경 이미지 분석 - 개선된 버전
     * 수정: 더 상세한 이미지 정보 추출
     */
    analyzeBackgroundImage(bgImage) {
        if (!bgImage || bgImage === 'none') {
            return { 
                hasImage: false, 
                type: 'none',
                displayText: 'No background image'
            };
        }
        
        if (bgImage.includes('gradient')) {
            const gradientType = bgImage.includes('linear-gradient') ? 'linear' : 
                               bgImage.includes('radial-gradient') ? 'radial' : 'gradient';
            return { 
                hasImage: true, 
                type: 'gradient', 
                isGradient: true,
                gradientType: gradientType,
                displayText: `${gradientType} gradient`,
                fullValue: bgImage
            };
        }
        
        const urlMatch = bgImage.match(/url\(["']?([^"']+)["']?\)/);
        if (urlMatch) {
            const imageUrl = urlMatch[1];
            const shortUrl = imageUrl.length > 30 ? imageUrl.substring(0, 30) + '...' : imageUrl;
            
            return { 
                hasImage: true, 
                type: 'image', 
                url: imageUrl,
                shortUrl: shortUrl,
                isExternal: imageUrl.startsWith('http'),
                displayText: shortUrl,
                fullValue: bgImage
            };
        }
        
        return { 
            hasImage: true, 
            type: 'unknown',
            displayText: 'Background image',
            fullValue: bgImage
        };
    }
    
    /**
     * ✅ 패널 정보 업데이트
     * 수정: 배경 정보 표시 개선
     */
    updatePanelInfo(info) {
        if (!this.panelElement) return;
        
        this.currentInfo = info;
        
        const setText = (id, text) => {
            const el = this.panelElement.querySelector(`#${id}`);
            if (el) el.textContent = text || 'N/A';
        };
        
        const setPre = (id, text) => {
            const el = this.panelElement.querySelector(`#${id}`);
            if (el) el.textContent = text || 'No element selected';
        };
        
        // 기본 정보
        setText('info-tag', info.tagName);
        setText('info-id', info.id);
        setPre('info-classes', info.classes);
        
        // 크기 정보
        setText('info-width', info.width);
        setText('info-height', info.height);
        setText('info-position', `Top: ${info.position.top}, Left: ${info.position.left}`);
        
        // 여백 정보
        setText('info-margin', `${info.margins.top} ${info.margins.right} ${info.margins.bottom} ${info.margins.left}`);
        setText('info-padding', `${info.padding.top} ${info.padding.right} ${info.padding.bottom} ${info.padding.left}`);
        
        // 타이포그래피
        setPre('info-font', info.font.family);
        setText('info-font-size', info.font.size);
        setText('info-color', info.font.color);
        
        // 배경 정보 - 개선된 표시
        this.updateBackgroundInfo(info.background);
        
        // CSS & HTML
        setPre('info-css', this.formatCSS(info));
        setPre('info-html', this.formatHtml(info.html));
    }
    
    /**
     * ✅ 배경 정보 업데이트 - 개선된 버전
     * 수정: 배경 색상과 이미지 정보를 더 명확하게 표시
     */
    updateBackgroundInfo(background) {
        if (!background) return;
        
        const setText = (id, text) => {
            const el = this.panelElement.querySelector(`#${id}`);
            if (el) el.textContent = text || 'N/A';
        };
        
        const setSubtext = (id, text) => {
            const el = this.panelElement.querySelector(`#${id}`);
            if (el) el.textContent = text || '';
        };
        
        // 배경색 - 개선된 표시
        if (background.detailed?.color) {
            const color = background.detailed.color;
            if (color.isTransparent) {
                setText('info-bg-color', 'transparent');
                setSubtext('info-bg-color-details', 'Fully transparent');
            } else {
                setText('info-bg-color', color.hex || color.value);
                setSubtext('info-bg-color-details', 
                    color.rgb ? `${color.rgb} • ${color.hex || ''}` : color.value
                );
            }
        } else {
            setText('info-bg-color', background.color);
            setSubtext('info-bg-color-details', '');
        }
        
        // 배경이미지 - 개선된 표시
        if (background.detailed?.image) {
            const image = background.detailed.image;
            if (image.hasImage) {
                setText('info-bg-image', image.displayText || 'Background image');
                
                if (image.isGradient) {
                    setSubtext('info-bg-image-details', `${image.gradientType} gradient`);
                } else if (image.isExternal !== undefined) {
                    setSubtext('info-bg-image-details', image.isExternal ? 'External image' : 'Local image');
                } else {
                    setSubtext('info-bg-image-details', 'Background image');
                }
            } else {
                setText('info-bg-image', 'No background image');
                setSubtext('info-bg-image-details', '');
            }
        } else {
            setText('info-bg-image', background.image === 'none' ? 'No background image' : background.image);
            setSubtext('info-bg-image-details', '');
        }
    }
    
    // 유틸리티 함수들
    rgbToHex(r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

	// HEX to RGB 변환 유틸리티 함수 추가
    hexToRgb(hex) {
        // HEX 코드 정규화
        hex = hex.replace(/^#/, '');
        
        // 3자리 HEX 처리
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return `rgb(${r},${g},${b})`;
    }
    
    createEmptyInfoObject() {
        return {
            tagName: 'unknown',
            id: 'none',
            classes: 'none',
            width: 'N/A',
            height: 'N/A',
            position: { top: 'N/A', left: 'N/A' },
            margins: { top: 'N/A', right: 'N/A', bottom: 'N/A', left: 'N/A' },
            padding: { top: 'N/A', right: 'N/A', bottom: 'N/A', left: 'N/A' },
            font: { family: 'N/A', size: 'N/A', color: 'N/A' },
            background: { color: 'N/A', image: 'N/A', detailed: { color: {}, image: {} } },
            html: 'No HTML content'
        };
    }
    
    formatCSS(info) {
        let css = '';
        if (info.font?.family && info.font.family !== 'inherit') css += `font-family: ${info.font.family};\n`;
        if (info.font?.size && info.font.size !== '16px') css += `font-size: ${info.font.size};\n`;
        if (info.font?.color && info.font.color !== '#000000') css += `color: ${info.font.color};\n`;
        if (info.background?.color && info.background.color !== 'transparent') css += `background-color: ${info.background.color};\n`;
        return css || 'No CSS properties available';
    }
    
    formatHtml(html) {
        if (!html || html.trim() === '') return 'No HTML content';
        return html;
    }
    


	/**
	 * ✅ 아코디언 토글 - 간단한 상태 확인 후 열기/닫기
	 */
	toggleAccordion() {
		console.log('🎯 토글 실행 - UI 상태 완전 제어');
		
		const panelContent = this.panelElement.querySelector('#panelContent');
		
		if (!panelContent) {
			console.error('❌ panelContent 없음');
			return;
		}
		
		const isVisible = !panelContent.classList.contains('hidden');
		
		console.log('📊 현재 상태:', isVisible ? '열림' : '닫힘');
		
		if (isVisible) {
			// ✅ 닫기 - 모든 UI 요소 비활성화
			this.closeAccordion();
		} else {
			// ✅ 열기 - 모든 UI 요소 활성화
			this.openAccordion();
		}
		
		console.log('✅ 토글 완료 - UI 상태 전환됨');
	}
	

    /**
     * ✅ 특정 아코디언 열기/닫기
     */
    onOffSpecificAccordion(action, accordionType) {
        console.log('🔍 open or close SpecificAccordion called with:', action, accordionType);

        if (accordionType === 'basic-information') {
            if(action === 'OPEN_ACCORDION') {
                console.log('---------------------------------------- 열기');
                const accordionSections = this.panelElement.querySelectorAll('.accordion-section');
                const targetSection = accordionSections[0]; // 첫 번째 섹션 (Basic Information)
                if (targetSection) {
                    targetSection.classList.add('active');
                    const content = targetSection.querySelector('.accordion-content');
                    const icon = targetSection.querySelector('.accordion-icon');

                    if (content) content.classList.add('active');
                    if (icon) icon.style.transform = 'rotate(180deg)';
                }
            } else {
                this.resetInfoDisplay();
                console.log('---------------------------------------- 닫기');
                
                const basicInfoSection = this.panelElement.querySelector('.accordion-section:nth-child(1)');
                if (basicInfoSection) {
                    basicInfoSection.classList.remove('active');
                    const content = basicInfoSection.querySelector('.accordion-content');
                    const icon = basicInfoSection.querySelector('.accordion-icon');

                    if (content) content.classList.remove('active');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
                
                this.postMessageToParent({
                    type: 'TGLPNL_CLOSE'
                });
            }
        }
    }
    
    /**
     * ✅ 정보 표시 초기화
     */
    resetInfoDisplay() {
        console.log('🔄 Resetting element info display...');
        
        const infoFields = {
            'info-tag': 'N/A',
            'info-id': 'N/A',
            'info-classes': 'N/A',
            'info-type': 'N/A',
            'info-width': 'N/A',
            'info-height': 'N/A',
            'info-position': 'N/A',
            'info-margin': 'N/A',
            'info-padding': 'N/A',
            'info-font': 'N/A',
            'info-font-size': 'N/A',
            'info-color': 'N/A',
            'info-bg-color': 'N/A',
            'info-bg-image': 'N/A',
            'info-css': 'No CSS properties available',
            'info-html': 'No HTML content'
        };
        
        Object.keys(infoFields).forEach(fieldId => {
            try {
                const element = this.panelElement.querySelector(`#${fieldId}`);
                if (element) {
                    element.textContent = infoFields[fieldId];
                }
            } catch (error) {
                console.warn(`⚠️ Error resetting ${fieldId}:`, error);
            }
        });
        
        console.log('✅ Element info display reset with default values');
    }
    
    /**
     * ✅ 패널 표시/숨김 - UI Manager의 showPanel/hidePanel 기능 이전
     */
    showPanel() {
        
		// 패널이 없거나 DOM에 없으면 재생성
		if (!this.panelElement || !document.body.contains(this.panelElement)) {
			this.createPanel();
			
			// 재생성 후에도 없으면 에러
			if (!this.panelElement) {
				console.error('❌ Panel creation failed');
				return;
			}
		}
		
		// 표시 보장
		this.panelElement.style.display = 'block';
		this.panelElement.style.visibility = 'visible';
		this.panelElement.style.opacity = '1';
		
		console.log('✅ Panel shown successfully');
    }

    hidePanel() {
        if (this.panelElement) {
            console.log('👁️ Hiding panel');
            this.panelElement.style.display = 'none';
        }
    }
    
    /**
     * ✅ 패널 토글 - UI Manager의 togglePanelVisibility 기능 이전
     */
    togglePanelVisibility() {
        if (!this.panelElement) return;

        const isPanelVisible = this.panelElement.style.display !== 'none';
        
        if (isPanelVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }
    
    /**
     * ✅ 패널 가시성 설정
     */
    togglePanelVisibilityOnOff(visible) {
        if (!this.panelElement) return;

        if (visible) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    }
    
    /**
     * ✅ 쿠키 메시지 표시
     */
    showCookieMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `cookie-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2ed573' : '#ff4757'};
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 12px;
        `;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                document.body.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    /**
     * ✅ 부모 창에 메시지 전송
     */
    postMessageToParent(message) {
        if (window.parent && window.parent !== window) {
            try {
                window.parent.postMessage(message, '*');
            } catch (error) {
                console.log('Post message error:', error);
            }
        }
    }
    
    
    /**
     * ✅ 패널 제거
     */
    removePanel() {
        if (this.panelElement && this.panelElement.parentNode) {
            this.panelElement.parentNode.removeChild(this.panelElement);
            this.panelElement = null;
        }
    }
    
    /**
     * ✅ 정리
     */
    cleanup() {
        console.log('🧹 Cleaning up panel...');
        this.removePanel();
        
        // 스타일 제거
        const styles = document.getElementById('web-inspector-panel-styles');
        if (styles && styles.parentNode) {
            styles.parentNode.removeChild(styles);
        }
        
        this.isInitialized = false;
        console.log('✅ Panel cleaned up');
    }

	//########################################################################################################################
	/**
	 * ✅ 티스토리 전용 강제 드래그 시스템
	 */
	setupTistoryDragSystem() {
		console.log('💥 Setting up ULTIMATE TISTORY drag system...');
		
		const dragHandle = this.panelElement.querySelector('#panelDragHandle');
		if (!dragHandle) return;
		
		// 1. 모든 기존 이벤트 리스너 제거
		this.removeAllExistingListeners(dragHandle);
		
		// 2. 원시 마우스 이벤트 시스템 구축
		this.setupRawMouseSystem(dragHandle);
		
		// 3. 티스토리 방어 실시간 무력화
		this.startTistoryDefenseBypass();
	}

	/**
	 * ✅ 티스토리 방어 실시간 무력화
	 */
	startTistoryDefenseBypass() {
		// 1. 지속적인 스타일 재주입
		setInterval(() => {
			this.injectNuclearStyles();
		}, 300);
		
		// 2. MutationObserver로 티스토리의 스타일 변경 감지 및 무력화
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
					// 패널 스타일이 변경되면 즉시 복원
					if (this.isPanelRelated(mutation.target)) {
						this.restorePanelStyles();
					}
				}
			});
		});
		
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['style'],
			subtree: true
		});
	}

	/**
	 * ✅ 핵무기급 스타일 주입
	 */
	injectNuclearStyles() {
		const styleId = 'nuclear-drag-styles';
		let style = document.getElementById(styleId);
		
		if (!style) {
			style = document.createElement('style');
			style.id = styleId;
			document.head.appendChild(style);
		}
		
		style.textContent = `
			/* 티스토리의 모든 시도 무력화 */
			#web-inspector-panel {
				user-select: auto !important;
				-webkit-user-select: auto !important;
				-webkit-user-drag: auto !important;
				pointer-events: auto !important;
				cursor: auto !important;
			}
			
			#panelDragHandle {
				user-select: auto !important;
				-webkit-user-select: auto !important;
				-webkit-user-drag: auto !important;
				pointer-events: auto !important;
				cursor: move !important;
				touch-action: none !important;
			}
			
			/* 티스토리의 body 레벨 제한 무력화 */
			body {
				user-select: auto !important;
				-webkit-user-select: auto !important;
			}
			
			/* 모든 요소에 대한 강제 드래그 허용 */
			* {
				user-select: auto !important;
				-webkit-user-select: auto !important;
			}
		`;
	}


	/**
	 * ✅ 패널 스타일 복원
	 */
	restorePanelStyles() {
		if (!this.panelElement) return;
		
		this.panelElement.style.userSelect = 'auto';
		this.panelElement.style.webkitUserSelect = 'auto';
		this.panelElement.style.pointerEvents = 'auto';
		this.panelElement.style.cursor = 'auto';
		
		const dragHandle = this.panelElement.querySelector('#panelDragHandle');
		if (dragHandle) {
			dragHandle.style.cursor = 'move';
			dragHandle.style.userSelect = 'auto';
			dragHandle.style.webkitUserSelect = 'auto';
		}
	}
	/**
	 * ✅ 모든 기존 이벤트 리스너 제거
	 */
	removeAllExistingListeners(element) {
		const clone = element.cloneNode(true);
		element.parentNode.replaceChild(clone, element);
		return clone;
	}

	/**
	 * ✅ 원자적인 스타일 주입 (지속적 재적용)
	 */
	injectAtomicStyles() {
		// 기존 스타일 제거
		const existing = document.getElementById('tistory-drag-atomic');
		if (existing) existing.remove();
		
		const style = document.createElement('style');
		style.id = 'tistory-drag-atomic';
		style.textContent = `
			/* 모든 것을 무시하는 최우선 스타일 */
			#web-inspector-panel {
				user-select: auto !important;
				-webkit-user-select: auto !important;
				-webkit-user-drag: auto !important;
				pointer-events: auto !important;
				all: initial !important;
			}
			
			#web-inspector-panel * {
				user-select: auto !important;
				-webkit-user-select: auto !important;
				-webkit-user-drag: auto !important;
				pointer-events: auto !important;
				box-sizing: border-box !important;
			}
			
			/* 드래그 핸들러 - 절대적 제어 */
			#panelDragHandle {
				user-select: auto !important;
				-webkit-user-select: auto !important;
				-webkit-user-drag: auto !important;
				pointer-events: auto !important;
				cursor: move !important;
				touch-action: none !important;
				-webkit-touch-callout: none !important;
				-webkit-tap-highlight-color: transparent !important;
				all: initial !important;
			}
			
			/* 티스토리의 모든 시도 무력화 */
			body * {
				user-select: auto !important;
				-webkit-user-select: auto !important;
			}
		`;
		
		document.head.appendChild(style);
		
		// 지속적 재주입
		setInterval(() => {
			if (!document.getElementById('tistory-drag-atomic')) {
				this.injectAtomicStyles();
			}
		}, 500);
	}

	

	/**
	 * ✅ 패널 관련 요소 확인 (강화된 버전)
	 */
	isPanelRelated(element) {
		if (!element) return false;
		
		// 빠른 확인
		if (element === this.panelElement) return true;
		if (element.id === 'web-inspector-panel') return true;
		if (element.getAttribute && element.getAttribute('data-inspector-panel')) return true;
		
		// 클로짓 활용 (더 안정적)
		if (element.closest) {
			return !!element.closest('#web-inspector-panel') || 
				!!element.closest('[data-inspector-panel]');
		}
		
		// 수동 부모 탐색
		let current = element;
		while (current && current !== document.documentElement) {
			if (current.id === 'web-inspector-panel' || 
				(current.getAttribute && current.getAttribute('data-inspector-panel'))) {
				return true;
			}
			current = current.parentElement;
		}
		
		return false;
	}
	//###############################################################################################################
}
/*
// ✅ 글로벌 접근을 위한 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElementInfo;
} else {
    window.ElementInfo = ElementInfo;
}
*/
console.log('🎉 Panel class loaded successfully!');