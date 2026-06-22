// options.js - Web Inspector 옵션 페이지
// =========================================
// 이 파일은 ConfigManager를 통해 사용자 설정을 관리합니다.
//
// [변경 이력]
// 2026-06-22: ConfigManager 기반으로 리팩토링
//             - chrome.storage 직접 호출 대신 ConfigManager 사용
//             - loadOptions/saveOptions/applyOptions ConfigManager 연동
//             - 기존 모든 기능(자동 저장, 상태 메시지, 알림) 유지
//
// [관계도]
// options.js ──> ConfigManager ──> chrome.storage.sync
//                              ──> localStorage (cache)
//              ──> Active Tab (notifyActiveTabs)
//
// [주의사항]
// - ES modules를 사용하지 않으므로 ConfigManager는 window 전역 참조
// - 기존 localStorage('webinspector_options') 하위 호환성 유지
// - 모든 UI 이벤트 핸들러는 기존 동작 그대로 보존

document.addEventListener('DOMContentLoaded', function () {
	'use strict';

	// ====================================================================
	// DOM 요소 참조
	// ====================================================================
	const resetButton = document.getElementById('reset-options');
	const defaultDepthLevel = document.getElementById('defaultDepthLevel');
	const defaultDepthLevelValue = document.getElementById('defaultDepthLevelValue');
	// ✅ 섹션별 Reset 버튼 (data-section 속성으로 구분)
	const sectionResetButtons = document.querySelectorAll('.btn-section-reset');

	// ====================================================================
	// 상태 변수
	// ====================================================================
	/** @type {boolean} 현재 옵션 상태 (UI 동기화용) */
	let currentOptions = {};

	/** @type {boolean} 초기화 완료 플래그 (변경 이벤트 필터링) */
	let isInitialized = false;

	// ====================================================================
	// ConfigManager 참조
	// ====================================================================
	// config-manager.js가 먼저 로드되어 window.ConfigManager에 할당됨
	// options.html에서 modules/config-manager.js를 먼저 로드
	/** @type {ConfigManager} 설정 관리자 인스턴스 */
	const cm = window.ConfigManager;

	// ====================================================================
	// 초기화
	// ====================================================================
	init();

	/**
	 * init - 옵션 페이지 초기화
	 * 
	 * [호출 순서]
	 * 1. ConfigManager.getAll()로 모든 설정 로드
	 * 2. applyOptions()로 UI에 반영
	 * 3. setupAutoSaveListeners()로 자동 저장 등록
	 * 4. 슬라이더 이벤트 등록
	 * 5. 초기화 버튼 이벤트 등록
	 * 
	 * [주의사항]
	 * - ConfigManager.getAll()은 동기 함수 (캐시에서 읽음)
	 * - 설정이 로드되기 전에 UI 이벤트가 발생하지 않도록 isInitialized 사용
	 */
	function init() {
		console.log('🔄 [Options] 페이지 초기화 중...');

		// 1. ConfigManager에서 설정 로드하여 UI에 반영
		loadOptions();

		// 2. 모든 UI 요소에 자동 저장 이벤트 리스너 등록
		setupAutoSaveListeners();

		// 3. Depth 레벨 슬라이더 이벤트 (기존 동작 유지)
		if (defaultDepthLevel && defaultDepthLevelValue) {
			// 기존 이벤트 리스너 제거 후 새로 등록 (중복 방지)
			defaultDepthLevel.removeEventListener('input', handleDepthSlider);
			defaultDepthLevel.addEventListener('input', handleDepthSlider);
		}

		// 4. 선 두께 슬라이더 이벤트 (기존 동작 유지)
		setupThicknessSliders();

		// 5. 투명도 슬라이더 이벤트 (기존 동작 유지)
		setupOpacitySliders();

		// 6. formatHtml 체크박스 이벤트 (기존 동작 유지 - download beautify)
		const formatHtmlElement = document.getElementById('formatHtml');
		if (formatHtmlElement) {
			// 기존 이벤트 리스너 제거 후 새로 등록
			formatHtmlElement.removeEventListener('change', function() {
				saveOptions();
			});
			formatHtmlElement.addEventListener('change', function() {
				saveOptions();
			});
		}

		// 7. 초기화 버튼 이벤트 (기존 동작 유지)
		if (resetButton) {
			resetButton.removeEventListener('click', resetOptions);
			resetButton.addEventListener('click', resetOptions);
		}

		// 8. 섹션별 Reset 버튼 이벤트 등록
		setupSectionResetButtons();

		// 9. 색상 미리보기 초기화 (모든 color-preview 동기화)
		updateAllColorPreviews();

		// 10. 초기화 완료 (이 시점부터 변경 이벤트 허용)
		isInitialized = true;

		console.log('✅ [Options] 페이지 초기화 완료 (ConfigManager 기반)');
	}

	/**
	 * handleDepthSlider - Depth 레벨 슬라이더 변경 핸들러
	 * 
	 * [호출 관계]
	 * <input type="range" id="defaultDepthLevel"> ──> handleDepthSlider
	 * 
	 * [동작]
	 * - 슬라이더 값 표시 업데이트
	 * - ConfigManager에 저장
	 */
	function handleDepthSlider() {
		if (!isInitialized) return;
		defaultDepthLevelValue.textContent = this.value;
		saveOptions();
	}

	// ====================================================================
	// 자동 저장 리스너 (기존 기능 유지)
	// ====================================================================

	/**
	 * setupAutoSaveListeners - 모든 옵션 요소에 자동 저장 리스너 등록
	 * 
	 * [호출 관계]
	 * init() ──> setupAutoSaveListeners()
	 * 
	 * [동작 방식]
	 * - input, select, textarea 요소를 찾아 change 이벤트 리스너 등록
	 * - color, range 타입은 input 이벤트도 등록 (실시간 업데이트)
	 * - ConfigManager를 통해 저장됨
	 * 
	 * [주의사항]
	 * - 기존 이벤트 리스너 제거 후 새로 등록 (중복 방지)
	 * - isInitialized 플래그로 초기화 전 변경 차단
	 */
	function setupAutoSaveListeners() {
		const allOptions = document.querySelectorAll('input, select, textarea');

		allOptions.forEach(option => {
			// 기존 이벤트 리스너 제거 (중복 방지)
			option.removeEventListener('change', handleOptionChange);
			option.removeEventListener('input', handleOptionChange);

			// 새 이벤트 리스너 등록
			option.addEventListener('change', handleOptionChange);

			// 실시간 업데이트를 위한 input 이벤트 (색상 피커, 슬라이더)
			if (option.type === 'color' || option.type === 'range') {
				option.addEventListener('input', handleOptionChange);
			}
		});

		console.log(`✅ [Options] 자동 저장 리스너 설정 완료 (${allOptions.length}개 요소)`);
	}

	/**
	 * handleOptionChange - 옵션 변경 핸들러
	 * 
	 * [호출 관계]
	 * UI 요소 변경 ──> handleOptionChange ──> saveOptions()
	 * 
	 * [동작]
	 * - 초기화 전에는 무시
	 * - 변경된 요소의 id와 value를 로그로 출력
	 * - saveOptions() 호출 (ConfigManager 저장 + 탭 알림)
	 * - 컬러피커 변경 시 색상 미리보기 실시간 업데이트
	 */
	function handleOptionChange(event) {
		if (!isInitialized) return;

		const targetId = event.target.id;
		console.log(`🔄 [Options] 옵션 변경: ${targetId} = ${event.target.value}`);

		// ✅ 컬러피커 변경 시 색상 미리보기 실시간 업데이트
		if (event.target.type === 'color') {
			// color ID에서 'Color' 접미사 추출하여 data-mode 값으로 변환
			// 예: 'highlightColor' → 'highlight', 'elementColor' → 'element'
			const preview = document.querySelector('.color-preview[data-mode="' + targetId.replace('Color', '') + '"]');
			if (preview) {
				preview.style.background = event.target.value;
			}
		}

		saveOptions();
	}

	// ====================================================================
	// 설정 로드 (ConfigManager 기반)
	// ====================================================================

	/**
	 * loadOptions - ConfigManager에서 설정 로드하여 UI에 반영
	 * 
	 * [호출 순서]
	 * init() ──> loadOptions()
	 *          ├─ ConfigManager.getAll() ──> 모든 설정 읽기
	 *          └─ applyOptions() ──> UI 요소에 반영
	 * 
	 * [데이터 흐름]
	 * ConfigManager._cache ──> getAll() ──> applyOptions() ──> DOM 요소
	 * 
	 * [주의사항]
	 * - ConfigManager.getAll()은 localStorage 캐시를 즉시 반환 (동기)
	 * - chrome.storage.sync는 비동기로 로드되므로 첫 로드 시 캐시 우선
	 * - chrome.storage.sync 로드 완료 후 ConfigManager가 자동으로 캐시 업데이트
	 */
	function loadOptions() {
		console.log('📥 [Options] ConfigManager에서 설정 로드 중...');

		// ConfigManager에서 모든 설정 읽기
		// ConfigManager는 localStorage 캐시를 우선 사용하므로 즉시 반환됨
		const options = cm.getAll();

		if (options && Object.keys(options).length > 0) {
			console.log('✅ [Options] 설정 로드 성공 (ConfigManager):', Object.keys(options).length + '개');

			// UI에 반영
			applyOptions(options);
			currentOptions = options;

			// 기존 하위 호환성을 위한 localStorage 캐시도 업데이트
			saveToLegacyCache(options);

			showAutoSaveStatus('Options loaded successfully');
		} else {
			console.log('📭 [Options] ConfigManager에 설정 없음, 기본값 설정');
			// ConfigManager가 이미 기본값을 가지고 있으므로 getAll()로 다시 시도
			const defaults = cm.getAll();
			applyOptions(defaults);
			currentOptions = defaults;
		}
	}

	/**
	 * saveToLegacyCache - 기존 localStorage('webinspector_options')에 저장 (하위 호환성)
	 * 
	 * [동기]
	 * 기존 StateManager와의 하위 호환성을 위해 레거시 캐시도 유지
	 * ConfigManager가 새로운 기본 저장소이므로 이 함수는 백업 목적
	 * 
	 * @param {Object} options - 저장할 옵션 객체
	 */
	function saveToLegacyCache(options) {
		try {
			localStorage.setItem('webinspector_options', JSON.stringify(options));
			console.log('✅ [Options] 레거시 캐시 저장 완료 (하위 호환성)');
		} catch (e) {
			console.error('❌ [Options] 레거시 캐시 저장 실패:', e);
		}
	}

	// ====================================================================
	// 설정 적용 (UI 동기화)
	// ====================================================================

	/**
	 * applyOptions - 설정 값을 UI 요소에 반영
	 * 
	 * [호출 관계]
	 * loadOptions() ──> applyOptions(options)
	 * setDefaultOptions() ──> applyOptions(options)
	 * 
	 * [동작 방식]
	 * - 색상: 8자리 HEX(#rrggbbaa)를 6자리(#rrggbb)로 변환하여 적용
	 * - 슬라이더: 두께는 'px', 투명도는 '%' 형식으로 표시
	 * - Select: value 매칭으로 선택
	 * - Checkbox: checked 속성 적용
	 * 
	 * [처리하는 요소 목록]
	 * - 색상: 11개 (highlightColor ~ borderRadiusColor)
	 * - 투명도 슬라이더: 1개 (rulerOpacity)
	 * - Select: 6개 (crosshairStyle, rulerUnit, panelPosition, decimalPlaces, tooltipFontSize, defaultMeasurementMode)
	 * - 슬라이더: 8개 (defaultDepthLevel, 7개 Thickness, 8개 Opacity)
	 * - Checkbox: 1개 (formatHtml)
	 * 
	 * [주의사항]
	 * - rulerOpacity는 options.html에 요소가 없을 수 있음 (null 체크 필요)
	 * - 각 applySliderOption/applyColorOption 함수는 내부적으로 null 체크 수행
	 */
	function applyOptions(options) {
		console.log('🎨 [Options] 설정을 UI에 적용 중...');

		if (!options) {
			console.warn('⚠️ [Options] 적용할 설정이 없음');
			return;
		}

		// ============================================================
		// 1. 색상 옵션 적용 (11개)
		// ============================================================
		applyColorOption('highlightColor', options.highlightColor);
		applyColorOption('selectedColor', options.selectedColor);
		applyColorOption('crosshairColor', options.crosshairColor);
		applyColorOption('viewportColor', options.viewportColor);
		applyColorOption('elementColor', options.elementColor);
		applyColorOption('marginColor', options.marginColor);
		applyColorOption('paddingColor', options.paddingColor);
		applyColorOption('childrenColor', options.childrenColor);
		applyColorOption('sizeColor', options.sizeColor);
		applyColorOption('borderRadiusColor', options.borderRadiusColor);

		// ruler 색상 및 투명도 (options.html에 요소가 있을 경우)
		applyColorOption('rulerColor', options.rulerColor);
		// rulerOpacity는 options.html에 없을 수 있으므로 applySliderOption 내부에서 null 체크됨
		applySliderOption('rulerOpacity', 'rulerOpacityValue', options.rulerOpacity, true);

		// ============================================================
		// 2. formatHtml 체크박스 적용
		// ============================================================
		if (options.formatHtml !== undefined) {
			const formatHtmlElement = document.getElementById('formatHtml');
			if (formatHtmlElement) {
				formatHtmlElement.checked = options.formatHtml;
			}
		}

		// ============================================================
		// 3. Select 드롭다운 옵션 적용 (6개)
		// ============================================================
		applySelectOption('crosshairStyle', options.crosshairStyle);
		applySelectOption('rulerUnit', options.rulerUnit);
		applySelectOption('panelPosition', options.panelPosition);
		applySelectOption('decimalPlaces', options.decimalPlaces);
		applySelectOption('tooltipFontSize', options.tooltipFontSize);
		applySelectOption('defaultMeasurementMode', options.defaultMeasurementMode);

		// ============================================================
		// 4. Depth 레벨 슬라이더 적용
		// ============================================================
		applySliderOption('defaultDepthLevel', 'defaultDepthLevelValue', options.defaultDepthLevel);

		// ============================================================
		// 5. 선 두께 슬라이더 적용 (7개)
		// ============================================================
		applySliderOption('viewportLineThickness', 'viewportLineThicknessValue', options.viewportLineThickness);
		applySliderOption('elementLineThickness', 'elementLineThicknessValue', options.elementLineThickness);
		applySliderOption('marginLineThickness', 'marginLineThicknessValue', options.marginLineThickness);
		applySliderOption('paddingLineThickness', 'paddingLineThicknessValue', options.paddingLineThickness);
		applySliderOption('childrenLineThickness', 'childrenLineThicknessValue', options.childrenLineThickness);
		applySliderOption('sizeLineThickness', 'sizeLineThicknessValue', options.sizeLineThickness);
		applySliderOption('borderRadiusLineThickness', 'borderRadiusLineThicknessValue', options.borderRadiusLineThickness);

		// ============================================================
		// 6. 투명도 슬라이더 적용 (8개)
		// ============================================================
		applySliderOption('viewportLineOpacity', 'viewportLineOpacityValue', options.viewportLineOpacity, true);
		applySliderOption('elementLineOpacity', 'elementLineOpacityValue', options.elementLineOpacity, true);
		applySliderOption('marginLineOpacity', 'marginLineOpacityValue', options.marginLineOpacity, true);
		applySliderOption('paddingLineOpacity', 'paddingLineOpacityValue', options.paddingLineOpacity, true);
		applySliderOption('childrenLineOpacity', 'childrenLineOpacityValue', options.childrenLineOpacity, true);
		applySliderOption('sizeLineOpacity', 'sizeLineOpacityValue', options.sizeLineOpacity, true);
		applySliderOption('childrenBgOpacity', 'childrenBgOpacityValue', options.childrenBgOpacity, true);
		applySliderOption('borderRadiusLineOpacity', 'borderRadiusLineOpacityValue', options.borderRadiusLineOpacity, true);

		// 7. 색상 미리보기 동기화
		updateAllColorPreviews();

		console.log('✅ [Options] 설정 UI 적용 완료');
	}

	/**
	 * applyColorOption - 색상 입력 요소에 값 설정
	 * 
	 * @param {string} elementId - input[type="color"] 요소의 ID
	 * @param {string} value - HEX 색상값 (#rrggbb 또는 #rrggbbaa)
	 * 
	 * [주의사항]
	 * - 8자리 HEX(#rrggbbaa)는 input[type="color"]가 지원하지 않으므로
	 *   6자리(#rrggbb)로 변환
	 * - 요소가 없으면 조용히 무시
	 */
	function applyColorOption(elementId, value) {
		const element = document.getElementById(elementId);
		if (element && value) {
			// 8자리 HEX 코드를 6자리로 변환 (#rrggbbaa -> #rrggbb)
			let cleanValue = value;
			if (value.length === 9 && value.startsWith('#')) {
				cleanValue = value.substring(0, 7);
			}
			element.value = cleanValue;
		}
	}

	/**
	 * applySliderOption - 슬라이더 요소에 값 설정 및 표시 업데이트
	 * 
	 * @param {string} sliderId - input[type="range"] 요소 ID
	 * @param {string} valueId - 값 표시 span 요소 ID
	 * @param {number} value - 설정할 값
	 * @param {boolean} isOpacity - 투명도 여부 (true면 % 표시)
	 * 
	 * [동작]
	 * - 두께(Thickness): 'px' 접미사로 표시
	 * - 투명도(Opacity): '%' 단위로 표시 (소수점 * 100)
	 * - 일반: 숫자만 표시
	 */
	function applySliderOption(sliderId, valueId, value, isOpacity = false) {
		const slider = document.getElementById(sliderId);
		const valueDisplay = document.getElementById(valueId);

		if (slider && valueDisplay && value !== undefined) {
			slider.value = value;
			if (isOpacity) {
				// 투명도: 0.8 → '80%' 형식으로 표시
				valueDisplay.textContent = Math.round(value * 100) + '%';
			} else if (sliderId.includes('Thickness')) {
				// 선 두께: '2px' 형식으로 표시
				valueDisplay.textContent = value + 'px';
			} else {
				// 일반 값: 숫자만 표시
				valueDisplay.textContent = value;
			}
		}
	}

	/**
	 * applySelectOption - Select 드롭다운 요소에 값 설정
	 * 
	 * @param {string} elementId - select 요소 ID
	 * @param {string} value - 설정할 값
	 * 
	 * [주의사항]
	 * - 요소가 없거나 value가 falsy면 조용히 무시
	 */
	function applySelectOption(elementId, value) {
		const element = document.getElementById(elementId);
		if (element && value) {
			element.value = value;
		}
	}

	// ====================================================================
	// 섹션별 Reset 버튼 설정
	// ====================================================================

	/**
	 * setupSectionResetButtons - 각 options-section 하단의 "This section to defaults" 버튼 이벤트 등록
	 * 
	 * [data-section 매핑]
	 * - depth: defaultDepthLevel 만 해당
	 * - measurementMode: defaultMeasurementMode 만 해당
	 * - modeColors: 색상 7종(viewport/element/margin/padding/children/size/borderRadius) + 두께/투명도
	 * - display: highlightColor/selectedColor/crosshairColor/rulerColor + crosshairStyle/panelPosition
	 * - units: rulerUnit/decimalPlaces/tooltipFontSize/formatHtml
	 */
	function setupSectionResetButtons() {
		sectionResetButtons.forEach(button => {
			button.removeEventListener('click', handleSectionReset);
			button.addEventListener('click', handleSectionReset);
		});
		console.log('✅ [Options] 섹션별 Reset 버튼 설정 완료 (' + sectionResetButtons.length + '개)');
	}

	/**
	 * handleSectionReset - 섹션별 Reset 버튼 클릭 핸들러
	 * 
	 * [동작]
	 * 1. data-section 속성값 읽기
	 * 2. 해당 섹션에 속한 설정 키 목록을 ConfigManager.DEFAULTS 기본값으로 리셋
	 * 3. UI 요소 값 업데이트
	 * 4. 저장 및 탭 알림
	 */
	function handleSectionReset(event) {
		const section = event.target.getAttribute('data-section');
		if (!section) return;

		if (!confirm('Are you sure you want to reset this section to default values?')) return;

		console.log('🔄 [Options] 섹션 초기화:', section);

		/** @type {string[]} 해당 섹션의 설정 키 목록 */
		let sectionKeys = [];

		// data-section 값에 따른 키 매핑
		switch (section) {
			case 'depth':
				sectionKeys = ['defaultDepthLevel'];
				break;
			case 'measurementMode':
				sectionKeys = ['defaultMeasurementMode'];
				break;
			case 'modeColors':
				sectionKeys = [
					'viewportColor', 'elementColor', 'marginColor', 'paddingColor',
					'childrenColor', 'sizeColor', 'borderRadiusColor',
					'viewportLineThickness', 'elementLineThickness', 'marginLineThickness',
					'paddingLineThickness', 'childrenLineThickness', 'sizeLineThickness',
					'borderRadiusLineThickness',
					'viewportLineOpacity', 'elementLineOpacity', 'marginLineOpacity',
					'paddingLineOpacity', 'childrenLineOpacity', 'sizeLineOpacity',
					'childrenBgOpacity', 'borderRadiusLineOpacity'
				];
				break;
			case 'display':
				sectionKeys = [
					'highlightColor', 'selectedColor', 'crosshairColor', 'rulerColor',
					'crosshairStyle', 'panelPosition'
				];
				break;
			case 'units':
				sectionKeys = [
					'rulerUnit', 'decimalPlaces', 'tooltipFontSize', 'formatHtml'
				];
				break;
			default:
				console.warn('⚠️ [Options] 알 수 없는 섹션:', section);
				return;
		}

		// ConfigManager 기본값에서 해당 섹션의 값만 추출하여 업데이트
		const defaults = cm.DEFAULTS;
		const updates = {};

		sectionKeys.forEach(key => {
			if (key in defaults) {
				updates[key] = defaults[key];
			}
		});

		if (Object.keys(updates).length === 0) {
			console.warn('⚠️ [Options] 초기화할 설정이 없음:', section);
			return;
		}

		// ConfigManager에 저장
		cm.setMultiple(updates);

		// currentOptions 업데이트
		Object.assign(currentOptions, updates);

		// UI에 반영
		applyOptions(updates);

		// 색상 미리보기 업데이트
		updateAllColorPreviews();

		// 레거시 캐시 저장
		saveToLegacyCache(currentOptions);

		showStatus('Section reset to defaults!', 'success');
		notifyActiveTabs(currentOptions);

		console.log('✅ [Options] 섹션 초기화 완료:', section, Object.keys(updates));
	}

	// ====================================================================
	// 색상 미리보기 업데이트
	// ====================================================================

	/**
	 * updateColorPreview - 특정 color-preview 요소를 해당 컬러피커 값으로 업데이트
	 * 
	 * @param {string} mode - data-mode 값 (element, viewport, margin 등)
	 */
	function updateColorPreview(mode) {
		const preview = document.querySelector('.color-preview[data-mode="' + mode + '"]');
		const colorInput = document.getElementById(mode + 'Color') || document.getElementById(mode);
		if (preview && colorInput) {
			preview.style.background = colorInput.value;
		}
	}

	/**
	 * updateAllColorPreviews - 모든 color-preview 요소를 현재 컬러피커 값으로 동기화
	 * 
	 * [호출 시점]
	 * - 초기화 완료 후
	 * - 섹션/전체 Reset 후
	 * - 컬러피커 변경 시
	 */
	function updateAllColorPreviews() {
		const previews = document.querySelectorAll('.color-preview');
		previews.forEach(preview => {
			const mode = preview.getAttribute('data-mode');
			if (!mode) return;

			// data-mode 값에 해당하는 컬러피커 요소 찾기
			// modeColors: viewport/element/margin/padding/children/size/borderRadius
			// display: highlight/selected/crosshair/ruler
			const colorId = (mode === 'highlight' || mode === 'selected' || mode === 'crosshair' || mode === 'ruler')
				? (mode === 'highlight' ? 'highlightColor' :
				   mode === 'selected' ? 'selectedColor' :
				   mode === 'crosshair' ? 'crosshairColor' :
				   mode === 'ruler' ? 'rulerColor' : mode)
				: mode + 'Color';

			const colorInput = document.getElementById(colorId);
			if (colorInput) {
				preview.style.background = colorInput.value;
			}
		});
	}

	// ====================================================================
	// 설정 저장 (ConfigManager 기반)
	// ====================================================================

	/**
	 * saveOptions - 현재 UI 상태를 수집하여 ConfigManager에 저장
	 * 
	 * [호출 순서]
	 * handleOptionChange() ──> saveOptions()
	 *                       ├─ collectAllOptions() ──> UI에서 값 읽기
	 *                       ├─ ConfigManager.setMultiple() ──> 저장
	 *                       ├─ saveToLegacyCache() ──> 하위 호환성
	 *                       └─ notifyActiveTabs() ──> 활성 탭 알림
	 * 
	 * [저장 위치]
	 * 1. ConfigManager (기본): chrome.storage.sync + localStorage 캐시
	 * 2. 레거시 캐시 (하위 호환): localStorage('webinspector_options')
	 * 
	 * [주의사항]
	 * - isInitialized가 false면 저장하지 않음 (초기화 전 변경 방지)
	 * - chrome.storage.sync 오류 시에도 localStorage 캐시는 성공
	 * - 저장 후 활성 탭에 업데이트 메시지 전송
	 */
	function saveOptions() {
		if (!isInitialized) return;

		// 1. UI에서 모든 옵션 값 수집
		const options = collectAllOptions();
		currentOptions = options;

		console.log('💾 [Options] 설정 저장 중...', Object.keys(options).length + '개');

		// 2. ConfigManager에 저장 (기본 저장소)
		// ConfigManager.setMultiple()은 내부적으로
		// localStorage 캐시 + chrome.storage.sync에 저장
		const saveResult = cm.setMultiple(options);

		// 3. 레거시 캐시에 저장 (하위 호환성 - StateManager 등)
		saveToLegacyCache(options);

		// 4. 저장 결과 표시
		if (saveResult) {
			showStatus('Options saved successfully!', 'success');
			notifyActiveTabs(options);
		} else {
			showStatus('Options saved to cache (sync failed)', 'warning');
		}
	}

	/**
	 * collectAllOptions - 현재 UI 요소에서 모든 옵션 값 수집
	 * 
	 * @returns {Object} 모든 옵션 값 (key: value 형태)
	 * 
	 * [수집 대상]
	 * - 색상: 11개 input[type="color"] 요소
	 * - Select: 6개 요소 (tooltipFontSize, rulerUnit 등)
	 * - 슬라이더: 두께/투명도/Depth
	 * - Checkbox: formatHtml
	 * 
	 * [주의사항]
	 * - 요소 ID가 없는 경우 기본값 사용
	 * - tooltipFontSize가 없으면 '11px' 기본값 (기존 동작 유지)
	 * - 선 두께는 parseInt()가 아닌 parseFloat()로 처리 (0.5 단위)
	 */
	function collectAllOptions() {
		const options = {};

		console.log('🔍 [Options] UI에서 모든 옵션 수집 중...');

		// ============================================================
		// 1. 색상 옵션 수집 (11개)
		// ============================================================
		const colorInputs = [
			'highlightColor', 'selectedColor', 'crosshairColor', 'rulerColor',
			'viewportColor', 'elementColor', 'marginColor', 'paddingColor',
			'childrenColor', 'sizeColor', 'borderRadiusColor'
		];

		colorInputs.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				options[id] = element.value;
			}
		});

		// ============================================================
		// 2. Select 드롭다운 옵션 수집 (6개)
		// ============================================================
		const selectInputs = [
			'crosshairStyle', 'rulerUnit', 'panelPosition',
			'decimalPlaces', 'defaultMeasurementMode'
		];

		selectInputs.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				options[id] = element.value;
			}
		});

		// tooltipFontSize는 별도 처리 (기본값 고정)
		const tooltipFontSizeElement = document.getElementById('tooltipFontSize');
		if (tooltipFontSizeElement) {
			options.tooltipFontSize = tooltipFontSizeElement.value;
		} else {
			options.tooltipFontSize = '11px'; // 기본값 고정 (기존 동작 유지)
		}

		// ============================================================
		// 3. formatHtml 체크박스 수집
		// ============================================================
		const formatHtmlElement = document.getElementById('formatHtml');
		if (formatHtmlElement) {
			options.formatHtml = formatHtmlElement.checked;
		}

		// ============================================================
		// 4. 선 두께 슬라이더 수집 (7개)
		// ============================================================
		const thicknessOptions = [
			'elementLineThickness', 'marginLineThickness', 'paddingLineThickness',
			'childrenLineThickness', 'sizeLineThickness', 'borderRadiusLineThickness',
			'viewportLineThickness'
		];

		thicknessOptions.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				// parseFloat 사용 (0.5 단위 지원)
				options[id] = parseFloat(element.value) || 1;
			}
		});

		// ============================================================
		// 5. 투명도 슬라이더 수집 (8개)
		// ============================================================
		const opacityOptions = [
			'elementLineOpacity', 'marginLineOpacity', 'paddingLineOpacity',
			'childrenLineOpacity', 'childrenBgOpacity', 'sizeLineOpacity',
			'borderRadiusLineOpacity', 'viewportLineOpacity'
		];

		opacityOptions.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				options[id] = parseFloat(element.value) || 0.8;
			}
		});

		// ============================================================
		// 6. Depth 레벨 수집
		// ============================================================
		const depthElement = document.getElementById('defaultDepthLevel');
		if (depthElement) {
			options.defaultDepthLevel = parseInt(depthElement.value) || 2;
		}

		// 총 수집된 옵션 개수 로깅
		console.log(`✅ [Options] ${Object.keys(options).length}개 옵션 수집 완료`);

		return options;
	}

	// ====================================================================
	// 기본값 설정 (ConfigManager 기반)
	// ====================================================================

	/**
	 * setDefaultOptions - 모든 설정을 ConfigManager 기본값으로 리셋
	 * 
	 * [호출 관계]
	 * resetOptions() ──> setDefaultOptions()
	 *                  ├─ ConfigManager.reset() ──> 기본값으로 리셋
	 *                  ├─ applyOptions() ──> UI에 반영
	 *                  └─ ConfigManager.getAll() ──> 모든 값 읽기
	 * 
	 * [동작 순서]
	 * 1. ConfigManager.reset() 호출 (저장소도 기본값으로 리셋)
	 * 2. ConfigManager.getAll()로 기본값 읽기
	 * 3. applyOptions()로 UI에 반영
	 * 4. currentOptions 업데이트
	 * 
	 * [주의사항]
	 * - ConfigManager.reset()은 chrome.storage.sync도 초기화
	 * - 복구 불가능하므로 호출 전 사용자 확인 필요
	 */
	function setDefaultOptions() {
		console.log('🔄 [Options] ConfigManager 기본값으로 초기화 중...');

		// 1. ConfigManager 기본값으로 리셋
		cm.reset();

		// 2. 리셋된 기본값 읽기
		const defaults = cm.getAll();

		// 3. UI에 반영
		applyOptions(defaults);
		currentOptions = defaults;

		// 4. 색상 미리보기 업데이트
		updateAllColorPreviews();

		// 5. 레거시 캐시에도 저장 (하위 호환성)
		saveToLegacyCache(defaults);

		console.log('✅ [Options] 기본값 적용 완료');
	}

	// ====================================================================
	// 활성 탭 알림 (기존 기능 유지)
	// ====================================================================

	/**
	 * notifyActiveTabs - 설정 변경을 활성 탭에 알림
	 * 
	 * [호출 관계]
	 * saveOptions() ──> notifyActiveTabs(options)
	 * 
	 * [동작 방식]
	 * 1. 현재 활성 탭 조회
	 * 2. 'updateOptions' 액션 메시지 전송
	 * 3. 에러는 완전히 무시 (콜백에서 처리)
	 * 
	 * [주의사항]
	 * - 에러를 완전히 무시함 (options_page와 content_script 연결 문제 방지)
	 * - 콜백 함수를 제공하여 chrome.runtime.lastError 흡수
	 */
	function notifyActiveTabs(options) {
		console.log('📤 [Options] 활성 탭에 설정 변경 알림 전송');

		// 캐시에 저장 (함수 내에서 중복 호출되지만 안전)
		saveToLegacyCache(options);

		// 활성 탭에 메시지 전송
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			if (!tabs || tabs.length === 0) return;

			const currentTab = tabs[0];

			// 에러를 완전히 무시하는 방식으로 메시지 전송
			chrome.tabs.sendMessage(currentTab.id, {
				action: 'updateOptions',
				options: options
			}, function (response) {
				// 콜백 함수를 제공하여 에러 완전 흡수
				if (chrome.runtime.lastError) {
					// 절대 로그도 출력하지 않음 - 완전 무시
				}
			});
		});
	}

	// ====================================================================
	// 글로벌 에러 핸들러 (기존 기능 유지)
	// ====================================================================

	// "Could not establish connection" 에러 무시 (options_page 특성)
	window.addEventListener('error', function (e) {
		if (e.error && e.error.message && e.error.message.includes('Could not establish connection')) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	});

	// Promise rejection 핸들러
	window.addEventListener('unhandledrejection', function (e) {
		if (e.reason && e.reason.message && e.reason.message.includes('Could not establish connection')) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}
	});

	// ====================================================================
	// 선 두께 슬라이더 설정 (기존 기능 유지)
	// ====================================================================

	/**
	 * setupThicknessSliders - 모든 선 두께 슬라이더에 이벤트 리스너 등록
	 * 
	 * [등록하는 슬라이더 목록]
	 * - viewportLineThickness
	 * - elementLineThickness
	 * - marginLineThickness
	 * - paddingLineThickness
	 * - childrenLineThickness
	 * - sizeLineThickness
	 * - borderRadiusLineThickness
	 * 
	 * [동작]
	 * - 슬라이더 값 변경 시 'px' 접미사로 표시 업데이트
	 * - 변경 즉시 saveOptions() 호출 (자동 저장)
	 */
	function setupThicknessSliders() {
		const thicknessSliders = [
			{ slider: 'viewportLineThickness', value: 'viewportLineThicknessValue' },
			{ slider: 'elementLineThickness', value: 'elementLineThicknessValue' },
			{ slider: 'marginLineThickness', value: 'marginLineThicknessValue' },
			{ slider: 'paddingLineThickness', value: 'paddingLineThicknessValue' },
			{ slider: 'childrenLineThickness', value: 'childrenLineThicknessValue' },
			{ slider: 'sizeLineThickness', value: 'sizeLineThicknessValue' },
			{ slider: 'borderRadiusLineThickness', value: 'borderRadiusLineThicknessValue' }
		];

		thicknessSliders.forEach(item => {
			const slider = document.getElementById(item.slider);
			const valueDisplay = document.getElementById(item.value);

			if (slider && valueDisplay) {
				// 기존 이벤트 리스너 제거 (중복 방지)
				slider.removeEventListener('input', handleThicknessSlider);
				// 새 이벤트 리스너 등록
				slider.addEventListener('input', handleThicknessSlider);

				// 각 슬라이더에 valueDisplay 저장 (클로저 대신)
				slider._valueDisplay = valueDisplay;
			}
		});

		/**
		 * handleThicknessSlider - 선 두께 슬라이더 변경 핸들러
		 * 
		 * [주의사항]
		 * - this는 이벤트가 바인딩된 슬라이더 요소
		 * - _valueDisplay는 슬라이더 요소에 동적 속성으로 저장됨
		 */
		function handleThicknessSlider() {
			if (this._valueDisplay) {
				this._valueDisplay.textContent = this.value + 'px';
			}
			saveOptions();
		}

		console.log('✅ [Options] 선 두께 슬라이더 설정 완료');
	}

	// ====================================================================
	// 투명도 슬라이더 설정 (기존 기능 유지)
	// ====================================================================

	/**
	 * setupOpacitySliders - 모든 투명도 슬라이더에 이벤트 리스너 등록
	 * 
	 * [등록하는 슬라이더 목록]
	 * - viewportLineOpacity
	 * - elementLineOpacity
	 * - marginLineOpacity
	 * - paddingLineOpacity
	 * - childrenLineOpacity
	 * - sizeLineOpacity
	 * - childrenBgOpacity
	 * - borderRadiusLineOpacity
	 * 
	 * [동작]
	 * - 슬라이더 값 변경 시 '%' 형식으로 표시 업데이트
	 *   0.8 → '80%'
	 * - 변경 즉시 saveOptions() 호출 (자동 저장)
	 */
	function setupOpacitySliders() {
		const opacitySliders = [
			{ slider: 'viewportLineOpacity', value: 'viewportLineOpacityValue' },
			{ slider: 'elementLineOpacity', value: 'elementLineOpacityValue' },
			{ slider: 'marginLineOpacity', value: 'marginLineOpacityValue' },
			{ slider: 'paddingLineOpacity', value: 'paddingLineOpacityValue' },
			{ slider: 'childrenLineOpacity', value: 'childrenLineOpacityValue' },
			{ slider: 'sizeLineOpacity', value: 'sizeLineOpacityValue' },
			{ slider: 'childrenBgOpacity', value: 'childrenBgOpacityValue' },
			{ slider: 'borderRadiusLineOpacity', value: 'borderRadiusLineOpacityValue' }
		];

		opacitySliders.forEach(item => {
			const slider = document.getElementById(item.slider);
			const valueDisplay = document.getElementById(item.value);

			if (slider && valueDisplay) {
				// 기존 이벤트 리스너 제거 (중복 방지)
				slider.removeEventListener('input', handleOpacitySlider);
				// 새 이벤트 리스너 등록
				slider.addEventListener('input', handleOpacitySlider);

				// 각 슬라이더에 valueDisplay 저장
				slider._valueDisplay = valueDisplay;
			}
		});

		/**
		 * handleOpacitySlider - 투명도 슬라이더 변경 핸들러
		 * 
		 * [주의사항]
		 * - this는 이벤트가 바인딩된 슬라이더 요소
		 * - _valueDisplay는 슬라이더 요소에 동적 속성으로 저장됨
		 */
		function handleOpacitySlider() {
			if (this._valueDisplay) {
				this._valueDisplay.textContent = Math.round(this.value * 100) + '%';
			}
			saveOptions();
		}

		console.log('✅ [Options] 투명도 슬라이더 설정 완료');
	}

	// ====================================================================
	// 옵션 초기화 (기존 기능 유지)
	// ====================================================================

	/**
	 * resetOptions - 모든 옵션을 기본값으로 초기화
	 * 
	 * [호출 관계]
	 * <button id="reset-options"> ──> resetOptions()
	 *                            ├─ confirm() ──> 사용자 확인
	 *                            ├─ setDefaultOptions() ──> ConfigManager 초기화
	 *                            └─ showStatus() ──> 완료 메시지
	 * 
	 * [주의사항]
	 * - 사용자 확인 후 실행 (confirm 다이얼로그)
	 * - 기본값으로 리셋 후 저장 및 UI 업데이트
	 */
	function resetOptions() {
		if (confirm('Are you sure you want to reset all options to default values?')) {
			console.log('🔄 [Options] 사용자 요청으로 옵션 초기화 중...');
			setDefaultOptions();
			showStatus('Options reset to defaults!', 'success');
		}
	}

	// ====================================================================
	// 상태 메시지 표시 (기존 기능 유지)
	// ====================================================================

	/**
	 * showStatus - 상태 메시지를 화면 우측 상단에 표시
	 * 
	 * @param {string} message - 표시할 메시지
	 * @param {string} type - 메시지 타입 ('success' | 'warning' | 'error')
	 * 
	 * [동작]
	 * - 기존 메시지 제거 후 새 메시지 생성
	 * - 3초 후 자동으로 사라짐 (fadeInOut 애니메이션)
	 * - 성공: 초록색, 경고: 주황색, 오류: 빨간색
	 */
	function showStatus(message, type = 'success') {
		// 기존 메시지 제거
		const existingStatus = document.getElementById('status-message');
		if (existingStatus) {
			existingStatus.remove();
		}

		// 새 메시지 요소 생성
		const status = document.createElement('div');
		status.id = 'status-message';
		status.textContent = message;

		// 스타일 설정
		status.style.position = 'fixed';
		status.style.top = '20px';
		status.style.right = '20px';

		// 타입별 배경색
		status.style.backgroundColor = type === 'success' ? '#31b031' :
			type === 'warning' ? '#ff9800' : '#f44336';

		status.style.color = 'white';
		status.style.padding = '12px 18px';
		status.style.borderRadius = '6px';
		status.style.zIndex = '10000';
		status.style.boxShadow = '0 3px 12px rgba(0,0,0,0.2)';
		status.style.fontWeight = '600';
		status.style.animation = 'fadeInOut 3s forwards';

		// 애니메이션 스타일 (한 번만 추가)
		if (!document.getElementById('status-message-style')) {
			const style = document.createElement('style');
			style.id = 'status-message-style';
			style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-20px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
			document.head.appendChild(style);
		}

		// DOM에 추가
		document.body.appendChild(status);

		// 3초 후 제거
		setTimeout(() => {
			if (status.parentNode) {
				status.remove();
			}
		}, 3000);
	}

	/**
	 * showAutoSaveStatus - 자동 저장 상태 표시
	 * 
	 * @param {string} message - 표시할 메시지
	 * 
	 * [동작]
	 * - 화면 우측 하단에 작은 텍스트로 표시
	 * - 2초 후 투명도 낮춤
	 */
	function showAutoSaveStatus(message) {
		const status = document.getElementById('auto-save-status') || createAutoSaveStatus();
		status.textContent = message || 'Auto-save enabled';
		status.style.color = '#4CAF50';

		setTimeout(() => {
			status.style.opacity = '0.7';
		}, 2000);
	}

	/**
	 * createAutoSaveStatus - 자동 저장 상태 요소 생성
	 * 
	 * @returns {HTMLElement} 생성된 상태 요소
	 */
	function createAutoSaveStatus() {
		const status = document.createElement('div');
		status.id = 'auto-save-status';
		status.style.position = 'fixed';
		status.style.bottom = '10px';
		status.style.right = '10px';
		status.style.padding = '5px 10px';
		status.style.backgroundColor = 'rgba(0,0,0,0.8)';
		status.style.color = 'white';
		status.style.borderRadius = '3px';
		status.style.fontSize = '9px';
		status.style.zIndex = '10000';
		document.body.appendChild(status);
		return status;
	}

});
