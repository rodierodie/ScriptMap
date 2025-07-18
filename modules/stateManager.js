/**
 * State Manager - Централизованное управление состоянием приложения
 */
export class StateManager {
    constructor(events) {
        this.events = events;
        this.state = this.getInitialState();
        this.history = [];
        this.maxHistorySize = 50;
        this.debugMode = false;
    }

    /**
     * Получить начальное состояние приложения
     * @returns {Object} - Начальное состояние
     */
    getInitialState() {
        return {
            notes: [],
            connections: [],
            canvas: {
                transform: { x: 0, y: 0 },
                isDragging: false,
                isPanning: false,
                zoom: 1
            },
            ui: {
                instructionsVisible: false,
                theme: 'light'
            },
            interaction: {
                isSpacePressed: false,
                dragNote: null,
                dragOffset: { x: 0, y: 0 },
                panStart: { x: 0, y: 0 }
            },
            settings: {
                autoSave: true,
                debugMode: false
            }
        };
    }

    /**
     * Получить значение по пути
     * @param {string} path - Путь к значению (например, 'canvas.transform.x')
     * @returns {*} - Значение по пути
     */
    get(path) {
        if (!path) return this.state;
        
        try {
            return path.split('.').reduce((obj, key) => {
                if (obj === null || obj === undefined) return undefined;
                return obj[key];
            }, this.state);
        } catch (error) {
            console.error(`❌ Error getting state path "${path}":`, error);
            return undefined;
        }
    }

    /**
     * Установить значение по пути
     * @param {string} path - Путь к значению
     * @param {*} value - Новое значение
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    set(path, value) {
        const oldValue = this.get(path);
        
        // Создать снимок состояния для истории
        this.saveToHistory();
        
        try {
            if (!path) {
                this.state = value;
            } else {
                const keys = path.split('.');
                const lastKey = keys.pop();
                
                // Создать вложенные объекты если их нет
                const target = keys.reduce((obj, key) => {
                    if (!obj[key] || typeof obj[key] !== 'object') {
                        obj[key] = {};
                    }
                    return obj[key];
                }, this.state);
                
                target[lastKey] = value;
            }
            
            if (this.debugMode) {
                console.log(`📝 State updated: ${path}`, { oldValue, newValue: value });
            }
            
            // Отправить событие об изменении состояния
            this.events.emit('state:change', { 
                path, 
                value, 
                oldValue,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ Error setting state path "${path}":`, error);
        }
        
        return this;
    }

    /**
     * Обновить значение с помощью функции
     * @param {string} path - Путь к значению
     * @param {function} updater - Функция обновления (currentValue) => newValue
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    update(path, updater) {
        if (typeof updater !== 'function') {
            throw new Error('Updater must be a function');
        }
        
        try {
            const currentValue = this.get(path);
            const newValue = updater(currentValue);
            this.set(path, newValue);
        } catch (error) {
            console.error(`❌ Error updating state path "${path}":`, error);
        }
        
        return this;
    }

    /**
     * Сохранить текущее состояние в историю
     */
    saveToHistory() {
        const snapshot = JSON.parse(JSON.stringify(this.state));
        this.history.push({
            state: snapshot,
            timestamp: Date.now()
        });
        
        // Ограничить размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Откатить состояние назад
     * @param {number} steps - Количество шагов назад (по умолчанию 1)
     * @returns {boolean} - Успешность операции
     */
    undo(steps = 1) {
        if (this.history.length < steps) {
            console.warn('⚠️ Not enough history to undo');
            return false;
        }
        
        // Удалить последние состояния
        for (let i = 0; i < steps; i++) {
            this.history.pop();
        }
        
        // Восстановить предыдущее состояние
        if (this.history.length > 0) {
            const snapshot = this.history[this.history.length - 1];
            this.state = JSON.parse(JSON.stringify(snapshot.state));
            
            this.events.emit('state:restored', {
                timestamp: snapshot.timestamp,
                steps
            });
            
            if (this.debugMode) {
                console.log(`↶ State restored (${steps} steps back)`);
            }
            
            return true;
        } else {
            // Восстановить начальное состояние
            this.state = this.getInitialState();
            this.events.emit('state:reset');
            
            if (this.debugMode) {
                console.log('🔄 State reset to initial');
            }
            
            return true;
        }
    }

    /**
     * Очистить историю состояний
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    clearHistory() {
        this.history = [];
        if (this.debugMode) {
            console.log('🧹 State history cleared');
        }
        return this;
    }

    /**
     * Сбросить состояние к начальному
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    reset() {
        this.state = this.getInitialState();
        this.clearHistory();
        
        this.events.emit('state:reset');
        
        if (this.debugMode) {
            console.log('🔄 State reset to initial');
        }
        
        return this;
    }

    /**
     * Получить копию всего состояния
     * @returns {Object} - Глубокая копия состояния
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Установить полное состояние
     * @param {Object} newState - Новое состояние
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    setState(newState) {
        this.saveToHistory();
        this.state = JSON.parse(JSON.stringify(newState));
        
        this.events.emit('state:replaced', { newState });
        
        if (this.debugMode) {
            console.log('🔄 Full state replaced');
        }
        
        return this;
    }

    /**
     * Включить/выключить режим отладки
     * @param {boolean} enabled - Включить отладку
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    setDebug(enabled = true) {
        this.debugMode = enabled;
        this.set('settings.debugMode', enabled);
        console.log(`🐛 State manager debug mode: ${enabled ? 'ON' : 'OFF'}`);
        return this;
    }

    /**
     * Подписаться на изменения определенного пути
     * @param {string} path - Путь для отслеживания
     * @param {function} callback - Функция-обработчик
     * @returns {function} - Функция для отписки
     */
    watch(path, callback) {
        const handler = (data) => {
            if (data.path === path || data.path.startsWith(path + '.')) {
                callback(data.value, data.oldValue, data.path);
            }
        };
        
        this.events.on('state:change', handler);
        
        // Возвращаем функцию отписки
        return () => this.events.off('state:change', handler);
    }

    /**
     * Статистика менеджера состояния
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        return {
            historySize: this.history.length,
            maxHistorySize: this.maxHistorySize,
            stateSize: JSON.stringify(this.state).length,
            debugMode: this.debugMode
        };
    }
}