/**
 * State Manager v2.0 - Централизованное управление состоянием приложения
 * Поддержка новой структуры данных с блоками и ролями
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
     * @returns {Object} - Начальное состояние
     */
    getInitialState() {
        return {
            version: "2.0",
            
            // Основное дерево блоков
            blocks: [],
            
            // Роли с ссылками на блоки
            roles: {
                manager: {
                    id: 'manager',
                    name: 'Руководитель',
                    icon: '👔',
                    isDefault: true,
                    references: [],
                    createdAt: Date.now()
                },
                employee: {
                    id: 'employee', 
                    name: 'Сотрудник',
                    icon: '👤',
                    isDefault: true,
                    references: [],
                    createdAt: Date.now()
                },
                intern: {
                    id: 'intern',
                    name: 'Стажер', 
                    icon: '🎓',
                    isDefault: true,
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
                theme: 'dark',               // Темная тема по умолчанию
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
                this.setDirectPath(path, value);
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
     * Установить данные для текущей вкладки
     * @param {string} subPath - Подпуть внутри текущей вкладки
     * @param {*} value - Новое значение
     */
    setCurrentTabData(subPath, value) {
        const activeTab = this.get('ui.activeTab');
        
        if (activeTab === 'main') {
            // В основном дереве обновляем блоки
            if (subPath === 'items' || subPath === '') {
                this.setDirectPath('blocks', value);
            } else {
                this.setDirectPath(`blocks.${subPath}`, value);
            }
        } else {
            // В ролях обновляем ссылки
            if (subPath === 'items' || subPath === '') {
                this.setDirectPath(`roles.${activeTab}.references`, value);
            } else {
                this.setDirectPath(`roles.${activeTab}.${subPath}`, value);
            }
        }
    }

    /**
     * Установить значение по прямому пути
     * @param {string} path - Путь к значению
     * @param {*} value - Новое значение
     */
    setDirectPath(path, value) {
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
        
        this.events.emit('block:updated', { id: blockId, updates });
        return this;
    }

    /**
     * Удалить блок и все ссылки на него
     * @param {string} blockId - ID блока
     * @returns {StateManager}
     */
    deleteBlock(blockId) {
        const block = this.get('blocks').find(b => b.id === blockId);
        if (!block) return this;
        
        // Удалить блок
        this.update('blocks', blocks => blocks.filter(b => b.id !== blockId));
        
        // Удалить все ссылки на этот блок из всех ролей
        const roles = this.get('roles');
        Object.keys(roles).forEach(roleId => {
            this.update(`roles.${roleId}.references`, refs =>
                refs.filter(ref => ref.blockId !== blockId)
            );
        });
        
        // Удалить связи
        this.update('connections', connections =>
            connections.filter(conn => 
                conn.from !== blockId && conn.to !== blockId
            )
        );
        
        this.events.emit('block:deleted', { blockId, block });
        return this;
    }

    /**
     * Создать ссылку на блок в роли
     * @param {string} roleId - ID роли
     * @param {string} blockId - ID блока
     * @param {Object} position - Позиция ссылки
     * @returns {Object} - Созданная ссылка
     */
    createReference(roleId, blockId, position) {
        const reference = {
            id: this.generateId(),
            blockId: blockId,
            position: position || { x: 100, y: 100 },
            createdAt: Date.now()
        };
        
        this.update(`roles.${roleId}.references`, refs => [...refs, reference]);
        
        this.events.emit('reference:created', { roleId, blockId, reference });
        return reference;
    }

    /**
     * Обновить позицию ссылки
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     * @param {Object} position - Новая позиция
     * @returns {StateManager}
     */
    updateReference(roleId, referenceId, position) {
        this.update(`roles.${roleId}.references`, refs =>
            refs.map(ref =>
                ref.id === referenceId
                    ? { ...ref, position }
                    : ref
            )
        );
        
        this.events.emit('reference:updated', { roleId, referenceId, position });
        return this;
    }

    /**
     * Удалить ссылку из роли
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     * @returns {StateManager}
     */
    deleteReference(roleId, referenceId) {
        const references = this.get(`roles.${roleId}.references`);
        const reference = references.find(ref => ref.id === referenceId);
        
        this.update(`roles.${roleId}.references`, refs =>
            refs.filter(ref => ref.id !== referenceId)
        );
        
        this.events.emit('reference:deleted', { roleId, referenceId, reference });
        return this;
    }

    /**
     * Создать новую роль
     * @param {Object} roleData - Данные роли
     * @returns {Object} - Созданная роль
     */
    createRole(roleData) {
        const roleId = roleData.id || this.generateId();
        const role = {
            id: roleId,
            name: roleData.name,
            icon: roleData.icon || '👤',
            isDefault: false,
            references: [],
            createdAt: Date.now()
        };
        
        this.set(`roles.${roleId}`, role);
        
        this.events.emit('role:created', { roleId, role });
        return role;
    }

    /**
     * Удалить роль (только пользовательские)
     * @param {string} roleId - ID роли
     * @returns {StateManager}
     */
    deleteRole(roleId) {
        const role = this.get(`roles.${roleId}`);
        if (!role || role.isDefault) {
            console.warn(`Cannot delete role: ${roleId}`);
            return this;
        }
        
        // Переключиться на основное дерево если удаляем активную роль
        if (this.get('ui.activeTab') === roleId) {
            this.set('ui.activeTab', 'main');
        }
        
        // Удалить роль
        const roles = { ...this.get('roles') };
        delete roles[roleId];
        this.set('roles', roles);
        
        this.events.emit('role:deleted', { roleId, role });
        return this;
    }

    /**
     * Переключить активную вкладку
     * @param {string} tabId - ID вкладки ('main' или roleId)
     * @returns {StateManager}
     */
    switchTab(tabId) {
        const oldTab = this.get('ui.activeTab');
        this.set('ui.activeTab', tabId);
        
        this.events.emit('tab:switched', { from: oldTab, to: tabId });
        return this;
    }

    /**
     * Генерация уникального ID
     * @returns {string} - Уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Получить статистику состояния v2.0
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        const blocks = this.get('blocks');
        const roles = this.get('roles');
        const connections = this.get('connections');
        
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );
        
        return {
            version: this.version,
            historySize: this.history.length,
            maxHistorySize: this.maxHistorySize,
            stateSize: JSON.stringify(this.state).length,
            debugMode: this.debugMode,
            blocks: {
                total: blocks.length,
                withTags: blocks.filter(b => b.tags?.length > 0).length,
                totalCharacters: blocks.reduce((sum, b) => sum + (b.content?.length || 0), 0)
            },
            roles: {
                total: Object.keys(roles).length,
                default: Object.values(roles).filter(r => r.isDefault).length,
                custom: Object.values(roles).filter(r => !r.isDefault).length,
                totalReferences
            },
            connections: {
                total: connections.length
            }
        };
    }

    // Унаследованные методы из оригинального StateManager
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

    clearHistory() {
        this.history = [];
        return this;
    }

    reset() {
        this.state = this.getInitialState();
        this.clearHistory();
        
        this.events.emit('state:reset');
        return this;
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    setState(newState) {
        this.saveToHistory();
        this.state = JSON.parse(JSON.stringify(newState));
        
        this.events.emit('state:replaced', { newState });
        return this;
    }

    setDebug(enabled = true) {
        this.debugMode = enabled;
        this.set('settings.debugMode', enabled);
        console.log(`🐛 State manager debug mode: ${enabled ? 'ON' : 'OFF'}`);
        return this;
    }

    watch(path, callback) {
        const handler = (data) => {
            if (data.path === path || data.path.startsWith(path + '.')) {
                callback(data.value, data.oldValue, data.path);
            }
        };
        
        this.events.on('state:change', handler);
        
        return () => this.events.off('state:change', handler);
    }
}