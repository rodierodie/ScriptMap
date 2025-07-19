/**
 * Notes Module v2.0 - Управление блоками и ссылками
 * 
 * Новые функции v2.0:
 * - Различие между блоками (основное дерево) и ссылками (роли)
 * - Создание блоков только в основном дереве
 * - Создание ссылок в ролях
 * - Синхронизация изменений блоков во всех ссылках
 */
export class NotesModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.canvas = document.querySelector('.canvas');
        this.positionUpdateTimeout = null;
        this.isV2Mode = true; // Флаг для новой архитектуры
        
        if (!this.canvas) {
            throw new Error('Canvas element not found in DOM');
        }
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
        this.setupGlobalDragEvents();
        
        console.log('📝 Notes module v2.0 initialized');
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Создание блоков/ссылок в зависимости от контекста
        this.events.on('note:create', (data) => {
            this.createItem(data?.x, data?.y);
        });
        
        // Удаление блоков/ссылок
        this.events.on('note:delete', (itemId) => {
            this.deleteItem(itemId);
        });
        
        // Обновление блоков
        this.events.on('note:update', (data) => {
            this.updateItem(data.id, data.updates);
        });

        // События от системы вкладок
        this.events.on('tab:context-changed', (context) => {
            this.handleContextChange(context);
        });

        // События создания ссылок из палитры
        this.events.on('palette:block-selected', (data) => {
            this.handlePaletteSelection(data);
        });

        // Синхронизация блоков и ссылок
        this.events.on('block:updated', (data) => {
            this.syncBlockToReferences(data.id);
        });
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        // Отслеживание изменений блоков (основное дерево)
        this.state.watch('blocks', (newBlocks, oldBlocks) => {
            this.handleBlocksChange(newBlocks, oldBlocks);
        });

        // Отслеживание изменений ссылок в активной роли
        this.state.watch('ui.activeTab', (newTab) => {
            this.handleTabSwitch(newTab);
        });

        // Отслеживание изменений ссылок в ролях
        const roles = this.state.get('roles');
        Object.keys(roles).forEach(roleId => {
            this.state.watch(`roles.${roleId}.references`, () => {
                this.handleReferencesChange(roleId);
            });
        });
    }

    /**
     * Обработка смены контекста вкладки
     * @param {Object} context - Контекст вкладки
     */
    handleContextChange(context) {
        // Очистить холст
        this.clearCanvas();
        
        // Отрендерить элементы для текущего контекста
        if (context.isMainTree) {
            this.renderBlocks();
        } else {
            this.renderReferences(context.tabId);
        }
    }

    /**
     * Обработка переключения вкладок
     * @param {string} tabId - ID новой вкладки
     */
    handleTabSwitch(tabId) {
        this.clearCanvas();
        
        if (tabId === 'main') {
            this.renderBlocks();
        } else {
            this.renderReferences(tabId);
        }
    }

    /**
     * Обработка выбора блока из палитры
     * @param {Object} data - Данные выбранного блока
     */
    handlePaletteSelection(data) {
        // Ссылка уже создана в state, просто рендерим
        this.renderReferences(data.roleId);
    }

    /**
     * Создать элемент (блок или ссылку) в зависимости от контекста
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @returns {Object} - Созданный элемент
     */
    createItem(x = null, y = null) {
        const activeTab = this.state.get('ui.activeTab');
        const position = {
            x: x !== null ? x : Math.random() * 300 + 100,
            y: y !== null ? y : Math.random() * 200 + 100
        };

        if (activeTab === 'main') {
            // В основном дереве создаем блок
            return this.createBlock(position);
        } else {
            // В роли нельзя создавать новые блоки
            console.warn('Cannot create new blocks in role. Use palette to add references.');
            this.events.emit('ui:show-notification', {
                message: 'Используйте палитру для добавления блоков в роль',
                type: 'warning'
            });
            return null;
        }
    }

    /**
     * Создать новый блок (только в основном дереве)
     * @param {Object} position - Позиция блока
     * @returns {Object} - Созданный блок
     */
    createBlock(position) {
        const block = this.state.createBlock({
            title: 'Новый блок',
            content: '',
            tags: [],
            position
        });
        
        this.events.emit('note:created', block);
        console.log('📝 Block created:', block.id);
        
        return block;
    }

    /**
     * Удалить элемент (блок или ссылку)
     * @param {string} itemId - ID элемента
     */
    deleteItem(itemId) {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            // В основном дереве удаляем блок
            this.deleteBlock(itemId);
        } else {
            // В роли удаляем ссылку
            this.deleteReference(activeTab, itemId);
        }
    }

    /**
     * Удалить блок (только в основном дереве)
     * @param {string} blockId - ID блока
     */
    deleteBlock(blockId) {
        this.state.deleteBlock(blockId);
        console.log('🗑️ Block deleted:', blockId);
    }

    /**
     * Удалить ссылку (только в ролях)
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     */
    deleteReference(roleId, referenceId) {
        this.state.deleteReference(roleId, referenceId);
        console.log('🗑️ Reference deleted:', referenceId);
    }

    /**
     * Обновить элемент
     * @param {string} itemId - ID элемента
     * @param {Object} updates - Обновления
     */
    updateItem(itemId, updates) {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            // В основном дереве обновляем блок
            this.updateBlock(itemId, updates);
        } else {
            // В роли проверяем тип обновления
            if (updates.position) {
                // Обновление позиции ссылки
                this.updateReferencePosition(activeTab, itemId, updates.position);
            } else {
                // Обновление содержимого - найти блок по ссылке
                const reference = this.findReferenceById(activeTab, itemId);
                if (reference) {
                    this.updateBlock(reference.blockId, updates);
                }
            }
        }
    }

    /**
     * Обновить блок
     * @param {string} blockId - ID блока
     * @param {Object} updates - Обновления
     */
    updateBlock(blockId, updates) {
        this.state.updateBlock(blockId, updates);
        this.events.emit('note:updated', { id: blockId, updates });
    }

    /**
     * Обновить позицию ссылки
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     * @param {Object} position - Новая позиция
     */
    updateReferencePosition(roleId, referenceId, position) {
        this.state.updateReference(roleId, referenceId, position);
    }

    /**
     * Найти ссылку по ID
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     * @returns {Object|null} - Ссылка или null
     */
    findReferenceById(roleId, referenceId) {
        const role = this.state.get(`roles.${roleId}`);
        return role?.references?.find(ref => ref.id === referenceId) || null;
    }

    /**
     * Обработка изменений блоков
     * @param {Array} newBlocks - Новые блоки
     * @param {Array} oldBlocks - Старые блоки
     */
    handleBlocksChange(newBlocks, oldBlocks) {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            // В основном дереве рендерим блоки
            this.renderBlocks();
        }
        
        // Обновить все ссылки, если блоки изменились
        this.updateAllReferences();
    }

    /**
     * Обработка изменений ссылок в роли
     * @param {string} roleId - ID роли
     */
    handleReferencesChange(roleId) {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === roleId) {
            this.renderReferences(roleId);
        }
    }

    /**
     * Синхронизировать изменения блока во всех ссылках
     * @param {string} blockId - ID блока
     */
    syncBlockToReferences(blockId) {
        const activeTab = this.state.get('ui.activeTab');
        
        // Обновить все видимые ссылки на этот блок
        document.querySelectorAll(`[data-block-id="${blockId}"]`).forEach(element => {
            if (element.dataset.isReference === 'true') {
                this.updateReferenceElement(element, blockId);
            }
        });
    }

    /**
     * Обновить элемент ссылки
     * @param {HTMLElement} element - DOM элемент
     * @param {string} blockId - ID блока
     */
    updateReferenceElement(element, blockId) {
        const block = this.state.get('blocks').find(b => b.id === blockId);
        if (!block) return;

        // Обновить содержимое (но не позицию)
        const titleElement = element.querySelector('.note-title');
        const previewElement = element.querySelector('.note-preview');
        const tagsContainer = element.querySelector('.note-tags');

        if (titleElement) {
            titleElement.textContent = block.title || 'Новый блок';
        }

        if (previewElement) {
            if (block.content && block.content.trim()) {
                previewElement.textContent = block.content;
                previewElement.classList.remove('empty');
            } else {
                previewElement.textContent = 'Пустой блок';
                previewElement.classList.add('empty');
            }
        }

        if (tagsContainer) {
            this.renderItemTags(tagsContainer, block.tags || []);
        }
    }

    /**
     * Очистить холст
     */
    clearCanvas() {
        this.canvas.querySelectorAll('.note').forEach(note => note.remove());
    }

    /**
     * Отрендерить блоки (основное дерево)
     */
    renderBlocks() {
        this.clearCanvas();
        
        const blocks = this.state.get('blocks');
        blocks.forEach(block => this.renderBlock(block));
    }

    /**
     * Отрендерить ссылки для роли
     * @param {string} roleId - ID роли
     */
    renderReferences(roleId) {
        this.clearCanvas();
        
        const resolvedReferences = this.state.getCurrentTabData('items');
        resolvedReferences.forEach(item => this.renderReference(item, roleId));
    }

    /**
     * Отрендерить блок
     * @param {Object} block - Объект блока
     */
    renderBlock(block) {
        const noteElement = this.createNoteElement(block, false);
        this.canvas.appendChild(noteElement);
        this.setupNoteEvents(noteElement, block.id, false);
    }

    /**
     * Отрендерить ссылку
     * @param {Object} item - Объект элемента (блок + метаданные ссылки)
     * @param {string} roleId - ID роли
     */
    renderReference(item, roleId) {
        const noteElement = this.createNoteElement(item, true);
        this.canvas.appendChild(noteElement);
        this.setupNoteEvents(noteElement, item._reference.id, true, roleId);
    }

    /**
     * Создать DOM элемент заметки
     * @param {Object} item - Данные элемента
     * @param {boolean} isReference - Является ли ссылкой
     * @returns {HTMLElement} - DOM элемент
     */
    createNoteElement(item, isReference) {
        const noteElement = document.createElement('div');
        noteElement.className = `note ${isReference ? 'reference' : ''}`;
        noteElement.setAttribute('data-note-id', isReference ? item._reference.id : item.id);
        noteElement.setAttribute('data-block-id', item.id);
        noteElement.setAttribute('data-is-reference', isReference.toString());
        
        noteElement.style.left = item.position.x + 'px';
        noteElement.style.top = item.position.y + 'px';

        // Создать содержимое
        const title = document.createElement('div');
        title.className = 'note-title';
        title.textContent = item.title || 'Новый блок';

        const preview = document.createElement('div');
        preview.className = 'note-preview';
        if (item.content && item.content.trim()) {
            preview.textContent = item.content;
        } else {
            preview.textContent = 'Пустой блок';
            preview.classList.add('empty');
        }

        // Создать теги
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'note-tags';
        this.renderItemTags(tagsContainer, item.tags || []);

        const openBtn = document.createElement('button');
        openBtn.className = 'note-open-btn';
        openBtn.textContent = 'Открыть';

        // Создать действия
        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const dragHandle = document.createElement('button');
        dragHandle.className = 'drag-handle';
        dragHandle.title = 'Перетащить';

        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'note-action-btn duplicate';
        duplicateBtn.innerHTML = '⧉';
        duplicateBtn.title = isReference ? 'Дублировать ссылку' : 'Дублировать блок';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-action-btn delete';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = isReference ? 'Удалить ссылку' : 'Удалить блок';

        actions.appendChild(dragHandle);
        actions.appendChild(duplicateBtn);
        actions.appendChild(deleteBtn);

        // Собрать элемент
        noteElement.appendChild(title);
        noteElement.appendChild(preview);
        noteElement.appendChild(tagsContainer);
        noteElement.appendChild(openBtn);
        noteElement.appendChild(actions);

        return noteElement;
    }

    /**
     * Отрендерить теги элемента
     * @param {HTMLElement} container - Контейнер для тегов
     * @param {Array} tags - Массив тегов
     */
    renderItemTags(container, tags) {
        container.innerHTML = '';
        
        if (!tags || tags.length === 0) return;

        tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'note-tag';
            tagElement.textContent = tag;
            tagElement.style.backgroundColor = this.getTagColor(tag);
            container.appendChild(tagElement);
        });
    }

    /**
     * Настроить события для элемента заметки
     * @param {HTMLElement} noteElement - DOM элемент
     * @param {string} itemId - ID элемента
     * @param {boolean} isReference - Является ли ссылкой
     * @param {string} roleId - ID роли (для ссылок)
     */
    setupNoteEvents(noteElement, itemId, isReference, roleId = null) {
        const openBtn = noteElement.querySelector('.note-open-btn');
        const dragHandle = noteElement.querySelector('.drag-handle');
        const duplicateBtn = noteElement.querySelector('.note-action-btn.duplicate');
        const deleteBtn = noteElement.querySelector('.note-action-btn.delete');

        // Открытие модального окна
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isReference) {
                const blockId = noteElement.getAttribute('data-block-id');
                this.openNoteModal(blockId);
            } else {
                this.openNoteModal(itemId);
            }
        });

        // Перетаскивание
        dragHandle.addEventListener('mousedown', (e) => {
            this.startDragging(itemId, noteElement, e, isReference, roleId);
        });

        // Дублирование
        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isReference) {
                this.duplicateReference(roleId, itemId);
            } else {
                this.duplicateBlock(itemId);
            }
        });

        // Удаление
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const confirmMessage = isReference ? 
                'Удалить ссылку на блок?' : 
                'Удалить блок? Это также удалит все ссылки на него.';
                
            if (confirm(confirmMessage)) {
                this.deleteItem(itemId);
            }
        });
    }

    /**
     * Дублировать блок
     * @param {string} blockId - ID блока
     */
    duplicateBlock(blockId) {
        const originalBlock = this.state.get('blocks').find(b => b.id === blockId);
        
        if (originalBlock) {
            const newBlock = this.state.createBlock({
                title: originalBlock.title + ' (копия)',
                content: originalBlock.content,
                tags: [...(originalBlock.tags || [])],
                position: {
                    x: originalBlock.position.x + 20,
                    y: originalBlock.position.y + 20
                }
            });
            
            this.events.emit('note:duplicated', { 
                original: originalBlock, 
                duplicate: newBlock 
            });
        }
    }

    /**
     * Дублировать ссылку
     * @param {string} roleId - ID роли
     * @param {string} referenceId - ID ссылки
     */
    duplicateReference(roleId, referenceId) {
        const reference = this.findReferenceById(roleId, referenceId);
        
        if (reference) {
            const newPosition = {
                x: reference.position.x + 20,
                y: reference.position.y + 20
            };
            
            this.state.createReference(roleId, reference.blockId, newPosition);
        }
    }

    /**
     * Обновить все ссылки на блоки
     */
    updateAllReferences() {
        // Обновляем видимые ссылки при изменении блоков
        document.querySelectorAll('.note.reference').forEach(element => {
            const blockId = element.getAttribute('data-block-id');
            if (blockId) {
                this.updateReferenceElement(element, blockId);
            }
        });
    }

    /**
     * Получить цвет для тега
     * @param {string} tag - Название тега
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
     * Открыть модальное окно для редактирования
     * @param {string} blockId - ID блока (не ссылки!)
     */
    openNoteModal(blockId) {
        const block = this.state.get('blocks').find(b => b.id === blockId);
        if (!block) return;

        this.createModal(block);
    }

    /**
     * Создать модальное окно
     * @param {Object} block - Блок для редактирования
     */
    createModal(block) {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'noteModal';

        const tagsString = (block.tags || []).join(', ');

        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <input type="text" class="modal-title-input" 
                           placeholder="Название блока" 
                           value="${this.escapeHtml(block.title)}" 
                           maxlength="100">
                </div>
                <div class="modal-body">
                    <div class="modal-tags-section">
                        <div class="modal-tags-header">
                            <span class="modal-tags-label">Теги</span>
                            <button class="modal-tags-btn" id="tagsToggleBtn">
                                ${block.tags?.length ? 'Редактировать теги' : 'Добавить теги'}
                            </button>
                        </div>
                        
                        <div class="modal-tags-display" id="tagsDisplay"></div>
                        
                        <div class="modal-tags-input-section" id="tagsInputSection">
                            <input type="text" class="modal-tags-input" 
                                   placeholder="Добавьте теги через запятую"
                                   value="${this.escapeHtml(tagsString)}"
                                   id="tagsInput">
                            <div class="modal-tags-preview" id="tagsPreview"></div>
                        </div>
                    </div>
                    <textarea class="modal-content-textarea" 
                              placeholder="Содержимое блока...">${this.escapeHtml(block.content)}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" onclick="closeNoteModal()">
                        Отмена
                    </button>
                    <button class="modal-btn modal-btn-primary" onclick="saveNoteModal('${block.id}')">
                        Сохранить
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Фокус и инициализация
        setTimeout(() => {
            const titleInput = modalOverlay.querySelector('.modal-title-input');
            titleInput.focus();
            titleInput.select();
            this.updateTagsDisplay(modalOverlay);
        }, 100);

        this.setupModalEvents(modalOverlay, block.id);
        this.events.emit('note:modal-opened', block.id);
    }

    /**
     * Настройка событий модального окна
     * @param {HTMLElement} modalOverlay - Модальное окно
     * @param {string} blockId - ID блока
     */
    setupModalEvents(modalOverlay, blockId) {
        const tagsToggleBtn = modalOverlay.querySelector('#tagsToggleBtn');
        const tagsInputSection = modalOverlay.querySelector('#tagsInputSection');
        const tagsInput = modalOverlay.querySelector('#tagsInput');
        const tagsDisplay = modalOverlay.querySelector('#tagsDisplay');
        const tagsPreview = modalOverlay.querySelector('#tagsPreview');
        
        let isEditingTags = false;

        // Переключение режима редактирования тегов
        tagsToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isEditingTags = !isEditingTags;
            
            if (isEditingTags) {
                tagsInputSection.classList.add('visible');
                tagsToggleBtn.textContent = 'Скрыть теги';
                tagsToggleBtn.classList.add('editing');
                // Скрыть основное отображение во время редактирования
                tagsDisplay.style.display = 'none';
                tagsInput.focus();
            } else {
                tagsInputSection.classList.remove('visible');
                tagsToggleBtn.textContent = 'Редактировать теги';
                tagsToggleBtn.classList.remove('editing');
                // Показать основное отображение
                tagsDisplay.style.display = 'flex';
                // Обновить основное отображение с новыми тегами
                this.updateTagsDisplay(modalOverlay);
                // Очистить превью
                tagsPreview.innerHTML = '';
            }
        });

        // Обработка ввода тегов - только превью, без дублирования
        tagsInput.addEventListener('input', () => {
            if (isEditingTags) {
                this.updateTagsPreview(modalOverlay);
            }
        });

        // Обработка Enter в поле тегов
        tagsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                tagsInput.blur();
            }
        });

        // Закрытие по клику на оверлей
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeNoteModal();
            }
        });

        // Закрытие по Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeNoteModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Обновить отображение тегов
     * @param {HTMLElement} modalOverlay - Модальное окно
     */
    updateTagsDisplay(modalOverlay) {
        const tagsDisplay = modalOverlay.querySelector('#tagsDisplay');
        const tagsInput = modalOverlay.querySelector('#tagsInput');
        
        if (!tagsDisplay || !tagsInput) return;
        
        const tagsString = tagsInput.value.trim();
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        tagsDisplay.innerHTML = '';
        
        if (tags.length === 0) {
            tagsDisplay.innerHTML = '<span class="empty-tags-message">Теги не добавлены</span>';
            return;
        }
        
        tags.forEach((tag) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'modal-tag';
            tagElement.style.backgroundColor = this.getTagColor(tag);
            tagElement.innerHTML = `
                ${this.escapeHtml(tag)}
                <button class="modal-tag-remove" data-tag="${this.escapeHtml(tag)}">×</button>
            `;
            
            // Обработчик удаления тега
            const removeBtn = tagElement.querySelector('.modal-tag-remove');
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.removeTag(modalOverlay, tag);
            });
            
            tagsDisplay.appendChild(tagElement);
        });
    }

    /**
     * Обновить превью тегов при вводе (только для режима редактирования)
     * @param {HTMLElement} modalOverlay - Модальное окно
     */
    updateTagsPreview(modalOverlay) {
        const tagsPreview = modalOverlay.querySelector('#tagsPreview');
        const tagsInput = modalOverlay.querySelector('#tagsInput');
        
        if (!tagsPreview || !tagsInput) return;
        
        const tagsString = tagsInput.value.trim();
        const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        tagsPreview.innerHTML = '';
        
        if (tags.length === 0) return;
        
        tags.forEach((tag) => {
            const tagElement = document.createElement('span');
            tagElement.className = 'modal-tag';
            tagElement.style.backgroundColor = this.getTagColor(tag);
            tagElement.textContent = tag;
            tagsPreview.appendChild(tagElement);
        });
    }

    /**
     * Удалить тег
     * @param {HTMLElement} modalOverlay - Модальное окно
     * @param {string} tagToRemove - Тег для удаления
     */
    removeTag(modalOverlay, tagToRemove) {
        const tagsInput = modalOverlay.querySelector('#tagsInput');
        const tagsInputSection = modalOverlay.querySelector('#tagsInputSection');
        
        if (!tagsInput) return;
        
        const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag && tag !== tagToRemove);
        tagsInput.value = tags.join(', ');
        
        // Если сейчас в режиме редактирования, обновить только превью
        if (tagsInputSection && tagsInputSection.classList.contains('visible')) {
            this.updateTagsPreview(modalOverlay);
        } else {
            // Если не в режиме редактирования, обновить основное отображение
            this.updateTagsDisplay(modalOverlay);
        }
    }

    /**
     * Сохранить данные из модального окна
     * @param {string} blockId - ID блока
     * @param {string} title - Заголовок
     * @param {string} content - Содержимое
     * @param {string} tagsString - Строка с тегами
     */
    saveNoteFromModal(blockId, title, content, tagsString) {
        const tags = tagsString ? 
            tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : 
            [];

        const updates = {
            title: title.trim() || 'Новый блок',
            content: content.trim(),
            tags: tags
        };
        
        this.updateBlock(blockId, updates);
        this.events.emit('note:updated-from-modal', { blockId, updates });
    }

    /**
     * Закрыть модальное окно
     */
    closeNoteModal() {
        const modal = document.getElementById('noteModal');
        if (modal) {
            modal.remove();
            this.events.emit('note:modal-closed');
        }
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

    // Методы перетаскивания адаптированы для работы с блоками/ссылками
    startDragging(itemId, noteElement, e, isReference, roleId) {
        this.state.set('canvas.isDragging', true);
        this.state.set('interaction.dragItem', {
            id: itemId,
            type: isReference ? 'reference' : 'block',
            roleId: roleId
        });
        
        noteElement.classList.add('dragging');
        
        const rect = noteElement.getBoundingClientRect();
        this.state.set('interaction.dragOffset', {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        e.preventDefault();
        e.stopPropagation();
        
        this.events.emit('note:drag-start', { 
            itemId, 
            isReference, 
            position: { x: e.clientX, y: e.clientY } 
        });
    }

    setupGlobalDragEvents() {
        document.addEventListener('mousemove', (e) => {
            const dragItem = this.state.get('interaction.dragItem');
            if (this.state.get('canvas.isDragging') && dragItem) {
                this.handleDragMove(e, dragItem);
            }
        });

        document.addEventListener('mouseup', () => {
            this.handleDragEnd();
        });
    }

    handleDragMove(e, dragItem) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const dragOffset = this.state.get('interaction.dragOffset');
        
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;
        
        const newPosition = {
            x: Math.max(0, x),
            y: Math.max(0, y)
        };
        
        this.updateItemPosition(dragItem, newPosition);
        this.events.emit('note:drag-move', { dragItem, position: newPosition });
    }

    updateItemPosition(dragItem, position) {
        // Обновить DOM немедленно
        const noteElement = document.querySelector(`[data-note-id="${dragItem.id}"]`);
        if (noteElement) {
            noteElement.style.left = position.x + 'px';
            noteElement.style.top = position.y + 'px';
        }
        
        // Обновить состояние с debounce
        clearTimeout(this.positionUpdateTimeout);
        this.positionUpdateTimeout = setTimeout(() => {
            if (dragItem.type === 'block') {
                this.updateBlock(dragItem.id, { position });
            } else if (dragItem.type === 'reference') {
                this.updateReferencePosition(dragItem.roleId, dragItem.id, position);
            }
        }, 16);
    }

    handleDragEnd() {
        const dragItem = this.state.get('interaction.dragItem');
        
        if (this.state.get('canvas.isDragging') && dragItem) {
            const noteElement = document.querySelector(`[data-note-id="${dragItem.id}"]`);
            if (noteElement) {
                noteElement.classList.remove('dragging');
                
                // Принудительно сохранить финальную позицию
                clearTimeout(this.positionUpdateTimeout);
                const finalPosition = {
                    x: parseInt(noteElement.style.left),
                    y: parseInt(noteElement.style.top)
                };
                
                if (dragItem.type === 'block') {
                    this.updateBlock(dragItem.id, { position: finalPosition });
                } else if (dragItem.type === 'reference') {
                    this.updateReferencePosition(dragItem.roleId, dragItem.id, finalPosition);
                }
            }
            
            this.state.set('canvas.isDragging', false);
            this.state.set('interaction.dragItem', null);
            
            this.events.emit('note:drag-end', { dragItem });
        }
    }

    /**
     * Получить статистику модуля v2.0
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        const blocks = this.state.get('blocks');
        const roles = this.state.get('roles');
        const totalReferences = Object.values(roles).reduce(
            (sum, role) => sum + (role.references?.length || 0), 0
        );
        
        const totalCharacters = blocks.reduce((sum, block) => sum + (block.content?.length || 0), 0);
        
        return {
            version: '2.0',
            totalBlocks: blocks.length,
            totalReferences,
            totalCharacters,
            averageBlockLength: blocks.length > 0 ? Math.round(totalCharacters / blocks.length) : 0,
            emptyBlocks: blocks.filter(block => !block.content?.trim()).length,
            blocksWithTags: blocks.filter(block => block.tags?.length > 0).length
        };
    }
}