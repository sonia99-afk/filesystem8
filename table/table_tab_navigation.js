// table/table_tab_navigation.js
// Tab-навигация внутри выбранной ячейки таблицы.
//
// Поведение:
// - Tab не уводит фокус из таблицы сразу;
// - если в выбранной ячейке есть кнопки/input/select — Tab ходит по ним;
// - если фокусируемых элементов нет — пробуем открыть редактор ячейки;
// - Shift+Tab ходит в обратную сторону.

(function () {
  if (typeof window === "undefined") return;

  function getSelectedTableCell() {
    const host = document.getElementById("tree");
    if (!host) return null;

    return host.querySelector("td.table-cell-selected");
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
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      )
    ).filter(isVisibleFocusableElement);
  }

  function focusInsideSelectedTableCell(td, reverse = false) {
    if (!td) return false;

    const items = getFocusableElementsInsideTableCell(td);

    if (!items.length) return false;

    const active = document.activeElement;
    const currentIndex = items.indexOf(active);

    let nextIndex;

    if (currentIndex < 0) {
      nextIndex = reverse ? items.length - 1 : 0;
    } else {
      nextIndex = reverse
        ? (currentIndex - 1 + items.length) % items.length
        : (currentIndex + 1) % items.length;
    }

    items[nextIndex].focus({
      preventScroll: true,
    });

    return true;
  }

  function isTableViewActive() {
    const host = document.getElementById("tree");

    return !!(
      host &&
      host.querySelector(".structure-table") &&
      (!window.VIEW || window.currentView === window.VIEW.TABLE)
    );
  }

  function handleTableCellTabNavigation(e) {
    if (e.key !== "Tab") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!isTableViewActive()) return;

    const host = document.getElementById("tree");
    if (!host) return;

    const active = document.activeElement;

    /*
      Если фокус сейчас на кнопках вне таблицы —
      не мешаем обычному Tab.
    */
    if (active && active !== document.body && !host.contains(active)) {
      return;
    }

    const selectedCell = getSelectedTableCell();
    if (!selectedCell) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();

    if (focusInsideSelectedTableCell(selectedCell, e.shiftKey)) {
      return;
    }

    /*
      Если в ячейке пока нет фокусируемых элементов,
      пробуем открыть её редактор.
    */
    const opened = window.tableCellEditors?.startEdit?.(selectedCell);

    if (!opened) return;

    requestAnimationFrame(() => {
      const freshSelectedCell = getSelectedTableCell() || selectedCell;

      focusInsideSelectedTableCell(freshSelectedCell, e.shiftKey);
    });
  }


function init() {
  if (document.__tableCellTabNavigationBound) return;

  document.__tableCellTabNavigationBound = true;

  document.addEventListener(
    "keydown",
    handleTableCellTabNavigation,
    true
  );
}

  window.tableTabNavigation = {
    init,
    getSelectedCell: getSelectedTableCell,
    getFocusableElementsInsideCell: getFocusableElementsInsideTableCell,
    focusInsideCell: focusInsideSelectedTableCell,
  };

  window.ensureTableCellTabNavigation = init;

  init();
})();