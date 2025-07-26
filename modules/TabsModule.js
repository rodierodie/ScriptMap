/**
 * Tabs Module - Управление системой вкладок и ролей
 * v3.0 - Новый дизайн хедера с логотипом и dropdown меню
 * Переработанный хедер с названием проекта, логотипом и выпадающим меню
 */
export class TabsModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.tabsContainer = null;
        this.roleModal = null;
        this.deleteConfirmModal = null;
        this.loadConfirmModal = null;
        this.projectInfoModal = null;
        this.pendingProjectData = null;
        this.themeToggleBtn = null;
        this.currentProjectName = 'Платформа Идея'; // Название по умолчанию
        
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
        this.createProjectInfoModal();
        this.setupEventListeners();
        this.setupStateWatchers();
        this.renderTabs();
        
        console.log('📑 Tabs module v3.0 initialized');
    }

    /**
     * Создать контейнер вкладок с новым дизайном
     */
    createTabsContainer() {
        this.tabsContainer = document.createElement('div');
        this.tabsContainer.className = 'tabs-container';
        
        this.tabsContainer.innerHTML = `
            <div class="tabs-header">
                <!-- Логотип и название проекта -->
                <div class="project-branding">
                    <div class="project-logo">
                        <img src="assets/images/logo.png" alt="Logo" class="logo-image">
                    </div>
                    <div class="project-info">
                        <h1 class="project-name" id="projectName">${this.currentProjectName}</h1>
                        <button class="project-dropdown-btn" id="projectDropdownBtn" title="Меню проекта">
                            <img src="assets/icons/chevron-down.svg" alt="Menu" class="dropdown-icon">
                        </button>
                    </div>
                </div>

                <!-- Dropdown меню проекта -->
                <div class="project-dropdown" id="projectDropdown">
                    <div class="dropdown-content">
                        <button class="dropdown-item" id="saveProjectBtn">
                            <span class="item-icon">💾</span>
                            <span class="item-text">Сохранить проект</span>
                        </button>
                        <button class="dropdown-item" id="loadProjectBtn">
                            <span class="item-icon">📁</span>
                            <span class="item-text">Загрузить проект</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" id="projectInfoBtn">
                            <span class="item-icon">📊</span>
                            <span class="item-text">Информация о проекте</span>
                        </button>
                        <button class="dropdown-item" id="themeToggleBtn">
                            <span class="item-icon">🌙</span>
                            <span class="item-text">Переключить тему</span>
                        </button>
                    </div>
                </div>

                <!-- Вкладки -->
                <div class="tabs-navigation">
                    <div class="tab main-tree active" data-tab="main">
                        <span class="tab-icon">🌳</span>
                        <span>Основное дерево</span>
                        <span class="tab-count">0</span>
                    </div>
                    <button class="add-role-btn" id="addRoleBtn">
                        <span>+</span>
                        <span>Добавить роль</span>
                    </button>
                </div>
            </div>
        `;
        
        // Вставить в начало body
        document.body.insertBefore(this.tabsContainer, document.body.firstChild);
    }

    /**
     * Создать модальное окно информации о проекте
     */
    createProjectInfoModal() {
        this.projectInfoModal = document.createElement('div');
        this.projectInfoModal.className = 'project-info-overlay';
        this.projectInfoModal.id = 'projectInfoModal';
        
        this.projectInfoModal.innerHTML = `
            <div class="project-info-modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <span class="modal-icon">📊</span>
                        <h2>Информация о проекте</h2>
                    </div>
                    <button class="modal-close-btn" id="closeProjectInfoBtn">
                        <img src="assets/icons/chevron-up.svg" alt="Close" class="close-icon">
                    </button>
                </div>
                <div class="modal-body">
                    <div class="project-info-section">
                        <h3>Название проекта</h3>
                        <div class="project-name-edit">
                            <input type="text" id="projectNameEdit" class="project-name-input" 
                                   value="${this.currentProjectName}" maxlength="50">
                            <button class="name-save-btn" id="saveProjectNameBtn">Сохранить</button>
                        </div>
                    </div>
                    
                    <div class="project-info-section">
                        <h3>Статистика проекта</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-icon">🧱</div>
                                <div class="stat-info">
                                    <span class="stat-label">Блоки</span>
                                    <span class="stat-value" id="statsBlocks">0</span>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon">👥</div>
                                <div class="stat-info">
                                    <span class="stat-label">Роли</span>
                                    <span class="stat-value" id="statsRoles">0</span>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon">📎</div>
                                <div class="stat-info">
                                    <span class="stat-label">Ссылки</span>
                                    <span class="stat-value" id="statsReferences">0</span>
                                </div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-icon">🔗</div>
                                <div class="stat-info">
                                    <span class="stat-label">Связи</span>
                                    <span class="stat-value" id="statsConnections">0</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="project-info-section">
                        <h3>Детальная информация</h3>
                        <div class="details-info">
                            <div class="detail-row">
                                <span class="detail-label">Тема:</span>
                                <span class="detail-value" id="detailTheme">Светлая</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Последнее изменение:</span>
                                <span class="detail-value" id="detailLastModified">-</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Активная вкладка:</span>
                                <span class="detail-value" id="detailActiveTab">Основное дерево</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.projectInfoModal);
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
                    <div class="role-input-group">
                        <label class="role-input-label" for="roleIconSelect">Иконка роли</label>
                        <div class="role-icon-grid" id="roleIconGrid">
                            <!-- Иконки будут добавлены динамически -->
                        </div>
                    </div>
                </div>
                <div class="role-modal-footer">
                    <button class="role-btn role-btn-secondary" id="cancelRoleBtn">
                        Отмена
                    </button>
                    <button class="role-btn role-btn-primary" id="confirmRoleBtn" disabled>
                        Создать роль
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.roleModal);
    }

    /**
     * Создать модальное окно подтверждения удаления роли
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
                    <div class="delete-confirm-warning">
                        <p>Все ссылки в роли будут удалены, но сами блоки останутся в основном дереве.</p>
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
                        <p>⚠️ <strong>Внимание:</strong> Загрузка проекта заменит все текущие данные (блоки, роли, связи).
                        Текущий проект будет потерян.</p>
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
        // Кнопка dropdown меню проекта
        const dropdownBtn = document.getElementById('projectDropdownBtn');
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleProjectDropdown();
        });

        // Закрытие dropdown при клике вне его
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('projectDropdown');
            if (dropdown && !dropdown.contains(e.target)) {
                this.closeProjectDropdown();
            }
        });

        // Кнопка добавления роли
        const addRoleBtn = document.getElementById('addRoleBtn');
        addRoleBtn.addEventListener('click', () => this.openRoleModal());

        // Кнопки в dropdown меню
        const saveProjectBtn = document.getElementById('saveProjectBtn');
        const loadProjectBtn = document.getElementById('loadProjectBtn');
        const projectInfoBtn = document.getElementById('projectInfoBtn');
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        
        saveProjectBtn.addEventListener('click', () => {
            this.closeProjectDropdown();
            this.saveProject();
        });
        
        loadProjectBtn.addEventListener('click', () => {
            this.closeProjectDropdown();
            this.loadProject();
        });

        projectInfoBtn.addEventListener('click', () => {
            this.closeProjectDropdown();
            this.openProjectInfoModal();
        });

        themeToggleBtn.addEventListener('click', () => {
            this.closeProjectDropdown();
            this.toggleTheme();
        });

        // События модального окна информации о проекте
        this.setupProjectInfoModalEvents();
        
        // События модального окна создания роли
        this.setupRoleModalEvents();
        
        // События модального окна подтверждения удаления
        this.setupDeleteConfirmModalEvents();
        
        // События модального окна подтверждения загрузки
        this.setupLoadConfirmModalEvents();
        
        // Клики по вкладкам (делегирование)
        const tabsNavigation = this.tabsContainer.querySelector('.tabs-navigation');
        tabsNavigation.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (tab && !e.target.classList.contains('tab-remove')) {
                this.switchToTab(tab.dataset.tab);
            }
        });

        // Горячие клавиши
        this.setupHotkeys();
    }

    /**
     * Переключить видимость dropdown меню проекта
     */
    toggleProjectDropdown() {
        const dropdown = document.getElementById('projectDropdown');
        const isVisible = dropdown.classList.contains('visible');
        
        if (isVisible) {
            this.closeProjectDropdown();
        } else {
            this.openProjectDropdown();
        }
    }

    /**
     * Открыть dropdown меню проекта
     */
    openProjectDropdown() {
        const dropdown = document.getElementById('projectDropdown');
        const dropdownBtn = document.getElementById('projectDropdownBtn');
        
        dropdown.classList.add('visible');
        dropdownBtn.classList.add('active');
        
        // Обновить текст кнопки темы
        this.updateThemeToggleText();
    }

    /**
     * Закрыть dropdown меню проекта
     */
    closeProjectDropdown() {
        const dropdown = document.getElementById('projectDropdown');
        const dropdownBtn = document.getElementById('projectDropdownBtn');
        
        dropdown.classList.remove('visible');
        dropdownBtn.classList.remove('active');
    }

    /**
     * Открыть модальное окно информации о проекте
     */
    openProjectInfoModal() {
        this.updateProjectStats();
        this.projectInfoModal.classList.add('visible');
        
        // Фокус на поле ввода названия
        setTimeout(() => {
            document.getElementById('projectNameEdit').focus();
        }, 100);
    }

    /**
     * Закрыть модальное окно информации о проекте
     */
    closeProjectInfoModal() {
        this.projectInfoModal.classList.remove('visible');
    }

    /**
     * Обновить статистику проекта в модальном окне
     */
    updateProjectStats() {
        const blocks = this.state.get('blocks') || [];
        const roles = this.state.get('roles') || {};
        const connections = this.state.get('connections') || [];
        
        // Подсчет ссылок
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );

        // Обновление статистики
        document.getElementById('statsBlocks').textContent = blocks.length;
        document.getElementById('statsRoles').textContent = Object.keys(roles).length;
        document.getElementById('statsReferences').textContent = totalReferences;
        document.getElementById('statsConnections').textContent = connections.length;

        // Обновление детальной информации
        const currentTheme = document.body.classList.contains('dark-theme') ? 'Темная' : 'Светлая';
        document.getElementById('detailTheme').textContent = currentTheme;
        
        const activeTab = this.state.get('ui.activeTab') || 'main';
        const activeTabName = activeTab === 'main' ? 'Основное дерево' : 
                             (roles[activeTab]?.name || 'Неизвестная роль');
        document.getElementById('detailActiveTab').textContent = activeTabName;
        
        document.getElementById('detailLastModified').textContent = new Date().toLocaleString('ru-RU');
    }

    /**
     * Настройка событий модального окна информации о проекте
     */
    setupProjectInfoModalEvents() {
        // Закрытие модального окна
        const closeBtn = document.getElementById('closeProjectInfoBtn');
        closeBtn.addEventListener('click', () => this.closeProjectInfoModal());

        // Клик по overlay для закрытия
        this.projectInfoModal.addEventListener('click', (e) => {
            if (e.target === this.projectInfoModal) {
                this.closeProjectInfoModal();
            }
        });

        // Сохранение названия проекта
        const saveNameBtn = document.getElementById('saveProjectNameBtn');
        const nameInput = document.getElementById('projectNameEdit');
        
        saveNameBtn.addEventListener('click', () => this.saveProjectName());
        
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveProjectName();
            }
        });

        nameInput.addEventListener('input', () => {
            const isValid = nameInput.value.trim().length > 0;
            saveNameBtn.disabled = !isValid;
        });
    }

    /**
     * Сохранить название проекта
     */
    saveProjectName() {
        const nameInput = document.getElementById('projectNameEdit');
        const newName = nameInput.value.trim();
        
        if (newName && newName !== this.currentProjectName) {
            this.currentProjectName = newName;
            document.getElementById('projectName').textContent = newName;
            
            this.events.emit('ui:show-notification', {
                message: 'Название проекта обновлено',
                type: 'success',
                duration: 2000
            });
        }
    }

    /**
     * Обновить текст кнопки переключения темы
     */
    updateThemeToggleText() {
        const themeBtn = document.getElementById('themeToggleBtn');
        const textElement = themeBtn.querySelector('.item-text');
        const iconElement = themeBtn.querySelector('.item-icon');
        
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        
        if (iconElement) {
            iconElement.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        }
        
        if (textElement) {
            textElement.textContent = currentTheme === 'dark' ? 'Светлая тема' : 'Темная тема';
        }
    }

    /**
     * Переключить тему приложения
     */
    toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Переключить класс на body
        if (newTheme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        // Сохранить в localStorage
        localStorage.setItem('notes-app-theme', newTheme);
        
        // Эмитировать событие
        this.events.emit('theme:changed', newTheme);
        
        // Показать уведомление
        this.events.emit('ui:show-notification', {
            message: `Тема изменена на ${newTheme === 'dark' ? 'темную' : 'светлую'}`,
            type: 'info',
            duration: 2000
        });
        
        console.log(`🎨 Theme switched to ${newTheme}`);
    }

    /**
     * Настройка горячих клавиш
     */
    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S - сохранить проект
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }
            
            // Ctrl/Cmd + O - загрузить проект
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.loadProject();
            }
            
            // Ctrl/Cmd + I - информация о проекте
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                this.openProjectInfoModal();
            }

            // Escape - закрыть все модальные окна
            if (e.key === 'Escape') {
                this.closeProjectDropdown();
                this.closeProjectInfoModal();
                this.closeRoleModal();
                this.closeDeleteConfirmModal();
                this.closeLoadConfirmModal();
            }
        });
    }

    /**
     * Экспорт данных приложения с метаданными
     * @param {Object} state - Состояние приложения
     * @returns {Object} - Объект для экспорта
     */
    exportData(state) {
        // Создать метаданные проекта
        const metadata = this.createProjectMetadata(state);
        
        return {
            version: '2.0',
            meta: metadata,
            data: {
                blocks: state.blocks || [],
                roles: state.roles || {},
                connections: state.connections || [],
                ui: {
                    activeTab: state.ui?.activeTab || 'main',
                    theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light'
                },
                project: {
                    name: this.currentProjectName
                }
            }
        };
    }

    /**
     * Создать метаданные проекта
     * @param {Object} state - Состояние приложения
     * @returns {Object} - Метаданные
     */
    createProjectMetadata(state) {
        const blocks = state.blocks || [];
        const roles = state.roles || {};
        const connections = state.connections || [];
        
        // Подсчет ссылок
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );
        
        return {
            name: this.currentProjectName,
            blocksCount: blocks.length,
            rolesCount: Object.keys(roles).length,
            referencesCount: totalReferences,
            connectionsCount: connections.length,
            createdAt: new Date().toISOString(),
            version: '3.0'
        };
    }

    /**
     * Сгенерировать название файла проекта
     * @returns {string} - Название файла
     */
    generateProjectFileName() {
        const projectName = this.currentProjectName
            .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        
        return `${projectName}-${timestamp}.json`;
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
        const supportedVersions = ['1.0', '2.0', '3.0'];
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
     * Показать модальное окно подтверждения загрузки
     * @param {Object} projectMeta - Метаданные проекта
     */
    showLoadConfirmModal(projectMeta) {
        // Заполнить информацию о проекте
        const projectName = projectMeta.name || 'Проект без названия';
        document.getElementById('loadProjectName').textContent = projectName;
        
        document.getElementById('loadBlocksCount').textContent = projectMeta.blocksCount || 0;
        document.getElementById('loadRolesCount').textContent = projectMeta.rolesCount || 0;
        document.getElementById('loadConnectionsCount').textContent = projectMeta.connectionsCount || 0;
        
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
            
            // Загрузить название проекта если есть
            if (this.pendingProjectData.project?.name) {
                this.currentProjectName = this.pendingProjectData.project.name;
                document.getElementById('projectName').textContent = this.currentProjectName;
            }
            
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
            
            // Принудительно перерендерить вкладки после загрузки
            this.forceRerenderTabs();
            
            // Показать уведомление об успехе
            this.events.emit('ui:show-notification', {
                message: 'Проект успешно загружен',
                type: 'success',
                duration: 3000
            });
            
            // Эмитировать событие для статистики
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
     * Отменить загрузку проекта
     */
    cancelProjectLoad() {
        this.pendingProjectData = null;
        this.closeLoadConfirmModal();
        
        this.events.emit('project:load-cancelled');
    }

    /**
     * Закрыть модальное окно подтверждения загрузки
     */
    closeLoadConfirmModal() {
        this.loadConfirmModal.classList.remove('visible');
        this.events.emit('load-confirm-modal:closed');
    }

    /**
     * Настройка событий модального окна подтверждения загрузки
     */
    setupLoadConfirmModalEvents() {
        // Кнопка подтверждения загрузки
        const confirmBtn = document.getElementById('confirmLoadBtn');
        confirmBtn.addEventListener('click', () => this.confirmProjectLoad());

        // Кнопка отмены загрузки
        const cancelBtn = document.getElementById('cancelLoadBtn');
        cancelBtn.addEventListener('click', () => this.cancelProjectLoad());

        // Клик по overlay для закрытия
        this.loadConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.loadConfirmModal) {
                this.cancelProjectLoad();
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

        // Слушать событие загрузки проекта для принудительного перерендера
        this.events.on('project:loaded', () => {
            this.forceRerenderTabs();
        });

        // Слушать полную замену состояния
        this.events.on('state:replaced', () => {
            this.forceRerenderTabs();
        });
    }

    /**
     * Принудительный перерендер всех вкладок
     */
    forceRerenderTabs() {
        console.log('🔄 Force re-rendering tabs after project load');
        
        // Небольшая задержка для завершения обновления состояния
        setTimeout(() => {
            this.renderTabs();
            this.updateTabCounts();
            this.updateThemeToggleText();
        }, 50);
    }

    /**
     * Отрендерить все вкладки
     */
    renderTabs() {
        const tabsNavigation = this.tabsContainer.querySelector('.tabs-navigation');
        const roles = this.state.get('roles');
        
        // Очистить существующие вкладки ролей
        tabsNavigation.querySelectorAll('.tab:not(.main-tree)').forEach(tab => tab.remove());
        
        // Добавить вкладки ролей
        Object.values(roles).forEach(role => {
            const tab = this.createRoleTab(role);
            tabsNavigation.insertBefore(tab, tabsNavigation.querySelector('.add-role-btn'));
        });
        
        // Обновить активную вкладку
        this.updateActiveTab(this.state.get('ui.activeTab'));
        
        // Обновить счетчики
        this.updateTabCounts();
    }

    /**
     * Создать вкладку роли
     * @param {Object} role - Объект роли
     * @returns {HTMLElement} - Элемент вкладки
     */
    createRoleTab(role) {
        const tab = document.createElement('div');
        tab.className = 'tab role-tab';
        tab.dataset.tab = role.id;
        
        tab.innerHTML = `
            <span class="tab-icon">${role.icon}</span>
            <span class="tab-title">${role.name}</span>
            <span class="tab-count">0</span>
            <button class="tab-remove" data-role-id="${role.id}" title="Удалить роль">×</button>
        `;
        
        // Добавить обработчик удаления роли
        const removeBtn = tab.querySelector('.tab-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showDeleteConfirmModal(role.id);
        });
        
        return tab;
    }

    /**
     * Обновить активную вкладку
     * @param {string} activeTabId - ID активной вкладки
     */
    updateActiveTab(activeTabId) {
        const tabsNavigation = this.tabsContainer.querySelector('.tabs-navigation');
        
        // Убрать класс active у всех вкладок
        tabsNavigation.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Добавить класс active нужной вкладке
        const activeTab = tabsNavigation.querySelector(`[data-tab="${activeTabId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    /**
     * Обновить счетчики блоков на вкладках
     */
    updateTabCounts() {
        const blocks = this.state.get('blocks') || [];
        const roles = this.state.get('roles') || {};
        
        // Обновить счетчик основного дерева
        const mainTab = this.tabsContainer.querySelector('.tab.main-tree .tab-count');
        if (mainTab) {
            mainTab.textContent = blocks.length;
        }
        
        // Обновить счетчики ролей
        Object.values(roles).forEach(role => {
            const roleTab = this.tabsContainer.querySelector(`[data-tab="${role.id}"] .tab-count`);
            if (roleTab) {
                roleTab.textContent = role.references?.length || 0;
            }
        });
    }

    /**
     * Переключиться на вкладку
     * @param {string} tabId - ID вкладки
     */
    switchToTab(tabId) {
        this.state.set('ui.activeTab', tabId);
        this.events.emit('tab:switched', tabId);
    }

    /**
     * Настройка событий модального окна создания роли
     */
    setupRoleModalEvents() {
        // Заполнить сетку иконок
        this.populateRoleIcons();
        
        // Кнопка подтверждения создания роли
        const confirmBtn = document.getElementById('confirmRoleBtn');
        confirmBtn.addEventListener('click', () => this.createRole());

        // Кнопка отмены создания роли
        const cancelBtn = document.getElementById('cancelRoleBtn');
        cancelBtn.addEventListener('click', () => this.closeRoleModal());

        // Поле ввода названия роли
        const nameInput = document.getElementById('roleNameInput');
        nameInput.addEventListener('input', () => this.validateRoleForm());
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !confirmBtn.disabled) {
                this.createRole();
            }
        });

        // Клик по overlay для закрытия
        this.roleModal.addEventListener('click', (e) => {
            if (e.target === this.roleModal) {
                this.closeRoleModal();
            }
        });
    }

    /**
     * Заполнить сетку иконок для ролей
     */
    populateRoleIcons() {
        const iconGrid = document.getElementById('roleIconGrid');
        const icons = ['👤', '👥', '👑', '🔧', '📊', '💼', '🎯', '🚀', '⚡', '🔥', '💎', '🎨', '📱', '💻', '🌟', '🎪'];
        
        iconGrid.innerHTML = '';
        
        icons.forEach(icon => {
            const iconBtn = document.createElement('button');
            iconBtn.className = 'role-icon-btn';
            iconBtn.textContent = icon;
            iconBtn.dataset.icon = icon;
            
            iconBtn.addEventListener('click', () => {
                // Убрать выделение у всех иконок
                iconGrid.querySelectorAll('.role-icon-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Выделить выбранную иконку
                iconBtn.classList.add('selected');
                
                // Валидировать форму
                this.validateRoleForm();
            });
            
            iconGrid.appendChild(iconBtn);
        });
        
        // Выбрать первую иконку по умолчанию
        iconGrid.querySelector('.role-icon-btn').click();
    }

    /**
     * Валидировать форму создания роли
     */
    validateRoleForm() {
        const nameInput = document.getElementById('roleNameInput');
        const iconGrid = document.getElementById('roleIconGrid');
        const confirmBtn = document.getElementById('confirmRoleBtn');
        
        const name = nameInput.value.trim();
        const selectedIcon = iconGrid.querySelector('.role-icon-btn.selected');
        
        const isValid = name.length > 0 && selectedIcon && !this.checkRoleNameExists(name);
        
        confirmBtn.disabled = !isValid;
        
        // Показать ошибку если имя уже существует
        if (name.length > 0 && this.checkRoleNameExists(name)) {
            nameInput.style.borderColor = 'var(--color-danger)';
        } else {
            nameInput.style.borderColor = '';
        }
    }

    /**
     * Проверить существование роли с таким именем
     * @param {string} name - Название роли
     * @returns {boolean} - true если роль существует
     */
    checkRoleNameExists(name) {
        const roles = this.state.get('roles') || {};
        return Object.values(roles).some(role => role.name.toLowerCase() === name.toLowerCase());
    }

    /**
     * Создать новую роль
     */
    createRole() {
        const nameInput = document.getElementById('roleNameInput');
        const iconGrid = document.getElementById('roleIconGrid');
        
        const name = nameInput.value.trim();
        const selectedIconBtn = iconGrid.querySelector('.role-icon-btn.selected');
        const icon = selectedIconBtn?.dataset.icon || '👤';
        
        if (!name || this.checkRoleNameExists(name)) {
            return;
        }
        
        // Создать объект роли
        const roleId = `role_${Date.now()}`;
        const role = {
            id: roleId,
            name,
            icon,
            references: [],
            createdAt: new Date().toISOString()
        };
        
        // Добавить роль в состояние
        this.state.set(`roles.${roleId}`, role);
        
        // Закрыть модальное окно
        this.closeRoleModal();
        
        // Переключиться на новую роль
        this.switchToTab(roleId);
        
        // Показать уведомление
        this.events.emit('ui:show-notification', {
            message: `Роль "${name}" создана`,
            type: 'success',
            duration: 3000
        });
        
        // Эмитировать событие
        this.events.emit('role:created', role);
        
        console.log('✅ Role created:', role);
    }

    /**
     * Открыть модальное окно создания роли
     */
    openRoleModal() {
        // Очистить форму
        document.getElementById('roleNameInput').value = '';
        document.getElementById('roleNameInput').style.borderColor = '';
        
        // Сбросить выбор иконки
        this.populateRoleIcons();
        
        // Показать модальное окно
        this.roleModal.classList.add('visible');
        
        // Фокус на поле ввода
        setTimeout(() => {
            document.getElementById('roleNameInput').focus();
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
     * Показать модальное окно подтверждения удаления роли
     * @param {string} roleId - ID роли
     */
    showDeleteConfirmModal(roleId) {
        const role = this.state.get(`roles.${roleId}`);
        if (!role) return;
        
        // Заполнить информацию о роли
        document.getElementById('deleteRoleName').textContent = role.name;
        
        // Сохранить ID роли для подтверждения
        this.deleteConfirmModal.dataset.roleId = roleId;
        
        // Показать модальное окно
        this.deleteConfirmModal.classList.add('visible');
        
        // Фокус на кнопку отмены для безопасности
        setTimeout(() => {
            document.getElementById('cancelDeleteBtn').focus();
        }, 100);
        
        this.events.emit('delete-confirm-modal:opened', { roleId, role });
    }

    /**
     * Подтвердить удаление роли
     */
    confirmRoleDelete() {
        const roleId = this.deleteConfirmModal.dataset.roleId;
        if (!roleId) return;
        
        const role = this.state.get(`roles.${roleId}`);
        if (!role) return;
        
        // Удалить роль из состояния
        this.state.delete(`roles.${roleId}`);
        
        // Переключиться на основное дерево если удаляемая роль была активной
        const activeTab = this.state.get('ui.activeTab');
        if (activeTab === roleId) {
            this.switchToTab('main');
        }
        
        // Закрыть модальное окно
        this.closeDeleteConfirmModal();
        
        // Показать уведомление
        this.events.emit('ui:show-notification', {
            message: `Роль "${role.name}" удалена`,
            type: 'info',
            duration: 3000
        });
        
        // Эмитировать событие
        this.events.emit('role:deleted', { roleId, role });
        
        console.log('🗑️ Role deleted:', role);
    }

    /**
     * Отменить удаление роли
     */
    cancelRoleDelete() {
        this.closeDeleteConfirmModal();
        this.events.emit('role:delete-cancelled');
    }

    /**
     * Закрыть модальное окно подтверждения удаления
     */
    closeDeleteConfirmModal() {
        this.deleteConfirmModal.classList.remove('visible');
        delete this.deleteConfirmModal.dataset.roleId;
        this.events.emit('delete-confirm-modal:closed');
    }

    /**
     * Настройка событий модального окна подтверждения удаления
     */
    setupDeleteConfirmModalEvents() {
        // Кнопка подтверждения удаления
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        confirmBtn.addEventListener('click', () => this.confirmRoleDelete());

        // Кнопка отмены удаления
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        cancelBtn.addEventListener('click', () => this.cancelRoleDelete());

        // Клик по overlay для закрытия
        this.deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === this.deleteConfirmModal) {
                this.cancelRoleDelete();
            }
        });
    }

    /**
     * Сохранить проект
     */
    async saveProject() {
        const saveBtn = document.getElementById('saveProjectBtn');
        const originalContent = saveBtn.innerHTML;
        
        try {
            // Визуальная обратная связь
            saveBtn.innerHTML = `
                <span class="item-icon">⏳</span>
                <span class="item-text">Сохранение...</span>
            `;
            saveBtn.disabled = true;
            
            // Экспорт данных с метаданными
            const projectData = this.exportData(this.state.getState());
            
            // Создать и скачать файл
            const blob = new Blob([JSON.stringify(projectData, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateProjectFileName();
            
            // Добавить link в DOM, кликнуть и удалить
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Освободить URL
            URL.revokeObjectURL(url);
            
            console.log('💾 Project saved successfully');
            
            // Показать уведомление об успехе
            this.events.emit('ui:show-notification', {
                message: 'Проект успешно сохранен',
                type: 'success',
                duration: 3000
            });
            
            this.events.emit('project:saved', projectData.meta);
            
        } catch (error) {
            console.error('❌ Project save failed:', error);
            
            this.events.emit('ui:show-notification', {
                message: `Ошибка сохранения: ${error.message}`,
                type: 'error',
                duration: 4000
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
    async loadProject() {
        const loadBtn = document.getElementById('loadProjectBtn');
        const originalContent = loadBtn.innerHTML;
        
        try {
            // Визуальная обратная связь
            loadBtn.innerHTML = `
                <span class="item-icon">📂</span>
                <span class="item-text">Выбор файла...</span>
            `;
            loadBtn.disabled = true;
            
            // Создать input для выбора файла
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            // Обработчик выбора файла
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    loadBtn.innerHTML = `
                        <span class="item-icon">⏳</span>
                        <span class="item-text">Загрузка...</span>
                    `;
                    
                    const fileContent = await this.readFileAsText(file);
                    const projectData = JSON.parse(fileContent);
                    
                    // Валидация файла
                    const validation = this.validateProjectFile(projectData);
                    if (!validation.isValid) {
                        throw new Error(validation.error);
                    }
                    
                    // Сохранить данные и показать подтверждение
                    this.pendingProjectData = projectData.data;
                    this.showLoadConfirmModal(projectData.meta || {});
                    
                } catch (parseError) {
                    console.error('❌ Project parse failed:', parseError);
                    this.events.emit('ui:show-notification', {
                        message: `Ошибка загрузки: ${parseError.message}`,
                        type: 'error',
                        duration: 4000
                    });
                } finally {
                    document.body.removeChild(fileInput);
                }
            });
            
            // Открыть диалог выбора файла
            fileInput.click();
            
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

    // Остальные методы (renderTabs, createRoleTab, setupRoleModalEvents и т.д.) остаются без изменений...
}