// === УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ===

/**
 * Открытие модального окна создания карточки
 */
function openCreateCardModal() {
    const selectedType = cardTypes.find(type => type.id === selectedCardType) || cardTypes[0];
    
    const modalHtml = `
        <div class="modal-overlay" id="createCardModal" onclick="closeModalOnOverlay(event)">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Название карточки</h3>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Тип карточки</label>
                        <select class="form-select" id="cardTypeSelect">
                            ${cardTypes.map(type => 
                                `<option value="${type.id}" ${type.id === selectedType.id ? 'selected' : ''}>
                                    ${escapeHtml(type.name)}
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Название*</label>
                        <input type="text" class="form-input" id="cardTitleInput" 
                               placeholder="Введите название карточки" maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Описание</label>
                        <textarea class="form-textarea" id="cardContentInput" 
                                  placeholder="Начни вводить текст карточки" 
                                  rows="4"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeCreateCardModal()">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="submitCreateCard()">
                        Создать карточку
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Фокус на поле ввода названия
    setTimeout(() => {
        const titleInput = document.getElementById('cardTitleInput');
        if (titleInput) {
            titleInput.focus();
        }
    }, 100);
    
    // Обработчик Enter для быстрого создания
    document.getElementById('cardTitleInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitCreateCard();
        }
    });
    
    // Обработчик Escape для закрытия
    document.addEventListener('keydown', handleModalEscape);
}

/**
 * Закрытие модального окна создания карточки
 */
function closeCreateCardModal() {
    const modal = document.getElementById('createCardModal');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', handleModalEscape);
}

/**
 * Отправка формы создания карточки
 */
function submitCreateCard() {
    const typeSelect = document.getElementById('cardTypeSelect');
    const titleInput = document.getElementById('cardTitleInput');
    const contentInput = document.getElementById('cardContentInput');
    
    if (!typeSelect || !titleInput || !contentInput) return;
    
    const type = typeSelect.value;
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    
    // Валидация
    if (!title) {
        alert('Пожалуйста, введите название карточки');
        titleInput.focus();
        return;
    }
    
    // Создать карточку
    createCard(type, title, content);
    
    // Закрыть модальное окно
    closeCreateCardModal();
    
    // Сбросить выбранный тип
    selectedCardType = null;
    document.querySelectorAll('.card-type-item').forEach(item => {
        item.classList.remove('selected');
    });
}

/**
 * Открытие модального окна создания типа карточки
 */
function openCreateTypeModal() {
    const modalHtml = `
        <div class="modal-overlay" id="createTypeModal" onclick="closeModalOnOverlay(event)">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Новый тип карточки</h3>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Иконка</label>
                        <input type="file" class="form-input" id="typeIconInput" 
                               accept="image/*" style="display: none;">
                        <button class="btn btn-secondary" onclick="document.getElementById('typeIconInput').click()">
                            Загрузить
                        </button>
                        <span id="iconFileName" style="margin-left: 8px; font-size: 12px; color: #666;"></span>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Название*</label>
                        <input type="text" class="form-input" id="typeNameInput" 
                               placeholder="Введи название типа карточки" maxlength="50">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Цвет*</label>
                        <input type="color" class="form-input" id="typeColorInput" 
                               value="#FF0000" style="width: 60px; height: 40px; padding: 4px;">
                        <div class="color-picker">
                            ${getPresetColors().map(color => 
                                `<div class="color-option" style="background-color: ${color};" 
                                      onclick="selectPresetColor('${color}')"></div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeCreateTypeModal()">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="submitCreateType()">
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Обработчик для выбора файла иконки
    document.getElementById('typeIconInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('iconFileName').textContent = file.name;
        }
    });
    
    // Фокус на поле ввода названия
    setTimeout(() => {
        const nameInput = document.getElementById('typeNameInput');
        if (nameInput) {
            nameInput.focus();
        }
    }, 100);
    
    // Обработчик Enter для быстрого создания
    document.getElementById('typeNameInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitCreateType();
        }
    });
    
    // Обработчик Escape для закрытия
    document.addEventListener('keydown', handleModalEscape);
}

/**
 * Закрытие модального окна создания типа
 */
function closeCreateTypeModal() {
    const modal = document.getElementById('createTypeModal');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', handleModalEscape);
}

/**
 * Отправка формы создания типа карточки
 */
function submitCreateType() {
    const nameInput = document.getElementById('typeNameInput');
    const colorInput = document.getElementById('typeColorInput');
    const iconInput = document.getElementById('typeIconInput');
    
    if (!nameInput || !colorInput) return;
    
    const name = nameInput.value.trim();
    const color = colorInput.value;
    const iconFile = iconInput.files[0];
    
    // Валидация
    if (!name) {
        alert('Пожалуйста, введите название типа карточки');
        nameInput.focus();
        return;
    }
    
    // Проверить уникальность названия
    const existingType = cardTypes.find(type => 
        type.name.toLowerCase() === name.toLowerCase()
    );
    if (existingType) {
        alert('Тип карточки с таким названием уже существует');
        nameInput.focus();
        return;
    }
    
    // Обработать иконку (пока простая заглушка)
    let icon = 'default';
    if (iconFile) {
        // TODO: В реальном приложении здесь была бы загрузка файла
        icon = iconFile.name;
    }
    
    // Создать тип карточки
    createCardType(name, color, icon);
    
    // Обновить боковую панель
    renderCardTypes();
    
    // Закрыть модальное окно
    closeCreateTypeModal();
}

/**
 * Получение предустановленных цветов
 */
function getPresetColors() {
    return [
        '#FF0000', '#FF8C00', '#FFD700', '#ADFF2F', '#00FF7F',
        '#00CED1', '#1E90FF', '#9370DB', '#FF1493', '#696969',
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
    ];
}

/**
 * Выбор предустановленного цвета
 */
function selectPresetColor(color) {
    const colorInput = document.getElementById('typeColorInput');
    if (colorInput) {
        colorInput.value = color;
    }
    
    // Обновить выделение
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.color-option[onclick="selectPresetColor('${color}')"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

/**
 * Закрытие модального окна при клике на оверлей
 */
function closeModalOnOverlay(event) {
    if (event.target === event.currentTarget) {
        // Определить какое модальное окно открыто
        if (event.target.id === 'createCardModal') {
            closeCreateCardModal();
        } else if (event.target.id === 'createTypeModal') {
            closeCreateTypeModal();
        }
    }
}

/**
 * Обработчик клавиши Escape для закрытия модальных окон
 */
function handleModalEscape(event) {
    if (event.key === 'Escape') {
        const createCardModal = document.getElementById('createCardModal');
        const createTypeModal = document.getElementById('createTypeModal');
        
        if (createCardModal) {
            closeCreateCardModal();
        } else if (createTypeModal) {
            closeCreateTypeModal();
        }
    }
}

/**
 * Модальное окно подтверждения
 */
function showConfirmModal(title, message, onConfirm, onCancel) {
    const modalHtml = `
        <div class="modal-overlay" id="confirmModal" onclick="closeModalOnOverlay(event)">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="modal-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeConfirmModal(); ${onCancel ? onCancel.toString() + '()' : ''}">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="closeConfirmModal(); ${onConfirm.toString()}()">
                        Подтвердить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Обработчик Escape
    document.addEventListener('keydown', handleModalEscape);
}

/**
 * Закрытие модального окна подтверждения
 */
function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.remove();
    }
    document.removeEventListener('keydown', handleModalEscape);
}

/**
 * Модальное окно информации/уведомления
 */
function showInfoModal(title, message) {
    const modalHtml = `
        <div class="modal-overlay" id="infoModal" onclick="closeModalOnOverlay(event)">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${escapeHtml(title)}</h3>
                </div>
                <div class="modal-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="closeInfoModal()">
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Автофокус на кнопку OK
    setTimeout(() => {
        const okButton = document.querySelector('#infoModal .btn-primary');
        if (okButton) {
            okButton.focus();
        }
    }, 100);
    
    // Обработчик Escape и Enter
    function handleInfoModalKeys(event) {
        if (event.key === 'Escape' || event.key === 'Enter') {
            closeInfoModal();
        }
    }
    
    document.addEventListener('keydown', handleInfoModalKeys);
    
    // Убрать обработчик при закрытии
    const originalClose = closeInfoModal;
    window.closeInfoModal = function() {
        document.removeEventListener('keydown', handleInfoModalKeys);
        originalClose();
    };
}

/**
 * Закрытие информационного модального окна
 */
function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.remove();
    }
}