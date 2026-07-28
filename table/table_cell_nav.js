// table_cell_nav.js
// Выделение, активация и клавиатурная навигация по ячейкам таблицы.

(function () {
  if (typeof window === "undefined") return;

  const CELL_CLASS = "table-cell";
  const SELECTED_CLASS = "table-cell-selected";

  function isTableViewActive() {
    return window.currentView === window.VIEW?.TABLE;
  }

  function getTable() {
    return document.querySelector("#tree .structure-table");
  }

  function cssEscapeLocal(value) {
    const s = String(value || "");

    if (window.CSS && typeof CSS.escape === "function") {
      return CSS.escape(s);
    }

    if (typeof window.cssEscape === "function") {
      return window.cssEscape(s);
    }

    return s.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
  }

  function stopTableCellHotkey(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }

  function getCellKey(td, columnIndex) {
    if (td.dataset.prop) return td.dataset.prop;

    const th = getTable()?.querySelector(
      `thead th:nth-child(${columnIndex + 1})`
    );

    const title = (th?.textContent || "").trim();

    if (title === "ID") return "__id";
    if (title === "Отметка") return "__mark";
    if (title === "Нумерация") return "__ordinal";
    if (title === "Уровень") return "__level";
    if (title === "Название") return "__name";
    if (title === "Описание") return "__notes";

    return `__col_${columnIndex}`;
  }

  function getRowIdFromTr(tr) {
    if (!tr) return "";

    return (
      tr.querySelector?.(".row[data-id]")?.dataset?.id ||
      tr.querySelector?.(".table-prop-cell[data-id]")?.dataset?.id ||
      tr.querySelector?.("td[data-id]")?.dataset?.id ||
      ""
    );
  }

  function isSelectableTableRow(tr) {
  if (!tr) return false;

  const rowId = getRowIdFromTr(tr);
  if (!rowId) return false;

  /*
    Та же проверка, которая используется
    при навигации по структуре.

    Она исключает:
    - скрытые боковой кнопкой объекты;
    - скрытые отметкой объекты;
    - объекты внутри свёрнутой ветки;
    - недоступные объекты в режиме фокуса.
  */
  if (typeof isSelectableVisibleId === "function") {
    return isSelectableVisibleId(rowId);
  }

  /*
    Если общая функция недоступна,
    оставляем прежнее поведение.
  */
  return true;
}

  

  function getAllCells() {
    const table = getTable();
    if (!table) return [];

    return Array.from(table.querySelectorAll(`tbody td.${CELL_CLASS}`));
  }

function getRowsMatrix() {
  const table = getTable();
  if (!table) return [];

  return Array.from(
    table.querySelectorAll("tbody tr")
  )
    .filter(isSelectableTableRow)
    .map((tr) => {
      return Array.from(
        tr.querySelectorAll(`td.${CELL_CLASS}`)
      );
    })
    .filter((row) => row.length > 0);
}

  function clearSelection() {
    getAllCells().forEach((cell) => {
      cell.classList.remove(SELECTED_CLASS);
      cell.removeAttribute("aria-selected");
    });
  }

  function saveSelectedCell(td) {
    if (!td) return;

    window.tableSelectedCell = {
      rowId: td.dataset.rowId || "",
      colIndex: Number(td.dataset.colIndex || 0),
      key: td.dataset.cellKey || "",
    };

    if (td.dataset.rowId) {
      window.selectedId = td.dataset.rowId;
    }

    window.treeHasFocus = true;
  }

function selectCell(td, options = {}) {
  if (!td) return;

    /*
    Находим ячейку, внутри которой сейчас
    открыто окно сессий.
  */
  const openSessionsCell =
    getTable()
      ?.querySelector(
        ".table-time-sessions"
      )
      ?.closest(
        `td.${CELL_CLASS}`
      );

  /*
    Пока остаёмся в той же ячейке,
    окно сессий не закрываем.

    При переходе на любую другую ячейку:
    - мышью;
    - одиночной стрелкой;
    - зажатой стрелкой —
    закрываем окно без полного render.
  */
  if (
    openSessionsCell &&
    openSessionsCell !== td
  ) {
    window.tableTimerCells
      ?.closeSessions?.({
        rerender: false,
      });
  }
    /*
    При выборе другой ячейки выходим
    из внутреннего режима предыдущей.
  */
  if (
    window.tableCellInnerMode
      ?.isActive?.() &&
    !window.tableCellInnerMode
      ?.isCell?.(td)
  ) {
    window.tableCellInnerMode
      ?.clear?.();
  }

  clearSelection();

  td.classList.add(SELECTED_CLASS);
  td.setAttribute("aria-selected", "true");

  saveSelectedCell(td);

  if (options.focus !== false) {
    td.focus({ preventScroll: true });
  }

if (options.scroll !== false) {
  window.tableAutoscroll
    ?.scrollCellIntoView?.(
      td,
      {
        mode:
          options.scrollMode === "mouse"
            ? "mouse"
            : "keyboard",
      }
    );
}
}

  function findInitialCell() {
    const table = getTable();
    if (!table) return null;

    const saved = window.tableSelectedCell;

    if (saved?.rowId) {
      const selector =
        `tbody td.${CELL_CLASS}[data-row-id="${cssEscapeLocal(saved.rowId)}"]` +
        `[data-col-index="${Number(saved.colIndex || 0)}"]`;

      const savedCell = table.querySelector(selector);
      if (savedCell) return savedCell;
    }

    if (window.selectedId) {
      const rowCell = table.querySelector(
        `tbody td.${CELL_CLASS}[data-row-id="${cssEscapeLocal(window.selectedId)}"]`
      );

      if (rowCell) return rowCell;
    }

    return table.querySelector(`tbody td.${CELL_CLASS}`);
  }

  function getSelectedCell() {
    const table = getTable();
    if (!table) return null;

    const activeCell = document.activeElement?.closest?.(`td.${CELL_CLASS}`);

    if (activeCell && table.contains(activeCell)) {
      return activeCell;
    }

    return (
      table.querySelector(`tbody td.${CELL_CLASS}.${SELECTED_CLASS}`) ||
      findInitialCell()
    );
  }

  function clearTableMultiSelection() {
    /*
      Новая единая система мультивыделения таблицы.
      Старые алиасы оставлены только как fallback на случай старого кеша.
    */
    if (window.tableMultiSelect?.clear) {
      window.tableMultiSelect.clear();
      return;
    }

    window.tableMultiSelectTree?.clear?.();
    window.tableMultiSelectDeep?.clear?.();
    window.tableMultiSelectBranch?.clear?.();
  }

function moveCell(currentCell, rowDelta, colDelta, options = {}) {
  if (!currentCell) return false;
    /*
    Пока мы погружены внутрь ячейки,
    никакой код не может переместить td.

    Это защищает и от обычного нажатия,
    и от зажатых стрелок.
  */
  if (
    window.tableCellInnerMode
      ?.isActive?.()
  ) {
    return false;
  }

  const matrix = getRowsMatrix();
  if (!matrix.length) return false;

  /*
    Ищем текущую ячейку непосредственно
    в отфильтрованной матрице видимых строк.
  */
  const currentRowIndex = matrix.findIndex((row) => {
    return row.includes(currentCell);
  });

  /*
    Если выбранный объект только что скрыли,
    текущей строки уже нет в матрице.

    В таком случае переходим на первую
    доступную видимую ячейку.
  */
  if (currentRowIndex < 0) {
    const firstCell = matrix[0]?.[0];

    if (!firstCell) return false;

    if (options.clearMultiSelection !== false) {
      clearTableMultiSelection();
    }

    return selectCell(firstCell, {
      focus: true,
      scroll: options.scroll !== false,
    });
  }

  const currentRow = matrix[currentRowIndex];

  /*
    Горизонтальный индекс берём из текущей
    строки, а не из dataset.rowIndex.
  */
  let currentColIndex = currentRow.indexOf(currentCell);

  if (currentColIndex < 0) {
    currentColIndex = Number(
      currentCell.dataset.colIndex || 0
    );
  }

  const nextRowIndex = Math.max(
    0,
    Math.min(
      matrix.length - 1,
      currentRowIndex + rowDelta
    )
  );

  const nextRow = matrix[nextRowIndex];
  if (!nextRow?.length) return false;

  const nextColIndex = Math.max(
    0,
    Math.min(
      nextRow.length - 1,
      currentColIndex + colDelta
    )
  );

  const nextCell = nextRow[nextColIndex];

  if (!nextCell || nextCell === currentCell) {
    return false;
  }

  if (options.clearMultiSelection !== false) {
    clearTableMultiSelection();
  }

  return selectCell(nextCell, {
    focus: true,
    scroll: options.scroll !== false,
  });
}

  function moveSelectedCellBy(rowDelta, colDelta, options = {}) {
    const td = getSelectedCell();
    if (!td) return false;

    return moveCell(td, rowDelta, colDelta, options);
  }

  function moveSelectedCellUp(options = {}) {
    return moveSelectedCellBy(-1, 0, options);
  }

  function moveSelectedCellDown(options = {}) {
    return moveSelectedCellBy(1, 0, options);
  }

  function moveSelectedCellLeft(options = {}) {
    return moveSelectedCellBy(0, -1, options);
  }

  function moveSelectedCellRight(options = {}) {
    return moveSelectedCellBy(0, 1, options);
  }

function activateCell(td) {
  if (!td) return false;
  if (!isTableViewActive()) return false;

  selectCell(td, {
    focus: true,
    scroll: false,
  });

  function finishActivation() {
    /*
      Ячейка успешно активирована:
      включаем состояние «внутри».
    */
    window.tableCellInnerMode
      ?.enter?.(td);

    return true;
  }

  /*
    Основная система редакторов таблицы:
    direct-cells, rich-text, date/time,
    built-in cells.
  */
  if (
    window.tableCellEditors
      ?.startEdit?.(td)
  ) {
    return finishActivation();
  }

  const dropdownControl =
    td.querySelector(
      ".table-dropdown-cell-control"
    );

  if (dropdownControl?.openEditor) {
    dropdownControl.openEditor();

    return finishActivation();
  }

  /*
    Upload-ячейки.

    Обычно их перехватывает
    table_upload_hotkeys.js, но этот блок
    оставляем как запасной вариант.
  */
  const uploadButton =
    td.querySelector(
      [
        ".table-file-btn",
        ".table-image-btn",
        ".table-cover-btn",
      ].join(",")
    );

  if (uploadButton) {
    window.tableCellInnerMode
      ?.enter?.(td);

    uploadButton.click();

    return true;
  }

  const fileInput =
    td.querySelector(
      "input[type='file']"
    );

  if (fileInput) {
    window.tableCellInnerMode
      ?.enter?.(td);

    fileInput.click();

    return true;
  }

  if (
    td.dataset.cellKey === "tag" ||
    td.dataset.prop === "tag"
  ) {
    const tagControl =
      td.querySelector(
        ".table-tag-compact-control"
      );

    if (tagControl?.openEditor) {
      tagControl.openEditor();

      return finishActivation();
    }
  }

  const oldControl =
    td.querySelector(
      [
        "input:not([type='hidden'])",
        "input:not([type='file'])",
        "select",
        "textarea",
        "button:not([disabled])",
      ].join(",")
    );

  if (oldControl) {
    oldControl.focus?.({
      preventScroll: true,
    });

    if (
      oldControl instanceof
        HTMLInputElement &&
      oldControl.type !== "file" &&
      oldControl.type !== "color"
    ) {
      oldControl.select?.();
    }

    return finishActivation();
  }

  if (
    td.dataset.cellKey === "__name"
  ) {
    const id =
      td.dataset.rowId ||
      td.dataset.id;

    if (id) {
      window.selectedId = id;
      window.treeHasFocus = true;

      window.tableCellInnerMode
        ?.enter?.(td);

      window.startRename?.(id);

      return true;
    }
  }

  return false;
}

  function activateSelectedCell() {
    const td = getSelectedCell();
    if (!td) return false;

    return activateCell(td);
  }

  function startEditCell(td) {
    return activateCell(td);
  }

  function isCellActivateHotkey(e) {
    if (!e) return false;

    /*
      F2 оставляем как дополнительную стандартную клавишу редактирования.
      Основной хоткей берём из общей системы как rename.
    */
    if (e.key === "F2") return true;

    return !!window.isHotkey?.(e, "rename");
  }

function handleCellNavHotkey(e, td) {
  // По списку — перемещение между строками
  if (window.isHotkey?.(e, "tableListUp")) {
    stopTableCellHotkey(e);
    moveCell(td, -1, 0);
    return true;
  }

  if (window.isHotkey?.(e, "tableListDown")) {
    stopTableCellHotkey(e);
    moveCell(td, 1, 0);
    return true;
  }

  // По свойствам — перемещение между колонками
  if (window.isHotkey?.(e, "tablePropertyLeft")) {
    stopTableCellHotkey(e);
    moveCell(td, 0, -1);
    return true;
  }

  if (window.isHotkey?.(e, "tablePropertyRight")) {
    stopTableCellHotkey(e);
    moveCell(td, 0, 1);
    return true;
  }

  return false;
}

function handleCellKeydown(e) {
  if (!isTableViewActive()) return;

  const td = e.target.closest?.(
    `td.${CELL_CLASS}`
  );

  if (!td) return;

    /*
    Внутри ячейки этот обработчик
    вообще не управляет таблицей.

    Событие остаётся внутреннему input,
    dropdown, кнопке или редактору.
  */
  if (
    window.tableCellInnerMode
      ?.isCell?.(td)
  ) {
    return;
  }

  /*
    Вся табличная навигация проходит
    через одно место.
  */
  if (handleCellNavHotkey(e, td)) {
    return;
  }

  /*
    Активация и редактирование ячейки используют
    назначаемое действие rename.
    F2 остаётся запасным.
  */
  if (isCellActivateHotkey(e)) {
    stopTableCellHotkey(e);
    startEditCell(td);
    return;
  }

  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    td.blur();
  }
}


  function bindCell(td, rowId, rowIndex, colIndex) {
    td.classList.add(CELL_CLASS);
    td.tabIndex = 0;

    td.dataset.rowIndex = String(rowIndex);
    td.dataset.colIndex = String(colIndex);
    td.dataset.rowId = rowId;
    td.dataset.cellKey = td.dataset.cellKey || getCellKey(td, colIndex);

td.addEventListener("click", (e) => {
  if (!isTableViewActive()) return;

  e.stopPropagation();

selectCell(td, {
  focus: true,
  scroll: true,
  scrollMode: "mouse",
});
});

td.addEventListener("dblclick", (e) => {
  if (!isTableViewActive()) return;

  e.stopPropagation();

selectCell(td, {
  focus: true,
  scroll: true,
  scrollMode: "mouse",
});

  startEditCell(td);
});

    td.addEventListener("keydown", handleCellKeydown);
  }

  function restoreTableFocusAfterHotkeysPanelClose() {
  if (!isTableViewActive()) {
    return;
  }

  /*
    Даём модальному окну полностью закрыться,
    удалить свои внутренние элементы и завершить
    собственное восстановление фокуса.
  */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!isTableViewActive()) {
        return;
      }

      const table = getTable();

      if (!table) {
        return;
      }

      /*
        Берём именно визуально выбранную ячейку.

        Фокус после модального окна сейчас может
        находиться на кнопке панели, поэтому
        document.activeElement здесь не используем.
      */
      const td =
        table.querySelector(
          `tbody td.${CELL_CLASS}.${SELECTED_CLASS}`
        ) ||
        findInitialCell();

      if (!td) {
        return;
      }

      /*
        После модального окна возвращаемся
        в состояние «снаружи ячейки».

        Тогда стрелки снова перемещают td,
        а Enter снова входит внутрь неё.
      */
      window.tableCellInnerMode
        ?.clear?.();

      selectCell(td, {
        focus: true,
        scroll: false,
      });
    });
  });
}

/* =========================================================
   Возврат клавиатурного фокуса таблице
========================================================= */

const TABLE_FOCUS_BLOCKER_SELECTOR = [
  /*
    Модальные окна.
  */
  "[role='dialog'][aria-hidden='false']",
  ".hotkeys-exit-backdrop",
  ".hk-exit-backdrop",

  /*
    Выпадающие меню и редакторы.
  */
  ".color-swatches",
  ".table-tag-compact-menu",
  ".table-date-picker",
  ".table-time-picker",
  ".table-dropdown-menu",
].join(",");

/*
  Проверяем не просто наличие элемента,
  а то, что он действительно видим.
*/
function isVisibleTableFocusBlocker(
  element
) {
  if (
    !(element instanceof Element)
  ) {
    return false;
  }

  const style =
    window.getComputedStyle(element);

  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

/*
  Пока открыто модальное окно, палитра,
  календарь или выпадающий список,
  фокус таблице не возвращаем.
*/
function hasVisibleTableFocusBlocker() {
  if (
    document.body.classList.contains(
      "hotkeys-panel-modal-open"
    )
  ) {
    return true;
  }

  return Array.from(
    document.querySelectorAll(
      TABLE_FOCUS_BLOCKER_SELECTOR
    )
  ).some(
    isVisibleTableFocusBlocker
  );
}

/*
  Поля ввода должны сохранять собственный
  фокус — забирать его у них нельзя.
*/
function isExternalTypingTarget(
  element
) {
  if (
    !(element instanceof Element)
  ) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const input =
    element.closest(
      [
        "input",
        "textarea",
        "select",
        "[contenteditable='true']",
        "[contenteditable='']",
      ].join(",")
    );

  return !!input;
}

/*
  Берём именно визуально выбранную ячейку.

  document.activeElement здесь использовать
  нельзя: он как раз может находиться
  на кнопке верхнего бара.
*/
function getVisuallySelectedTableCell() {
  const table = getTable();

  if (!table) {
    return null;
  }

  return (
    table.querySelector(
      `tbody td.${CELL_CLASS}.${SELECTED_CLASS}`
    ) ||
    findInitialCell()
  );
}

/*
  Возвращает настоящий DOM-фокус
  на выбранную ячейку.
*/
function restoreSelectedTableCellFocus() {
  if (!isTableViewActive()) {
    return false;
  }

  if (
    hasVisibleTableFocusBlocker()
  ) {
    return false;
  }

  const active =
    document.activeElement;

  /*
    Фокус уже находится внутри таблицы —
    повторно ничего не делаем.
  */
  const table = getTable();

  if (
    table &&
    active instanceof Element &&
    table.contains(active)
  ) {
    return true;
  }

  /*
    Не отбираем фокус у текстовых полей,
    select и других редакторов.
  */
  if (
    isExternalTypingTarget(active)
  ) {
    return false;
  }

  const td =
    getVisuallySelectedTableCell();

  if (!td) {
    return false;
  }

  /*
    После работы с внешней панелью
    возвращаемся в состояние
    «снаружи ячейки».
  */
  window.tableCellInnerMode
    ?.clear?.();

  selectCell(td, {
    focus: true,
    scroll: false,
  });

  return true;
}

/*
  Действия панели могут:
  - вызвать render;
  - открыть или закрыть меню;
  - изменить класс кнопки.

  Поэтому возвращаем фокус после завершения
  текущего click и двух кадров браузера.
*/
function scheduleTableFocusRestore(
  attempt = 0
) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!isTableViewActive()) {
        return;
      }

      /*
        Меню ещё открыто — ждём его закрытия.

        Ограничение не позволяет создавать
        бесконечный цикл ожидания.
      */
      if (
        hasVisibleTableFocusBlocker()
      ) {
        if (attempt < 10) {
          setTimeout(() => {
            scheduleTableFocusRestore(
              attempt + 1
            );
          }, 60);
        }

        return;
      }

      restoreSelectedTableCellFocus();
    });
  });
}

/*
  После обычной кнопки верхнего бара
  возвращаем фокус таблице.

  Кнопка, которая открыла меню, сначала
  оставит меню видимым, поэтому проверка
  blocker не позволит закрыть взаимодействие
  преждевременно.
*/
function handleTopbarActionClick(
  event
) {
  if (!isTableViewActive()) {
    return;
  }

  const target =
    event.target instanceof Element
      ? event.target
      : null;

  if (!target) {
    return;
  }

  /*
    Работаем только с верхним баром.
  */
  const topbar =
    target.closest(".hint");

  if (!topbar) {
    return;
  }

  /*
    Поля ввода и native color picker
    должны завершить собственную работу.
  */
  if (
    isExternalTypingTarget(target)
  ) {
    return;
  }

  const action =
    target.closest(
      [
        "button",
        "[role='button']",
        ".color-dot",
      ].join(",")
    );

  if (!action) {
    return;
  }

  scheduleTableFocusRestore();
}

/*
  Для input[type=color] click пропускаем,
  но после выбора цвета браузер отправит
  change — тогда можно вернуть фокус.
*/
function handleTopbarControlChange(
  event
) {
  if (!isTableViewActive()) {
    return;
  }

  const target =
    event.target instanceof Element
      ? event.target
      : null;

  if (
    !target ||
    !target.closest(".hint")
  ) {
    return;
  }

  scheduleTableFocusRestore();
}

/*
  Страховка на случай, если какая-то кнопка
  всё же оставила фокус вне таблицы.

  Тогда уже первое нажатие стрелки или Enter
  работает сразу — повторный клик по ячейке
  не требуется.
*/
function handleGlobalTableFocusRecovery(
  event
) {
  if (!isTableViewActive()) {
    return;
  }

  const table = getTable();

  if (!table) {
    return;
  }

  const target =
    event.target instanceof Element
      ? event.target
      : null;

  /*
    Событие уже пришло из таблицы:
    его обработает обычная логика td.
  */
  if (
    target &&
    table.contains(target)
  ) {
    return;
  }

  /*
    Пока пользователь действительно работает
    с полем ввода, меню или модальным окном,
    таблицу не активируем.
  */
  if (
    isExternalTypingTarget(target) ||
    hasVisibleTableFocusBlocker() ||
    window.tableCellInnerMode
      ?.isActive?.()
  ) {
    return;
  }

  const td =
    getVisuallySelectedTableCell();

  if (!td) {
    return;
  }

  /*
    Стрелки: выполняем то же действие,
    которое обычно выполняет td.
  */
  if (
    handleCellNavHotkey(
      event,
      td
    )
  ) {
    return;
  }

  /*
    Enter/F2/назначенный хоткей:
    сразу возвращаем фокус и входим
    внутрь выбранной ячейки.
  */
  if (
    isCellActivateHotkey(event)
  ) {
    stopTableCellHotkey(event);

    selectCell(td, {
      focus: true,
      scroll: false,
    });

    startEditCell(td);
  }
}

  function prepareTableCells() {
    if (!isTableViewActive()) return;

    const table = getTable();
    if (!table) return;

    const rows = Array.from(table.querySelectorAll("tbody tr"));

    rows.forEach((tr, rowIndex) => {
      const rowId = getRowIdFromTr(tr);
      const cells = Array.from(tr.children).filter(
        (el) => el.tagName === "TD"
      );

      cells.forEach((td, colIndex) => {
        bindCell(td, rowId, rowIndex, colIndex);
      });
    });

    const selected = findInitialCell();

    if (selected) {
      selectCell(selected, {
        focus: true,
        scroll: false,
      });
    }
  }

  function patchRenderTableView() {
    if (window.renderTableView?.__cellNavPatched) return;
    if (typeof window.renderTableView !== "function") return;

    const original = window.renderTableView;

    window.renderTableView = function patchedRenderTableView() {
      const result = original.apply(this, arguments);

      requestAnimationFrame(() => {
        prepareTableCells();
      });

      return result;
    };

    window.renderTableView.__cellNavPatched = true;
  }

function init() {
  patchRenderTableView();

  /*
    Общую систему возврата фокуса
    подключаем только один раз.
  */
  if (
    !window
      .__tableFocusRecoveryBound
  ) {
    window
      .__tableFocusRecoveryBound =
        true;

    /*
      Обычные действия верхнего бара:
      форматирование, Undo/Redo,
      копирование, цвета и другие кнопки.
    */
    document.addEventListener(
      "click",
      handleTopbarActionClick,
      false
    );

    /*
      Завершение выбора в input,
      включая системный выбор цвета.
    */
    document.addEventListener(
      "change",
      handleTopbarControlChange,
      false
    );

    /*
      Закрытие модального окна хоткеев.
    */
    window.addEventListener(
      "hotkeys-panel-close",
      scheduleTableFocusRestore
    );

    /*
      Страховка: первое нажатие стрелки
      или Enter работает даже тогда,
      когда какая-то внешняя кнопка
      не вернула фокус.
    */
    document.addEventListener(
      "keydown",
      handleGlobalTableFocusRecovery,
      true
    );
  }

  if (isTableViewActive()) {
    requestAnimationFrame(() => {
      prepareTableCells();
    });
  }
}

  window.tableCellNav = {
    init,
    prepareTableCells,

    selectCell,
    getSelectedCell,

    activateCell,
    activateSelectedCell,
    startEditCell,

    isCellActivateHotkey,

    clearSelection,
    clearTableMultiSelection,

    moveBy: moveSelectedCellBy,
    moveUp: moveSelectedCellUp,
    moveDown: moveSelectedCellDown,
    moveLeft: moveSelectedCellLeft,
    moveRight: moveSelectedCellRight,
  };

  init();
})();