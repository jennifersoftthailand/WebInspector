
// element-analyzer.js
//모든 측정 요소들이 동일한 방식(position: fixed + 뷰포트 좌표)으로 작동하므로, 네이버와 구글 모두에서 일관되게 정확한 위치에 표시

class ElementAnalyzer {
	constructor(stateManager) {
		//console.log('🔧 ElementAnalyzer initializing...');

		// 의존성 검사
		if (!stateManager) {
			throw new Error('ElementAnalyzer requires StateManager instance');
		}

		this.state = stateManager;
		this.lastUpdateTime = 0;
		this.MEASUREMENT_UPDATE_INTERVAL = 150;
		this.pendingUpdate = false;
		this.lastHighlightedElement = null;
		this.lastMeasurementTime = 0;
		this.MEASUREMENT_COOLDOWN = 300; // ✅ 300ms로 증가 (더 긴 쿨다운)
		this.lastMeasuredElement = null; // ✅ 마지막 측정 요소 추적

		// ✅ [성능] 하이라이트 및 측정 상태
		this.lastHighlightCallTime = 0;
		this.lastElementDistanceKey = null;
		this.lastElementDistanceTime = 0;
		this.lastMeasurementUpdateTime = 0;

		// ✅ [핵심] 하이라이트 안정화를 위한 변수
		this.lastHighlightedElementKey = null;
		this.highlightStableCount = 0;

		//------------------------------------------------------------------------------
		// ✅ 크로스헤어 설정 상수 - 점선 스타일 추가
        this.CROSSHAIR_CONFIG = {
			thickness: 1,           // ✅ 매우 가는 선 (1px)
			length: 30,             // ✅ 30px 길이
			crossThickness: 1,      // ✅ 십자 교차 선 두께
			crossLength: 100,       // ✅ 십자 교차 선 길이
			dashLength: 50,   // ✅ 점선 부분 길이 (15px * 3/5 = 9px)
			dashGap: 20,            // ✅ [수정] 점선 간격 (20px로 증가) - 방사형 점선 간격
			borderRadius: '1px',
			baseOpacity: 0.8,
			minOpacity: 0.2,
			edgeThreshold: 15,
			zIndex: '2147483640',
			// ✅ [추가] 좌표 표시 설정
			coordinateFontSize: '14px',
			coordinateFontWeight: 'bold',
			coordinateOffset: 8,    // ✅ 크로스헤어에서 좌표까지의 거리
			coordinateMinDistance: 20, // ✅ 뷰포트 경계에서 최소 거리
			
			crosshairPointColor: 'red', // 포인트를 주기위한 색상.
			// ✅ [신규 추가] 미세 조절 변수들
			fineTuning: {
				crosshairOffsetX: 0,    // ✅ X축 미세 조절 (-1 ~ +1 px)
				crosshairOffsetY: 0,    // ✅ Y축 미세 조절 (-1 ~ +1 px)
				dashGapLeft: 70,        // ✅ 왼쪽 점선 간격 (별도 설정)
				dashGapRight: 70,       // ✅ 오른쪽 점선 간격 (별도 설정)
				dashGapTop: 70,         // ✅ 위쪽 점선 간격 (별도 설정)
				dashGapBottom: 70       // ✅ 아래쪽 점선 간격 (별도 설정)
			}
		};

        //this.CROSSHAIR_CONFIG.dashLength = this.CROSSHAIR_CONFIG.crossLength*(3/5);

        // ✅ Crosshair 요소
        this.crosshairHorizontal = null;
        this.crosshairVertical = null;
        this.crosshairCrossHorizontal = null;
        this.crosshairCrossVertical = null;
        this.crosshairDashHorizontal = null;
        this.crosshairDashVertical = null;
        // ✅ [추가] 좌표 표시 요소
        this.coordinateX = null;
        this.coordinateY = null;
        this.lastCrosshairUpdate = 0;
        this.CROSSHAIR_UPDATE_INTERVAL = 1; // ~60fps
		this.cursorStyleElement = null;
		//------------------------------------------------------------------------------
        
	}


	//########################################################################################################################>>> START

	/**
     * ✅ 통합 Crosshair 생성 함수 - 점선 십자 교차 및 좌표 표시 추가
     */
    createCrosshair() {
        // 기존 Crosshair 제거
        this.removeCrosshair();

        const config = this.CROSSHAIR_CONFIG;
        const color = this.state.options.crosshairColor || '#0F9D58';

        // ✅ 공통 스타일 생성 함수
        const createCrosshairElement = (id, isHorizontal, isCross = false) => {
            const element = document.createElement('div');
            element.id = id;
            element.className = 'crosshair-part';
            
            // ✅ 기본 스타일
            Object.assign(element.style, {
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: config.zIndex,
                backgroundColor: 'color',
                borderRadius: config.borderRadius,
                opacity: config.baseOpacity,
                display: 'none',
                transform: 'none'
            });

            if (isCross) {
                // ✅ 십자 교차 크로스헤어 스타일
                if (isHorizontal) {
                    // 수평 십자 선
                    element.style.width = `${config.crossLength * 2}px`;  // 양쪽으로 퍼짐
                    element.style.height = `${config.crossThickness}px`;
                } else {
                    // 수직 십자 선
                    element.style.width = `${config.crossThickness}px`;
                    element.style.height = `${config.crossLength * 2}px`;  // 양쪽으로 퍼짐
                }
            } else {
                // ✅ 기존 뷰포트 외곽 크로스헤어 스타일
                if (isHorizontal) {
                    element.style.width = `${config.thickness}px`;
                    element.style.height = `${config.length}px`;
                } else {
                    element.style.width = `${config.length}px`;
                    element.style.height = `${config.thickness}px`;
                }
            }

            return element;
        };

        // ✅ 점선 십자선을 위한 추가 요소 생성 함수
        const createDashedCrosshairElement = (id, isHorizontal) => {
            const element = document.createElement('div');
            element.id = id;
            element.className = 'crosshair-dashed-part';
            
            Object.assign(element.style, {
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: config.zIndex - 1, // ✅ 실선보다 약간 아래에 표시
                backgroundColor: 'transparent',
                display: 'none',
                border: 'none'
            });

            if (isHorizontal) {
                // 수평 점선
                element.style.width = `${config.dashLength * 2}px`;  // 양쪽 점선 길이
                element.style.height = `${config.crossThickness}px`;
            } else {
                // 수직 점선
                element.style.width = `${config.crossThickness}px`;
                element.style.height = `${config.dashLength * 2}px`;  // 양쪽 점선 길이
            }

            return element;
        };

        // ✅ 좌표 표시 요소 생성 함수
        const createCoordinateElement = (id) => {
            const element = document.createElement('div');
            element.id = id;
            element.className = 'crosshair-coordinate';
            
            Object.assign(element.style, {
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: config.zIndex,
                color: color,
                fontSize: config.coordinateFontSize,
                fontWeight: config.coordinateFontWeight,
                fontFamily: 'monospace, Arial, sans-serif',
                backgroundColor: 'transparent',
                padding: '2px 4px',
                borderRadius: '3px',
                whiteSpace: 'nowrap',
                display: 'none',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                lineHeight: '1'
            });

            return element;
        };

        // ✅ 요소 생성 및 추가
        try {
            // 기존 뷰포트 외곽 크로스헤어
            this.crosshairHorizontal = createCrosshairElement('crosshair-horizontal', true, false);
            this.crosshairVertical = createCrosshairElement('crosshair-vertical', false, false);
            
            // ✅ 실선 십자 교차 크로스헤어 (중앙 부분)
            this.crosshairCrossHorizontal = createCrosshairElement('crosshair-cross-horizontal', true, true);
            this.crosshairCrossVertical = createCrosshairElement('crosshair-cross-vertical', false, true);
            
            // ✅ 점선 십자 교차 크로스헤어 (4방향 모두) - 간격 적용
            this.crosshairDashHorizontal = createDashedCrosshairElement('crosshair-dash-horizontal', true);      // 왼쪽
            this.crosshairDashHorizontalRight = createDashedCrosshairElement('crosshair-dash-horizontal-right', true); // 오른쪽
            this.crosshairDashVertical = createDashedCrosshairElement('crosshair-dash-vertical', false);         // 위쪽
            this.crosshairDashVerticalBottom = createDashedCrosshairElement('crosshair-dash-vertical-bottom', false); // 아래쪽
            
            // ✅ 좌표 표시 요소
            this.coordinateX = createCoordinateElement('crosshair-coordinate-x');
            this.coordinateY = createCoordinateElement('crosshair-coordinate-y');

            // ✅ 모든 요소가 유효한지 확인 후 추가
            const elementsToAdd = [
                this.crosshairHorizontal, this.crosshairVertical,
                this.crosshairCrossHorizontal, this.crosshairCrossVertical,
                this.crosshairDashHorizontal, this.crosshairDashHorizontalRight,
                this.crosshairDashVertical, this.crosshairDashVerticalBottom,
                this.coordinateX, this.coordinateY
            ];

            elementsToAdd.forEach(element => {
                if (element && element instanceof Node) {
                    document.body.appendChild(element);
                }
            });

        } catch (error) {
            console.error('Error creating crosshair elements:', error);
        }

        // ✅ 기본 마우스 스타일 강제 적용
        this.forceDefaultCursor();
    }

    /**
	 * ✅ 통합 Crosshair 업데이트 함수 - 점선 십자 교차 및 좌표 표시 추가
	 */
	updateCrosshair(x, y) {
		// ✅ 조기 종료 조건 - 모든 요소 체크
		if (!this.state.isInspectorActive || 
			!this.crosshairHorizontal || !this.crosshairVertical ||
			!this.crosshairCrossHorizontal || !this.crosshairCrossVertical ||
			!this.crosshairDashHorizontal || !this.crosshairDashHorizontalRight ||
			!this.crosshairDashVertical || !this.crosshairDashVerticalBottom ||
			!this.coordinateX || !this.coordinateY) {
			return;
		}

		const config = this.CROSSHAIR_CONFIG;
		const fineTuning = config.fineTuning;
		
		// ✅ [수정] 미세 조절 적용된 뷰포트 좌표
		const viewportX = (x - window.scrollX) + fineTuning.crosshairOffsetX;
		const viewportY = (y - window.scrollY) + fineTuning.crosshairOffsetY;
		
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// ✅ 뷰포트 경계 체크
		const isInViewport = 
			viewportX >= -5 && viewportX <= viewportWidth + 5 && 
			viewportY >= -5 && viewportY <= viewportHeight + 5;

		if (!isInViewport) {
			// ✅ 모든 크로스헤어 및 좌표 숨기기
			const allElements = [
				this.crosshairHorizontal, this.crosshairVertical, 
				this.crosshairCrossHorizontal, this.crosshairCrossVertical,
				this.crosshairDashHorizontal, this.crosshairDashHorizontalRight,
				this.crosshairDashVertical, this.crosshairDashVerticalBottom,
				this.coordinateX, this.coordinateY
			];

			allElements.forEach(el => {
				if (el) el.style.display = 'none';
			});
			return;
		}

		// ✅ 부드러운 위치 업데이트
		requestAnimationFrame(() => {
			const color = this.state.options.crosshairColor;

			// ✅ 1. 기존 뷰포트 외곽 크로스헤어 업데이트 - 실제 좌표 (미세 조절 적용)
			if (this.crosshairHorizontal) {
				Object.assign(this.crosshairHorizontal.style, {
					left: `${viewportX - (config.thickness / 2)}px`,
					top: '0px',
					width: `${config.thickness}px`,
					height: `${config.length}px`,
					backgroundColor: this.CROSSHAIR_CONFIG.crosshairPointColor, // ✅ [수정] 하드코딩된 red
					display: 'block'
				});
			}

			if (this.crosshairVertical) {
				Object.assign(this.crosshairVertical.style, {
					left: '0px',
					top: `${viewportY - (config.thickness / 2)}px`,
					width: `${config.length}px`,
					height: `${config.thickness}px`,
					backgroundColor: this.CROSSHAIR_CONFIG.crosshairPointColor, // ✅ [수정] 하드코딩된 red
					display: 'block'
				});
			}

			// ✅ 2. 실선 십자 교차 크로스헤어 업데이트 (중앙 부분) - 미세 조절 적용
			// 중앙 실선 길이 계산: 전체 길이(30px) - 점선 길이(18px) = 12px
			const solidLength = (config.crossLength * 2) - (config.dashLength * 2);
			
			// 수평 실선 (중앙 부분) - 실제 좌표
			if (this.crosshairCrossHorizontal) {
				Object.assign(this.crosshairCrossHorizontal.style, {
					left: `${viewportX - (solidLength / 2)}px`,  // 중앙 정렬
					top: `${viewportY - (config.crossThickness / 2)}px`,
					width: `${solidLength}px`,                   // 중앙 실선 길이
					height: `${config.crossThickness}px`,
					backgroundColor: this.CROSSHAIR_CONFIG.crosshairPointColor, // ✅ [수정] 하드코딩된 red
					display: 'block',
					opacity: 0.9
				});
			}

			// 수직 실선 (중앙 부분) - 실제 좌표
			if (this.crosshairCrossVertical) {
				Object.assign(this.crosshairCrossVertical.style, {
					left: `${viewportX - (config.crossThickness / 2)}px`,
					top: `${viewportY - (solidLength / 2)}px`,   // 중앙 정렬
					width: `${config.crossThickness}px`,
					height: `${solidLength}px`,                  // 중앙 실선 길이
					backgroundColor: this.CROSSHAIR_CONFIG.crosshairPointColor, // ✅ [수정] 하드코딩된 red
					display: 'block',
					opacity: 0.9
				});
			}

			// ✅ 3. 점선 십자 교차 크로스헤어 업데이트 (4방향 모두) - 개별 간격 적용
			// 왼쪽 점선
			if (this.crosshairDashHorizontal) {
				Object.assign(this.crosshairDashHorizontal.style, {
					left: `${viewportX - config.crossLength - fineTuning.dashGapLeft}px`, // ✅ 개별 간격 적용
					top: `${viewportY - (config.crossThickness / 2)}px`,
					width: `${config.dashLength * 2}px`,         // 점선 길이만
					height: `${config.crossThickness}px`,
					display: 'block',
					opacity: 0.7,
					borderTop: `1px dashed ${color}`
				});
			}

			// 오른쪽 점선
			if (this.crosshairDashHorizontalRight) {
				Object.assign(this.crosshairDashHorizontalRight.style, {
					left: `${viewportX + fineTuning.dashGapRight}px`, // ✅ 개별 간격 적용
					top: `${viewportY - (config.crossThickness / 2)}px`,
					width: `${config.dashLength * 2}px`,         // 점선 길이만
					height: `${config.crossThickness}px`,
					display: 'block',
					opacity: 0.7,
					borderTop: `1px dashed ${color}`
				});
			}

			// 위쪽 점선
			if (this.crosshairDashVertical) {
				Object.assign(this.crosshairDashVertical.style, {
					left: `${viewportX - (config.crossThickness / 2)}px`,
					top: `${viewportY - config.crossLength - fineTuning.dashGapTop}px`, // ✅ 개별 간격 적용
					width: `${config.crossThickness}px`,
					height: `${config.dashLength * 2}px`,        // 점선 길이만
					display: 'block',
					opacity: 0.7,
					borderLeft: `1px dashed ${color}`
				});
			}

			// 아래쪽 점선
			if (this.crosshairDashVerticalBottom) {
				Object.assign(this.crosshairDashVerticalBottom.style, {
					left: `${viewportX - (config.crossThickness / 2)}px`,
					top: `${viewportY + fineTuning.dashGapBottom}px`, // ✅ 개별 간격 적용
					width: `${config.crossThickness}px`,
					height: `${config.dashLength * 2}px`,        // 점선 길이만
					display: 'block',
					opacity: 0.7,
					borderLeft: `1px dashed ${color}`
				});
			}

			// ✅ 4. 좌표 표시 업데이트 - 뷰포트 외곽 크로스헤어에 표시
			this.updateCoordinateDisplay(viewportX, viewportY, viewportWidth, viewportHeight, color);

			// ✅ 5. 기존 뷰포트 경계 보정
			if (this.crosshairHorizontal) {
				if (viewportY < config.length) {
					this.crosshairHorizontal.style.top = 'auto';
					this.crosshairHorizontal.style.bottom = '0px';
					this.crosshairHorizontal.style.height = `${Math.min(config.length, viewportY + config.edgeThreshold)}px`;
				} else {
					this.crosshairHorizontal.style.top = '0px';
					this.crosshairHorizontal.style.bottom = 'auto';
					this.crosshairHorizontal.style.height = `${config.length}px`;
				}
			}

			if (this.crosshairVertical) {
				if (viewportX < config.length) {
					this.crosshairVertical.style.left = 'auto';
					this.crosshairVertical.style.right = '0px';
					this.crosshairVertical.style.width = `${Math.min(config.length, viewportX + config.edgeThreshold)}px`;
				} else {
					this.crosshairVertical.style.left = '0px';
					this.crosshairVertical.style.right = 'auto';
					this.crosshairVertical.style.width = `${config.length}px`;
				}
			}

			// ✅ 6. 투명도 조정 (기존 뷰포트 크로스헤어만 적용)
			if (this.crosshairHorizontal) {
				const horizontalOpacity = viewportY < config.edgeThreshold ? 
					Math.max(config.minOpacity, (viewportY / config.edgeThreshold) * config.baseOpacity) : config.baseOpacity;
				this.crosshairHorizontal.style.opacity = horizontalOpacity;
			}

			if (this.crosshairVertical) {
				const verticalOpacity = viewportX < config.edgeThreshold ? 
					Math.max(config.minOpacity, (viewportX / config.edgeThreshold) * config.baseOpacity) : config.baseOpacity;
				this.crosshairVertical.style.opacity = verticalOpacity;
			}
		});
	}

	/**
	 * ✅ 좌표 표시 업데이트 함수 - 뷰포트 외곽 크로스헤어에 표시
	 */
	updateCoordinateDisplay(viewportX, viewportY, viewportWidth, viewportHeight, color) {
		const config = this.CROSSHAIR_CONFIG;
		
		// ✅ X축 좌표 표시 - X축 크로스헤어(상단 가로선)의 오른쪽에 표시
		if (this.coordinateX) {
			this.coordinateX.textContent = `${Math.round(viewportX)}`;
			this.coordinateX.style.color = this.CROSSHAIR_CONFIG.crosshairPointColor; // ✅ [수정] 하드코딩된 'red'
			this.coordinateX.style.display = 'block';
			
			// X축 크로스헤어 위치 기준으로 좌표 표시
			let xCoordinateX = viewportX + config.coordinateOffset;
			let xCoordinateY = 5; // 상단 X축 크로스헤어 근처
			
			// X축 좌표가 뷰포트를 벗어나는지 확인
			this.coordinateX.style.left = `${xCoordinateX}px`;
			this.coordinateX.style.top = `${xCoordinateY}px`;
			this.coordinateX.style.transform = 'none';
			
			const xRect = this.coordinateX.getBoundingClientRect();
			if (xRect.right > viewportWidth - config.coordinateMinDistance) {
				// 오른쪽 공간 부족 - X축 크로스헤어 왼쪽에 표시
				xCoordinateX = viewportX - config.coordinateOffset - xRect.width;
			}
			
			this.coordinateX.style.left = `${xCoordinateX}px`;
			this.coordinateX.style.top = `${xCoordinateY}px`;
		}
		
		// ✅ Y축 좌표 표시 - Y축 크로스헤어(좌측 세로선)의 위쪽에 표시
		if (this.coordinateY) {
			this.coordinateY.textContent = `${Math.round(viewportY)}`;
			this.coordinateY.style.color = this.CROSSHAIR_CONFIG.crosshairPointColor; // ✅ [수정] 하드코딩된 'red'
			this.coordinateY.style.display = 'block';
			
			// Y축 크로스헤어 위치 기준으로 좌표 표시
			let yCoordinateX = 2; // 좌측 Y축 크로스헤어 근처
			let yCoordinateY = viewportY - config.coordinateOffset-20; // ✅ [수정] -20 추가 오프셋
			
			// Y축 좌표가 뷰포트를 벗어나는지 확인
			this.coordinateY.style.left = `${yCoordinateX}px`;
			this.coordinateY.style.top = `${yCoordinateY}px`;
			this.coordinateY.style.transform = 'none';
			
			const yRect = this.coordinateY.getBoundingClientRect();
			if (yRect.top < config.coordinateMinDistance) {
				// 위쪽 공간 부족 - Y축 크로스헤어 아래쪽에 표시
				yCoordinateY = viewportY + config.coordinateOffset;
			}
			
			this.coordinateY.style.left = `${yCoordinateX}px`;
			this.coordinateY.style.top = `${yCoordinateY}px`;
		}
	}

    /**
     * ✅ Crosshair 제거 함수 - 점선 요소들 및 좌표 표시도 제거
     */
    removeCrosshair() {
        // ✅ 기존 뷰포트 크로스헤어 및 좌표 표시 제거
        const elementsToRemove = [
            this.crosshairHorizontal, this.crosshairVertical,
            this.crosshairCrossHorizontal, this.crosshairCrossVertical,
            this.crosshairDashHorizontal, this.crosshairDashHorizontalRight,
            this.crosshairDashVertical, this.crosshairDashVerticalBottom,
            this.coordinateX, this.coordinateY
        ];

        elementsToRemove.forEach(element => {
            if (element && element.parentNode) {
                try {
                    element.parentNode.removeChild(element);
                } catch (error) {
                    console.error('Error removing crosshair element:', error);
                }
            }
        });

        // ✅ null로 초기화
        this.crosshairHorizontal = null;
        this.crosshairVertical = null;
        this.crosshairCrossHorizontal = null;
        this.crosshairCrossVertical = null;
        this.crosshairDashHorizontal = null;
        this.crosshairDashHorizontalRight = null;
        this.crosshairDashVertical = null;
        this.crosshairDashVerticalBottom = null;
        this.coordinateX = null;
        this.coordinateY = null;
        
        // ✅ 마우스 스타일 제거
        if (this.cursorStyleElement && this.cursorStyleElement.parentNode) {
            try {
                this.cursorStyleElement.parentNode.removeChild(this.cursorStyleElement);
            } catch (error) {
                console.error('Error removing cursor style:', error);
            }
            this.cursorStyleElement = null;
        }
    }

    /**
     * ✅ Crosshair 표시/숨김 토글 - 점선 요소들 및 좌표 표시도 포함
     */
    toggleCrosshair(show) {
        const display = show ? 'block' : 'none';
        
        const allCrosshairElements = [
            this.crosshairHorizontal, this.crosshairVertical,
            this.crosshairCrossHorizontal, this.crosshairCrossVertical,
            this.crosshairDashHorizontal, this.crosshairDashHorizontalRight,
            this.crosshairDashVertical, this.crosshairDashVerticalBottom,
            this.coordinateX, this.coordinateY
        ];

        allCrosshairElements.forEach(element => {
            if (element) {
                element.style.display = display;
            }
        });
        
        // ✅ 마우스 스타일도 토글
        if (this.cursorStyleElement) {
            this.cursorStyleElement.disabled = !show;
        }
    }

	/**
	 * ✅ 마우스 커서 숨기기 함수
	 */
	forceDefaultCursor() {
		// ✅ 모든 요소에서 커서 완전히 숨기기
		const style = document.createElement('style');
		style.id = 'hidden-cursor-style';
		style.textContent = `
			* {
				cursor: crosshair !important;
			}
			.crosshair-part, .crosshair-dashed-part {
				cursor: crosshair !important;
			}
		`;
		
		// 기존 스타일이 있으면 제거
		if (this.cursorStyleElement && this.cursorStyleElement.parentNode) {
			this.cursorStyleElement.parentNode.removeChild(this.cursorStyleElement);
		}
		
		document.head.appendChild(style);
		this.cursorStyleElement = style;
	}
	

	//--------------------------------------------------------------------------------------------------------


	/**
	 * ✅ [통합] completeCleanup - 모든 컴포넌트에서 통일
	 */
	completeCleanup() {
        
        // ✅ 모든 하이라이트 제거
        this.removeHighlight();
        this.removeSelectedElement();
        this.removeExternalElementHighlights();
        
        // ✅ 모든 측정 요소 제거
        this.removeCurrentMeasurements();

		// ✅ Crosshair 제거
		this.removeCrosshair();
        
        // ✅ 상태 변수 초기화
        this.currentElement = null;
        this.selectedElement = null;
        this.highlightElement = null;
        this.selectedElementHighlight = null;
        this.measureElements = [];
        
		// ✅ 추가 정리 작업
		this.stateManager = null;

		

		console.log('✅ ElementAnalyzer completely cleaned up');
	}

	/**
	 * ✅ [내부] _checkPerpendicularElement - private 함수로 변경
	 */
	_checkPerpendicularElement(direction, element, elementRect, targetRect, adjacentElements) {
		let distance;
		let isPerpendicular = false;

		// ✅ [개선] 더 유연한 수직 관계 조건
		switch (direction) {
			case 'left':
				isPerpendicular = elementRect.right <= targetRect.left &&
					elementRect.bottom > targetRect.top &&
					elementRect.top < targetRect.bottom;
				distance = targetRect.left - elementRect.right;
				break;
			case 'right':
				isPerpendicular = elementRect.left >= targetRect.right &&
					elementRect.bottom > targetRect.top &&
					elementRect.top < targetRect.bottom;
				distance = elementRect.left - targetRect.right;
				break;
			case 'top':
				isPerpendicular = elementRect.bottom <= targetRect.top &&
					elementRect.right > targetRect.left &&
					elementRect.left < targetRect.right;
				distance = targetRect.top - elementRect.bottom;
				break;
			case 'bottom':
				isPerpendicular = elementRect.top >= targetRect.bottom &&
					elementRect.right > targetRect.left &&
					elementRect.left < targetRect.right;
				distance = elementRect.top - targetRect.bottom;
				break;
		}

		// ✅ 거리 유효성 검사
		if (isPerpendicular && !isNaN(distance) && distance > 0 && distance < 5000) {
			if (distance < adjacentElements[direction].distance) {
				adjacentElements[direction] = { element, distance };
			}
		}
	}
	//########################################################################################################################>>> END


	// 요소 가시성 확인
	isElementVisible(element) {
		if (!element || !element.getBoundingClientRect) return false;

		try {
			const rect = element.getBoundingClientRect();
			const style = window.getComputedStyle(element);

			if (style.display === 'none' ||
				style.visibility === 'hidden' ||
				parseFloat(style.opacity) < 0.1) {
				return false;
			}

			if (rect.width <= 0 || rect.height <= 0) {
				return false;
			}

			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (rect.right < 0 ||
				rect.bottom < 0 ||
				rect.left > viewportWidth ||
				rect.top > viewportHeight) {
				return false;
			}

			if (element.tagName === 'IFRAME' && (!element.src || element.src === 'about:blank')) {
				return false;
			}

			return true;

		} catch (error) {
			//console.log('Visibility check error:', error);
			return false;
		}
	}

	// UI 요소 확인
	// UI 요소 확인
	isUIElement(element) {
		if (!element) return false;

		if (this.isWebInspectorPanelElement(element)) {
			return true;
		}

		// ✅ [추가] 토글 버튼 요소 체크
		if (this.isToggleButtonElement(element)) {
			return true;
		}

		// ✅ [추가] Premium Web Tools 광고 컨테이너 요소 제외
		const isPremiumAdContainer = element.closest && (
			// ✅ 광고 컨테이너 자체 또는 그 자식 요소인지 확인
			element.id === 'ad-container' ||
			element.closest('#ad-container') ||
			// ✅ Premium Web Tools 관련 스타일이나 내용을 가진 요소 확인
			(element.style && (
				element.style.background && element.style.background.includes('linear-gradient(135deg, #667eea 0%, #764ba2 100%)') ||
				element.style.background && element.style.background.includes('667eea') ||
				element.style.background && element.style.background.includes('764ba2')
			)) ||
			// ✅ Premium Web Tools 텍스트 내용을 가진 요소 확인
			(element.textContent && (
				element.textContent.includes('Premium Web Tools') ||
				element.textContent.includes('Upgrade for advanced features') ||
				element.textContent.includes('ad-free experience') ||
				element.textContent.includes('Learn More')
			)) ||
			// ✅ 특정 스타일 조합을 가진 요소 확인
			(element.style && element.style.display === 'flex' && 
			element.style.flexDirection === 'column' && 
			element.style.alignItems === 'center' && 
			element.style.justifyContent === 'center' &&
			element.style.color === 'white')
		);

		// 요소 자체가 UI 요소인지 확인
		const isUiElement = element.id === 'web-inspector-panel' ||
			element.id === 'ad-container' ||
			element.id === 'crosshair' ||
			element.id === 'coord-tooltip' ||
			element.id === 'downloadId' ||
			element.classList.contains('highlight-element') ||
			element.classList.contains('selected-element') ||
			element.classList.contains('measurement-line') ||
			element.classList.contains('measurement-text') ||
			element.classList.contains('size-line-extended') ||
			element.classList.contains('size-line-vertical-extended') ||
			element.classList.contains('margin-value-text') ||
			element.classList.contains('padding-value-text') ||
			element.classList.contains('center-marker') ||
			element.classList.contains('t-line-with-markers') ||
			element.classList.contains('t-line-vertical-with-markers') ||
			element.classList.contains('connected-tooltip') ||
			element.classList.contains('cookie-message') ||
			element.classList.contains('premium-popup') ||
			element.classList.contains('crosshair-part') ||
			element.classList.contains('external-element-highlight') ||
			element.classList.contains('child-highlight') ||
			element.classList.contains('padding-highlight') ||

			// ✅ 패널 내부의 모든 요소 감지
			element.closest('.web-inspector-panel') ||
			element.closest('.premium-popup') ||
			element.closest('.cookie-message') ||
			element.closest('.measurement-line') ||
			element.closest('.measurement-text') ||
			element.closest('.margin-value-text') ||
			element.closest('.padding-value-text') ||
			element.closest('#web-inspector-panel') ||
			element.closest('#crosshair') ||
			element.closest('.premium-popup') ||
			element.closest('.crosshair-part') ||
			element.closest('.external-element-highlight') ||
			element.closest('.child-highlight') ||
			element.closest('.padding-highlight') ||

			// ✅ [추가] Premium 광고 컨테이너 체크
			isPremiumAdContainer;

		return isUiElement;
	}

	// 웹 인스펙터 패널 요소 확인
	// ✅ 추가: 웹 인스펙터 패널 요소인지 확인
	isWebInspectorPanelElement(element) {
		if (!element) return false;

		// ✅ 요소 상세 패널 또는 그 자식 요소인지 확인
		return element.id === 'web-inspector-panel' ||
			element.closest('#web-inspector-panel') ||

			// ✅ 패널 내부의 특정 요소들도 확인
			element.closest('.panel-container') ||
			element.closest('.setting-group') ||
			element.closest('.setting-item') ||
			element.closest('.premium-feature');
	}

	// 측정 요소 확인
	isMeasurementElement(element) {
		if (!element || !element.classList) return false;

		const measurementClasses = [
			'external-element-highlight', 'measurement-line', 'measurement-text',
			'size-line-extended', 'size-line-vertical-extended', 'margin-value-text',
			'padding-value-text', 'child-highlight', 'padding-highlight',
			't-line-with-markers', 't-line-vertical-with-markers'
		];

		for (const className of measurementClasses) {
			if (element.classList.contains(className)) {
				return true;
			}
		}

		if (element.closest) {
			for (const className of measurementClasses) {
				if (element.closest('.' + className)) {
					return true;
				}
			}
		}

		return false;
	}

	// 광고/iframe 요소 확인
	// ✅ 추가: 광고/iframe 요소인지 확인하는 함수 (기존 함수들 아래에 추가)
	// ✅ 수정: 광고/iframe 요소인지 확인하는 함수 - 패널 요소 제외
	// 2. ✅ iframe 요소 필터링 로직 수정
	isAdOrIframeElement(element) {
		if (!element || !element.matches) return false;

		// ✅ 웹 인스펙터 패널 요소는 iframe/광고로误认하지 않음
		if (this.isWebInspectorPanelElement(element)) {
			return false;
		}

		// ✅ border-radius 표시기 요소는 건너뛰기
		if (element.classList.contains('corner-radius-indicator') ||
			element.classList.contains('radius-value-text')) {
			return false;
		}

		// iframe 요소인지 확인
		if (element.tagName === 'IFRAME') {
			// ✅ 패널 iframe은 제외
			if (element.id === 'web-inspector-panel' ||
				element.closest('#web-inspector-panel')) {
				return false;
			}

			// ✅ 특정 ID 패턴의 iframe은 광고로 처리
			const adIframePatterns = [
				'ad_timeboard_tgtLREC',
				'right-ad-1_tgtLREC',
				'right-ad-2_tgtLREC',
				/ad/,
				/tgt/,
				/LREC/
			];

			for (const pattern of adIframePatterns) {
				if (typeof pattern === 'string') {
					if (element.id === pattern || element.title === pattern) {
						return true;
					}
				} else if (pattern.test(element.id) || pattern.test(element.title)) {
					return true;
				}
			}

			return true;
		}
	}

	// SVG 요소 확인
	isSVGElement(element) {
		return element instanceof SVGElement ||
			element.tagName === 'svg' ||
			element.namespaceURI === 'http://www.w3.org/2000/svg' ||
			element.closest('svg');
	}

	// 요소 하이라이트 - 표준 뷰포트 좌표계 사용
	/*
		1. function handleMouseMove(e) { elementAnalyzer.highlightElementAtPoint(documentX, documentY); } ->
		2. highlightElementAtPoint -> 
		3. updateMeasurements -> displayDistanceToViewport -> createViewportDistanceLine
		   updateMeasurements -> measureElementDistances -> displayElementDistance -> createDistanceLineWithViewportAvoidance
		   updateMeasurements -> displayMarginMeasurements -> createMarginArea
		   updateMeasurements -> displayPaddingMeasurements -> createPaddingArea
		   updateMeasurements -> displayElementSize -> createMeasurementLine -> createMeasurementTextElement
	*/
	// ✅ [수정] 요소 하이라이트 - 좌표계 명확히 처리
	// ✅ [강화] 요소 하이라이트 - 선택된 요소 있을 때 완전 차단
	// ✅ [수정] 요소 하이라이트 - 선택된 요소 있어도 하이라이트는 유지, 측정값만 차단
	// ✅ [최적화] 요소 하이라이트 - 스크롤 후에도 안정적으로 작동
	// ✅ [수정] 기존 highlightElementAtPoint 함수를 업그레이드 - 새 함수 추가하지 않음
	// ✅ [수정] 요소 하이라이트 - 선택된 요소 있어도 하이라이트만 표시
	highlightElementAtPoint(x, y) {

		/*
		// ✅ [성능] 디바운스 로직
		const now = Date.now();
		if (now - this.lastHighlightCallTime < 30) return;
		this.lastHighlightCallTime = now;
		*/

		if (!this.state.isInspectorActive) return;

		// ✅ Crosshair 업데이트
    	// ✅ 부드러운 Crosshair 업데이트
		requestAnimationFrame(() => {
			this.updateCrosshair(x, y);
		});

		// ✅ [수정] 선택된 요소가 있어도 함수 계속 실행 (하이라이트만 표시)
		const hasSelectedElement = !!this.state.selectedElement;
		if (hasSelectedElement) {
			//console.log('🔍 Selected element exists - showing highlight only');
		}
		/*
		// ✅ [디버깅] torinodesign 문제 진단
		const isTorinoSite = window.location.hostname.includes('torinodesign');
		if (isTorinoSite) {
			console.log('🔍 Torino Debug:', {
				inputX: x,
				inputY: y,
				scrollX: window.scrollX,
				scrollY: window.scrollY,
				viewportX: x - window.scrollX,
				viewportY: y - window.scrollY,
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight,
				clientHeight: document.documentElement.clientHeight
			});
		}
		*/
		// ✅ [수정] 정확한 좌표 변환 (룰러 보정 제거)
		const viewportX = x - window.scrollX;
		const viewportY = y - window.scrollY;
		
		//console.log(`🔍 Highlight at point - Viewport: (${viewportX}, ${viewportY}), Selected: ${hasSelectedElement}`);

		// ✅ [신규] 플로팅 버튼 패널 영역 체크만 유지
		if (this.isFloatingPanelArea(viewportX, viewportY)) {
			this.removeHighlight();
			if (!this.state.selectedElement) {
				this.removeCurrentMeasurements();
				this.state.currentElement = null;
				this.state.lastMeasuredElement = null;
			}
			return;
		}

		// ✅ [개선] 정확한 요소 찾기
		let targetElement = this.findElementAtExactPoint(viewportX, viewportY);
		
		if (!targetElement) {
			this.removeHighlight();
			if (!this.state.selectedElement) {
				this.removeCurrentMeasurements();
				this.state.currentElement = null;
				this.state.lastMeasuredElement = null;
			}
			return;
		}

		// ✅ 동일한 요소면 업데이트 건너뛰기
		if (this.state.currentElement === targetElement && this.state.highlightElement) {
			//console.log('⏭️ Same element, skipping highlight update');
			return;
		}

		//console.log(`🔄 Element changed: ${this.state.currentElement?.tagName} → ${targetElement.tagName}, Selected: ${hasSelectedElement}`);
		this.state.currentElement = targetElement;

		// ✅ 하이라이트 업데이트
		this.updateHighlightElement(targetElement);

		// ✅ [핵심 수정] 선택된 요소가 없을 때만 측정값 업데이트
		if (!this.state.selectedElement) {
			setTimeout(() => {
				if (this.state.isInspectorActive && !this.state.selectedElement) {
					//console.log('📐 Updating measurements for current element');
					this.updateMeasurements();
				}
			}, 0);
		} else {
			//console.log('📏 Selected element exists - highlight only (no current element measurements)');
		}
	}
	// ✅ [신규] 플로팅 패널 영역 체크 함수
	isFloatingPanelArea(x, y) {
		const floatingPanel = document.getElementById('floating-button-panel');
		if (!floatingPanel) return false;
		
		const panelRect = floatingPanel.getBoundingClientRect();
		
		// 패널 영역 내에 있는지 확인 (여유 공간 추가)
		return x >= panelRect.left - 10 &&
			x <= panelRect.right + 10 &&
			y >= panelRect.top - 10 &&
			y <= panelRect.bottom + 10;
	}


	// ✅ [신규] 정확한 요소 찾기 함수 (보조 함수)
	findElementAtExactPoint(viewportX, viewportY) {
		let elements;
		try {
			elements = document.elementsFromPoint(viewportX, viewportY);
			//console.log(`🔍 Found ${elements.length} elements at exact viewport point (${viewportX}, ${viewportY})`);
		} catch (error) {
			//console.log('❌ elementsFromPoint error:', error);
			return null;
		}

		for (let element of elements) {
			if (element === document.body || element === document.documentElement) {
				//console.log('⏭️ Skipping body/html element');
				continue;
			}

			if (this.shouldIgnoreElement(element)) {
				continue;
			}

			if (element.classList.contains('iframe-overlay')) {
				const iframeElement = this.findIframeFromOverlay(element);
				if (iframeElement) {
					//console.log(`🎯 Found iframe from overlay: ${iframeElement.tagName}`);
					return iframeElement;
				}
				continue;
			}

			//console.log(`✅ Found target element: ${element.tagName}.${element.className}`);
			return element;
		}
		
		//console.log('❌ No valid target element found');
		return null;
	}

	// ✅ [신규] 하이라이트 요소 업데이트 함수 (보조 함수)
	updateHighlightElement(targetElement) {
		const targetRect = targetElement.getBoundingClientRect();
		
		// ✅ 뷰포트 내부인지 엄격히 확인
		const isInStrictViewport = 
			targetRect.width > 0 && 
			targetRect.height > 0 &&
			targetRect.right >= 0 &&
			targetRect.bottom >= 0 &&
			targetRect.left <= window.innerWidth &&
			targetRect.top <= window.innerHeight;

		if (!isInStrictViewport) {
			//console.log('🚫 Element outside strict viewport, removing highlight');
			this.removeHighlight();
			return;
		}
		
		if (this.state.highlightElement) {
			// 기존 하이라이트가 있으면 위치만 업데이트
			this.state.highlightElement.style.left = `${targetRect.left}px`;
			this.state.highlightElement.style.top = `${targetRect.top}px`;
			this.state.highlightElement.style.width = `${targetRect.width}px`;
			this.state.highlightElement.style.height = `${targetRect.height}px`;
			this.state.highlightElement.style.display = 'block';
			//console.log(`📌 Updated existing highlight for: ${targetElement.tagName}.${targetElement.className}`);
		} else {
			// 새 하이라이트 생성
			this.state.highlightElement = this.createHighlightElement(
				targetRect,
				this.state.options.highlightColor,
				'highlight'
			);
			document.body.appendChild(this.state.highlightElement);
			//console.log(`✅ Created new highlight for: ${targetElement.tagName}.${targetElement.className}`);
		}
	}
	// ✅ [신규] 엄격한 뷰포트 내부 검사
	isElementInStrictViewport(rect) {
		return (
			rect.width > 0 && 
			rect.height > 0 &&
			rect.right >= 0 &&
			rect.bottom >= 0 &&
			rect.left <= window.innerWidth &&
			rect.top <= window.innerHeight
		);
	}

	// element-analyzer.js - isPanelArea 함수 추가
	// ✅ 추가: 패널 영역 감지 함수
	isPanelArea(x, y) {
		if (!this.state.panelFrame) return false;

		const panelRect = this.state.panelFrame.getBoundingClientRect();
		const isPanelVisible = this.state.panelFrame.style.visibility !== 'hidden' &&
			this.state.panelFrame.style.transform !== 'translateX(-100%)' &&
			this.state.panelFrame.style.transform !== 'translateX(100%)';

		if (!isPanelVisible) return false;

		// ✅ 패널 영역 내에 있는지 확인 (여유 공간 추가)
		return x >= panelRect.left - 10 &&
			x <= panelRect.right + 10 &&
			y >= panelRect.top - 10 &&
			y <= panelRect.bottom + 10;
	}

	// ✅ 하이라이트 제거 함수가 선택된 요소 하이라이트를 제거하지 않는지 확인
	removeHighlight() {
		// ✅ 이 함수는 선택된 요소 하이라이트를 제거하면 안됨!
		if (this.state.highlightElement &&
			this.state.highlightElement.id !== 'web-inspector-selected-highlight' &&
			!this.state.highlightElement.classList.contains('selected-element')) {
			try {
				this.state.highlightElement.remove();
			} catch (e) {
				//console.log('Error removing highlight:', e);
			}
			this.state.highlightElement = null;
		}
	}

	// 요소 선택
	// element-analyzer.js - selectElement 함수에서 하이라이트 생성 부분 확인
	selectElement(element) {
		////console.log('🎯 selectElement called with:', element);

		// 측정 요소 클릭 무시
		if (this.isMeasurementElement(element) && !element.classList.contains('iframe-overlay')) {
			//console.log('❌ Element is measurement element, skipping selection');
			return false;
		}

		//console.log('this.state.selectedElement = '+this.state.selectedElement);
		// ✅ 1. 이전 선택된 요소가 있으면 완전히 정리
		if (this.state.selectedElement) {
			////console.log('🔄 Removing previous selected element');
			this.removeSelectedElement(); // 이전 선택 요소 완전 정리
		}
		else
		{
			//console.log('열기!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
			this.openBasicInformationAccordion();
		}

		// ✅ 2. 새로운 요소 선택
		this.state.selectedElement = element;
		////console.log('✅ New element selected:', this.state.selectedElement);

		// ✅ 3. 선택된 요소 하이라이트 생성 (강력한 버전)
		this.createSelectedElementHighlight();

		// ✅ 4. 현재 하이라이트 제거 (선택 모드로 전환)
		this.removeHighlight();
		this.state.currentElement = null;
		this.state.lastMeasuredElement = null;

		// ✅ 5. 선택된 요소에 대한 측정값 표시
		this.removeCurrentMeasurements(); // 기존 측정값 제거
		this.updateMeasurements(); // 새로운 선택 요소 측정값 표시

		// ✅ 6. 요소 정보 패널에 정보 표시
		//this.showElementInfo(this.state.selectedElement);
		// ✅ 패널에 정보 표시
		if (this.state.elementInfo ) {
			this.state.elementInfo.displayElementInfo(this.state.selectedElement);
		}

		return true;
	}


	// ✅ 추가: 폴백 하이라이트 생성 함수
	// ✅ 수정: 선택된 요소 하이라이트 생성 함수 - fixed로 통일
	createSelectedElementHighlight() {
		if (!this.state.selectedElement) return;

		// 기존 하이라이트 완전 제거
		if (this.state.selectedElementHighlight) {
			try {
				this.state.selectedElementHighlight.remove();
			} catch (e) {
				//console.log('Error removing old highlight:', e);
			}
			this.state.selectedElementHighlight = null;
		}

		const element = this.state.selectedElement;
		const rect = element.getBoundingClientRect();

		// ✅ 수정: createHighlightElement 사용
		this.state.selectedElementHighlight = this.createHighlightElement(
			rect,
			this.state.options.selectedColor,
			'selected',
			{ bgOpacity: '30' }
		);

		document.body.appendChild(this.state.selectedElementHighlight);
		////console.log('✅ Selected element highlight created with proper z-index');
	}

	// 선택된 요소 제거 - 요소 해제 시 Measurement Modes 아코디언 열기
	removeSelectedElement() {
		////console.log('🗑️ Removing selected element and all measurements');
		
		// ✅ 1. 선택된 요소 하이라이트 제거
		if (this.state.selectedElementHighlight) {
			try {
				this.state.selectedElementHighlight.remove();
			} catch (e) {
				//console.log('Error removing selected element highlight:', e);
			}
			this.state.selectedElementHighlight = null;
		}

		// ✅ 2. 모든 측정값 제거 (선택된 요소 포함)
		this.removeAllMeasurementsIncludingSelected();
		this.removeExternalElementHighlights();

		// ✅ 3. 상태 초기화
		this.state.selectedElement = null;
		////console.log('✅ Selected element completely removed');
	}

	// ✅ 추가: Basic Information 아코디언 열기 함수
	openBasicInformationAccordion() {
		
		//console.log('---------------------------------------- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 1');
		if (!this.state.elementInfo) {
			//console.error('❌ ElementInfo not available');
			return;
		}
		
		// 1. 먼저 패널 표시
		this.state.elementInfo.showPanel();
		
		// 2. 약간의 지연 후 아코디언 열기 (렌더링 보장)
		setTimeout(() => {
			this.state.elementInfo.onOffSpecificAccordion('OPEN_ACCORDION', 'basic-information');
			//console.log('✅ Panel and accordion opened');
		}, 50);
		
		//console.log('---------------------------------------- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 2');	
		/*
		this.state.ElementInfo.contentWindow.postMessage({
            type: 'OPEN_ACCORDION',
            accordionType: 'basic-information'
        }, '*');
		*/
		/*
		try {
			this.state.panelFrame.contentWindow.postMessage({
				type: 'OPEN_ACCORDION',
				accordionType: 'basic-information'
			}, '*');
			this.state.uiManager.togglePanelVisibilityOnOff(true);
		} catch (error) {
			//console.log('Error opening basic information accordion:', error);
		}
		*/
	}


	// ✅ 추가: Basic Information 아코디언 열기 함수
	// main-content.js의 function handleElementClick(e) { -> 
	// ✅ 같은 요소 클릭 시 선택 해제만 수행 if (stateManager.selectedElement === clickedElement) { elementAnalyzer.closeBasicInformationAccordion();
	closeBasicInformationAccordion() {
		if (!this.state.elementInfo) return;
		//console.log('-------- 닫기 ------');
		this.state.elementInfo.togglePanelVisibilityOnOff(false);
		/*
		try {
			this.state.ElementInfo.contentWindow.postMessage({
				type: 'CLOSE_ACCORDION',
				accordionType: 'basic-information'
			}, '*');
			
		} catch (error) {
			//console.log('Error opening basic information accordion:', error);
		}
			*/
	}

	// ✅ 추가: Measurement Modes 아코디언 열기 함수
	openMeasurementModesAccordion() {
		if (!this.state.panelFrame || !this.state.panelFrame.contentWindow) return;

		try {
			this.state.panelFrame.contentWindow.postMessage({
				type: 'OPEN_ACCORDION',
				accordionType: 'measurement-modes'
			}, '*');
		} catch (error) {
			//console.log('Error opening measurement modes accordion:', error);
		}
	}

	// 측정 업데이트
	// element-analyzer.js - updateMeasurements 함수 수정
	// ✅ 수정: 측정 업데이트 함수 - 스크롤 시 강제 업데이트
	// ✅ [수정] updateMeasurements - 불필요한 호출 방지
	// ✅ [수정] 측정 업데이트 함수 - 선택된 요소 우선 처리 강화
	// ✅ [수정] 측정 업데이트 함수 - 선택된 요소 있을 때 측정값만 차단
	// ✅ [보존] 측정 업데이트 함수 - 선택된 요소 우선 처리 유지
	updateMeasurements() {
		const now = Date.now();
		if (now - this.lastMeasurementUpdateTime < 50) return;
		this.lastMeasurementUpdateTime = now;

		//console.log('📐 Executing measurement update');

		// ✅ [핵심 보존] 선택된 요소가 있으면 해당 요소 측정값만 표시
		if (this.state.selectedElement) {
			//console.log('📐 Selected element exists, updating selected element measurements only');
			const rect = this.state.selectedElement.getBoundingClientRect();
			
			this.removeCurrentMeasurements();

			// ✅ 모든 활성 모드에 대한 측정값 표시
			if (this.state.activeModes.has('size')) {
				this.displayElementSize(this.state.selectedElement, rect);
			}
			if (this.state.activeModes.has('viewport')) {
				this.displayDistanceToViewport(rect);
			}
			if (this.state.activeModes.has('element')) {
				// ✅ [적용] 요소간 거리 겹침 방지 로직 적용
				this.measureElementDistances(this.state.selectedElement, rect);
			}
			if (this.state.activeModes.has('margin')) {
				this.displayMarginMeasurements(this.state.selectedElement, rect);
			}
			if (this.state.activeModes.has('padding')) {
				this.displayPaddingMeasurements(this.state.selectedElement, rect);
			}
			if (this.state.activeModes.has('children')) {
				this.measureChildElements(this.state.selectedElement, rect, 0);
			}
			if (this.state.activeModes.has('borderRadius')) {
				this.displayBorderRadiusMeasurements(this.state.selectedElement, rect);
			}
			return;
		}
		
		// ✅ 선택된 요소가 없을 때만 현재 요소 측정값 표시
		if (!this.state.currentElement) {
			//console.log('⏭️ No current element, skipping measurements');
			return;
		}
		
		//console.log('📐 Updating current element measurements');
		this.performMeasurementUpdate();
	}

	// ✅ 추가: 스크롤 시 선택된 요소 측정값 업데이트 함수
	// main-content.js의 function handleScroll( 에서 호출
	// ✅ 수정: 스크롤 시 선택된 요소 측정값 업데이트 함수 - fixed로 통일
	// ✅ [정밀 수정] 선택된 요소 측정값 업데이트 - 요소 간 거리 특별 처리
	// ✅ [보완] 선택된 요소 측정값 업데이트 - 뷰포트 경계 문제 해결
	updateSelectedElementMeasurements() {
		if (!this.state.selectedElement) return;

		//console.log('🔄 Updating ALL measurements for selected element');

		const rect = this.state.selectedElement.getBoundingClientRect();

		// ✅ [강화] 엄격한 뷰포트 가시성 검사
		const isElementInStrictViewport = 
			rect.width > 0 && 
			rect.height > 0 &&
			rect.right >= 0 &&      // ✅ 뷰포트 경계 정확히 체크
			rect.bottom >= 0 &&
			rect.left <= window.innerWidth &&
			rect.top <= window.innerHeight;

		if (!isElementInStrictViewport) {
			//console.log('🚫 Selected element outside STRICT viewport - removing ALL measurements');
			this.removeCurrentMeasurements();
			this.removeExternalElementHighlights();
			
			// ✅ 선택된 요소 하이라이트도 숨기기
			if (this.state.selectedElementHighlight) {
				this.state.selectedElementHighlight.style.display = 'none';
			}
			return;
		}

		// ✅ 기존 측정값 제거
		this.removeCurrentMeasurements();
		this.removeExternalElementHighlights();

		//console.log(`📍 Selected element in viewport: ${rect.width}x${rect.height} at (${rect.left}, ${rect.top})`);

		// ✅ 선택된 요소 하이라이트 표시
		if (this.state.selectedElementHighlight) {
			this.state.selectedElementHighlight.style.display = 'block';
			this.state.selectedElementHighlight.style.left = `${rect.left}px`;
			this.state.selectedElementHighlight.style.top = `${rect.top}px`;
			this.state.selectedElementHighlight.style.width = `${rect.width}px`;
			this.state.selectedElementHighlight.style.height = `${rect.height}px`;
		}

		// ✅ [강화] requestAnimationFrame으로 모든 측정값 생성
		requestAnimationFrame(() => {
			// ✅ 상태 재확인
			if (!this.state.selectedElement || !this.state.isInspectorActive) {
				return;
			}

			const currentRect = this.state.selectedElement.getBoundingClientRect();
			
			// ✅ 최종 뷰포트 체크
			const isStillInViewport = 
				currentRect.right >= 0 && 
				currentRect.bottom >= 0 &&
				currentRect.left <= window.innerWidth &&
				currentRect.top <= window.innerHeight;

			if (!isStillInViewport) {
				//console.log('🚫 Selected element moved outside viewport during measurement');
				return;
			}
			
			//console.log(`🎯 Creating measurements for selected element at correct position`);

			// ✅ 모든 활성 모드에 대한 측정값 표시
			if (this.state.activeModes.has('size')) {
				this.displayElementSize(this.state.selectedElement, currentRect);
			}
			if (this.state.activeModes.has('viewport')) {
				this.displayDistanceToViewport(currentRect);
			}
			if (this.state.activeModes.has('element')) {
				this.measureElementDistances(this.state.selectedElement, currentRect);
			}
			if (this.state.activeModes.has('margin')) {
				this.displayMarginMeasurements(this.state.selectedElement, currentRect);
			}
			if (this.state.activeModes.has('padding')) {
				this.displayPaddingMeasurements(this.state.selectedElement, currentRect);
			}
			if (this.state.activeModes.has('children')) {
				this.measureChildElements(this.state.selectedElement, currentRect, 0);
			}
			if (this.state.activeModes.has('borderRadius')) {
				this.displayBorderRadiusMeasurements(this.state.selectedElement, currentRect);
			}

			//console.log('✅ Selected element measurements created at correct position');
		});
	}

	// 실제 측정 수행
	// ✅ 수정: 실제 측정 업데이트 함수 - 요소 변경 시만 실행
	// element-analyzer.js - performMeasurementUpdate 함수 내에서 색상 즉시 반영
	// ✅ 수정: performMeasurementUpdate 함수 - 스크롤 대응 강화
	// ✅ performMeasurementUpdate에도 BODY 요소 체크 추가
	// ✅ [수정] performMeasurementUpdate - 동일 요소 반복 측정 방지
	// ✅ [수정] 실제 측정 업데이트 함수 - 선택된 요소 있을 때 완전 차단
	performMeasurementUpdate() {

		// ✅ Crosshair가 없으면 생성
		if (!this.crosshairHorizontal || !this.crosshairVertical) {
			this.createCrosshair();
		}
		
		// ✅ [수정] 선택된 요소가 있을 때는 현재 요소 측정값만 차단 (하이라이트는 유지)
		if (this.state.selectedElement) {
			//console.log('⏭️ Selected element exists - skipping current element measurements (but highlight remains)');
			this.removeCurrentMeasurements(); // 현재 요소 측정값만 제거
			// ✅ 하이라이트는 유지하므로 currentElement는 null로 설정하지 않음
			this.state.lastMeasuredElement = null;
			return;
		}

		// ✅ 현재 요소가 없으면 측정하지 않음
		if (!this.state.currentElement) {
			this.removeCurrentMeasurements();
			return;
		}

		// ✅ BODY/HTML 요소면 측정하지 않음
		if (this.state.currentElement === document.body || this.state.currentElement === document.documentElement) {
			//console.log('⏭️ Body/html element, skipping measurements');
			this.removeCurrentMeasurements();
			this.state.currentElement = null;
			this.state.lastMeasuredElement = null;
			return;
		}

		const rect = this.state.currentElement.getBoundingClientRect();
		
		// ✅ 뷰포트 바깥 요소에 대한 안전 처리
		const isElementVisible = rect.width > 0 && rect.height > 0;
		const isElementNearViewport = 
			rect.right > -500 && 
			rect.bottom > -500 && 
			rect.left < window.innerWidth + 500 && 
			rect.top < window.innerHeight + 500;

		if (!isElementVisible || !isElementNearViewport) {
			//console.log('⏭️ Element too far outside viewport, skipping measurements');
			this.removeCurrentMeasurements();
			this.state.currentElement = null;
			this.state.lastMeasuredElement = null;
			return;
		}

		// ✅ [확인] 선택된 요소가 생기지 않았는지 마지막 체크
		if (this.state.selectedElement) {
			//console.log('🚫 Selected element appeared during measurement - aborting');
			this.removeCurrentMeasurements();
			this.state.currentElement = null;
			this.state.lastMeasuredElement = null;
			return;
		}

		// ✅ [핵심] 요소가 변경되었을 때만 측정 수행
		const needsUpdate = this.state.currentElement !== this.lastMeasuredElement ||
			this.state.forceElementDistanceUpdate;

		if (needsUpdate) {
			//console.log('🔄 Element changed or force update, performing measurements');
			this.removeCurrentMeasurements();

			requestAnimationFrame(() => {
				// ✅ 다시 한번 상태 확인 (선택된 요소 체크)
				if (!this.state.currentElement || 
					!this.state.isInspectorActive ||
					this.state.selectedElement || // ✅ 선택된 요소 체크 추가
					this.state.currentElement === document.body ||
					this.state.currentElement === document.documentElement) {
					return;
				}

				const currentRect = this.state.currentElement.getBoundingClientRect();
				
				// 활성 모드에 따라 현재 요소 측정만 표시
				if (this.state.activeModes.has('size')) {
					this.displayElementSize(this.state.currentElement, currentRect);
				}
				if (this.state.activeModes.has('viewport')) {
					this.displayDistanceToViewport(currentRect);
				}
				if (this.state.activeModes.has('element')) {
					this.measureElementDistances(this.state.currentElement, currentRect);
				}
				if (this.state.activeModes.has('margin')) {
					this.displayMarginMeasurements(this.state.currentElement, currentRect);
				}
				if (this.state.activeModes.has('padding')) {
					this.displayPaddingMeasurements(this.state.currentElement, currentRect);
				}
				if (this.state.activeModes.has('children')) {
					this.measureChildElements(this.state.currentElement, currentRect, 0);
				}
				if (this.state.activeModes.has('borderRadius')) {
					this.displayBorderRadiusMeasurements(this.state.currentElement, currentRect);
				}

				this.lastMeasuredElement = this.state.currentElement;
				this.lastMeasurementTime = Date.now();
				this.state.forceElementDistanceUpdate = false;
			});
		} else {
			//console.log('⏭️ Same element and position, skipping measurement update');
		}
	}

	
	//---------------------------------------------------------------------------------------------------- 통합 시작
	createMeasurementTextElement(content, color, options = {}) {
		const text = document.createElement('div');
		text.className = options.className || 'measurement-text';
		text.textContent = content;
		
		const textColor = this.state.util ? this.state.util.getContrastColor(color) : '#ffffff';
		text.style.color = textColor;
		text.style.backgroundColor = color;
		text.style.border = `1px solid ${color}`;
		text.style.opacity = options.opacity || 0.9;
		text.style.position = 'fixed';
		text.style.padding = options.padding || '2px 6px';
		text.style.borderRadius = '3px';
		text.style.fontSize = this.state.options.tooltipFontSize;
		text.style.fontFamily = 'monospace';
		text.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT+1;
		text.style.pointerEvents = 'none';
		
		return text;
	}
	// 📍 element-analyzer.js - createMeasurementLine() 추가
	createMeasurementLine(orientation, color, length, position, options = {}) {
		const line = document.createElement('div');
		line.className = options.className || 'measurement-line';
		line.style.position = 'fixed';
		line.style.pointerEvents = 'none';
		
		// ✅ 수정: 선 두께 옵션 우선 적용
		const thickness = options.thickness || this.state.options.viewportLineThickness || 1;
		
		if (orientation === 'horizontal') {
			line.className = options.lineClassName || 't-line-with-markers';
			line.style.width = `${length}px`;
			line.style.height = `${thickness}px`; // ✅ 선 두께 적용
			line.style.left = `${position.x}px`;
			line.style.top = `${position.y}px`;
		} else {
			line.className = options.lineClassName || 't-line-vertical-with-markers';
			line.style.width = `${thickness}px`; // ✅ 선 두께 적용
			line.style.height = `${length}px`;
			line.style.left = `${position.x}px`;
			line.style.top = `${position.y}px`;
		}
		
		line.style.backgroundColor = color;
		line.style.opacity = options.opacity !== undefined ? options.opacity : 1;
		line.style.zIndex = options.zIndex || this.state.Z_INDEX_LAYERS.VIEWPORT_LINE;
		
		return line;
	}


	shouldIgnoreElement(element) {
		if (!element) return true;
		
		return [
			() => this.isWebInspectorPanelElement(element),
			() => this.isUIElement(element), // ✅ 이거 하나로 충분
			() => this.isMeasurementElement(element),
			() => !this.isElementVisible(element),
		].some(condition => condition());
	}

	// ✅ [추가] 토글 버튼 요소인지 확인하는 함수
	isToggleButtonElement(element) {
		if (!element) return false;
		
		// ✅ 토글 버튼 컨테이너 또는 버튼 자체인지 확인
		const isToggleContainer = 
			element.id === 'ruler-button-container' ||
			element.classList.contains('ruler-button-container') ||
			element.id === 'floating-button-panel';
		
		// ✅ 토글 버튼 자체인지 확인
		const isToggleButton = 
			element.classList.contains('ruler-mode-btn') ||
			element.getAttribute('data-mode') !== null;
		
		// ✅ 토글 관련 요소인지 확인 (Depth 컨트롤, 패널 위치 버튼 등)
		const isToggleRelated =
			element.type === 'range' && // Depth 슬라이더
			element.closest('.ruler-button-container') ||
			element.closest('#floating-button-panel');
		
		return isToggleContainer || isToggleButton || isToggleRelated;
	}


	// ✅ 추가: 측정값 제거 통합 함수
	removeMeasurementsBySelectors(includeSelected = false) {
		const baseSelectors = [
			'.measurement-line', '.measurement-text',
			'.size-line-extended', '.size-line-vertical-extended',
			'.margin-value-text', '.padding-value-text', '.size-text',
			'.margin-area', '.padding-area',
			'.external-element-highlight', '.child-highlight', '.padding-highlight',
			'.t-line-with-markers', '.t-line-vertical-with-markers',
			'.corner-radius-indicator', '.radius-value-text',
			'.corner-fold-indicator',
			//'.highlight-element'
		];
		
		const selectors = includeSelected ? 
			[...baseSelectors, '.selected-element'] : baseSelectors;
		
		let removedCount = 0;
		
		selectors.forEach(selector => {
			try {
				const elements = document.querySelectorAll(selector);
				elements.forEach(element => {
					if (element && element.parentNode) {
						if (!includeSelected && element.classList.contains('selected-element')) {
							return;
						}
						if (element !== this.state.selectedElementHighlight) {
							element.parentNode.removeChild(element);
							removedCount++;
						}
					}
				});
			} catch (error) {
				//console.log('Error removing measurement:', selector, error);
			}
		});
		
		////console.log(`✅ Removed ${removedCount} measurement elements`);
		
		// 상태 초기화
		this.state.verticalTooltipPositions = [];
		this.state.horizontalTooltipPositions = [];
		this.state.guideLinePositions = [];
		this.state.textPositions = [];
		
		return removedCount;
	}

	// ✅ 추가: 하이라이트 요소 생성 통합 함수
	createHighlightElement(rect, color, type = 'highlight', options = {}) {
		const highlight = document.createElement('div');
		
		if (type === 'selected') {
			highlight.id = 'web-inspector-selected-highlight';
			highlight.className = 'selected-element';
			highlight.setAttribute('data-web-inspector', 'selected-highlight');
			highlight.setAttribute('data-selected-element', 'true');
		} else {
			highlight.className = 'highlight-element';
		}
		
		highlight.style.outline = `${options.outlineWidth || 2}px solid ${color}`;
		highlight.style.backgroundColor = `${color}${options.bgOpacity || '20'}`;
		highlight.style.position = 'fixed';
		highlight.style.pointerEvents = 'none';
		highlight.style.zIndex = type === 'selected' ? 
			this.state.Z_INDEX_LAYERS.SELECTED : 
			this.state.Z_INDEX_LAYERS.HIGHLIGHT;
		highlight.style.width = `${rect.width}px`;
		highlight.style.height = `${rect.height}px`;
		highlight.style.left = `${rect.left}px`;
		highlight.style.top = `${rect.top}px`;
		highlight.style.boxSizing = 'border-box';
		
		return highlight;
	}

	//---------------------------------------------------------------------------------------------------- 통합 끝


	// 요소 크기 표시
	// ✅ 수정: displayElementSize 함수 - 모든 요소를 fixed로 통일
	// ✅ 수정: displayElementSize 함수 - createMeasurementTextElement 적용
	// element-analyzer.js - displayElementSize 함수 전체 수정
	displayElementSize(element, rect) {
		this.state.textPositions = [];
		
		const absLeft = rect.left;
		const absTop = rect.top;
		const absBottom = rect.bottom;
		const absRight = rect.right;
		
		const OFFSET = 5;
		const EXTENSION = 80;
		
		// ✅ [삭제] 룰러 경계값 가져오기 제거
		/*
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		const totalRulerHeight = this.state.getTotalRulerHeight();
		const rulerYWidth = this.state.RULER_Y_WIDTH;
		
		// ✅ 실제 콘텐츠 영역 (룰러 제외)
		const contentWidth = viewportWidth - rulerYWidth;
		const contentHeight = viewportHeight - totalRulerHeight;
		*/

		// ✅ [수정] 전체 뷰포트 사용
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// ✅ 선 두께 옵션 적용
		const lineThickness = this.state.options.sizeLineThickness || 0.5;

		// ✅ [수정] X축 사이즈 선 방향 결정 로직 (룰러 보정 제거)
		let xLineDirection = 'right';
		let xTextOffset = 4;
		
		// X축 선이 오른쪽 뷰포트를 벗어나는지 확인 (텍스트 포함)
		const xLineEnd = absLeft + rect.width + EXTENSION;
		const xTextWidth = 60;
		const xTextEnd = xLineEnd + xTextOffset + xTextWidth;
		
		if (xTextEnd > viewportWidth) {
			xLineDirection = 'left';
			xTextOffset = -4;
		}

		// ✅ [수정] Y축 사이즈 선 방향 결정 로직 (룰러 보정 제거)
		let yLineDirection = 'bottom';
		let yTextOffset = 1;
		
		// Y축 선이 아래쪽 뷰포트를 벗어나는지 확인 (텍스트 포함)
		const yLineEnd = absTop + rect.height + EXTENSION;
		const yTextHeight = 20;
		const yTextEnd = yLineEnd + yTextOffset + yTextHeight;
		
		if (yTextEnd > viewportHeight) {
			yLineDirection = 'top';
			yTextOffset = -4;
		}

		// ✅ [수정] X축과 Y축 연동 로직 (룰러 보정 제거)
		let yLineXPosition = absRight;
		if (xLineDirection === 'left') {
			yLineXPosition = absLeft;
		}

		let xLineYPosition = absBottom;
		if (yLineDirection === 'top') {
			xLineYPosition = absTop;
		}

		// ✅ [수정] X축 사이즈 선 생성 (방향과 위치에 따라)
		const widthLine = this.createMeasurementLine(
			'horizontal',
			this.state.options.sizeColor,
			rect.width + EXTENSION,
			{ 
				x: xLineDirection === 'right' ? absLeft : absLeft - EXTENSION, 
				y: xLineYPosition // ✅ Y축 방향에 따라 Y 위치 조정
			},
			{
				className: 'size-line-extended',
				opacity: this.state.options.sizeLineOpacity,
				zIndex: this.state.Z_INDEX_LAYERS.SIZE_LINE,
				lineClassName: 'size-line-extended',
				thickness: lineThickness
			}
		);
		
		// ✅ 점선 스타일 적용
		widthLine.style.borderTop = `${lineThickness}px dashed ${this.state.options.sizeColor}`;
		widthLine.style.backgroundColor = 'transparent';

		// ✅ [수정] Y축 사이즈 선 생성 (방향과 위치에 따라)
		const heightLine = this.createMeasurementLine(
			'vertical',
			this.state.options.sizeColor,
			rect.height + EXTENSION,
			{ 
				x: yLineXPosition, // ✅ X축 방향에 따라 X 위치 조정
				y: yLineDirection === 'bottom' ? absTop : absTop - EXTENSION 
			},
			{
				className: 'size-line-vertical-extended',
				opacity: this.state.options.sizeLineOpacity,
				zIndex: this.state.Z_INDEX_LAYERS.SIZE_LINE,
				lineClassName: 'size-line-vertical-extended',
				thickness: lineThickness
			}
		);
		
		// ✅ 점선 스타일 적용
		heightLine.style.borderLeft = `${lineThickness}px dashed ${this.state.options.sizeColor}`;
		heightLine.style.backgroundColor = 'transparent';

		// ✅ [수정] X축 사이즈 텍스트 위치 계산 (방향에 따라)
		const widthText = this.createMeasurementTextElement(
			`${this.formatDistance(rect.width)}`,
			this.state.options.sizeColor,
			{ 
				className: 'measurement-text size-text',
				padding: '2px 4px'
			}
		);
		
		if (xLineDirection === 'right') {
			// 오른쪽 표시: 선 끝 오른쪽에 텍스트
			widthText.style.left = `${absLeft + rect.width + EXTENSION + xTextOffset}px`;
			widthText.style.top = `${xLineYPosition - 10}px`; // ✅ Y 위치에 맞춤
			widthText.style.transform = 'none';
		} else {
			// 왼쪽 표시: 선 시작 왼쪽에 텍스트
			widthText.style.left = `${absLeft - EXTENSION + xTextOffset}px`;
			widthText.style.top = `${xLineYPosition - 10}px`; // ✅ Y 위치에 맞춤
			widthText.style.transform = 'none';
			widthText.style.textAlign = 'right';
		}

		// ✅ [수정] Y축 사이즈 텍스트 위치 계산 (방향과 위치에 따라)
		const heightText = this.createMeasurementTextElement(
			`${this.formatDistance(rect.height)}`,
			this.state.options.sizeColor,
			{ 
				className: 'measurement-text size-text',
				padding: '2px 4px'
			}
		);

		// ✅ 먼저 DOM에 추가해서 텍스트 크기 측정
		document.body.appendChild(heightText);
		const textRect = heightText.getBoundingClientRect();

		if (yLineDirection === 'bottom') {
			// 아래쪽 표시: 선 끝 아래쪽에 텍스트 (세로)
			const lineBottomY = absTop + rect.height + EXTENSION + yTextOffset;
			const rotatedTextWidth = textRect.height;

			heightText.style.left = `${yLineXPosition + 0}px`; // ✅ `${yLineXPosition + 1}px` -> 0으로 변경: X 위치에 맞춤
			heightText.style.top = `${lineBottomY + (rotatedTextWidth / 2)}px`;
			heightText.style.transform = 'rotate(-90deg)';
			heightText.style.transformOrigin = 'left center';
		} else {
			// 위쪽 표시: 선 시작 위쪽에 텍스트 (세로)
			const lineTopY = absTop - EXTENSION + yTextOffset;
			const rotatedTextWidth = textRect.height;

			heightText.style.left = `${yLineXPosition + 0}px`; // ✅ X 위치에 맞춤
			heightText.style.top = `${lineTopY + (rotatedTextWidth / 2)}px`;
			heightText.style.transform = 'rotate(-90deg)';
			heightText.style.transformOrigin = 'left center';
		}

		widthText.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT+1;
		heightText.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT+1;

		// ✅ 요소들 DOM에 추가
		document.body.appendChild(widthLine);
		document.body.appendChild(heightLine);
		document.body.appendChild(widthText);

		this.state.measureElements.push(widthLine, heightLine, widthText, heightText);
		
	}

	//----------------------------------------------------------------------------------------------------->>> 성능 문제 해결 START
	// 자식 요소 측정
	// ✅ 수정: 자식 요소 측정 - fixed로 통일
	/**
	 * ✅ 최적화된 자식 요소 측정 함수
	 */
	measureChildElements(element, parentRect, currentDepth) {
		// ✅ 1. 조기 종료 조건 강화
		if (!element || !element.children || element.children.length === 0 || 
			currentDepth >= this.state.currentDepthLevel) {
			return;
		}

		// ✅ 2. 최대 요소 수 제한 (성능 보호)
		const MAX_ELEMENTS_PER_LEVEL = 50;
		const MAX_TOTAL_ELEMENTS = 500;
		
		if (this.state.measureElements.length >= MAX_TOTAL_ELEMENTS) {
			//console.log('⚠️ Maximum element limit reached, stopping child measurement');
			//return;
		}

		const children = element.children;
		let processedCount = 0;

		for (let i = 0; i < children.length; i++) {
			// ✅ 3. 레벨당 최대 요소 수 제한
			if (processedCount >= MAX_ELEMENTS_PER_LEVEL) {
				//console.log(`⚠️ Level ${currentDepth} element limit reached`);
				break;
			}

			const child = children[i];
			
			// ✅ 4. 강화된 요소 필터링
			if (!this.shouldMeasureChildElement(child)) {
				continue;
			}

			const childRect = child.getBoundingClientRect();
			
			// ✅ 5. 더 엄격한 크기 필터
			if (childRect.width < 5 || childRect.height < 5) continue;
			
			// ✅ 6. 뷰포트 밖 요소 필터링
			if (!this.isElementInViewport(childRect)) continue;

			// ✅ 7. 최소 면적 필터 (너무 작은 요소 제외)
			const area = childRect.width * childRect.height;
			if (area < 100) continue; // 100px² 미만 요소 제외

			// ✅ 하이라이트 생성 (기존 코드 유지)
			const absChildRect = {
				left: childRect.left,
				top: childRect.top,
				right: childRect.right,
				bottom: childRect.bottom,
				width: childRect.width,
				height: childRect.height
			};

			const highlight = document.createElement('div');
			highlight.className = 'child-highlight';
			highlight.style.outline = `${this.state.options.childrenLineThickness}px dashed ${this.state.options.childrenColor}`;
			highlight.style.backgroundColor = `${this.state.options.childrenColor}${Math.round(this.state.options.childrenBgOpacity * 10)}`;
			highlight.style.width = `${childRect.width}px`;
			highlight.style.height = `${childRect.height}px`;
			highlight.style.left = `${absChildRect.left}px`;
			highlight.style.top = `${absChildRect.top}px`;
			highlight.style.boxSizing = 'content-box';
			highlight.style.opacity = this.state.options.childrenLineOpacity * (0.8 / currentDepth);
			highlight.style.zIndex = this.state.Z_INDEX_LAYERS.CHILDREN - currentDepth;
			highlight.style.position = 'fixed';

			document.body.appendChild(highlight);
			this.state.measureElements.push(highlight);
			processedCount++;

			// ✅ 8. 재귀 깊이 제한 강화
			if (currentDepth + 1 < this.state.currentDepthLevel) {
				// ✅ 9. 특정 요소 타입은 재귀 탐색 제한
				if (!this.shouldSkipRecursiveMeasurement(child)) {
					this.measureChildElements(child, childRect, currentDepth + 1);
				}
			}
		}
	}

	/**
	 * ✅ 요소 측정 여부 결정 함수
	 */
	shouldMeasureChildElement(element) {
		if (!element) return false;

		// ✅ 1. 보이지 않는 요소 제외
		const style = window.getComputedStyle(element);
		if (style.display === 'none' || 
			style.visibility === 'hidden' || 
			style.opacity === '0' ||
			style.width === '0px' ||
			style.height === '0px') {
			return false;
		}

		// ✅ 2. 특정 태그 제외 (스크립트, 메타 등)
		const excludedTags = ['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT'];
		if (excludedTags.includes(element.tagName)) {
			return false;
		}

		// ✅ 3. 특정 클래스/ID 패턴 제외
		const excludedPatterns = [
			/hidden/i, /invisible/i, /sr-only/i, /visually-hidden/i,
			/advertisement/i, /ad-container/i, /banner/i
		];
		
		const className = element.className || '';
		const id = element.id || '';
		
		for (const pattern of excludedPatterns) {
			if (pattern.test(className) || pattern.test(id)) {
				return false;
			}
		}

		// ✅ 4. aria-hidden 요소 제외
		if (element.getAttribute('aria-hidden') === 'true') {
			return false;
		}

		return true;
	}

	/**
	 * ✅ 재귀 측정 건너뛸 요소 확인
	 */
	shouldSkipRecursiveMeasurement(element) {
		if (!element) return true;

		// ✅ 1. 특정 컨테이너 요소는 재귀 탐색 제한
		const containerTags = ['UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TFOOT'];
		if (containerTags.includes(element.tagName)) {
			return false; // 이러한 요소는 재귀 탐색 허용
		}

		// ✅ 2. 너무 많은 자식을 가진 요소는 재귀 제한
		if (element.children && element.children.length > 20) {
			//console.log('⚠️ Skipping recursive measurement for element with many children:', element.tagName);
			return true;
		}

		// ✅ 3. 특정 클래스 패턴은 재귀 제한
		const recursiveExcludedPatterns = [
			/grid/i, /list/i, /menu/i, /navigation/i, /nav/i
		];
		
		const className = element.className || '';
		for (const pattern of recursiveExcludedPatterns) {
			if (pattern.test(className)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * ✅ 요소가 뷰포트 내에 있는지 확인
	 */
	isElementInViewport(rect) {
		const buffer = 100; // 약간의 여유 공간
		return (
			rect.bottom >= -buffer &&
			rect.right >= -buffer &&
			rect.left <= (window.innerWidth + buffer) &&
			rect.top <= (window.innerHeight + buffer)
		);
	}

	/**
	 * ✅ 성능 모니터링 추가
	 */
	startPerformanceMonitoring() {
		this.performance = {
			startTime: Date.now(),
			elementCount: 0,
			maxElements: 200,
			measurementTime: 0
		};
	}

	/**
	 * ✅ 성능 한계 초과 시 측정 중단
	 */
	checkPerformanceLimits() {
		if (!this.performance) return true;
		
		const currentTime = Date.now();
		this.performance.measurementTime = currentTime - this.performance.startTime;
		
		// ✅ 측정 시간 제한 (3초)
		if (this.performance.measurementTime > 3000) {
			//console.log('⚠️ Measurement time limit exceeded, stopping');
			return false;
		}
		
		// ✅ 요소 수 제한
		if (this.performance.elementCount >= this.performance.maxElements) {
			//console.log('⚠️ Maximum element count reached, stopping');
			return false;
		}
		
		return true;
	}
	//----------------------------------------------------------------------------------------------------->>> 성능 문제 해결 END

	// 뷰포트 거리 표시
	// ✅ 수정: displayDistanceToViewport 함수 - Ruler 영역 보정 적용
	displayDistanceToViewport(rect) {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;


		// ✅ [수정] 룰러가 없으므로 전체 뷰포트 사용
		const correctedViewport = {
			left: 0,
			top: 0, 
			right: viewportWidth,
			bottom: viewportHeight,
			width: viewportWidth,
			height: viewportHeight
		};

		const absRect = {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height
		};

		// ✅ [수정] 왼쪽 외곽까지 거리 (룰러 고려 제거)
		const leftDistance = rect.left - 0; // rulerYWidth 대신 0
		if (leftDistance > 0) {
			this.createViewportDistanceLine(
				0, absRect.top + rect.height / 2, // rulerYWidth 대신 0
				absRect.left, absRect.top + rect.height / 2,
				leftDistance, 'horizontal', 'left', this.state.options.viewportColor,
				this.state.options.viewportLineOpacity, 'viewport', 0
			);
		}

		// ✅ [수정] 위쪽 외곽까지 거리 (룰러 고려 제거)
		const topDistance = rect.top - 0; // totalRulerHeight 대신 0
		if (topDistance > 0) {
			this.createViewportDistanceLine(
				absRect.left + rect.width / 2, 0, // totalRulerHeight 대신 0
				absRect.left + rect.width / 2, absRect.top,
				topDistance, 'vertical', 'top', this.state.options.viewportColor,
				this.state.options.viewportLineOpacity, 'viewport', 270
			);
		}

		// 오른쪽/아래쪽은 동일 (룰러 영향 없음)
		const rightDistance = viewportWidth - rect.right;
		if (rightDistance > 0) {
			this.createViewportDistanceLine(
				absRect.right, absRect.top + rect.height / 2,
				viewportWidth, absRect.top + rect.height / 2,
				rightDistance, 'horizontal', 'right', this.state.options.viewportColor,
				this.state.options.viewportLineOpacity, 'viewport', 0
			);
		}

		const bottomDistance = viewportHeight - rect.bottom;
		if (bottomDistance > 0) {
			this.createViewportDistanceLine(
				absRect.left + rect.width / 2, absRect.bottom,
				absRect.left + rect.width / 2, viewportHeight,
				bottomDistance, 'vertical', 'bottom', this.state.options.viewportColor,
				this.state.options.viewportLineOpacity, 'viewport', -90
			);
		}
	}


	// 거리 선 생성
	// ✅ 수정: createViewportDistanceLine 함수 - fixed로 통일
	createViewportDistanceLine(fromX, fromY, toX, toY, distance, orientation, direction, color, opacity = '1', lineType = 'normal', rotation = 0) {
		if (distance <= 0) return;

		
		const line = document.createElement('div');
		line.className = 'measurement-line';
		line.style.position = 'fixed';
		line.style.pointerEvents = 'none';

		let lineThicknessValue;
		let zIndex;

		switch (lineType) {
			case 'viewport':
				lineThicknessValue = this.state.options.viewportLineThickness;
				zIndex = this.state.Z_INDEX_LAYERS.VIEWPORT_LINE;
				break;
			case 'element':
				lineThicknessValue = this.state.options.elementLineThickness;
				zIndex = this.state.Z_INDEX_LAYERS.ELEMENT_LINE;
				break;
			default:
				lineThicknessValue = 1;
				zIndex = this.state.Z_INDEX_LAYERS.ELEMENT_LINE;
		}

		if (orientation === 'horizontal') {
			line.className = 't-line-with-markers';
			line.style.width = `${Math.abs(toX - fromX)}px`;
			line.style.height = `${lineThicknessValue}px`;
			line.style.left = `${Math.min(fromX, toX)}px`;
			line.style.top = `${fromY}px`;
		} else {
			line.className = 't-line-vertical-with-markers';
			line.style.width = `${lineThicknessValue}px`;
			line.style.height = `${Math.abs(toY - fromY)}px`;
			line.style.left = `${fromX}px`;
			line.style.top = `${Math.min(fromY, toY)}px`;
		}

		line.style.backgroundColor = color;
		line.style.opacity = opacity;
		line.style.zIndex = zIndex;

		// ✅ [수정] 모든 사이트에서 일관된 룰러 기준 좌표 사용
		const text = this.createMeasurementTextElement(
			`${this.formatDistance(distance)}`,
			color,
			{ opacity: opacity }
		);

		// 뷰포트 거리값의 넓이를 구함.
		// ✅ [수정] 뷰포트 거리값의 넓이를 구함.
		let widthOfTextDivElement = document.body.appendChild(text).offsetWidth;

		// text를 line의 zindex 보다 높게 처리.
		text.style.opacity = this.state.viewportLineOpacity;
		text.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT+1;
		
		if (orientation === 'horizontal') {
			const lineCenterX = (fromX + toX) / 2;
			text.style.left = `${lineCenterX}px`;
			text.style.top = `${fromY - 10}px`;
			text.style.transform = `rotate(${rotation}deg)`;
		} else {
			let lineCenterY = (fromY + toY) / 2;
			text.style.transform = `rotate(${rotation}deg)`;
			if (direction == 'top') {
				if ((fromY + toY) > 150) {
					lineCenterY = toY - 150;
				}
			}

			// 선의 정중앙을 찾음 -> fromX-widthOfTextDivElement/2
			text.style.left = `${fromX-widthOfTextDivElement/2}px`;
			text.style.top = `${lineCenterY}px`;
		}
		document.body.appendChild(line);
    	document.body.appendChild(text);
		
		this.state.measureElements.push(line, text);
		
		////console.log(`📍 ${direction} viewport line: ${distance}px (${fromX},${fromY} → ${toX},${toY})`);
	}



	// 요소 간 거리 측정
	// element-analyzer.js - measureElementDistances 함수 수정
	// element-analyzer.js - measureElementDistances 함수의 인접 요소 검색 로직 수정
	// ✅ [수정] measureElementDistances - 스크롤된 영역에서도 정확한 검색
	// ✅ [수정] measureElementDistances - 모든 좌표를 뷰포트 기준으로 통일
	// ✅ [디버깅 강화] 요소 간 거리 측정 - 실패 원인 파악
	// ✅ [완전한 버전] 요소 간 거리 측정 함수 - 겹침 방지 완전 포함
	measureElementDistances(targetElement, rect) {
		//console.log('🔍 Measuring element distances with COLLISION AVOIDANCE');

		const viewportRect = {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height
		};

		const adjacentElements = {
			left: { element: null, distance: Infinity },
			right: { element: null, distance: Infinity },
			top: { element: null, distance: Infinity },
			bottom: { element: null, distance: Infinity }
		};

		// ✅ 검색 포인트
		const searchPoints = [
			[rect.left - 50, rect.top + rect.height / 2],
			[rect.right + 50, rect.top + rect.height / 2],
			[rect.left + rect.width / 2, rect.top - 50],
			[rect.left + rect.width / 2, rect.bottom + 50]
		];

		const foundElements = new Set();

		// ✅ elementsFromPoint로 요소 수집
		searchPoints.forEach(([x, y], index) => {
			try {
				const isInViewport = x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight;
				if (isInViewport) {
					const elements = document.elementsFromPoint(x, y);
					elements.forEach(element => {
						if (element !== targetElement && 
							!this.shouldIgnoreElement(element) &&
							!this.isUIElement(element) &&
							!this.isMeasurementElement(element)) {
							foundElements.add(element);
						}
					});
				}
			} catch (e) {
				//console.log('Error at search point:', e);
			}
		});

		// ✅ 폴백 검색
		if (foundElements.size < 5) {
			const allElements = document.body.getElementsByTagName('*');
			const maxElements = 50; //------------------------------------------------------>>>> 매우 중요!!!!!!!!!!!!!
			
			for (let i = 0; i < Math.min(allElements.length, maxElements); i++) {
				const element = allElements[i];
				
				if (element === targetElement || 
					this.isUIElement(element) || 
					this.isMeasurementElement(element)) {
					continue;
				}

				const elementRect = element.getBoundingClientRect();
				if (elementRect.width <= 0 || elementRect.height <= 0) continue;

				const isNearby = 
					elementRect.right > rect.left - 300 && 
					elementRect.left < rect.right + 300 &&
					elementRect.bottom > rect.top - 300 && 
					elementRect.top < rect.bottom + 300;

				if (isNearby) {
					foundElements.add(element);
				}
			}
		}

		// ✅ 인접 요소 검사
		foundElements.forEach(element => {
			try {
				const elementRect = element.getBoundingClientRect();
				
				const viewportElementRect = {
					left: elementRect.left,
					top: elementRect.top,
					right: elementRect.right,
					bottom: elementRect.bottom,
					width: elementRect.width,
					height: elementRect.height
				};

				this._checkPerpendicularElement('left', element, viewportElementRect, viewportRect, adjacentElements); // ✅ _checkPerpendicularElement로 변경
				this._checkPerpendicularElement('right', element, viewportElementRect, viewportRect, adjacentElements);
				this._checkPerpendicularElement('top', element, viewportElementRect, viewportRect, adjacentElements);
				this._checkPerpendicularElement('bottom', element, viewportElementRect, viewportRect, adjacentElements);

			} catch (e) {
				console.log('Error processing element:', e);
			}
		});

		// ✅ [핵심] 거리 표시 - 겹침 방지 적용
		let displayedDistances = 0;
		for (const direction in adjacentElements) {
			const adjacent = adjacentElements[direction];
			if (adjacent.element && adjacent.distance < 2000 && adjacent.distance > 0) {
				const elementRect = adjacent.element.getBoundingClientRect();
				
				const viewportElementRect = {
					left: elementRect.left,
					top: elementRect.top,
					right: elementRect.right,
					bottom: elementRect.bottom,
					width: elementRect.width,
					height: elementRect.height
				};

				//console.log(`🎯 Displaying ${direction} distance: ${adjacent.distance}px with COLLISION AVOIDANCE`);
				
				// ✅ [겹침 방지 적용] displayElementDistance 호출
				this.displayElementDistance(viewportRect, viewportElementRect, direction);
				displayedDistances++;
			}
		}

		//console.log(`✅ Displayed ${displayedDistances} element distances with collision avoidance`);
	}



	// 요소 거리 표시 함수 - 겹침 방지 로직 추가
	// ✅ 수정: 요소 거리 표시 함수 - 뷰포트 선과의 겹침 방지 로직 추가
	// ✅ [수정] displayElementDistance - 뷰포트 좌표 처리
	// ✅ [안정성 강화] 요소 거리 표시 함수 - 실패 방지
	// ✅ [겹침 방지 강제 적용] 요소 거리 표시 함수
	displayElementDistance(targetRect, elementRect, direction) {
		//console.log(`🎯 Displaying element distance for direction: ${direction} with COLLISION AVOIDANCE`);

		let fromX, fromY, toX, toY, distance;

		const isViewportModeActive = this.state.activeModes.has(this.state.MEASUREMENT_MODES.VIEWPORT);

		let textPosition = 'auto';
		let lineOffset = 0;

		try {
			switch (direction) {
				case 'left':
					fromX = elementRect.right;
					fromY = elementRect.top + elementRect.height / 2;
					toX = targetRect.left;
					toY = targetRect.top + targetRect.height / 2;
					distance = targetRect.left - elementRect.right;

					// ✅ 뷰포트 모드와 겹치지 않도록 오프셋
					if (isViewportModeActive) {
						lineOffset = 30;
						fromY += lineOffset;
						toY += lineOffset;
					}
					break;

				case 'right':
					fromX = targetRect.right;
					fromY = targetRect.top + targetRect.height / 2;
					toX = elementRect.left;
					toY = elementRect.top + elementRect.height / 2;
					distance = elementRect.left - targetRect.right;

					if (isViewportModeActive) {
						lineOffset = -30;
						fromY += lineOffset;
						toY += lineOffset;
					}
					break;

				case 'top':
					fromX = targetRect.left + targetRect.width / 2;
					fromY = elementRect.bottom;
					toX = targetRect.left + targetRect.width / 2;
					toY = targetRect.top;
					distance = targetRect.top - elementRect.bottom;

					if (isViewportModeActive) {
						lineOffset = 40;
						fromX += lineOffset;
						toX += lineOffset;
					}
					break;

				case 'bottom':
					fromX = targetRect.left + targetRect.width / 2;
					fromY = targetRect.bottom;
					toX = elementRect.left + elementRect.width / 2;
					toY = elementRect.top;
					distance = elementRect.top - targetRect.bottom;

					if (isViewportModeActive) {
						lineOffset = 40;
						fromX += lineOffset;
						toX += lineOffset;
					}
					break;
			}

			//console.log(`📏 ${direction} distance: ${distance}px (offset: ${lineOffset})`);

			if (distance > 0) {
				// ✅ 외부 요소 점선 강조 표시
				const externalHighlight = document.createElement('div');
				externalHighlight.className = 'external-element-highlight';
				externalHighlight.style.outline = `1.5px dashed ${this.state.options.elementColor}`;
				externalHighlight.style.backgroundColor = `${this.state.options.elementColor}10`;
				externalHighlight.style.position = 'fixed';
				externalHighlight.style.pointerEvents = 'none';
				externalHighlight.style.zIndex = this.state.Z_INDEX_LAYERS.EXTERNAL;
				externalHighlight.style.width = `${elementRect.width}px`;
				externalHighlight.style.height = `${elementRect.height}px`;
				externalHighlight.style.left = `${elementRect.left}px`;
				externalHighlight.style.top = `${elementRect.top}px`;
				externalHighlight.style.boxSizing = 'content-box';

				document.body.appendChild(externalHighlight);
				this.state.externalElementHighlights.push(externalHighlight);

				// ✅ [핵심] 거리선 생성 - 겹침 방지 강제 적용
				this.createDistanceLineWithViewportAvoidance(
					fromX, fromY, toX, toY, distance,
					direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical',
					this.state.options.elementColor,
					this.state.options.elementLineOpacity,
					'element',
					textPosition,
					direction
				);

				//console.log(`✅ Successfully created ${direction} distance measurement with COLLISION AVOIDANCE`);
			} else {
				//console.log(`❌ Distance is ${distance}, skipping ${direction} measurement`);
			}
		} catch (error) {
			//console.error(`❌ Error in displayElementDistance for ${direction}:`, error);
		}
	}


	// ✅ 추가: 겹침 방지가 적용된 거리선 생성 함수
	// ✅ 추가: 뷰포트 선과의 겹침을 방지하는 거리선 생성 함수
	/**
	 * 요소 간 거리선을 생성하고 뷰포트와의 겹침을 방지하며 tooltip을 배치하는 함수
	 * @param {number} fromX - 측정 시작점 X 좌표 (인식한 요소 측)
	 * @param {number} fromY - 측정 시작점 Y 좌표 (인식한 요소 측)
	 * @param {number} toX - 측정 끝점 X 좌표 (외부 상대 요소 측, 선의 끝 T표식 위치)
	 * @param {number} toY - 측정 끝점 Y 좌표 (외부 상대 요소 측, 선의 끝 T표식 위치)
	 * @param {number} distance - 측정된 거리 값
	 * @param {string} orientation - 선 방향 ('horizontal' 수평선 / 'vertical' 수직선)
	 * @param {string} color - 선과 tooltip 색상
	 * @param {string} opacity - 선과 tooltip 투명도 (기본값: '1')
	 * @param {string} lineType - 선 유형 ('viewport' / 'element' / 'normal')
	 * @param {string} textPosition - tooltip 위치 설정 ('auto' / 'left' / 'right')
	 * @param {string} direction - 거리선 방향 ('top' / 'bottom' / 'left' / 'right')
	 */
	// element-analyzer.js - createDistanceLineWithViewportAvoidance 함수 수정
	// ✅ 수정: createDistanceLineWithViewportAvoidance 함수 - textColor 변수 정의 추가
	// ✅ [수정] createDistanceLineWithViewportAvoidance - 뷰포트 좌표 명시
	// ✅ [수정] createDistanceLineWithViewportAvoidance - 겹침 검사 로직 개선
	// ✅ [겹침 방지 핵심] 거리선 생성 함수
	createDistanceLineWithViewportAvoidance(fromX, fromY, toX, toY, distance, orientation, color, opacity = '1', lineType = 'normal', textPosition = 'auto', direction) {
		if (distance <= 0) return;

		const line = document.createElement('div');
		line.className = 'measurement-line';
		line.style.position = 'fixed';
		line.style.pointerEvents = 'none';

		// 선 두께 설정
		let lineThicknessValue = this.state.options.elementLineThickness;
		let zIndex = this.state.Z_INDEX_LAYERS.ELEMENT_LINE;

		if (orientation === 'horizontal') {
			line.className = 't-line-with-markers';
			line.style.width = `${Math.abs(toX - fromX)}px`;
			line.style.height = `${lineThicknessValue}px`;
			line.style.left = `${Math.min(fromX, toX)}px`;
			line.style.top = `${fromY}px`;
		} else {
			line.className = 't-line-vertical-with-markers';
			line.style.width = `${lineThicknessValue}px`;
			line.style.height = `${Math.abs(toY - fromY)}px`;
			line.style.left = `${fromX}px`;
			line.style.top = `${Math.min(fromY, toY)}px`;
		}

		line.style.backgroundColor = color;
		line.style.opacity = opacity;
		line.style.zIndex = zIndex;

		// ✅ 텍스트 생성
		const text = this.createMeasurementTextElement(
			`${this.formatDistance(distance)}`,
			color,
			{ opacity: opacity }
		);

		// ✅ Tooltip 크기 측정
		const textSize = this.measureTooltipSize(text);
		const textWidth = textSize.width;
		const textHeight = textSize.height;

		// ✅ 겹침 검사 전에 실제 위치 계산
		let tooltipX, tooltipY, transform = 'none';
		const TOOLTIP_OFFSET = 10;

		if (orientation === 'horizontal') {
			const lineCenterX = (Math.min(fromX, toX) + Math.abs(toX - fromX) / 2);
			tooltipX = lineCenterX - (textWidth / 2);
			tooltipY = fromY - textHeight - TOOLTIP_OFFSET;
			
			if (tooltipY < 5) {
				tooltipY = fromY + TOOLTIP_OFFSET;
			}
		} else {
			const lineCenterY = (Math.min(fromY, toY) + Math.abs(toY - fromY) / 2);
			tooltipX = fromX + TOOLTIP_OFFSET;
			tooltipY = lineCenterY - (textHeight / 2);
			transform = 'rotate(-90deg)';
			
			if (tooltipX + textWidth > window.innerWidth - 5) {
				tooltipX = fromX - textWidth - TOOLTIP_OFFSET;
			}
		}

		// ✅ [핵심] 실제 DOM에 추가된 tooltip들과 겹침 검사
		const adjustedPosition = this.checkAndAdjustTooltipPosition(
			tooltipX, tooltipY, textWidth, textHeight, 
			fromX, fromY, orientation, direction
		);

		tooltipX = adjustedPosition.x;
		tooltipY = adjustedPosition.y;

		// text를 line의 zIndex 보다 더 높게 처리
		text.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT + 1;

		// ✅ 최종 위치 적용
		text.style.left = `${tooltipX}px`;
		text.style.top = `${tooltipY}px`;
		text.style.transform = transform;

		document.body.appendChild(line);
		document.body.appendChild(text);

		this.state.measureElements.push(line, text);
		
		//console.log(`📍 ${direction} distance tooltip: (${tooltipX}, ${tooltipY}) - 겹침 조정: ${adjustedPosition.adjusted}`);
	}


	/**
	 * ✅ [신규] Tooltip 크기 측정 (DOM 추가 없이)
	 */
	measureTooltipSize(textElement) {
		// 임시로 스타일 복제하여 크기 측정
		const temp = textElement.cloneNode(true);
		temp.style.visibility = 'hidden';
		temp.style.position = 'fixed';
		temp.style.left = '-9999px';
		temp.style.top = '-9999px';
		
		document.body.appendChild(temp);
		const rect = temp.getBoundingClientRect();
		document.body.removeChild(temp);
		
		return {
			width: rect.width,
			height: rect.height
		};
	}

	/**
	 * ✅ [신규] 겹침 검사 및 위치 조정 (실제 DOM 기반)
	 */
	// ✅ [겹침 방지] 겹침 검사 및 위치 조정 함수
	// element-analyzer.js - checkAndAdjustTooltipPosition 함수 내 룰러 관련 코드 제거
	checkAndAdjustTooltipPosition(x, y, width, height, fromX, fromY, orientation, direction) {
		const OVERLAP_THRESHOLD = 0.1;
		
		let adjustedX = x;
		let adjustedY = y;
		let adjusted = false;
		
		// 현재 예상 영역
		const currentRect = {
			left: x,
			top: y,
			right: x + width,
			bottom: y + height,
			width: width,
			height: height
		};

		// ✅ 실제 DOM에 있는 모든 measurement tooltip 검사
		const existingTooltips = Array.from(document.querySelectorAll('.measurement-text, .margin-value-text, .padding-value-text, .size-text, .radius-value-text'));
		
		// ✅ 뷰포트 모드 선들도 검사 대상에 포함
		const viewportLines = Array.from(document.querySelectorAll('.t-line-with-markers, .t-line-vertical-with-markers'));
		
		const allElementsToCheck = [...existingTooltips, ...viewportLines];

		for (const element of allElementsToCheck) {
			const rect = element.getBoundingClientRect();
			
			if (rect.width === 0 && rect.height === 0) continue;

			const existingRect = {
				left: rect.left,
				top: rect.top,
				right: rect.right,
				bottom: rect.bottom,
				width: rect.width,
				height: rect.height
			};

			// ✅ 겹침 영역 계산
			const overlapLeft = Math.max(currentRect.left, existingRect.left);
			const overlapTop = Math.max(currentRect.top, existingRect.top);
			const overlapRight = Math.min(currentRect.right, existingRect.right);
			const overlapBottom = Math.min(currentRect.bottom, existingRect.bottom);
			
			if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
				const overlapWidth = overlapRight - overlapLeft;
				const overlapHeight = overlapBottom - overlapTop;
				const overlapArea = overlapWidth * overlapHeight;
				const currentArea = currentRect.width * currentRect.height;
				
				const overlapRatio = overlapArea / currentArea;
				
				if (overlapRatio >= OVERLAP_THRESHOLD) {
					//console.log(`🔄 Collision detected ${(overlapRatio * 100).toFixed(1)}%, adjusting position`);
					
					// ✅ 위치 조정 로직
					if (orientation === 'horizontal') {
						const originalY = adjustedY;
						const isAboveLine = originalY < fromY;
						
						if (isAboveLine) {
							adjustedY = fromY + 20;
						} else {
							adjustedY = fromY - height - 20;
						}
						
						// 뷰포트 경계 체크
						if (adjustedY < 5) adjustedY = 5;
						if (adjustedY + height > window.innerHeight - 5) {
							adjustedY = window.innerHeight - height - 5;
						}
						
					} else {
						const originalX = adjustedX;
						const isRightOfLine = originalX > fromX;
						
						if (isRightOfLine) {
							adjustedX = fromX - width - 20;
						} else {
							adjustedX = fromX + 20;
						}
						
						// 뷰포트 경계 체크
						if (adjustedX < 5) adjustedX = 5;
						if (adjustedX + width > window.innerWidth - 5) {
							adjustedX = window.innerWidth - width - 5;
						}
					}
					
					adjusted = true;
					break;
				}
			}
		}

		

		return { x: adjustedX, y: adjustedY, adjusted };
	}


	// 수직 요소 확인
	// ✅ [수정] checkPerpendicularElement 함수가 정확한지 확인
	// 기존 checkPerpendicularElement 함수에 디버깅 추가
	checkPerpendicularElement(direction, element, elementRect, targetRect, adjacentElements) {
		let distance;
		let isPerpendicular = false;

		// ✅ [개선] 더 유연한 수직 관계 조건 (실제 웹 레이아웃에 맞춤)
		switch (direction) {
			case 'left':
				// ✅ 왼쪽: 요소의 오른쪽이 타겟의 왼쪽보다 작고, 수직으로 겹침
				isPerpendicular = elementRect.right <= targetRect.left &&
					elementRect.bottom > targetRect.top &&  // 위쪽으로 일부 겹침
					elementRect.top < targetRect.bottom;    // 아래쪽으로 일부 겹침
				distance = targetRect.left - elementRect.right;
				break;
			case 'right':
				// ✅ 오른쪽: 요소의 왼쪽이 타겟의 오른쪽보다 크고, 수직으로 겹침
				isPerpendicular = elementRect.left >= targetRect.right &&
					elementRect.bottom > targetRect.top &&
					elementRect.top < targetRect.bottom;
				distance = elementRect.left - targetRect.right;
				break;
			case 'top':
				// ✅ 위쪽: 요소의 아래쪽이 타겟의 위쪽보다 작고, 수평으로 겹침
				isPerpendicular = elementRect.bottom <= targetRect.top &&
					elementRect.right > targetRect.left &&   // 왼쪽으로 일부 겹침
					elementRect.left < targetRect.right;     // 오른쪽으로 일부 겹침
				distance = targetRect.top - elementRect.bottom;
				break;
			case 'bottom':
				// ✅ 아래쪽: 요소의 위쪽이 타겟의 아래쪽보다 크고, 수평으로 겹침
				isPerpendicular = elementRect.top >= targetRect.bottom &&
					elementRect.right > targetRect.left &&
					elementRect.left < targetRect.right;
				distance = elementRect.top - targetRect.bottom;
				break;
		}

		// ✅ 거리 유효성 검사
		if (isPerpendicular && !isNaN(distance) && distance > 0 && distance < 5000) {
			if (distance < adjacentElements[direction].distance) {
				adjacentElements[direction] = { element, distance };
			}
		}
	}



	// 현재 측정 요소만 제거
	removeCurrentMeasurements() {
		////console.log('🗑️ Removing current measurements (preserving selected element)');
    	this.removeMeasurementsBySelectors(false);
	}
	// ✅ 추가: 선택 해제 시 사용할 완전 제거 함수
	removeAllMeasurementsIncludingSelected() {
		////console.log('🗑️ Removing ALL measurements including selected element');
    	this.removeMeasurementsBySelectors(true);
	}
	// ✅ 추가: 선택된 요소 보존 버전
	removeMeasurementsExceptSelected() {
		////console.log('🗑️ Removing measurements except selected element');
    	this.removeMeasurementsBySelectors(false);
	}

	// 외부 요소 하이라이트 제거
	removeExternalElementHighlights() {
		/*
		this.state.externalElementHighlights.forEach(highlight => {
			try {
				if (highlight && highlight.parentNode) {
					highlight.parentNode.removeChild(highlight);
				}
			} catch (error) {
				//console.log('Error removing external highlight:', error);
			}
		});
		this.state.externalElementHighlights = [];
		*/
	}

	// 거리 포맷팅
	formatDistance(distance) {
		// ✅ 안전한 옵션 접근
		const options = this.state.options || {};
		const decimalPlaces = options.decimalPlaces || 0;
		const rulerUnit = options.rulerUnit || 'px';
		
		if (isNaN(distance)) {
			return `0${rulerUnit}`;
		}
		
		//return `${distance.toFixed(decimalPlaces)}${rulerUnit}`;
		return `${distance.toFixed(decimalPlaces)}`;  // ${rulerUnit} -> px 단위 제거
	}

	// 요소 정보 표시
	//###########################################################################################################
	// ✅ 추가: iframe/광고 요소 정보 표시 보완 함수
	// ✅ 수정: 요소 정보 표시 함수 - 안전한 postMessage, SVG 안전 처리
	showElementInfo(element) {
		
		// ✅ Extension context 체크 추가
		if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
			//console.log('Extension context invalidated - skipping element info');
			return;
		}
		if (!this.state.panelFrame || !this.state.panelFrame.contentWindow) {
			//console.log('Panel frame not available');
			return;
		}
		// ✅ SVG 요소인지 확인 및 필터링
		if (element instanceof SVGElement) {
			//console.log('SVG element skipped for detailed info');
			return;
		}
		const rect = element.getBoundingClientRect();
		const computedStyle = window.getComputedStyle(element);
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;

		// ✅ SVG 관련 속성 제거
		const elementInfo = {
			tagName: element.tagName,
			id: element.id || 'N/A',
			classes: element.className || 'N/A',
			type: element.type || 'N/A',
			width: `${Math.round(rect.width)} px`,
			height: `${Math.round(rect.height)} px`,
			position: {
				top: `${Math.round(rect.top + scrollY)} px`,
				right: `${Math.round(rect.right + scrollX)} px`,
				bottom: `${Math.round(rect.bottom + scrollY)} px`,
				left: `${Math.round(rect.left + scrollX)} px`
			},
			margins: {
				top: computedStyle.marginTop,
				right: computedStyle.marginRight,
				bottom: computedStyle.marginBottom,
				left: computedStyle.marginLeft
			},
			padding: {
				top: computedStyle.paddingTop,
				right: computedStyle.paddingRight,
				bottom: computedStyle.paddingBottom,
				left: computedStyle.paddingLeft
			},
			font: {
				family: computedStyle.fontFamily,
				size: computedStyle.fontSize,
				weight: computedStyle.fontWeight,
				color: computedStyle.color
			},
			background: {
				color: computedStyle.backgroundColor,
				image: computedStyle.backgroundImage && !computedStyle.backgroundImage.includes('url("#')
					? computedStyle.backgroundImage
					: 'N/A'
			}
		};

		// ✅ HTML은 SVG 요소일 경우 제외
		if (!(element instanceof SVGElement)) {
			try {
				elementInfo.html = element.outerHTML.substring(0, 500) + (element.outerHTML.length > 500 ? '...' : '');
			} catch (e) {
				elementInfo.html = 'Cannot access HTML content';
			}
		} else {
			elementInfo.html = 'SVG Element (content not available)';
		}

		// ✅ IFrame인 경우 src 정보 추가
		if (element.tagName === 'IFRAME') {
			elementInfo.iframeSrc = element.src || 'N/A';
			elementInfo.iframeTitle = element.title || 'N/A';
			elementInfo.iframeName = element.name || 'N/A';
		}

		// ✅ 안전한 postMessage with error handling
		try {
			// Extension context 한번 더 체크
			if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
				//console.log('Extension context invalidated during processing');
				return;
			}

			if (window.WebInspector && window.WebInspector._safePostMessage) {
				window.WebInspector._safePostMessage(
					this.state.panelFrame.contentWindow,
					{
						type: 'ELEMENT_INFO',
						data: elementInfo
					},
					'*'  // ✅ targetOrigin을 '*'로 변경 (더 관대하게)
				);
			} else {
				//console.log('WebInspector not available');
			}
		} catch (error) {
			//console.log('Error sending element info:', error);
			// 에러 발생 시 무시 (사용자 경해 해치지 않음)
		}
	}



	//------------------------------------------------------------------------------
	// ✅ Isolation 기능과 관련된 함수들 간의 관계:

	// 1. findIframeFromOverlay(overlayElement) 
	//    - 목적: iframe 오버레이 요소로부터 원본 iframe 요소를 찾음
	//    - Isolation과의 관계: Isolation이 적용된 오버레이에서 원본 iframe 위치를 추적

	// 2. findAdIframeContainer(element)
	//    - 목적: 광고/iframe 컨테이너 요소 찾기  
	//    - Isolation과의 관계: Isolation이 필요한 광고/iframe 요소 식별

	// Iframe에서 요소 찾기
	findIframeFromOverlay(overlayElement) {
		const iframes = document.querySelectorAll('iframe');
		
		for (const iframe of iframes) {
			const iframeRect = iframe.getBoundingClientRect();
			const overlayRect = overlayElement.getBoundingClientRect();

			// ✅ Isolation이 적용되어도 위치 비교 가능
			if (Math.abs(iframeRect.left - overlayRect.left) < 2 &&
				Math.abs(iframeRect.top - overlayRect.top) < 2 &&
				Math.abs(iframeRect.width - overlayRect.width) < 2 &&
				Math.abs(iframeRect.height - overlayRect.height) < 2) {
				return iframe;
			}
		}
		return null;
	}

	// 광고 Iframe 컨테이너 찾기
	// ✅ findAdIframeContainer - Isolation 대상 식별
	findAdIframeContainer(element) {
		if (element.tagName === 'IFRAME') {
			// ✅ 이 iframe에 Isolation 적용 대상인지 확인
			if (this.shouldApplyIsolation(element)) {
				return element;
			}
		}

		let current = element;
		while (current && current !== document.body) {
			if (current.tagName === 'IFRAME') {
				if (this.shouldApplyIsolation(current)) {
					return current;
				}
			}
			current = current.parentElement;
		}
		return null;
	}

	// ✅ Isolation 적용 대상 판별
	shouldApplyIsolation(iframeElement) {
		// 광고 iframe 패턴 확인
		const adIframePatterns = [
			'ad_timeboard_tgtLREC',
			'right-ad-1_tgtLREC', 
			'right-ad-2_tgtLREC',
			/ad/,
			/tgt/,
			/LREC/
		];
		
		for (const pattern of adIframePatterns) {
			if (typeof pattern === 'string') {
				if (iframeElement.id === pattern || iframeElement.title === pattern) {
					return true;
				}
			} else if (pattern.test(iframeElement.id) || pattern.test(iframeElement.title)) {
				return true;
			}
		}
		
		return true; // 기본적으로 모든 iframe에 Isolation 적용
	}

	//-----------------------------------------------------------------------------------------------
	// ✅ createIframeOverlays 함수 - isolation 상태 반영
	createIframeOverlays() {
		//console.log('🎯 Creating iframe overlays...');
		
		// 기존 오버레이 제거
		//this.removeIframeOverlays();
		
		const iframes = document.querySelectorAll('iframe');
		iframes.forEach(iframe => {
			try {
				const rect = iframe.getBoundingClientRect();
				if (rect.width > 0 && rect.height > 0) {
					const overlay = this.createIframeOverlay(iframe, rect);
					document.body.appendChild(overlay);
					this.state.iframeOverlays.push(overlay);
				}
			} catch (error) {
				//console.log('Iframe overlay creation error:', error);
			}
		});
		
		//console.log(`✅ Created ${this.state.iframeOverlays.length} iframe overlays`);
	}

	// ✅ createIframeOverlay 함수 - isolation 상태 반영
	createIframeOverlay(iframe, rect) {
		const overlay = document.createElement('div');
		overlay.className = 'iframe-overlay';
		overlay.style.position = 'fixed';
		overlay.style.pointerEvents = 'none';
		overlay.style.zIndex = this.state.Z_INDEX_LAYERS.AD_CONTAINER;
		overlay.style.left = `${rect.left}px`;
		overlay.style.top = `${rect.top}px`;
		overlay.style.width = `${rect.width}px`;
		overlay.style.height = `${rect.height}px`;
		overlay.style.outline = '2px dashed #ff0000';
		overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
		
		// ✅ isolation 기능이 켜져 있을 때만 레이어 충돌 방지 적용
		if (this.state.advancedFeatures.isolation) {
			overlay.style.contain = 'layout paint style';
			overlay.style.transform = 'translateZ(0)';
			overlay.style.willChange = 'transform';
			overlay.style.isolation = 'isolate';
			overlay.style.backfaceVisibility = 'hidden';
		}
		
		return overlay;
	}
	// ✅ createAdIframeHighlight 함수 - isolation 상태 반영
	createAdIframeHighlight(element, rect) {
		const highlight = document.createElement('div');
		highlight.className = 'iframe-highlight ad-overlay';
		
		highlight.style.position = 'fixed';
		highlight.style.pointerEvents = 'none';
		highlight.style.zIndex = this.state.Z_INDEX_LAYERS.AD_CONTAINER;
		highlight.style.left = `${rect.left}px`;
		highlight.style.top = `${rect.top}px`;
		highlight.style.width = `${rect.width}px`;
		highlight.style.height = `${rect.height}px`;
		
		// ✅ isolation 기능이 켜져 있을 때만 레이어 충돌 방지 적용
		if (this.state.advancedFeatures.isolation) {
			highlight.style.contain = 'layout paint style';
			highlight.style.transform = 'translateZ(0)';
			highlight.style.willChange = 'transform';
			highlight.style.isolation = 'isolate';
			highlight.style.backfaceVisibility = 'hidden';
		}
		
		highlight.style.outline = `2px dashed #ff0000`;
		highlight.style.background = `repeating-linear-gradient(
			45deg,
			transparent,
			transparent 5px,
			rgba(255, 0, 0, 0.42) 5px,
			rgba(255,0,0,0.1) 10px
		)`;
		
		return highlight;
	}
	//-----------------------------------------------------------------------------------------------

	// 마진 측정 표시
	// 마진 측정 표시 - 뷰포트 좌표 사용
	displayMarginMeasurements(element, rect) {
		const computedStyle = window.getComputedStyle(element);

		const margins = {
			top: this.parseValidMarginValue(computedStyle.marginTop),
			right: this.parseValidMarginValue(computedStyle.marginRight),
			bottom: this.parseValidMarginValue(computedStyle.marginBottom),
			left: this.parseValidMarginValue(computedStyle.marginLeft)
		};

		// ✅ 뷰포트 좌표 그대로 사용 (스크롤 보정 제거)
		const viewportRect = {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height
		};
		
		// 마진 영역 표시
		if (margins.top > 0) {
			this.createMarginArea(
				viewportRect.left - margins.left,
				viewportRect.top - margins.top,
				rect.width + margins.left + margins.right,
				margins.top,
				'top',
				margins.top
			);
		}

		if (margins.right > 0) {
			this.createMarginArea(
				viewportRect.right,
				viewportRect.top - margins.top,
				margins.right,
				rect.height + margins.top + margins.bottom,
				'right',
				margins.right
			);
		}

		if (margins.bottom > 0) {
			this.createMarginArea(
				viewportRect.left - margins.left,
				viewportRect.bottom,
				rect.width + margins.left + margins.right,
				margins.bottom,
				'bottom',
				margins.bottom
			);
		}

		if (margins.left > 0) {
			this.createMarginArea(
				viewportRect.left - margins.left,
				viewportRect.top - margins.top,
				margins.left,
				rect.height + margins.top + margins.bottom,
				'left',
				margins.left
			);
		}
	}

	// 패딩 측정 표시
	// 패딩 측정 표시 - 뷰포트 좌표 사용
	displayPaddingMeasurements(element, rect) {
		const computedStyle = window.getComputedStyle(element);

		const padding = {
			top: this.parseValidMarginValue(computedStyle.paddingTop),
			right: this.parseValidMarginValue(computedStyle.paddingRight),
			bottom: this.parseValidMarginValue(computedStyle.paddingBottom),
			left: this.parseValidMarginValue(computedStyle.paddingLeft)
		};

		// ✅ 뷰포트 좌표 그대로 사용 (스크롤 보정 제거)
		const viewportRect = {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom,
			width: rect.width,
			height: rect.height
		};
		
		// 패딩 영역 표시
		if (padding.top > 0) {
			this.createPaddingArea(
				viewportRect.left,
				viewportRect.top,
				rect.width,
				padding.top,
				'top',
				padding.top
			);
		}

		if (padding.right > 0) {
			this.createPaddingArea(
				viewportRect.right - padding.right,
				viewportRect.top,
				padding.right,
				rect.height,
				'right',
				padding.right
			);
		}

		if (padding.bottom > 0) {
			this.createPaddingArea(
				viewportRect.left,
				viewportRect.bottom - padding.bottom,
				rect.width,
				padding.bottom,
				'bottom',
				padding.bottom
			);
		}

		if (padding.left > 0) {
			this.createPaddingArea(
				viewportRect.left,
				viewportRect.top,
				padding.left,
				rect.height,
				'left',
				padding.left
			);
		}
	}

	// 마진 영역 생성 - fixed로 통일
	createMarginArea(x, y, width, height, position, value) {
		const marginArea = document.createElement('div');
		marginArea.className = 'margin-area';
		marginArea.style.position = 'fixed'; // ✅ absolute에서 fixed로 변경
		marginArea.style.pointerEvents = 'none';
		marginArea.style.zIndex = this.state.Z_INDEX_LAYERS.MARGIN_LINE;
		marginArea.style.backgroundColor = `${this.state.options.marginColor}20`;
		marginArea.style.outline = `1px dashed ${this.state.options.marginColor}`;

		// ✅ 뷰포트 좌표 사용 (스크롤 보정 제거)
		marginArea.style.left = `${x}px`;
		marginArea.style.top = `${y}px`;
		marginArea.style.width = `${width}px`;
		marginArea.style.height = `${height}px`;

		document.body.appendChild(marginArea);
		this.state.measureElements.push(marginArea);

		// 마진 값 텍스트
		this.createMarginValueText(x, y, width, height, value, position);
	}

	// 마진 값 파싱
	parseValidMarginValue(value) {
		if (!value || value === 'auto' || value === 'none' || value === 'initial' || value === 'inherit') {
			return 0;
		}

		const numericValue = parseFloat(value);
		return isNaN(numericValue) ? 0 : Math.max(0, numericValue);
	}

	// 마진 값 텍스트 - 위치 계산 정확히 수정
	createMarginValueText(x, y, width, height, value, position) {
		const text = document.createElement('div');
		text.className = 'margin-value-text';
		text.textContent = `${Math.round(value)}`; // `${Math.round(value)}px` -> px 단위 제거
		text.style.fontSize = this.state.options.mtooltipFontSize;
		text.style.color = this.state.options.marginColor;
		text.style.fontWeight = 'bold';
		text.style.position = 'fixed';
		text.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT+1; // text를 line의 zIndex 보다 더 높게 처리. (가끔 다른 분석선과 겹치는 경우가 발생)
		//text.style.padding = '2px 4px';
		text.style.borderRadius = '2px';
		text.style.whiteSpace = 'nowrap';
		// text.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';

		// ✅ 먼저 DOM에 추가해서 크기 측정
		document.body.appendChild(text);
		const textRect = text.getBoundingClientRect();
		const textWidth = textRect.width;
		const textHeight = textRect.height;

		// ✅ 위치 계산 정확히 수정
		switch (position) {
			case 'top':
				text.style.left = `${x + (width / 2)-textWidth+2}px`;
				text.style.top = `${y + (height / 2)}px`;
				text.style.transform = 'translate(-50%, -50%)';
				break;
			case 'right':
				text.style.left = `${x + width/2 - textWidth/2}px`;
				text.style.top = `${y + (height/2 - textHeight-5)}px`;
				text.style.transform = 'rotate(-90deg)';
				break;
			case 'bottom':
				text.style.left = `${x + (width / 2)-textWidth+2}px`;
				text.style.top = `${y + (height / 2)}px`;
				text.style.transform = 'translate(-50%, -50%)';
				break;
			case 'left':
				text.style.left = `${x + width/2 - textWidth/2}px`;
				text.style.top = `${y + (height/2 - textHeight-5)}px`;
				text.style.transform = 'rotate(-90deg)';
				break;
		}

		document.body.appendChild(text);
		this.state.measureElements.push(text);
	}

	//-------------------------------------------------------------------------------------

	// 패딩 영역 생성 - 텍스트 위치 정확히 조정
	createPaddingArea(x, y, width, height, position, value) {
		const paddingArea = document.createElement('div');
		paddingArea.className = 'padding-area';
		paddingArea.style.position = 'fixed';
		paddingArea.style.pointerEvents = 'none';
		paddingArea.style.zIndex = this.state.Z_INDEX_LAYERS.PADDING_LINE;
		paddingArea.style.backgroundColor = `${this.state.options.paddingColor}20`;
		paddingArea.style.outline = `1px dashed ${this.state.options.paddingColor}`;

		paddingArea.style.left = `${x}px`;
		paddingArea.style.top = `${y}px`;
		paddingArea.style.width = `${width}px`;
		paddingArea.style.height = `${height}px`;

		document.body.appendChild(paddingArea);
		this.state.measureElements.push(paddingArea);

		// 패딩 값 텍스트 - 위치 계산 정확히 수정
		this.createPaddingValueText(x, y, width, height, value, position);
	}

	// 패딩 값 텍스트 - 위치 계산 정확히 수정
	createPaddingValueText(x, y, width, height, value, position) {
		const text = document.createElement('div');
		text.className = 'padding-value-text';
		text.textContent = `${Math.round(value)}`;  // `${Math.round(value)}px` -> px 단위 제거
		text.style.fontSize = this.state.options.ptooltipFontSize;
		text.style.color = this.state.options.paddingColor;
		text.style.fontWeight = 'bold';
		text.style.position = 'fixed'; // ✅ fixed로 통일
		text.style.zIndex = this.state.Z_INDEX_LAYERS.TEXT+1; // text를 line의 zIndex 보다 더 높게 처리. (가끔 다른 분석선과 겹치는 경우가 발생)
		//text.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // ✅ 배경색 추가
		//text.style.padding = '2px 4px';
		text.style.borderRadius = '2px';

		// ✅ 먼저 DOM에 추가해서 크기 측정
		document.body.appendChild(text);
		const textRect = text.getBoundingClientRect();
		const textWidth = textRect.width;
		const textHeight = textRect.height;

		// ✅ 위치 계산 정확히 수정 - 패딩 영역 내부 중앙에 배치
		switch (position) {
			case 'top':
				text.style.left = `${x + (width / 2)-textWidth+2}px`;
				text.style.top = `${y + (height / 2)}px`;
				text.style.transform = 'translate(-50%, -50%)';
				break;
			case 'right':
				text.style.left = `${x + width/2 - textWidth/2}px`;
				text.style.top = `${y + (height/2 - textHeight-5)}px`;
				text.style.transform = 'rotate(-90deg)';
				break;
			case 'bottom':
				text.style.left = `${x + (width / 2)-textWidth+2}px`;
				text.style.top = `${y + (height / 2)}px`;
				text.style.transform = 'translate(-50%, -50%)';
				break;
			case 'left':
				text.style.left = `${x + width/2 - textWidth/2}px`;
				text.style.top = `${y + (height/2 - textHeight-5)}px`;
				text.style.transform = 'rotate(-90deg)';
				break;
		}

		document.body.appendChild(text);
		this.state.measureElements.push(text);
	}


	// Border-radius 측정
	// ✅ 수정: Border-radius 측정 - fixed로 통일
	displayBorderRadiusMeasurements(element, rect) {
		const computedStyle = window.getComputedStyle(element);
		const borderRadius = computedStyle.borderRadius;

		if (!borderRadius || borderRadius === '0px') return;

		const radii = this.parseBorderRadius(borderRadius);

		const corners = [
			{
				position: 'top-left',
				x: rect.left, // ✅ 뷰포트 좌표
				y: rect.top,  // ✅ 뷰포트 좌표
				radius: radii[0]
			},
			{
				position: 'top-right',
				x: rect.right,
				y: rect.top,
				radius: radii[1]
			},
			{
				position: 'bottom-right',
				x: rect.right,
				y: rect.bottom,
				radius: radii[2]
			},
			{
				position: 'bottom-left',
				x: rect.left,
				y: rect.bottom,
				radius: radii[3]
			}
		];

		corners.forEach(corner => {
			if (corner.radius > 0) {
				this.createCornerIndicator(corner);
			}
		});
	}

	// Border-radius 파싱
	parseBorderRadius(borderRadius) {
		if (!borderRadius || borderRadius === '0px') return [0, 0, 0, 0];

		const values = borderRadius.split(/\s+/).map(val => {
			const numeric = parseFloat(val);
			return isNaN(numeric) ? 0 : numeric;
		});

		if (values.length === 1) return [values[0], values[0], values[0], values[0]];
		if (values.length === 2) return [values[0], values[1], values[0], values[1]];
		if (values.length === 3) return [values[0], values[1], values[2], values[1]];
		return values.slice(0, 4);
	}

	// 코너 표시기 생성
	// ✅ 수정: 코너 표시기 생성 - fixed로 통일
	createCornerIndicator(corner) {
		const { x, y, radius, position } = corner;

		const container = document.createElement('div');
		container.className = 'corner-radius-indicator';
		container.style.position = 'fixed';
		container.style.left = `${x}px`;
		container.style.top = `${y}px`;
		container.style.pointerEvents = 'none';
		container.style.zIndex = this.state.Z_INDEX_LAYERS.BORDER_RADIUS;

		// 삼각형 생성
		const triangle = document.createElement('div');
		triangle.style.position = 'absolute';
		triangle.style.width = '8px';
		triangle.style.height = '8px';
		triangle.style.backgroundColor = this.state.options.borderRadiusColor;
		triangle.style.clipPath = 'polygon(0 0, 100% 0, 0 100%)';

		// 삼각형 방향 설정
		switch (position) {
			case 'top-left':
				triangle.style.transform = 'rotate(0deg)';
				triangle.style.left = '0';
				triangle.style.top = '0';
				break;
			case 'top-right':
				triangle.style.transform = 'rotate(90deg)';
				triangle.style.right = '0';
				triangle.style.top = '0';
				break;
			case 'bottom-right':
				triangle.style.transform = 'rotate(180deg)';
				triangle.style.right = '0';
				triangle.style.bottom = '0';
				break;
			case 'bottom-left':
				triangle.style.transform = 'rotate(270deg)';
				triangle.style.left = '0';
				triangle.style.bottom = '0';
				break;
		}

		// ✅ 수정: createMeasurementTextElement 사용
		const text = this.createMeasurementTextElement(
			`${Math.round(radius)}`,
			this.state.options.borderRadiusColor,
			{
				className: 'radius-value-text',
				padding: '1px 3px'
			}
		);
		text.style.position = 'absolute';
		text.style.lineHeight = '1';
		text.style.whiteSpace = 'nowrap';

		// 텍스트 위치 설정
		switch (position) {
			case 'top-left':
				text.style.left = '-5px';
				text.style.top = '-5px';
				text.style.transform = 'translate(-100%, -100%)';
				break;
			case 'top-right':
				text.style.right = '-5px';
				text.style.top = '-5px';
				text.style.transform = 'translate(100%, -100%)';
				break;
			case 'bottom-right':
				text.style.right = '-5px';
				text.style.bottom = '-5px';
				text.style.transform = 'translate(100%, 100%)';
				break;
			case 'bottom-left':
				text.style.left = '-5px';
				text.style.bottom = '-5px';
				text.style.transform = 'translate(-100%, 100%)';
				break;
		}

		container.appendChild(triangle);
		container.appendChild(text);
		document.body.appendChild(container);
		this.state.measureElements.push(container);
	}


	
}