/**
 * Notes App v2.0 - Главный класс приложения с системой вкладок и ролей
 * FIXED: Добавлено событие после восстановления состояния
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
            
            // 7. Настройка автосохранения v2.0
            this.setupAutoSave();
            
            // 8. Настройка обновления статистики
            this.setupStatsUpdater();
            
            // 9. Настройка горячих клавиш
            this.setupHotkeys();
            
            // 10. Финализация
            this.finalize();
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitError(error);
        }
    }

    /**
     * Инициализация модуля миграции
     */
    async initMigration() {
        this.modules.migration = new MigrationModule(this.state, this.events);
        console.log('✅ Migration module loaded');
    }

    /**
     * Загрузка основных модулей
     */
    async loadCoreModules() {
        // Модуль состояния холста
        this.modules.canvas = new CanvasModule(this.state, this.events);
        
        // Модуль заметок/блоков
        this.modules.notes = new NotesModule(this.state, this.events);
        
        // Модуль связей между блоками
        this.modules.connections = new ConnectionsModule(this.state, this.events);
        
        console.log('✅ Core modules loaded');
    }

    /**
     * Загрузка UI модулей
     */
    async loadUIModules() {
        // Модуль пользовательского интерфейса
        this.modules.ui = new UIModule(this.state, this.events);
        
        // Модуль системы вкладок и ролей (приоритетный)
        this.modules.tabs = new TabsModule(this.state, this.events);
        
        // Модуль палитры блоков
        this.modules.palette = new BlocksPaletteModule(this.state, this.events);
        
        console.log('✅ UI modules loaded');
    }

    /**
     * Настройка глобальных обработчиков
     */
    setupGlobalHandlers() {
        // Обработка ошибок
        window.addEventListener('error', (e) => {
            console.error('🚨 Global error:', e.error);
            this.modules.ui?.showNotification('Произошла ошибка', 'error');
        });

        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', (e) => {
            console.error('🚨 Unhandled promise rejection:', e.reason);
            this.modules.ui?.showNotification('Ошибка выполнения операции', 'error');
            e.preventDefault();
        });

        // Обработка изменения размера окна
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.events.emit('window:resized', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }, 250);
        });

        console.log('✅ Global handlers setup');
    }

    /**
     * Восстановление состояния с автоматической миграцией
     * ИСПРАВЛЕНИЕ: Добавлено событие после восстановления состояния
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
                
                // ИСПРАВЛЕНИЕ: Принудительно обновить UI после восстановления состояния
                setTimeout(() => {
                    this.events.emit('state:restored-complete', { 
                        fromVersion: rawData.version || '1.0',
                        toVersion: migratedData.version
                    });
                }, 100);
                
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

Приятной работы!`,
                position: { x: 150, y: 150 },
                tags: ['info', 'welcome']
            });

            const featuresBlock = this.state.createBlock({
                title: 'Основные функции v2.0',
                content: `ВКЛАДКИ И РОЛИ:
Переключайтесь между основным деревом и ролями. Каждая роль - это набор ссылок на блоки из основного дерева.

ПАЛИТРА БЛОКОВ:
Drag & Drop блоков из основного дерева в роли. Блоки остаются в основном дереве, в роли создаются только ссылки.

СВЯЗИ МЕЖДУ БЛОКАМИ:
Создавайте логические связи между блоками для визуализации зависимостей и процессов.

ПРОЕКТЫ:
Сохраняйте и загружайте полные проекты с блоками, ролями и связями.`,
                position: { x: 450, y: 150 },
                tags: ['features', 'guide']
            });

            const rolesBlock = this.state.createBlock({
                title: 'Как работать с ролями',
                content: `1. СОЗДАНИЕ РОЛИ:
   • Нажмите "+" или Ctrl+T
   • Введите название роли
   • Новая вкладка появится в заголовке

2. ДОБАВЛЕНИЕ БЛОКОВ В РОЛЬ:
   • Переключитесь на роль
   • Откройте палитру (справа)
   • Перетащите блоки из палитры на холст

3. ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ВКЛАДКАМИ:
   • Клик по вкладке
   • Ctrl+1 (основное дерево)
   • Ctrl+2,3,4... (роли по порядку)

4. УДАЛЕНИЕ РОЛИ:
   • Нажмите ✕ на вкладке роли
   • Подтвердите удаление
   • Блоки останутся в основном дереве`,
                position: { x: 150, y: 400 },
                tags: ['roles', 'tutorial']
            });

            // Создать связи между блоками
            this.state.createConnection(welcomeBlock.id, featuresBlock.id);
            this.state.createConnection(featuresBlock.id, rolesBlock.id);
            
            console.log('✅ Initial content created');
        }
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

        console.log('✅ Auto-save setup');
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

        console.log('✅ Stats updater setup');
    }

    /**
     * Настройка горячих клавиш приложения
     */
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Игнорировать если фокус в поле ввода
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl+Shift+S - показать статистику
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.showAppStats();
                return;
            }

            // Обработка других комбинаций
            if (e.ctrlKey) {
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

        console.log('✅ Global hotkeys setup');
    }

    /**
     * Финализация инициализации
     */
    finalize() {
        const loadTime = Date.now() - this.startTime;
        
        // Установить глобальную ссылку на приложение
        window.app = this;
        
        // Очистить старые резервные копии
        this.modules.migration.cleanupBackups();
        
        // Эмитировать событие готовности
        this.events.emit('app:ready', {
            version: this.version,
            loadTime,
            modules: Object.keys(this.modules)
        });
        
        console.log(`🎉 Notes App v${this.version} initialized in ${loadTime}ms`);
        console.log('📱 Modules loaded:', Object.keys(this.modules).join(', '));
        
        // Показать приветственное уведомление
        setTimeout(() => {
            this.modules.ui?.showNotification(`Notes App v${this.version} готов к работе!`, 'success');
        }, 1000);
    }

    /**
     * Обработка ошибок инициализации
     * @param {Error} error - Ошибка инициализации
     */
    handleInitError(error) {
        console.error('💥 Critical initialization error:', error);
        
        // Попытка отобразить базовое сообщение об ошибке
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #fee;
                border: 2px solid #f00;
                border-radius: 8px;
                padding: 20px;
                font-family: Arial, sans-serif;
                text-align: center;
                max-width: 400px;
            ">
                <h2 style="color: #d00; margin-top: 0;">Ошибка инициализации</h2>
                <p>Приложение не может быть загружено из-за критической ошибки:</p>
                <code style="background: #f5f5f5; padding: 5px; border-radius: 3px; display: block; margin: 10px 0;">
                    ${error.message}
                </code>
                <p>Попробуйте обновить страницу или очистить localStorage.</p>
                <button onclick="localStorage.clear(); location.reload();" 
                        style="background: #007cba; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Очистить данные и перезагрузить
                </button>
            </div>
        `;
    }

    /**
     * Показать статистику приложения
     */
    showAppStats() {
        const stats = {
            app: {
                version: this.version,
                uptime: Date.now() - this.startTime,
                modules: Object.keys(this.modules)
            },
            state: this.state.getStats(),
            tabs: this.modules.tabs?.getStats(),
            migration: this.modules.migration?.getStats()
        };

        console.log('📊 App Statistics:', stats);
        
        // Показать в UI если доступно
        if (this.modules.ui) {
            this.modules.ui.showStatsModal(stats);
        }
    }

    /**
     * Экспорт данных приложения
     */
    exportAppData() {
        try {
            const currentState = this.state.getState();
            const exportData = this.modules.migration.exportData(currentState);
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `notes-app-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
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
        input.style.display = 'none';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                // Миграция и применение данных
                const migratedData = this.modules.migration.autoMigrate(data);
                this.state.setState(migratedData);
                
                this.modules.ui?.showNotification('Данные импортированы', 'success');
                
            } catch (error) {
                console.error('❌ Import failed:', error);
                this.modules.ui?.showNotification('Ошибка импорта', 'error');
            } finally {
                document.body.removeChild(input);
            }
        });
        
        document.body.appendChild(input);
        input.click();
    }

    /**
     * Получить информацию о приложении
     * @returns {Object} - Информация о приложении
     */
    getAppInfo() {
        return {
            version: this.version,
            startTime: this.startTime,
            uptime: Date.now() - this.startTime,
            modules: Object.keys(this.modules),
            state: {
                blocks: this.state.get('blocks').length,
                roles: Object.keys(this.state.get('roles')).length,
                connections: this.state.get('connections').length
            }
        };
    }

    /**
     * Уничтожение приложения
     */
    destroy() {
        // Сохранить состояние перед уничтожением
        this.saveState();
        
        // Уничтожить все модули
        Object.values(this.modules).forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });
        
        // Очистить ссылки
        this.modules = {};
        delete window.app;
        
        console.log('🗑️ App destroyed');
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
});

// Экспорт для использования в других модулях
export { NotesApp };