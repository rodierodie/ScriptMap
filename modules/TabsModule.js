/**
 * Tabs Module - Управление системой вкладок и ролей
 * v2.0 - Поддержка удаления всех ролей с подтверждением
 * v2.1 - Полная система сохранения и загрузки проектов
 */
export class TabsModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.tabsContainer = null;
        this.roleModal = null;
        this.deleteConfirmModal = null;
        this.loadConfirmModal = null;
        this.pendingProjectData = null;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.createTabsContainer();
        this.createRoleModal();
        this.createDeleteConfirmModal();
        this.createLoadConfirmModal();
        this.setupEventListeners();
        this.setupStateWatchers();
        this.renderTabs();
        
        console.log('📑 Tabs module initialized');
    }

    /**
     * Создать контейнер вкладок
     */
    createTabsContainer() {
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'tabs-container';
        
        this.tabsContainer.innerHTML = `
            <div class="tabs-header">
                <div class="tab main-tree active" data-tab="main">
                    <span class="tab-icon">🌳</span>
                    <span>Основное дерево</span>
                    <span class="tab-count">0</span>
                </div>
                <button class="add-role-btn" id="addRoleBtn">
                    <span>+</span>
                    <span>Добавить роль</span>
                </button>
                <div class="project-actions">
                    <button class="project-btn save-project-btn" id="saveProjectBtn" title="Сохранить проект">
                        <span class="btn-icon">💾</span>
                        <span class="btn-text">Сохранить</span>
                    </button>
                    <button class="project-btn load-project-btn" id="loadProjectBtn" title="Загрузить проект">
                        <span class="btn-icon">📁</span>
                        <span class="btn-text">Загрузить</span>
                    </button>
                </div>
            </div>
        `;
        
        // Вставить в начало body
        document.body.insertBefore(this.tabsContainer, document.body.firstChild);
    }

    /**
     * Создать модальное окно для создания ролей
     */
    createRoleModal() {
        this.roleModal = document.createElement('div');
        this.roleModal.className = 'role-modal-overlay';
        this.roleModal.id = 'roleModal';
        
        this.roleModal.innerHTML = `
            <div class="role-modal">
                <div class="role-modal-header">
                    <h2 class="role-modal-title">Создать новую роль</h2>
                    <p class="role-modal-subtitle">Укажите название роли для создания новой вкладки</p>
                </div>
                <div class="role-modal-body">
                    <div class="role-input-group">
                        <label class="role-input-label" for="roleNameInput">Название роли</label>
                        <input type="text" id="roleNameInput" class="role-input" 
                               placeholder="Например: Администратор, Клиент, Партнер..." 
                               maxlength="20">
                    </div>
                    <div class="role-suggestions">
                        <div class="role-suggestion" data-role="👨‍💼 Администратор">👨‍💼 Администратор</div>
                        <div class="role-suggestion" data-role="👤 Клиент">👤 Клиент</div>
                        <div class="role-suggestion" data-role="🤝 Партнер">🤝 Партнер</div>
                        <div class="role-suggestion" data-role="🔧 Техподдержка">🔧 Техподдержка</div>
                        <div class="role-suggestion" data-role="📊 Аналитик">📊 Аналитик</div>
                    </div>
                </div>
                <div class="role-modal-footer">
                    <button class="role-modal-btn role-modal-btn-secondary" id="cancelRoleBtn">
                        Отмена
                    </button>
                    <button class="role-modal-btn role-modal-btn-primary" id="saveRoleBtn" disabled>
                        Сохранить роль
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.roleModal);
    }

    /**
     * Создать модальное окно подтверждения удаления
     */
    createDeleteConfirmModal() {
        this.deleteConfirmModal = document.createElement('div');
        this.deleteConfirmModal.className = 'delete-confirm-overlay';
        this.deleteConfirmModal.id = 'deleteConfirmModal';
        
        this.deleteConfirmModal.innerHTML = `
            <div class="delete-confirm-modal">
                <div class="delete-confirm-header">
                    <div class="delete-confirm-icon">⚠️</div>
                    <h2 class="delete-confirm-title">Удалить роль?</h2>
                </div>
                <div class="delete-confirm-body">
                    <p class="delete-confirm-message">
                        Вы действительно хотите удалить роль "<strong id="deleteRoleName">Роль</strong>"?
                    </p>
                    <div class="delete-confirm-details" id="deleteConfirmDetails">
                        <div class="delete-detail">
                            <span class="delete-detail-label">Ссылки в роли:</span>
                            <span class="delete-detail-value" id="deleteReferencesCount">0</span>
                        </div>
                        <div class="delete-detail">
                            <span class="delete-detail-label">Создана:</span>
                            <span class="delete-detail-value" id="deleteCreatedDate">-</span>
                        </div>
                    </div>
                    <div class="delete-confirm-warning">
                        <p>⚠️ <strong>Внимание:</strong> Это действие нельзя отменить. Все ссылки в роли будут удалены, но сами блоки останутся в основном дереве.</p>
                    </div>
                </div>
                <div class="delete-confirm-footer">
                    <button class="delete-confirm-btn delete-confirm-btn-secondary" id="cancelDeleteBtn">
                        Отмена
                    </button>
                    <button class="delete-confirm-btn delete-confirm-btn-danger" id="confirmDeleteBtn">
                        Удалить роль
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.deleteConfirmModal);
    }

    /**
     * Создать модальное окно подтверждения загрузки проекта
     */
    createLoadConfirmModal() {
        this.loadConfirmModal = document.createElement('div');
        this.loadConfirmModal.className = 'load-confirm-overlay';
        this.loadConfirmModal.id = 'loadConfirmModal';
        
        this.loadConfirmModal.innerHTML = `
            <div class="load-confirm-modal">
                <div class="load-confirm-header">
                    <div class="load-confirm-icon">📁</div>
                    <h2 class="load-confirm-title">Загрузить проект?</h2>
                </div>
                <div class="load-confirm-body">
                    <p class="load-confirm-message">
                        Вы хотите загрузить проект "<strong id="loadProjectName">Проект</strong>"?
                    </p>
                    <div class="load-confirm-details" id="loadConfirmDetails">
                        <div class="load-detail">
                            <span class="load-detail-label">Блоки в проекте:</span>
                            <span class="load-detail-value" id="loadBlocksCount">0</span>
                        </div>
                        <div class="load-detail">
                            <span class="load-detail-label">Роли в проекте:</span>
                            <span class="load-detail-value" id="loadRolesCount">0</span>
                        </div>
                        <div class="load-detail">
                            <span class="load-detail-label">Связи в проекте:</span>
                            <span class="load-detail-value" id="loadConnectionsCount">0</span>
                        </div>
                        <div class="load-detail">
                            <span class="load-detail-label">Дата создания:</span>
                            <span class="load-detail-value" id="loadCreatedDate">-</span>
                        </div>
                    </div>
                    <div class="load-confirm-warning">
                        <p>⚠️ <strong>Внимание:</strong> Загрузка проекта заменит все текущие данные (блоки, роли, связи). Текущий проект будет потерян.</p>
                    </div>
                </div>
                <div class="load-confirm-footer">
                    <button class="load-confirm-btn load-confirm-btn-secondary" id="cancelLoadBtn">
                        Отмена
                    </button>
                    <button class="load-confirm-btn load-confirm-btn-primary" id="confirmLoadBtn">
                        Загрузить проект
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.loadConfirmModal);
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Кнопка добавления роли
        const addRoleBtn = document.getElementById('addRoleBtn');
        addRoleBtn.addEventListener('click', () => this.openRoleModal());

        // Кнопки проекта
        const saveProjectBtn = document.getElementById('saveProjectBtn');
        const loadProjectBtn = document.getElementById('loadProjectBtn');
        
        saveProjectBtn.addEventListener('click', () => this.saveProject());
        loadProjectBtn.addEventListener('click', () => this.loadProject());

        // События модального окна создания роли
        this.setupRoleModalEvents();
        
        // События модального окна подтверждения удаления
        this.setupDeleteConfirmModalEvents();
        
        // События модального окна подтверждения загрузки
        this.setupLoadConfirmModalEvents();
        
        // Клики по вкладкам (делегирование)
        this.tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab && !e.target.classList.contains('tab-remove')) {
                this.switchToTab(tab.dataset.tab);
            }
        });

        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // События от других модулей
        this.events.on('block:created', () => this.updateTabCounts());
        this.events.on('block:deleted', () => this.updateTabCounts());
        this.events.on('reference:created', () => this.updateTabCounts());
        this.events.on('reference:deleted', () => this.updateTabCounts());
    }

    /**
     * Сохранить проект
     */
    async saveProject() {
        // Показать индикатор загрузки
        const saveBtn = document.getElementById('saveProjectBtn');
        const originalContent = saveBtn.innerHTML;
        
        try {
            // Визуальная обратная связь
            saveBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Сохранение...</span>';
            saveBtn.disabled = true;
            
            console.log('💾 Starting project save...');
            
            // Получить текущее состояние приложения
            const currentState = this.state.getState();
            
            // Создать проектные метаданные
            const projectMeta = this.generateProjectMeta(currentState);
            
            // Подготовить данные проекта с метаданными
            const projectData = {
                version: "2.0",
                projectMeta: projectMeta,
                data: currentState
            };
            
            // Сериализовать данные
            const dataStr = JSON.stringify(projectData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // Сгенерировать имя файла в формате notes-project-YYYY-MM-DD-HHmm.json
            const fileName = this.generateProjectFileName();
            
            // Создать и выполнить скачивание
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Небольшая задержка для обеспечения начала скачивания
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Освободить память
            URL.revokeObjectURL(link.href);
            
            // Показать уведомление об успехе
            this.events.emit('ui:show-notification', {
                message: `Проект сохранен как ${fileName}`,
                type: 'success',
                duration: 3000
            });
            
            console.log('✅ Project saved successfully:', fileName);
            
            // Эмитировать событие для статистики
            this.events.emit('project:saved', {
                fileName,
                projectMeta,
                size: dataStr.length
            });
            
        } catch (error) {
            console.error('❌ Project save failed:', error);
            
            this.events.emit('ui:show-notification', {
                message: 'Ошибка сохранения проекта',
                type: 'error',
                duration: 3000
            });
        } finally {
            // Восстановить кнопку
            setTimeout(() => {
                saveBtn.innerHTML = originalContent;
                saveBtn.disabled = false;
            }, 500);
        }
    }

    /**
     * Загрузить проект
     */
    loadProject() {
        // Создать скрытый input для выбора файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            console.log('📁 Loading project file:', file.name);
            this.handleProjectFile(file);
        });
        
        // Добавить в DOM и кликнуть
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    /**
     * Обработать выбранный файл проекта
     * @param {File} file - Выбранный файл
     */
    async handleProjectFile(file) {
        const loadBtn = document.getElementById('loadProjectBtn');
        const originalContent = loadBtn.innerHTML;
        
        try {
            // Показать индикатор загрузки
            loadBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Чтение...</span>';
            loadBtn.disabled = true;
            
            // Прочитать файл
            const fileText = await this.readFileAsText(file);
            
            // Парсить JSON
            let projectData;
            try {
                projectData = JSON.parse(fileText);
            } catch (parseError) {
                throw new Error('Файл не является валидным JSON');
            }
            
            // Валидировать структуру проекта
            const validationResult = this.validateProjectFile(projectData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.error);
            }
            
            // Извлечь данные состояния из проекта
            const stateData = this.extractProjectData(projectData);
            
            // Сохранить данные для загрузки и показать подтверждение
            this.pendingProjectData = stateData;
            this.showLoadConfirmation(projectData);
            
        } catch (error) {
            console.error('❌ Project load failed:', error);
            
            this.events.emit('ui:show-notification', {
                message: `Ошибка загрузки: ${error.message}`,
                type: 'error',
                duration: 4000
            });
        } finally {
            // Восстановить кнопку
            setTimeout(() => {
                loadBtn.innerHTML = originalContent;
                loadBtn.disabled = false;
            }, 500);
        }
    }

    /**
     * Прочитать файл как текст
     * @param {File} file - Файл для чтения
     * @returns {Promise<string>} - Содержимое файла
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            
            reader.readAsText(file);
        });
    }

    /**
     * Валидировать файл проекта
     * @param {Object} data - Данные из файла
     * @returns {Object} - Результат валидации {isValid, error}
     */
    validateProjectFile(data) {
        // Проверка базовой структуры
        if (!data || typeof data !== 'object') {
            return { isValid: false, error: 'Файл не содержит валидных данных' };
        }
        
        // Проверка наличия обязательных полей
        if (!data.version) {
            return { isValid: false, error: 'Отсутствует информация о версии' };
        }
        
        if (!data.data) {
            return { isValid: false, error: 'Отсутствуют данные приложения' };
        }
        
        // Проверка версии
        const supportedVersions = ['1.0', '2.0'];
        if (!supportedVersions.includes(data.version)) {
            return { isValid: false, error: `Неподдерживаемая версия: ${data.version}` };
        }
        
        // Проверка структуры данных
        const stateData = data.data;
        if (!stateData || typeof stateData !== 'object') {
            return { isValid: false, error: 'Некорректная структура данных' };
        }
        
        // Проверка обязательных полей состояния
        if (!Array.isArray(stateData.blocks)) {
            return { isValid: false, error: 'Отсутствует массив блоков' };
        }
        
        if (!stateData.roles || typeof stateData.roles !== 'object') {
            return { isValid: false, error: 'Отсутствует объект ролей' };
        }
        
        if (!Array.isArray(stateData.connections)) {
            return { isValid: false, error: 'Отсутствует массив связей' };
        }
        
        console.log('✅ Project file validation passed');
        return { isValid: true };
    }

    /**
     * Извлечь данные состояния из проектного файла
     * @param {Object} projectData - Данные проекта
     * @returns {Object} - Данные состояния приложения
     */
    extractProjectData(projectData) {
        // Для проектов v2.0 данные находятся в поле data
        const stateData = projectData.data;
        
        // Убедиться что все необходимые поля присутствуют
        const extractedData = {
            version: stateData.version || "2.0",
            blocks: stateData.blocks || [],
            roles: stateData.roles || {},
            connections: stateData.connections || [],
            ui: {
                activeTab: 'main',
                theme: stateData.ui?.theme || 'light',
                paletteOpen: false,
                instructionsVisible: false
            },
            canvas: stateData.canvas || {
                transform: { x: 0, y: 0 },
                isDragging: false,
                isPanning: false,
                zoom: 1
            },
            interaction: stateData.interaction || {
                isSpacePressed: false,
                dragItem: null,
                dragOffset: { x: 0, y: 0 },
                panStart: { x: 0, y: 0 }
            },
            settings: stateData.settings || {
                autoSave: true,
                debugMode: false,
                version: "2.0"
            }
        };
        
        console.log('📊 Extracted project data:', {
            blocks: extractedData.blocks.length,
            roles: Object.keys(extractedData.roles).length,
            connections: extractedData.connections.length
        });
        
        return extractedData;
    }

    /**
     * Показать подтверждение загрузки проекта
     * @param {Object} projectData - Данные проекта с метаданными
     */
    showLoadConfirmation(projectData) {
        const projectMeta = projectData.projectMeta || {};
        const data = projectData.data || {};
        
        // Заполнить данные проекта в модальном окне
        document.getElementById('loadProjectName').textContent = projectMeta.name || 'Неизвестный проект';
        document.getElementById('loadBlocksCount').textContent = projectMeta.blocksCount || data.blocks?.length || 0;
        document.getElementById('loadRolesCount').textContent = projectMeta.rolesCount || Object.keys(data.roles || {}).length;
        document.getElementById('loadConnectionsCount').textContent = projectMeta.connectionsCount || data.connections?.length || 0;
        
        // Форматировать дату создания
        let createdDate = '-';
        if (projectMeta.createdAt) {
            try {
                const date = new Date(projectMeta.createdAt);
                createdDate = date.toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                createdDate = projectMeta.createdAt;
            }
        }
        document.getElementById('loadCreatedDate').textContent = createdDate;
        
        // Показать модальное окно
        this.loadConfirmModal.classList.add('visible');
        
        // Фокус на кнопку отмены для безопасности
        setTimeout(() => {
            document.getElementById('cancelLoadBtn').focus();
        }, 100);
        
        this.events.emit('load-confirm-modal:opened', { projectMeta });
    }

    /**
     * Подтвердить загрузку проекта
     */
    confirmProjectLoad() {
        if (!this.pendingProjectData) return;
        
        // Сохранить данные для статистики до очистки
        const projectStats = {
            blocks: this.pendingProjectData.blocks?.length || 0,
            roles: Object.keys(this.pendingProjectData.roles || {}).length,
            connections: this.pendingProjectData.connections?.length || 0
        };
        
        try {
            console.log('🔄 Loading project data into application...');
            
            // Использовать MigrationModule для автоматической миграции
            if (window.app && window.app.modules.migration) {
                const migratedData = window.app.modules.migration.autoMigrate(this.pendingProjectData);
                this.state.setState(migratedData);
            } else {
                // Fallback: прямая загрузка
                this.state.setState(this.pendingProjectData);
            }
            
            // Закрыть модальное окно
            this.closeLoadConfirmModal();
            
            // Переключиться на основное дерево
            this.state.set('ui.activeTab', 'main');
            
            // Показать уведомление об успехе
            this.events.emit('ui:show-notification', {
                message: 'Проект успешно загружен',
                type: 'success',
                duration: 3000
            });
            
            // Эмитировать событие для статистики (используем сохраненные данные)
            this.events.emit('project:loaded', projectStats);
            
            console.log('✅ Project loaded successfully');
            
        } catch (error) {
            console.error('❌ Project load application failed:', error);
            
            this.events.emit('ui:show-notification', {
                message: 'Ошибка применения проекта',
                type: 'error',
                duration: 3000
            });
        } finally {
            // Очистить временные данные
            this.pendingProjectData = null;
        }
    }

    /**
     * Настройка событий модального окна подтверждения загрузки
     */
    setupLoadConfirmModalEvents() {
        const cancelLoadBtn = document.getElementById('cancelLoadBtn');
        const confirmLoadBtn = document.getElementById('confirmLoadBtn');

        // Кнопки
        cancelLoadBtn.addEventListener('click', () => this.closeLoadConfirmModal());
        confirmLoadBtn.addEventListener('click', () => this.confirmProjectLoad());

        // Закрытие по оверлею
        this.loadConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.loadConfirmModal) {
                this.closeLoadConfirmModal();
            }
        });

        // Escape для отмены
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.loadConfirmModal.classList.contains('visible')) {
                this.closeLoadConfirmModal();
            }
        });
    }

    /**
     * Закрыть модальное окно подтверждения загрузки
     */
    closeLoadConfirmModal() {
        this.loadConfirmModal.classList.remove('visible');
        this.pendingProjectData = null;
        this.events.emit('load-confirm-modal:closed');
    }

    /**
     * Генерировать метаданные проекта
     * @param {Object} state - Текущее состояние приложения
     * @returns {Object} - Метаданные проекта
     */
    generateProjectMeta(state) {
        const blocks = state.blocks || [];
        const roles = state.roles || {};
        const connections = state.connections || [];
        
        // Подсчитать общее количество ссылок во всех ролях
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );
        
        // Найти самый старый блок для определения даты создания проекта
        const oldestBlock = blocks.reduce((oldest, block) => {
            return (!oldest || block.createdAt < oldest.createdAt) ? block : oldest;
        }, null);
        
        const createdAt = oldestBlock?.createdAt || Date.now();
        
        return {
            name: this.generateProjectName(state),
            createdAt: new Date(createdAt).toISOString(),
            exportedAt: new Date().toISOString(),
            blocksCount: blocks.length,
            rolesCount: Object.keys(roles).length,
            connectionsCount: connections.length,
            referencesCount: totalReferences,
            version: "2.0"
        };
    }

    /**
     * Генерировать название проекта на основе содержимого
     * @param {Object} state - Текущее состояние приложения
     * @returns {string} - Название проекта
     */
    generateProjectName(state) {
        const blocks = state.blocks || [];
        
        // Если нет блоков
        if (blocks.length === 0) {
            return "Пустой проект";
        }
        
        // Попытаться найти блок с подходящим названием для проекта
        const titleCandidates = blocks
            .filter(block => block.title && block.title.trim().length > 0)
            .map(block => block.title.trim());
            
        if (titleCandidates.length > 0) {
            // Взять первый подходящий заголовок (обычно это главный блок)
            const projectName = titleCandidates[0];
            
            // Ограничить длину и очистить от недопустимых символов
            return projectName.substring(0, 30).replace(/[<>:"/\\|?*]/g, '');
        }
        
        // Если нет подходящих заголовков
        return `Проект (${blocks.length} блоков)`;
    }

    /**
     * Генерировать имя файла проекта
     * @returns {string} - Имя файла в формате notes-project-YYYY-MM-DD-HHmm.json
     */
    generateProjectFileName() {
        const now = new Date();
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        return `notes-project-${year}-${month}-${day}-${hours}${minutes}.json`;
    }

    /**
     * Настройка событий модального окна создания роли
     */
    setupRoleModalEvents() {
        const roleNameInput = document.getElementById('roleNameInput');
        const cancelRoleBtn = document.getElementById('cancelRoleBtn');
        const saveRoleBtn = document.getElementById('saveRoleBtn');

        // Валидация ввода
        roleNameInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            saveRoleBtn.disabled = value.length === 0;
        });

        // Enter для сохранения
        roleNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !saveRoleBtn.disabled) {
                this.createRole(roleNameInput.value.trim());
            }
        });

        // Кнопки
        cancelRoleBtn.addEventListener('click', () => this.closeRoleModal());
        saveRoleBtn.addEventListener('click', () => {
            const roleName = roleNameInput.value.trim();
            if (roleName) {
                this.createRole(roleName);
            }
        });

        // Закрытие по оверлею
        this.roleModal.addEventListener('click', (e) => {
            if (e.target === this.roleModal) {
                this.closeRoleModal();
            }
        });

        // Подсказки
        document.querySelectorAll('.role-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const roleText = suggestion.dataset.role;
                const roleName = roleText.substring(2).trim(); // Убрать эмодзи
                roleNameInput.value = roleName;
                saveRoleBtn.disabled = false;
                roleNameInput.focus();
            });
        });
    }

    /**
     * Настройка событий модального окна подтверждения удаления
     */
    setupDeleteConfirmModalEvents() {
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

        // Кнопки
        cancelDeleteBtn.addEventListener('click', () => this.closeDeleteConfirmModal());
        confirmDeleteBtn.addEventListener('click', () => this.confirmRoleDeletion());

        // Закрытие по оверлею
        this.deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.deleteConfirmModal) {
                this.closeDeleteConfirmModal();
            }
        });

        // Escape для отмены
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.deleteConfirmModal.classList.contains('visible')) {
                this.closeDeleteConfirmModal();
            }
        });
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        // Отслеживание изменений ролей
        this.state.watch('roles', () => {
            this.renderTabs();
        });

        // Отслеживание переключения вкладок
        this.state.watch('ui.activeTab', (newTab, oldTab) => {
            this.updateActiveTab(newTab, oldTab);
        });

        // Отслеживание изменений блоков и ссылок для счетчиков
        this.state.watch('blocks', () => this.updateTabCounts());
    }

    /**
     * Обработка горячих клавиш
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    handleKeydown(e) {
        // Не обрабатывать если открыто модальное окно
        if (document.getElementById('roleModal').classList.contains('visible') ||
            document.getElementById('deleteConfirmModal').classList.contains('visible') ||
            document.getElementById('loadConfirmModal').classList.contains('visible')) {
            if (e.key === 'Escape') {
                this.closeRoleModal();
                this.closeDeleteConfirmModal();
                this.closeLoadConfirmModal();
            }
            return;
        }

        // Горячие клавиши для вкладок
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.switchToTab('main');
                    break;
                case '2':
                case '3':
                case '4':
                case '5':
                    e.preventDefault();
                    const roleIndex = parseInt(e.key) - 2;
                    const roleIds = this.getRoleIds();
                    if (roleIds[roleIndex]) {
                        this.switchToTab(roleIds[roleIndex]);
                    }
                    break;
                case 't':
                    e.preventDefault();
                    this.openRoleModal();
                    break;
            }
        }
    }

    /**
     * Отрендерить все вкладки
     */
    renderTabs() {
        const tabsHeader = this.tabsContainer.querySelector('.tabs-header');
        const addRoleBtn = document.getElementById('addRoleBtn');
        
        // Удалить все роли (кроме основного дерева и кнопки добавления)
        const roleTabs = tabsHeader.querySelectorAll('.tab:not(.main-tree)');
        roleTabs.forEach(tab => tab.remove());
        
        // Добавить вкладки ролей
        const roles = this.state.get('roles');
        Object.values(roles).forEach(role => {
            this.createRoleTab(role, addRoleBtn);
        });
        
        this.updateTabCounts();
    }

    /**
     * Создать вкладку роли (теперь все роли имеют кнопку удаления)
     * @param {Object} role - Данные роли
     * @param {HTMLElement} insertBefore - Элемент, перед которым вставить
     */
    createRoleTab(role, insertBefore) {
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.setAttribute('data-tab', role.id);
        
        tab.innerHTML = `
            <span class="tab-icon">${role.icon}</span>
            <span>${role.name}</span>
            <span class="tab-count">0</span>
            <button class="tab-remove" title="Удалить роль">×</button>
        `;

        // Обработчик удаления - теперь для всех ролей
        const removeBtn = tab.querySelector('.tab-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openDeleteConfirmModal(role.id, role.name);
        });

        insertBefore.parentNode.insertBefore(tab, insertBefore);
    }

    /**
     * Открыть модальное окно подтверждения удаления
     * @param {string} roleId - ID роли
     * @param {string} roleName - Название роли
     */
    openDeleteConfirmModal(roleId, roleName) {
        this.pendingDeleteRoleId = roleId;
        
        const role = this.state.get(`roles.${roleId}`);
        if (!role) return;

        // Заполнить данные роли
        document.getElementById('deleteRoleName').textContent = roleName;
        document.getElementById('deleteReferencesCount').textContent = role.references?.length || 0;
        
        const createdDate = new Date(role.createdAt).toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('deleteCreatedDate').textContent = createdDate;

        this.deleteConfirmModal.classList.add('visible');
        
        // Фокус на кнопку отмены для безопасности
        setTimeout(() => {
            document.getElementById('cancelDeleteBtn').focus();
        }, 100);

        this.events.emit('delete-confirm-modal:opened', { roleId, roleName });
    }

    /**
     * Закрыть модальное окно подтверждения удаления
     */
    closeDeleteConfirmModal() {
        this.deleteConfirmModal.classList.remove('visible');
        this.pendingDeleteRoleId = null;
        this.events.emit('delete-confirm-modal:closed');
    }

    /**
     * Подтвердить удаление роли
     */
    confirmRoleDeletion() {
        if (!this.pendingDeleteRoleId) return;

        const roleId = this.pendingDeleteRoleId;
        const role = this.state.get(`roles.${roleId}`);
        
        // Удалить роль через state manager
        this.state.deleteRole(roleId);
        
        this.closeDeleteConfirmModal();
        
        // Показать уведомление об успешном удалении
        this.events.emit('ui:show-notification', {
            message: `Роль "${role.name}" удалена`,
            type: 'info',
            duration: 2000
        });

        this.events.emit('role:deleted-via-ui', { roleId, role });
    }

    /**
     * Переключиться на вкладку
     * @param {string} tabId - ID вкладки
     */
    switchToTab(tabId) {
        const currentTab = this.state.get('ui.activeTab');
        if (currentTab === tabId) return;

        this.state.switchTab(tabId);
        
        // Эмитируем событие для других модулей
        this.events.emit('tab:switched', { 
            from: currentTab, 
            to: tabId,
            isMainTree: tabId === 'main'
        });
    }

    /**
     * Обновить активную вкладку в UI
     * @param {string} newTab - Новая активная вкладка
     * @param {string} oldTab - Предыдущая активная вкладка
     */
    updateActiveTab(newTab, oldTab) {
        // Обновить классы активности
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${newTab}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Уведомить о смене контекста
        const isMainTree = newTab === 'main';
        this.events.emit('tab:context-changed', {
            tabId: newTab,
            isMainTree,
            canCreateBlocks: isMainTree,
            canCreateReferences: !isMainTree
        });
    }

    /**
     * Обновить счетчики элементов во вкладках
     */
    updateTabCounts() {
        // Счетчик блоков в основном дереве
        const blocksCount = this.state.get('blocks').length;
        const mainTreeTab = document.querySelector('[data-tab="main"] .tab-count');
        if (mainTreeTab) {
            mainTreeTab.textContent = blocksCount;
        }

        // Счетчики ссылок в ролях
        const roles = this.state.get('roles');
        Object.values(roles).forEach(role => {
            const referencesCount = role.references?.length || 0;
            const roleTab = document.querySelector(`[data-tab="${role.id}"] .tab-count`);
            if (roleTab) {
                roleTab.textContent = referencesCount;
            }
        });
    }

    /**
     * Открыть модальное окно создания роли
     */
    openRoleModal() {
        this.roleModal.classList.add('visible');
        
        // Очистить форму
        const roleNameInput = document.getElementById('roleNameInput');
        const saveRoleBtn = document.getElementById('saveRoleBtn');
        
        roleNameInput.value = '';
        saveRoleBtn.disabled = true;
        
        // Фокус на поле ввода
        setTimeout(() => {
            roleNameInput.focus();
        }, 100);

        this.events.emit('role-modal:opened');
    }

    /**
     * Закрыть модальное окно создания роли
     */
    closeRoleModal() {
        this.roleModal.classList.remove('visible');
        this.events.emit('role-modal:closed');
    }

    /**
     * Создать новую роль
     * @param {string} roleName - Название роли
     */
    createRole(roleName) {
        // Проверить уникальность имени
        const roles = this.state.get('roles');
        const nameExists = Object.values(roles).some(role => 
            role.name.toLowerCase() === roleName.toLowerCase()
        );
        
        if (nameExists) {
            alert('Роль с таким названием уже существует');
            return;
        }

        // Создать роль
        const role = this.state.createRole({
            name: roleName,
            icon: '👤'
        });

        // Переключиться на новую роль
        this.switchToTab(role.id);
        
        // Закрыть модальное окно
        this.closeRoleModal();

        this.events.emit('role:created-via-ui', { roleId: role.id, role });
    }

    /**
     * Получить список ID ролей (для горячих клавиш)
     * @returns {Array} - Массив ID ролей
     */
    getRoleIds() {
        const roles = this.state.get('roles');
        return Object.keys(roles);
    }

    /**
     * Получить информацию о текущей вкладке
     * @returns {Object} - Информация о вкладке
     */
    getCurrentTabInfo() {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            return {
                id: 'main',
                name: 'Основное дерево',
                type: 'main',
                isMainTree: true,
                canCreateBlocks: true,
                canCreateReferences: false,
                itemsCount: this.state.get('blocks').length
            };
        } else {
            const role = this.state.get(`roles.${activeTab}`);
            return {
                id: activeTab,
                name: role?.name || 'Неизвестная роль',
                type: 'role',
                isMainTree: false,
                canCreateBlocks: false,
                canCreateReferences: true,
                itemsCount: role?.references?.length || 0,
                role: role
            };
        }
    }

    /**
     * Получить статистику модуля
     * @returns {Object} - Статистика
     */
    getStats() {
        const roles = this.state.get('roles');
        const totalRoles = Object.keys(roles).length;
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );

        return {
            totalTabs: totalRoles + 1, // +1 для основного дерева
            totalRoles,
            totalReferences,
            activeTab: this.state.get('ui.activeTab'),
            allRolesDeletable: true,
            projectActionsAvailable: true,
            projectSaveImplemented: true,
            projectLoadImplemented: true // Теперь реализовано!
        };
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        if (this.tabsContainer) {
            this.tabsContainer.remove();
        }
        if (this.roleModal) {
            this.roleModal.remove();
        }
        if (this.deleteConfirmModal) {
            this.deleteConfirmModal.remove();
        }
        if (this.loadConfirmModal) {
            this.loadConfirmModal.remove();
        }
        
        console.log('🗑️ Tabs module destroyed');
    }
}