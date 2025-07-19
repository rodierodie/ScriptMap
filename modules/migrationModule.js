/**
 * Migration Module - Миграция данных между версиями
 * Обеспечивает обратную совместимость v1.0 → v2.0
 */
export class MigrationModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.currentVersion = "2.0";
        this.migrations = new Map();
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.registerMigrations();
        console.log('🔄 Migration module initialized');
    }

    /**
     * Регистрация всех миграций
     */
    registerMigrations() {
        // Миграция с v1.0 на v2.0
        this.migrations.set('1.0->2.0', {
            from: '1.0',
            to: '2.0',
            migrate: this.migrateV1ToV2.bind(this)
        });
    }

    /**
     * Автоматическая миграция данных при загрузке
     * @param {Object} data - Загружаемые данные
     * @returns {Object} - Мигрированные данные
     */
    autoMigrate(data) {
        if (!data) {
            return this.getInitialV2State();
        }

        const version = this.detectVersion(data);
        console.log(`📊 Detected data version: ${version}`);

        if (version === this.currentVersion) {
            return data; // Данные уже в актуальной версии
        }

        this.events.emit('migration:started', { from: version, to: this.currentVersion });

        let migratedData = data;
        
        // Применить цепочку миграций
        if (version === '1.0') {
            migratedData = this.migrateV1ToV2(data);
        }

        this.events.emit('migration:completed', { 
            from: version, 
            to: this.currentVersion,
            blocksCount: migratedData.blocks?.length || 0,
            rolesCount: Object.keys(migratedData.roles || {}).length
        });

        console.log('✅ Migration completed successfully');
        return migratedData;
    }

    /**
     * Определить версию данных
     * @param {Object} data - Данные для анализа
     * @returns {string} - Версия данных
     */
    detectVersion(data) {
        if (data.version) {
            return data.version;
        }

        // Логика определения версии по структуре данных
        if (data.notes && Array.isArray(data.notes)) {
            return '1.0'; // Старый формат с массивом notes
        }

        if (data.blocks && Array.isArray(data.blocks)) {
            return '2.0'; // Новый формат с блоками
        }

        return '1.0'; // По умолчанию считаем старой версией
    }

    /**
     * Миграция с версии 1.0 на 2.0
     * @param {Object} v1Data - Данные v1.0
     * @returns {Object} - Данные v2.0
     */
    migrateV1ToV2(v1Data) {
        console.log('🔄 Migrating v1.0 → v2.0...');

        const v2Data = {
            version: "2.0",
            blocks: [],
            roles: this.getDefaultRoles(),
            connections: v1Data.connections || [],
            ui: {
                activeTab: "main",
                theme: v1Data.ui?.theme || "dark", // Темная тема по умолчанию
                paletteOpen: false
            },
            migrationInfo: {
                migratedAt: Date.now(),
                fromVersion: "1.0",
                originalNotesCount: v1Data.notes?.length || 0
            }
        };

        // Конвертировать notes в blocks
        if (v1Data.notes && Array.isArray(v1Data.notes)) {
            v2Data.blocks = v1Data.notes.map(note => this.convertNoteToBlock(note));
            console.log(`📝 Converted ${v1Data.notes.length} notes to blocks`);
        }

        // Валидация данных
        this.validateV2Data(v2Data);

        return v2Data;
    }

    /**
     * Конвертировать заметку в блок
     * @param {Object} note - Заметка v1.0
     * @returns {Object} - Блок v2.0
     */
    convertNoteToBlock(note) {
        return {
            id: note.id,
            title: note.title || 'Новая заметка',
            content: note.content || '',
            tags: note.tags || [],
            position: {
                x: note.position?.x || 0,
                y: note.position?.y || 0
            },
            createdAt: note.createdAt || Date.now(),
            updatedAt: note.updatedAt || Date.now(),
            // Метаданные миграции
            _migrated: {
                from: 'note',
                at: Date.now()
            }
        };
    }

    /**
     * Получить роли по умолчанию
     * @returns {Object} - Объект с ролями
     */
    getDefaultRoles() {
        return {
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
        };
    }

    /**
     * Получить начальное состояние v2.0
     * @returns {Object} - Чистое состояние v2.0
     */
    getInitialV2State() {
        return {
            version: "2.0",
            blocks: [],
            roles: this.getDefaultRoles(),
            connections: [],
            ui: {
                activeTab: "main",
                theme: "dark", // Темная тема по умолчанию
                paletteOpen: false
            }
        };
    }

    /**
     * Валидация данных v2.0
     * @param {Object} data - Данные для валидации
     * @throws {Error} - При ошибке валидации
     */
    validateV2Data(data) {
        const errors = [];

        // Проверка версии
        if (data.version !== "2.0") {
            errors.push(`Invalid version: ${data.version}`);
        }

        // Проверка блоков
        if (!Array.isArray(data.blocks)) {
            errors.push('Blocks must be an array');
        } else {
            data.blocks.forEach((block, index) => {
                if (!block.id) errors.push(`Block ${index} missing id`);
                if (typeof block.title !== 'string') errors.push(`Block ${index} invalid title`);
                if (!block.position || typeof block.position.x !== 'number') {
                    errors.push(`Block ${index} invalid position`);
                }
            });
        }

        // Проверка ролей
        if (typeof data.roles !== 'object') {
            errors.push('Roles must be an object');
        } else {
            Object.entries(data.roles).forEach(([roleId, role]) => {
                if (!role.name) errors.push(`Role ${roleId} missing name`);
                if (!Array.isArray(role.references)) {
                    errors.push(`Role ${roleId} references must be array`);
                }
            });
        }

        // Проверка связей
        if (!Array.isArray(data.connections)) {
            errors.push('Connections must be an array');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        console.log('✅ Data validation passed');
    }

    /**
     * Экспорт данных с указанием версии
     * @param {Object} data - Данные для экспорта
     * @returns {Object} - Данные с метаданными
     */
    exportData(data) {
        return {
            ...data,
            version: this.currentVersion,
            exportedAt: Date.now(),
            exportMeta: {
                blocksCount: data.blocks?.length || 0,
                rolesCount: Object.keys(data.roles || {}).length,
                connectionsCount: data.connections?.length || 0
            }
        };
    }

    /**
     * Проверка совместимости версий
     * @param {string} version - Версия для проверки
     * @returns {boolean} - Поддерживается ли версия
     */
    isVersionSupported(version) {
        const supportedVersions = ['1.0', '2.0'];
        return supportedVersions.includes(version);
    }

    /**
     * Получить информацию о миграциях
     * @returns {Object} - Информация о доступных миграциях
     */
    getMigrationInfo() {
        return {
            currentVersion: this.currentVersion,
            supportedVersions: ['1.0', '2.0'],
            availableMigrations: Array.from(this.migrations.keys()),
            migrationPaths: {
                '1.0': ['2.0'],
                '2.0': []
            }
        };
    }

    /**
     * Создать резервную копию перед миграцией
     * @param {Object} data - Данные для бэкапа
     * @returns {string} - Ключ резервной копии
     */
    createBackup(data) {
        const backupKey = `notes-app-backup-${Date.now()}`;
        try {
            localStorage.setItem(backupKey, JSON.stringify(data));
            console.log(`💾 Backup created: ${backupKey}`);
            return backupKey;
        } catch (error) {
            console.warn('⚠️ Could not create backup:', error);
            return null;
        }
    }

    /**
     * Восстановить из резервной копии
     * @param {string} backupKey - Ключ резервной копии
     * @returns {Object|null} - Восстановленные данные
     */
    restoreBackup(backupKey) {
        try {
            const data = localStorage.getItem(backupKey);
            if (data) {
                console.log(`🔄 Restored from backup: ${backupKey}`);
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('❌ Failed to restore backup:', error);
        }
        return null;
    }

    /**
     * Очистить старые резервные копии
     * @param {number} maxAge - Максимальный возраст в днях
     */
    cleanupOldBackups(maxAge = 7) {
        const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('notes-app-backup-')) {
                const timestamp = parseInt(key.split('-').pop());
                if (timestamp < cutoffTime) {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Removed old backup: ${key}`);
                }
            }
        });
    }
}