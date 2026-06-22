// download-manager.js
class Util {

	constructor(stateManager) {
		console.log('🎨 Util initializing...');

		if (!stateManager) {
			throw new Error('Util requires StateManager instance');
		}

		this.statemanager = stateManager; // ✅ 별도 변수에도 저장
		console.log('✅ Util initialized');

	}

	/**
     * ✅ Util 정리 메서드
     */
    cleanup() {
        console.log('🧹 Util cleaning up...');
        //this.stateManager = null;
        console.log('✅ Util cleaned up');
    }

    completeCleanup() {
        //this.cleanup();
    }
	//---------------------------------------------------------------------------------------
	

	/*
		// 모든 포맷 지원!
		this.getContrastColor('#ff0000');        // HEX
		this.getContrastColor('#f00');           // 짧은 HEX  
		this.getContrastColor('#ff000080');      // HEX with alpha
		this.getContrastColor('rgb(255,0,0)');   // RGB
		this.getContrastColor('rgba(255,0,0,0.5)'); // RGBA
		this.getContrastColor('hsl(0,100%,50%)'); // HSL
		this.getContrastColor('red');            // 명명된 색상
		this.getContrastColor('blue');           // 명명된 색상
	*/
	// element-analyzer.js - getContrastColor 함수 통합 버전
	getContrastColor(color) {
		// ✅ 모든 색상 포맷을 RGB 값으로 변환
		const rgb = this.parseColorToRGB(color);

		if (!rgb) {
			return '#ffffff'; // 변환 실패 시 기본 흰색
		}

		// ✅ 밝기 계산 (YIQ 공식)
		const brightness = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;

		// ✅ 밝기에 따른 폰트 색상 결정
		return brightness > 128 ? '#000000' : '#ffffff';
	}

	// ✅ 추가: 모든 색상 포맷을 RGB로 변환하는 함수
	parseColorToRGB(color) {
		if (!color) return null;

		let r, g, b;

		// 1. HEX 색상 (#RRGGBB, #RGB, #RRGGBBAA)
		if (color.startsWith('#')) {
			return this.hexToRGB(color);
		}

		// 2. RGB/RGBA 색상 (rgb(255,255,255), rgba(255,255,255,0.5))
		if (color.startsWith('rgb')) {
			return this.rgbToRGB(color);
		}

		// 3. HSL/HSLA 색상 (hsl(0,100%,50%), hsla(0,100%,50%,0.5))
		if (color.startsWith('hsl')) {
			return this.hslToRGB(color);
		}

		// 4. 명명된 색상 (red, blue, transparent 등)
		if (this.isNamedColor(color)) {
			return this.namedColorToRGB(color);
		}

		return null;
	}

	// ✅ HEX → RGB 변환
	hexToRGB(hex) {
		let hexClean = hex.replace('#', '');

		// #RGB → #RRGGBB 확장
		if (hexClean.length === 3) {
			hexClean = hexClean[0] + hexClean[0] + hexClean[1] + hexClean[1] + hexClean[2] + hexClean[2];
		}

		// 알파값 제거 (#RRGGBBAA → #RRGGBB)
		if (hexClean.length === 8) {
			hexClean = hexClean.substring(0, 6);
		}

		if (hexClean.length !== 6) {
			return null;
		}

		const r = parseInt(hexClean.substr(0, 2), 16);
		const g = parseInt(hexClean.substr(2, 2), 16);
		const b = parseInt(hexClean.substr(4, 2), 16);

		return { r, g, b };
	}

	// ✅ RGB/RGBA → RGB 변환
	rgbToRGB(rgbString) {
		const match = rgbString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/i);
		if (match) {
			return {
				r: parseInt(match[1]),
				g: parseInt(match[2]),
				b: parseInt(match[3])
			};
		}
		return null;
	}

	// ✅ HSL → RGB 변환
	hslToRGB(hslString) {
		const match = hslString.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/i);
		if (match) {
			const h = parseInt(match[1]) / 360;
			const s = parseInt(match[2]) / 100;
			const l = parseInt(match[3]) / 100;

			return this.hslToRGBValues(h, s, l);
		}
		return null;
	}

	// ✅ HSL 값을 RGB로 변환 (수학적 계산)
	hslToRGBValues(h, s, l) {
		let r, g, b;

		if (s === 0) {
			r = g = b = l; // 무채색
		} else {
			const hue2rgb = (p, q, t) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255)
		};
	}

	// ✅ 명명된 색상 → RGB 변환
	isNamedColor(color) {
		const namedColors = {
			'black': '#000000', 'white': '#ffffff', 'red': '#ff0000',
			'green': '#008000', 'blue': '#0000ff', 'yellow': '#ffff00',
			'cyan': '#00ffff', 'magenta': '#ff00ff', 'silver': '#c0c0c0',
			'gray': '#808080', 'maroon': '#800000', 'olive': '#808000',
			'purple': '#800080', 'teal': '#008080', 'navy': '#000080',
			'orange': '#ffa500', 'pink': '#ffc0cb', 'transparent': '#00000000'
		};
		return namedColors[color.toLowerCase()] !== undefined;
	}

	namedColorToRGB(colorName) {
		const namedColors = {
			'black': { r: 0, g: 0, b: 0 }, 'white': { r: 255, g: 255, b: 255 },
			'red': { r: 255, g: 0, b: 0 }, 'green': { r: 0, g: 128, b: 0 },
			'blue': { r: 0, g: 0, b: 255 }, 'yellow': { r: 255, g: 255, b: 0 },
			'cyan': { r: 0, g: 255, b: 255 }, 'magenta': { r: 255, g: 0, b: 255 },
			'silver': { r: 192, g: 192, b: 192 }, 'gray': { r: 128, g: 128, b: 128 },
			'maroon': { r: 128, g: 0, b: 0 }, 'olive': { r: 128, g: 128, b: 0 },
			'purple': { r: 128, g: 0, b: 128 }, 'teal': { r: 0, g: 128, b: 128 },
			'navy': { r: 0, g: 0, b: 128 }, 'orange': { r: 255, g: 165, b: 0 },
			'pink': { r: 255, g: 192, b: 203 }, 'transparent': { r: 0, g: 0, b: 0 }
		};

		return namedColors[colorName.toLowerCase()] || null;
	}

	//---------------------------------------------------------------------------------------------------------
	
	/**
     * ✅ 요소가 스크롤 중에 숨겨져야 하는지 확인
     */
    shouldHideElementDuringScroll() {
        return typeof isScrolling !== 'undefined' && isScrolling;
    }

    /**
     * ✅ 스크롤 중일 때 요소를 숨기는 스타일 적용
     */
    applyScrollHideStyle(element) {
        if (this.shouldHideElementDuringScroll()) {
            element.style.visibility = 'hidden';
            element.style.opacity = '0';
        }
    }

    /**
     * ✅ 스크롤이 끝났을 때 요소를 보이는 스타일 적용
     */
    applyScrollShowStyle(element) {
        element.style.visibility = 'visible';
        element.style.opacity = '';
    }

    /**
     * ✅ 스크롤 상태에 따라 측정을 수행해야 하는지 확인
     */
    shouldPerformMeasurements() {
        return !this.shouldHideElementDuringScroll();
    }



	// 요소 정보 ====================================================================================>>> START
	// ✅ [신규] Webflow 사이트 감지 함수 (간단한 버전)
	isWebflowSite() {
		try {
			// Webflow 특징 감지 (최소한의 검사)
			return document.querySelector('[class*="w-"]') !== null || 
				document.querySelector('meta[content*="Webflow"]') !== null;
		} catch (error) {
			return false;
		}
	}

	// ✅ [신규] 최적의 분석 요소 선택 함수
	getOptimalElementForAnalysis(originalElement) {
		if (!originalElement) return originalElement;
		
		console.log('🔍 Finding optimal element for analysis:', {
			original: originalElement.tagName,
			className: originalElement.className
		});
		
		// 1. 컨테이너 요소인지 확인
		if (this.isContainerElement(originalElement)) {
			const contentElement = this.findContentElement(originalElement);
			if (contentElement && contentElement !== originalElement) {
				console.log('🔄 Switching to content element:', contentElement.tagName);
				return contentElement;
			}
		}
		
		// 2. 텍스트만 있는 컨테이너인 경우 부모 요소 확인
		if (this.isTextOnlyContainer(originalElement)) {
			const parent = originalElement.parentElement;
			if (parent && this.hasVisualStyles(parent)) {
				console.log('🔄 Switching to styled parent:', parent.tagName);
				return parent;
			}
		}
		
		return originalElement;
	}

	// ✅ [신규] 컨테이너 요소 판별 (간단한 버전)
	isContainerElement(element) {
		if (!element) return false;
		
		const containerIndicators = [
			element.classList.contains('container'),
			element.classList.contains('wrapper'),
			element.classList.contains('section'),
			element.classList.contains('block'),
			element.childElementCount > 2, // 여러 자식을 가진 경우
			element.offsetWidth > 300 // 넓은 요소
		];
		
		return containerIndicators.some(indicator => indicator);
	}

	// ✅ [신규] 텍스트만 있는 컨테이너 판별
	isTextOnlyContainer(element) {
		if (!element || !element.textContent) return false;
		
		return element.textContent.trim().length > 0 && 
			element.children.length === 0 &&
			['DIV', 'SPAN', 'P'].includes(element.tagName);
	}

	// ✅ [신규] 시각적 스타일이 있는지 확인
	hasVisualStyles(element) {
		if (!element) return false;
		
		try {
			const style = window.getComputedStyle(element);
			return style.backgroundColor !== 'transparent' ||
				style.borderWidth !== '0px' ||
				style.boxShadow !== 'none' ||
				element.offsetWidth > 100;
		} catch (error) {
			return false;
		}
	}

	// ✅ [신규] 콘텐츠 요소 찾기 (우선순위 기반)
	findContentElement(container) {
		if (!container) return container;
		
		// 우선순위 1: 이미지 요소
		const imgElement = container.querySelector('img');
		if (imgElement) return imgElement;
		
		// 우선순위 2: 상호작용 요소 (버튼, 링크)
		const interactiveElement = container.querySelector('button, a, input');
		if (interactiveElement) return interactiveElement;
		
		// 우선순위 3: 시각적 스타일이 있는 첫 번째 자식
		for (let child of container.children) {
			if (this.hasVisualStyles(child)) {
				return child;
			}
		}
		
		// 우선순위 4: 첫 번째 자식 요소
		return container.firstElementChild || container;
	}

	// ✅ [신규] Webflow 요소 판별 함수
	isWebflowElement(element) {
		if (!element) return false;
		
		try {
			// Webflow 클래스 패턴 감지
			const hasWebflowClass = element.classList && 
				Array.from(element.classList).some(className => 
					className.startsWith('w-') || className.includes('_wf')
				);
			
			// 주변 Webflow 요소 감지
			const hasWebflowParent = element.closest('[class*="w-"]') !== null;
			
			return hasWebflowClass || hasWebflowParent;
		} catch (error) {
			return false;
		}
	}
	// 요소 정보 ====================================================================================>>> END
}
