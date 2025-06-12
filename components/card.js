// === УПРАВЛЕНИЕ КАРТОЧКАМИ ===

/**
 * Отрисовка карточки на рабочем пространстве
 */
function renderCard(card) {
    const workspace = document.getElementById('workspace');
    
    // Удалить существующую карточку если есть
    const existingCard = document.getElementById(`card-${card.id}`);
    if (existingCard) {
        existingCard.remove();
    }
    
    // Проверить и инициализировать позицию если нужно
    if (!card.position) {
        card.position = { 
            x: Math.random() * 400 + 100, 
            y: Math.random() * 300 + 100 
        };
    }
    
    // Найти тип карточки
    const cardType = getCardTypeById(card.type);
    
    // Создать элемент карточки
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.id = `card-${card.id}`;
    cardElement.style.left = card.position.x + 'px';
    cardElement.style.top = card.position.y + 'px';
    
    // HTML содержимое карточки
    cardElement.innerHTML = `
        <div class="card-header">
            <div class="card-title-section">
                <div class="card-title">${escapeHtml(card.title)}</div>
                <div class="card-type-badge">
                    <div class="card-type-dot" style="background-color: ${cardType?.color || '#gray'};"></div>
                    ${escapeHtml(cardType?.name || card.type)}
                </div>
            </div>
        </div>
        <div class="card-content">
            <div class="card-text ${card.expanded ? '' : 'collapsed'}" id="text-${card.id}">
                ${escapeHtml(card.content)}
            </div>
            ${card.content.length > 150 ? `
                <button class="card-toggle-btn" onclick="toggleCardExpansion('${card.id}')">
                    ${card.expanded ? 'Скрыть подробности' : 'Подробности'}
                </button>
            ` : ''}
        </div>
        
        <!-- Порты для создания связей -->
        <div class="card-port card-port-top" onclick="startConnection('${card.id}', 'top', event)"></div>
        <div class="card-port card-port-right" onclick="startConnection('${card.id}', 'right', event)"></div>
        <div class="card-port card-port-bottom" onclick="startConnection('${card.id}', 'bottom', event)"></div>
        <div class="card-port card-port-left" onclick="startConnection('${card.id}', 'left', event)"></div>
    `;
    
    // Добавить в workspace
    workspace.appendChild(cardElement);
    
    // Инициализировать drag & drop
    initializeCardDragDrop(cardElement, card.id);
}

/**
 * Отрисовка всех карточек на рабочем пространстве
 */
function renderWorkspace() {
    const workspace = document.getElementById('workspace');
    
    // Очистить workspace от карточек
    const existingCards = workspace.querySelectorAll('.card');
    existingCards.forEach(card => card.remove());
    
    // Отрендерить все карточки
    cards.forEach(card => {
        renderCard(card);
    });
    
    // Отрендерить связи
    renderConnections();
}

/**
 * Инициализация Drag & Drop для карточки
 */
function initializeCardDragDrop(cardElement, cardId) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    // Обработчик начала перетаскивания
    cardElement.addEventListener('mousedown', function(e) {
        // Игнорировать клики по портам и кнопкам
        if (e.target.classList.contains('card-port') || 
            e.target.classList.contains('card-toggle-btn')) {
            return;
        }
        
        isDragging = true;
        
        // Сохранить начальные позиции
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(cardElement.style.left) || 0;
        startTop = parseInt(cardElement.style.top) || 0;
        
        // Добавить класс для визуального эффекта
        cardElement.classList.add('dragging');
        
        // Предотвратить выделение текста
        e.preventDefault();
        
        // Обработчики для движения и окончания перетаскивания
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    function onMouseMove(e) {
        if (!isDragging) return;
        
        // Вычислить новую позицию
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;
        
        // Ограничить движение рамками workspace
        const workspace = document.getElementById('workspace');
        const workspaceRect = workspace.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        
        const minLeft = 0;
        const minTop = 0;
        const maxLeft = workspaceRect.width - cardRect.width;
        const maxTop = workspaceRect.height - cardRect.height;
        
        const constrainedLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        const constrainedTop = Math.max(minTop, Math.min(maxTop, newTop));
        
        // Применить новую позицию
        cardElement.style.left = constrainedLeft + 'px';
        cardElement.style.top = constrainedTop + 'px';
        
        // Обновить связи в реальном времени
        updateConnections(cardId);
    }
    
    function onMouseUp(e) {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Убрать визуальный эффект
        cardElement.classList.remove('dragging');
        
        // Сохранить новую позицию
        const newPosition = {
            x: parseInt(cardElement.style.left),
            y: parseInt(cardElement.style.top)
        };
        updateCardPosition(cardId, newPosition);
        
        // Убрать обработчики
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

/**
 * Обновление отображения карточки после изменения данных
 */
function updateCardDisplay(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        renderCard(card);
    }
}

/**
 * Получение позиции порта карточки
 */
function getCardPortPosition(cardId, port) {
    const cardElement = document.getElementById(`card-${cardId}`);
    if (!cardElement) {
        console.warn('Карточка не найдена:', cardId);
        return null;
    }
    
    const workspace = document.getElementById('workspace');
    if (!workspace) {
        console.warn('Workspace не найден');
        return null;
    }
    
    try {
        const cardRect = cardElement.getBoundingClientRect();
        const workspaceRect = workspace.getBoundingClientRect();
        
        // Вычислить позицию относительно workspace
        const cardLeft = cardRect.left - workspaceRect.left;
        const cardTop = cardRect.top - workspaceRect.top;
        const cardWidth = cardRect.width;
        const cardHeight = cardRect.height;
        
        const positions = {
            'top': { 
                x: cardLeft + cardWidth / 2, 
                y: cardTop 
            },
            'right': { 
                x: cardLeft + cardWidth, 
                y: cardTop + cardHeight / 2 
            },
            'bottom': { 
                x: cardLeft + cardWidth / 2, 
                y: cardTop + cardHeight 
            },
            'left': { 
                x: cardLeft, 
                y: cardTop + cardHeight / 2 
            }
        };
        
        return positions[port] || null;
    } catch (error) {
        console.error('Ошибка при получении позиции порта:', error);
        return null;
    }
}

/**
 * Начало создания связи из порта карточки
 */
function startConnection(cardId, port, event) {
    event.stopPropagation();
    
    if (connectionState.isConnecting) {
        // Если уже в режиме создания связи - завершить связь
        finishConnection(cardId, port);
    } else {
        // Начать создание связи
        connectionState.isConnecting = true;
        connectionState.sourceCard = cardId;
        connectionState.sourcePort = port;
        
        // Получить позицию порта
        const portPosition = getCardPortPosition(cardId, port);
        if (portPosition) {
            createTemporaryConnection(portPosition.x, portPosition.y);
        }
        
        // Изменить курсор
        document.body.classList.add('connecting-mode');
        
        // Выделить исходный порт
        const portElement = event.target;
        portElement.classList.add('connecting');
        
        console.log('Начато создание связи:', cardId, port);
    }
}

/**
 * Завершение создания связи
 */
function finishConnection(targetCardId, targetPort) {
    if (!connectionState.isConnecting) return;
    
    // Проверить, что это не та же карточка
    if (connectionState.sourceCard === targetCardId) {
        cancelConnection();
        return;
    }
    
    // Создать связь
    const connection = {
        id: generateId(),
        sourceCardId: connectionState.sourceCard,
        targetCardId: targetCardId,
        sourcePort: connectionState.sourcePort,
        targetPort: targetPort
    };
    
    connections.push(connection);
    renderConnection(connection);
    
    // Сбросить состояние
    resetConnectionState();
    
    // Сохранить проект
    saveProject();
    
    console.log('Создана связь:', connection);
}

/**
 * Сброс состояния создания связи
 */
function resetConnectionState() {
    connectionState.isConnecting = false;
    connectionState.sourceCard = null;
    connectionState.sourcePort = null;
    
    // Убрать временную линию
    removeTemporaryConnection();
    
    // Вернуть курсор
    document.body.classList.remove('connecting-mode');
    
    // Убрать выделение с портов
    document.querySelectorAll('.card-port.connecting').forEach(port => {
        port.classList.remove('connecting');
    });
}

/**
 * Отмена создания связи
 */
function cancelConnection() {
    resetConnectionState();
    console.log('Создание связи отменено');
}

/**
 * Экранирование HTML для безопасности
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Получение всех карточек в определенной области
 */
function getCardsInArea(x, y, width, height) {
    return cards.filter(card => {
        return card.position.x >= x && 
               card.position.x <= x + width &&
               card.position.y >= y && 
               card.position.y <= y + height;
    });
}

/**
 * Автоматическая расстановка карточек
 */
function autoLayoutCards() {
    if (cards.length === 0) return;
    
    const spacing = 50;
    const cardWidth = 300;
    const cardHeight = 200;
    const cols = Math.ceil(Math.sqrt(cards.length));
    
    cards.forEach((card, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        card.position.x = col * (cardWidth + spacing) + spacing;
        card.position.y = row * (cardHeight + spacing) + spacing;
    });
    
    renderWorkspace();
    saveProject();
}