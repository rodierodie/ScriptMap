/**
 * Event System - Централизованная система событий для связи между модулями
 */
export class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.debugMode = false;
    }

    /**
     * Подписка на событие
     * @param {string} event - Название события
     * @param {function} callback - Функция-обработчик
     * @returns {EventSystem} - Возвращает this для цепочки вызовов
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push(callback);
        
        if (this.debugMode) {
            console.log(`📧 Event listener added: ${event}`);
        }
        
        return this;
    }

    /**
     * Отправка события
     * @param {string} event - Название события
     * @param {*} data - Данные для передачи
     * @returns {EventSystem} - Возвращает this для цепочки вызовов
     */
    emit(event, data = null) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            
            if (this.debugMode) {
                console.log(`🚀 Event emitted: ${event}`, data);
                console.log(`📞 Calling ${callbacks.length} listeners`);
            }
            
            callbacks.forEach((callback, index) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event listener ${index} for event "${event}":`, error);
                }
            });
        } else if (this.debugMode) {
            console.log(`👻 No listeners for event: ${event}`);
        }
        
        return this;
    }

    /**
     * Отписка от события
     * @param {string} event - Название события
     * @param {function} callback - Функция-обработчик для удаления
     * @returns {EventSystem} - Возвращает this для цепочки вызовов
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            
            if (index > -1) {
                callbacks.splice(index, 1);
                
                if (this.debugMode) {
                    console.log(`🗑️ Event listener removed: ${event}`);
                }
                
                // Удалить массив если он пустой
                if (callbacks.length === 0) {
                    this.listeners.delete(event);
                }
            }
        }
        
        return this;
    }

    /**
     * Одноразовая подписка на событие
     * @param {string} event - Название события
     * @param {function} callback - Функция-обработчик
     * @returns {EventSystem} - Возвращает this для цепочки вызовов
     */
    once(event, callback) {
        const onceWrapper = (data) => {
            callback(data);
            this.off(event, onceWrapper);
        };
        
        return this.on(event, onceWrapper);
    }

    /**
     * Получить список всех событий
     * @returns {Array} - Массив названий событий
     */
    getEvents() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Получить количество слушателей для события
     * @param {string} event - Название события
     * @returns {number} - Количество слушателей
     */
    getListenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }

    /**
     * Очистить все слушатели
     * @param {string} [event] - Название события для очистки (опционально)
     * @returns {EventSystem} - Возвращает this для цепочки вызовов
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
            if (this.debugMode) {
                console.log(`🧹 Cleared listeners for event: ${event}`);
            }
        } else {
            this.listeners.clear();
            if (this.debugMode) {
                console.log('🧹 Cleared all event listeners');
            }
        }
        
        return this;
    }

    /**
     * Включить/выключить режим отладки
     * @param {boolean} enabled - Включить отладку
     * @returns {EventSystem} - Возвращает this для цепочки вызовов
     */
    setDebug(enabled = true) {
        this.debugMode = enabled;
        console.log(`🐛 Event system debug mode: ${enabled ? 'ON' : 'OFF'}`);
        return this;
    }

    /**
     * Статистика системы событий
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        const events = this.getEvents();
        const totalListeners = events.reduce((sum, event) => sum + this.getListenerCount(event), 0);
        
        return {
            totalEvents: events.length,
            totalListeners,
            events: events.map(event => ({
                name: event,
                listeners: this.getListenerCount(event)
            }))
        };
    }
}