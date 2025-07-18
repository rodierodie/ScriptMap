/**
 * Connections Module v2.0 - Связи между блоками с поддержкой системы ролей
 * 
 * Ключевые особенности v2.0:
 * - Связи создаются только между блоками (не ссылками)
 * - Связи отображаются во всех ролях, где есть ссылки на связанные блоки
 * - Позиции связей адаптируются к позициям ссылок в каждой роли
 */
export class ConnectionsModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.canvas = document.querySelector('.canvas');
        this.connectionsLayer = null;
        this.isConnecting = false;
        this.connectingFrom = null;
        this.tempLine = null;
        this.currentContext = null;
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.createConnectionsLayer();
        this.setupEventListeners();
        this.setupStateWatchers();
        
        // Инициализировать массив связей если его нет
        if (!this.state.get('connections')) {
            this.state.set('connections', []);
        }
        
        console.log('🔗 Connections module v2.0 initialized');
    }

    /**
     * Создать слой для отображения связей
     */
    createConnectionsLayer() {
        this.connectionsLayer = document.createElement('div');
        this.connectionsLayer.className = 'connections-layer';
        this.connectionsLayer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 5;
        `;
        
        this.canvas.appendChild(this.connectionsLayer);
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // События создания/удаления блоков и ссылок
        this.events.on('note:created', () => this.renderConnections());
        this.events.on('note:deleted', (item) => {
            if (item.blockId) {
                // Удалена ссылка - не удаляем связи
                this.renderConnections();
            } else {
                // Удален блок - удаляем связи
                this.handleBlockDeleted(item.id || item.blockId);
            }
        });

        this.events.on('block:deleted', (data) => this.handleBlockDeleted(data.blockId));
        this.events.on('note:drag-move', () => this.renderConnections());
        this.events.on('note:updated', () => this.renderConnections());

        // События от системы вкладок
        this.events.on('tab:context-changed', (context) => {
            this.handleContextChange(context);
        });

        // Горячие клавиши для создания связей
        document.addEventListener('keydown', (e) => {
            // Не обрабатывать если открыто модальное окно
            if (document.querySelector('.modal-overlay, .role-modal-overlay.visible')) {
                return;
            }
            
            if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.startConnectionMode();
            }
        });

        // Клик по элементу в режиме соединения
        this.canvas.addEventListener('click', (e) => {
            if (this.isConnecting) {
                const noteElement = e.target.closest('.note');
                if (noteElement) {
                    const blockId = this.getBlockIdFromElement(noteElement);
                    if (blockId) {
                        this.handleBlockClick(blockId, noteElement);
                    }
                }
            }
        });

        // Отмена режима соединения по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isConnecting) {
                this.cancelConnectionMode();
            }
        });

        // Запрос статистики связей
        this.events.on('connections:stats-request', () => {
            this.showConnectionsStats();
        });
    }

    /**
     * Получить ID блока из DOM элемента
     * @param {HTMLElement} element - DOM элемент заметки
     * @returns {string|null} - ID блока
     */
    getBlockIdFromElement(element) {
        // Сначала пробуем получить ID блока (для ссылок)
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
            return blockId;
        }
        
        // Затем пробуем получить ID заметки (для блоков в основном дереве)
        const noteId = element.getAttribute('data-note-id');
        const isReference = element.getAttribute('data-is-reference') === 'true';
        
        if (!isReference && noteId) {
            return noteId;
        }
        
        return null;
    }

    /**
     * Обработка смены контекста вкладки
     * @param {Object} context - Контекст вкладки
     */
    handleContextChange(context) {
        this.currentContext = context;
        
        // Отменить режим соединения при смене вкладки
        if (this.isConnecting) {
            this.cancelConnectionMode();
        }
        
        // Перерисовать связи для нового контекста
        this.renderConnections();
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        this.state.watch('connections', () => {
            this.renderConnections();
        });

        // Перерисовываем связи при изменении трансформации холста
        this.state.watch('canvas.transform', () => {
            this.renderConnections();
        });

        // Перерисовываем при смене вкладки
        this.state.watch('ui.activeTab', () => {
            this.renderConnections();
        });
    }

    /**
     * Начать режим создания связей
     */
    startConnectionMode() {
        if (this.isConnecting) return;
        
        this.isConnecting = true;
        this.connectingFrom = null;
        
        // Добавить визуальные подсказки
        const container = document.querySelector('.canvas-container');
        if (container) {
            container.classList.add('connection-mode');
        }
        
        // Показать уведомление с учетом контекста
        const activeTab = this.state.get('ui.activeTab');
        let message = 'Режим связи: кликните на первый блок, затем на второй. ESC для отмены.';
        
        if (activeTab !== 'main') {
            message += ' Связи создаются между блоками, не ссылками.';
        }
        
        this.showMessage(message);
        
        // Подсветить все элементы
        document.querySelectorAll('.note').forEach(note => {
            note.style.boxShadow = '0 0 10px #4285f4';
        });
    }

    /**
     * Отменить режим создания связей
     */
    cancelConnectionMode() {
        this.isConnecting = false;
        this.connectingFrom = null;
        
        const container = document.querySelector('.canvas-container');
        if (container) {
            container.classList.remove('connection-mode');
        }
        
        // Убрать подсветку
        document.querySelectorAll('.note').forEach(note => {
            note.style.boxShadow = '';
        });
        
        // Удалить временную линию
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }
        
        this.showMessage('Режим связи отменен', 'info', 1500);
    }

    /**
     * Обработка клика по блоку в режиме соединения
     * @param {string} blockId - ID блока
     * @param {HTMLElement} element - DOM элемент
     */
    handleBlockClick(blockId, element) {
        if (!this.connectingFrom) {
            // Выбираем первый блок
            this.connectingFrom = blockId;
            this.highlightElement(element, '#4285f4');
            this.showMessage('Теперь кликните на второй блок для создания связи');
        } else if (this.connectingFrom === blockId) {
            // Кликнули на тот же блок - отмена
            this.cancelConnectionMode();
        } else {
            // Создаем связь между блоками
            this.createConnection(this.connectingFrom, blockId);
            this.cancelConnectionMode();
        }
    }

    /**
     * Создать связь между двумя блоками
     * @param {string} fromBlockId - ID первого блока
     * @param {string} toBlockId - ID второго блока
     * @returns {Object|null} - Созданная связь или null
     */
    createConnection(fromBlockId, toBlockId) {
        const connections = this.state.get('connections');
        
        // Проверить, существуют ли блоки
        const blocks = this.state.get('blocks');
        const fromBlock = blocks.find(b => b.id === fromBlockId);
        const toBlock = blocks.find(b => b.id === toBlockId);
        
        if (!fromBlock || !toBlock) {
            this.showMessage('Один из блоков не найден!', 'error');
            return null;
        }
        
        // Проверить, не существует ли уже такая связь
        const exists = connections.some(conn => 
            (conn.from === fromBlockId && conn.to === toBlockId) ||
            (conn.from === toBlockId && conn.to === fromBlockId)
        );
        
        if (exists) {
            this.showMessage('Связь уже существует!', 'warning');
            return null;
        }
        
        const connection = {
            id: this.generateId(),
            from: fromBlockId,
            to: toBlockId,
            createdAt: Date.now()
        };
        
        this.state.update('connections', (connections) => [...connections, connection]);
        this.showMessage('Связь создана!', 'success', 1500);
        
        this.events.emit('connection:created', connection);
        return connection;
    }

    /**
     * Удалить связь
     * @param {string} connectionId - ID связи
     */
    deleteConnection(connectionId) {
        const connections = this.state.get('connections');
        const connection = connections.find(c => c.id === connectionId);
        
        this.state.update('connections', (connections) =>
            connections.filter(conn => conn.id !== connectionId)
        );
        
        this.events.emit('connection:deleted', { connectionId, connection });
    }

    /**
     * Обработка удаления блока
     * @param {string} blockId - ID удаленного блока
     */
    handleBlockDeleted(blockId) {
        const connections = this.state.get('connections');
        const toDelete = connections.filter(conn => 
            conn.from === blockId || conn.to === blockId
        );
        
        if (toDelete.length > 0) {
            this.state.update('connections', (connections) =>
                connections.filter(conn => 
                    conn.from !== blockId && conn.to !== blockId
                )
            );
            
            this.showMessage(`Удалено связей: ${toDelete.length}`, 'info', 2000);
        }
    }

    /**
     * Отрендерить все связи для текущего контекста
     */
    renderConnections() {
        if (!this.connectionsLayer) return;
        
        // Очистить слой
        this.connectionsLayer.innerHTML = '';
        
        const connections = this.state.get('connections');
        const visibleElements = this.getVisibleElements();
        
        connections.forEach(connection => {
            const fromElement = visibleElements.get(connection.from);
            const toElement = visibleElements.get(connection.to);
            
            // Отображать связь только если оба блока видны в текущем контексте
            if (fromElement && toElement) {
                this.renderConnection(connection, fromElement, toElement);
            }
        });
    }

    /**
     * Получить видимые элементы в текущем контексте
     * @returns {Map} - Map с ID блока -> DOM элемент
     */
    getVisibleElements() {
        const visibleElements = new Map();
        
        document.querySelectorAll('.note').forEach(element => {
            const blockId = this.getBlockIdFromElement(element);
            if (blockId) {
                visibleElements.set(blockId, element);
            }
        });
        
        return visibleElements;
    }

    /**
     * Отрендерить одну связь
     * @param {Object} connection - Объект связи
     * @param {HTMLElement} fromElement - DOM элемент первого блока/ссылки
     * @param {HTMLElement} toElement - DOM элемент второго блока/ссылки
     */
    renderConnection(connection, fromElement, toElement) {
        // Получить позиции элементов
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        const canvasRect = this.canvas.getBoundingClientRect();
        
        // Вычислить центры элементов относительно холста
        const fromCenter = {
            x: fromRect.left + fromRect.width / 2 - canvasRect.left,
            y: fromRect.top + fromRect.height / 2 - canvasRect.top
        };
        
        const toCenter = {
            x: toRect.left + toRect.width / 2 - canvasRect.left,
            y: toRect.top + toRect.height / 2 - canvasRect.top
        };
        
        // Создать контейнер для связи
        const connectionElement = document.createElement('div');
        connectionElement.className = 'connection';
        connectionElement.setAttribute('data-connection-id', connection.id);
        
        // Создать SVG для линии
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 5;
        `;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromCenter.x);
        line.setAttribute('y1', fromCenter.y);
        line.setAttribute('x2', toCenter.x);
        line.setAttribute('y2', toCenter.y);
        
        // Стили линии в зависимости от контекста
        const activeTab = this.state.get('ui.activeTab');
        if (activeTab === 'main') {
            // В основном дереве - обычная линия
            line.setAttribute('stroke', '#4285f4');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '5,5');
        } else {
            // В ролях - другой стиль для различения
            line.setAttribute('stroke', '#34a853');
            line.setAttribute('stroke-width', '2');
            line.setAttribute('stroke-dasharray', '8,4');
        }
        
        line.setAttribute('opacity', '0.8');
        
        svg.appendChild(line);
        
        // Добавить кнопку удаления посередине
        const midX = (fromCenter.x + toCenter.x) / 2;
        const midY = (fromCenter.y + toCenter.y) / 2;
        
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'connection-delete-btn';
        deleteBtn.style.cssText = `
            position: absolute;
            left: ${midX - 12}px;
            top: ${midY - 12}px;
            width: 24px;
            height: 24px;
            background: #ea4335;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            pointer-events: auto;
            opacity: 0;
            transition: all 0.2s;
            z-index: 10;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Удалить связь';
        
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Удалить связь?')) {
                this.deleteConnection(connection.id);
            }
        });
        
        // Создаем область для наведения
        const hoverArea = this.createHoverArea(fromCenter, toCenter);
        
        // Логика показа/скрытия кнопки удаления
        let isHovering = false;
        
        const showDeleteBtn = () => {
            isHovering = true;
            deleteBtn.style.opacity = '1';
            line.setAttribute('stroke-width', '3');
            line.style.filter = 'drop-shadow(0 0 4px rgba(66, 133, 244, 0.5))';
        };
        
        const hideDeleteBtn = () => {
            isHovering = false;
            setTimeout(() => {
                if (!isHovering) {
                    deleteBtn.style.opacity = '0';
                    line.setAttribute('stroke-width', '2');
                    line.style.filter = 'none';
                }
            }, 100);
        };
        
        // События для hover области
        hoverArea.addEventListener('mouseenter', showDeleteBtn);
        hoverArea.addEventListener('mouseleave', hideDeleteBtn);
        
        // События для кнопки удаления
        deleteBtn.addEventListener('mouseenter', () => {
            isHovering = true;
            deleteBtn.style.transform = 'scale(1.2)';
            deleteBtn.style.background = '#d33b2c';
        });
        
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.transform = 'scale(1)';
            deleteBtn.style.background = '#ea4335';
            hideDeleteBtn();
        });
        
        // Собираем элемент связи
        connectionElement.appendChild(svg);
        connectionElement.appendChild(deleteBtn);
        connectionElement.appendChild(hoverArea);
        
        this.connectionsLayer.appendChild(connectionElement);
    }

    /**
     * Создать область для наведения на связь
     * @param {Object} fromCenter - Центр первого элемента
     * @param {Object} toCenter - Центр второго элемента
     * @returns {HTMLElement} - Область для наведения
     */
    createHoverArea(fromCenter, toCenter) {
        const hoverArea = document.createElement('div');
        
        // Вычисляем параметры линии
        const lineLength = Math.sqrt(
            Math.pow(toCenter.x - fromCenter.x, 2) + 
            Math.pow(toCenter.y - fromCenter.y, 2)
        );
        const angle = Math.atan2(
            toCenter.y - fromCenter.y, 
            toCenter.x - fromCenter.x
        ) * (180 / Math.PI);
        
        hoverArea.style.cssText = `
            position: absolute;
            left: ${fromCenter.x}px;
            top: ${fromCenter.y - 10}px;
            width: ${lineLength}px;
            height: 20px;
            pointer-events: auto;
            z-index: 6;
            transform-origin: 0 50%;
            transform: rotate(${angle}deg);
        `;
        
        return hoverArea;
    }

    /**
     * Подсветить элемент
     * @param {HTMLElement} element - DOM элемент
     * @param {string} color - Цвет подсветки
     */
    highlightElement(element, color) {
        element.style.boxShadow = `0 0 15px ${color}`;
    }

    /**
     * Показать сообщение пользователю
     * @param {string} text - Текст сообщения
     * @param {string} type - Тип сообщения
     * @param {number} duration - Длительность показа
     */
    showMessage(text, type = 'info', duration = 3000) {
        // Используем систему уведомлений из UI модуля
        this.events.emit('ui:show-notification', { message: text, type, duration });
    }

    /**
     * Показать статистику связей
     */
    showConnectionsStats() {
        const stats = this.getStats();
        const blocks = this.state.get('blocks');
        const roles = this.state.get('roles');
        
        const message = [
            `🔗 Статистика связей v2.0:`,
            ``,
            `📊 Всего связей: ${stats.totalConnections}`,
            `🧱 Блоков с связями: ${stats.connectedBlocks}`,
            `📄 Изолированных блоков: ${stats.isolatedBlocks}`,
            `🏆 Максимум связей у блока: ${stats.mostConnected}`,
            `📈 Среднее количество связей: ${stats.averageConnections}`,
            ``,
            `👥 Видимость в ролях:`,
            Object.values(roles).map(role => {
                const visibleConnections = this.getVisibleConnectionsForRole(role.id);
                return `• ${role.name}: ${visibleConnections} связей`;
            }).join('\n'),
            ``,
            `💡 Связи создаются между блоками и видны во всех ролях`
        ].join('\n');
        
        alert(message);
    }

    /**
     * Получить количество видимых связей в роли
     * @param {string} roleId - ID роли
     * @returns {number} - Количество видимых связей
     */
    getVisibleConnectionsForRole(roleId) {
        const connections = this.state.get('connections');
        const role = this.state.get(`roles.${roleId}`);
        
        if (!role) return 0;
        
        const roleBlockIds = new Set(role.references.map(ref => ref.blockId));
        
        return connections.filter(conn => 
            roleBlockIds.has(conn.from) && roleBlockIds.has(conn.to)
        ).length;
    }

    /**
     * Получить все связи блока
     * @param {string} blockId - ID блока
     * @returns {Array} - Массив связей
     */
    getBlockConnections(blockId) {
        const connections = this.state.get('connections');
        return connections.filter(conn => 
            conn.from === blockId || conn.to === blockId
        );
    }

    /**
     * Получить связанные блоки
     * @param {string} blockId - ID блока
     * @returns {Array} - Массив связанных блоков
     */
    getConnectedBlocks(blockId) {
        const connections = this.getBlockConnections(blockId);
        const blocks = this.state.get('blocks');
        
        return connections.map(conn => {
            const connectedId = conn.from === blockId ? conn.to : conn.from;
            return blocks.find(block => block.id === connectedId);
        }).filter(Boolean);
    }

    /**
     * Экспорт связей
     * @returns {Object} - Экспортированные данные
     */
    exportConnections() {
        return {
            connections: this.state.get('connections'),
            version: '2.0',
            timestamp: Date.now()
        };
    }

    /**
     * Импорт связей
     * @param {Object} data - Данные для импорта
     */
    importConnections(data) {
        if (data.connections && Array.isArray(data.connections)) {
            this.state.set('connections', data.connections);
            this.showMessage('Связи импортированы', 'success');
        }
    }

    /**
     * Очистить все связи
     */
    clearAllConnections() {
        if (confirm('Удалить все связи?')) {
            this.state.set('connections', []);
            this.showMessage('Все связи удалены', 'info');
        }
    }

    /**
     * Генерация ID
     * @returns {string} - Уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Получить статистику связей v2.0
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        const connections = this.state.get('connections');
        const blocks = this.state.get('blocks');
        
        const blockConnections = new Map();
        connections.forEach(conn => {
            blockConnections.set(conn.from, (blockConnections.get(conn.from) || 0) + 1);
            blockConnections.set(conn.to, (blockConnections.get(conn.to) || 0) + 1);
        });
        
        const connectedBlocks = blockConnections.size;
        const isolatedBlocks = blocks.length - connectedBlocks;
        const mostConnected = Math.max(0, ...blockConnections.values());
        
        return {
            version: '2.0',
            totalConnections: connections.length,
            connectedBlocks,
            isolatedBlocks,
            mostConnected,
            averageConnections: connectedBlocks > 0 ? 
                (connections.length * 2 / connectedBlocks).toFixed(1) : 0,
            blockConnectionCounts: blockConnections
        };
    }

    /**
     * Уничтожение модуля
     */
    destroy() {
        if (this.connectionsLayer) {
            this.connectionsLayer.remove();
        }
        
        console.log('🗑️ Connections module v2.0 destroyed');
    }
}