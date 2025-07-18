/**
 * Canvas Module - Управление холстом, навигацией и панорамированием
 */
export class CanvasModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.container = document.querySelector('.canvas-container');
        this.canvas = document.querySelector('.canvas');
        
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
        
        console.log('🎨 Canvas module initialized');
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
        
        // Создание заметок двойным кликом
        this.container.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Предотвращение скролла на пробел
        window.addEventListener('keydown', this.preventSpaceScroll.bind(this));
        
        // Обработка изменения размера окна
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Центрирование холста по запросу
        this.events.on('canvas:center-request', () => {
            this.centerCanvas();
        });
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
    }

    /**
     * Обработка нажатия клавиш
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    handleKeyDown(e) {
        // Не обрабатывать пробел если открыто модальное окно
        if (document.getElementById('noteModal')) {
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
        if (document.getElementById('noteModal')) {
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
            
            const transform = this.state.get('canvas.transform');
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
            const newTransform = {
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            };
            
            this.state.set('canvas.transform', newTransform);
            this.events.emit('canvas:pan-move', newTransform);
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
    }

    /**
     * Обработка двойного клика
     * @param {MouseEvent} e - Событие мыши
     */
    handleDoubleClick(e) {
        // Создаем заметку только если кликнули по пустому месту
        if (e.target === this.container || e.target === this.canvas) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;
            
            this.events.emit('note:create', { x, y });
            this.events.emit('canvas:note-created', { x, y });
        }
    }

    /**
     * Предотвращение скролла при нажатом пробеле
     * @param {KeyboardEvent} e - Событие клавиатуры
     */
    preventSpaceScroll(e) {
        // Не блокировать пробел если открыто модальное окно
        if (document.getElementById('noteModal')) {
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
    }

    /**
     * Обновление трансформации холста
     */
    updateTransform() {
        const transform = this.state.get('canvas.transform');
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
        const centerTransform = {
            x: containerRect.width / 2 - 200,  // Смещение для начальной заметки
            y: containerRect.height / 2 - 100
        };
        
        this.state.set('canvas.transform', centerTransform);
        this.events.emit('canvas:centered');
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
            const transform = this.state.get('canvas.transform');
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
     * Уничтожение модуля (очистка обработчиков)
     */
    destroy() {
        // Удаляем все обработчики событий
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        window.removeEventListener('keydown', this.preventSpaceScroll.bind(this));
        window.removeEventListener('resize', this.handleResize.bind(this));
        
        console.log('🗑️ Canvas module destroyed');
    }
}