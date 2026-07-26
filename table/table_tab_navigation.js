// table/table_tab_navigation.js
// Навигация по внутренним элементам выбранной ячейки.
//
// Поведение:
// - Tab / Shift+Tab продолжают ходить по элементам внутри ячейки;
// - ArrowRight переходит к следующему внутреннему элементу;
// - ArrowLeft переходит к предыдущему внутреннему элементу;
// - стрелки не запускают другие действия и не двигают ячейку;
// - Escape возвращает фокус на саму выбранную ячейку;
// - в обычных текстовых редакторах стрелки продолжают двигать курсор.

(function () {
  if (typeof window === "undefined") return;

  function getSelectedTableCell() {
    const host = document.getElementById("tree");

    if (!host) return null;

    return host.querySelector(
      "td.table-cell-selected"
    );
  }

  function isVisibleFocusableElement(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.hidden) return false;
    if (el.closest("[hidden]")) return false;

    const style = window.getComputedStyle(el);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      el.getClientRects().length > 0
    );
  }

  function getFocusableElementsInsideTableCell(td) {
    if (!td) return [];

    return Array.from(
      td.querySelectorAll(
        [
          "button:not([disabled])",
          "input:not([disabled]):not([type='hidden'])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "a[href]",
          "[role='button']",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      )
    ).filter(isVisibleFocusableElement);
  }

  /*
    В обычном текстовом редакторе ArrowLeft и ArrowRight
    нужны для движения текстового курсора.

    Поэтому там их не перехватываем.

    Date/time-input, select и кнопки текстовыми
    редакторами здесь не считаются.
  */
  function isPlainTextEditingElement(el) {
    if (!el) return false;

    if (el.isContentEditable) {
      return true;
    }

    const tag = String(
      el.tagName || ""
    ).toLowerCase();

    if (tag === "textarea") {
      return true;
    }

    if (tag !== "input") {
      return false;
    }

    if (
      el.classList.contains(
        "table-duration-mask-editor"
      )
    ) {
      return true;
    }

    const type = String(
      el.type || "text"
    ).toLowerCase();

    return [
  /*
    Обычные текстовые поля:
    стрелки двигают текстовый курсор.
  */
  "text",
  "search",
  "url",
  "email",
  "tel",
  "password",
  "number",

  /*
    Нативные date/time-поля:
    ArrowLeft и ArrowRight переключают
    день, месяц, год, часы и минуты.
  */
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
].includes(type);
  }

  function focusInsideSelectedTableCell(
    td,
    reverse = false
  ) {
    if (!td) return false;

    const items =
      getFocusableElementsInsideTableCell(td);

    if (!items.length) {
      return false;
    }

    const active = document.activeElement;
    const currentIndex = items.indexOf(active);

    let nextIndex;

    if (currentIndex < 0) {
      nextIndex = reverse
        ? items.length - 1
        : 0;
    } else {
      nextIndex = reverse
        ? (
            currentIndex -
            1 +
            items.length
          ) % items.length
        : (
            currentIndex +
            1
          ) % items.length;
    }

    items[nextIndex].focus({
      preventScroll: true,
    });

    return true;
  }

  function isTableViewActive() {
    const host =
      document.getElementById("tree");

    return !!(
      host &&
      host.querySelector(".structure-table") &&
      (
        !window.VIEW ||
        window.currentView === window.VIEW.TABLE
      )
    );
  }

  function stopInnerArrowNavigation(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }

  function restoreCellFocus(td) {
    requestAnimationFrame(() => {
      /*
        Некоторые редакторы при Escape изменяют
        содержимое ячейки. Поэтому сначала пробуем
        получить актуальную выбранную ячейку.
      */
      const freshCell =
        getSelectedTableCell() || td;

      if (
        !freshCell ||
        !document.body.contains(freshCell)
      ) {
        return;
      }

      window.tableCellNav?.selectCell?.(
        freshCell,
        {
          focus: true,
          scroll: false,
        }
      );
    });
  }

  function handleInnerArrowNavigation(
    e,
    selectedCell,
    active
  ) {
    if (
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight"
    ) {
      return false;
    }

    /*
      Стрелки работают как внутренняя навигация
      только после погружения в ячейку.

      Пока фокус находится на самой td,
      обычная навигация таблицы не меняется.
    */
    if (
      !active ||
      active === selectedCell ||
      !selectedCell.contains(active)
    ) {
      return false;
    }

    /*
      В текстовых полях сохраняем стандартное
      движение курсора влево и вправо.
    */
    if (isPlainTextEditingElement(active)) {
      return false;
    }

    /*
      Событие полностью останавливаем до того,
      как его смогут получить:

      - кнопка;
      - date/time input;
      - выпадающий список;
      - обработчики хоткеев таблицы;
      - навигация между ячейками.
    */
    stopInnerArrowNavigation(e);

    focusInsideSelectedTableCell(
      selectedCell,
      e.key === "ArrowLeft"
    );

    return true;
  }

  function handleEscapeFromInnerControl(
    e,
    selectedCell,
    active
  ) {
    if (e.key !== "Escape") {
      return false;
    }

    if (
      !active ||
      active === selectedCell ||
      !selectedCell.contains(active)
    ) {
      return false;
    }

    /*
      Не вызываем stopImmediatePropagation.

      Сначала свой Escape сможет обработать сам
      редактор: закрыть dropdown, отменить ввод,
      убрать is-editing и так далее.

      После этого гарантированно возвращаем фокус
      на выбранную ячейку.
    */
    e.preventDefault();

    restoreCellFocus(selectedCell);

    return true;
  }

  function focusAdjacentCompositeDateTimeInput(
  active,
  reverse = false
) {
  if (
    !(active instanceof HTMLInputElement) ||
    !active.classList.contains(
      "table-composite-datetime-input"
    )
  ) {
    return false;
  }

  const editor = active.closest(
    ".table-composite-datetime-editor"
  );

  if (!editor) return false;

  const inputs = Array.from(
    editor.querySelectorAll(
      "input.table-composite-datetime-input"
    )
  ).filter(isVisibleFocusableElement);

  if (inputs.length < 2) {
    return false;
  }

  const currentIndex =
    inputs.indexOf(active);

  if (currentIndex < 0) {
    return false;
  }

  const nextIndex = reverse
    ? (
        currentIndex -
        1 +
        inputs.length
      ) % inputs.length
    : (
        currentIndex +
        1
      ) % inputs.length;

  const nextInput =
    inputs[nextIndex];

  /*
    Сначала закрываем виджет текущего поля.
    После focus автоматически откроется виджет
    следующей даты или времени.
  */
  if (active.type === "date") {
    window.tableDatePicker
      ?.closeForInput?.(active);
  }

  if (active.type === "time") {
    window.tableTimePicker
      ?.closeForInput?.(active);
  }

  nextInput.focus({
    preventScroll: true,
  });

  return true;
}

function handleTableCellTabNavigation(
  e,
  selectedCell
) {
  if (e.key !== "Tab") {
    return false;
  }

  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey
  ) {
    return false;
  }

  const active =
    document.activeElement;

  /*
    Для составных date/time-полей
    не используем нативную Tab-навигацию
    браузера между внутренними секциями.
  */
  if (
    focusAdjacentCompositeDateTimeInput(
      active,
      e.shiftKey
    )
  ) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();

    return true;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation?.();

  if (
    focusInsideSelectedTableCell(
      selectedCell,
      e.shiftKey
    )
  ) {
    return true;
  }

  /*
    Если в ячейке пока нет внутренних элементов,
    пробуем открыть её редактор.
  */
  const opened =
    window.tableCellEditors
      ?.startEdit?.(selectedCell);

  if (!opened) {
    return true;
  }

  requestAnimationFrame(() => {
    const freshSelectedCell =
      getSelectedTableCell() ||
      selectedCell;

    focusInsideSelectedTableCell(
      freshSelectedCell,
      e.shiftKey
    );
  });

  return true;
}

  function handleTableCellInnerNavigation(e) {
    if (!isTableViewActive()) return;

    /*
      Модифицированные стрелки могут быть
      отдельными хоткеями. Их здесь не трогаем.
    */
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.shiftKey
    ) {
      return;
    }

    const host =
      document.getElementById("tree");

    if (!host) return;

    const active = document.activeElement;

    /*
      Не вмешиваемся в элементы интерфейса,
      расположенные за пределами таблицы.
    */
    if (
      active &&
      active !== document.body &&
      !host.contains(active)
    ) {
      return;
    }

const activeCell =
  active instanceof Element
    ? active.closest("td")
    : null;

const selectedCell =
  getSelectedTableCell() ||
  activeCell;

if (!selectedCell) return;

    if (
      handleEscapeFromInnerControl(
        e,
        selectedCell,
        active
      )
    ) {
      return;
    }

    if (
      handleInnerArrowNavigation(
        e,
        selectedCell,
        active
      )
    ) {
      return;
    }

    handleTableCellTabNavigation(
      e,
      selectedCell
    );
  }

  function init() {
    if (
      document
        .__tableCellTabNavigationBound
    ) {
      return;
    }

    document
      .__tableCellTabNavigationBound = true;

    /*
      Capture нужен обязательно.

      Так ArrowLeft / ArrowRight будут остановлены
      раньше обработчиков конкретной кнопки,
      редактора и общей навигации таблицы.
    */
    document.addEventListener(
      "keydown",
      handleTableCellInnerNavigation,
      true
    );
  }

  window.tableTabNavigation = {
    init,

    getSelectedCell:
      getSelectedTableCell,

    getFocusableElementsInsideCell:
      getFocusableElementsInsideTableCell,

    focusInsideCell:
      focusInsideSelectedTableCell,
  };

  window.ensureTableCellTabNavigation =
    init;

  init();
})();