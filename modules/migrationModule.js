/**
 * Migration Module - Миграция данных между версиями
 * Обеспечивает обратную совместимость v1.0 → v2.0
 * FIXED: Сохранение ролей из проекта при миграции
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
     * ИСПРАВЛЕНИЕ: Улучшенная обработка проектов v2.0
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
            // ИСПРАВЛЕНИЕ: Для данных v2.0 проверяем что роли не пустые
            if (data.roles && Object.keys(data.roles).length === 0) {
                console.log('⚠️ Empty roles object detected, adding default roles');
                data.roles = this.getDefaultRoles();
            }
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
     * ИСПРАВЛЕНИЕ: Улучшенное определение версии для проектов
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

        // ИСПРАВЛЕНИЕ: Улучшенное определение v2.0
        if (data.blocks && Array.isArray(data.blocks) && data.roles && typeof data.roles === 'object') {
            return '2.0'; // Новый формат с блоками и ролями
        }

        if (data.blocks && Array.isArray(data.blocks)) {
            return '2.0'; // Новый формат с блоками (даже без ролей)
        }

        return '1.0'; // По умолчанию считаем старой версией
    }

    /**
     * Миграция с версии 1.0 на 2.0
     * ИСПРАВЛЕНИЕ: Сохраняем роли из проекта если они есть
     * @param {Object} v1Data - Данные v1.0
     * @returns {Object} - Данные v2.0
     */
    migrateV1ToV2(v1Data) {
        console.log('🔄 Migrating v1.0 → v2.0...');

        const v2Data = {
            version: "2.0",
            blocks: [],
            // ИСПРАВЛЕНИЕ: Используем роли из проекта если есть, иначе дефолтные
            roles: v1Data.roles || this.getDefaultRoles(),
            connections: v1Data.connections || [],
            ui: {
                activeTab: "main",
                theme: v1Data.ui?.theme || "light",
                paletteOpen: false
            },
            migrationInfo: {
                migratedAt: Date.now(),
                fromVersion: "1.0",
                originalNotesCount: v1Data.notes?.length || 0,
                preservedRoles: !!v1Data.roles // Флаг сохранения ролей
            }
        };

        // Конвертировать notes в blocks
        if (v1Data.notes && Array.isArray(v1Data.notes)) {
            v2Data.blocks = v1Data.notes.map(note => this.convertNoteToBlock(note));
            console.log(`📝 Converted ${v1Data.notes.length} notes to blocks`);
        }

        // ИСПРАВЛЕНИЕ: Логирование сохранения ролей
        if (v1Data.roles) {
            console.log(`👥 Preserved ${Object.keys(v1Data.roles).length} roles from project`);
        } else {
            console.log(`👥 Using default roles (3 roles)`);
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
     * Получить роли по умолчанию (убран флаг isDefault)
     * @returns {Object} - Объект с ролями
     */
    getDefaultRoles() {
        return {
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
            canvas: {
                transform: { x: 0, y: 0 },
                isDragging: false,
                isPanning: false,
                zoom: 1
            },
            ui: {
                activeTab: "main",
                theme: "light",
                paletteOpen: false,
                instructionsVisible: false
            },
            interaction: {
                isSpacePressed: false,
                dragItem: null,
                dragOffset: { x: 0, y: 0 },
                panStart: { x: 0, y: 0 }
            },
            settings: {
                autoSave: true,
                debugMode: false,
                version: "2.0"
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
    getMigrationsInfo() {
        const migrations = Array.from(this.migrations.values());
        
        return {
            currentVersion: this.currentVersion,
            supportedVersions: ['1.0', '2.0'],
            availableMigrations: migrations.map(m => ({
                from: m.from,
                to: m.to,
                key: `${m.from}->${m.to}`
            })),
            totalMigrations: migrations.length
        };
    }

    /**
     * Создать резервную копию данных
     * @param {Object} data - Данные для резервирования
     * @returns {string} - Ключ резервной копии
     */
    createBackup(data) {
        const backupKey = `backup-${Date.now()}`;
        const backupData = {
            data,
            timestamp: Date.now(),
            version: data.version || 'unknown'
        };
        
        try {
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            console.log(`💾 Created backup: ${backupKey}`);
            return backupKey;
        } catch (error) {
            console.error('❌ Failed to create backup:', error);
            return null;
        }
    }

    /**
     * Получить список резервных копий
     * @returns {Array} - Список резервных копий
     */
    getBackups() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('backup-')) {
                try {
                    const backupData = JSON.parse(localStorage.getItem(key));
                    backups.push({
                        key,
                        timestamp: backupData.timestamp,
                        version: backupData.version,
                        date: new Date(backupData.timestamp).toLocaleString()
                    });
                } catch (error) {
                    console.warn(`⚠️ Invalid backup: ${key}`);
                }
            }
        }
        
        return backups.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Очистить старые резервные копии
     * @param {number} maxAge - Максимальный возраст в днях (по умолчанию 7)
     */
    cleanupBackups(maxAge = 7) {
        const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000);
        const backups = this.getBackups();
        let deletedCount = 0;
        
        backups.forEach(backup => {
            if (backup.timestamp < cutoffTime) {
                localStorage.removeItem(backup.key);
                deletedCount++;
            }
        });
        
        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old backups`);
        }
    }

    /**
     * Получить статистику модуля
     * @returns {Object} - Статистика
     */
    getStats() {
        const backups = this.getBackups();
        
        return {
            currentVersion: this.currentVersion,
            supportedVersions: ['1.0', '2.0'],
            totalMigrations: this.migrations.size,
            backupsCount: backups.length,
            oldestBackup: backups.length > 0 ? backups[backups.length - 1].date : null,
            newestBackup: backups.length > 0 ? backups[0].date : null
        };
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        this.migrations.clear();
        console.log('🗑️ Migration module destroyed');
    }
}