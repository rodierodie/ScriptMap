/**
 * State Manager v2.0 - Централизованное управление состоянием приложения
 * Поддержка новой структуры данных с блоками и ролями
 * FIXED: Добавлено событие state:replaced при полной замене состояния
 * ИЗМЕНЕНО: Темная тема по умолчанию
 */
export class StateManager {
    constructor(events) {
        this.events = events;
        this.state = this.getInitialState();
        this.history = [];
        this.maxHistorySize = 50;
        this.debugMode = false;
        this.version = "2.0";
    }

    /**
     * Получить начальное состояние приложения v2.0
     * ИЗМЕНЕНО: Темная тема по умолчанию
     * @returns {Object} - Начальное состояние
     */
    getInitialState() {
        return {
            version: "2.0",
            
            // Основное дерево блоков
            blocks: [],
            
            // Роли с ссылками на блоки (убран флаг isDefault)
            roles: {
                manager: {
                    id: 'manager',
                    name: 'Руководитель',
                    icon: '👔',
                    references: [],
                    createdAt: Date.now()
                },
                employee: {
                    id: 'employee', 
                    name: 'Сотрудник',
                    icon: '👤',
                    references: [],
                    createdAt: Date.now()
                },
                intern: {
                    id: 'intern',
                    name: 'Стажер', 
                    icon: '🎓',
                    references: [],
                    createdAt: Date.now()
                }
            },
            
            // Связи между блоками (не ссылками!)
            connections: [],
            
            // Состояние холста (общее для всех вкладок)
            canvas: {
                transform: { x: 0, y: 0 },
                isDragging: false,
                isPanning: false,
                zoom: 1
            },
            
            // Состояние UI
            ui: {
                activeTab: 'main',           // main | roleId
                instructionsVisible: false,
                theme: 'dark',               // ИЗМЕНЕНО: темная тема по умолчанию
                paletteOpen: false
            },
            
            // Состояние взаимодействий
            interaction: {
                isSpacePressed: false,
                dragItem: null,              // { type: 'block'|'reference', id: string, roleId?: string }
                dragOffset: { x: 0, y: 0 },
                panStart: { x: 0, y: 0 }
            },
            
            // Настройки приложения
            settings: {
                autoSave: true,
                debugMode: false,
                version: "2.0"
            }
        };
    }

    /**
     * Получить значение по пути с поддержкой контекста вкладок
     * @param {string} path - Путь к значению
     * @returns {*} - Значение по пути
     */
    get(path) {
        if (!path) return this.state;
        
        try {
            // Специальная обработка для контекстных путей
            if (path.startsWith('current.')) {
                return this.getCurrentTabData(path.substring(8));
            }
            
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
     * Получить данные текущей вкладки
     * @param {string} subPath - Подпуть внутри текущей вкладки
     * @returns {*} - Данные текущей вкладки
     */
    getCurrentTabData(subPath = '') {
        const activeTab = this.get('ui.activeTab');
        
        if (activeTab === 'main') {
            // В основном дереве работаем с блоками
            if (subPath === 'items' || subPath === '') {
                return this.get('blocks');
            }
            return this.get(`blocks.${subPath}`);
        } else {
            // В ролях работаем со ссылками
            const role = this.get(`roles.${activeTab}`);
            if (!role) return undefined;
            
            if (subPath === 'items' || subPath === '') {
                // Возвращаем ссылки с данными блоков
                return this.resolveReferences(role.references);
            }
            return role[subPath];
        }
    }

    /**
     * Разрешить ссылки - получить данные блоков для ссылок
     * @param {Array} references - Массив ссылок
     * @returns {Array} - Массив объектов с данными блоков и позициями ссылок
     */
    resolveReferences(references) {
        const blocks = this.get('blocks');
        
        return references.map(ref => {
            const block = blocks.find(b => b.id === ref.blockId);
            if (!block) {
                console.warn(`⚠️ Reference to missing block: ${ref.blockId}`);
                return null;
            }
            
            return {
                ...block,
                // Добавляем метаданные ссылки
                _reference: {
                    id: ref.id,
                    position: ref.position,
                    createdAt: ref.createdAt,
                    isReference: true
                },
                // Переопределяем позицию позицией ссылки
                position: ref.position
            };
        }).filter(Boolean);
    }

    /**
     * Установить значение с поддержкой контекста вкладок
     * @param {string} path - Путь к значению
     * @param {*} value - Новое значение
     * @returns {StateManager} - Возвращает this для цепочки вызовов
     */
    set(path, value) {
        const oldValue = this.get(path);
        
        // Создать снимок состояния для истории
        this.saveToHistory();
        
        try {
            // Специальная обработка для контекстных путей
            if (path.startsWith('current.')) {
                this.setCurrentTabData(path.substring(8), value);
            } else {
                this.setNestedValue(path, value);
            }
            
            // Эмитировать событие изменения
            this.events.emit('state:change', {
                path,
                value,
                oldValue,
                timestamp: Date.now()
            });
            
            if (this.debugMode) {
                console.log(`🔄 State changed: ${path} =`, value);
            }
            
        } catch (error) {
            console.error(`❌ Error setting state path "${path}":`, error);
        }
        
        return this;
    }

    /**
     * Установить данные для текущей вкладки
     * @param {string} subPath - Подпуть внутри текущей вкладки
     * @param {*} value - Новое значение
     */
    setCurrentTabData(subPath, value) {
        const activeTab = this.get('ui.activeTab');
        
        if (activeTab === 'main') {
            // В основном дереве работаем с блоками
            if (subPath === 'items' || subPath === '') {
                this.setNestedValue('blocks', value);
            } else {
                this.setNestedValue(`blocks.${subPath}`, value);
            }
        } else {
            // В ролях работаем со ссылками
            if (subPath === 'items' || subPath === '') {
                this.setNestedValue(`roles.${activeTab}.references`, value);
            } else {
                this.setNestedValue(`roles.${activeTab}.${subPath}`, value);
            }
        }
    }

    /**
     * Установить вложенное значение по пути
     * @param {string} path - Путь к значению (разделенный точками)
     * @param {*} value - Новое значение
     */
    setNestedValue(path, value) {
        if (!path) {
            this.state = value;
            return;
        }
        
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

    /**
     * Создать новый блок (только в основном дереве)
     * @param {Object} blockData - Данные блока
     * @returns {Object} - Созданный блок
     */
    createBlock(blockData) {
        const block = {
            id: this.generateId(),
            title: blockData.title || 'Новый блок',
            content: blockData.content || '',
            tags: blockData.tags || [],
            position: blockData.position || { x: 100, y: 100 },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.update('blocks', blocks => [...blocks, block]);
        
        this.events.emit('block:created', block);
        return block;
    }

    /**
     * Обновить блок (обновления распространяются на все ссылки)
     * @param {string} blockId - ID блока
     * @param {Object} updates - Обновления
     * @returns {StateManager}
     */
    updateBlock(blockId, updates) {
        this.update('blocks', blocks =>
            blocks.map(block =>
                block.id === blockId 
                    ? { ...block, ...updates, updatedAt: Date.now() }
                    : block
            )
        );
        
        this.events.emit('block:updated', { blockId, updates });
        return this;
    }

    /**
     * Удалить блок (и все ссылки на него)
     * @param {string} blockId - ID блока для удаления
     * @returns {StateManager}
     */
    deleteBlock(blockId) {
        // Удалить блок из основного дерева
        this.update('blocks', blocks => blocks.filter(block => block.id !== blockId));
        
        // Удалить все ссылки на этот блок из всех ролей
        const roles = this.get('roles');
        Object.keys(roles).forEach(roleId => {
            this.update(`roles.${roleId}.references`, references =>
                references.filter(ref => ref.blockId !== blockId)
            );
        });
        
        // Удалить все связи с этим блоком
        this.update('connections', connections =>
            connections.filter(conn => 
                conn.fromBlockId !== blockId && conn.toBlockId !== blockId
            )
        );
        
        this.events.emit('block:deleted', { blockId });
        return this;
    }

    /**
     * Создать новую роль
     * @param {Object} roleData - Данные роли
     * @returns {Object} - Созданная роль
     */
    createRole(roleData) {
        const role = {
            id: roleData.id || this.generateId(),
            name: roleData.name || 'Новая роль',
            icon: roleData.icon || '👤',
            references: [],
            createdAt: Date.now()
        };
        
        this.set(`roles.${role.id}`, role);
        
        this.events.emit('role:created', role);
        return role;
    }

    /**
     * Обновить роль
     * @param {string} roleId - ID роли
     * @param {Object} updates - Обновления
     * @returns {StateManager}
     */
    updateRole(roleId, updates) {
        const role = this.get(`roles.${roleId}`);
        if (role) {
            this.set(`roles.${roleId}`, { ...role, ...updates });
            this.events.emit('role:updated', { roleId, updates });
        }
        return this;
    }

    /**
     * Удалить роль
     * @param {string} roleId - ID роли для удаления
     * @returns {StateManager}
     */
    deleteRole(roleId) {
        const role = this.get(`roles.${roleId}`);
        if (!role) return this;
        
        // Удалить роль
        this.update('roles', roles => {
            const newRoles = { ...roles };
            delete newRoles[roleId];
            return newRoles;
        });
        
        // Если удаляемая роль была активной, переключиться на основное дерево
        if (this.get('ui.activeTab') === roleId) {
            this.set('ui.activeTab', 'main');
        }
        
        this.events.emit('role:deleted', { roleId, role });
        return this;
    }

    /**
     * Создать ссылку на блок в роли
     * @param {string} roleId - ID роли
     * @param {string} blockId - ID блока
     * @param {Object} position - Позиция ссылки {x, y}
     * @returns {Object} - Созданная ссылка
     */
    createReference(roleId, blockId, position) {
        const reference = {
            id: this.generateId(),
            blockId,
            position: position || { x: 100, y: 100 },
            createdAt: Date.now()
        };
        
        this.update(`roles.${roleId}.references`, references => [...references, reference]);
        
        this.events.emit('reference:created', { roleId, blockId, reference });
        return reference;
    }

    /**
     * Обновить ссылку
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     * @param {Object} updates - Обновления
     * @returns {StateManager}
     */
    updateReference(roleId, referenceId, updates) {
        this.update(`roles.${roleId}.references`, references =>
            references.map(ref =>
                ref.id === referenceId ? { ...ref, ...updates } : ref
            )
        );
        
        this.events.emit('reference:updated', { roleId, referenceId, updates });
        return this;
    }

    /**
     * Удалить ссылку
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     * @returns {StateManager}
     */
    deleteReference(roleId, referenceId) {
        this.update(`roles.${roleId}.references`, references =>
            references.filter(ref => ref.id !== referenceId)
        );
        
        this.events.emit('reference:deleted', { roleId, referenceId });
        return this;
    }

    /**
     * Создать связь между блоками
     * @param {string} fromBlockId - ID исходного блока
     * @param {string} toBlockId - ID целевого блока
     * @returns {Object} - Созданная связь
     */
    createConnection(fromBlockId, toBlockId) {
        const connection = {
            id: this.generateId(),
            fromBlockId,
            toBlockId,
            createdAt: Date.now()
        };
        
        this.update('connections', connections => [...connections, connection]);
        
        this.events.emit('connection:created', connection);
        return connection;
    }

    /**
     * Удалить связь
     * @param {string} connectionId - ID связи
     * @returns {StateManager}
     */
    deleteConnection(connectionId) {
        this.update('connections', connections =>
            connections.filter(conn => conn.id !== connectionId)
        );
        
        this.events.emit('connection:deleted', { connectionId });
        return this;
    }

    /**
     * Генерировать уникальный ID
     * @returns {string} - Уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Обновить значение по пути с помощью функции
     * @param {string} path - Путь к значению
     * @param {Function} updater - Функция обновления
     * @returns {StateManager}
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
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Отменить изменения
     * @param {number} steps - Количество шагов назад
     * @returns {boolean} - Успешно ли выполнена операция
     */
    undo(steps = 1) {
        if (this.history.length < steps) {
            console.warn('⚠️ Not enough history to undo');
            return false;
        }
        
        for (let i = 0; i < steps; i++) {
            this.history.pop();
        }
        
        if (this.history.length > 0) {
            const snapshot = this.history[this.history.length - 1];
            this.state = JSON.parse(JSON.stringify(snapshot.state));
            
            this.events.emit('state:restored', {
                timestamp: snapshot.timestamp,
                steps
            });
            
            return true;
        } else {
            this.state = this.getInitialState();
            this.events.emit('state:reset');
            return true;
        }
    }

    /**
     * Очистить историю изменений
     * @returns {StateManager}
     */
    clearHistory() {
        this.history = [];
        return this;
    }

    /**
     * Сброс состояния к начальному
     * @returns {StateManager}
     */
    reset() {
        this.state = this.getInitialState();
        this.clearHistory();
        
        this.events.emit('state:reset');
        return this;
    }

    /**
     * Получить копию текущего состояния
     * @returns {Object} - Копия состояния
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Установить новое состояние (полная замена)
     * ИСПРАВЛЕНИЕ: Добавлено событие state:replaced для уведомления модулей
     * @param {Object} newState - Новое состояние
     * @returns {StateManager}
     */
    setState(newState) {
        this.saveToHistory();
        this.state = JSON.parse(JSON.stringify(newState));
        
        // ИСПРАВЛЕНИЕ: Эмитировать событие о полной замене состояния
        this.events.emit('state:replaced', { 
            newState: this.state,
            timestamp: Date.now()
        });
        
        console.log('🔄 State completely replaced');
        
        return this;
    }

    /**
     * Включить/выключить режим отладки
     * @param {boolean} enabled - Включить отладку
     * @returns {StateManager}
     */
    setDebug(enabled = true) {
        this.debugMode = enabled;
        this.set('settings.debugMode', enabled);
        console.log(`🐛 State manager debug mode: ${enabled ? 'ON' : 'OFF'}`);
        return this;
    }

    /**
     * Отслеживать изменения по пути
     * @param {string} path - Путь для отслеживания
     * @param {Function} callback - Функция обратного вызова
     * @returns {Function} - Функция отписки
     */
    watch(path, callback) {
        const handler = (data) => {
            if (data.path === path || data.path.startsWith(path + '.')) {
                callback(data.value, data.oldValue, data.path);
            }
        };
        
        this.events.on('state:change', handler);
        
        return () => this.events.off('state:change', handler);
    }

    /**
     * Получить статистику состояния
     * @returns {Object} - Статистика
     */
    getStats() {
        const blocks = this.get('blocks') || [];
        const roles = this.get('roles') || {};
        const connections = this.get('connections') || [];
        
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );
        
        return {
            version: this.version,
            historySize: this.history.length,
            maxHistorySize: this.maxHistorySize,
            stateSize: JSON.stringify(this.state).length,
            debugMode: this.debugMode,
            currentTheme: this.get('ui.theme') || 'dark', // ДОБАВЛЕНО
            blocks: {
                total: blocks.length,
                withTags: blocks.filter(b => b.tags?.length > 0).length,
                totalCharacters: blocks.reduce((sum, b) => sum + (b.content?.length || 0), 0)
            },
            roles: {
                total: Object.keys(roles).length,
                totalReferences
            },
            connections: {
                total: connections.length
            }
        };
    }
}