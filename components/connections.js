// === УПРАВЛЕНИЕ СВЯЗЯМИ ===

/**
 * Отрисовка всех связей
 */
function renderConnections() {
    const workspace = document.getElementById('workspace');
    if (!workspace) return;
    
    // Удалить существующий слой связей
    const existingLayer = workspace.querySelector('.connections-layer');
    if (existingLayer) {
        existingLayer.remove();
    }
    
    // Создать новый слой для связей
    const connectionsLayer = document.createElement('svg');
    connectionsLayer.className = 'connections-layer';
    connectionsLayer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    `;
    
    workspace.appendChild(connectionsLayer);
    
    // Отрендерить каждую связь
    connections.forEach(connection => {
        renderConnection(connection, connectionsLayer);
    });
}

/**
 * Отрисовка одной связи
 */
function renderConnection(connection, layer = null) {
    if (!layer) {
        const workspace = document.getElementById('workspace');
        layer = workspace.querySelector('.connections-layer');
        if (!layer) {
            renderConnections();
            return;
        }
    }
    
    // Получить позиции портов
    const sourcePos = getCardPortPosition(connection.sourceCardId, connection.sourcePort);
    const targetPos = getCardPortPosition(connection.targetCardId, connection.targetPort);
    
    if (!sourcePos || !targetPos) {
        console.warn('Не удалось получить позиции портов для связи:', connection);
        return;
    }
    
    // Создать SVG путь
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'connection');
    path.setAttribute('id', `connection-${connection.id}`);
    path.setAttribute('d', createCurvedPath(sourcePos, targetPos));
    
    layer.appendChild(path);
}

/**
 * Создание изогнутого пути между двумя точками
 */
function createCurvedPath(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Определить силу изгиба в зависимости от расстояния
    const curvature = Math.min(distance * 0.3, 100);
    
    // Определить направление изгиба
    let cp1x, cp1y, cp2x, cp2y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        // Горизонтальное соединение
        cp1x = start.x + curvature;
        cp1y = start.y;
        cp2x = end.x - curvature;
        cp2y = end.y;
    } else {
        // Вертикальное соединение
        cp1x = start.x;
        cp1y = start.y + (dy > 0 ? curvature : -curvature);
        cp2x = end.x;
        cp2y = end.y - (dy > 0 ? curvature : -curvature);
    }
    
    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`;
}

/**
 * Обновление связей для конкретной карточки
 */
function updateConnections(cardId) {
    // Найти все связи, затрагивающие данную карточку
    const cardConnections = connections.filter(conn => 
        conn.sourceCardId === cardId || conn.targetCardId === cardId
    );
    
    // Обновить каждую связь
    cardConnections.forEach(connection => {
        const pathElement = document.getElementById(`connection-${connection.id}`);
        if (pathElement) {
            const sourcePos = getCardPortPosition(connection.sourceCardId, connection.sourcePort);
            const targetPos = getCardPortPosition(connection.targetCardId, connection.targetPort);
            
            if (sourcePos && targetPos) {
                pathElement.setAttribute('d', createCurvedPath(sourcePos, targetPos));
            }
        }
    });
}

/**
 * Создание временной связи
 */
function createTemporaryConnection(startX, startY) {
    const workspace = document.getElementById('workspace');
    let layer = workspace.querySelector('.connections-layer');
    
    if (!layer) {
        layer = document.createElement('svg');
        layer.className = 'connections-layer';
        layer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        workspace.appendChild(layer);
    }
    
    // Создать временный путь
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('class', 'connection-temp');
    tempPath.setAttribute('id', 'temp-connection');
    tempPath.setAttribute('d', `M ${startX} ${startY} L ${startX} ${startY}`);
    
    layer.appendChild(tempPath);
    connectionState.temporaryLine = tempPath;
}

/**
 * Обновление временной связи
 */
function updateTemporaryConnection(currentX, currentY) {
    if (!connectionState.temporaryLine || !connectionState.isConnecting) return;
    
    // Получить начальную позицию
    const startPos = getCardPortPosition(connectionState.sourceCard, connectionState.sourcePort);
    if (!startPos) return;
    
    // Преобразовать координаты мыши в координаты workspace
    const workspace = document.getElementById('workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    const workspaceX = currentX - workspaceRect.left;
    const workspaceY = currentY - workspaceRect.top;
    
    // Обновить путь
    const path = createCurvedPath(startPos, { x: workspaceX, y: workspaceY });
    connectionState.temporaryLine.setAttribute('d', path);
}

/**
 * Удаление временной связи
 */
function removeTemporaryConnection() {
    if (connectionState.temporaryLine) {
        connectionState.temporaryLine.remove();
        connectionState.temporaryLine = null;
    }
}

/**
 * Удаление связи
 */
function deleteConnection(connectionId) {
    // Удалить из массива
    connections = connections.filter(conn => conn.id !== connectionId);
    
    // Удалить из DOM
    const pathElement = document.getElementById(`connection-${connectionId}`);
    if (pathElement) {
        pathElement.remove();
    }
    
    // Сохранить проект
    saveProject();
}

/**
 * Поиск связи по клику (приблизительно)
 */
function findConnectionAtPoint(x, y, tolerance = 10) {
    const workspace = document.getElementById('workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    const localX = x - workspaceRect.left;
    const localY = y - workspaceRect.top;
    
    for (const connection of connections) {
        const sourcePos = getCardPortPosition(connection.sourceCardId, connection.sourcePort);
        const targetPos = getCardPortPosition(connection.targetCardId, connection.targetPort);
        
        if (sourcePos && targetPos) {
            // Упрощенная проверка - расстояние до линии
            const distance = distanceToLine(localX, localY, sourcePos, targetPos);
            if (distance <= tolerance) {
                return connection;
            }
        }
    }
    
    return null;
}

/**
 * Вычисление расстояния от точки до линии
 */
function distanceToLine(px, py, line1, line2) {
    const dx = line2.x - line1.x;
    const dy = line2.y - line1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return Math.sqrt((px - line1.x) ** 2 + (py - line1.y) ** 2);
    
    const t = Math.max(0, Math.min(1, ((px - line1.x) * dx + (py - line1.y) * dy) / (length * length)));
    const projX = line1.x + t * dx;
    const projY = line1.y + t * dy;
    
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Получение всех связей для карточки
 */
function getCardConnections(cardId) {
    return connections.filter(conn => 
        conn.sourceCardId === cardId || conn.targetCardId === cardId
    );
}

/**
 * Проверка, есть ли связь между двумя карточками
 */
function hasConnection(sourceCardId, targetCardId) {
    return connections.some(conn => 
        (conn.sourceCardId === sourceCardId && conn.targetCardId === targetCardId) ||
        (conn.sourceCardId === targetCardId && conn.targetCardId === sourceCardId)
    );
}

/**
 * Автоматическое определение лучшего порта для подключения
 */
function findBestPort(sourceCardId, targetCardId) {
    const sourceCard = cards.find(c => c.id === sourceCardId);
    const targetCard = cards.find(c => c.id === targetCardId);
    
    if (!sourceCard || !targetCard) return { sourcePort: 'right', targetPort: 'left' };
    
    const dx = targetCard.position.x - sourceCard.position.x;
    const dy = targetCard.position.y - sourceCard.position.y;
    
    let sourcePort, targetPort;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        // Горизонтальное расположение
        if (dx > 0) {
            sourcePort = 'right';
            targetPort = 'left';
        } else {
            sourcePort = 'left';
            targetPort = 'right';
        }
    } else {
        // Вертикальное расположение
        if (dy > 0) {
            sourcePort = 'bottom';
            targetPort = 'top';
        } else {
            sourcePort = 'top';
            targetPort = 'bottom';
        }
    }
    
    return { sourcePort, targetPort };
}

/**
 * Создание автоматической связи между карточками
 */
function createAutoConnection(sourceCardId, targetCardId) {
    // Проверить, нет ли уже связи
    if (hasConnection(sourceCardId, targetCardId)) {
        console.log('Связь между карточками уже существует');
        return;
    }
    
    // Определить лучшие порты
    const { sourcePort, targetPort } = findBestPort(sourceCardId, targetCardId);
    
    // Создать связь
    const connection = {
        id: generateId(),
        sourceCardId: sourceCardId,
        targetCardId: targetCardId,
        sourcePort: sourcePort,
        targetPort: targetPort
    };
    
    connections.push(connection);
    renderConnection(connection);
    saveProject();
    
    return connection;
}

/**
 * Анимация создания связи
 */
function animateConnectionCreation(connection) {
    const pathElement = document.getElementById(`connection-${connection.id}`);
    if (!pathElement) return;
    
    // Получить полную длину пути
    const totalLength = pathElement.getTotalLength();
    
    // Установить начальное состояние
    pathElement.style.strokeDasharray = totalLength;
    pathElement.style.strokeDashoffset = totalLength;
    pathElement.style.transition = 'stroke-dashoffset 0.5s ease-in-out';
    
    // Запустить анимацию
    setTimeout(() => {
        pathElement.style.strokeDashoffset = 0;
        
        // Убрать анимацию после завершения
        setTimeout(() => {
            pathElement.style.transition = '';
            pathElement.style.strokeDasharray = '';
            pathElement.style.strokeDashoffset = '';
        }, 500);
    }, 50);
}

/**
 * Инициализация слоя связей
 */
function initializeConnectionsLayer() {
    // Добавить обработчик для клика по связям (удаление)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('connection')) {
            const connectionId = e.target.id.replace('connection-', '');
            if (confirm('Удалить связь?')) {
                deleteConnection(connectionId);
            }
        }
    });
}

// Инициализировать при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeConnectionsLayer, 100);
});