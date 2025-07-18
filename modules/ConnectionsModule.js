/**
 * Connections Module - Самый простой способ связи заметок
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
        
        console.log('🔗 Connections module initialized');
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
        // Слушаем события заметок
        this.events.on('note:created', () => this.renderConnections());
        this.events.on('note:deleted', (note) => this.handleNoteDeleted(note.id));
        this.events.on('note:drag-move', () => this.renderConnections());
        this.events.on('note:updated', () => this.renderConnections());

        // Добавляем обработчики для создания связей
        document.addEventListener('keydown', (e) => {
            // Не обрабатывать если открыто модальное окно
            if (document.getElementById('noteModal')) {
                return;
            }
            
            if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.startConnectionMode();
            }
        });

        // Клик по заметке в режиме соединения
        this.canvas.addEventListener('click', (e) => {
            if (this.isConnecting) {
                const noteElement = e.target.closest('.note');
                if (noteElement) {
                    const noteId = noteElement.getAttribute('data-note-id');
                    this.handleNoteClick(noteId);
                }
            }
        });

        // Отмена режима соединения по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isConnecting) {
                this.cancelConnectionMode();
            }
        });
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
        
        // Показать уведомление
        this.showMessage('Режим связи: кликните на первую заметку, затем на вторую. ESC для отмены.');
        
        // Подсветить все заметки
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
     * Обработка клика по заметке в режиме соединения
     */
    handleNoteClick(noteId) {
        if (!this.connectingFrom) {
            // Выбираем первую заметку
            this.connectingFrom = noteId;
            this.highlightNote(noteId, '#4285f4');
            this.showMessage('Теперь кликните на вторую заметку для создания связи');
        } else if (this.connectingFrom === noteId) {
            // Кликнули на ту же заметку - отмена
            this.cancelConnectionMode();
        } else {
            // Создаем связь
            this.createConnection(this.connectingFrom, noteId);
            this.cancelConnectionMode();
        }
    }

    /**
     * Создать связь между двумя заметками (публичный метод)
     */
    createConnection(fromId, toId) {
        const connections = this.state.get('connections');
        
        // Проверить, не существует ли уже такая связь
        const exists = connections.some(conn => 
            (conn.from === fromId && conn.to === toId) ||
            (conn.from === toId && conn.to === fromId)
        );
        
        if (exists) {
            this.showMessage('Связь уже существует!', 'warning');
            return;
        }
        
        const connection = {
            id: this.generateId(),
            from: fromId,
            to: toId,
            createdAt: Date.now()
        };
        
        this.state.update('connections', (connections) => [...connections, connection]);
        this.showMessage('Связь создана!', 'success', 1500);
        
        this.events.emit('connection:created', connection);
    }

    /**
     * Удалить связь
     */
    deleteConnection(connectionId) {
        this.state.update('connections', (connections) =>
            connections.filter(conn => conn.id !== connectionId)
        );
        
        this.events.emit('connection:deleted', connectionId);
    }

    /**
     * Обработка удаления заметки
     */
    handleNoteDeleted(noteId) {
        const connections = this.state.get('connections');
        const toDelete = connections.filter(conn => 
            conn.from === noteId || conn.to === noteId
        );
        
        if (toDelete.length > 0) {
            this.state.update('connections', (connections) =>
                connections.filter(conn => 
                    conn.from !== noteId && conn.to !== noteId
                )
            );
            
            this.showMessage(`Удалено связей: ${toDelete.length}`, 'info', 2000);
        }
    }

    /**
     * Отрендерить все связи
     */
    renderConnections() {
        if (!this.connectionsLayer) return;
        
        // Очистить слой
        this.connectionsLayer.innerHTML = '';
        
        const connections = this.state.get('connections');
        const notes = this.state.get('notes');
        
        connections.forEach(connection => {
            const fromNote = notes.find(note => note.id === connection.from);
            const toNote = notes.find(note => note.id === connection.to);
            
            if (fromNote && toNote) {
                this.renderConnection(connection, fromNote, toNote);
            }
        });
    }

    /**
     * Отрендерить одну связь
     */
    renderConnection(connection, fromNote, toNote) {
        const fromElement = document.querySelector(`[data-note-id="${fromNote.id}"]`);
        const toElement = document.querySelector(`[data-note-id="${toNote.id}"]`);
        
        if (!fromElement || !toElement) return;
        
        // Получить позиции заметок относительно холста
        const fromCenter = {
            x: fromNote.position.x + 100, // центр заметки (примерная ширина/2)
            y: fromNote.position.y + 60   // центр заметки (примерная высота/2)
        };
        
        const toCenter = {
            x: toNote.position.x + 100,
            y: toNote.position.y + 60
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
        line.setAttribute('stroke', '#4285f4');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.setAttribute('opacity', '0.8');
        
        svg.appendChild(line);
        
        // Добавить кнопку удаления ТОЧНО посередине
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
        
        // Создаем область для наведения (широкая полоса вдоль линии)
        const hoverArea = document.createElement('div');
        
        // Вычисляем параметры линии
        const lineLength = Math.sqrt(Math.pow(toCenter.x - fromCenter.x, 2) + Math.pow(toCenter.y - fromCenter.y, 2));
        const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x) * (180 / Math.PI);
        
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
        
        // Логика показа/скрытия кнопки удаления
        let isHovering = false;
        
        const showDeleteBtn = () => {
            isHovering = true;
            deleteBtn.style.opacity = '1';
            line.setAttribute('stroke', '#1a73e8');
            line.setAttribute('stroke-width', '3');
        };
        
        const hideDeleteBtn = () => {
            isHovering = false;
            setTimeout(() => {
                if (!isHovering) {
                    deleteBtn.style.opacity = '0';
                    line.setAttribute('stroke', '#4285f4');
                    line.setAttribute('stroke-width', '2');
                }
            }, 100);
        };
        
        // События для hover области
        hoverArea.addEventListener('mouseenter', showDeleteBtn);
        hoverArea.addEventListener('mouseleave', hideDeleteBtn);
        
        // События для кнопки удаления (чтобы она не пропадала при наведении)
        deleteBtn.addEventListener('mouseenter', () => {
            isHovering = true;
            deleteBtn.style.opacity = '1';
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
     * Подсветить заметку
     */
    highlightNote(noteId, color) {
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.style.boxShadow = `0 0 15px ${color}`;
        }
    }

    /**
     * Показать сообщение пользователю
     */
    showMessage(text, type = 'info', duration = 3000) {
        // Используем существующую систему уведомлений из UI модуля
        this.events.emit('ui:show-notification', { message: text, type, duration });
        
        // Fallback если UI модуль недоступен
        const existing = document.querySelector('.connection-message');
        if (existing) existing.remove();
        
        const message = document.createElement('div');
        message.className = 'connection-message';
        message.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#34a853' : type === 'warning' ? '#fbbc04' : '#4285f4'};
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10001;
            font-size: 14px;
            transition: opacity 0.3s;
        `;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 300);
        }, duration);
    }

    /**
     * Получить все связи заметки
     */
    getNoteConnections(noteId) {
        const connections = this.state.get('connections');
        return connections.filter(conn => 
            conn.from === noteId || conn.to === noteId
        );
    }

    /**
     * Получить связанные заметки
     */
    getConnectedNotes(noteId) {
        const connections = this.getNoteConnections(noteId);
        const notes = this.state.get('notes');
        
        return connections.map(conn => {
            const connectedId = conn.from === noteId ? conn.to : conn.from;
            return notes.find(note => note.id === connectedId);
        }).filter(Boolean);
    }

    /**
     * Экспорт связей
     */
    exportConnections() {
        return {
            connections: this.state.get('connections'),
            timestamp: Date.now()
        };
    }

    /**
     * Импорт связей
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
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Статистика связей
     */
    getStats() {
        const connections = this.state.get('connections');
        const notes = this.state.get('notes');
        
        const noteConnections = new Map();
        connections.forEach(conn => {
            noteConnections.set(conn.from, (noteConnections.get(conn.from) || 0) + 1);
            noteConnections.set(conn.to, (noteConnections.get(conn.to) || 0) + 1);
        });
        
        const connectedNotes = noteConnections.size;
        const isolatedNotes = notes.length - connectedNotes;
        const mostConnected = Math.max(0, ...noteConnections.values());
        
        return {
            totalConnections: connections.length,
            connectedNotes,
            isolatedNotes,
            mostConnected,
            averageConnections: connectedNotes > 0 ? (connections.length * 2 / connectedNotes).toFixed(1) : 0
        };
    }
}