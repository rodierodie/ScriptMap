/**
 * UI Module - Управление элементами пользовательского интерфейса
 * 
 * Функции:
 * - Управление кнопками и панелями
 * - Показ/скрытие инструкций
 * - Обработка пользовательских действий
 */
export class UIModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        
        // Найти элементы UI
        this.elements = {
            infoBtn: document.querySelector('.info-btn'),
            instructions: document.querySelector('.instructions'),
            addNoteBtn: document.querySelector('.add-note-btn')
        };
        
        this.validateElements();
        this.init();
    }

    /**
     * Проверка наличия необходимых элементов
     */
    validateElements() {
        const missing = Object.entries(this.elements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);
            
        if (missing.length > 0) {
            throw new Error(`UI elements not found: ${missing.join(', ')}`);
        }
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
        this.setupKeyboardShortcuts();
        
        console.log('🎛️ UI module initialized');
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Кнопка информации
        this.elements.infoBtn.addEventListener('click', () => {
            this.toggleInstructions();
        });

        // Кнопка добавления заметки
        this.elements.addNoteBtn.addEventListener('click', () => {
            this.createNoteAtCenter();
        });

        // Клик по самой легенде для её скрытия
        this.elements.instructions.addEventListener('click', () => {
            this.hideInstructions();
        });

        // Клик вне инструкций для их скрытия (но не по кнопке info)
        document.addEventListener('click', (e) => {
            if (this.state.get('ui.instructionsVisible') && 
                !this.elements.instructions.contains(e.target) &&
                !this.elements.infoBtn.contains(e.target)) {
                this.hideInstructions();
            }
        });
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        // Отслеживание видимости инструкций
        this.state.watch('ui.instructionsVisible', (visible) => {
            this.updateInstructionsVisibility(visible);
        });

        // Отслеживание темы
        this.state.watch('ui.theme', (theme) => {
            this.updateTheme(theme);
        });
    }

    /**
     * Настройка горячих клавиш
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Не обрабатывать горячие клавиши если открыто модальное окно
            if (document.getElementById('noteModal')) {
                return;
            }

            // Игнорировать если фокус в textarea
            if (e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case '?':
                    e.preventDefault();
                    this.toggleInstructions();
                    break;
                    
                case 'n':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.createNoteAtCenter();
                    }
                    break;
                    
                case 'h':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.centerCanvas();
                    }
                    break;
                    
                case 'Escape':
                    if (this.state.get('ui.instructionsVisible')) {
                        this.hideInstructions();
                    }
                    break;
            }
        });
    }

    /**
     * Переключить видимость инструкций
     */
    toggleInstructions() {
        const currentlyVisible = this.state.get('ui.instructionsVisible');
        this.state.set('ui.instructionsVisible', !currentlyVisible);
        
        this.events.emit('ui:instructions-toggled', !currentlyVisible);
    }

    /**
     * Показать инструкции
     */
    showInstructions() {
        this.state.set('ui.instructionsVisible', true);
        this.events.emit('ui:instructions-shown');
    }

    /**
     * Скрыть инструкции
     */
    hideInstructions() {
        this.state.set('ui.instructionsVisible', false);
        this.events.emit('ui:instructions-hidden');
    }

    /**
     * Обновить видимость инструкций в DOM
     * @param {boolean} visible - Видимость
     */
    updateInstructionsVisibility(visible) {
        if (visible) {
            // Показать инструкции и скрыть кнопку info
            this.elements.instructions.classList.remove('hidden');
            this.elements.infoBtn.classList.add('hidden');
            this.elements.infoBtn.setAttribute('aria-expanded', 'true');
        } else {
            // Скрыть инструкции и показать кнопку info
            this.elements.instructions.classList.add('hidden');
            this.elements.infoBtn.classList.remove('hidden');
            this.elements.infoBtn.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Создать заметку в центре экрана
     */
    createNoteAtCenter() {
        const container = document.querySelector('.canvas-container');
        const canvas = document.querySelector('.canvas');
        
        if (container && canvas) {
            const containerRect = container.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            
            // Вычислить центр экрана относительно холста
            const centerX = (containerRect.width / 2) - canvasRect.left;
            const centerY = (containerRect.height / 2) - canvasRect.top;
            
            this.events.emit('note:create', { 
                x: Math.max(0, centerX), 
                y: Math.max(0, centerY) 
            });
        } else {
            // Fallback - создать в произвольном месте
            this.events.emit('note:create');
        }
        
        this.events.emit('ui:note-created-from-button');
    }

    /**
     * Центрировать холст
     */
    centerCanvas() {
        this.events.emit('canvas:center-request');
    }

    /**
     * Обновить тему приложения
     * @param {string} theme - Название темы ('light', 'dark')
     */
    updateTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        
        // Сохранить в localStorage
        try {
            localStorage.setItem('notes-app-theme', theme);
        } catch (error) {
            console.warn('Could not save theme to localStorage:', error);
        }
        
        this.events.emit('ui:theme-changed', theme);
    }

    /**
     * Переключить тему
     */
    toggleTheme() {
        const currentTheme = this.state.get('ui.theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.state.set('ui.theme', newTheme);
    }

    /**
     * Показать уведомление
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления ('info', 'success', 'warning', 'error')
     * @param {number} duration - Длительность показа в мс
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое удаление
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        this.events.emit('ui:notification-shown', { message, type, duration });
    }

    /**
     * Получить цвет для типа уведомления
     * @param {string} type - Тип уведомления
     * @returns {string} - CSS цвет
     */
    getNotificationColor(type) {
        const colors = {
            info: '#4285f4',
            success: '#34a853',
            warning: '#fbbc04',
            error: '#ea4335'
        };
        return colors[type] || colors.info;
    }

    /**
     * Показать диалог подтверждения
     * @param {string} message - Сообщение
     * @param {function} onConfirm - Callback при подтверждении
     * @param {function} onCancel - Callback при отмене
     */
    showConfirmDialog(message, onConfirm, onCancel) {
        const result = confirm(message);
        if (result && onConfirm) {
            onConfirm();
        } else if (!result && onCancel) {
            onCancel();
        }
        
        this.events.emit('ui:confirm-dialog-shown', { message, result });
        return result;
    }

    /**
     * Обновить счетчик заметок
     * @param {number} count - Количество заметок
     */
    updateNotesCount(count) {
        // Обновить title страницы
        document.title = count > 0 ? `Notes (${count})` : 'Модульный текстовый редактор';
        
        // Обновить кнопку добавления заметки
        this.elements.addNoteBtn.title = `Добавить заметку (${count} сейчас)`;
        
        this.events.emit('ui:notes-count-updated', count);
    }

    /**
     * Показать статистику приложения
     */
    showStats() {
        const notes = this.state.get('notes');
        const totalCharacters = notes.reduce((sum, note) => sum + note.content.length, 0);
        const totalWords = notes.reduce((sum, note) => {
            return sum + note.content.trim().split(/\s+/).filter(word => word.length > 0).length;
        }, 0);
        
        const stats = [
            `📝 Заметок: ${notes.length}`,
            `📊 Символов: ${totalCharacters}`,
            `📈 Слов: ${totalWords}`,
            `⏱️ Средняя длина: ${notes.length > 0 ? Math.round(totalCharacters / notes.length) : 0} символов`
        ].join('\n');
        
        alert(`Статистика:\n\n${stats}`);
        this.events.emit('ui:stats-shown', { notes: notes.length, characters: totalCharacters, words: totalWords });
    }

    /**
     * Инициализировать тему из localStorage
     */
    initializeTheme() {
        try {
            const savedTheme = localStorage.getItem('notes-app-theme');
            if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
                this.state.set('ui.theme', savedTheme);
            }
        } catch (error) {
            console.warn('Could not load theme from localStorage:', error);
        }
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        // Если инструкции видны, проверить помещаются ли они
        if (this.state.get('ui.instructionsVisible')) {
            const instructions = this.elements.instructions;
            const rect = instructions.getBoundingClientRect();
            
            if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
                // Скрыть инструкции если они не помещаются
                this.hideInstructions();
                this.showNotification('Инструкции скрыты из-за изменения размера окна', 'info', 2000);
            }
        }
    }

    /**
     * Получить состояние UI
     * @returns {Object} - Объект с состоянием UI
     */
    getUIState() {
        return {
            instructionsVisible: this.state.get('ui.instructionsVisible'),
            theme: this.state.get('ui.theme')
        };
    }

    /**
     * Уничтожение модуля (очистка обработчиков)
     */
    destroy() {
        // Здесь можно добавить очистку обработчиков если потребуется
        console.log('🗑️ UI module destroyed');
    }
}