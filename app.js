// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let currentRole = 'ux';
let cards = [];
let connections = [];
let cardTypes = [
    { id: 'screen', name: 'Экран', color: '#3B82F6' },
    { id: 'popup', name: 'Попап', color: '#10B981' },
    { id: 'sidebar', name: 'Сайдменю', color: '#F59E0B' },
    { id: 'notification', name: 'Уведомление', color: '#EF4444' }
];

// Состояние создания связей
let connectionState = {
    isConnecting: false,
    sourceCard: null,
    sourcePort: null,
    temporaryLine: null
};

// Выбранный тип карточки для создания
let selectedCardType = null;

// === ОСНОВНЫЕ ФУНКЦИИ ===

/**
 * Выбор роли на стартовом экране
 */
function selectRole(role) {
    currentRole = role;
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    // Обновить индикатор роли
    const roleText = role === 'ux' ? 'UX дизайнер' : 'Сценарист';
    document.getElementById('roleIndicator').textContent = roleText;
    
    // Сохранить выбор роли
    saveProject();
}

/**
 * Смена роли - возврат к стартовому экрану
 */
function switchRole() {
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');
}

/**
 * Выбор типа карточки в боковой панели
 */
function selectCardType(typeId) {
    // Убрать выделение с предыдущего типа
    document.querySelectorAll('.card-type-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Найти и выделить выбранный тип
    const typeElement = document.querySelector(`[onclick="selectCardType('${typeId}')"]`);
    if (typeElement) {
        typeElement.classList.add('selected');
    }
    
    selectedCardType = typeId;
    console.log('Выбран тип карточки:', typeId);
    
    // Автоматически открыть модальное окно создания карточки
    openCreateCardModal();
}

/**
 * Создание новой карточки
 */
function createCard(type, title, content) {
    const card = {
        id: generateId(),
        type: type,
        title: title,
        content: content,
        position: { 
            x: Math.random() * 400 + 100, 
            y: Math.random() * 300 + 100 
        },
        expanded: true
    };
    
    cards.push(card);
    renderCard(card);
    saveProject();
    
    console.log('Создана карточка:', card);
}

/**
 * Обновление позиции карточки
 */
function updateCardPosition(cardId, newPosition) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        // Проверить что newPosition корректна
        if (newPosition && typeof newPosition.x === 'number' && typeof newPosition.y === 'number') {
            card.position = newPosition;
            updateConnections(cardId);
            saveProject();
        } else {
            console.warn('Некорректная позиция для карточки:', cardId, newPosition);
        }
    }
}

/**
 * Переключение развернутого/свернутого состояния карточки
 */
function toggleCardExpansion(cardId) {
    const card = cards.find(c => c.id === cardId);
    if (card) {
        card.expanded = !card.expanded;
        renderCard(card);
        saveProject();
    }
}

/**
 * Удаление карточки
 */
function deleteCard(cardId) {
    if (confirm('Удалить карточку?')) {
        // Удалить карточку из массива
        cards = cards.filter(c => c.id !== cardId);
        
        // Удалить связи с этой карточкой
        connections = connections.filter(c => 
            c.sourceCardId !== cardId && c.targetCardId !== cardId
        );
        
        // Удалить элемент из DOM
        const cardElement = document.getElementById(`card-${cardId}`);
        if (cardElement) {
            cardElement.remove();
        }
        
        // Перерисовать связи
        renderConnections();
        saveProject();
    }
}

/**
 * Создание нового типа карточки
 */
function createCardType(name, color, icon) {
    const cardType = {
        id: generateId(),
        name: name,
        color: color,
        icon: icon || 'default'
    };
    
    cardTypes.push(cardType);
    renderCardTypes();
    saveProject();
    
    console.log('Создан тип карточки:', cardType);
}

/**
 * Очистка проекта и localStorage
 */
function clearProject() {
    cards = [];
    connections = [];
    cardTypes = getDefaultCardTypes();
    currentRole = 'ux';
    
    localStorage.removeItem('scriptmap_project');
    localStorage.removeItem('project_created');
    
    renderWorkspace();
    renderCardTypes();
    
    console.log('Проект очищен');
}

/**
 * Сохранение проекта в localStorage
 */
function saveProject() {
    try {
        const projectData = {
            version: "1.0",
            metadata: {
                role: currentRole,
                createdAt: localStorage.getItem('project_created') || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            cards: cards,
            connections: connections,
            cardTypes: cardTypes
        };
        
        localStorage.setItem('scriptmap_project', JSON.stringify(projectData));
        localStorage.setItem('project_created', projectData.metadata.createdAt);
        
        console.log('Проект сохранен');
    } catch (error) {
        console.error('Ошибка сохранения проекта:', error);
        // Возможно localStorage переполнен
        alert('Ошибка сохранения проекта. Возможно, недостаточно места в браузере.');
    }
}

/**
 * Функция для кнопки "Сохранить проект" - скачивает файл
 */
function handleSaveProjectButton() {
    // Показать выбор: сохранить как файл или экспортировать как текст
    const choice = confirm('Сохранить проект как файл? (OK = JSON файл, Отмена = Текстовый экспорт)');
    
    if (choice) {
        downloadProjectAsJSON();
    } else {
        downloadProject();
    }
}

/**
 * Скачивание проекта как JSON файла
 */
function downloadProjectAsJSON() {
    const projectData = {
        version: "1.0",
        metadata: {
            role: currentRole,
            createdAt: localStorage.getItem('project_created') || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        cards: cards,
        connections: connections,
        cardTypes: cardTypes
    };
    
    const content = JSON.stringify(projectData, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptmap-project-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Загрузка проекта из localStorage
 */
function loadProject() {
    const saved = localStorage.getItem('scriptmap_project');
    if (saved) {
        try {
            const projectData = JSON.parse(saved);
            
            // Загрузить данные с валидацией
            cards = (projectData.cards || []).map(card => {
                // Убедиться что у каждой карточки есть все необходимые свойства
                return {
                    id: card.id || generateId(),
                    type: card.type || 'screen',
                    title: card.title || 'Без названия',
                    content: card.content || '',
                    position: card.position || { 
                        x: Math.random() * 400 + 100, 
                        y: Math.random() * 300 + 100 
                    },
                    expanded: card.expanded !== undefined ? card.expanded : true
                };
            });
            
            connections = projectData.connections || [];
            cardTypes = projectData.cardTypes || getDefaultCardTypes();
            currentRole = projectData.metadata?.role || 'ux';
            
            // Отрендерить интерфейс
            renderWorkspace();
            renderCardTypes();
            
            console.log('Проект загружен:', projectData);
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
            console.log('Очистка поврежденных данных...');
            // Очистить поврежденные данные
            clearProject();
        }
    } else {
        // Первый запуск - инициализировать пустой проект
        cardTypes = getDefaultCardTypes();
        renderCardTypes();
    }
}

/**
 * Экспорт проекта в текстовый формат
 */
function exportAsText() {
    let output = `# Проект сценария\n\n`;
    output += `**Роль:** ${currentRole === 'ux' ? 'UX/UI дизайнер' : 'Сценарист'}\n\n`;
    output += `**Дата создания:** ${new Date().toLocaleDateString('ru-RU')}\n\n`;
    
    // Экспорт карточек
    if (cards.length > 0) {
        output += `## Карточки\n\n`;
        cards.forEach(card => {
            const cardType = cardTypes.find(t => t.id === card.type);
            output += `### ${card.title}\n`;
            output += `**Тип:** ${cardType?.name || card.type}\n`;
            output += `${card.content}\n\n`;
        });
    }

    // Экспорт связей
    if (connections.length > 0) {
        output += `## Связи\n\n`;
        connections.forEach(connection => {
            const sourceCard = cards.find(c => c.id === connection.sourceCardId);
            const targetCard = cards.find(c => c.id === connection.targetCardId);
            output += `- "${sourceCard?.title}" → "${targetCard?.title}"\n`;
        });
    }

    return output;
}

/**
 * Скачивание проекта как текстового файла
 */
function downloadProject() {
    const content = exportAsText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `scriptmap-project-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

/**
 * Генерация уникального ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Получение типов карточек по умолчанию
 */
function getDefaultCardTypes() {
    return [
        { id: 'screen', name: 'Экран', color: '#3B82F6' },
        { id: 'popup', name: 'Попап', color: '#10B981' },
        { id: 'sidebar', name: 'Сайдменю', color: '#F59E0B' },
        { id: 'notification', name: 'Уведомление', color: '#EF4444' }
    ];
}

/**
 * Поиск типа карточки по ID
 */
function getCardTypeById(typeId) {
    return cardTypes.find(type => type.id === typeId);
}

/**
 * Инициализация обработчиков событий
 */
function initializeEventListeners() {
    // Обработчик для клавиши Escape (отмена создания связи)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (connectionState.isConnecting) {
                cancelConnection();
            }
        }
    });
    
    // Обработчик движения мыши для временной линии связи
    document.addEventListener('mousemove', function(e) {
        if (connectionState.isConnecting) {
            updateTemporaryConnection(e.clientX, e.clientY);
        }
    });
    
    // Обработчик клика для отмены создания связи
    document.addEventListener('click', function(e) {
        if (connectionState.isConnecting) {
            // Проверить, не кликнули ли на порт
            if (!e.target.classList.contains('card-port')) {
                cancelConnection();
            }
        }
    });
}

/**
 * Инициализация приложения
 */
function initializeApp() {
    loadProject();
    initializeEventListeners();
    
    // Если это первый запуск (нет сохраненных карточек), создать пример
    if (cards.length === 0 && !localStorage.getItem('scriptmap_project')) {
        createSampleCard();
    }
}

/**
 * Создание примера карточки для демонстрации
 */
function createSampleCard() {
    const sampleCard = {
        id: generateId(),
        type: 'screen',
        title: 'Добро пожаловать в ScriptMap!',
        content: 'Это пример карточки. Вы можете:\n\n• Перетаскивать её по экрану\n• Создавать связи, кликая на порты по краям\n• Сворачивать/разворачивать текст\n• Создавать новые карточки через боковую панель\n\nДля начала попробуйте создать новую карточку, кликнув на тип в левой панели!',
        position: { x: 200, y: 150 },
        expanded: true
    };
    
    cards.push(sampleCard);
    renderCard(sampleCard);
    saveProject();
}

// === ЗАГЛУШКИ ДЛЯ ФУНКЦИЙ (переопределяются в других файлах) ===

// Эти функции будут переопределены в соответствующих файлах
function openCreateCardModal() {
    console.log('Загрузка modal.js...');
}

function openCreateTypeModal() {
    console.log('Загрузка modal.js...');
}

function renderCard(card) {
    console.log('Загрузка card.js...');
}

function renderWorkspace() {
    console.log('Загрузка card.js...');
}

function renderCardTypes() {
    console.log('Загрузка sidebar.js...');
}

function renderConnections() {
    console.log('Загрузка connections.js...');
}

function updateConnections(cardId) {
    console.log('Загрузка connections.js...');
}

function updateTemporaryConnection(x, y) {
    console.log('Загрузка connections.js...');
}

function cancelConnection() {
    console.log('Загрузка connections.js...');
}

// === ФУНКЦИИ ДЛЯ HTML (оставляем для совместимости) ===

function zoomIn() {
    console.log('Увеличить масштаб');
    // Пока заглушка
}

function zoomOut() {
    console.log('Уменьшить масштаб');
    // Пока заглушка
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});