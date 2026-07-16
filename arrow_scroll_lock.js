// arrow_scroll_lock.js
// Блокирует только нативную прокрутку браузера от стрелок.
// Пользовательские обработчики навигации продолжают работать.

(function () {
  if (typeof window === "undefined") return;

  function isTypingTarget(element) {
    if (!element) return false;

    const tag = (element.tagName || "").toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      element.isContentEditable ||
      element.closest?.(".edit") ||
      element.closest?.(".table-cell-editor") ||
      element.closest?.(".table-rich-cell-editor")
    );
  }

  function isArrowKey(event) {
    return (
      event.code === "ArrowUp" ||
      event.code === "ArrowDown" ||
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    );
  }

  function isTableViewActive() {
    return (
      typeof currentView !== "undefined" &&
      typeof VIEW !== "undefined" &&
      currentView === VIEW.TABLE
    );
  }

  window.addEventListener(
    "keydown",
    (event) => {
      if (!isArrowKey(event)) return;
      if (isTypingTarget(event.target)) return;

      /*
        Таблицу не затрагиваем:
        у неё собственная клавиатурная навигация и скролл.
      */
      if (isTableViewActive()) return;

      /*
        Блокируем стрелки только тогда, когда пользователь
        работает со структурой.
      */
      if (
        typeof treeHasFocus !== "undefined" &&
        !treeHasFocus
      ) {
        return;
      }

      event.preventDefault();

      /*
        stopPropagation здесь намеренно нет.
        Событие продолжит идти к обработчикам навигации.
      */
    },
    true
  );
})();