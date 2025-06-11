/**
 * ScriptMap - Главный класс приложения
 * Управляет состоянием, карточками, связями и взаимодействием
 */
class ScriptMapApp {
    constructor() {
        // DOM элементы
        this.canvas = document.getElementById('canvas');
        this.canvasContainer = document.getElementById('canvas-container');
        this.connectionsLayer = document.getElementById('connections-layer');
        this.welcomeHint = document.getElementById('welcome-hint');
        
        // Состояние приложения
        this.cards = new Map();
        this.connections = new Map();
        this.selectedCard = null;
        this.nextCardId = 1;
        
        // Состояние viewport
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Состояние режимов
        this.connectionMode = {
            active: false,
            fromCard: null,
            tempLine: null
        };
        
        // Настройки
        this.settings = {
            autoSave: true,
            autoSaveDelay: 2000,
            gridSize: 20,
            cardDefaultWidth: 200,
            cardDefaultHeight: 140
        };
        
        // Инициализация
        this.init();
    }
    
    /**
     * Инициализация приложения
     */
    init() {
        console.log('🚀 Инициализация ScriptMap...');
        
        this.initDebouncedSave(); // Инициализировать debounced функции
        this.setupEventListeners();
        this.setupCanvasNavigation();
        this.loadFromStorage();
        this.updateStatusBar();
        
        console.log('✅ ScriptMap готов к работе!');
    }
    
    /**
     * Настройка всех обработчиков событий
     */
    setupEventListeners() {
        // Основные кнопки интерфейса
        document.getElementById('add-card-btn').addEventListener('click', () => {
            this.createCardAtCenter();
        });
        
        document.getElementById('zoom-fit-btn').addEventListener('click', () => {
            this.zoomToFit();
        });
        
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveToStorage();
        });
        
        document.getElementById('export-btn').addEventListener('click', () => {
            this.showExportDialog();
        });
        
        document.getElementById('import-btn').addEventListener('click', () => {
            this.showImportDialog();
        });
        
        // Двойной клик по холсту для создания карточки
        this.canvas.addEventListener('dblclick', (e) => {
            if (e.target === this.canvas) {
                const rect = this.canvasContainer.getBoundingClientRect();
                const x = (e.clientX - rect.left - this.panX) / this.zoom;
                const y = (e.clientY - rect.top - this.panY) / this.zoom;
                this.createCard(x, y);
            }
        });
        
        // Клик по пустому месту снимает выделение
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                this.selectCard(null);
            }
        });
        
        // Обработчики панели типов карточек
        document.querySelectorAll('.card-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.createCardAtCenter(type);
            });
        });
        
        // Импорт файлов
        document.getElementById('file-import').addEventListener('change', (e) => {
            this.handleFileImport(e);
        });
    }
    
    /**
     * Создание карточки в центре экрана
     */
    createCardAtCenter(type = 'scene') {
        const centerX = (this.canvasContainer.offsetWidth / 2 - this.panX) / this.zoom;
        const centerY = (this.canvasContainer.offsetHeight / 2 - this.panY) / this.zoom;
        
        // Добавляем небольшое смещение для каждой новой карточки
        const offset = this.cards.size * 20;
        this.createCard(centerX + offset, centerY + offset, { type });
    }
    
    /**
     * Создание новой карточки
     */
    createCard(x, y, data = {}) {
        const cardId = `card_${this.nextCardId++}`;
        
        const cardData = {
            id: cardId,
            x: Math.round(x),
            y: Math.round(y),
            width: this.settings.cardDefaultWidth,
            height: this.settings.cardDefaultHeight,
            type: data.type || 'scene',
            title: data.title || this.getDefaultTitle(data.type || 'scene'),
            content: data.content || '',
            connections: data.connections || [],
            created: Date.now(),
            modified: Date.now()
        };
        
        // Создать DOM элемент
        const cardElement = this.createCardElement(cardData);
        this.canvas.appendChild(cardElement);
        
        // Сохранить в состоянии
        this.cards.set(cardId, cardData);
        
        // Скрыть welcome hint при создании первой карточки
        if (this.cards.size === 1 && this.welcomeHint) {
            this.welcomeHint.style.display = 'none';
        }
        
        // Выделить новую карточку
        this.selectCard(cardId);
        
        // Автосохранение
        this.debouncedSave && this.debouncedSave();
        this.updateStatusBar();
        
        console.log(`✨ Создана карточка: ${cardId} (${cardData.type})`);
        return cardId;
    }
    
    /**
     * Создание DOM элемента карточки
     */
    createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = `card card-type-${cardData.type} absolute bg-white rounded-lg shadow-md border cursor-move select-none min-w-48 min-h-32 p-4 hover:shadow-lg transition-shadow duration-200`;
        card.id = cardData.id;
        card.style.left = cardData.x + 'px';
        card.style.top = cardData.y + 'px';
        card.style.width = cardData.width + 'px';
        card.style.minHeight = cardData.height + 'px';
        
        card.innerHTML = `
            <div class="card-header flex items-center justify-between mb-3">
                <input type="text" 
                       class="card-title font-semibold text-sm bg-transparent border-none outline-none flex-1 text-gray-800" 
                       value="${this.escapeHtml(cardData.title)}" 
                       placeholder="Заголовок карточки">
                <select class="card-type-select text-xs bg-transparent border rounded px-2 py-1 text-gray-600">
                    <option value="scene" ${cardData.type === 'scene' ? 'selected' : ''}>🎬 Сцена</option>
                    <option value="character" ${cardData.type === 'character' ? 'selected' : ''}>👤 Персонаж</option>
                    <option value="note" ${cardData.type === 'note' ? 'selected' : ''}>📝 Заметка</option>
                    <option value="screen" ${cardData.type === 'screen' ? 'selected' : ''}>📱 Экран</option>
                </select>
            </div>
            <textarea class="card-content w-full text-sm resize-none border-none outline-none bg-transparent text-gray-700 leading-relaxed" 
                      rows="4" 
                      placeholder="${this.getPlaceholderForType(cardData.type)}">${this.escapeHtml(cardData.content)}</textarea>
            
            <!-- Handles для соединений -->
            <div class="card-handles absolute inset-0 pointer-events-none">
                <div class="connection-handle absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity pointer-events-auto"></div>
                <div class="connection-handle absolute -left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full cursor-pointer opacity-0 hover:opacity-100 transition-opacity pointer-events-auto"></div>
            </div>
        `;
        
        this.setupCardEvents(card, cardData);
        return card;
    }
    
    /**
     * Настройка событий для карточки
     */
    setupCardEvents(cardElement, cardData) {
        // Перетаскивание карточки
        this.setupCardDragging(cardElement, cardData);
        
        // Клик по карточке для выделения
        cardElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectCard(cardData.id);
        });
        
        // Обработка изменений контента
        const titleInput = cardElement.querySelector('.card-title');
        const contentTextarea = cardElement.querySelector('.card-content');
        const typeSelect = cardElement.querySelector('.card-type-select');
        
        titleInput.addEventListener('input', (e) => {
            cardData.title = e.target.value;
            cardData.modified = Date.now();
            this.debouncedSave && this.debouncedSave();
        });
        
        contentTextarea.addEventListener('input', (e) => {
            cardData.content = e.target.value;
            cardData.modified = Date.now();
            this.debouncedSave && this.debouncedSave();
        });
        
        typeSelect.addEventListener('change', (e) => {
            const oldType = cardData.type;
            cardData.type = e.target.value;
            cardData.modified = Date.now();
            
            // Обновить класс карточки
            cardElement.className = cardElement.className.replace(`card-type-${oldType}`, `card-type-${cardData.type}`);
            
            // Обновить placeholder
            contentTextarea.placeholder = this.getPlaceholderForType(cardData.type);
            
            this.saveToStorage();
        });
        
        // Контекстное меню
        cardElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showCardContextMenu(cardData.id, e.clientX, e.clientY);
        });
        
        // Handles для соединений
        cardElement.querySelectorAll('.connection-handle').forEach(handle => {
            handle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startConnectionMode(cardData.id);
            });
        });
    }
    
    /**
     * Настройка перетаскивания карточки
     */
    setupCardDragging(cardElement, cardData) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        cardElement.addEventListener('mousedown', (e) => {
            // Игнорировать клики по input/textarea/select
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = cardData.x;
            initialY = cardData.y;
            
            cardElement.style.zIndex = 1000;
            document.body.style.cursor = 'grabbing';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = (e.clientX - startX) / this.zoom;
            const deltaY = (e.clientY - startY) / this.zoom;
            
            cardData.x = Math.round(initialX + deltaX);
            cardData.y = Math.round(initialY + deltaY);
            
            cardElement.style.left = cardData.x + 'px';
            cardElement.style.top = cardData.y + 'px';
            
            // Обновить связи
            this.updateCardConnections(cardData.id);
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                cardElement.style.zIndex = '';
                document.body.style.cursor = '';
                
                cardData.modified = Date.now();
                this.debouncedSave && this.debouncedSave();
            }
        });
    }
    
    /**
     * Выделение карточки
     */
    selectCard(cardId) {
        // Снять выделение с предыдущей карточки
        if (this.selectedCard) {
            const prevCard = document.getElementById(this.selectedCard);
            if (prevCard) {
                prevCard.classList.remove('selected');
            }
        }
        
        // Скрыть контекстное меню
        this.hideCardContextMenu();
        
        // Выделить новую карточку
        this.selectedCard = cardId;
        if (cardId) {
            const card = document.getElementById(cardId);
            if (card) {
                card.classList.add('selected');
            }
        }
    }
    
    /**
     * Показать контекстное меню карточки
     */
    showCardContextMenu(cardId, x, y) {
        this.hideCardContextMenu();
        
        const menu = document.createElement('div');
        menu.id = 'card-context-menu';
        menu.className = 'fixed bg-white shadow-xl rounded-lg border p-2 z-50 min-w-36';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        menu.innerHTML = `
            <div class="space-y-1">
                <button class="duplicate-card w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded flex items-center space-x-2">
                    <span>🔄</span>
                    <span>Дублировать</span>
                </button>
                <button class="connect-card w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 rounded flex items-center space-x-2">
                    <span>🔗</span>
                    <span>Соединить</span>
                </button>
                <hr class="my-1 border-gray-200">
                <button class="delete-card w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center space-x-2">
                    <span>🗑️</span>
                    <span>Удалить</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Обработчики
        menu.querySelector('.duplicate-card').addEventListener('click', () => {
            this.duplicateCard(cardId);
            this.hideCardContextMenu();
        });
        
        menu.querySelector('.connect-card').addEventListener('click', () => {
            this.startConnectionMode(cardId);
            this.hideCardContextMenu();
        });
        
        menu.querySelector('.delete-card').addEventListener('click', () => {
            this.deleteCard(cardId);
            this.hideCardContextMenu();
        });
        
        // Клик вне меню закрывает его
        setTimeout(() => {
            document.addEventListener('click', this.hideCardContextMenu.bind(this), { once: true });
        }, 100);
    }
    
    /**
     * Скрыть контекстное меню
     */
    hideCardContextMenu() {
        const menu = document.getElementById('card-context-menu');
        if (menu) {
            menu.remove();
        }
    }
    
    /**
     * Дублирование карточки
     */
    duplicateCard(cardId) {
        const originalCard = this.cards.get(cardId);
        if (!originalCard) return;
        
        const newCardData = {
            ...originalCard,
            x: originalCard.x + 20,
            y: originalCard.y + 20,
            title: originalCard.title + ' (копия)',
            connections: [], // Не копируем связи
            created: Date.now(),
            modified: Date.now()
        };
        
        delete newCardData.id; // Будет назначен новый id
        
        this.createCard(newCardData.x, newCardData.y, newCardData);
        
        this.showNotification('Карточка дублирована', 'success');
    }
    
    /**
     * Удаление карточки
     */
    deleteCard(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return;
        
        // Удалить все связи с этой карточкой
        this.deleteCardConnections(cardId);
        
        // Удалить DOM элемент
        const cardElement = document.getElementById(cardId);
        if (cardElement) {
            cardElement.remove();
        }
        
        // Удалить из состояния
        this.cards.delete(cardId);
        
        // Снять выделение
        if (this.selectedCard === cardId) {
            this.selectedCard = null;
        }
        
        // Показать welcome hint если больше нет карточек
        if (this.cards.size === 0 && this.welcomeHint) {
            this.welcomeHint.style.display = 'flex';
        }
        
        this.saveToStorage();
        this.updateStatusBar();
        
        this.showNotification('Карточка удалена', 'info');
    }
    
    /**
     * Удаление всех связей карточки
     */
    deleteCardConnections(cardId) {
        // Найти и удалить все связи, где участвует эта карточка
        const connectionsToDelete = [];
        
        this.connections.forEach((connection, connectionId) => {
            if (connection.from === cardId || connection.to === cardId) {
                connectionsToDelete.push(connectionId);
            }
        });
        
        connectionsToDelete.forEach(connectionId => {
            this.deleteConnection(connectionId);
        });
    }
    
    /**
     * Удаление связи
     */
    deleteConnection(connectionId) {
        // Удалить из состояния
        this.connections.delete(connectionId);
        
        // Удалить DOM элемент
        const connectionElement = document.getElementById(connectionId);
        if (connectionElement) {
            connectionElement.remove();
        }
        
        // Обновить связи в данных карточек
        this.updateCardConnectionsData();
    }
    
    /**
     * Обновление данных связей в карточках
     */
    updateCardConnectionsData() {
        // Очистить все связи
        this.cards.forEach(card => {
            card.connections = [];
        });
        
        // Восстановить из текущих связей
        this.connections.forEach(connection => {
            const fromCard = this.cards.get(connection.from);
            if (fromCard) {
                fromCard.connections.push(connection.to);
            }
        });
    }
    
    /**
     * Получить заголовок по умолчанию для типа карточки
     */
    getDefaultTitle(type) {
        const titles = {
            scene: 'Новая сцена',
            character: 'Персонаж',
            note: 'Заметка',
            screen: 'Экран'
        };
        return titles[type] || 'Новая карточка';
    }
    
    /**
     * Получить placeholder для типа карточки
     */
    getPlaceholderForType(type) {
        const placeholders = {
            scene: 'Описание сцены, действия, диалоги...',
            character: 'Имя, возраст, характер, мотивация...',
            note: 'Ваши заметки и идеи...',
            screen: 'Описание экрана, элементы интерфейса...'
        };
        return placeholders[type] || 'Введите описание...';
    }
    
    /**
     * Экранирование HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Обновление связей карточки
     */
    updateCardConnections(cardId) {
        // Этот метод будет расширен в canvas.js
        console.log(`Обновление связей для карточки: ${cardId}`);
    }
    
    /**
     * Обновление статус-бара
     */
    updateStatusBar() {
        const zoomLevel = document.getElementById('zoom-level');
        const cardsCount = document.getElementById('cards-count');
        const connectionsCount = document.getElementById('connections-count');
        
        if (zoomLevel) zoomLevel.textContent = `Масштаб: ${Math.round(this.zoom * 100)}%`;
        if (cardsCount) cardsCount.textContent = `Карточек: ${this.cards.size}`;
        if (connectionsCount) connectionsCount.textContent = `Связей: ${this.connections.size}`;
    }
    
    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 animate-slide-in ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Debounced автосохранение - инициализируется после создания settings
     */
    initDebouncedSave() {
        this.debouncedSave = this.debounce(() => {
            if (this.settings.autoSave) {
                this.saveToStorage();
            }
        }, this.settings.autoSaveDelay);
    }
    
    /**
     * Утилита debounce
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Заглушки для методов, которые будут реализованы в других файлах
     */
    setupCanvasNavigation() {
        console.log('🖱️ Настройка навигации по холсту...');
        // Будет реализовано в canvas.js
    }
    
    zoomToFit() {
        console.log('🔍 Масштабирование к содержимому...');
        // Будет реализовано в canvas.js
    }
    
    startConnectionMode(fromCardId) {
        console.log(`🔗 Начало режима соединения от карточки: ${fromCardId}`);
        // Будет реализовано в canvas.js
    }
    
    saveToStorage() {
        console.log('💾 Сохранение проекта...');
        // Будет реализовано в utils.js
        this.updateSaveStatus('saving');
    }
    
    loadFromStorage() {
        console.log('📁 Загрузка проекта...');
        // Будет реализовано в utils.js
    }
    
    showExportDialog() {
        console.log('📤 Показ диалога экспорта...');
        // Будет реализовано в utils.js
    }
    
    showImportDialog() {
        console.log('📥 Показ диалога импорта...');
        // Будет реализовано в utils.js
    }
    
    handleFileImport(event) {
        console.log('📄 Обработка импорта файла...');
        // Будет реализовано в utils.js
    }
    
    /**
     * Обновление статуса сохранения
     */
    updateSaveStatus(status) {
        const saveStatus = document.getElementById('save-status');
        if (!saveStatus) return;
        
        const statusConfig = {
            saved: { color: 'bg-green-400', text: 'Сохранено' },
            saving: { color: 'bg-yellow-400', text: 'Сохранение...' },
            error: { color: 'bg-red-400', text: 'Ошибка' }
        };
        
        const config = statusConfig[status] || statusConfig.saved;
        saveStatus.innerHTML = `
            <span class="flex items-center space-x-1">
                <div class="w-2 h-2 ${config.color} rounded-full"></div>
                <span>${config.text}</span>
            </span>
        `;
    }
}

// Экспорт для использования в других файлах
window.ScriptMapApp = ScriptMapApp;

console.log('🏗️ App.js загружен, ScriptMapApp готов к использованию');