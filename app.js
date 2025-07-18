/**
 * Notes App - Главный класс приложения с поддержкой связей
 */

// Импорт модулей
import { EventSystem } from './modules/eventSystem.js';
import { StateManager } from './modules/stateManager.js';
import { CanvasModule } from './modules/canvasModule.js';
import { NotesModule } from './modules/notesModule.js';
import { UIModule } from './modules/uiModule.js';
import { ConnectionsModule } from './modules/connectionsModule.js';

/**
 * Главный класс приложения
 */
class NotesApp {
    constructor() {
        // Инициализация основных систем
        this.events = new EventSystem();
        this.state = new StateManager(this.events);
        
        // Инициализация модулей
        this.modules = {};
        this.startTime = Date.now();
        
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            console.log('🚀 Initializing Notes App with Connections...');
            
            // Загрузка модулей
            await this.loadModules();
            
            // Настройка глобальных обработчиков
            this.setupGlobalHandlers();
            
            // Восстановление состояния
            this.restoreState();
            
            // Создание начального содержимого
            this.createInitialContent();
            
            // Экспорт в глобальную область для отладки
            this.exposeToGlobal();
            
            console.log('✅ Notes App with Connections initialized successfully');
            console.log('📦 Available modules:', Object.keys(this.modules));
            console.log('🔗 Try: Ctrl+C to create connections between notes');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Загрузка и инициализация модулей
     */
    async loadModules() {
        const moduleDefinitions = [
            { name: 'canvas', Class: CanvasModule },
            { name: 'notes', Class: NotesModule },
            { name: 'ui', Class: UIModule },
            { name: 'connections', Class: ConnectionsModule }
        ];

        for (const { name, Class } of moduleDefinitions) {
            try {
                this.modules[name] = new Class(this.state, this.events);
                console.log(`✅ ${name} module loaded`);
            } catch (error) {
                console.error(`❌ Failed to load ${name} module:`, error);
                throw new Error(`Module loading failed: ${name}`);
            }
        }
    }

    /**
     * Настройка глобальных обработчиков
     */
    setupGlobalHandlers() {
        // Обработка ошибок
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.events.emit('app:error', { error: e.error, message: e.message });
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.events.emit('app:resize', {
                width: window.innerWidth,
                height: window.innerHeight
            });
        });

        // Обработка видимости страницы
        document.addEventListener('visibilitychange', () => {
            this.events.emit('app:visibility-change', {
                hidden: document.hidden
            });
        });

        // Автосохранение
        this.setupAutoSave();

        // Уведомления о статистике
        this.setupStatsUpdater();

        // Связь UI модуля с уведомлениями модуля связей
        this.setupConnectionsUI();
    }

    /**
     * Настройка UI для модуля связей
     */
    setupConnectionsUI() {
        // Перенаправляем уведомления от модуля связей в UI модуль
        this.events.on('ui:show-notification', (data) => {
            if (this.modules.ui) {
                this.modules.ui.showNotification(data.message, data.type, data.duration);
            }
        });

        // Добавляем горячие клавиши для связей
        document.addEventListener('keydown', (e) => {
            // Не обрабатывать если открыто модальное окно
            if (document.getElementById('noteModal')) return;
            
            // Показать статистику связей по Ctrl+Shift+S
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.showConnectionsStats();
            }
        });
    }

    /**
     * Показать статистику связей
     */
    showConnectionsStats() {
        if (this.modules.connections) {
            const stats = this.modules.connections.getStats();
            const message = [
                `🔗 Статистика связей:`,
                ``,
                `📊 Всего связей: ${stats.totalConnections}`,
                `📝 Связанных заметок: ${stats.connectedNotes}`,
                `📄 Изолированных заметок: ${stats.isolatedNotes}`,
                `🏆 Максимум связей у одной заметки: ${stats.mostConnected}`,
                `📈 Среднее количество связей: ${stats.averageConnections}`,
                ``,
                `💡 Ctrl+C = создать связь между заметками`
            ].join('\n');
            
            alert(message);
        }
    }

    /**
     * Настройка автосохранения
     */
    setupAutoSave() {
        let saveTimeout;
        
        this.events.on('state:change', (data) => {
            // Сохранять изменения заметок и связей
            if (data.path.startsWith('notes') || data.path.startsWith('connections')) {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveState();
                }, 1000);
            }
        });

        // Сохранение при закрытии страницы
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
    }

    /**
     * Настройка обновления статистики
     */
    setupStatsUpdater() {
        this.events.on('state:change', (data) => {
            if (data.path === 'notes') {
                const notesCount = data.value.length;
                this.modules.ui?.updateNotesCount(notesCount);
            }
        });
    }

    /**
     * Восстановление состояния из localStorage
     */
    restoreState() {
        try {
            const savedState = localStorage.getItem('notes-app-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Восстановить заметки
                if (state.notes && Array.isArray(state.notes)) {
                    this.state.set('notes', state.notes);
                    console.log(`📥 Restored ${state.notes.length} notes from storage`);
                }
                
                // Восстановить связи
                if (state.connections && Array.isArray(state.connections)) {
                    this.state.set('connections', state.connections);
                    console.log(`🔗 Restored ${state.connections.length} connections from storage`);
                }
                
                // Восстановить настройки UI
                if (state.ui) {
                    this.state.set('ui', { ...this.state.get('ui'), ...state.ui });
                }
            }
            
            // Инициализировать тему
            this.modules.ui?.initializeTheme();
            
        } catch (error) {
            console.warn('⚠️ Could not restore state from localStorage:', error);
        }
    }

    /**
     * Сохранение состояния в localStorage
     */
    saveState() {
        try {
            const stateToSave = {
                notes: this.state.get('notes'),
                connections: this.state.get('connections'),
                ui: {
                    theme: this.state.get('ui.theme')
                },
                timestamp: Date.now()
            };
            
            localStorage.setItem('notes-app-state', JSON.stringify(stateToSave));
            console.log('💾 State with connections saved to localStorage');
            
        } catch (error) {
            console.error('❌ Failed to save state:', error);
            this.modules.ui?.showNotification('Ошибка сохранения', 'error');
        }
    }

    /**
     * Создание начального содержимого
     */
    createInitialContent() {
        const notes = this.state.get('notes');
        
        if (notes.length === 0) {
            // Создать приветственную заметку
            this.events.emit('note:create', { 
                x: 200, 
                y: 200 
            });
            
            // Создать вторую заметку для демонстрации связей
            this.events.emit('note:create', { 
                x: 500, 
                y: 300 
            });
            
            // Установить содержимое заметок
            setTimeout(() => {
                const createdNotes = this.state.get('notes');
                
                if (createdNotes.length >= 1) {
                    const welcomeNote = createdNotes[0];
                    const welcomeText = `Это модульное приложение для заметок с поддержкой связей!

🔗 Новые возможности:
• Ctrl+C = режим создания связей
• Кликайте по заметкам для соединения
• Наводите на линию и нажимайте × для удаления
• Ctrl+Shift+S = статистика связей

Основные функции:
• Пробел + мышь = навигация по холсту
• Двойной клик = новая заметка
• "Открыть" для редактирования
• Кнопки действий при наведении

Приятной работы! ✨`;
                    
                    this.modules.notes?.updateNote(welcomeNote.id, {
                        title: 'Добро пожаловать в Notes App! 📝',
                        content: welcomeText,
                        tags: ['приветствие', 'инструкция', 'связи']
                    });
                }
                
                if (createdNotes.length >= 2) {
                    const secondNote = createdNotes[1];
                    this.modules.notes?.updateNote(secondNote.id, {
                        title: 'Пример связанной заметки 🔗',
                        content: `Эта заметка показывает, как работают связи между заметками.

Попробуйте:
1. Нажмите Ctrl+C
2. Кликните на эту заметку
3. Кликните на соседнюю заметку
4. Увидите связь!

Связи помогают организовать мысли и показать отношения между идеями.`,
                        tags: ['пример', 'связи', 'демо']
                    });
                    
                    // Создать связь между заметками для демонстрации
                    setTimeout(() => {
                        if (this.modules.connections) {
                            this.modules.connections.createConnection(
                                createdNotes[0].id, 
                                createdNotes[1].id
                            );
                        }
                    }, 500);
                }
            }, 100);
        }
    }

    /**
     * Экспорт в глобальную область для отладки
     */
    exposeToGlobal() {
        if (typeof window !== 'undefined') {
            window.notesApp = this;
            
            // Добавить удобные методы для отладки
            window.appDebug = {
                state: () => this.state.getState(),
                events: () => this.events.getStats(),
                modules: () => Object.keys(this.modules),
                notes: () => this.modules.notes?.getAllNotes(),
                connections: () => this.state.get('connections'),
                stats: () => ({
                    notes: this.modules.notes?.getStats(),
                    connections: this.modules.connections?.getStats()
                }),
                clear: () => this.clearAllData(),
                clearConnections: () => this.modules.connections?.clearAllConnections(),
                export: () => this.exportData(),
                import: (data) => this.importData(data),
                enableDebug: () => {
                    this.events.setDebug(true);
                    this.state.setDebug(true);
                    console.log('🐛 Debug mode enabled');
                },
                help: () => {
                    console.log(`
🔧 Debug Commands:
• appDebug.state() - показать состояние
• appDebug.notes() - показать все заметки
• appDebug.connections() - показать все связи
• appDebug.stats() - статистика
• appDebug.export() - экспорт данных
• appDebug.import(data) - импорт данных
• appDebug.clear() - очистить все
• appDebug.enableDebug() - включить отладку
                    `);
                }
            };
            
            console.log('🔧 Debug tools available as window.appDebug');
            console.log('🔗 Try: appDebug.connections() to see all connections');
            console.log('💡 Type: appDebug.help() for more commands');
        }
    }

    /**
     * Обработка ошибки инициализации
     * @param {Error} error - Ошибка
     */
    handleInitializationError(error) {
        // Показать пользователю информацию об ошибке
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fff;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <h2 style="color: #ea4335; margin-bottom: 16px;">⚠️ Ошибка загрузки</h2>
                <p style="margin-bottom: 24px; color: #5f6368;">
                    Не удалось загрузить приложение. Попробуйте обновить страницу или 
                    проверьте консоль разработчика для получения подробной информации.
                </p>
                <button onclick="window.location.reload()" style="
                    background: #4285f4;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                ">Обновить страницу</button>
            </div>
        `;
    }

    // === ПУБЛИЧНЫЙ API ===

    /**
     * Добавить новый модуль
     * @param {string} name - Название модуля
     * @param {Object} module - Экземпляр модуля
     * @returns {NotesApp} - Возвращает this для цепочки вызовов
     */
    addModule(name, module) {
        if (this.modules[name]) {
            console.warn(`⚠️ Module "${name}" already exists and will be replaced`);
        }
        
        this.modules[name] = module;
        console.log(`📦 Module "${name}" added`);
        
        this.events.emit('app:module-added', { name, module });
        return this;
    }

    /**
     * Получить модуль по имени
     * @param {string} name - Название модуля
     * @returns {Object|null} - Экземпляр модуля или null
     */
    getModule(name) {
        return this.modules[name] || null;
    }

    /**
     * Получить систему событий
     * @returns {EventSystem} - Система событий
     */
    getEvents() {
        return this.events;
    }

    /**
     * Получить менеджер состояния
     * @returns {StateManager} - Менеджер состояния
     */
    getState() {
        return this.state;
    }

    /**
     * Экспорт данных
     * @returns {Object} - Экспортированные данные
     */
    exportData() {
        return {
            version: '1.1.0',
            timestamp: Date.now(),
            notes: this.state.get('notes'),
            connections: this.state.get('connections'),
            settings: this.state.get('ui')
        };
    }

    /**
     * Импорт данных
     * @param {Object} data - Данные для импорта
     */
    importData(data) {
        try {
            if (data.notes && Array.isArray(data.notes)) {
                this.state.set('notes', data.notes);
                console.log(`📥 Imported ${data.notes.length} notes`);
            }
            
            if (data.connections && Array.isArray(data.connections)) {
                this.state.set('connections', data.connections);
                console.log(`🔗 Imported ${data.connections.length} connections`);
            }
            
            if (data.settings) {
                this.state.set('ui', { ...this.state.get('ui'), ...data.settings });
            }
            
            this.modules.ui?.showNotification('Данные успешно импортированы', 'success');
            
        } catch (error) {
            console.error('❌ Import failed:', error);
            this.modules.ui?.showNotification('Ошибка импорта данных', 'error');
        }
    }

    /**
     * Очистить все данные
     */
    clearAllData() {
        if (confirm('Удалить все заметки, связи и сбросить настройки?')) {
            this.state.reset();
            localStorage.removeItem('notes-app-state');
            this.modules.ui?.showNotification('Все данные очищены', 'info');
        }
    }

    /**
     * Получить статистику приложения
     * @returns {Object} - Объект со статистикой
     */
    getAppStats() {
        return {
            modules: Object.keys(this.modules).length,
            events: this.events.getStats(),
            state: this.state.getStats(),
            notes: this.modules.notes?.getStats(),
            connections: this.modules.connections?.getStats(),
            uptime: Date.now() - this.startTime
        };
    }
}

// === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
window.addEventListener('load', () => {
    window.app = new NotesApp();
});

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ===
window.closeNoteModal = function() {
    if (window.app && window.app.modules.notes) {
        window.app.modules.notes.closeNoteModal();
    }
};

window.saveNoteModal = function(noteId) {
    const modal = document.getElementById('noteModal');
    if (!modal || !window.app || !window.app.modules.notes) return;
    
    const titleInput = modal.querySelector('.modal-title-input');
    const tagsInput = modal.querySelector('#tagsInput');
    const contentTextarea = modal.querySelector('.modal-content-textarea');
    
    if (titleInput && contentTextarea && tagsInput) {
        window.app.modules.notes.saveNoteFromModal(
            noteId, 
            titleInput.value, 
            contentTextarea.value,
            tagsInput.value
        );
        window.app.modules.notes.closeNoteModal();
    }
};