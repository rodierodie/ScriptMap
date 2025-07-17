/**
 * Notes App - Главный класс приложения
 * 
 * Объединяет все модули в единое приложение с чистым API для расширения
 */

// Импорт модулей
import { EventSystem } from './modules/eventSystem.js';
import { StateManager } from './modules/stateManager.js';
import { CanvasModule } from './modules/canvasModule.js';
import { NotesModule } from './modules/notesModule.js';
import { UIModule } from './modules/uiModule.js';

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
            console.log('🚀 Initializing Notes App...');
            
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
            
            console.log('✅ Notes App initialized successfully');
            console.log('📦 Available modules:', Object.keys(this.modules));
            
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
            { name: 'ui', Class: UIModule }
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
    }

    /**
     * Настройка автосохранения
     */
    setupAutoSave() {
        let saveTimeout;
        
        this.events.on('state:change', (data) => {
            // Сохранять только изменения заметок
            if (data.path.startsWith('notes')) {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveState();
                }, 1000); // Сохранение через 1 секунду после последнего изменения
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
                
                // Восстановить только заметки, остальное по умолчанию
                if (state.notes && Array.isArray(state.notes)) {
                    this.state.set('notes', state.notes);
                    console.log(`📥 Restored ${state.notes.length} notes from storage`);
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
                ui: {
                    theme: this.state.get('ui.theme')
                },
                timestamp: Date.now()
            };
            
            localStorage.setItem('notes-app-state', JSON.stringify(stateToSave));
            console.log('💾 State saved to localStorage');
            
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
            
            // Установить содержимое приветственной заметки
            setTimeout(() => {
                const welcomeNote = this.state.get('notes')[0];
                if (welcomeNote) {
                    const welcomeText = `Это модульное приложение для заметок с простым интерфейсом.

Основные возможности:
• Пробел + мышь = навигация по холсту
• Двойной клик = новая заметка
• Кликните по заметке или "Открыть" для редактирования
• Используйте кнопки действий при наведении

Приятной работы! ✨`;
                    
                    this.modules.notes?.updateNote(welcomeNote.id, {
                        title: 'Добро пожаловать в Notes App! 📝',
                        content: welcomeText
                    });
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
                stats: () => this.modules.notes?.getStats(),
                clear: () => this.clearAllData(),
                export: () => this.exportData(),
                enableDebug: () => {
                    this.events.setDebug(true);
                    this.state.setDebug(true);
                }
            };
            
            console.log('🔧 Debug tools available as window.appDebug');
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
            version: '1.0.0',
            timestamp: Date.now(),
            notes: this.state.get('notes'),
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
        if (confirm('Удалить все заметки и сбросить настройки?')) {
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
    const contentTextarea = modal.querySelector('.modal-content-textarea');
    
    if (titleInput && contentTextarea) {
        window.app.modules.notes.saveNoteFromModal(
            noteId, 
            titleInput.value, 
            contentTextarea.value
        );
        window.app.modules.notes.closeNoteModal();
    }
};