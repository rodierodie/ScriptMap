/**
 * Notes Module - Управление созданием, редактированием и перемещением заметок
 * 
 * Функции:
 * - Создание и удаление заметок
 * - Перетаскивание заметок
 * - Автоматическое изменение размера
 * - Редактирование содержимого
 */
export class NotesModule {
    constructor(state, events) {
        this.state = state;
        this.events = events;
        this.canvas = document.querySelector('.canvas');
        this.positionUpdateTimeout = null;
        
        if (!this.canvas) {
            throw new Error('Canvas element not found in DOM');
        }
        
        this.init();
    }

    /**
     * Инициализация модуля
     */
    init() {
        this.setupEventListeners();
        this.setupStateWatchers();
        this.setupGlobalDragEvents();
        
        console.log('📝 Notes module initialized');
    }

    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        // Создание заметок
        this.events.on('note:create', (data) => {
            this.createNote(data?.x, data?.y);
        });
        
        // Удаление заметок
        this.events.on('note:delete', (noteId) => {
            this.deleteNote(noteId);
        });
        
        // Обновление заметок
        this.events.on('note:update', (data) => {
            this.updateNote(data.id, data.updates);
        });
    }

    /**
     * Настройка отслеживания изменений состояния
     */
    setupStateWatchers() {
        // Отслеживание изменений массива заметок
        this.state.watch('notes', (newNotes, oldNotes) => {
            this.handleNotesChange(newNotes, oldNotes);
        });
    }

    /**
     * Создать новую заметку
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @returns {Object} - Созданная заметка
     */
    createNote(x = null, y = null) {
        const id = this.generateId();
        const note = {
            id,
            title: 'Новая заметка',
            content: '',
            position: {
                x: x !== null ? x : Math.random() * 300 + 100,
                y: y !== null ? y : Math.random() * 200 + 100
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Добавить заметку в состояние
        this.state.update('notes', (notes) => [...notes, note]);
        
        this.events.emit('note:created', note);
        console.log('📝 Note created:', id);
        
        return note;
    }

    /**
     * Удалить заметку
     * @param {string} noteId - ID заметки
     */
    deleteNote(noteId) {
        const notesBefore = this.state.get('notes');
        const deletedNote = notesBefore.find(note => note.id === noteId);
        
        if (deletedNote) {
            this.state.update('notes', (notes) =>
                notes.filter(note => note.id !== noteId)
            );
            
            this.events.emit('note:deleted', deletedNote);
            console.log('🗑️ Note deleted:', noteId);
        }
    }

    /**
     * Обновить заметку
     * @param {string} noteId - ID заметки
     * @param {Object} updates - Обновления для заметки
     */
    updateNote(noteId, updates) {
        this.state.update('notes', (notes) =>
            notes.map(note =>
                note.id === noteId 
                    ? { ...note, ...updates, updatedAt: Date.now() }
                    : note
            )
        );
        
        this.events.emit('note:updated', { id: noteId, updates });
    }

    /**
     * Умная обработка изменений заметок
     * @param {Array} newNotes - Новый массив заметок
     * @param {Array} oldNotes - Старый массив заметок
     */
    handleNotesChange(newNotes, oldNotes) {
        if (!oldNotes) {
            // Первая загрузка - рендерим все
            this.renderNotes();
            return;
        }

        // Найти изменения
        const changes = this.compareNotes(newNotes, oldNotes);
        
        // Применить изменения
        changes.added.forEach(note => this.renderNote(note));
        changes.removed.forEach(noteId => this.removeNoteElement(noteId));
        changes.updated.forEach(({ note, changes: noteChanges }) => {
            this.updateNoteElement(note, noteChanges);
        });
    }

    /**
     * Сравнить два массива заметок и найти изменения
     * @param {Array} newNotes - Новые заметки
     * @param {Array} oldNotes - Старые заметки
     * @returns {Object} - Объект с изменениями
     */
    compareNotes(newNotes, oldNotes) {
        const oldNotesMap = new Map(oldNotes.map(note => [note.id, note]));
        const newNotesMap = new Map(newNotes.map(note => [note.id, note]));
        
        const added = [];
        const removed = [];
        const updated = [];
        
        // Найти добавленные и обновленные
        newNotes.forEach(newNote => {
            const oldNote = oldNotesMap.get(newNote.id);
            if (!oldNote) {
                added.push(newNote);
            } else {
                // Проверить изменения
                const changes = this.getNoteChanges(newNote, oldNote);
                if (Object.keys(changes).length > 0) {
                    updated.push({ note: newNote, changes });
                }
            }
        });
        
        // Найти удаленные
        oldNotes.forEach(oldNote => {
            if (!newNotesMap.has(oldNote.id)) {
                removed.push(oldNote.id);
            }
        });
        
        return { added, removed, updated };
    }

    /**
     * Получить изменения между двумя заметками
     * @param {Object} newNote - Новая заметка
     * @param {Object} oldNote - Старая заметка
     * @returns {Object} - Объект с изменениями
     */
    getNoteChanges(newNote, oldNote) {
        const changes = {};
        
        if (newNote.title !== oldNote.title) {
            changes.title = newNote.title;
        }
        
        if (newNote.content !== oldNote.content) {
            changes.content = newNote.content;
        }
        
        if (newNote.position.x !== oldNote.position.x || 
            newNote.position.y !== oldNote.position.y) {
            changes.position = newNote.position;
        }
        
        return changes;
    }

    /**
     * Удалить элемент заметки из DOM
     * @param {string} noteId - ID заметки
     */
    removeNoteElement(noteId) {
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.remove();
        }
    }

    /**
     * Обновить элемент заметки в DOM
     * @param {Object} note - Объект заметки
     * @param {Object} changes - Изменения
     */
    updateNoteElement(note, changes) {
        const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
        if (!noteElement) return;
        
        // Обновить позицию если изменилась
        if (changes.position) {
            noteElement.style.left = note.position.x + 'px';
            noteElement.style.top = note.position.y + 'px';
        }
        
        // Обновить заголовок
        if (changes.title) {
            const titleElement = noteElement.querySelector('.note-title');
            if (titleElement) {
                titleElement.textContent = note.title || 'Новая заметка';
            }
        }
        
        // Обновить превью содержимого
        if (changes.content !== undefined) {
            const previewElement = noteElement.querySelector('.note-preview');
            if (previewElement) {
                if (note.content && note.content.trim()) {
                    previewElement.textContent = note.content;
                    previewElement.classList.remove('empty');
                } else {
                    previewElement.textContent = 'Пустая заметка';
                    previewElement.classList.add('empty');
                }
            }
        }
    }

    /**
     * Отрендерить одну заметку
     * @param {Object} note - Объект заметки
     */
    renderNote(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.setAttribute('data-note-id', note.id);
        noteElement.style.left = note.position.x + 'px';
        noteElement.style.top = note.position.y + 'px';

        // Создать содержимое заметки
        const title = document.createElement('div');
        title.className = 'note-title';
        title.textContent = note.title || 'Новая заметка';

        const preview = document.createElement('div');
        preview.className = 'note-preview';
        if (note.content && note.content.trim()) {
            preview.textContent = note.content;
        } else {
            preview.textContent = 'Пустая заметка';
            preview.classList.add('empty');
        }

        const openBtn = document.createElement('button');
        openBtn.className = 'note-open-btn';
        openBtn.textContent = 'Открыть';

        // Создать действия
        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const dragHandle = document.createElement('button');
        dragHandle.className = 'drag-handle';
        dragHandle.title = 'Перетащить';

        const duplicateBtn = document.createElement('button');
        duplicateBtn.className = 'note-action-btn duplicate';
        duplicateBtn.innerHTML = '⧉';
        duplicateBtn.title = 'Дублировать';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-action-btn delete';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = 'Удалить';

        actions.appendChild(dragHandle);
        actions.appendChild(duplicateBtn);
        actions.appendChild(deleteBtn);

        // Собрать заметку
        noteElement.appendChild(title);
        noteElement.appendChild(preview);
        noteElement.appendChild(openBtn);
        noteElement.appendChild(actions);

        this.canvas.appendChild(noteElement);
        this.setupNoteEvents(noteElement, note.id);
    }

    /**
     * Настроить события для заметки
     * @param {HTMLElement} noteElement - DOM элемент заметки
     * @param {string} noteId - ID заметки
     */
    setupNoteEvents(noteElement, noteId) {
        const openBtn = noteElement.querySelector('.note-open-btn');
        const dragHandle = noteElement.querySelector('.drag-handle');
        const duplicateBtn = noteElement.querySelector('.note-action-btn.duplicate');
        const deleteBtn = noteElement.querySelector('.note-action-btn.delete');

        // Открытие модального окна ТОЛЬКО по кнопке "Открыть"
        openBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openNoteModal(noteId);
        });

        // Перетаскивание через drag handle
        dragHandle.addEventListener('mousedown', (e) => {
            this.startDragging(noteId, noteElement, e);
        });

        // Дублирование заметки
        duplicateBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.duplicateNote(noteId);
        });

        // Удаление заметки
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Удалить заметку?')) {
                this.deleteNote(noteId);
            }
        });

        // Убираем обработчик клика с всей заметки
        // Теперь открытие происходит только через кнопку "Открыть"
    }

    /**
     * Обработка горячих клавиш в заметке
     * @param {KeyboardEvent} e - Событие клавиатуры
     * @param {string} noteId - ID заметки
     */
    handleNoteKeydown(e, noteId) {
        // Ctrl/Cmd + D - дублировать заметку
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.duplicateNote(noteId);
        }
        
        // Ctrl/Cmd + Delete - удалить заметку
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            e.preventDefault();
            this.deleteNote(noteId);
        }
    }

    /**
     * Начать перетаскивание заметки
     * @param {string} noteId - ID заметки
     * @param {HTMLElement} noteElement - DOM элемент заметки
     * @param {MouseEvent} e - Событие мыши
     */
    startDragging(noteId, noteElement, e) {
        this.state.set('canvas.isDragging', true);
        this.state.set('interaction.dragNote', noteId);
        noteElement.classList.add('dragging');
        
        const dragHandle = noteElement.querySelector('.drag-handle');
        if (dragHandle) {
            dragHandle.classList.add('dragging');
        }

        const rect = noteElement.getBoundingClientRect();
        this.state.set('interaction.dragOffset', {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        e.preventDefault();
        e.stopPropagation();
        
        this.events.emit('note:drag-start', { noteId, position: { x: e.clientX, y: e.clientY } });
    }

    /**
     * Настройка глобальных событий перетаскивания
     */
    setupGlobalDragEvents() {
        document.addEventListener('mousemove', (e) => {
            const dragNoteId = this.state.get('interaction.dragNote');
            if (this.state.get('canvas.isDragging') && dragNoteId) {
                this.handleDragMove(e, dragNoteId);
            }
        });

        document.addEventListener('mouseup', () => {
            this.handleDragEnd();
        });
    }

    /**
     * Обработка движения при перетаскивании
     * @param {MouseEvent} e - Событие мыши
     * @param {string} noteId - ID перетаскиваемой заметки
     */
    handleDragMove(e, noteId) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const dragOffset = this.state.get('interaction.dragOffset');
        
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;
        
        const newPosition = {
            x: Math.max(0, x),
            y: Math.max(0, y)
        };
        
        this.updateNotePosition(noteId, newPosition);
        this.events.emit('note:drag-move', { noteId, position: newPosition });
    }

    /**
     * Завершение перетаскивания
     */
    handleDragEnd() {
        const dragNoteId = this.state.get('interaction.dragNote');
        
        if (this.state.get('canvas.isDragging') && dragNoteId) {
            const noteElement = document.querySelector(`[data-note-id="${dragNoteId}"]`);
            if (noteElement) {
                noteElement.classList.remove('dragging');
                const dragHandle = noteElement.querySelector('.drag-handle');
                if (dragHandle) {
                    dragHandle.classList.remove('dragging');
                }
                
                // Принудительно сохранить финальную позицию
                clearTimeout(this.positionUpdateTimeout);
                const finalPosition = {
                    x: parseInt(noteElement.style.left),
                    y: parseInt(noteElement.style.top)
                };
                this.updateNote(dragNoteId, { position: finalPosition });
            }
            
            this.state.set('canvas.isDragging', false);
            this.state.set('interaction.dragNote', null);
            
            this.events.emit('note:drag-end', { noteId: dragNoteId });
        }
    }

    /**
     * Отрендерить все заметки (полный рендер)
     */
    renderNotes() {
        // Очистить существующие заметки
        this.canvas.querySelectorAll('.note').forEach(note => note.remove());
        
        // Отрендерить все заметки из состояния
        const notes = this.state.get('notes');
        notes.forEach(note => this.renderNote(note));
    }

    /**
     * Обновить содержимое заметки (оптимизированная версия)
     * @param {string} noteId - ID заметки
     * @param {string} content - Новое содержимое
     */
    updateNoteContent(noteId, content) {
        // Найти заметку в состоянии
        const notes = this.state.get('notes');
        const currentNote = notes.find(note => note.id === noteId);
        
        // Обновить только если содержимое действительно изменилось
        if (currentNote && currentNote.content !== content) {
            this.updateNote(noteId, { content });
        }
    }

    /**
     * Обновить позицию заметки (оптимизированная версия)
     * @param {string} noteId - ID заметки
     * @param {Object} position - Новая позиция {x, y}
     */
    updateNotePosition(noteId, position) {
        // Найти заметку в состоянии
        const notes = this.state.get('notes');
        const currentNote = notes.find(note => note.id === noteId);
        
        // Обновить DOM немедленно для плавного перетаскивания
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.style.left = position.x + 'px';
            noteElement.style.top = position.y + 'px';
        }
        
        // Обновить состояние только если позиция действительно изменилась
        if (currentNote && 
            (currentNote.position.x !== position.x || currentNote.position.y !== position.y)) {
            
            // Используем debounce для обновления состояния при перетаскивании
            clearTimeout(this.positionUpdateTimeout);
            this.positionUpdateTimeout = setTimeout(() => {
                this.updateNote(noteId, { position });
            }, 16); // ~60fps
        }
    }

    /**
     * Дублировать заметку
     * @param {string} noteId - ID заметки для дублирования
     */
    duplicateNote(noteId) {
        const notes = this.state.get('notes');
        const originalNote = notes.find(note => note.id === noteId);
        
        if (originalNote) {
            const newNote = {
                ...originalNote,
                id: this.generateId(),
                title: originalNote.title + ' (копия)',
                position: {
                    x: originalNote.position.x + 20,
                    y: originalNote.position.y + 20
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            
            this.state.update('notes', (notes) => [...notes, newNote]);
            this.events.emit('note:duplicated', { original: originalNote, duplicate: newNote });
        }
    }

    /**
     * Начать перетаскивание заметки
     * @param {string} noteId - ID заметки
     * @param {HTMLElement} noteElement - DOM элемент заметки
     * @param {MouseEvent} e - Событие мыши
     */
    startDragging(noteId, noteElement, e) {
        this.state.set('canvas.isDragging', true);
        this.state.set('interaction.dragNote', noteId);
        noteElement.classList.add('dragging');
        
        const dragHandle = noteElement.querySelector('.drag-handle');
        if (dragHandle) {
            dragHandle.classList.add('dragging');
        }

        const rect = noteElement.getBoundingClientRect();
        this.state.set('interaction.dragOffset', {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });

        e.preventDefault();
        e.stopPropagation();
        
        this.events.emit('note:drag-start', { noteId, position: { x: e.clientX, y: e.clientY } });
    }

    /**
     * Настройка глобальных событий перетаскивания
     */
    setupGlobalDragEvents() {
        document.addEventListener('mousemove', (e) => {
            const dragNoteId = this.state.get('interaction.dragNote');
            if (this.state.get('canvas.isDragging') && dragNoteId) {
                this.handleDragMove(e, dragNoteId);
            }
        });

        document.addEventListener('mouseup', () => {
            this.handleDragEnd();
        });
    }

    /**
     * Обработка движения при перетаскивании
     * @param {MouseEvent} e - Событие мыши
     * @param {string} noteId - ID перетаскиваемой заметки
     */
    handleDragMove(e, noteId) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const dragOffset = this.state.get('interaction.dragOffset');
        
        const x = e.clientX - canvasRect.left - dragOffset.x;
        const y = e.clientY - canvasRect.top - dragOffset.y;
        
        const newPosition = {
            x: Math.max(0, x),
            y: Math.max(0, y)
        };
        
        this.updateNotePosition(noteId, newPosition);
        this.events.emit('note:drag-move', { noteId, position: newPosition });
    }

    /**
     * Завершение перетаскивания
     */
    handleDragEnd() {
        const dragNoteId = this.state.get('interaction.dragNote');
        
        if (this.state.get('canvas.isDragging') && dragNoteId) {
            const noteElement = document.querySelector(`[data-note-id="${dragNoteId}"]`);
            if (noteElement) {
                noteElement.classList.remove('dragging');
                const dragHandle = noteElement.querySelector('.drag-handle');
                if (dragHandle) {
                    dragHandle.classList.remove('dragging');
                }
                
                // Принудительно сохранить финальную позицию
                clearTimeout(this.positionUpdateTimeout);
                const finalPosition = {
                    x: parseInt(noteElement.style.left),
                    y: parseInt(noteElement.style.top)
                };
                this.updateNote(dragNoteId, { position: finalPosition });
            }
            
            this.state.set('canvas.isDragging', false);
            this.state.set('interaction.dragNote', null);
            
            this.events.emit('note:drag-end', { noteId: dragNoteId });
        }
    }

    /**
     * Обновить позицию заметки (оптимизированная версия)
     * @param {string} noteId - ID заметки
     * @param {Object} position - Новая позиция {x, y}
     */
    updateNotePosition(noteId, position) {
        // Найти заметку в состоянии
        const notes = this.state.get('notes');
        const currentNote = notes.find(note => note.id === noteId);
        
        // Обновить DOM немедленно для плавного перетаскивания
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        if (noteElement) {
            noteElement.style.left = position.x + 'px';
            noteElement.style.top = position.y + 'px';
        }
        
        // Обновить состояние только если позиция действительно изменилась
        if (currentNote && 
            (currentNote.position.x !== position.x || currentNote.position.y !== position.y)) {
            
            // Используем debounce для обновления состояния при перетаскивании
            clearTimeout(this.positionUpdateTimeout);
            this.positionUpdateTimeout = setTimeout(() => {
                this.updateNote(noteId, { position });
            }, 16); // ~60fps
        }
    }

    /**
     * Генерация уникального ID
     * @returns {string} - Уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Получить заметку по ID
     * @param {string} noteId - ID заметки
     * @returns {Object|null} - Объект заметки или null
     */
    getNote(noteId) {
        const notes = this.state.get('notes');
        return notes.find(note => note.id === noteId) || null;
    }

    /**
     * Получить все заметки
     * @returns {Array} - Массив всех заметок
     */
    getAllNotes() {
        return this.state.get('notes');
    }

    /**
     * Очистить все заметки
     */
    clearAllNotes() {
        this.state.set('notes', []);
        this.events.emit('notes:cleared');
    }

    /**
     * Открыть модальное окно для редактирования заметки
     * @param {string} noteId - ID заметки
     */
    openNoteModal(noteId) {
        const note = this.getNote(noteId);
        if (!note) return;

        // Создать модальное окно
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'noteModal';

        modalOverlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <input type="text" class="modal-title-input" 
                           placeholder="Название заметки" 
                           value="${this.escapeHtml(note.title)}" 
                           maxlength="100">
                </div>
                <div class="modal-body">
                    <textarea class="modal-content-textarea" 
                              placeholder="Начните печатать...">${this.escapeHtml(note.content)}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" onclick="closeNoteModal()">
                        Отмена
                    </button>
                    <button class="modal-btn modal-btn-primary" onclick="saveNoteModal('${noteId}')">
                        Сохранить
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Фокус на заголовок
        setTimeout(() => {
            const titleInput = modalOverlay.querySelector('.modal-title-input');
            titleInput.focus();
            titleInput.select();
        }, 100);

        // Обработчики событий
        this.setupModalEvents(modalOverlay, noteId);

        this.events.emit('note:modal-opened', noteId);
    }

    /**
     * Настроить события модального окна
     * @param {HTMLElement} modalOverlay - Элемент модального окна
     * @param {string} noteId - ID заметки
     */
    setupModalEvents(modalOverlay, noteId) {
        // Закрытие по клику на оверлей
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.closeNoteModal();
            }
        });

        // Обработчик Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeNoteModal();
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Сохранить ссылку на обработчик для удаления
        modalOverlay._escapeHandler = handleEscape;

        // Автосохранение при вводе
        const titleInput = modalOverlay.querySelector('.modal-title-input');
        const contentTextarea = modalOverlay.querySelector('.modal-content-textarea');

        let saveTimeout;
        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveNoteFromModal(noteId, titleInput.value, contentTextarea.value);
            }, 500);
        };

        titleInput.addEventListener('input', autoSave);
        contentTextarea.addEventListener('input', autoSave);

        // Сохранить ссылку на таймер для очистки
        modalOverlay._saveTimeout = saveTimeout;
    }

    /**
     * Сохранить заметку из модального окна
     * @param {string} noteId - ID заметки
     * @param {string} title - Новый заголовок
     * @param {string} content - Новое содержимое
     */
    saveNoteFromModal(noteId, title, content) {
        const updates = {
            title: title.trim() || 'Новая заметка',
            content: content.trim()
        };
        
        this.updateNote(noteId, updates);
        this.events.emit('note:updated-from-modal', { noteId, updates });
    }

    /**
     * Закрыть модальное окно
     */
    closeNoteModal() {
        const modal = document.getElementById('noteModal');
        if (modal) {
            // Очистить обработчики
            if (modal._escapeHandler) {
                document.removeEventListener('keydown', modal._escapeHandler);
            }
            if (modal._saveTimeout) {
                clearTimeout(modal._saveTimeout);
            }
            
            modal.remove();
            this.events.emit('note:modal-closed');
        }
    }

    /**
     * Экранирование HTML
     * @param {string} text - Текст для экранирования
     * @returns {string} - Экранированный текст
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Автоматическое изменение размера textarea
     * @param {HTMLTextAreaElement} textarea - Элемент textarea
     */
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.max(100, textarea.scrollHeight) + 'px';
        
        const note = textarea.parentElement;
        note.style.height = textarea.style.height;
    }

    /**
     * Генерация уникального ID
     * @returns {string} - Уникальный ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Получить заметку по ID
     * @param {string} noteId - ID заметки
     * @returns {Object|null} - Объект заметки или null
     */
    getNote(noteId) {
        const notes = this.state.get('notes');
        return notes.find(note => note.id === noteId) || null;
    }

    /**
     * Получить все заметки
     * @returns {Array} - Массив всех заметок
     */
    getAllNotes() {
        return this.state.get('notes');
    }

    /**
     * Очистить все заметки
     */
    clearAllNotes() {
        this.state.set('notes', []);
        this.events.emit('notes:cleared');
    }

    /**
     * Статистика модуля заметок
     * @returns {Object} - Объект со статистикой
     */
    getStats() {
        const notes = this.state.get('notes');
        const totalCharacters = notes.reduce((sum, note) => sum + note.content.length, 0);
        
        return {
            totalNotes: notes.length,
            totalCharacters,
            averageLength: notes.length > 0 ? Math.round(totalCharacters / notes.length) : 0,
            emptyNotes: notes.filter(note => note.content.trim() === '').length
        };
    }
}