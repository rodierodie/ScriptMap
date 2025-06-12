// === УПРАВЛЕНИЕ БОКОВОЙ ПАНЕЛЬЮ ===

/**
 * Отрисовка списка типов карточек в боковой панели
 */
function renderCardTypes() {
    const cardTypesList = document.getElementById('cardTypesList');
    if (!cardTypesList) return;
    
    // Очистить список
    cardTypesList.innerHTML = '';
    
    // Отрендерить каждый тип карточки
    cardTypes.forEach(cardType => {
        const typeElement = createCardTypeElement(cardType);
        cardTypesList.appendChild(typeElement);
    });
}

/**
 * Создание элемента типа карточки
 */
function createCardTypeElement(cardType) {
    const typeElement = document.createElement('div');
    typeElement.className = 'card-type-item';
    typeElement.setAttribute('onclick', `selectCardType('${cardType.id}')`);
    
    typeElement.innerHTML = `
        <div class="card-type-dot" style="background-color: ${cardType.color};"></div>
        <span class="card-type-name">${escapeHtml(cardType.name)}</span>
    `;
    
    return typeElement;
}

/**
 * Выбор типа карточки (переопределение из app.js с дополнительной логикой)
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
 * Добавление нового типа карточки в список
 */
function addCardTypeToSidebar(cardType) {
    const cardTypesList = document.getElementById('cardTypesList');
    if (!cardTypesList) return;
    
    const typeElement = createCardTypeElement(cardType);
    cardTypesList.appendChild(typeElement);
}

/**
 * Обновление типа карточки в списке
 */
function updateCardTypeInSidebar(cardTypeId) {
    const cardType = cardTypes.find(type => type.id === cardTypeId);
    if (!cardType) return;
    
    // Найти существующий элемент
    const existingElement = document.querySelector(`[onclick="selectCardType('${cardTypeId}')"]`);
    if (existingElement) {
        // Обновить содержимое
        existingElement.innerHTML = `
            <div class="card-type-dot" style="background-color: ${cardType.color};"></div>
            <span class="card-type-name">${escapeHtml(cardType.name)}</span>
        `;
    }
}

/**
 * Удаление типа карточки из списка
 */
function removeCardTypeFromSidebar(cardTypeId) {
    const typeElement = document.querySelector(`[onclick="selectCardType('${cardTypeId}')"]`);
    if (typeElement) {
        typeElement.remove();
    }
}

/**
 * Получение статистики по типам карточек
 */
function getCardTypeStats() {
    const stats = {};
    
    // Инициализировать счетчики
    cardTypes.forEach(type => {
        stats[type.id] = {
            name: type.name,
            color: type.color,
            count: 0
        };
    });
    
    // Подсчитать карточки каждого типа
    cards.forEach(card => {
        if (stats[card.type]) {
            stats[card.type].count++;
        }
    });
    
    return stats;
}

/**
 * Обновление счетчиков карточек по типам (опционально)
 */
function updateCardTypeCounts() {
    const stats = getCardTypeStats();
    
    Object.keys(stats).forEach(typeId => {
        const typeElement = document.querySelector(`[onclick="selectCardType('${typeId}')"]`);
        if (typeElement) {
            const count = stats[typeId].count;
            const nameElement = typeElement.querySelector('.card-type-name');
            
            if (nameElement) {
                const baseName = stats[typeId].name;
                nameElement.textContent = count > 0 ? `${baseName} (${count})` : baseName;
            }
        }
    });
}

/**
 * Фильтрация типов карточек по поисковому запросу
 */
function filterCardTypes(searchQuery) {
    const query = searchQuery.toLowerCase().trim();
    const typeElements = document.querySelectorAll('.card-type-item');
    
    typeElements.forEach(element => {
        const nameElement = element.querySelector('.card-type-name');
        if (nameElement) {
            const typeName = nameElement.textContent.toLowerCase();
            
            if (query === '' || typeName.includes(query)) {
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        }
    });
}

/**
 * Сортировка типов карточек
 */
function sortCardTypes(sortBy = 'name') {
    const cardTypesList = document.getElementById('cardTypesList');
    if (!cardTypesList) return;
    
    let sortedTypes = [...cardTypes];
    
    switch (sortBy) {
        case 'name':
            sortedTypes.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'color':
            sortedTypes.sort((a, b) => a.color.localeCompare(b.color));
            break;
        case 'usage':
            const stats = getCardTypeStats();
            sortedTypes.sort((a, b) => stats[b.id].count - stats[a.id].count);
            break;
        default:
            break;
    }
    
    // Очистить и перерендерить в новом порядке
    cardTypesList.innerHTML = '';
    sortedTypes.forEach(cardType => {
        const typeElement = createCardTypeElement(cardType);
        cardTypesList.appendChild(typeElement);
    });
}

/**
 * Получение самых используемых типов карточек
 */
function getMostUsedCardTypes(limit = 3) {
    const stats = getCardTypeStats();
    
    return Object.keys(stats)
        .map(typeId => ({
            id: typeId,
            ...stats[typeId]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

/**
 * Создание быстрых кнопок для популярных типов
 */
function createQuickTypeButtons() {
    const mostUsed = getMostUsedCardTypes(3);
    const header = document.querySelector('.sidebar-header');
    
    if (!header || mostUsed.length === 0) return;
    
    // Удалить существующие быстрые кнопки
    const existingQuickButtons = header.querySelector('.quick-types');
    if (existingQuickButtons) {
        existingQuickButtons.remove();
    }
    
    // Создать контейнер для быстрых кнопок
    const quickTypesContainer = document.createElement('div');
    quickTypesContainer.className = 'quick-types';
    quickTypesContainer.style.cssText = `
        display: flex;
        gap: 4px;
        margin-top: 8px;
    `;
    
    mostUsed.forEach(type => {
        if (type.count > 0) {
            const quickButton = document.createElement('button');
            quickButton.className = 'quick-type-btn';
            quickButton.style.cssText = `
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid ${type.color};
                background: ${type.color}20;
                cursor: pointer;
                transition: all 0.2s;
            `;
            quickButton.title = `Создать ${type.name}`;
            quickButton.onclick = () => selectCardType(type.id);
            
            quickButton.addEventListener('mouseenter', () => {
                quickButton.style.background = type.color;
                quickButton.style.transform = 'scale(1.1)';
            });
            
            quickButton.addEventListener('mouseleave', () => {
                quickButton.style.background = type.color + '20';
                quickButton.style.transform = 'scale(1)';
            });
            
            quickTypesContainer.appendChild(quickButton);
        }
    });
    
    if (quickTypesContainer.children.length > 0) {
        header.appendChild(quickTypesContainer);
    }
}

/**
 * Инициализация боковой панели
 */
function initializeSidebar() {
    renderCardTypes();
    
    // Добавить обработчик для кнопки "Добавить тип"
    const addTypeBtn = document.querySelector('.add-type-btn');
    if (addTypeBtn) {
        addTypeBtn.onclick = openCreateTypeModal;
    }
    
    // Создать быстрые кнопки если есть данные
    if (cards.length > 0) {
        createQuickTypeButtons();
    }
}

// Инициализировать боковую панель при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Небольшая задержка для обеспечения загрузки других компонентов
    setTimeout(initializeSidebar, 100);
});