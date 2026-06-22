// util.js
class Util {

	constructor(stateManager) {
		console.log('🎨 Util initializing...');

		if (!stateManager) {
			throw new Error('Util requires StateManager instance');
		}

		this.statemanager = stateManager; // ✅ StateManager 참조
		console.log('✅ Util initialized');
	}

	/**
     * ✅ Util 정리 메서드
     */
    cleanup() {
        console.log('🧹 Util cleaning up...');
        console.log('✅ Util cleaned up');
    }

    completeCleanup() {
        // Util은 별도 정리 불필요
    }
	//---------------------------------------------------------------------------------------

	/* getContrastColor 사용 예:
		this.getContrastColor('#ff0000');        // HEX
		this.getContrastColor('#f00');           // 짧은 HEX  
		this.getContrastColor('#ff000080');      // HEX with alpha
		this.getContrastColor('rgb(255,0,0)');   // RGB
		this.getContrastColor('rgba(255,0,0,0.5)'); // RGBA
		this.getContrastColor('hsl(0,100%,50%)'); // HSL
		this.getContrastColor('red');            // 명명된 색상
	*/
	// [공용] 대비 색상 계산 =====================================>>>
	/**
	 * ✅ 모든 색상 포맷을 지원하는 contrast color 계산
	 */
	getContrastColor(color) {
		const rgb = this.parseColorToRGB(color);
		if (!rgb) return '#ffffff';
		const brightness = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
		return brightness > 128 ? '#000000' : '#ffffff';
	}

	// ✅ 모든 색상 포맷을 RGB로 변환
	parseColorToRGB(color) {
		if (!color) return null;
		if (color.startsWith('#')) return this.hexToRGB(color);
		if (color.startsWith('rgb')) return this.rgbStrToRGB(color);
		if (color.startsWith('hsl')) return this.hslStrToRGB(color);
		if (this.isNamedColor(color)) return this.namedColorToRGB(color);
		return null;
	}

	// ✅ HEX → RGB 변환
	hexToRGB(hex) {
		let h = hex.replace('#', '');
		if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
		if (h.length === 8) h = h.substring(0, 6);
		if (h.length !== 6) return null;
		return {
			r: parseInt(h.substr(0, 2), 16),
			g: parseInt(h.substr(2, 2), 16),
			b: parseInt(h.substr(4, 2), 16)
		};
	}

	// ✅ RGB/RGBA 문자열 → RGB 변환 (간소화)
	rgbStrToRGB(str) {
		const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/i);
		return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : null;
	}

	// ✅ HSL/HSLA 문자열 → RGB 변환 (간소화)
	hslStrToRGB(str) {
		const match = str.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*[\d.]+)?\)/i);
		if (!match) return null;
		return this.hslToRGBValues(parseInt(match[1]) / 360, parseInt(match[2]) / 100, parseInt(match[3]) / 100);
	}

	// ✅ HSL 값을 RGB로 변환 (수학적 계산)
	hslToRGBValues(h, s, l) {
		let r, g, b;
		if (s === 0) {
			r = g = b = l;
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
		return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
	}

	// ✅ 명명된 색상 확인
	isNamedColor(color) {
		return this.getNamedColorRGBMap()[color.toLowerCase()] !== undefined;
	}

	// ✅ 명명된 색상 → RGB 값 변환
	namedColorToRGB(colorName) {
		return this.getNamedColorRGBMap()[colorName.toLowerCase()] || null;
	}

	// ✅ 명명된 색상 RGB 맵 반환
	getNamedColorRGBMap() {
		return {
			'black': { r: 0, g: 0, b: 0 },
			'white': { r: 255, g: 255, b: 255 },
			'red': { r: 255, g: 0, b: 0 },
			'green': { r: 0, g: 128, b: 0 },
			'blue': { r: 0, g: 0, b: 255 },
			'yellow': { r: 255, g: 255, b: 0 },
			'cyan': { r: 0, g: 255, b: 255 },
			'magenta': { r: 255, g: 0, b: 255 },
			'silver': { r: 192, g: 192, b: 192 },
			'gray': { r: 128, g: 128, b: 128 },
			'maroon': { r: 128, g: 0, b: 0 },
			'olive': { r: 128, g: 128, b: 0 },
			'purple': { r: 128, g: 0, b: 128 },
			'teal': { r: 0, g: 128, b: 128 },
			'navy': { r: 0, g: 0, b: 128 },
			'orange': { r: 255, g: 165, b: 0 },
			'pink': { r: 255, g: 192, b: 203 },
			'transparent': { r: 0, g: 0, b: 0 }
		};
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


	//=============================================================================================
	// 안전한 스토리지/메시지 유틸리티 (main-content.js에서 이동)
	//=============================================================================================

	/**
     * ✅ Chrome Storage에 안전하게 저장
     * @param {Object} items - 저장할 데이터
     * @param {Function} [callback] - 완료 콜백
     */
    safeStorageSet(items, callback) {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
                console.log('Chrome storage API not available');
                if (callback) setTimeout(callback, 100);
                return;
            }

            chrome.storage.sync.set(items, () => {
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

    /**
     * ✅ 조정된 요소들의 원래 스타일 복원
     */
    restoreAdjustedElements() {
        if (!this.statemanager) return;
        this.statemanager.temporarilyAdjustedElements.forEach(item => {
            if (item.element && item.element.style) {
                item.element.style.setProperty('opacity', item.originalOpacity, 'important');
                item.element.style.setProperty('pointer-events', item.originalPointerEvents, 'important');
            }
        });
        this.statemanager.temporarilyAdjustedElements = [];
    }

    /**
     * ✅ 안전한 postMessage 전송
     * @param {Window} targetWindow - 메시지를 보낼 대상 window
     * @param {*} message - 전송할 메시지
     * @param {string} targetOrigin - 대상 origin
     * @returns {boolean} 성공 여부
     */
    safePostMessage(targetWindow, message, targetOrigin) {
        try {
            if (!targetWindow || !targetWindow.postMessage) {
                console.log('Invalid target window for postMessage');
                return false;
            }

            let actualTargetOrigin = targetOrigin;

            try {
                if (targetWindow.location && targetWindow.location.origin) {
                    if (targetWindow.location.origin === window.location.origin) {
                        actualTargetOrigin = targetOrigin;
                    } else {
                        actualTargetOrigin = '*';
                        console.log('Different origin, using wildcard for postMessage');
                    }
                }
            } catch (securityError) {
                actualTargetOrigin = '*';
            }

            targetWindow.postMessage(message, actualTargetOrigin);
            return true;

        } catch (error) {
            console.log('Post message error:', error);
            return false;
        }
    }

	// 요소 정보 ====================================================================================>>> START
	// ✅ Webflow 사이트 감지 함수 (간단한 버전)
	isWebflowSite() {
		try {
			return document.querySelector('[class*="w-"]') !== null || 
				document.querySelector('meta[content*="Webflow"]') !== null;
		} catch (error) {
			return false;
		}
	}

	// ✅ 최적의 분석 요소 선택 함수
	getOptimalElementForAnalysis(originalElement) {
		if (!originalElement) return originalElement;
		
		console.log('🔍 Finding optimal element for analysis:', {
			original: originalElement.tagName,
			className: originalElement.className
		});
		
		if (this.isContainerElement(originalElement)) {
			const contentElement = this.findContentElement(originalElement);
			if (contentElement && contentElement !== originalElement) {
				console.log('🔄 Switching to content element:', contentElement.tagName);
				return contentElement;
			}
		}
		
		if (this.isTextOnlyContainer(originalElement)) {
			const parent = originalElement.parentElement;
			if (parent && this.hasVisualStyles(parent)) {
				console.log('🔄 Switching to styled parent:', parent.tagName);
				return parent;
			}
		}
		
		return originalElement;
	}

	// ✅ 컨테이너 요소 판별 (간단한 버전)
	isContainerElement(element) {
		if (!element) return false;
		
		const containerIndicators = [
			element.classList.contains('container'),
			element.classList.contains('wrapper'),
			element.classList.contains('section'),
			element.classList.contains('block'),
			element.childElementCount > 2,
			element.offsetWidth > 300
		];
		
		return containerIndicators.some(indicator => indicator);
	}

	// ✅ 텍스트만 있는 컨테이너 판별
	isTextOnlyContainer(element) {
		if (!element || !element.textContent) return false;
		
		return element.textContent.trim().length > 0 && 
			element.children.length === 0 &&
			['DIV', 'SPAN', 'P'].includes(element.tagName);
	}

	// ✅ 시각적 스타일이 있는지 확인
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

	// ✅ 콘텐츠 요소 찾기 (우선순위 기반)
	findContentElement(container) {
		if (!container) return container;
		
		const imgElement = container.querySelector('img');
		if (imgElement) return imgElement;
		
		const interactiveElement = container.querySelector('button, a, input');
		if (interactiveElement) return interactiveElement;
		
		for (let child of container.children) {
			if (this.hasVisualStyles(child)) {
				return child;
			}
		}
		
		return container.firstElementChild || container;
	}

	// ✅ Webflow 요소 판별 함수
	isWebflowElement(element) {
		if (!element) return false;
		
		try {
			const hasWebflowClass = element.classList && 
				Array.from(element.classList).some(className => 
					className.startsWith('w-') || className.includes('_wf')
				);
			
			const hasWebflowParent = element.closest('[class*="w-"]') !== null;
			
			return hasWebflowClass || hasWebflowParent;
		} catch (error) {
			return false;
		}
	}
	// 요소 정보 ====================================================================================>>> END
}
