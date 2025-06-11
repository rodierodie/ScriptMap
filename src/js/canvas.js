/**
 * ScriptMap - Управление холстом, навигацией и связями
 * Расширение основного класса ScriptMapApp
 */

// Расширение ScriptMapApp методами работы с холстом
Object.assign(ScriptMapApp.prototype, {
    
    /**
     * Настройка навигации по холсту
     */
    setupCanvasNavigation() {
        console.log('🖱️ Настройка навигации по холсту...');
        
        let isPanning = false;
        let lastPanX = 0;
        let lastPanY = 0;
        let isSpacePressed = false;

        // Обработка нажатия пробела для панорамирования
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat) {
                isSpacePressed = true;
                this.canvasContainer.style.cursor = 'grab';
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                isSpacePressed = false;
                this.canvasContainer.style.cursor = '';
            }
        });

        // Зум колесиком мыши
        this.canvasContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvasContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const zoomIntensity = 0.1;
            const wheel = e.deltaY < 0 ? 1 : -1;
            const zoomFactor = Math.exp(wheel * zoomIntensity);
            
            const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));
            
            // Зум к точке курсора
            this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
            this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
            this.zoom = newZoom;
            
            this.updateCanvasTransform();
            this.updateStatusBar();
        });

        // Панорамирование
        this.canvasContainer.addEventListener('mousedown', (e) => {
            // Средняя кнопка мыши или пробел + левая кнопка
            if (e.button === 1 || (e.button === 0 && (isSpacePressed || e.target === this.canvas))) {
                isPanning = true;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
                this.canvasContainer.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - lastPanX;
                const deltaY = e.clientY - lastPanY;
                
                this.panX += deltaX;
                this.panY += deltaY;
                
                lastPanX = e.clientX;
                lastPanY = e.clientY;
                
                this.updateCanvasTransform();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isPanning) {
                isPanning = false;
                this.canvasContainer.style.cursor = isSpacePressed ? 'grab' : '';
            }
        });

        // Предотвращение выделения текста при панорамировании
        this.canvasContainer.addEventListener('selectstart', (e) => {
            if (isPanning) {
                e.preventDefault();
            }
        });
    },

    /**
     * Обновление трансформации холста
     */
    updateCanvasTransform() {
        const transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        this.canvas.style.transform = transform;
        this.connectionsLayer.style.transform = transform;
        
        // Обновить размер SVG слоя
        this.updateConnectionsLayerSize();
    },

    /**
     * Обновление размера SVG слоя для связей
     */
    updateConnectionsLayerSize() {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.connectionsLayer.setAttribute('width', rect.width);
        this.connectionsLayer.setAttribute('height', rect.height);
    },

    /**
     * Масштабирование к содержимому
     */
    zoomToFit() {
        if (this.cards.size === 0) {
            // Сброс к центру если нет карточек
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this.updateCanvasTransform();
            this.updateStatusBar();
            return;
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        // Найти границы всех карточек
        this.cards.forEach(card => {
            minX = Math.min(minX, card.x);
            minY = Math.min(minY, card.y);
            maxX = Math.max(maxX, card.x + card.width);
            maxY = Math.max(maxY, card.y + card.height);
        });

        // Добавить отступы
        const padding = 50;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;
        
        const containerWidth = this.canvasContainer.offsetWidth;
        const containerHeight = this.canvasContainer.offsetHeight;
        
        // Рассчитать масштаб
        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        this.zoom = Math.min(scaleX, scaleY, 1); // Не увеличивать больше 100%
        
        // Центрировать содержимое
        this.panX = (containerWidth - contentWidth * this.zoom) / 2 - (minX - padding) * this.zoom;
        this.panY = (containerHeight - contentHeight * this.zoom) / 2 - (minY - padding) * this.zoom;
        
        this.updateCanvasTransform();
        this.updateStatusBar();
        
        console.log(`🔍 Масштабирование: ${Math.round(this.zoom * 100)}%`);
    },

    /**
     * Начало режима создания связи
     */
    startConnectionMode(fromCardId) {
        console.log(`🔗 Начало режима соединения от карточки: ${fromCardId}`);
        
        // Завершить предыдущий режим, если активен
        this.endConnectionMode();
        
        this.connectionMode = {
            active: true,
            fromCard: fromCardId,
            tempLine: null
        };

        // Изменить курсор
        document.body.style.cursor = 'crosshair';
        
        // Подсветить возможные цели
        this.cards.forEach((_, cardId) => {
            if (cardId !== fromCardId) {
                const cardElement = document.getElementById(cardId);
                if (cardElement) {
                    cardElement.classList.add('connection-target');
                }
            }
        });

        // Обработчики для режима соединения
        document.addEventListener('mousemove', this.onConnectionMove);
        document.addEventListener('click', this.onConnectionClick);
        
        this.showNotification('Выберите целевую карточку для создания связи', 'info');
    },

    /**
     * Движение мыши в режиме соединения
     */
    onConnectionMove: function(e) {
        if (!this.connectionMode.active) return;

        const fromCard = this.cards.get(this.connectionMode.fromCard);
        const fromElement = document.getElementById(this.connectionMode.fromCard);
        
        if (!fromCard || !fromElement) return;

        // Получить координаты начальной карточки
        const fromRect = fromElement.getBoundingClientRect();
        const canvasRect = this.canvasContainer.getBoundingClientRect();
        
        const startX = (fromRect.left + fromRect.width / 2 - canvasRect.left - this.panX) / this.zoom;
        const startY = (fromRect.top + fromRect.height / 2 - canvasRect.top - this.panY) / this.zoom;
        const endX = (e.clientX - canvasRect.left - this.panX) / this.zoom;
        const endY = (e.clientY - canvasRect.top - this.panY) / this.zoom;

        // Удалить предыдущую временную линию
        if (this.connectionMode.tempLine) {
            this.connectionMode.tempLine.remove();
        }

        // Создать новую временную линию
        this.connectionMode.tempLine = this.createConnectionLine(
            startX, startY, endX, endY, 'temp-connection', true
        );
        this.connectionsLayer.appendChild(this.connectionMode.tempLine);
    }.bind(this),

    /**
     * Клик в режиме соединения
     */
    onConnectionClick: function(e) {
        if (!this.connectionMode.active) return;

        const targetElement = e.target.closest('.card');
        if (targetElement && targetElement.id !== this.connectionMode.fromCard) {
            // Создать связь
            this.createConnection(this.connectionMode.fromCard, targetElement.id);
        }

        this.endConnectionMode();
    }.bind(this),

    /**
     * Завершение режима соединения
     */
    endConnectionMode() {
        if (!this.connectionMode.active) return;

        // Восстановить курсор
        document.body.style.cursor = '';
        
        // Убрать подсветку
        document.querySelectorAll('.connection-target').forEach(card => {
            card.classList.remove('connection-target');
        });

        // Удалить временную линию
        if (this.connectionMode.tempLine) {
            this.connectionMode.tempLine.remove();
        }

        // Удалить обработчики
        document.removeEventListener('mousemove', this.onConnectionMove);
        document.removeEventListener('click', this.onConnectionClick);

        // Сбросить состояние
        this.connectionMode = {
            active: false,
            fromCard: null,
            tempLine: null
        };
    },

    /**
     * Создание связи между карточками
     */
    createConnection(fromCardId, toCardId) {
        const connectionId = `${fromCardId}->${toCardId}`;
        
        // Проверить, нет ли уже такой связи
        if (this.connections.has(connectionId)) {
            this.showNotification('Связь уже существует', 'warning');
            return;
        }

        // Проверить существование карточек
        const fromCard = this.cards.get(fromCardId);
        const toCard = this.cards.get(toCardId);
        
        if (!fromCard || !toCard) {
            console.error('Ошибка: карточки не найдены', { fromCardId, toCardId });
            return;
        }

        const connectionData = {
            id: connectionId,
            from: fromCardId,
            to: toCardId,
            type: 'default',
            created: Date.now()
        };

        // Сохранить связь
        this.connections.set(connectionId, connectionData);
        
        // Добавить связь в данные начальной карточки
        if (!fromCard.connections.includes(toCardId)) {
            fromCard.connections.push(toCardId);
        }

        // Отрендерить связь
        this.renderConnection(connectionData);
        
        // Сохранить и обновить статистику
        this.debouncedSave();
        this.updateStatusBar();
        
        console.log(`✨ Создана связь: ${fromCardId} → ${toCardId}`);
        this.showNotification('Связь создана', 'success');
    },

    /**
     * Отрисовка связи
     */
    renderConnection(connectionData) {
        const fromElement = document.getElementById(connectionData.from);
        const toElement = document.getElementById(connectionData.to);
        
        if (!fromElement || !toElement) {
            console.warn('Элементы карточек не найдены для связи:', connectionData.id);
            return;
        }

        // Удалить существующую связь если есть
        const existingConnection = document.getElementById(connectionData.id);
        if (existingConnection) {
            existingConnection.remove();
        }

        // Получить координаты карточек
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        const canvasRect = this.canvasContainer.getBoundingClientRect();

        const startX = (fromRect.left + fromRect.width / 2 - canvasRect.left - this.panX) / this.zoom;
        const startY = (fromRect.top + fromRect.height / 2 - canvasRect.top - this.panY) / this.zoom;
        const endX = (toRect.left + toRect.width / 2 - canvasRect.left - this.panX) / this.zoom;
        const endY = (toRect.top + toRect.height / 2 - canvasRect.top - this.panY) / this.zoom;

        // Создать линию связи
        const connectionLine = this.createConnectionLine(startX, startY, endX, endY, connectionData.id);
        this.connectionsLayer.appendChild(connectionLine);
    },

    /**
     * Создание элемента линии связи
     */
    createConnectionLine(x1, y1, x2, y2, id, isTemporary = false) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', id);
        group.classList.add('connection-line');
        
        if (isTemporary) {
            group.classList.add('temp-connection');
        }

        // Рассчитать кривую Безье для плавной линии
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Контрольные точки для кривой
        const controlDistance = Math.min(distance * 0.5, 100);
        const cp1x = x1 + controlDistance * (dx > 0 ? 1 : -1);
        const cp1y = y1;
        const cp2x = x2 - controlDistance * (dx > 0 ? 1 : -1);
        const cp2y = y2;
        
        // Создать путь
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathData = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
        
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', isTemporary ? '#94a3b8' : 'url(#connectionGradient)');
        path.setAttribute('stroke-width', isTemporary ? '2' : '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', isTemporary ? '5,5' : 'none');
        
        if (!isTemporary) {
            path.setAttribute('marker-end', 'url(#arrowhead)');
        }
        
        group.appendChild(path);

        // Добавить обработчики для постоянных связей
        if (!isTemporary) {
            group.style.cursor = 'pointer';
            group.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showConnectionMenu(id, e.clientX, e.clientY);
            });
            
            group.addEventListener('mouseenter', () => {
                path.setAttribute('stroke-width', '3');
            });
            
            group.addEventListener('mouseleave', () => {
                path.setAttribute('stroke-width', '2');
            });
        }

        return group;
    },

    /**
     * Показать меню связи
     */
    showConnectionMenu(connectionId, x, y) {
        const menu = document.createElement('div');
        menu.id = 'connection-context-menu';
        menu.className = 'fixed bg-white shadow-xl rounded-lg border p-2 z-50 min-w-32';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        menu.innerHTML = `
            <button class="delete-connection w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center space-x-2">
                <span>🗑️</span>
                <span>Удалить связь</span>
            </button>
        `;
        
        document.body.appendChild(menu);
        
        menu.querySelector('.delete-connection').addEventListener('click', () => {
            this.deleteConnection(connectionId);
            menu.remove();
        });
        
        // Закрытие по клику вне меню
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    },

    /**
     * Обновление связей карточки при перемещении
     */
    updateCardConnections(cardId) {
        // Обновить исходящие связи
        const card = this.cards.get(cardId);
        if (card && card.connections) {
            card.connections.forEach(targetId => {
                const connectionId = `${cardId}->${targetId}`;
                const connectionData = this.connections.get(connectionId);
                if (connectionData) {
                    this.renderConnection(connectionData);
                }
            });
        }

        // Обновить входящие связи
        this.connections.forEach((connectionData) => {
            if (connectionData.to === cardId) {
                this.renderConnection(connectionData);
            }
        });
    },

    /**
     * Обновление всех связей
     */
    updateAllConnections() {
        this.connections.forEach((connectionData) => {
            this.renderConnection(connectionData);
        });
    },

    /**
     * Центрирование viewport на карточке
     */
    centerOnCard(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return;

        const containerWidth = this.canvasContainer.offsetWidth;
        const containerHeight = this.canvasContainer.offsetHeight;
        
        // Центрировать карточку
        this.panX = containerWidth / 2 - (card.x + card.width / 2) * this.zoom;
        this.panY = containerHeight / 2 - (card.y + card.height / 2) * this.zoom;
        
        this.updateCanvasTransform();
    },

    /**
     * Сброс viewport
     */
    resetViewport() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateCanvasTransform();
        this.updateStatusBar();
    },

    /**
     * Получить видимую область
     */
    getVisibleBounds() {
        const containerWidth = this.canvasContainer.offsetWidth;
        const containerHeight = this.canvasContainer.offsetHeight;
        
        return {
            left: -this.panX / this.zoom,
            top: -this.panY / this.zoom,
            right: (-this.panX + containerWidth) / this.zoom,
            bottom: (-this.panY + containerHeight) / this.zoom,
            width: containerWidth / this.zoom,
            height: containerHeight / this.zoom
        };
    },

    /**
     * Проверка видимости карточки
     */
    isCardVisible(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return false;
        
        const bounds = this.getVisibleBounds();
        
        return !(card.x + card.width < bounds.left ||
                card.x > bounds.right ||
                card.y + card.height < bounds.top ||
                card.y > bounds.bottom);
    }

});

console.log('🎨 Canvas.js загружен');