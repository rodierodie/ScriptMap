/**
 * ScriptMap - Утилиты для сохранения, загрузки и экспорта
 * Расширение основного класса ScriptMapApp
 */

// Константы для localStorage
const STORAGE_KEYS = {
    PROJECT: 'scriptmap_project',
    BACKUP: 'scriptmap_backup',
    SETTINGS: 'scriptmap_settings'
};

// Расширение ScriptMapApp методами сохранения и экспорта
Object.assign(ScriptMapApp.prototype, {
    
    /**
     * Сохранение проекта в localStorage
     */
    saveToStorage() {
        this.updateSaveStatus('saving');
        
        const projectData = {
            version: '1.0.0',
            title: 'ScriptMap Project',
            description: 'Создано в ScriptMap',
            timestamp: Date.now(),
            lastSaved: new Date().toISOString(),
            
            // Основные данные
            cards: Array.from(this.cards.entries()),
            connections: Array.from(this.connections.entries()),
            
            // Состояние viewport
            viewport: {
                zoom: this.zoom,
                panX: this.panX,
                panY: this.panY
            },
            
            // Метаданные
            metadata: {
                cardCount: this.cards.size,
                connectionCount: this.connections.size,
                lastModified: this.getLastModifiedDate(),
                appVersion: '1.0.0'
            }
        };

        try {
            // Основное сохранение
            localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectData));
            
            // Резервная копия
            localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(projectData));
            
            this.updateSaveStatus('saved');
            console.log('✅ Проект сохранен в localStorage');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            this.updateSaveStatus('error');
            
            if (error.name === 'QuotaExceededError') {
                this.showNotification('Недостаточно места для сохранения проекта', 'error');
            } else {
                this.showNotification('Ошибка сохранения проекта', 'error');
            }
            
            return false;
        }
    },

    /**
     * Загрузка проекта из localStorage
     */
    loadFromStorage() {
        try {
            const savedData = localStorage.getItem(STORAGE_KEYS.PROJECT);
            
            if (savedData) {
                const projectData = JSON.parse(savedData);
                this.loadProject(projectData);
                console.log('✅ Проект загружен из localStorage');
            } else {
                console.log('📝 Создание демо-проекта для нового пользователя');
                this.createDemoProject();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            this.showNotification('Ошибка загрузки проекта', 'error');
            
            // Попробовать загрузить резервную копию
            this.loadBackup();
        }
    },

    /**
     * Загрузка резервной копии
     */
    loadBackup() {
        try {
            const backupData = localStorage.getItem(STORAGE_KEYS.BACKUP);
            
            if (backupData) {
                const projectData = JSON.parse(backupData);
                this.loadProject(projectData);
                this.showNotification('Загружена резервная копия проекта', 'warning');
                console.log('🔄 Загружена резервная копия');
            } else {
                console.log('📝 Резервной копии нет, создание демо-проекта');
                this.createDemoProject();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки резервной копии:', error);
            this.createDemoProject();
        }
    },

    /**
     * Загрузка проекта из данных
     */
    loadProject(projectData) {
        try {
            // Очистить текущий проект
            this.clearProject();

            // Загрузить карточки
            if (projectData.cards && Array.isArray(projectData.cards)) {
                projectData.cards.forEach(([id, cardData]) => {
                    this.cards.set(id, cardData);
                    const cardElement = this.createCardElement(cardData);
                    this.canvas.appendChild(cardElement);
                });
            }

            // Загрузить связи (будет реализовано в canvas.js)
            if (projectData.connections && Array.isArray(projectData.connections)) {
                projectData.connections.forEach(([id, connectionData]) => {
                    this.connections.set(id, connectionData);
                    // this.renderConnection(connectionData); // Будет в canvas.js
                });
            }

            // Восстановить viewport
            if (projectData.viewport) {
                this.zoom = projectData.viewport.zoom || 1;
                this.panX = projectData.viewport.panX || 0;
                this.panY = projectData.viewport.panY || 0;
                // this.updateCanvasTransform(); // Будет в canvas.js
            }

            // Обновить следующий ID карточки
            this.updateNextCardId();

            // Скрыть welcome hint если есть карточки
            if (this.cards.size > 0 && this.welcomeHint) {
                this.welcomeHint.style.display = 'none';
            }

            this.updateStatusBar();
            
            console.log(`📁 Загружен проект: ${this.cards.size} карточек, ${this.connections.size} связей`);
            
        } catch (error) {
            console.error('❌ Ошибка при загрузке проекта:', error);
            this.showNotification('Ошибка при загрузке проекта', 'error');
            this.createDemoProject();
        }
    },

    /**
     * Очистка текущего проекта
     */
    clearProject() {
        // Очистить карточки
        this.cards.clear();
        this.connections.clear();
        this.canvas.innerHTML = '';
        this.connectionsLayer.innerHTML = '';
        this.selectedCard = null;
        
        // Сбросить viewport
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        
        // Показать welcome hint
        if (this.welcomeHint) {
            this.welcomeHint.style.display = 'flex';
        }
        
        this.hideCardContextMenu();
    },

    /**
     * Обновление следующего ID карточки
     */
    updateNextCardId() {
        let maxId = 0;
        this.cards.forEach((card, id) => {
            const numericId = parseInt(id.replace('card_', ''));
            if (numericId > maxId) {
                maxId = numericId;
            }
        });
        this.nextCardId = maxId + 1;
    },

    /**
     * Создание демо-проекта
     */
    createDemoProject() {
        console.log('🎨 Создание демо-проекта...');
        
        const demoCards = [
            {
                x: 150,
                y: 120,
                type: 'scene',
                title: '🎬 Открытие фильма',
                content: 'Главный герой просыпается в незнакомой комнате. Солнечный свет проникает через старые шторы. Он не помнит, как сюда попал...'
            },
            {
                x: 450,
                y: 120,
                type: 'character',
                title: '👤 Александр',
                content: 'Возраст: 28 лет\nПрофессия: Программист\nХарактер: Замкнутый, но решительный\nМотивация: Восстановить потерянную память'
            },
            {
                x: 300,
                y: 320,
                type: 'scene',
                title: '🎭 Первый конфликт',
                content: 'Встреча с загадочной женщиной в кафе. Она знает больше, чем говорит. Напряженный диалог раскрывает первые подсказки.'
            },
            {
                x: 150,
                y: 480,
                type: 'note',
                title: '💡 Идея для сюжета',
                content: 'Добавить флэшбек о детстве героя во втором акте. Это объяснит его страх высоты и даст эмоциональную глубину.'
            },
            {
                x: 550,
                y: 320,
                type: 'screen',
                title: '📱 Главный экран',
                content: 'Интерфейс приложения:\n- Список проектов\n- Кнопка создания\n- Настройки профиля\n- Поиск по карточкам'
            }
        ];

        // Создать демо-карточки
        demoCards.forEach((cardData, index) => {
            const cardId = this.createCard(cardData.x, cardData.y, cardData);
            
            // Создать связи между некоторыми карточками
            if (index > 0 && index < 3) {
                const prevCardId = Array.from(this.cards.keys())[index - 1];
                // Связи будут созданы в canvas.js
                // this.createConnection(prevCardId, cardId);
            }
        });

        // Снять выделение с последней карточки
        this.selectCard(null);
        
        this.saveToStorage();
        this.showNotification('Создан демо-проект. Добро пожаловать в ScriptMap! 🎉', 'success');
    },

    /**
     * Получить дату последнего изменения
     */
    getLastModifiedDate() {
        let lastModified = 0;
        this.cards.forEach(card => {
            if (card.modified && card.modified > lastModified) {
                lastModified = card.modified;
            }
        });
        return lastModified || Date.now();
    },

    /**
     * Показать диалог экспорта
     */
    showExportDialog() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-fade-in">
                <div class="flex items-center space-x-3 mb-6">
                    <div class="w-10 h-10 bg-gradient-to-br from-scriptmap-green to-scriptmap-blue rounded-lg flex items-center justify-center">
                        <span class="text-white text-lg">📤</span>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-800">Экспорт проекта</h3>
                </div>
                
                <div class="space-y-3">
                    <button id="export-png" class="w-full px-4 py-3 bg-scriptmap-blue text-white rounded-lg hover:bg-blue-600 flex items-center justify-center space-x-2 transition-colors">
                        <span>🖼️</span>
                        <span>Экспорт в PNG</span>
                    </button>
                    
                    <button id="export-json" class="w-full px-4 py-3 bg-scriptmap-green text-white rounded-lg hover:bg-green-600 flex items-center justify-center space-x-2 transition-colors">
                        <span>📄</span>
                        <span>Экспорт в JSON</span>
                    </button>
                    
                    <button id="export-cancel" class="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                        Отмена
                    </button>
                </div>
                
                <div class="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p class="text-sm text-gray-600">
                        <strong>PNG:</strong> Изображение вашей схемы для презентаций<br>
                        <strong>JSON:</strong> Файл проекта для резервного копирования
                    </p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики
        modal.querySelector('#export-png').addEventListener('click', () => {
            this.exportToPNG();
            modal.remove();
        });

        modal.querySelector('#export-json').addEventListener('click', () => {
            this.exportToJSON();
            modal.remove();
        });

        modal.querySelector('#export-cancel').addEventListener('click', () => {
            modal.remove();
        });

        // Закрытие по клику вне модального окна
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    /**
     * Экспорт в PNG
     */
    async exportToPNG() {
        try {
            this.showNotification('Создание изображения...', 'info');
            
            // Временно скрыть элементы интерфейса
            const header = document.querySelector('header');
            const statusBar = document.getElementById('status-bar');
            const cardTypesPanel = document.getElementById('card-types-panel');
            const cardMenu = document.getElementById('card-context-menu');
            
            const elementsToHide = [header, statusBar, cardTypesPanel, cardMenu].filter(Boolean);
            elementsToHide.forEach(el => el.style.display = 'none');

            // Сохранить текущие трансформации
            const originalCanvasTransform = this.canvas.style.transform;
            const originalConnectionsTransform = this.connectionsLayer.style.transform;
            
            // Временно сбросить трансформации для корректного экспорта
            this.canvas.style.transform = '';
            this.connectionsLayer.style.transform = '';

            // Захватить изображение
            const canvas = await html2canvas(this.canvasContainer, {
                backgroundColor: '#f8fafc',
                scale: 2, // Высокое качество
                useCORS: true,
                allowTaint: true,
                logging: false,
                width: this.canvasContainer.offsetWidth,
                height: this.canvasContainer.offsetHeight
            });

            // Восстановить интерфейс
            elementsToHide.forEach(el => el.style.display = '');
            this.canvas.style.transform = originalCanvasTransform;
            this.connectionsLayer.style.transform = originalConnectionsTransform;

            // Скачать изображение
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            link.download = `scriptmap-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.showNotification('Изображение экспортировано! 🖼️', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка экспорта PNG:', error);
            this.showNotification('Ошибка экспорта изображения', 'error');
        }
    },

    /**
     * Экспорт в JSON
     */
    exportToJSON() {
        try {
            const projectData = {
                version: '1.0.0',
                title: 'ScriptMap Project',
                description: 'Экспортировано из ScriptMap',
                exported: new Date().toISOString(),
                timestamp: Date.now(),
                
                // Основные данные
                cards: Array.from(this.cards.entries()),
                connections: Array.from(this.connections.entries()),
                
                // Метаданные
                metadata: {
                    cardCount: this.cards.size,
                    connectionCount: this.connections.size,
                    appVersion: '1.0.0',
                    exportFormat: 'json'
                }
            };

            const dataStr = JSON.stringify(projectData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            link.download = `scriptmap-${timestamp}.json`;
            link.href = URL.createObjectURL(dataBlob);
            link.click();

            this.showNotification('JSON файл экспортирован! 📄', 'success');
            
        } catch (error) {
            console.error('❌ Ошибка экспорта JSON:', error);
            this.showNotification('Ошибка экспорта JSON', 'error');
        }
    },

    /**
     * Показать диалог импорта
     */
    showImportDialog() {
        const fileInput = document.getElementById('file-import');
        fileInput.click();
    },

    /**
     * Обработка импорта файла
     */
    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            this.showNotification('Пожалуйста, выберите JSON файл', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                
                // Валидация данных
                if (!this.validateProjectData(projectData)) {
                    this.showNotification('Неверный формат файла проекта', 'error');
                    return;
                }
                
                // Подтверждение импорта
                if (this.cards.size > 0) {
                    const confirmed = confirm('Импорт заменит текущий проект. Продолжить?');
                    if (!confirmed) return;
                }
                
                this.loadProject(projectData);
                this.showNotification('Проект импортирован! 📥', 'success');
                
            } catch (error) {
                console.error('❌ Ошибка импорта:', error);
                this.showNotification('Ошибка чтения файла проекта', 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('Ошибка чтения файла', 'error');
        };
        
        reader.readAsText(file);
        
        // Очистить input для повторного использования
        event.target.value = '';
    },

    /**
     * Валидация данных проекта
     */
    validateProjectData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.cards)) return false;
        if (data.connections && !Array.isArray(data.connections)) return false;
        
        // Проверить структуру карточек
        for (const [id, card] of data.cards) {
            if (!id || !card || typeof card !== 'object') return false;
            if (!card.hasOwnProperty('x') || !card.hasOwnProperty('y')) return false;
            if (!card.hasOwnProperty('title') || !card.hasOwnProperty('content')) return false;
        }
        
        return true;
    },

    /**
     * Очистка localStorage (для отладки)
     */
    clearStorage() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            console.log('🧹 localStorage очищен');
            this.showNotification('Данные приложения очищены', 'info');
        } catch (error) {
            console.error('❌ Ошибка очистки storage:', error);
        }
    },

    /**
     * Получить информацию о размере проекта
     */
    getProjectInfo() {
        const projectData = localStorage.getItem(STORAGE_KEYS.PROJECT);
        const size = projectData ? new Blob([projectData]).size : 0;
        
        return {
            cards: this.cards.size,
            connections: this.connections.size,
            storageSize: size,
            storageSizeFormatted: this.formatBytes(size),
            lastSaved: this.getLastSavedDate()
        };
    },

    /**
     * Форматирование размера в байтах
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Получить дату последнего сохранения
     */
    getLastSavedDate() {
        try {
            const projectData = localStorage.getItem(STORAGE_KEYS.PROJECT);
            if (projectData) {
                const data = JSON.parse(projectData);
                return data.lastSaved || data.timestamp;
            }
        } catch (error) {
            console.error('Ошибка получения даты сохранения:', error);
        }
        return null;
    }

});

console.log('🔧 Utils.js загружен');