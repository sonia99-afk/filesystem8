// table/table_tab_navigation.js
// Два состояния активной ячейки таблицы:
//
// 1. Снаружи ячейки:
//    - стрелки перемещают активную ячейку;
//    - удержание стрелок и табличный автоскролл
//      работают обычно.
//
// 2. Внутри ячейки:
//    - режим включается, когда после Enter/F2
//      фокус переходит на внутренний элемент;
//    - стрелки работают только с содержимым
//      текущей ячейки;
//    - активная ячейка не перемещается;
//    - удержание стрелок не запускает
//      табличный repeat;
//    - стрелки не сдвигают прокрутку таблицы;
//    - Escape возвращает фокус на саму ячейку
//      и выключает внутренний режим.
//
// Дополнительно:
// - Tab / Shift+Tab полностью отключены;
// - Alt/Option + Left/Right переключают поля
//   составной date/time-ячейки.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  const INNER_MODE_CLASS =
    "table-cell-inner-mode";

  /*
    Все действия со стрелками, которые
    не должны распознаваться общей системой
    хоткеев, пока мы находимся внутри ячейки.
  */
  const TABLE_ARROW_ACTIONS = new Set([
    "tableListUp",
    "tableListDown",

    "tablePropertyLeft",
    "tablePropertyRight",

    "rangeUp",
    "rangeDown",

    "deepUp",
    "deepDown",

    "branchRangeLeft",
    "branchRangeRight",
  ]);

  /*
    Явное состояние режима погружения.
  */
  const state = {
    active: false,
    cell: null,

    /*
      Эти данные нужны, чтобы восстановить
      ячейку после перерендера таблицы.
    */
    rowId: "",
    colIndex: 0,
    cellKey: "",
  };

  function isTableViewActive() {
    const host =
      document.getElementById("tree");

    return !!(
      host &&
      host.querySelector(
        ".structure-table"
      ) &&
      (
        !window.VIEW ||
        window.currentView ===
          window.VIEW.TABLE
      )
    );
  }

  function cssEscapeLocal(value) {
    const text =
      String(value || "");

    if (
      window.CSS &&
      typeof window.CSS.escape ===
        "function"
    ) {
      return window.CSS.escape(text);
    }

    return text.replace(
      /[^a-zA-Z0-9_\-]/g,
      "\\$&"
    );
  }

  function getSelectedTableCell() {
    const host =
      document.getElementById("tree");

    if (!host) {
      return null;
    }

    return host.querySelector(
      "td.table-cell-selected"
    );
  }

  function isTableCell(element) {
    return !!(
      element instanceof Element &&
      element.matches(
        "td.table-cell"
      )
    );
  }

  function rememberCell(td) {
    state.cell = td;

    state.rowId =
      td?.dataset?.rowId || "";

    state.colIndex = Number(
      td?.dataset?.colIndex || 0
    );

    state.cellKey =
      td?.dataset?.cellKey || "";
  }

  /*
    После render старая td удаляется из DOM.

    Поэтому, если сохранённая ссылка больше
    не существует, ищем новую td по строке
    и индексу колонки.
  */
  function findRememberedCell() {
    if (
      state.cell &&
      state.cell.isConnected
    ) {
      return state.cell;
    }

    const table =
      document.querySelector(
        "#tree .structure-table"
      );

    if (
      !table ||
      !state.rowId
    ) {
      return null;
    }

    const rowId =
      cssEscapeLocal(state.rowId);

    const selector =
      `tbody td.table-cell` +
      `[data-row-id="${rowId}"]` +
      `[data-col-index="${state.colIndex}"]`;

    const replacement =
      table.querySelector(selector);

    if (replacement) {
      state.cell = replacement;
    }

    return replacement;
  }

  function removeInnerModeClass() {
    if (
      state.cell &&
      state.cell.isConnected
    ) {
      state.cell.classList.remove(
        INNER_MODE_CLASS
      );
    }

    document
      .querySelectorAll(
        `td.${INNER_MODE_CLASS}`
      )
      .forEach((td) => {
        td.classList.remove(
          INNER_MODE_CLASS
        );
      });
  }

  function clearInnerMode() {
    removeInnerModeClass();

    state.active = false;
    state.cell = null;
    state.rowId = "";
    state.colIndex = 0;
    state.cellKey = "";
  }

  function isInnerModeActive() {
    if (!state.active) {
      return false;
    }

    if (!isTableViewActive()) {
      clearInnerMode();
      return false;
    }

    const cell =
      findRememberedCell();

    if (!cell) {
      clearInnerMode();
      return false;
    }

    return true;
  }

  function isInnerModeCell(td) {
    if (!isInnerModeActive()) {
      return false;
    }

    const cell =
      findRememberedCell();

    return !!(
      cell &&
      td &&
      (
        cell === td ||
        (
          cell.dataset.rowId ===
            td.dataset.rowId &&

          Number(
            cell.dataset.colIndex || 0
          ) ===
            Number(
              td.dataset.colIndex || 0
            )
        )
      )
    );
  }

  /*
    Общая система repeat вызывает isHotkey()
    до запуска таймера.

    Пока мы внутри ячейки, запрещаем ей
    распознавать табличные действия стрелок.
  */
  function patchHotkeyMatcher() {
    const current =
      window.isHotkey;

    if (
      typeof current !== "function"
    ) {
      return false;
    }

    if (
      current
        .__tableInnerModePatched
    ) {
      return true;
    }

    function innerModeAwareHotkeyMatcher(
      event,
      action
    ) {
      if (
        isInnerModeActive() &&
        TABLE_ARROW_ACTIONS.has(action)
      ) {
        return false;
      }

      return current.call(
        this,
        event,
        action
      );
    }

    innerModeAwareHotkeyMatcher
      .__tableInnerModePatched = true;

    innerModeAwareHotkeyMatcher
      .__tableInnerModeOriginal =
        current;

    window.isHotkey =
      innerModeAwareHotkeyMatcher;

    return true;
  }

  /*
    Дополнительная защита от табличного
    автоскролла внутри ячейки.
  */
  function patchTableAutoscroll() {
    const api =
      window.tableAutoscroll;

    if (!api) {
      return false;
    }

    const current =
      api.scrollCellIntoView;

    if (
      typeof current !== "function"
    ) {
      return false;
    }

    if (
      current
        .__tableInnerModePatched
    ) {
      return true;
    }

    function innerModeAwareAutoscroll() {
      if (isInnerModeActive()) {
        return;
      }

      return current.apply(
        this,
        arguments
      );
    }

    innerModeAwareAutoscroll
      .__tableInnerModePatched = true;

    innerModeAwareAutoscroll
      .__tableInnerModeOriginal =
        current;

    api.scrollCellIntoView =
      innerModeAwareAutoscroll;

    return true;
  }

  /*
    table_tab_navigation.js может загрузиться
    раньше hotkeys или table_autoscroll.

    Поэтому несколько раз пробуем установить
    необходимые обёртки.
  */
  function ensureRuntimePatches(
    attempt = 0
  ) {
    const hotkeysReady =
      patchHotkeyMatcher();

    const autoscrollReady =
      patchTableAutoscroll();

    if (
      hotkeysReady &&
      autoscrollReady
    ) {
      return;
    }

    if (attempt >= 40) {
      return;
    }

    setTimeout(() => {
      ensureRuntimePatches(
        attempt + 1
      );
    }, 50);
  }

  function enterInnerMode(td) {
    if (!isTableCell(td)) {
      return false;
    }

    removeInnerModeClass();

    state.active = true;

    rememberCell(td);

    td.classList.add(
      INNER_MODE_CLASS
    );

    /*
      Если удержание стрелки началось
      до переключения фокуса внутрь,
      сразу останавливаем общий repeat.
    */
    window.hotkeyHoldRepeat
      ?.stop?.();

    /*
      Метод cancel может отсутствовать.
      Optional chaining не даст ошибку.
    */
    window.tableAutoscroll
      ?.cancel?.();

    ensureRuntimePatches();

    return true;
  }

  function restoreCellFocus(td) {
    requestAnimationFrame(() => {
      const freshCell =
        (
          td &&
          td.isConnected
            ? td
            : null
        ) ||
        findRememberedCell() ||
        getSelectedTableCell();

      if (
        !freshCell ||
        !document.body.contains(
          freshCell
        )
      ) {
        return;
      }

      window.tableCellNav
        ?.selectCell?.(
          freshCell,
          {
            focus: true,
            scroll: false,
          }
        );
    });
  }

  function exitInnerMode(
    options = {}
  ) {
    if (!state.active) {
      return false;
    }

    /*
      Сохраняем ячейку до очистки state.
    */
    const cell =
      findRememberedCell() ||
      getSelectedTableCell();

    clearInnerMode();

    window.hotkeyHoldRepeat
      ?.stop?.();

    window.tableAutoscroll
      ?.cancel?.();

    if (
      options.restoreFocus !== false
    ) {
      restoreCellFocus(cell);
    }

    return true;
  }

  function isVisibleFocusableElement(
    el
  ) {
    if (!el) {
      return false;
    }

    if (el.disabled) {
      return false;
    }

    if (el.hidden) {
      return false;
    }

    if (el.closest("[hidden]")) {
      return false;
    }

    const style =
      window.getComputedStyle(el);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      el.getClientRects().length > 0
    );
  }

  function getFocusableElementsInsideCell(
    td
  ) {
    if (!td) {
      return [];
    }

    return Array.from(
      td.querySelectorAll(
        [
          "button:not([disabled])",

          "input:not([disabled])" +
            ":not([type='hidden'])",

          "select:not([disabled])",

          "textarea:not([disabled])",

          "a[href]",

          "[role='button']",

          "[role='option']",

          "[tabindex]" +
            ":not([tabindex='-1'])",
        ].join(",")
      )
    ).filter(
      isVisibleFocusableElement
    );
  }

  /*
    Переход к следующему или предыдущему
    внутреннему элементу.

    Навигация циклическая.
  */
  function focusInsideCell(
    td,
    reverse = false
  ) {
    const items =
      getFocusableElementsInsideCell(
        td
      );

    if (!items.length) {
      return false;
    }

    const active =
      document.activeElement;

    const currentIndex =
      items.indexOf(active);

    let nextIndex;

    if (currentIndex < 0) {
      nextIndex = reverse
        ? items.length - 1
        : 0;
    } else if (reverse) {
      nextIndex =
        (
          currentIndex -
          1 +
          items.length
        ) % items.length;
    } else {
      nextIndex =
        (
          currentIndex +
          1
        ) % items.length;
    }

    items[nextIndex].focus({
      preventScroll: true,
    });

    return true;
  }

  /*
    На случай, если браузер всё-таки
    попытается прокрутить один из контейнеров,
    запоминаем позиции прокрутки.
  */
  function getScrollableAncestors(
    cell
  ) {
    const result = [];
    const seen = new Set();

    let element =
      cell?.parentElement || null;

    while (element) {
      if (
        !seen.has(element) &&
        (
          element.scrollHeight >
            element.clientHeight ||

          element.scrollWidth >
            element.clientWidth
        )
      ) {
        seen.add(element);
        result.push(element);
      }

      element =
        element.parentElement;
    }

    const main =
      document.querySelector(
        ".main"
      );

    if (
      main &&
      !seen.has(main)
    ) {
      result.push(main);
    }

    return result;
  }

  function preserveTableScroll(
    cell
  ) {
    const snapshots =
      getScrollableAncestors(cell)
        .map((element) => {
          return {
            element,

            scrollTop:
              element.scrollTop,

            scrollLeft:
              element.scrollLeft,
          };
        });

    function restore() {
      snapshots.forEach(
        (snapshot) => {
          const element =
            snapshot.element;

          if (
            !element?.isConnected
          ) {
            return;
          }

          if (
            Math.abs(
              element.scrollTop -
                snapshot.scrollTop
            ) >= 0.5
          ) {
            element.scrollTop =
              snapshot.scrollTop;
          }

          if (
            Math.abs(
              element.scrollLeft -
                snapshot.scrollLeft
            ) >= 0.5
          ) {
            element.scrollLeft =
              snapshot.scrollLeft;
          }
        }
      );
    }

    requestAnimationFrame(() => {
      restore();

      requestAnimationFrame(
        restore
      );
    });
  }

  function isArrowKey(event) {
    return (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    );
  }

  /*
    Эти элементы должны получить стрелку
    для своей собственной внутренней логики.

    Например:
    - текстовый input двигает курсор;
    - date/time меняет часть значения;
    - select переключает значение.
  */
  function isTextOrNativeArrowControl(
    el
  ) {
    if (
      !(el instanceof Element)
    ) {
      return false;
    }

    if (el.isContentEditable) {
      return true;
    }

    if (
      el instanceof
        HTMLTextAreaElement ||
      el instanceof
        HTMLSelectElement
    ) {
      return true;
    }

    if (
      el instanceof
        HTMLInputElement
    ) {
      return (
        el.type !== "button" &&
        el.type !== "submit" &&
        el.type !== "reset" &&
        el.type !== "checkbox" &&
        el.type !== "radio" &&
        el.type !== "file" &&
        el.type !== "color"
      );
    }

    return false;
  }

  function shouldKeepOwnArrowBehavior(
    target,
    event,
    cell
  ) {
    if (
      !(target instanceof Element)
    ) {
      return false;
    }

    /*
      Кастомный календарь или popup может
      находиться за пределами DOM самой td.

      Его стрелки не забираем, но табличные
      хоткеи всё равно заблокированы.
    */
    if (!cell.contains(target)) {
      return true;
    }

    if (
      isTextOrNativeArrowControl(
        target
      )
    ) {
      return true;
    }

    /*
      Кастомные списки и календарные сетки
      должны получить свои стрелки.
    */
    if (
      target.closest(
        [
          "[role='listbox']",
          "[role='option']",

          "[role='grid']",
          "[role='gridcell']",

          "[role='menu']",
          "[role='menuitem']",
        ].join(",")
      )
    ) {
      return true;
    }

    /*
      У dropdown вертикальные стрелки
      открывают список и выбирают пункты.
    */
    if (
      (
        event.key ===
          "ArrowUp" ||

        event.key ===
          "ArrowDown"
      ) &&
      target.closest(
        [
          ".table-tag-compact-trigger",

          ".table-tag-compact-menu",

          ".table-tag-compact-option",

          ".table-tag-compact-action",
        ].join(",")
      )
    ) {
      return true;
    }

    return false;
  }

  function stopInnerArrow(
    event
  ) {
    event.preventDefault();
    event.stopPropagation();

    event
      .stopImmediatePropagation?.();
  }

  /*
    Alt/Option + Left/Right для перехода
    между input внутри составной
    date/time-ячейки.
  */
  function focusAdjacentCompositeDateTimeInput(
    active,
    reverse = false
  ) {
    if (
      !(
        active instanceof
          HTMLInputElement
      ) ||
      !active.classList.contains(
        "table-composite-datetime-input"
      )
    ) {
      return false;
    }

    const editor =
      active.closest(
        ".table-composite-datetime-editor"
      );

    if (!editor) {
      return false;
    }

    const inputs = Array.from(
      editor.querySelectorAll(
        "input" +
          ".table-composite-datetime-input"
      )
    ).filter(
      isVisibleFocusableElement
    );

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

  function handleCompositeDateTimeAltNavigation(
    event
  ) {
    if (!isInnerModeActive()) {
      return false;
    }

    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return false;
    }

    if (
      event.key !==
        "ArrowLeft" &&
      event.key !==
        "ArrowRight"
    ) {
      return false;
    }

    const active =
      document.activeElement;

    const moved =
      focusAdjacentCompositeDateTimeInput(
        active,
        event.key ===
          "ArrowLeft"
      );

    if (!moved) {
      return false;
    }

    const cell =
      findRememberedCell();

    if (cell) {
      preserveTableScroll(cell);
    }

    window.hotkeyHoldRepeat
      ?.stop?.();

    /*
      В том числе запрещаем браузеру
      выполнить переход назад по Alt+Left.
    */
    stopInnerArrow(event);

    return true;
  }

  /*
    Обработка всех четырёх стрелок
    внутри активной ячейки.
  */
  function handleInnerArrow(
    event
  ) {
    if (!isArrowKey(event)) {
      return false;
    }

    if (!isInnerModeActive()) {
      return false;
    }

    const cell =
      findRememberedCell();

    if (!cell) {
      return false;
    }

    /*
      Останавливаем общий repeat,
      даже если он был запущен раньше.
    */
    window.hotkeyHoldRepeat
      ?.stop?.();

    window.tableAutoscroll
      ?.cancel?.();

    /*
      Не разрешаем стрелке изменить
      положение таблицы или страницы.
    */
    preserveTableScroll(cell);

    const target =
      event.target instanceof Element
        ? event.target
        : document.activeElement;

    if (
      shouldKeepOwnArrowBehavior(
        target,
        event,
        cell
      )
    ) {
      /*
        Событие получает внутренний input,
        dropdown или календарь.

        Патч isHotkey не позволит этому же
        событию переместить активную td.
      */
      return true;
    }

    /*
      Для кнопок и обычных action-элементов
      полностью останавливаем событие.
    */
    stopInnerArrow(event);

    const reverse =
      event.key === "ArrowLeft" ||
      event.key === "ArrowUp";

    focusInsideCell(
      cell,
      reverse
    );

    return true;
  }

  function handleEscape(event) {
    if (
      event.key !== "Escape"
    ) {
      return false;
    }

    if (!isInnerModeActive()) {
      return false;
    }

    /*
      Не вызываем stopImmediatePropagation.

      Сначала собственный Escape редактора
      сможет закрыть dropdown, календарь
      или отменить ввод.

      После завершения события выходим
      из внутреннего режима и возвращаемся
      на саму td.
    */
    event.preventDefault();

    setTimeout(() => {
      exitInnerMode({
        restoreFocus: true,
      });
    }, 0);

    return true;
  }

  /*
    Tab и Shift+Tab полностью отключены
    во всей таблице.
  */
  function handleTab(event) {
    if (
      event.key !== "Tab"
    ) {
      return false;
    }

    if (!isTableViewActive()) {
      return false;
    }

    const target =
      event.target instanceof Element
        ? event.target
        : document.activeElement;

    const table =
      document.querySelector(
        "#tree .structure-table"
      );

    const belongsToTable = !!(
      table &&
      target &&
      table.contains(target)
    );

    if (
      !belongsToTable &&
      !isInnerModeActive()
    ) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    event
      .stopImmediatePropagation?.();

    return true;
  }

  /*
    Фокус на внутреннем элементе выбранной td
    автоматически означает вход внутрь ячейки.

    Это помогает ячейкам, которые переводят
    фокус через requestAnimationFrame.
  */
  function handleFocusIn(event) {
    if (!isTableViewActive()) {
      clearInnerMode();
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target
        : null;

    if (!target) {
      return;
    }

    const td =
      target.closest(
        "td.table-cell"
      );

    if (td) {
      if (target === td) {
        /*
          Фокус вернулся на саму td:
          мы снова снаружи ячейки.
        */
        if (isInnerModeCell(td)) {
          clearInnerMode();
        }

        return;
      }

      /*
        Входим внутрь только выбранной
        активной ячейки.
      */
      if (
        td.classList.contains(
          "table-cell-selected"
        )
      ) {
        enterInnerMode(td);
        return;
      }

      /*
        Фокус оказался внутри другой td.
      */
      if (isInnerModeActive()) {
        clearInnerMode();
      }

      return;
    }

    /*
      Фокус может уйти во всплывающий
      календарь или список, расположенный
      вне td.

      В этом случае внутренний режим
      не выключаем.
    */
  }

  /*
    Клик по другой ячейке завершает
    внутренний режим старой ячейки.
  */
  function handlePointerDown(
    event
  ) {
    if (!isInnerModeActive()) {
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target
        : null;

    if (!target) {
      return;
    }

    const currentCell =
      findRememberedCell();

    const clickedCell =
      target.closest(
        "td.table-cell"
      );

    if (
      clickedCell &&
      currentCell &&
      clickedCell !== currentCell
    ) {
      clearInnerMode();
    }
  }

  function handleKeyDown(
    event
  ) {
    ensureRuntimePatches();

    if (
      handleCompositeDateTimeAltNavigation(
        event
      )
    ) {
      return;
    }

    if (handleEscape(event)) {
      return;
    }

    if (handleTab(event)) {
      return;
    }

    handleInnerArrow(event);
  }

  function init() {
    if (
      document
        .__tableCellInnerModeBound
    ) {
      return;
    }

    document
      .__tableCellInnerModeBound =
        true;

    ensureRuntimePatches();

    document.addEventListener(
      "focusin",
      handleFocusIn,
      true
    );

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true
    );

    /*
      Capture нужен, чтобы стрелки
      обрабатывались раньше:
      - обработчика td;
      - общей системы хоткеев;
      - обработчика удержания.
    */
    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );
  }

  /*
    Единое API состояния
    «внутри/снаружи».
  */
  window.tableCellInnerMode = {
    enter:
      enterInnerMode,

    exit:
      exitInnerMode,

    clear:
      clearInnerMode,

    isActive:
      isInnerModeActive,

    isCell:
      isInnerModeCell,

    getCell() {
      return isInnerModeActive()
        ? findRememberedCell()
        : null;
    },
  };

  /*
    Старое публичное имя сохраняем,
    чтобы другие файлы проекта
    продолжали работать.
  */
  window.tableTabNavigation = {
    init,

    getSelectedCell:
      getSelectedTableCell,

    getFocusableElementsInsideCell:
      getFocusableElementsInsideCell,

    focusInsideCell,
  };

  window.ensureTableCellTabNavigation =
    init;

  init();
})();