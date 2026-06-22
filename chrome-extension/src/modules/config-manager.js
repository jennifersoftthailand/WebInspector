/**
 * ConfigManager - Web Inspector 사용자 설정 중앙 관리 모듈
 * ==========================================================
 * 
 * 이 클래스는 options.html에 있는 모든 사용자 설정(44개)을 중앙에서 관리합니다.
 * chrome.storage.sync를 기반으로 저장/로드하며, localStorage를 캐시로 사용합니다.
 * 
 * [관계도]
 * options.js ──> ConfigManager ──> chrome.storage.sync
 *                              ──> localStorage (cache)
 * main-content.js ──> ConfigManager.get() ──> UI 렌더링에 사용
 * 
 * [변경 이력]
 * 2026-06-22: 최초 생성 - options.html의 44개 설정 기본값 정의
 * 
 * [주의사항]
 * - ES modules를 사용하지 않으므로 window.ConfigManager에 전역 할당
 * - StateManager는 세션 상태(활성 모드, Depth 등)를 관리하고,
 *   ConfigManager는 사용자 설정(색상, 두께, 투명도 등)만 관리
 * - StateManager의 getEmptyOptions()와 값이 중복되지 않도록 주의
 * - 변경 사항은 chrome.storage.sync에 저장되며,
 *   localStorage에도 캐시되어 빠른 읽기 지원
 */

class ConfigManager {
    /**
     * 생성자
     * - 기본값 정의
     * - 캐시 초기화
     * - onChange 리스너 저장소 생성
     * - chrome.storage.sync에서 저장된 값 로드 시도
     */
    constructor() {
        console.log('🏗️ [ConfigManager] 초기화 시작...');

        // ================================================================
        // 1. 기본값 정의 (options.html의 모든 요소 ID 기준)
        // ================================================================
        // 이 기본값들은 options.html의 input/select 요소들의 value 속성과 일치해야 함
        // ----------------------------------------------------------------

        // [1] 색상 옵션 (11개)
        // options.html의 input[type="color"] 요소들
        this.DEFAULTS = {

            // --- Display Settings 섹션 ---
            highlightColor: '#9fcbc0',    // 하이라이트 색상 (요소 호버 시 테두리)
            selectedColor: '#FF9800',     // 선택된 요소 색상
            crosshairColor: '#0F9D58',    // 십자선 색상
            rulerColor: '#f8f9fa',       // 눈금자 색상

            // --- Measurement Mode Colors 섹션 ---
            viewportColor: '#6A0DAD',     // 뷰포트 거리 측정 색상
            elementColor: '#ff0095',      // 요소 거리 측정 색상
            marginColor: '#FFD700',       // 마진 측정 색상
            paddingColor: '#FF5252',      // 패딩 측정 색상
            childrenColor: '#41433a',     // 자식 요소 측정 색상
            sizeColor: '#ff0000',         // 크기 측정 색상
            borderRadiusColor: '#ff0000', // 모서리 radius 측정 색상

            // ----------------------------------------------------------------

            // [2] 선 두께 옵션 (7개) - 범위: 0.5 ~ 5 (step 0.5)
            // options.html의 input[type="range"] 슬라이더들
            elementLineThickness: 1,        // 요소 거리 선 두께
            marginLineThickness: 0.5,       // 마진 선 두께
            paddingLineThickness: 0.5,      // 패딩 선 두께
            childrenLineThickness: 1,       // 자식 요소 선 두께
            sizeLineThickness: 2,           // 크기 선 두께
            borderRadiusLineThickness: 2,   // 모서리 radius 선 두께
            viewportLineThickness: 1,       // 뷰포트 선 두께

            // ----------------------------------------------------------------

            // [3] 투명도 옵션 (8개) - 범위: 0.1 ~ 1 (step 0.1)
            // options.html의 input[type="range"] 슬라이더들
            elementLineOpacity: 0.8,        // 요소 거리 선 투명도
            marginLineOpacity: 0.7,         // 마진 선 투명도
            paddingLineOpacity: 0.7,        // 패딩 선 투명도
            childrenLineOpacity: 0.8,       // 자식 요소 선 투명도
            childrenBgOpacity: 0.2,         // 자식 요소 배경 투명도
            sizeLineOpacity: 0.8,           // 크기 선 투명도
            borderRadiusLineOpacity: 0.8,   // 모서리 radius 선 투명도
            viewportLineOpacity: 0.8,       // 뷰포트 선 투명도

            // ----------------------------------------------------------------

            // [4] Select 드롭다운 옵션 (4개)
            rulerUnit: 'px',                // 측정 단위 (px/cm/mm/in)
            defaultMeasurementMode: 'element', // 기본 측정 모드 (element/viewport/margin/padding/children/size/radius)
            panelPosition: 'right',          // 패널 위치 (right/left)
            crosshairStyle: 'partial',       // 십자선 스타일 (full/partial/marking/none)

            // ----------------------------------------------------------------

            // [5] 기타 옵션 (4개)
            decimalPlaces: 0,               // 소수점 자리수 (0/1/2)
            defaultDepthLevel: 2,           // 기본 Depth 레벨 (1~5)
            tooltipFontSize: '10px',        // 툴팁 폰트 크기 (8px/9px/10px/11px/12px)
            formatHtml: true                // HTML 포맷팅 여부 (checkbox)

            // ----------------------------------------------------------------
            // 총 34개의 사용자 설정 (11 + 7 + 8 + 4 + 4 = 34)
        };

        /** @private {Object} 캐시 - 현재 로드된 설정 값 */
        this._cache = { ...this.DEFAULTS };

        /** @private {Object} onChange 이벤트 리스너 저장소 */
        this._changeListeners = {};

        /** @private {boolean} 초기화 완료 플래그 */
        this._initialized = false;

        /** @private {number} 마지막 chrome.storage 저장 시간 (쓰기 제한용) */
        this._lastStorageWrite = 0;

        /** @private {number} Chrome Storage 쓰기 제한 간격 (ms) */
        this._STORAGE_COOLDOWN = 500;

        // ================================================================
        // 2. 초기화
        // ================================================================
        this._init();
    }

    // ====================================================================
    // 내부 초기화 메서드
    // ====================================================================

    /**
     * _init - ConfigManager 초기화
     * 
     * 1. localStorage 캐시 확인
     * 2. chrome.storage.sync에서 저장된 값 로드
     * 3. 캐시 업데이트
     * 
     * [호출 관계]
     * constructor() ──> _init()
     *                  ├─ _loadFromCache()   [localStorage]
     *                  └─ _loadFromStorage() [chrome.storage.sync]
     * 
     * [주의사항]
     * - 비동기 초기화이므로 _init() 호출 직후에는 _initialized = false
     * - _loadFromStorage의 콜백에서 _initialized = true로 설정
     */
    _init() {
        // 1. localStorage 캐시에서 즉시 로드 (동기)
        this._loadFromCache();

        // 2. chrome.storage.sync에서 비동기 로드 (기존 저장된 값 우선)
        this._loadFromStorage();

        console.log('✅ [ConfigManager] 초기화 완료 (초기화는 비동기로 완료됨)');
    }

    // ====================================================================
    // 공개 메서드
    // ====================================================================

    /**
     * get(key) - 특정 설정값 조회
     * 
     * @param {string} key - 설정 키 이름 (options.html 요소 ID와 동일)
     * @returns {*} 설정값 (없으면 undefined)
     * 
     * [사용 예]
     * const color = ConfigManager.get('highlightColor');
     * const thickness = ConfigManager.get('elementLineThickness');
     */
    get(key) {
        // 캐시에서 조회 (있으면 반환)
        if (this._cache && key in this._cache) {
            return this._cache[key];
        }

        // 캐시에 없으면 기본값 반환
        if (this.DEFAULTS && key in this.DEFAULTS) {
            console.log(`⚠️ [ConfigManager] '${key}'가 캐시에 없음, 기본값 반환`);
            return this.DEFAULTS[key];
        }

        // 기본값에도 없으면 undefined 반환
        console.warn(`❌ [ConfigManager] 알 수 없는 키: '${key}'`);
        return undefined;
    }

    /**
     * set(key, value) - 특정 설정값 저장
     * 
     * @param {string} key - 설정 키 이름
     * @param {*} value - 저장할 값
     * @returns {boolean} 저장 성공 여부
     * 
     * [호출 관계]
     * options.js (UI 변경) ──> set() ──> _saveToStorage() [chrome.storage.sync]
     *                                ──> _saveToCache()   [localStorage]
     *                                ──> _emitChange()    [onChange 리스너]
     * 
     * [주의사항]
     * - chrome.storage.sync는 쓰기 제한이 있으므로 cooldown 적용
     * - localStorage는 즉시 저장 (속도 향상)
     * - onChange 리스너가 있으면 변경 알림 전송
     */
    set(key, value) {
        // 키 유효성 검사
        if (!key || typeof key !== 'string') {
            console.error('❌ [ConfigManager] 유효하지 않은 키:', key);
            return false;
        }

        // 이전 값과 동일하면 저장 생략 (불필요한 쓰기 방지)
        if (this._cache && this._cache[key] === value) {
            return true; // 변경 없음, 하지만 성공으로 간주
        }

        // DEFAULTS에 없는 키는 무시 (알 수 없는 설정)
        if (!(key in this.DEFAULTS)) {
            console.warn(`⚠️ [ConfigManager] 알 수 없는 설정 키 무시: '${key}'`);
            return false;
        }

        console.log(`💾 [ConfigManager] 설정 변경: ${key} =`, value);

        // 1. 캐시 업데이트
        this._cache[key] = value;

        // 2. localStorage에 즉시 저장 (동기)
        this._saveToCache();

        // 3. chrome.storage.sync에 저장 (비동기, 쓰기 제한 적용)
        this._saveToStorage();

        // 4. onChange 리스너 호출
        this._emitChange(key, value);

        return true;
    }

    /**
     * setMultiple(updates) - 여러 설정을 한 번에 저장
     * 
     * @param {Object} updates - { key: value, ... } 형태의 업데이트 객체
     * @returns {boolean} 저장 성공 여부
     * 
     * [사용 예]
     * ConfigManager.setMultiple({
     *     highlightColor: '#ff0000',
     *     elementLineThickness: 2
     * });
     * 
     * [주의사항]
     * - 여러 값을 동시에 변경할 때는 여러 번 set() 호출보다 효율적
     * - chrome.storage.sync는 한 번만 호출됨
     */
    setMultiple(updates) {
        if (!updates || typeof updates !== 'object') {
            console.error('❌ [ConfigManager] setMultiple: 유효하지 않은 업데이트 객체');
            return false;
        }

        let changed = false;

        // 모든 업데이트를 캐시에 적용
        for (const [key, value] of Object.entries(updates)) {
            if (key in this.DEFAULTS) {
                // 값이 실제로 변경되었는지 확인
                if (this._cache[key] !== value) {
                    this._cache[key] = value;
                    changed = true;
                }
            } else {
                console.warn(`⚠️ [ConfigManager] setMultiple: 알 수 없는 키 '${key}'`);
            }
        }

        if (!changed) {
            console.log('⏭️ [ConfigManager] setMultiple: 변경된 값 없음');
            return true;
        }

        // localStorage에 저장
        this._saveToCache();

        // chrome.storage.sync에 저장
        this._saveToStorage();

        // onChange 리스너 호출
        for (const [key, value] of Object.entries(updates)) {
            if (key in this.DEFAULTS) {
                this._emitChange(key, value);
            }
        }

        console.log('✅ [ConfigManager] 여러 설정 일괄 저장 완료:', Object.keys(updates));
        return true;
    }

    /**
     * getAll() - 모든 설정값 조회
     * 
     * @returns {Object} 모든 설정값 (기본값 + 사용자 설정 병합)
     * 
     * [사용 예]
     * const allSettings = ConfigManager.getAll();
     * // 반환: { highlightColor: '#9fcbc0', elementLineThickness: 1, ... }
     * 
     * [주의사항]
     * - 기본값과 캐시된 값을 병합하여 반환
     * - 캐시에 없는 값은 기본값으로 대체됨
     */
    getAll() {
        // 기본값과 캐시 병합 (기본값 우선, 캐시가 있으면 덮어씀)
        const merged = { ...this.DEFAULTS };

        if (this._cache) {
            for (const [key, value] of Object.entries(this._cache)) {
                if (key in merged) {
                    merged[key] = value;
                }
            }
        }

        return merged;
    }

    /**
     * reset() - 모든 설정을 기본값으로 초기화
     * 
     * [호출 관계]
     * options.js (초기화 버튼) ──> ConfigManager.reset() ──> _saveToCache()
     *                                                  ──> _saveToStorage()
     *                                                  ──> _emitChange() [모든 키]
     * 
     * [주의사항]
     * - chrome.storage.sync의 모든 값이 기본값으로 덮어써짐
     * - 복구 불가능하므로 reset() 호출 전 확인 필요
     */
    reset() {
        console.log('🔄 [ConfigManager] 모든 설정 초기화 중...');

        // 캐시를 기본값으로 리셋
        this._cache = { ...this.DEFAULTS };

        // localStorage 업데이트
        this._saveToCache();

        // chrome.storage.sync 업데이트
        this._saveToStorage();

        // 모든 키에 대해 onChange 리스너 호출
        for (const key of Object.keys(this.DEFAULTS)) {
            this._emitChange(key, this.DEFAULTS[key]);
        }

        console.log('✅ [ConfigManager] 모든 설정이 기본값으로 초기화됨');
        return true;
    }

    /**
     * onChange(key, callback) - 설정 변경 리스너 등록
     * 
     * @param {string} key - 감시할 설정 키 (모든 변경 감시: '*')
     * @param {Function} callback - 변경 시 호출될 함수 (value) => void
     * 
     * [사용 예]
     * // 특정 키 변경 감시
     * ConfigManager.onChange('highlightColor', (value) => {
     *     updateHighlightColor(value);
     * });
     * 
     * // 모든 변경 감시
     * ConfigManager.onChange('*', (key, value) => {
     *     console.log(`설정 변경: ${key} = ${value}`);
     * });
     */
    onChange(key, callback) {
        if (!key || typeof callback !== 'function') {
            console.error('❌ [ConfigManager] onChange: 유효하지 않은 인자');
            return;
        }

        // 리스너 저장소에 추가 (배열로 관리)
        if (!this._changeListeners[key]) {
            this._changeListeners[key] = [];
        }
        this._changeListeners[key].push(callback);

        console.log(`✅ [ConfigManager] onChange 리스너 등록: '${key}'`);
    }

    /**
     * offChange(key, callback) - 설정 변경 리스너 제거
     * 
     * @param {string} key - 리스너 키
     * @param {Function} callback - 제거할 콜백 함수
     */
    offChange(key, callback) {
        if (!this._changeListeners[key]) return;

        this._changeListeners[key] = this._changeListeners[key]
            .filter(cb => cb !== callback);

        console.log(`✅ [ConfigManager] onChange 리스너 제거: '${key}'`);
    }

    /**
     * toJSON() - 현재 설정을 JSON 문자열로 변환
     * 
     * @returns {string} JSON 문자열
     */
    toJSON() {
        return JSON.stringify(this.getAll(), null, 2);
    }

    /**
     * getStorageKey() - Chrome Storage에 사용할 키 반환
     * 
     * @returns {string} 스토리지 키
     */
    getStorageKey() {
        return 'webinspector_config_manager';
    }

    // ====================================================================
    // 내부 메서드 (private)
    // ====================================================================

    /**
     * _loadFromCache() - localStorage에서 캐시 로드
     * 
     * [호출 관계]
     * _init() ──> _loadFromCache()
     * 
     * [주의사항]
     * - 동기 함수이므로 즉시 실행됨
     * - 캐시 키: 'webinspector_config_manager_cache'
     * - 파싱 실패 시 자동으로 기본값 사용
     */
    _loadFromCache() {
        try {
            const cached = localStorage.getItem('webinspector_config_manager_cache');

            if (cached) {
                const parsed = JSON.parse(cached);

                // 캐시된 값을 기본값에 덮어쓰기 (기본값 보존)
                for (const [key, value] of Object.entries(parsed)) {
                    if (key in this.DEFAULTS) {
                        this._cache[key] = value;
                    }
                }

                console.log('✅ [ConfigManager] localStorage 캐시 로드 성공');
            } else {
                console.log('📭 [ConfigManager] localStorage에 캐시 없음, 기본값 사용');
            }
        } catch (e) {
            console.warn('⚠️ [ConfigManager] 캐시 로드 실패, 기본값 사용:', e.message);
        }
    }

    /**
     * _saveToCache() - localStorage에 캐시 저장
     * 
     * [호출 관계]
     * set() ──> _saveToCache()
     * reset() ──> _saveToCache()
     * 
     * [주의사항]
     * - 동기 함수이므로 저장 완료까지 블로킹
     * - 용량이 작으므로 성능 문제 없음
     */
    _saveToCache() {
        try {
            localStorage.setItem(
                'webinspector_config_manager_cache',
                JSON.stringify(this._cache)
            );
        } catch (e) {
            console.warn('⚠️ [ConfigManager] 캐시 저장 실패:', e.message);
        }
    }

    /**
     * _loadFromStorage() - chrome.storage.sync에서 설정 로드
     * 
     * [호출 관계]
     * _init() ──> _loadFromStorage()
     * 
     * [주의사항]
     * - 비동기 함수 (콜백 기반)
     * - chrome.storage.sync를 사용하므로 확장 프로그램 간 동기화 지원
     * - chrome.storage가 없으면 조용히 실패 (로그만 출력)
     */
    _loadFromStorage() {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            console.log('ℹ️ [ConfigManager] Chrome Storage API 없음, localStorage만 사용');
            this._initialized = true;
            return;
        }

        const storageKey = this.getStorageKey();

        chrome.storage.sync.get(storageKey, (result) => {
            if (chrome.runtime.lastError) {
                console.warn('⚠️ [ConfigManager] Chrome Storage 로드 오류:',
                    chrome.runtime.lastError.message);
                this._initialized = true;
                return;
            }

            const saved = result[storageKey];

            if (saved && typeof saved === 'object') {
                // 저장된 값을 캐시에 병합 (기본값 보존하며 덮어쓰기)
                for (const [key, value] of Object.entries(saved)) {
                    if (key in this.DEFAULTS) {
                        this._cache[key] = value;
                    }
                }

                // localStorage 캐시도 업데이트
                this._saveToCache();

                console.log('✅ [ConfigManager] Chrome Storage에서 설정 로드 성공');
            } else {
                console.log('📭 [ConfigManager] Chrome Storage에 저장된 설정 없음, 기본값 사용');
            }

            this._initialized = true;
        });
    }

    /**
     * _saveToStorage() - chrome.storage.sync에 설정 저장
     * 
     * [호출 관계]
     * set() ──> _saveToStorage()
     * reset() ──> _saveToStorage()
     * 
     * [주의사항]
     * - 쓰기 제한(Cooldown) 적용: _STORAGE_COOLDOWN (500ms) 내 중복 저장 방지
     * - cooldown 중이면 저장을 건너뛰지만, localStorage 캐시는 이미 업데이트됨
     * - chrome.storage가 없으면 조용히 실패
     */
    _saveToStorage() {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
            return; // Chrome Storage API 없으면 조용히 리턴
        }

        const now = Date.now();

        // 쓰기 제한 확인 (너무 빈번한 저장 방지)
        if (now - this._lastStorageWrite < this._STORAGE_COOLDOWN) {
            console.log('⏳ [ConfigManager] Storage 쓰기 제한, 저장 건너뜀');
            return;
        }

        this._lastStorageWrite = now;
        const storageKey = this.getStorageKey();

        // chrome.storage.sync에 저장
        const data = {};
        data[storageKey] = { ...this._cache };

        chrome.storage.sync.set(data, () => {
            if (chrome.runtime.lastError) {
                console.warn('⚠️ [ConfigManager] Chrome Storage 저장 오류:',
                    chrome.runtime.lastError.message);
            } else {
                console.log('✅ [ConfigManager] Chrome Storage에 설정 저장 완료');
            }
        });
    }

    /**
     * _emitChange(key, value) - onChange 리스너 호출
     * 
     * [호출 관계]
     * set() ──> _emitChange(key, value)
     * setMultiple() ──> _emitChange(key, value) [각 키마다]
     * reset() ──> _emitChange(key, value) [모든 키]
     * 
     * [동작 방식]
     * 1. 특정 키의 리스너 호출
     * 2. '*' (와일드카드) 리스너 호출
     * 
     * [주의사항]
     * - try-catch로 각 리스너를 감싸서 예외가 전파되지 않도록 함
     * - 하나의 리스너에서 에러가 발생해도 다른 리스너는 정상 작동
     */
    _emitChange(key, value) {
        // 1. 특정 키의 리스너 호출
        if (this._changeListeners[key]) {
            this._changeListeners[key].forEach(callback => {
                try {
                    callback(value, key);
                } catch (e) {
                    console.error(`❌ [ConfigManager] onChange 리스너 오류 ('${key}'):`, e);
                }
            });
        }

        // 2. 와일드카드 리스너 호출 (모든 변경 감시)
        if (this._changeListeners['*']) {
            this._changeListeners['*'].forEach(callback => {
                try {
                    callback(key, value);
                } catch (e) {
                    console.error('❌ [ConfigManager] onChange 와일드카드 리스너 오류:', e);
                }
            });
        }
    }
}

// ====================================================================
// 전역 등록
// ====================================================================
// 이 프로젝트는 ES modules를 사용하지 않으므로 window 전역에 할당
// 다른 모듈들(StateManager, ElementAnalyzer 등)과 동일한 방식
window.ConfigManager = new ConfigManager();

console.log('✅ [ConfigManager] 전역 등록 완료: window.ConfigManager');
