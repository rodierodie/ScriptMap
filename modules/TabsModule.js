/**
 * Tabs Module - Управление системой вкладок и ролей
 */
export class TabsModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.tabsContainer = null;
        this.roleModal = null;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.createTabsContainer();
        this.createRoleModal();
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
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Кнопка добавления роли
        const addRoleBtn = document.getElementById('addRoleBtn');
        addRoleBtn.addEventListener('click', () => this.openRoleModal());

        // События модального окна
        this.setupModalEvents();
        
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
     * Настройка событий модального окна
     */
    setupModalEvents() {
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
        if (document.getElementById('roleModal').classList.contains('visible')) {
            if (e.key === 'Escape') {
                this.closeRoleModal();
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
     * Создать вкладку роли
     * @param {Object} role - Данные роли
     * @param {HTMLElement} insertBefore - Элемент, перед которым вставить
     */
    createRoleTab(role, insertBefore) {
        const tab = document.createElement('div');
        tab.className = `tab ${role.isDefault ? '' : 'custom'}`;
        tab.setAttribute('data-tab', role.id);
        
        tab.innerHTML = `
            <span class="tab-icon">${role.icon}</span>
            <span>${role.name}</span>
            <span class="tab-count">0</span>
            ${!role.isDefault ? '<button class="tab-remove" title="Удалить роль">×</button>' : ''}
        `;

        // Обработчик удаления пользовательских ролей
        if (!role.isDefault) {
            const removeBtn = tab.querySelector('.tab-remove');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRole(role.id, role.name);
            });
        }

        insertBefore.parentNode.insertBefore(tab, insertBefore);
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
     * Удалить роль
     * @param {string} roleId - ID роли
     * @param {string} roleName - Название роли
     */
    deleteRole(roleId, roleName) {
        if (!confirm(`Удалить роль "${roleName}"?`)) {
            return;
        }

        // Удалить роль через state manager
        this.state.deleteRole(roleId);

        this.events.emit('role:deleted-via-ui', { roleId, roleName });
    }

    /**
     * Получить список ID ролей (для горячих клавиш)
     * @returns {Array} - Массив ID ролей
     */
    getRoleIds() {
        const roles = this.state.get('roles');
        return Object.keys(roles).filter(id => roles[id].isDefault);
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
        const customRoles = Object.values(roles).filter(r => !r.isDefault).length;
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );

        return {
            totalTabs: totalRoles + 1, // +1 для основного дерева
            totalRoles,
            defaultRoles: totalRoles - customRoles,
            customRoles,
            totalReferences,
            activeTab: this.state.get('ui.activeTab')
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
        
        console.log('🗑️ Tabs module destroyed');
    }
}