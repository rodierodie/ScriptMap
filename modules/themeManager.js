/**
 * Theme Manager - Управление темами приложения
 * Выделен из uiModule для устранения пересечений с CSS
 */
export class ThemeManager {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.currentTheme = 'light';
        
        this.init();
    }

    /**
     * Инициализация менеджера тем
     */
    init() {
        this.loadThemeFromStorage();
        this.setupEventListeners();
        
        console.log('🎨 Theme manager initialized');
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Отслеживание изменений темы в состоянии
        this.state.watch('ui.theme', (newTheme) => {
            this.applyTheme(newTheme);
        });

        // События переключения темы
        this.events.on('theme:toggle', () => {
            this.toggleTheme();
        });

        this.events.on('theme:set', (theme) => {
            this.setTheme(theme);
        });
    }

    /**
     * Загрузить тему из localStorage
     */
    loadThemeFromStorage() {
        try {
            const savedTheme = localStorage.getItem('notes-app-theme');
            if (savedTheme && this.isValidTheme(savedTheme)) {
                this.setTheme(savedTheme);
            } else {
                this.setTheme('light'); // По умолчанию
            }
        } catch (error) {
            console.warn('Could not load theme from localStorage:', error);
            this.setTheme('light');
        }
    }

    /**
     * Проверить валидность темы
     * @param {string} theme - Название темы
     * @returns {boolean} - Валидная ли тема
     */
    isValidTheme(theme) {
        const validThemes = ['light', 'dark'];
        return validThemes.includes(theme);
    }

    /**
     * Установить тему
     * @param {string} theme - Название темы ('light' | 'dark')
     */
    setTheme(theme) {
        if (!this.isValidTheme(theme)) {
            console.warn(`Invalid theme: ${theme}`);
            return;
        }

        this.currentTheme = theme;
        this.state.set('ui.theme', theme);
        this.applyTheme(theme);
        this.saveThemeToStorage(theme);

        this.events.emit('theme:changed', theme);
    }

    /**
     * Переключить тему
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Применить тему к DOM
     * @param {string} theme - Название темы
     */
    applyTheme(theme) {
        // Убираем старые классы темы
        document.body.removeAttribute('data-theme');
        
        // Добавляем новый атрибут темы
        if (theme !== 'light') {
            document.body.setAttribute('data-theme', theme);
        }

        this.currentTheme = theme;
        
        console.log(`🎨 Theme applied: ${theme}`);
    }

    /**
     * Сохранить тему в localStorage
     * @param {string} theme - Название темы
     */
    saveThemeToStorage(theme) {
        try {
            localStorage.setItem('notes-app-theme', theme);
        } catch (error) {
            console.warn('Could not save theme to localStorage:', error);
        }
    }

    /**
     * Получить текущую тему
     * @returns {string} - Название текущей темы
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Получить список доступных тем
     * @returns {Array} - Массив названий тем
     */
    getAvailableThemes() {
        return [
            { id: 'light', name: 'Светлая', icon: '☀️' },
            { id: 'dark', name: 'Темная', icon: '🌙' }
        ];
    }

    /**
     * Проверить поддержку системной темы
     * @returns {boolean} - Поддерживается ли системная тема
     */
    isSystemThemeSupported() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches !== undefined;
    }

    /**
     * Получить системную тему
     * @returns {string} - Системная тема ('light' | 'dark')
     */
    getSystemTheme() {
        if (!this.isSystemThemeSupported()) {
            return 'light';
        }

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * Установить тему в зависимости от системных настроек
     */
    setSystemTheme() {
        const systemTheme = this.getSystemTheme();
        this.setTheme(systemTheme);

        // Отслеживать изменения системной темы
        if (this.isSystemThemeSupported()) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                const newSystemTheme = e.matches ? 'dark' : 'light';
                this.setTheme(newSystemTheme);
            });
        }
    }

    /**
     * Получить CSS переменные для текущей темы
     * @returns {Object} - Объект с CSS переменными
     */
    getThemeVariables() {
        const computedStyle = getComputedStyle(document.documentElement);
        
        return {
            primary: computedStyle.getPropertyValue('--color-primary').trim(),
            background: computedStyle.getPropertyValue('--bg-primary').trim(),
            text: computedStyle.getPropertyValue('--text-primary').trim(),
            border: computedStyle.getPropertyValue('--border-light').trim()
        };
    }

    /**
     * Создать переключатель темы
     * @param {HTMLElement} container - Контейнер для переключателя
     */
    createThemeToggle(container) {
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.title = 'Переключить тему';
        
        const updateToggle = () => {
            const themes = this.getAvailableThemes();
            const currentThemeData = themes.find(t => t.id === this.currentTheme);
            const nextThemeData = themes.find(t => t.id !== this.currentTheme);
            
            toggle.innerHTML = currentThemeData.icon;
            toggle.title = `Переключить на ${nextThemeData.name.toLowerCase()} тему`;
        };

        toggle.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Обновлять при изменении темы
        this.events.on('theme:changed', updateToggle);
        
        updateToggle();
        container.appendChild(toggle);
        
        return toggle;
    }

    /**
     * Получить статистику использования тем
     * @returns {Object} - Статистика тем
     */
    getStats() {
        return {
            currentTheme: this.currentTheme,
            availableThemes: this.getAvailableThemes().length,
            systemThemeSupported: this.isSystemThemeSupported(),
            systemTheme: this.getSystemTheme()
        };
    }

    /**
     * Уничтожение менеджера
     */
    destroy() {
        // Очистка обработчиков событий происходит автоматически через events.off
        console.log('🗑️ Theme manager destroyed');
    }
}