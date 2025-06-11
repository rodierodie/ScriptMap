/**
 * ScriptMap - Дополнительные утилиты для работы с карточками
 * Расширение основного класса ScriptMapApp
 */

// Константы для карточек
const CARD_TYPES = {
    scene: {
        name: 'Сцена',
        icon: '🎬',
        color: '#2563eb',
        defaultTitle: 'Новая сцена',
        placeholder: 'Описание сцены, действия, диалоги...'
    },
    character: {
        name: 'Персонаж',
        icon: '👤',
        color: '#10b981',
        defaultTitle: 'Персонаж',
        placeholder: 'Имя, возраст, характер, мотивация...'
    },
    note: {
        name: 'Заметка',
        icon: '📝',
        color: '#f59e0b',
        defaultTitle: 'Заметка',
        placeholder: 'Ваши заметки и идеи...'
    },
    screen: {
        name: 'Экран',
        icon: '📱',
        color: '#7c3aed',
        defaultTitle: 'Экран',
        placeholder: 'Описание экрана, элементы интерфейса...'
    }
};

// Расширение ScriptMapApp дополнительными методами для карточек
Object.assign(ScriptMapApp.prototype, {
    
    /**
     * Поиск карточек по тексту
     */
    searchCards(query) {
        if (!query || query.trim().length < 2) {
            return Array.from(this.cards.values());
        }
        
        const searchTerm = query.toLowerCase().trim();
        const results = [];
        
        this.cards.forEach(card => {
            const titleMatch = card.title.toLowerCase().includes(searchTerm);
            const contentMatch = card.content.toLowerCase().includes(searchTerm);
            const typeMatch = CARD_TYPES[card.type]?.name.toLowerCase().includes(searchTerm);
            
            if (titleMatch || contentMatch || typeMatch) {
                results.push({
                    ...card,
                    relevance: this.calculateRelevance(card, searchTerm)
                });
            }
        });
        
        // Сортировать по релевантности
        return results.sort((a, b) => b.relevance - a.relevance);
    },

    /**
     * Расчет релевантности для поиска
     */
    calculateRelevance(card, searchTerm) {
        let score = 0;
        
        // Поиск в заголовке (высокий приоритет)
        if (card.title.toLowerCase().includes(searchTerm)) {
            score += 10;
            if (card.title.toLowerCase().startsWith(searchTerm)) {
                score += 5; // Дополнительные очки за начало строки
            }
        }
        
        // Поиск в содержимом
        if (card.content.toLowerCase().includes(searchTerm)) {
            score += 5;
        }
        
        // Поиск в типе
        if (CARD_TYPES[card.type]?.name.toLowerCase().includes(searchTerm)) {
            score += 3;
        }
        
        return score;
    },

    /**
     * Фильтрация карточек по типу
     */
    filterCardsByType(type) {
        if (!type || type === 'all') {
            return Array.from(this.cards.values());
        }
        
        return Array.from(this.cards.values()).filter(card => card.type === type);
    },

    /**
     * Получить статистику карточек
     */
    getCardsStatistics() {
        const stats = {
            total: this.cards.size,
            byType: {},
            totalWords: 0,
            totalCharacters: 0,
            averageWordsPerCard: 0,
            lastModified: null,
            oldestCard: null,
            newestCard: null
        };

        // Инициализировать счетчики типов
        Object.keys(CARD_TYPES).forEach(type => {
            stats.byType[type] = 0;
        });

        let oldestTimestamp = Infinity;
        let newestTimestamp = 0;

        this.cards.forEach(card => {
            // Подсчет по типам
            if (stats.byType.hasOwnProperty(card.type)) {
                stats.byType[card.type]++;
            }

            // Подсчет слов и символов
            const words = this.countWords(card.title + ' ' + card.content);
            const characters = (card.title + card.content).length;
            
            stats.totalWords += words;
            stats.totalCharacters += characters;

            // Поиск самых старых и новых карточек
            if (card.created && card.created < oldestTimestamp) {
                oldestTimestamp = card.created;
                stats.oldestCard = card;
            }

            if (card.created && card.created > newestTimestamp) {
                newestTimestamp = card.created;
                stats.newestCard = card;
            }

            // Последняя модификация
            if (card.modified && (!stats.lastModified || card.modified > stats.lastModified)) {
                stats.lastModified = card.modified;
            }
        });

        stats.averageWordsPerCard = stats.total > 0 ? Math.round(stats.totalWords / stats.total) : 0;

        return stats;
    },

    /**
     * Подсчет слов в тексте
     */
    countWords(text) {
        if (!text || typeof text !== 'string') return 0;
        
        return text
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 0)
            .length;
    },

    /**
     * Группировка карточек по расположению
     */
    groupCardsByLocation() {
        const gridSize = 300; // Размер сетки для группировки
        const groups = new Map();

        this.cards.forEach(card => {
            const gridX = Math.floor(card.x / gridSize);
            const gridY = Math.floor(card.y / gridSize);
            const groupKey = `${gridX},${gridY}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    x: gridX,
                    y: gridY,
                    cards: [],
                    bounds: {
                        minX: Infinity,
                        minY: Infinity,
                        maxX: -Infinity,
                        maxY: -Infinity
                    }
                });
            }

            const group = groups.get(groupKey);
            group.cards.push(card);

            // Обновить границы группы
            group.bounds.minX = Math.min(group.bounds.minX, card.x);
            group.bounds.minY = Math.min(group.bounds.minY, card.y);
            group.bounds.maxX = Math.max(group.bounds.maxX, card.x + card.width);
            group.bounds.maxY = Math.max(group.bounds.maxY, card.y + card.height);
        });

        return Array.from(groups.values()).filter(group => group.cards.length > 1);
    },

    /**
     * Автоматическое выравнивание карточек
     */
    autoAlignCards(selectedCards = null) {
        const cards = selectedCards || Array.from(this.cards.values());
        if (cards.length < 2) return;

        // Сортировать по X координате
        cards.sort((a, b) => a.x - b.x);

        const spacing = 50;
        let currentX = cards[0].x;

        cards.forEach((card, index) => {
            if (index > 0) {
                currentX += cards[index - 1].width + spacing;
                card.x = currentX;
                card.modified = Date.now();

                // Обновить DOM элемент
                const cardElement = document.getElementById(card.id);
                if (cardElement) {
                    cardElement.style.left = card.x + 'px';
                }
            }
        });

        this.updateAllConnections();
        this.debouncedSave();
        this.showNotification(`Выровнено ${cards.length} карточек`, 'success');
    },

    /**
     * Распределение карточек по сетке
     */
    arrangeCardsGrid(columns = 3) {
        const cards = Array.from(this.cards.values());
        if (cards.length === 0) return;

        const cardWidth = 220;
        const cardHeight = 160;
        const spacingX = 50;
        const spacingY = 50;

        cards.forEach((card, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            card.x = col * (cardWidth + spacingX) + 100;
            card.y = row * (cardHeight + spacingY) + 100;
            card.width = cardWidth;
            card.height = cardHeight;
            card.modified = Date.now();

            // Обновить DOM элемент
            const cardElement = document.getElementById(card.id);
            if (cardElement) {
                cardElement.style.left = card.x + 'px';
                cardElement.style.top = card.y + 'px';
                cardElement.style.width = card.width + 'px';
                cardElement.style.height = card.height + 'px';
            }
        });

        this.updateAllConnections();
        this.debouncedSave();
        this.showNotification(`Карточки распределены по сетке ${columns} колонок`, 'success');
    },

    /**
     * Поиск карточек рядом с заданной
     */
    findNearbyCards(targetCardId, radius = 200) {
        const targetCard = this.cards.get(targetCardId);
        if (!targetCard) return [];

        const nearbyCards = [];
        const targetCenterX = targetCard.x + targetCard.width / 2;
        const targetCenterY = targetCard.y + targetCard.height / 2;

        this.cards.forEach((card, cardId) => {
            if (cardId === targetCardId) return;

            const cardCenterX = card.x + card.width / 2;
            const cardCenterY = card.y + card.height / 2;

            const distance = Math.sqrt(
                Math.pow(cardCenterX - targetCenterX, 2) +
                Math.pow(cardCenterY - targetCenterY, 2)
            );

            if (distance <= radius) {
                nearbyCards.push({
                    ...card,
                    distance: Math.round(distance)
                });
            }
        });

        return nearbyCards.sort((a, b) => a.distance - b.distance);
    },

    /**
     * Создание цепочки карточек
     */
    createCardChain(startX, startY, count = 3, type = 'scene', direction = 'horizontal') {
        const cards = [];
        const spacing = direction === 'horizontal' ? { x: 250, y: 0 } : { x: 0, y: 180 };

        for (let i = 0; i < count; i++) {
            const cardData = {
                type: type,
                title: `${CARD_TYPES[type].defaultTitle} ${i + 1}`,
                content: ''
            };

            const x = startX + spacing.x * i;
            const y = startY + spacing.y * i;

            const cardId = this.createCard(x, y, cardData);
            cards.push(cardId);

            // Создать связь с предыдущей карточкой
            if (i > 0) {
                this.createConnection(cards[i - 1], cardId);
            }
        }

        this.showNotification(`Создана цепочка из ${count} карточек`, 'success');
        return cards;
    },

    /**
     * Валидация карточки
     */
    validateCard(card) {
        const errors = [];

        if (!card.title || card.title.trim().length === 0) {
            errors.push('Отсутствует заголовок');
        }

        if (card.title && card.title.length > 100) {
            errors.push('Заголовок слишком длинный (максимум 100 символов)');
        }

        if (card.content && card.content.length > 2000) {
            errors.push('Содержимое слишком длинное (максимум 2000 символов)');
        }

        if (!CARD_TYPES.hasOwnProperty(card.type)) {
            errors.push('Неизвестный тип карточки');
        }

        if (typeof card.x !== 'number' || typeof card.y !== 'number') {
            errors.push('Неверные координаты');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },

    /**
     * Экспорт карточек в текстовый формат
     */
    exportCardsToText() {
        let output = '# ScriptMap Project\n\n';
        output += `Экспортировано: ${new Date().toLocaleString()}\n`;
        output += `Всего карточек: ${this.cards.size}\n\n`;

        // Группировать по типам
        const cardsByType = {};
        this.cards.forEach(card => {
            if (!cardsByType[card.type]) {
                cardsByType[card.type] = [];
            }
            cardsByType[card.type].push(card);
        });

        // Экспортировать каждый тип
        Object.keys(cardsByType).forEach(type => {
            const cards = cardsByType[type];
            const typeInfo = CARD_TYPES[type];
            
            output += `## ${typeInfo.icon} ${typeInfo.name} (${cards.length})\n\n`;

            cards.forEach((card, index) => {
                output += `### ${index + 1}. ${card.title}\n`;
                if (card.content.trim()) {
                    output += `${card.content}\n`;
                }
                output += '\n---\n\n';
            });
        });

        return output;
    },

    /**
     * Получить информацию о карточке
     */
    getCardInfo(cardId) {
        const card = this.cards.get(cardId);
        if (!card) return null;

        const validation = this.validateCard(card);
        const nearbyCards = this.findNearbyCards(cardId, 150);
        
        // Подсчет связей
        const outgoingConnections = card.connections || [];
        const incomingConnections = [];
        
        this.connections.forEach(connection => {
            if (connection.to === cardId) {
                incomingConnections.push(connection.from);
            }
        });

        return {
            ...card,
            validation: validation,
            statistics: {
                wordCount: this.countWords(card.title + ' ' + card.content),
                characterCount: (card.title + card.content).length,
                outgoingConnections: outgoingConnections.length,
                incomingConnections: incomingConnections.length,
                nearbyCards: nearbyCards.length
            },
            typeInfo: CARD_TYPES[card.type],
            nearbyCards: nearbyCards,
            createdFormatted: card.created ? new Date(card.created).toLocaleString() : 'Неизвестно',
            modifiedFormatted: card.modified ? new Date(card.modified).toLocaleString() : 'Неизвестно'
        };
    },

    /**
     * Клонирование структуры карточек
     */
    cloneCardStructure(sourceCardIds, offsetX = 50, offsetY = 50) {
        const clonedCards = new Map();
        const connectionsToCopy = [];

        // Клонировать карточки
        sourceCardIds.forEach(sourceId => {
            const sourceCard = this.cards.get(sourceId);
            if (!sourceCard) return;

            const clonedData = {
                ...sourceCard,
                x: sourceCard.x + offsetX,
                y: sourceCard.y + offsetY,
                title: sourceCard.title + ' (копия)',
                connections: [],
                created: Date.now(),
                modified: Date.now()
            };

            delete clonedData.id;
            const newCardId = this.createCard(clonedData.x, clonedData.y, clonedData);
            clonedCards.set(sourceId, newCardId);
        });

        // Клонировать связи между скопированными карточками
        this.connections.forEach(connection => {
            const fromCloned = clonedCards.get(connection.from);
            const toCloned = clonedCards.get(connection.to);
            
            if (fromCloned && toCloned) {
                this.createConnection(fromCloned, toCloned);
            }
        });

        this.showNotification(`Клонировано ${clonedCards.size} карточек`, 'success');
        return Array.from(clonedCards.values());
    }

});

console.log('🃏 Cards.js загружен');