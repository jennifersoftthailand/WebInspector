// ui-manager.js
class UIManager {


	constructor(stateManager, elementAnalyzer, toggleManager) {
		console.log('🎨 UIManager initializing...');

		if (!stateManager) {
			throw new Error('UIManager requires StateManager instance');
		}

		this.stateManager = stateManager; // ✅ 별도 변수에도 저장
		this.elementAnalyzer = elementAnalyzer;
		//this.rulerSystem = rulerSystem;
		this.toggleManager = toggleManager;
		
		//this.stateManagerManager = stateManager; 
		console.log('✅ UIManager initialized');
	}

	//########################################################################################################################>>> START
	/**
	 * ✅ [통합] completeCleanup - 모든 컴포넌트에서 통일
	 */
	completeCleanup() {
		console.log('🧹 UIManager: Complete cleanup...');
		this.cleanup(); // 기존 cleanup 호출
		
		console.log('✅ UIManager completely cleaned up');
	}

	/**
	 * ✅ [내부] _handleIframeOverlay - private 함수로 변경
	 */
	_handleIframeOverlay(rect, scrollX, scrollY, element) {
		// ✅ borderRadius 표시가 이미 있다면 추가로 생성하지 않음
		const existingIndicators = document.querySelectorAll('.corner-radius-indicator');
		let hasExistingIndicator = false;

		existingIndicators.forEach(indicator => {
			const indicatorRect = indicator.getBoundingClientRect();
			if (Math.abs(indicatorRect.left - (rect.left + scrollX)) < 5 &&
				Math.abs(indicatorRect.top - (rect.top + scrollY)) < 5) {
				hasExistingIndicator = true;
			}
		});

		if (hasExistingIndicator) {
			return null;
		}

		// ✅ 웹 인스펙터 패널 요소는 오버레이 생성하지 않음
		if (this.elementAnalyzer.isWebInspectorPanelElement(element)) {
			return null;
		}

		// ✅ 기존 iframe/광고 오버레이 로직
		const existingOverlay = Array.from(this.stateManager.iframeOverlays).find(overlay => {
			const overlayRect = overlay.getBoundingClientRect();
			return Math.abs(overlayRect.left - rect.left) < 2 &&
				Math.abs(overlayRect.top - rect.top) < 2 &&
				Math.abs(overlayRect.width - rect.width) < 2 &&
				Math.abs(overlayRect.height - rect.height) < 2;
		});

		if (existingOverlay) {
			// ✅ 기존 오버레이 위치 업데이트 (스크롤 대응)
			this.updateOverlayPosition(existingOverlay, element);
			return existingOverlay;
		}

		const iframeOverlay = this.createNewIframeOverlay(rect, scrollX, scrollY, element);

		// ✅ 스크롤 고정 요소 감지 및 추적 추가
		if (this.isStickyOrFixedElement(element)) {
			this.trackStickyElement(element, iframeOverlay);
		}

		document.body.appendChild(iframeOverlay);
		this.stateManager.iframeOverlays.push(iframeOverlay);

		return iframeOverlay;
	}

	 completeCleanup() {
        console.log('🧹 UIManager cleaning up...');
        this.removeAllUIElements();
        this.stateManager = null;
        this.elementAnalyzer = null;
        this.toggleManager = null;
        console.log('✅ UIManager cleaned up');
    }

	//########################################################################################################################>>> END



   


	// ui-manager.js에 웹사이트 레이아웃 업데이트 함수 추가
	updateWebsiteLayout() {
		if (typeof updateWebsiteLayout === 'function') {
			updateWebsiteLayout();
		} else {
			console.log('⚠️ updateWebsiteLayout function not available');
		}
	}

	toggleMeasuring() {
		this.stateManager.isMeasuringActive = !this.stateManager.isMeasuringActive;
		if (this.stateManager.isMeasuringActive) {
			this.elementAnalyzer.updateMeasurements();
		} else {
			this.removeMeasurements();
		}
	}

	// 모드 전환 함수들
	// ✅ 수정: toggleMeasurementMode 함수 - 즉시 룰러 버튼 업데이트 추가, 실제 기능 적용 부분 추가, 기존 저장 함수 활용
	// ✅ toggleMeasurementModeManager 기존 함수 활용,  활성화 상태 확인
	// ✅ [수정] 측정 모드 토글 - StateManager에 모든 로직 위임, iframe-overlay 통합 처리	
	toggleMeasurementModeManager(mode) {
		console.log(`🎯 UI Manager toggling mode: ${mode}`);
		
		// ✅ StateManager에 모든 로직 위임
		const newState = this.stateManager.saveToggleMeasurementMode(mode);
		
		// ✅ UI 업데이트 및 기능 실행
		this.handleMeasurementModeChange(mode, newState);
		
		// ✅ [추가] 즉시 측정 업데이트 (단축키 반응성 향상)
		if (this.elementAnalyzer) {
			setTimeout(() => {
				this.elementAnalyzer.updateMeasurements();
			}, 10);
		}
		
		return newState;
	}
	// ✅ [추가] 패널 가시성 토글 함수
	togglePanelVisibility() {
		const isVisible = this.isPanelVisibleSimple();
		console.log('isVisible ============================== >>>> '+isVisible);
		this.stateManager.elementInfo.togglePanelVisibility();
	}

	// ✅ [추가] 단순화된 가시성 체크 (가장 효과적)
	isPanelVisibleSimple() {
		if (!this.stateManager.panelFrame) return false;
		
		const panel = this.stateManager.panelFrame;
		
		// 계산된 스타일로 visibility 체크 (가장 신뢰성 높음)
		const computedVisibility = window.getComputedStyle(panel).visibility;
		const computedDisplay = window.getComputedStyle(panel).display;
		
		const isVisible = (
			computedVisibility !== 'hidden' && 
			computedDisplay !== 'none' &&
			panel.style.transform !== 'translateX(100%)' &&
			panel.style.transform !== 'translateX(-100%)'
		);
		
		console.log(`🔍 Visibility check:`, {
			computedVisibility,
			computedDisplay,
			transform: panel.style.transform,
			isVisible
		});
		
		return isVisible;
	}

	

	
	// ✅ [수정] 측정 모드 변경 시 UI 처리 - iframe-overlay 통합, 동기화
	handleMeasurementModeChange(mode, isActive) {
		console.log(`🎯 Handling UI for ${mode} mode change: ${isActive}`);
		
		// ✅ 모든 모드 공통 처리: 측정값 업데이트
		this.elementAnalyzer.removeCurrentMeasurements();
		this.elementAnalyzer.removeExternalElementHighlights();

		// ✅ 모드별 특수 처리
		switch (mode) {
			case 'iframeOverlay':
				if (isActive) {
					console.log('🎯 Creating iframe overlays');
					this.initializeIframeOverlays();
				} else {
					console.log('🎯 Removing iframe overlays');
					this.removeIframeOverlaysOnly();
				}
				break;
				
			default:
				// ✅ 다른 모드들은 측정값 업데이트만 수행
				if (this.stateManager.selectedElement || this.stateManager.currentElement) {
					// ✅ [수정] 즉시 실행 (setTimeout 제거)
					this.elementAnalyzer.updateMeasurements();
				}
		}

		console.log(`✅ ${mode} mode UI handling completed`);
	}

	
	// ✅ 수정: toggleAdvancedFeature 함수 - iframe 오버레이 통합 처리
	// ✅ 수정: toggleAdvancedFeature 함수 - iframe 오버레이 처리 간소화
	toggleAdvancedFeature(feature, enabled) {
		console.log(`🎯 Toggling ${feature} to ${enabled}`);

		// ✅ StateManager를 통해 상태 토글
		const newState = this.stateManager.toggleAdvancedFeature(feature);
		
		console.log(`✅ ${feature} state after toggle: ${newState}`);

		// ✅ iframeOverlay는 이제 측정 모드에서 처리하므로 여기서는 제거
		// storage에 강제 저장 (패널 위치와 동일)
		chrome.storage.sync.set(this.stateManager.options, () => {
			console.log(`✅ ${feature} state saved to storage: ${newState}`);
		});
		
		return newState;
	}


	//-----------------------------------------------------------------------------------------------------------------

	removeMeasurements() {
		console.log('🔄 removeMeasurements called - preserving selected element');

		// ✅ elementAnalyzer의 함수를 사용 (선택된 요소 보존)
		if (this.elementAnalyzer && typeof this.elementAnalyzer.removeCurrentMeasurements === 'function') {
			this.elementAnalyzer.removeCurrentMeasurements();
		}
	}

	isInspectorElement(element) {
		if (!element) return false;

		if (element.__webInspectorCreated) {
			return true;
		}

		if (window.__webInspectorStartTime && element.__creationTime) {
			if (element.__creationTime > window.__webInspectorStartTime) {
				return true;
			}
		}

		try {
			const style = window.getComputedStyle(element);
			const zIndex = parseInt(style.zIndex);

			if (!isNaN(zIndex) && zIndex >= 2147483620 && zIndex <= 2147483647) {
				return true;
			}
		} catch (e) {
			// 무시
		}

		return false;
	}

	
	//#####################################################################################################################

	// 모든 UI 요소 생성
	// ui-manager.js - createUIElements 함수에 코너 영역 생성 추가 main에서 호출...
	// ✅ [수정] UI 요소 생성 함수 - 활성화 상태 확인
	createUIElements() {
		
		// ✅ 활성화되지 않았으면 UI 생성하지 않음
		if (!this.stateManager.isInspectorActive) {
			console.log('🔄 Inspector not active, skipping UI creation');
			return;
		}

		console.log('🛠️ Creating all UI elements...');

		// ✅ 룰러 먼저 생성 (버튼 포함)
		//this.createRulers();
		
		// ✅ 나머지 UI 요소 생성
		this.createAd();
		this.createCoordTooltip();

		// ✅ [수정] iframe 오버레이 즉시 생성 (조건 확인)
		setTimeout(() => {
			if (this.shouldShowIframeOverlays()) {
				console.log('🎯 Immediately creating iframe overlays during UI creation');
				this.initializeIframeOverlays();
			} else {
				console.log('⏭️ Skipping iframe overlays during UI creation (conditions not met)');
			}
		}, 100);
	}
	
	
	// 광고 생성
	createAd() {
		let adContainer = document.getElementById('ad-container');
		if (adContainer) {
			this.updateAdPosition();
			return;
		}

		adContainer = document.createElement('div');
		adContainer.id = 'ad-container';

		adContainer.innerHTML = `
            <div style="width:100%; height:100%; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    display:flex; flex-direction:column; align-items:center; justify-content:center; 
                    borderRadius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.2); color:white; font-family:Arial, sans-serif;">
                <div style="font-size:16px; font-weight:bold; margin-bottom:8px;">Premium Web Tools</div>
                <div style="font-size:12px; text-align:center; padding:0 10px;">
                    Upgrade for advanced features<br>and ad-free experience
                </div>
                <div style="margin-top:12px; padding:6px 12px; background:white; color:#667eea; 
                        borderRadius:4px; font-size:11px; font-weight:bold; cursor:pointer;">
                    Learn More
                </div>
            </div>
        `;

		adContainer.style.position = 'fixed';
		adContainer.style.width = '200px';
		adContainer.style.height = '140px';
		adContainer.style.borderRadius = '8px';
		adContainer.style.overflow = 'hidden';
		adContainer.style.transition = 'all 0.3s ease';
		adContainer.style.zIndex = this.stateManager.Z_INDEX_LAYERS.AD_CONTAINER;

		// 초기 위치: 왼쪽 하단
		adContainer.style.left = '23px';
		adContainer.style.right = 'auto';
		adContainer.style.bottom = '23px';

		document.body.appendChild(adContainer);
		this.updateAdPosition();

		this.stateManager.trackElement(adContainer);
	}

	// 광고 위치 업데이트
	updateAdPosition() {
		const adContainer = document.getElementById('ad-container');
		if (!adContainer) return;

		const panelVisible = this.stateManager.panelFrame &&
			this.stateManager.panelFrame.style.visibility !== 'hidden' &&
			this.stateManager.panelFrame.style.transform !== 'translateX(-100%)' &&
			this.stateManager.panelFrame.style.transform !== 'translateX(100%)';

		const yRulerOffset = 23;
		const xRulerOffset = 23;

		if (panelVisible) {
			if (this.stateManager.options.panelPosition === 'left') {
				adContainer.style.left = 'auto';
				adContainer.style.right = `${yRulerOffset}px`;
				adContainer.style.bottom = `${xRulerOffset}px`;
			} else {
				adContainer.style.left = `${yRulerOffset}px`;
				adContainer.style.right = 'auto';
				adContainer.style.bottom = `${xRulerOffset}px`;
			}
		} else {
			adContainer.style.left = `${yRulerOffset}px`;
			adContainer.style.right = 'auto';
			adContainer.style.bottom = `${xRulerOffset}px`;
		}

		adContainer.style.display = 'block';
	}
	

	// 좌표 툴팁 생성
	createCoordTooltip() {
		if (this.stateManager.coordTooltip && this.stateManager.coordTooltip.parentNode) {
			try {
				this.stateManager.coordTooltip.parentNode.removeChild(this.stateManager.coordTooltip);
			} catch (e) { }
		}

		const existingCoords = document.querySelectorAll('#coord-tooltip');
		existingCoords.forEach(coord => {
			if (coord.parentNode) {
				coord.parentNode.removeChild(coord);
			}
		});
		
		this.stateManager.coordTooltip = document.createElement('div');
		this.stateManager.coordTooltip.id = 'coord-tooltip';
		this.stateManager.coordTooltip.style.position = 'fixed';
		this.stateManager.coordTooltip.style.zIndex = '10060';
		this.stateManager.coordTooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
		this.stateManager.coordTooltip.style.color = 'white';
		this.stateManager.coordTooltip.style.padding = '5px 10px';
		this.stateManager.coordTooltip.style.borderRadius = '4px';
		this.stateManager.coordTooltip.style.fontSize = '12px';
		this.stateManager.coordTooltip.style.fontFamily = 'monospace';
		this.stateManager.coordTooltip.style.display = 'block';
		this.stateManager.coordTooltip.style.cursor = 'move';
		this.stateManager.coordTooltip.style.userSelect = 'none';
		this.stateManager.coordTooltip.style.minWidth = '120px';
		this.stateManager.coordTooltip.style.maxWidth = '180px';
		this.stateManager.coordTooltip.style.textAlign = 'center';
		this.stateManager.coordTooltip.style.willChange = 'transform';

		this.stateManager.coordTooltip.textContent = 'X: 0 px, Y: 0 px';
		this.updateCoordTooltipPosition();

		let isDragging = false;
		let startX = 0;
		let startY = 0;
		let initialX = 0;
		let initialY = 0;

		// ✅ 마우스 다운 이벤트
		this.stateManager.coordTooltip.addEventListener('mousedown', (e) => {
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			initialX = this.stateManager.coordTooltip.offsetLeft;
			initialY = this.stateManager.coordTooltip.offsetTop;
			
			this.stateManager.coordTooltip.style.opacity = '0.7';
			this.stateManager.coordTooltip.style.cursor = 'grabbing';
			
			e.preventDefault();
			e.stopPropagation();
		});

		// ✅ 마우스 이동 이벤트
		const handleMouseMove = (e) => {
			if (!isDragging) return;
			
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			
			const newX = initialX + dx;
			const newY = initialY + dy;
			
			// ✅ 뷰포트 경계 체크
			const maxX = window.innerWidth - this.stateManager.coordTooltip.offsetWidth;
			const maxY = window.innerHeight - this.stateManager.coordTooltip.offsetHeight;
			
			this.stateManager.coordTooltip.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
			this.stateManager.coordTooltip.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
			this.stateManager.coordTooltip.style.right = 'auto'; // ✅ left 사용시 right 해제
		};

		// ✅ 마우스 업 이벤트
		const handleMouseUp = () => {
			if (!isDragging) return;
			
			isDragging = false;
			this.stateManager.coordTooltip.style.opacity = '1';
			this.stateManager.coordTooltip.style.cursor = 'move';
			
			// ✅ 이벤트 리스너 제거
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		// ✅ 마우스 다운 시에만 이벤트 리스너 등록
		this.stateManager.coordTooltip.addEventListener('mousedown', (e) => {
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			initialX = this.stateManager.coordTooltip.offsetLeft;
			initialY = this.stateManager.coordTooltip.offsetTop;
			
			this.stateManager.coordTooltip.style.opacity = '0.7';
			this.stateManager.coordTooltip.style.cursor = 'grabbing';
			
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			
			e.preventDefault();
			e.stopPropagation();
		});

		this.stateManager.trackElement(this.stateManager.coordTooltip);
		document.body.appendChild(this.stateManager.coordTooltip);
	}

	// 좌표 툴팁 위치 업데이트
	updateCoordTooltipPosition() {
		if (!this.stateManager.coordTooltip) return;

		const panelVisible = this.stateManager.panelFrame &&
			this.stateManager.panelFrame.style.visibility !== 'hidden' &&
			this.stateManager.panelFrame.style.transform !== 'translateX(-100%)' &&
			this.stateManager.panelFrame.style.transform !== 'translateX(100%)';

		
		const yRulerOffset = 5;  // Y축 룰러 너비 + 여유
		const xRulerOffset = 5;  // X축 룰러 전체 높이 + 여유

		if (panelVisible) {
			if (this.stateManager.options.panelPosition === 'left') {
				this.stateManager.coordTooltip.style.left = 'auto';
				this.stateManager.coordTooltip.style.right = `${yRulerOffset}px`;
				this.stateManager.coordTooltip.style.top = `${xRulerOffset}px`;
			} else {
				this.stateManager.coordTooltip.style.left = `${yRulerOffset}px`;
				this.stateManager.coordTooltip.style.right = 'auto';
				this.stateManager.coordTooltip.style.top = `${xRulerOffset}px`;
			}
		} else {
			this.stateManager.coordTooltip.style.left = `${yRulerOffset}px`;
			this.stateManager.coordTooltip.style.right = 'auto';
			this.stateManager.coordTooltip.style.top = `${xRulerOffset}px`;
		}

		this.stateManager.coordTooltip.style.display = 'block';
	}


	/*
	 * ✅ [수정] initializeIframeOverlays - 오버레이 초기화, 내부 함수 호출 업데이트
	 */
	initializeIframeOverlays() {
		// ✅ [수정] 활성화 상태 확인 - activeModes만 확인
		if (!this.stateManager.isInspectorActive) {
			console.log('🔄 Inspector not active, skipping iframe overlay creation');
			return;
		}

		console.log('🎯 Creating iframe overlays...');

		// ✅ [수정] 상태 확인 단순화 - activeModes만 확인
		const shouldCreateOverlays = this.stateManager.activeModes.has('iframeOverlay');

		console.log('🔍 iframe overlay creation check:', {
			activeModes: this.stateManager.activeModes.has('iframeOverlay'),
			shouldCreate: shouldCreateOverlays
		});

		if (!shouldCreateOverlays) {
			console.log('❌ iframe overlays disabled in active modes, skipping creation');
			return;
		}

		// ✅ 기존 iframe 오버레이 제거
		this.removeIframeOverlaysOnly();

		// ✅ 모든 iframe 요소에 오버레이 생성
		const iframes = document.querySelectorAll('iframe');
		console.log(`🔍 Found ${iframes.length} iframes on page`);
		
		let createdCount = 0;
		iframes.forEach(iframe => {
			// ✅ 웹 인스펙터 패널 iframe은 제외
			if (this.isWebInspectorIframe(iframe)) {
				console.log('⏭️ Skipping web inspector panel iframe');
				return;
			}

			const rect = iframe.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				const overlay = this._handleIframeOverlay(rect, window.scrollX, window.scrollY, iframe); // ✅ _handleIframeOverlay로 변경
				if (overlay) {
					createdCount++;
				}
			}
		});

		console.log(`✅ Created ${createdCount} iframe overlays`);
	}


	/**
	 * ✅ [수정] iframe 오버레이 표시 여부 확인 함수
	 * 모든 상태가 일치할 때만 true 반환
	 */
	shouldShowIframeOverlays() {
		// ✅ [수정] activeModes만 확인 (단순화)
		const shouldShow = (
			this.stateManager.activeModes.has('iframeOverlay') &&
			this.stateManager.isInspectorActive
		);

		console.log('🔍 iframe overlay display check:', {
			activeModes: this.stateManager.activeModes.has('iframeOverlay'),
			isInspectorActive: this.stateManager.isInspectorActive,
			result: shouldShow
		});

		return shouldShow;
	}
	

	// ✅ 추가: 웹 인스펙터 자체 iframe인지 확인하는 함수
	isWebInspectorIframe(iframe) {
		if (!iframe || !iframe.id) return false;
		
		// ✅ 웹 인스펙터 패널 iframe은 제외
		return iframe.id === 'web-inspector-panel' || 
			iframe.closest('#web-inspector-panel') ||
			iframe.src.includes(chrome.runtime.id); // 확장 프로그램 자체 iframe
	}

	// ✅ 추가: 현재 Advanced Features 상태를 오버레이에 적용하는 함수
	applyCurrentAdvancedFeaturesToOverlay(overlay) {
		if (!overlay || !overlay.style) return;
		
		// ✅ High Z-index 조정 적용
		if (this.stateManager.advancedFeatures.highZIndexAdjustment) {
			overlay.style.zIndex = this.stateManager.Z_INDEX_LAYERS.AD_CONTAINER;
			overlay.style.contain = 'layout paint style';
			overlay.style.transform = 'translateZ(0)';
		} else {
			overlay.style.zIndex = this.stateManager.Z_INDEX_LAYERS.EXTERNAL;
		}
		
		// ✅ Isolation 적용
		if (this.stateManager.advancedFeatures.isolation) {
			overlay.style.contain = 'layout paint style';
			overlay.style.transform = 'translateZ(0)';
			overlay.style.willChange = 'transform';
			overlay.style.isolation = 'isolate';
			overlay.style.backfaceVisibility = 'hidden';
		}
	}

	
	// ✅ 수정: iframe 오버레이만 제거하는 함수 - (UI 매니저 버전), 상태 저장 추가
	removeIframeOverlaysOnly() {
		//console.log('🔧 Removing iframe overlays only...');
		
		const iframeOverlays = document.querySelectorAll('.iframe-overlay, .svg-overlay');
		let removedCount = 0;
		
		iframeOverlays.forEach(overlay => {
			if (overlay && overlay.parentNode) {
				try {
					overlay.parentNode.removeChild(overlay);
					removedCount++;
				} catch (error) {
					console.log('Error removing iframe overlay:', error);
				}
			}
		});
		
		// ✅ 상태에서도 제거
		this.stateManager.iframeOverlays = this.stateManager.iframeOverlays.filter(overlay => {
			return !overlay.parentNode || !document.body.contains(overlay);
		});
		
	}

	// ✅ 추가: 웹 인스펙터 오버레이인지 확인하는 함수
	isWebInspectorOverlay(overlay) {
		if (!overlay || !overlay.classList) return false;
		
		// ✅ 웹 인스펙터 측정 관련 오버레이인지 확인
		return overlay.classList.contains('measurement-line') ||
			overlay.classList.contains('measurement-text') ||
			overlay.classList.contains('highlight-element') ||
			overlay.classList.contains('selected-element') ||
			overlay.classList.contains('external-element-highlight') ||
			overlay.classList.contains('child-highlight');
	}

	// Iframe 오버레이 처리
	// ✅ 수정: Iframe 오버레이 처리 함수 - 웹 인스펙터 요소 필터링 완화
	handleIframeOverlay(rect, scrollX, scrollY, element) {
		// ✅ borderRadius 표시가 이미 있다면 추가로 생성하지 않음
		const existingIndicators = document.querySelectorAll('.corner-radius-indicator');
		let hasExistingIndicator = false;

		existingIndicators.forEach(indicator => {
			const indicatorRect = indicator.getBoundingClientRect();
			if (Math.abs(indicatorRect.left - (rect.left + scrollX)) < 5 &&
				Math.abs(indicatorRect.top - (rect.top + scrollY)) < 5) {
				hasExistingIndicator = true;
			}
		});

		if (hasExistingIndicator) {
			return null;
		}

		// ✅ 웹 인스펙터 패널 요소는 오버레이 생성하지 않음 (기본적인 필터링만 유지)
		if (this.elementAnalyzer.isWebInspectorPanelElement(element)) {
			return null;
		}

		// ✅ 기존 iframe/광고 오버레이 로직 (기존과 동일)
		const existingOverlay = Array.from(this.stateManager.iframeOverlays).find(overlay => {
			const overlayRect = overlay.getBoundingClientRect();
			return Math.abs(overlayRect.left - rect.left) < 2 &&
				Math.abs(overlayRect.top - rect.top) < 2 &&
				Math.abs(overlayRect.width - rect.width) < 2 &&
				Math.abs(overlayRect.height - rect.height) < 2;
		});

		if (existingOverlay) {
			// ✅ 기존 오버레이 위치 업데이트 (스크롤 대응)
			this.updateOverlayPosition(existingOverlay, element);
			return existingOverlay;
		}

		const iframeOverlay = this.createNewIframeOverlay(rect, scrollX, scrollY, element);

		// ✅ 스크롤 고정 요소 감지 및 추적 추가
		if (this.isStickyOrFixedElement(element)) {
			this.trackStickyElement(element, iframeOverlay);
		}

		document.body.appendChild(iframeOverlay);
		this.stateManager.iframeOverlays.push(iframeOverlay);

		return iframeOverlay;
	}


	// ✅ 추가: 스크롤 고정 요소인지 확인
	isStickyOrFixedElement(element) {
		if (!element || !element.style) return false;

		try {
			const computedStyle = window.getComputedStyle(element);
			const position = computedStyle.position;
			return position === 'fixed' || position === 'sticky';
		} catch (error) {
			return false;
		}
	}


	// ✅ 추가: SVG 오버레이 생성 함수
	handleSVGOverlay(rect, scrollX, scrollY, element) {
		// ✅ 이미 오버레이가 생성된 SVG인지 확인
		const existingOverlay = Array.from(this.stateManager.iframeOverlays).find(overlay =>
			overlay.getAttribute('data-svg-id') === (element.id || element.tagName)
		);

		if (existingOverlay) {
			return existingOverlay;
		}

		const svgOverlay = document.createElement('div');
		svgOverlay.className = 'svg-overlay iframe-overlay'; // ✅ 두 클래스 모두 적용
		svgOverlay.style.position = 'absolute';
		svgOverlay.style.zIndex = this.stateManager.Z_INDEX_LAYERS.EXTERNAL;

		// ✅ 파란색 빗살무늬 패턴으로 표시 (iframe과 구분)
		svgOverlay.style.backgroundImage = `
			linear-gradient(45deg, rgba(0, 100, 255, 0.1) 25%, transparent 25%, transparent 50%, 
			rgba(0, 100, 255, 0.1) 50%, rgba(0, 100, 255, 0.1) 75%, transparent 75%, transparent)
		`;
		svgOverlay.style.backgroundSize = '10px 10px';
		svgOverlay.style.border = 'none';
		svgOverlay.style.pointerEvents = 'auto !important';
		svgOverlay.style.cursor = 'default !important';
		svgOverlay.style.left = `${rect.left + scrollX}px`;
		svgOverlay.style.top = `${rect.top + scrollY}px`;
		svgOverlay.style.width = `${rect.width}px`;
		svgOverlay.style.height = `${rect.height}px`;
		svgOverlay.style.isolation = 'isolate';

		// ✅ SVG 식별 정보 저장
		svgOverlay.setAttribute('data-svg-id', element.id || element.tagName);
		svgOverlay.setAttribute('data-svg-type', element.tagName);

		// ✅ SVG 오버레이 클릭 이벤트 차단
		svgOverlay.addEventListener('click', function (e) {
			e.stopPropagation();
			e.preventDefault();

			// ✅ 클릭된 SVG 요소 선택
			if (element && element !== this.stateManager.selectedElement) {
				this.elementAnalyzer.selectElement(element);
			}

			return false;
		}, true);

		document.body.appendChild(svgOverlay);
		this.stateManager.iframeOverlays.push(svgOverlay);

		return svgOverlay;
	}


	// ✅ 수정: 새로운 iframe 오버레이 생성 함수 - 빗살무늬 스타일 강화
	createNewIframeOverlay(rect, scrollX, scrollY, element) {
		const iframeOverlay = document.createElement('div');
		iframeOverlay.className = 'iframe-overlay';
		
		// ✅ 간소화: 공통 스타일 객체로 관리
		const baseStyles = {
			position: 'absolute',
			pointerEvents: 'auto !important',
			cursor: 'default !important',
			left: `${rect.left + scrollX}px`,
			top: `${rect.top + scrollY}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
			backgroundColor: 'transparent',
			backgroundImage: `linear-gradient(45deg, rgba(255, 0, 0, 0.1) 25%, transparent 25%, transparent 50%, 
				rgba(255, 0, 0, 0.1) 50%, rgba(255, 0, 0, 0.1) 75%, transparent 75%, transparent)`,
			backgroundSize: '10px 10px',
			border: 'none',
			isolation: 'isolate'
		};

		// ✅ 스타일 적용
		Object.assign(iframeOverlay.style, baseStyles);

		// ✅ z-index 설정 (간소화)
		iframeOverlay.style.zIndex = this.stateManager.advancedFeatures.highZIndexAdjustment ? 
			this.stateManager.Z_INDEX_LAYERS.AD_CONTAINER : 
			this.stateManager.Z_INDEX_LAYERS.EXTERNAL;

		// ✅ isolation 기능이 켜져 있을 때만 레이어 충돌 방지 적용
		if (this.stateManager.advancedFeatures.isolation) {
			Object.assign(iframeOverlay.style, {
				contain: 'layout paint style',
				transform: 'translateZ(0)',
				willChange: 'transform',
				backfaceVisibility: 'hidden'
			});
		}

		// ✅ 이벤트 리스너 설정
		this.setupOverlayEventListeners(iframeOverlay, element);

		return iframeOverlay;
	}

	// ✅ 추가: 오버레이 이벤트 리스너 설정 함수
	setupOverlayEventListeners(overlay, element) {
		// ✅ 클릭 이벤트 차단
		overlay.addEventListener('click', function (e) {
			e.stopPropagation();
			e.preventDefault();

			const container = this.findAdIframeContainer(element);
			if (container && container !== selectedElement) {
				this.elementAnalyzer.selectElement(container);
			}

			return false;
		}, true);

		// ✅ 마우스 이벤트 차단
		overlay.addEventListener('mousedown', function (e) {
			e.stopPropagation();
			e.preventDefault();
			return false;
		}, true);

		overlay.addEventListener('mouseup', function (e) {
			e.stopPropagation();
			e.preventDefault();
			return false;
		}, true);

		// ✅ 마우스 오버 시 강조 표시
		overlay.addEventListener('mouseenter', function (e) {
			if (!this.stateManager.isInspectorActive) return;

			const container = this.findAdIframeContainer(element);
			if (container && container !== currentElement) {
				this.elementAnalyzer.highlightElementAtPoint(
					container.getBoundingClientRect().left + container.getBoundingClientRect().width / 2,
					container.getBoundingClientRect().top + container.getBoundingClientRect().height / 2
				);
			}
		});

		overlay.addEventListener('mouseleave', function (e) {
			if (!this.stateManager.isInspectorActive) return;
			//this.elementAnalyzer.removeHighlight();
		});
	}

	// 오버레이 이벤트 리스너 설정
	setupOverlayEventListeners(overlay, element) {
		overlay.addEventListener('click', (e) => {
			e.stopPropagation();
			e.preventDefault();

			const container = this.findAdIframeContainer(element);
			if (container && container !== this.stateManager.selectedElement) {
				// 요소 선택 로직 (this.elementAnalyzer 와 연동 필요)
				if (this.elementAnalyzer) {
					this.elementAnalyzer.selectElement(container);
				}
			}

			return false;
		}, true);

		overlay.addEventListener('mousedown', (e) => {
			e.stopPropagation();
			e.preventDefault();
			return false;
		}, true);

		overlay.addEventListener('mouseup', (e) => {
			e.stopPropagation();
			e.preventDefault();
			return false;
		}, true);
	}

	// 오버레이 위치 업데이트
	updateOverlayPosition(overlay, element) {
		const rect = element.getBoundingClientRect();
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;

		overlay.style.left = `${rect.left + scrollX}px`;
		overlay.style.top = `${rect.top + scrollY}px`;
		overlay.style.width = `${rect.width}px`;
		overlay.style.height = `${rect.height}px`;
	}

	// 광고 Iframe 컨테이너 찾기
	f// ✅ 추가: 광고/iframe 컨테이너 찾기 함수
	findAdIframeContainer(element) {
		if (!element) return null;

		// 이미 최상위 광고/iframe 요소인 경우
		if (this.elementAnalyzer.isAdOrIframeElement(element) && !this.elementAnalyzer.isAdOrIframeElement(element.parentElement)) {
			return element;
		}

		// 부모 요소 중에서 광고/iframe 컨테이너 찾기
		let current = element;
		let container = null;

		while (current && current !== document.body) {
			if (this.elementAnalyzer.isAdOrIframeElement(current)) {
				container = current;
				// 한 단계 더 위로 가서 실제 컨테이너 찾기
				if (current.parentElement && !this.elementAnalyzer.isAdOrIframeElement(current.parentElement)) {
					break;
				}
			}
			current = current.parentElement;
		}

		return container;
	}

	// 모든 UI 요소 제거
	removeAllUIElements() {
		console.log('🗑️ Removing all UI elements (preserving selected element and toggle buttons)...');

		const uiSelectors = [
			'#web-inspector-panel', '#ad-container', '#coord-tooltip', '#crosshair',
			'.highlight-element', // ✅ .selected-element 제외
			'.measurement-line', '.measurement-text', '.child-highlight',
			'.padding-highlight', '.external-element-highlight', '.iframe-overlay',
			'.center-marker', '.t-line-with-markers', '.t-line-vertical-with-markers',
			'.connected-tooltip', '.margin-area', '.padding-area',
			'.size-line-extended', '.size-line-vertical-extended',
			'.margin-value-text', '.padding-value-text', '.size-text',
			'.cookie-message', '.premium-popup',
			// ✅ [제외] 토글 버튼 패널은 제거하지 않음
			// '#floating-button-panel', '.ruler-button-container', '.ruler-mode-btn' 제거됨
			// ✅ [추가] 새로운 툴팁 시스템 요소들
			'.viewport-tooltip'
			// ✅ .selected-element 는 명시적으로 제외됨
		];

		let removedCount = 0;

		uiSelectors.forEach(selector => {
			try {
				const elements = document.querySelectorAll(selector);
				elements.forEach(element => {
					// ✅ 선택된 요소 하이라이트와 토글 버튼은 절대 제거하지 않음
					if (element && element.parentNode &&
						!element.classList.contains('selected-element') &&
						element !== this.stateManager.selectedElementHighlight) { // ✅ 토글 버튼 제외 추가

						element.parentNode.removeChild(element);
						removedCount++;
					}
				});
			} catch (error) {
				console.log('Error removing elements with selector', selector, error);
			}
		});

		console.log('All UI elements removed. Total:', removedCount, '(selected element and toggle buttons preserved)');

		// ✅ 선택된 요소 하이라이트와 토글 버튼은 상태에서 제거하지 않음
		this.stateManager.coordTooltip = null;
		this.stateManager.panelFrame = null;
		this.stateManager.iframeOverlays = [];
		// ✅ this.stateManager.selectedElementHighlight = null; // 이 줄 제거!
	}

	// 좌표 툴팁 제거
	removeCoordTooltip() {
		if (this.stateManager.coordTooltip && this.stateManager.coordTooltip.parentNode) {
			try {
				this.stateManager.coordTooltip.remove();
			} catch (e) { }
			this.stateManager.coordTooltip = null;
		}
	}

	// 광고 제거
	removeAd() {
		const adContainer = document.getElementById('ad-container');
		if (adContainer) {
			adContainer.style.display = 'none';
		}
	}

	// 정리
	cleanup() {
		this.removeAllUIElements();
		console.log('✅ UIManager cleaned up');
	}	
}