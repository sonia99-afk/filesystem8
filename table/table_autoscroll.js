// table_autoscroll.js
// Управляемый автоскролл активной ячейки таблицы.
//
// Вертикаль:
// - запас 3 строки до верхнего и нижнего края.
//
// Горизонталь:
// - без дополнительного запаса;
// - ячейка просто становится видна полностью.
//
// При частичной видимости ячейки прокрутка сдвигается
// ровно настолько, чтобы показать её целиком.

(function () {
  if (typeof window === "undefined") return;

  const VERTICAL_BUFFER_ROWS = 3;

  let scrollRaf = null;
  let scrollRequested = false;
  let pendingCell = null;

  function isTableViewActive() {
    return (
      typeof currentView !== "undefined" &&
      typeof VIEW !== "undefined" &&
      currentView === VIEW.TABLE
    );
  }

  function canScrollVertically(element) {
    if (!element) return false;

    const style = getComputedStyle(element);

    return (
      (
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflowY === "overlay"
      ) &&
      element.scrollHeight > element.clientHeight
    );
  }

  function canScrollHorizontally(element) {
    if (!element) return false;

    const style = getComputedStyle(element);

    return (
      (
        style.overflowX === "auto" ||
        style.overflowX === "scroll" ||
        style.overflowX === "overlay"
      ) &&
      element.scrollWidth > element.clientWidth
    );
  }

  function findVerticalScrollContainer(cell) {
    let element = cell?.parentElement || null;

    while (element) {
      if (canScrollVertically(element)) {
        return element;
      }

      element = element.parentElement;
    }

    return document.querySelector(".main");
  }

  function findHorizontalScrollContainer(cell) {
    let element = cell?.parentElement || null;

    while (element) {
      if (canScrollHorizontally(element)) {
        return element;
      }

      element = element.parentElement;
    }

    return document.querySelector(".main");
  }

  function getClientViewport(element) {
    const rect = element.getBoundingClientRect();

    const left = rect.left + element.clientLeft;
    const top = rect.top + element.clientTop;

    return {
      left,
      top,
      right: left + element.clientWidth,
      bottom: top + element.clientHeight,
      width: element.clientWidth,
      height: element.clientHeight,
    };
  }

  function getTableHeaderBottom(
    table,
    viewportTop,
    viewportBottom
  ) {
    const thead = table?.querySelector("thead");

    if (!thead) {
      return viewportTop;
    }

    const headerRect = thead.getBoundingClientRect();

    return Math.max(
      viewportTop,
      Math.min(
        headerRect.bottom,
        viewportBottom
      )
    );
  }

  function performScroll() {
    scrollRaf = null;

    const cell = pendingCell;
    pendingCell = null;

    if (!cell || !cell.isConnected) return;
    if (!isTableViewActive()) return;

    const table = cell.closest(".structure-table");

    const verticalContainer =
      findVerticalScrollContainer(cell);

    const horizontalContainer =
      findHorizontalScrollContainer(cell);

    if (
      !table ||
      !verticalContainer ||
      !horizontalContainer
    ) {
      return;
    }

    const cellRect =
      cell.getBoundingClientRect();

    if (
      cellRect.width <= 0 ||
      cellRect.height <= 0
    ) {
      return;
    }

    /*
      =========================================
      Вертикальная прокрутка:
      запас 3 строки от верхнего и нижнего края.
      =========================================
    */

    const verticalViewport =
      getClientViewport(verticalContainer);

    const visibleTop =
      getTableHeaderBottom(
        table,
        verticalViewport.top,
        verticalViewport.bottom
      );

    const visibleBottom =
      verticalViewport.bottom;

    const row = cell.closest("tr");
    const rowRect =
      row?.getBoundingClientRect();

    const rowHeight = Math.max(
      rowRect?.height || cellRect.height,
      1
    );

    const requestedVerticalBuffer =
      rowHeight * VERTICAL_BUFFER_ROWS;

    const visibleVerticalHeight = Math.max(
      0,
      visibleBottom - visibleTop
    );

    const maxVerticalBuffer = Math.max(
      0,
      (
        visibleVerticalHeight -
        cellRect.height
      ) / 2
    );

    const verticalBuffer = Math.min(
      requestedVerticalBuffer,
      maxVerticalBuffer
    );

    const safeTop =
      visibleTop + verticalBuffer;

    const safeBottom =
      visibleBottom - verticalBuffer;

    let deltaY = 0;

    /*
      Как только активная ячейка входит
      в зону трёх строк до края,
      прокручиваем таблицу так, чтобы этот
      запас снова восстановился.
    */
    if (cellRect.top < safeTop) {
      deltaY =
        cellRect.top - safeTop;
    } else if (cellRect.bottom > safeBottom) {
      deltaY =
        cellRect.bottom - safeBottom;
    }

    /*
      =========================================
      Горизонтальная прокрутка:
      запас от края равен нулю.

      Скролл происходит только тогда,
      когда ячейка видна не полностью.
      =========================================
    */

    const horizontalViewport =
      getClientViewport(horizontalContainer);

    const visibleLeft =
      horizontalViewport.left;

    const visibleRight =
      horizontalViewport.right;

    let deltaX = 0;

    if (cellRect.left < visibleLeft) {
      deltaX =
        cellRect.left - visibleLeft;
    } else if (cellRect.right > visibleRight) {
      deltaX =
        cellRect.right - visibleRight;
    }

    if (Math.abs(deltaY) >= 1) {
      verticalContainer.scrollTop =
        Math.round(
          verticalContainer.scrollTop + deltaY
        );
    }

    if (Math.abs(deltaX) >= 1) {
      horizontalContainer.scrollLeft =
        Math.round(
          horizontalContainer.scrollLeft + deltaX
        );
    }
  }

  function scrollCellIntoView(cell) {
    if (!cell || !isTableViewActive()) return;

    pendingCell = cell;

    /*
      За один кадр выполняется только один расчёт.
      При быстрых стрелках используется последняя
      выбранная ячейка.
    */
    if (scrollRequested) return;

    scrollRequested = true;

    scrollRaf = requestAnimationFrame(() => {
      scrollRequested = false;
      performScroll();
    });
  }

  function scrollSelectedCellIntoView() {
    const selectedCell =
      document.querySelector(
        "#tree .structure-table " +
        "td.table-cell-selected"
      );

    if (selectedCell) {
      scrollCellIntoView(selectedCell);
    }
  }

  window.tableAutoscroll = {
    scrollCellIntoView,
    scrollSelectedCellIntoView,

    cancel() {
      if (scrollRaf !== null) {
        cancelAnimationFrame(scrollRaf);
      }

      scrollRaf = null;
      scrollRequested = false;
      pendingCell = null;
    },
  };
})();