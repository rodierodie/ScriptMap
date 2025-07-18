/**
 * Blocks Palette Module - Палитра блоков для компоновки ролей
 */
export class BlocksPaletteModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.paletteContainer = null;
        this.isOpen = false;
        this.searchQuery = '';
        this.selectedTags = new Set();
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.createPaletteContainer();
        this.setupEventListeners();
        this.setupStateWatchers();
        
        console.log('🎨 Blocks Palette module initialized');
    }

    /**
     * Создать контейнер палитры
     */
    createPaletteContainer() {
        this.paletteContainer = document.createElement('div');
        this.paletteContainer.className = 'blocks-palette';
        this.paletteContainer.id = 'blocksPalette';
        
        this.paletteContainer.innerHTML = `
            <div class="palette-header">
                <div class="palette-title">Палитра блоков</div>
                <div class="palette-subtitle">Выберите блок для добавления на холст</div>
            </div>
            
            <div class="palette-search">
                <input type="text" class="search-input" id="paletteSearch" 
                       placeholder="Поиск блоков...">
            </div>
            
            <div class="palette-filters" id="paletteFilters">
                <!-- Фильтры по тегам будут добавлены динамически -->
            </div>
            
            <div class="palette-content" id="paletteContent">
                <!-- Блоки будут добавлены динамически -->
            </div>
            
            <div class="palette-toggle" id="paletteToggle">◀</div>
        `;
        
        // Добавить в main-content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(this.paletteContainer, mainContent.firstChild);
        }
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Переключатель палитры
        const toggleBtn = document.getElementById('paletteToggle');
        toggleBtn.addEventListener('click', () => this.toggle());

        // Поиск
        const searchInput = document.getElementById('paletteSearch');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderBlocks();
        });

        // События от других модулей
        this.events.on('tab:context-changed', (context) => {
            this.handleContextChange(context);
        });

        this.events.on('block:created', () => this.renderBlocks());
        this.events.on('block:updated', () => this.renderBlocks());
        this.events.on('block:deleted', () => this.renderBlocks());

        // Показать палитру при попытке добавить на роли
        this.events.on('ui:add-reference-request', () => {
            this.open();
        });
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        // Обновлять при изменении блоков
        this.state.watch('blocks', () => {
            this.renderBlocks();
            this.updateFilters();
        });

        // Отслеживать изменения активной вкладки
        this.state.watch('ui.activeTab', (newTab) => {
            this.handleTabSwitch(newTab);
        });
    }

    /**
     * Обработка смены контекста вкладки
     * @param {Object} context - Контекст вкладки
     */
    handleContextChange(context) {
        if (context.canCreateReferences) {
            // В роли - показать палитру
            this.updatePaletteHeader(context.tabId);
            this.renderBlocks();
        } else {
            // В основном дереве - скрыть палитру
            this.close();
        }
    }

    /**
     * Обработка переключения вкладок
     * @param {string} tabId - ID новой вкладки
     */
    handleTabSwitch(tabId) {
        if (tabId === 'main') {
            this.close();
        } else {
            this.updatePaletteHeader(tabId);
            this.renderBlocks();
        }
    }

    /**
     * Обновить заголовок палитры для текущей роли
     * @param {string} roleId - ID роли
     */
    updatePaletteHeader(roleId) {
        const role = this.state.get(`roles.${roleId}`);
        if (!role) return;

        const titleElement = this.paletteContainer.querySelector('.palette-title');
        const subtitleElement = this.paletteContainer.querySelector('.palette-subtitle');
        
        titleElement.textContent = `Палитра для ${role.name}`;
        subtitleElement.textContent = 'Выберите блок для добавления на холст роли';
    }

    /**
     * Открыть палитру
     */
    open() {
        this.isOpen = true;
        this.paletteContainer.classList.add('open');
        
        const toggleBtn = document.getElementById('paletteToggle');
        toggleBtn.textContent = '▶';
        
        this.renderBlocks();
        this.events.emit('palette:opened');
    }

    /**
     * Закрыть палитру
     */
    close() {
        this.isOpen = false;
        this.paletteContainer.classList.remove('open');
        
        const toggleBtn = document.getElementById('paletteToggle');
        toggleBtn.textContent = '◀';
        
        this.events.emit('palette:closed');
    }

    /**
     * Переключить состояние палитры
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * Отрендерить блоки в палитре
     */
    renderBlocks() {
        const content = document.getElementById('paletteContent');
        if (!content) return;

        const blocks = this.getFilteredBlocks();
        const groupedBlocks = this.groupBlocksByTags(blocks);

        content.innerHTML = '';

        if (blocks.length === 0) {
            content.innerHTML = `
                <div class="palette-empty">
                    <div class="empty-icon">📭</div>
                    <div class="empty-title">Блоки не найдены</div>
                    <div class="empty-subtitle">Попробуйте изменить поисковый запрос</div>
                </div>
            `;
            return;
        }

        // Отрендерить группы
        Object.entries(groupedBlocks).forEach(([groupName, groupBlocks]) => {
            const groupElement = this.createBlocksGroup(groupName, groupBlocks);
            content.appendChild(groupElement);
        });
    }

    /**
     * Получить отфильтрованные блоки
     * @returns {Array} - Массив отфильтрованных блоков
     */
    getFilteredBlocks() {
        let blocks = this.state.get('blocks');

        // Фильтр по поисковому запросу
        if (this.searchQuery) {
            blocks = blocks.filter(block => 
                block.title.toLowerCase().includes(this.searchQuery) ||
                block.content.toLowerCase().includes(this.searchQuery) ||
                block.tags.some(tag => tag.toLowerCase().includes(this.searchQuery))
            );
        }

        // Фильтр по выбранным тегам
        if (this.selectedTags.size > 0) {
            blocks = blocks.filter(block =>
                block.tags.some(tag => this.selectedTags.has(tag))
            );
        }

        // Исключить блоки, которые уже добавлены в текущую роль
        const activeTab = this.state.get('ui.activeTab');
        if (activeTab !== 'main') {
            const role = this.state.get(`roles.${activeTab}`);
            const existingBlockIds = new Set(
                role?.references?.map(ref => ref.blockId) || []
            );
            
            blocks = blocks.filter(block => !existingBlockIds.has(block.id));
        }

        return blocks;
    }

    /**
     * Сгруппировать блоки по тегам
     * @param {Array} blocks - Массив блоков
     * @returns {Object} - Объект с группами блоков
     */
    groupBlocksByTags(blocks) {
        const groups = {
            'Без тегов': []
        };

        blocks.forEach(block => {
            if (!block.tags || block.tags.length === 0) {
                groups['Без тегов'].push(block);
            } else {
                // Группировать по первому тегу
                const primaryTag = block.tags[0];
                const groupName = this.formatTagForGroup(primaryTag);
                
                if (!groups[groupName]) {
                    groups[groupName] = [];
                }
                groups[groupName].push(block);
            }
        });

        // Удалить пустые группы
        Object.keys(groups).forEach(groupName => {
            if (groups[groupName].length === 0) {
                delete groups[groupName];
            }
        });

        return groups;
    }

    /**
     * Форматировать тег для группировки
     * @param {string} tag - Тег
     * @returns {string} - Отформатированное название группы
     */
    formatTagForGroup(tag) {
        // Капитализация первой буквы
        return tag.charAt(0).toUpperCase() + tag.slice(1);
    }

    /**
     * Создать группу блоков
     * @param {string} groupName - Название группы
     * @param {Array} blocks - Блоки в группе
     * @returns {HTMLElement} - Элемент группы
     */
    createBlocksGroup(groupName, blocks) {
        const group = document.createElement('div');
        group.className = 'blocks-group';

        const header = document.createElement('div');
        header.className = 'group-header';
        header.innerHTML = `
            <span>${groupName}</span>
            <span class="group-count">${blocks.length}</span>
        `;

        group.appendChild(header);

        blocks.forEach(block => {
            const blockElement = this.createBlockItem(block);
            group.appendChild(blockElement);
        });

        return group;
    }

    /**
     * Создать элемент блока в палитре
     * @param {Object} block - Данные блока
     * @returns {HTMLElement} - Элемент блока
     */
    createBlockItem(block) {
        const item = document.createElement('div');
        item.className = 'block-item';
        item.setAttribute('data-block-id', block.id);

        // Превью содержимого (первые 100 символов)
        const preview = block.content ? 
            block.content.substring(0, 100) + (block.content.length > 100 ? '...' : '') :
            'Пустой блок';

        item.innerHTML = `
            <div class="block-title">${this.escapeHtml(block.title)}</div>
            <div class="block-preview">${this.escapeHtml(preview)}</div>
            <div class="block-tags">
                ${block.tags.map(tag => 
                    `<span class="block-tag" style="background: ${this.getTagColor(tag)}">${this.escapeHtml(tag)}</span>`
                ).join('')}
            </div>
        `;

        // Обработчики событий
        item.addEventListener('click', () => this.selectBlock(block));
        item.addEventListener('dragstart', (e) => this.handleDragStart(e, block));
        item.setAttribute('draggable', 'true');

        return item;
    }

    /**
     * Выбрать блок из палитры
     * @param {Object} block - Выбранный блок
     */
    selectBlock(block) {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            console.warn('Cannot add reference in main tree');
            return;
        }

        // Создать ссылку на блок в активной роли
        const canvasRect = document.querySelector('.canvas').getBoundingClientRect();
        const centerPosition = {
            x: Math.max(0, (window.innerWidth / 2) - canvasRect.left - 100),
            y: Math.max(0, (window.innerHeight / 2) - canvasRect.top - 60)
        };

        this.state.createReference(activeTab, block.id, centerPosition);

        // Закрыть палитру после добавления
        this.close();

        this.events.emit('palette:block-selected', { 
            blockId: block.id, 
            roleId: activeTab,
            block 
        });
    }

    /**
     * Обработка начала перетаскивания
     * @param {DragEvent} e - Событие перетаскивания
     * @param {Object} block - Блок
     */
    handleDragStart(e, block) {
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'palette-block',
            blockId: block.id,
            block: block
        }));

        e.dataTransfer.effectAllowed = 'copy';

        this.events.emit('palette:drag-start', { block });
    }

    /**
     * Обновить фильтры по тегам
     */
    updateFilters() {
        const filtersContainer = document.getElementById('paletteFilters');
        if (!filtersContainer) return;

        const allTags = this.getAllTags();
        
        if (allTags.length === 0) {
            filtersContainer.style.display = 'none';
            return;
        }

        filtersContainer.style.display = 'block';
        filtersContainer.innerHTML = `
            <div class="filters-header">Фильтры:</div>
            <div class="filters-tags">
                ${allTags.map(tag => `
                    <button class="filter-tag ${this.selectedTags.has(tag) ? 'active' : ''}" 
                            data-tag="${this.escapeHtml(tag)}"
                            style="background: ${this.getTagColor(tag)}">
                        ${this.escapeHtml(tag)}
                    </button>
                `).join('')}
            </div>
            ${this.selectedTags.size > 0 ? 
                '<button class="clear-filters">Очистить фильтры</button>' : 
                ''
            }
        `;

        // Обработчики для фильтров
        filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tag')) {
                this.toggleTagFilter(e.target.dataset.tag);
            } else if (e.target.classList.contains('clear-filters')) {
                this.clearFilters();
            }
        });
    }

    /**
     * Получить все уникальные теги
     * @returns {Array} - Массив уникальных тегов
     */
    getAllTags() {
        const blocks = this.state.get('blocks');
        const allTags = new Set();

        blocks.forEach(block => {
            if (block.tags) {
                block.tags.forEach(tag => allTags.add(tag));
            }
        });

        return Array.from(allTags).sort();
    }

    /**
     * Переключить фильтр по тегу
     * @param {string} tag - Тег
     */
    toggleTagFilter(tag) {
        if (this.selectedTags.has(tag)) {
            this.selectedTags.delete(tag);
        } else {
            this.selectedTags.add(tag);
        }

        this.updateFilters();
        this.renderBlocks();
        
        this.events.emit('palette:filter-changed', { 
            selectedTags: Array.from(this.selectedTags) 
        });
    }

    /**
     * Очистить все фильтры
     */
    clearFilters() {
        this.selectedTags.clear();
        this.updateFilters();
        this.renderBlocks();
        
        this.events.emit('palette:filters-cleared');
    }

    /**
     * Получить цвет для тега (такой же как в NotesModule)
     * @param {string} tag - Тег
     * @returns {string} - Цвет в формате hex
     */
    getTagColor(tag) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
            '#FD79A8', '#6C5CE7', '#A29BFE', '#74B9FF', '#0984E3',
            '#00B894', '#00CEC9', '#E17055', '#FDCB6E', '#E84393'
        ];
        
        let hash = 0;
        for (let i = 0; i < tag.length; i++) {
            const char = tag.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        const colorIndex = Math.abs(hash) % colors.length;
        return colors[colorIndex];
    }

    /**
     * Экранирование HTML
     * @param {string} text - Текст
     * @returns {string} - Экранированный текст
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Получить статистику палитры
     * @returns {Object} - Статистика
     */
    getStats() {
        const blocks = this.state.get('blocks');
        const allTags = this.getAllTags();
        const filteredBlocks = this.getFilteredBlocks();

        return {
            totalBlocks: blocks.length,
            filteredBlocks: filteredBlocks.length,
            totalTags: allTags.length,
            selectedTags: this.selectedTags.size,
            isOpen: this.isOpen,
            searchQuery: this.searchQuery
        };
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        if (this.paletteContainer) {
            this.paletteContainer.remove();
        }
        
        console.log('🗑️ Blocks Palette module destroyed');
    }
}