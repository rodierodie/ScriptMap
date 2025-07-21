/**
 * Notes App v2.0 - Главный класс приложения с системой вкладок и ролей
 */

// Импорт модулей
import { EventSystem } from './modules/EventSystem.js';
import { StateManager } from './modules/stateManager.js';
import { MigrationModule } from './modules/migrationModule.js';
import { CanvasModule } from './modules/canvasModule.js';
import { NotesModule } from './modules/notesModule.js';
import { UIModule } from './modules/uiModule.js';
import { ConnectionsModule } from './modules/ConnectionsModule.js';
import { TabsModule } from './modules/TabsModule.js';
import { BlocksPaletteModule } from './modules/blocksPaletteModule.js';

/**
 * Главный класс приложения v2.0
 */
class NotesApp {
    constructor() {
        // Инициализация основных систем
        this.events = new EventSystem();
        this.state = new StateManager(this.events);
        
        // Инициализация модулей
        this.modules = {};
        this.startTime = Date.now();
        this.version = "2.0";
        
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            console.log('🚀 Initializing Notes App v2.0 with Tabs & Roles...');
            
            // 1. Инициализация миграции (первым делом)
            await this.initMigration();
            
            // 2. Загрузка основных модулей
            await this.loadCoreModules();
            
            // 3. Загрузка UI модулей
            await this.loadUIModules();
            
            // 4. Настройка глобальных обработчиков
            this.setupGlobalHandlers();
            
            // 5. Восстановление состояния с миграцией
            await this.restoreState();
            
            // 6. Создание начального содержимого
            this.createInitialContent();
            
            // 7. Экспорт в глобальную область для отладки
            this.exposeToGlobal();
            
            console.log('✅ Notes App v2.0 initialized successfully');
            console.log('📦 Available modules:', Object.keys(this.modules));
            console.log('🎯 New features: Tabs, Roles, Blocks Palette, Project Load/Save');
            console.log('🔗 Try: Ctrl+C for connections, Ctrl+T for new roles');
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Инициализация модуля миграции
     */
    async initMigration() {
        try {
            this.modules.migration = new MigrationModule(this.state, this.events);
            console.log('✅ Migration module loaded');
        } catch (error) {
            console.error('❌ Failed to load migration module:', error);
            throw new Error('Migration module loading failed');
        }
    }

    /**
     * Загрузка основных модулей
     */
    async loadCoreModules() {
        const coreModules = [
            { name: 'canvas', Class: CanvasModule },
            { name: 'notes', Class: NotesModule },
            { name: 'connections', Class: ConnectionsModule }
        ];

        for (const { name, Class } of coreModules) {
            try {
                this.modules[name] = new Class(this.state, this.events);
                console.log(`✅ ${name} module loaded`);
            } catch (error) {
                console.error(`❌ Failed to load ${name} module:`, error);
                throw new Error(`Core module loading failed: ${name}`);
            }
        }
    }

    /**
     * Загрузка UI модулей
     */
    async loadUIModules() {
        const uiModules = [
            { name: 'tabs', Class: TabsModule },
            { name: 'palette', Class: BlocksPaletteModule },
            { name: 'ui', Class: UIModule }
        ];

        for (const { name, Class } of uiModules) {
            try {
                this.modules[name] = new Class(this.state, this.events);
                console.log(`✅ ${name} module loaded`);
            } catch (error) {
                console.error(`❌ Failed to load ${name} module:`, error);
                // UI модули не критичны - продолжаем работу
                console.warn(`⚠️ Continuing without ${name} module`);
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

        // Автосохранение с поддержкой v2.0
        this.setupAutoSave();

        // Уведомления о статистике
        this.setupStatsUpdater();

        // Связь между модулями
        this.setupModulesIntegration();

        // Глобальные горячие клавиши
        this.setupGlobalHotkeys();
    }

    /**
     * Настройка интеграции между модулями
     */
    setupModulesIntegration() {
        // Перенаправляем уведомления от модулей в UI
        ['connections', 'tabs', 'palette'].forEach(moduleName => {
            this.events.on(`${moduleName}:notification`, (data) => {
                if (this.modules.ui) {
                    this.modules.ui.showNotification(data.message, data.type, data.duration);
                }
            });
        });

        // Интеграция вкладок с другими модулями
        this.events.on('tab:context-changed', (context) => {
            // Обновить кнопку добавления в UI
            this.updateAddButton(context);
            
            // Уведомить все модули о смене контекста
            this.events.emit('app:context-changed', context);
        });

        // Обработка запросов на добавление
        this.events.on('ui:add-request', () => {
            const tabInfo = this.modules.tabs?.getCurrentTabInfo();
            
            if (tabInfo?.canCreateBlocks) {
                // В основном дереве - создать блок
                this.events.emit('note:create');
            } else if (tabInfo?.canCreateReferences) {
                // В роли - открыть палитру
                this.events.emit('ui:add-reference-request');
            }
        });
    }

    /**
     * Обновить кнопку добавления в зависимости от контекста
     * @param {Object} context - Контекст вкладки
     */
    updateAddButton(context) {
        const addBtn = document.querySelector('.add-note-btn');
        if (!addBtn) return;

        if (context.canCreateBlocks) {
            addBtn.title = 'Создать новый блок';
            addBtn.classList.remove('palette-mode');
        } else if (context.canCreateReferences) {
            addBtn.title = 'Добавить блок из палитры';
            addBtn.classList.add('palette-mode');
        }
    }

    /**
     * Настройка глобальных горячих клавиш
     */
    setupGlobalHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Не обрабатывать если открыто модальное окно
            if (document.querySelector('.modal-overlay, .role-modal-overlay.visible')) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'e':
                        e.preventDefault();
                        this.exportAppData();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.importAppData();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.showAppStats();
                        break;
                }
            }
        });
    }

    /**
     * Настройка автосохранения v2.0
     */
    setupAutoSave() {
        let saveTimeout;
        
        this.events.on('state:change', (data) => {
            // Сохранять изменения блоков, ролей и связей
            if (data.path.startsWith('blocks') || 
                data.path.startsWith('roles') || 
                data.path.startsWith('connections')) {
                
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
            if (data.path === 'blocks') {
                const blocksCount = data.value.length;
                this.modules.ui?.updateNotesCount(blocksCount);
            }
        });
    }

    /**
     * Восстановление состояния с автоматической миграцией
     */
    async restoreState() {
        try {
            const savedState = localStorage.getItem('notes-app-state');
            
            if (savedState) {
                const rawData = JSON.parse(savedState);
                
                // Автоматическая миграция через MigrationModule
                const migratedData = this.modules.migration.autoMigrate(rawData);
                
                // Применить мигрированное состояние
                this.state.setState(migratedData);
                
                console.log(`📥 Restored and migrated state from v${rawData.version || '1.0'} to v${migratedData.version}`);
            } else {
                // Создать начальное состояние v2.0
                const initialState = this.modules.migration.getInitialV2State();
                this.state.setState(initialState);
                
                console.log('🆕 Created initial v2.0 state');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not restore state:', error);
            
            // Создать резервную копию поврежденных данных
            const backupKey = this.modules.migration?.createBackup(error.data);
            if (backupKey) {
                console.log(`💾 Created backup of corrupted data: ${backupKey}`);
            }
            
            // Использовать начальное состояние
            const initialState = this.modules.migration.getInitialV2State();
            this.state.setState(initialState);
        }
    }

    /**
     * Сохранение состояния v2.0
     */
    saveState() {
        try {
            const currentState = this.state.getState();
            const exportData = this.modules.migration.exportData(currentState);
            
            localStorage.setItem('notes-app-state', JSON.stringify(exportData));
            console.log('💾 State v2.0 saved to localStorage');
            
        } catch (error) {
            console.error('❌ Failed to save state:', error);
            this.modules.ui?.showNotification('Ошибка сохранения', 'error');
        }
    }

    /**
     * Создание начального содержимого
     */
    createInitialContent() {
        const blocks = this.state.get('blocks');
        
        if (blocks.length === 0) {
            // Создать приветственные блоки
            const welcomeBlock = this.state.createBlock({
                title: 'Добро пожаловать в Notes App v2.0! 🎉',
                content: `Новые возможности версии 2.0:

🎯 СИСТЕМА ВКЛАДОК И РОЛЕЙ:
• Основное дерево - создание и редактирование блоков
• Роли - компоновка ссылок на блоки для разных пользователей
• Ctrl+T - создать новую роль

🎨 ПАЛИТРА БЛОКОВ:
• Выбор блоков из основного дерева для ролей
• Группировка по тегам
• Поиск и фильтрация

🔗 СВЯЗИ МЕЖДУ БЛОКАМИ:
• Ctrl+C - создать связь между блоками
• Наведите на линию для удаления

💾 СОХРАНЕНИЕ И ЗАГРУЗКА ПРОЕКТОВ:
• Кнопки "Сохранить" и "Загрузить" в заголовке
• Полный экспорт/импорт всех данных
• Совместимость между версиями

⌨️ ГОРЯЧИЕ КЛАВИШИ:
• Ctrl+1 - Основное дерево
• Ctrl+2,3,4 - Роли по порядку
• Ctrl+Shift+S - статистика
• Ctrl+E - экспорт данных
• Ctrl+R - статистика приложения

Приятной работы! ✨`,
                tags: ['приветствие', 'инструкция', 'v2.0'],
                position: { x: 200, y: 200 }
            });

            const demoBlock = this.state.createBlock({
                title: 'Пример работы с ролями 👥',
                content: `Этот блок демонстрирует новую систему ролей:

1. СОЗДАНИЕ БЛОКОВ (вы здесь):
   - В "Основном дереве" создаются все блоки
   - Здесь можно редактировать содержимое
   - Все изменения отражаются во всех ролях

2. СОЗДАНИЕ РОЛЕЙ:
   - Нажмите "Добавить роль" в панели вкладок
   - Выберите название (Администратор, Клиент и т.д.)

3. КОМПОНОВКА РОЛЕЙ:
   - Переключитесь на роль
   - Нажмите "+" для открытия палитры
   - Выберите нужные блоки для этой роли

4. РЕЗУЛЬТАТ:
   - Каждая роль видит только свои блоки
   - Изменения в блоке видны везде
   - Связи работают между блоками

Попробуйте создать роль и добавить этот блок!`,
                tags: ['демо', 'роли', 'инструкция'],
                position: { x: 600, y: 250 }
            });

            // Создать связь между блоками для демонстрации
            setTimeout(() => {
                if (this.modules.connections) {
                    this.modules.connections.createConnection(
                        welcomeBlock.id, 
                        demoBlock.id
                    );
                }
            }, 500);
        }
    }

    /**
     * Экспорт данных приложения
     */
    exportAppData() {
        try {
            const currentState = this.state.getState();
            const exportData = this.modules.migration.exportData(currentState);
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `notes-app-export-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.modules.ui?.showNotification('Данные экспортированы', 'success');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.modules.ui?.showNotification('Ошибка экспорта', 'error');
        }
    }

    /**
     * Импорт данных приложения
     */
    importAppData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    const migratedData = this.modules.migration.autoMigrate(importData);
                    
                    this.state.setState(migratedData);
                    this.modules.ui?.showNotification('Данные импортированы', 'success');
                    
                } catch (error) {
                    console.error('❌ Import failed:', error);
                    this.modules.ui?.showNotification('Ошибка импорта', 'error');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    /**
     * Показать статистику приложения
     */
    showAppStats() {
        const stats = this.getAppStats();
        const message = [
            `📊 Статистика Notes App v${this.version}:`,
            ``,
            `📦 Модули: ${stats.modules}`,
            `🧱 Блоки: ${stats.state.blocks.total}`,
            `👥 Роли: ${stats.state.roles.total} (${stats.state.roles.custom} пользовательских)`,
            `🔗 Связи: ${stats.state.connections.total}`,
            `📎 Ссылки: ${stats.state.roles.totalReferences}`,
            ``,
            `💾 Размер состояния: ${Math.round(stats.state.stateSize / 1024)} KB`,
            `⏱️ Время работы: ${Math.round(stats.uptime / 1000)} сек`,
            ``,
            `🔧 Ctrl+E = экспорт • Ctrl+I = импорт`
        ].join('\n');
        
        alert(message);
    }

    /**
     * Экспорт в глобальную область для отладки v2.0
     */
    exposeToGlobal() {
        if (typeof window !== 'undefined') {
            window.notesApp = this;
            
            // Обновленные команды отладки для v2.0
            window.appDebug = {
                // Состояние
                state: () => this.state.getState(),
                blocks: () => this.state.get('blocks'),
                roles: () => this.state.get('roles'),
                connections: () => this.state.get('connections'),
                
                // Статистика
                stats: () => this.getAppStats(),
                migration: () => this.modules.migration?.getMigrationInfo(),
                
                // Действия
                export: () => this.exportAppData(),
                import: () => this.importAppData(),
                clear: () => this.clearAllData(),
                
                // Модули
                modules: () => Object.keys(this.modules),
                tabs: () => this.modules.tabs?.getStats(),
                palette: () => this.modules.palette?.getStats(),
                
                // Тестирование
                createTestRole: (name = 'Тестовая роль') => {
                    return this.state.createRole({ name });
                },
                createTestBlock: (title = 'Тестовый блок') => {
                    return this.state.createBlock({ title });
                },
                
                // Отладка
                enableDebug: () => {
                    this.events.setDebug(true);
                    this.state.setDebug(true);
                    console.log('🐛 Debug mode enabled');
                },
                
                help: () => {
                    console.log(`
🔧 Debug Commands v2.0:
• appDebug.state() - показать полное состояние
• appDebug.blocks() - показать все блоки
• appDebug.roles() - показать все роли
• appDebug.connections() - показать все связи
• appDebug.stats() - статистика приложения
• appDebug.tabs() - статистика вкладок
• appDebug.palette() - статистика палитры
• appDebug.export() - экспорт данных
• appDebug.import() - импорт данных
• appDebug.clear() - очистить все
• appDebug.createTestRole() - создать тестовую роль
• appDebug.createTestBlock() - создать тестовый блок
• appDebug.enableDebug() - включить отладку
                    `);
                }
            };
            
            console.log('🔧 Debug tools v2.0 available as window.appDebug');
            console.log('💡 Type: appDebug.help() for commands');
            console.log('🎯 New: appDebug.tabs(), appDebug.roles(), appDebug.createTestRole()');
        }
    }

    /**
     * Обработка ошибки инициализации
     * @param {Error} error - Ошибка
     */
    handleInitializationError(error) {
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
                <h2 style="color: #ea4335; margin-bottom: 16px;">⚠️ Ошибка загрузки v2.0</h2>
                <p style="margin-bottom: 24px; color: #5f6368;">
                    Не удалось загрузить Notes App v2.0. Возможно, произошла ошибка миграции данных.
                    Попробуйте обновить страницу или очистить данные приложения.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="window.location.reload()" style="
                        background: #4285f4;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Обновить страницу</button>
                    <button onclick="localStorage.clear(); window.location.reload()" style="
                        background: #ea4335;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Очистить данные</button>
                </div>
            </div>
        `;
    }

    // === ПУБЛИЧНЫЙ API v2.0 ===

    /**
     * Получить версию приложения
     * @returns {string} - Версия
     */
    getVersion() {
        return this.version;
    }

    /**
     * Получить статистику приложения v2.0
     * @returns {Object} - Объект со статистикой
     */
    getAppStats() {
        return {
            version: this.version,
            modules: Object.keys(this.modules).length,
            events: this.events.getStats(),
            state: this.state.getStats(),
            uptime: Date.now() - this.startTime,
            migration: this.modules.migration?.getMigrationInfo()
        };
    }

    /**
     * Очистить все данные v2.0
     */
    clearAllData() {
        if (confirm('Удалить все блоки, роли, связи и сбросить к начальному состоянию v2.0?')) {
            const initialState = this.modules.migration.getInitialV2State();
            this.state.setState(initialState);
            localStorage.removeItem('notes-app-state');
            this.modules.ui?.showNotification('Все данные очищены', 'info');
        }
    }

    // Сохранить обратную совместимость с v1.0 API
    addModule(name, module) {
        return this.addModule(name, module);
    }

    getModule(name) {
        return this.modules[name] || null;
    }

    getEvents() {
        return this.events;
    }

    getState() {
        return this.state;
    }

    exportData() {
        const currentState = this.state.getState();
        return this.modules.migration.exportData(currentState);
    }

    importData(data) {
        try {
            const migratedData = this.modules.migration.autoMigrate(data);
            this.state.setState(migratedData);
            this.modules.ui?.showNotification('Данные успешно импортированы', 'success');
        } catch (error) {
            console.error('❌ Import failed:', error);
            this.modules.ui?.showNotification('Ошибка импорта данных', 'error');
        }
    }
}

// === ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ===
window.addEventListener('load', () => {
    window.app = new NotesApp();
});

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА (обратная совместимость) ===
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