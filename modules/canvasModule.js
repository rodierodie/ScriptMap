/**
 * Canvas Module v2.0 - Управление холстом с поддержкой вкладок и ролей
 */
export class CanvasModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.container = document.querySelector('.canvas-container');
        this.canvas = document.querySelector('.canvas');
        this.canvasArea = document.querySelector('.canvas-area');
        this.currentContext = null;
        
        if (!this.container || !this.canvas) {
            throw new Error('Canvas elements not found in DOM');
        }
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
        this.initializeCanvasState();
        this.updateCanvasForCurrentTab();
        
        console.log('🎨 Canvas module v2.0 initialized');
    }

    /**
     * Инициализировать состояние холста
     */
    initializeCanvasState() {
        // Убедимся, что базовые значения инициализированы
        if (!this.state.get('canvas.transform')) {
            this.state.set('canvas.transform', { x: 0, y: 0 });
        }
        if (!this.state.get('canvas.zoom')) {
            this.state.set('canvas.zoom', 1);
        }
        if (!this.state.get('canvas.isDragging')) {
            this.state.set('canvas.isDragging', false);
        }
        if (!this.state.get('canvas.isPanning')) {
            this.state.set('canvas.isPanning', false);
        }
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Обработка клавиши пробел
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Панорамирование
        this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Создание блоков/ссылок двойным кликом
        this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Предотвращение скролла на пробел
        window.addEventListener('keydown', this.preventSpaceScroll.bind(this));
        
        // Обработка изменения размера окна
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Центрирование холста по запросу
        this.events.on('canvas:center-request', () => {
            this.centerCanvas();
        });

        // События от системы вкладок
        this.events.on('tab:context-changed', (context) => {
            this.handleContextChange(context);
        });

        // Обработка Drag & Drop из палитры
        this.canvasArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvasArea.addEventListener('drop', this.handleDrop.bind(this));
    }

    /**
     * Обработка смены контекста вкладки
     * @param {Object} context - Контекст вкладки
     */
    handleContextChange(context) {
        this.currentContext = context;
        this.updateCanvasForContext(context);
        
        // Обновить стили контейнера
        this.updateCanvasStyles(context);
    }

    /**
     * Обновить холст для текущего контекста
     * @param {Object} context - Контекст вкладки
     */
    updateCanvasForContext(context) {
        // Обновить класс контейнера для CSS стилей
        this.container.classList.remove('main-tree-mode', 'role-mode');
        
        if (context.isMainTree) {
            this.container.classList.add('main-tree-mode');
        } else {
            this.container.classList.add('role-mode');
        }
        
        // Обновить фоновую сетку если нужно
        this.updateBackgroundGrid(context);
    }

    /**
     * Обновить стили холста
     * @param {Object} context - Контекст вкладки
     */
    updateCanvasStyles(context) {
        if (context.isMainTree) {
            // В основном дереве - обычная сетка
            this.container.style.backgroundImage = 
                'radial-gradient(circle, #ddd 1px, transparent 1px)';
        } else {
            // В ролях - другой цвет сетки для визуального различия
            this.container.style.backgroundImage = 
                'radial-gradient(circle, #34a853 1px, transparent 1px)';
        }
    }

    /**
     * Обновить фоновую сетку
     * @param {Object} context - Контекст вкладки
     */
    updateBackgroundGrid(context) {
        // Можно добавить разные размеры сетки или цвета для разных контекстов
        const gridSize = context.isMainTree ? '20px' : '25px';
        this.container.style.backgroundSize = `${gridSize} ${gridSize}`;
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        // Отслеживание изменений трансформации холста
        this.state.watch('canvas.transform', () => {
            this.updateTransform();
        });
        
        // Отслеживание режима панорамирования
        this.state.watch('canvas.isPanning', (isPanning) => {
            if (isPanning) {
                this.container.classList.add('panning');
            } else {
                this.container.classList.remove('panning');
            }
        });

        // Отслеживание активной вкладки
        this.state.watch('ui.activeTab', () => {
            this.updateCanvasForCurrentTab();
        });
    }

    /**
     * Обновить холст для текущей вкладки
     */
    updateCanvasForCurrentTab() {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            this.currentContext = {
                isMainTree: true,
                canCreateBlocks: true,
                canCreateReferences: false
            };
        } else {
            const role = this.state.get(`roles.${activeTab}`);
            this.currentContext = {
                isMainTree: false,
                canCreateBlocks: false,
                canCreateReferences: true,
                role: role
            };
        }
        
        this.updateCanvasForContext(this.currentContext);
    }

    /**
     * Обработка Drag Over для Drag & Drop
     * @param {DragEvent} e - Событие перетаскивания
     */
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        
        // Добавить визуальную обратную связь
        this.container.classList.add('drag-over');
    }

    /**
     * Обработка Drop для создания ссылок из палитры
     * @param {DragEvent} e - Событие сброса
     */
    handleDrop(e) {
        e.preventDefault();
        this.container.classList.remove('drag-over');
        
        try {
            const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
            
            if (dragData.type === 'palette-block' && this.currentContext && !this.currentContext.isMainTree) {
                // Создать ссылку в текущей роли
                const canvasRect = this.canvas.getBoundingClientRect();
                const position = {
                    x: e.clientX - canvasRect.left,
                    y: e.clientY - canvasRect.top
                };
                
                const activeTab = this.state.get('ui.activeTab');
                this.state.createReference(activeTab, dragData.blockId, position);
                
                this.events.emit('canvas:reference-dropped', {
                    blockId: dragData.blockId,
                    roleId: activeTab,
                    position
                });
            }
        } catch (error) {
            console.warn('Invalid drag data:', error);
        }
    }

    /**
     * Обработка нажатия клавиш
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    handleKeyDown(e) {
        // Не обрабатывать пробел если открыто модальное окно
        if (document.querySelector('.modal-overlay, .role-modal-overlay.visible')) {
            return;
        }

        if (e.code === 'Space' && !this.state.get('interaction.isSpacePressed')) {
            e.preventDefault();
            this.state.set('interaction.isSpacePressed', true);
            this.container.style.cursor = 'grab';
            
            this.events.emit('canvas:space-pressed');
        }
    }

    /**
     * Обработка отпускания клавиш
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    handleKeyUp(e) {
        // Не обрабатывать пробел если открыто модальное окно
        if (document.querySelector('.modal-overlay, .role-modal-overlay.visible')) {
            return;
        }

        if (e.code === 'Space') {
            this.state.set('interaction.isSpacePressed', false);
            this.state.set('canvas.isPanning', false);
            this.container.style.cursor = 'default';
            
            this.events.emit('canvas:space-released');
        }
    }

    /**
     * Обработка нажатия мыши
     * @param {MouseEvent} e - Событие мыши
     */
    handleMouseDown(e) {
        const isSpacePressed = this.state.get('interaction.isSpacePressed');
        const isDragging = this.state.get('canvas.isDragging');
        
        if (isSpacePressed && !isDragging) {
            this.state.set('canvas.isPanning', true);
            
            const transform = this.state.get('canvas.transform') || { x: 0, y: 0 };
            this.state.set('interaction.panStart', {
                x: e.clientX - transform.x,
                y: e.clientY - transform.y
            });
            
            e.preventDefault();
            this.events.emit('canvas:pan-start', { x: e.clientX, y: e.clientY });
        }
    }

    /**
     * Обработка движения мыши
     * @param {MouseEvent} e - Событие мыши
     */
    handleMouseMove(e) {
        const isPanning = this.state.get('canvas.isPanning');
        const isSpacePressed = this.state.get('interaction.isSpacePressed');
        
        if (isPanning && isSpacePressed) {
            const panStart = this.state.get('interaction.panStart');
            if (panStart) {
                const newTransform = {
                    x: e.clientX - panStart.x,
                    y: e.clientY - panStart.y
                };
                
                this.state.set('canvas.transform', newTransform);
                this.events.emit('canvas:pan-move', newTransform);
            }
        }
    }

    /**
     * Обработка отпускания мыши
     */
    handleMouseUp() {
        if (this.state.get('canvas.isPanning')) {
            this.state.set('canvas.isPanning', false);
            this.events.emit('canvas:pan-end');
        }
        
        // Убрать визуальные эффекты drag over
        this.container.classList.remove('drag-over');
    }

    /**
     * Обработка двойного клика
     * @param {MouseEvent} e - Событие мыши
     */
    handleDoubleClick(e) {
        // Создаем элемент только если кликнули по пустому месту
        if (e.target === this.container || e.target === this.canvas) {
            if (!this.currentContext) {
                console.warn('No context available for double click');
                return;
            }

            const canvasRect = this.canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;
            
            if (this.currentContext.canCreateBlocks) {
                // В основном дереве создаем блок
                this.events.emit('note:create', { x, y });
                this.events.emit('canvas:block-created', { x, y });
            } else if (this.currentContext.canCreateReferences) {
                // В роли открываем палитру
                this.events.emit('ui:add-reference-request');
                this.events.emit('canvas:reference-request', { x, y });
            }
        }
    }

    /**
     * Предотвращение скролла при нажатом пробеле
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    preventSpaceScroll(e) {
        // Не блокировать пробел если открыто модальное окно
        if (document.querySelector('.modal-overlay, .role-modal-overlay.visible')) {
            return;
        }

        if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
        }
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        this.events.emit('canvas:resize', {
            width: window.innerWidth,
            height: window.innerHeight
        });
        
        // Обновить размеры холста если нужно
        this.updateCanvasSize();
    }

    /**
     * Обновить размеры холста
     */
    updateCanvasSize() {
        // Динамически изменять размер холста в зависимости от содержимого
        const items = this.getCurrentTabItems();
        
        if (items.length > 0) {
            const bounds = this.calculateContentBounds(items);
            const minWidth = Math.max(5000, bounds.maxX + 500);
            const minHeight = Math.max(5000, bounds.maxY + 500);
            
            this.canvas.style.width = minWidth + 'px';
            this.canvas.style.height = minHeight + 'px';
        }
    }

    /**
     * Получить элементы текущей вкладки
     * @returns {Array} - Массив элементов
     */
    getCurrentTabItems() {
        const activeTab = this.state.get('ui.activeTab');
        
        if (activeTab === 'main') {
            return this.state.get('blocks');
        } else {
            return this.state.getCurrentTabData('items') || [];
        }
    }

    /**
     * Вычислить границы содержимого
     * @param {Array} items - Элементы для анализа
     * @returns {Object} - Объект с границами
     */
    calculateContentBounds(items) {
        let maxX = 0;
        let maxY = 0;
        
        items.forEach(item => {
            if (item.position) {
                maxX = Math.max(maxX, item.position.x + 400); // +400 для ширины заметки
                maxY = Math.max(maxY, item.position.y + 200); // +200 для высоты заметки
            }
        });
        
        return { maxX, maxY };
    }

    /**
     * Обновление трансформации холста
     */
    updateTransform() {
        const transform = this.state.get('canvas.transform') || { x: 0, y: 0 };
        const zoom = this.state.get('canvas.zoom') || 1;
        
        this.canvas.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${zoom})`;
        
        // Обновляем позицию фоновой сетки
        this.container.style.backgroundPosition = `${transform.x}px ${transform.y}px`;
    }

    /**
     * Центрировать холст
     */
    centerCanvas() {
        const containerRect = this.container.getBoundingClientRect();
        const items = this.getCurrentTabItems();
        
        let centerTransform;
        
        if (items.length === 0) {
            // Если нет элементов, центрируем к началу координат
            centerTransform = {
                x: containerRect.width / 2 - 200,
                y: containerRect.height / 2 - 100
            };
        } else {
            // Найти центр всех элементов
            const bounds = this.calculateContentBounds(items);
            const contentCenterX = bounds.maxX / 2;
            const contentCenterY = bounds.maxY / 2;
            
            centerTransform = {
                x: containerRect.width / 2 - contentCenterX,
                y: containerRect.height / 2 - contentCenterY
            };
        }
        
        // Убедимся, что transform инициализирован
        this.state.set('canvas.transform', centerTransform);
        this.events.emit('canvas:centered', { items: items.length });
    }

    /**
     * Зум холста
     * @param {number} delta - Изменение зума (положительное - увеличение)
     * @param {Object} center - Центр зума {x, y}
     */
    zoom(delta, center = null) {
        const currentZoom = this.state.get('canvas.zoom') || 1;
        const newZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
        
        if (center) {
            // Зум относительно точки
            const transform = this.state.get('canvas.transform') || { x: 0, y: 0 };
            const zoomFactor = newZoom / currentZoom;
            
            const newTransform = {
                x: center.x - (center.x - transform.x) * zoomFactor,
                y: center.y - (center.y - transform.y) * zoomFactor
            };
            
            this.state.set('canvas.transform', newTransform);
        }
        
        this.state.set('canvas.zoom', newZoom);
        this.events.emit('canvas:zoomed', { zoom: newZoom, center });
    }

    /**
     * Получить координаты на холсте из координат экрана
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @returns {Object} - {x, y} координаты на холсте
     */
    screenToCanvas(screenX, screenY) {
        const canvasRect = this.canvas.getBoundingClientRect();
        return {
            x: screenX - canvasRect.left,
            y: screenY - canvasRect.top
        };
    }

    /**
     * Получить координаты экрана из координат холста
     * @param {number} canvasX - X координата на холсте
     * @param {number} canvasY - Y координата на холсте
     * @returns {Object} - {x, y} координаты на экране
     */
    canvasToScreen(canvasX, canvasY) {
        const canvasRect = this.canvas.getBoundingClientRect();
        return {
            x: canvasX + canvasRect.left,
            y: canvasY + canvasRect.top
        };
    }

    /**
     * Анимация приветствия для новых пользователей
     */
    playWelcomeAnimation() {
        if (this.state.get('blocks').length === 0) {
            // Показать подсказку для новых пользователей
            this.showCanvasHint('Двойной клик для создания блока', 3000);
        }
    }

    /**
     * Показать подсказку на холсте
     * @param {string} message - Сообщение
     * @param {number} duration - Длительность показа
     */
    showCanvasHint(message, duration = 2000) {
        const hint = document.createElement('div');
        hint.className = 'canvas-hint';
        hint.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            pointer-events: none;
            animation: fadeInOut 0.3s ease;
        `;
        hint.textContent = message;
        
        this.canvasArea.appendChild(hint);
        
        setTimeout(() => {
            hint.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 300);
        }, duration);
    }

    /**
     * Получить информацию о текущем состоянии холста
     * @returns {Object} - Информация о холсте
     */
    getCanvasInfo() {
        const transform = this.state.get('canvas.transform');
        const zoom = this.state.get('canvas.zoom') || 1;
        const items = this.getCurrentTabItems();
        
        return {
            transform,
            zoom,
            itemsCount: items.length,
            context: this.currentContext,
            canvasSize: {
                width: parseInt(this.canvas.style.width) || 5000,
                height: parseInt(this.canvas.style.height) || 5000
            },
            viewport: {
                width: this.container.offsetWidth,
                height: this.container.offsetHeight
            }
        };
    }

    /**
     * Сбросить вид холста
     */
    resetView() {
        this.state.set('canvas.transform', { x: 0, y: 0 });
        this.state.set('canvas.zoom', 1);
        this.events.emit('canvas:view-reset');
    }

    /**
     * Уничтожение модуля (очистка обработчиков)
     */
    destroy() {
        // Удаляем все обработчики событий
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('keydown', this.preventSpaceScroll);
        window.removeEventListener('resize', this.handleResize);
        
        console.log('🗑️ Canvas module v2.0 destroyed');
    }
}