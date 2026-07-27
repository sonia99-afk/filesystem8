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

  const VERTICAL_BUFFER_ROWS = 2;
  const HORIZONTAL_EDGE_GAP = 10;
  const MOUSE_VERTICAL_EDGE_GAP = 10;

  let scrollRaf = null;
  let scrollRequested = false;
  let pendingCell = null;
  let pendingMode = "keyboard";

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

const horizontalScrollLocks = new WeakMap();

/*
  Полностью замораживает горизонтальную позицию
  контейнера на всё время редактирования ячейки.

  Позиция восстанавливается:
  - сразу при попытке прокрутки;
  - перед каждым кадром браузера.

  Благодаря этому контейнер не успевает визуально
  сдвинуться даже при быстрых или зажатых клавишах.
*/
function lockHorizontalPosition(cell) {
  const container = findHorizontalScrollContainer(cell);

  if (!container) {
    return function () {};
  }

  let state = horizontalScrollLocks.get(container);

  if (!state) {
    const getNow = () => {
      if (
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
      ) {
        return performance.now();
      }

      return Date.now();
    };

    state = {
      scrollLeft: container.scrollLeft,
      count: 0,
      restoring: false,
      rafId: null,

      /*
        До этого момента прокрутка считается
        ручным действием пользователя.
      */
      userScrollUntil: 0,

      /*
        Используется при перетаскивании
        горизонтальной полосы прокрутки.
      */
      draggingHorizontalScrollbar: false,

      previousScrollBehavior:
        container.style.scrollBehavior,

      previousOverflowAnchor:
        container.style.overflowAnchor,

      previousOverscrollBehaviorX:
        container.style.overscrollBehaviorX,

      restore: null,
      onScroll: null,
      onWheel: null,
      onPointerDown: null,
      onPointerUp: null,
      tick: null,
    };

    state.allowUserScrollFor = function (duration = 200) {
      state.userScrollUntil = Math.max(
        state.userScrollUntil,
        getNow() + duration
      );
    };

    state.isUserScrollActive = function () {
      return (
        state.draggingHorizontalScrollbar ||
        getNow() < state.userScrollUntil
      );
    };

    state.restore = function restoreHorizontalPosition() {
      if (!container.isConnected) return;
      if (state.restoring) return;

      /*
        При ручной прокрутке не возвращаем старую позицию,
        а запоминаем выбранное пользователем положение.
      */
      if (state.isUserScrollActive()) {
        state.scrollLeft = container.scrollLeft;
        return;
      }

      if (
        Math.abs(
          container.scrollLeft - state.scrollLeft
        ) < 0.1
      ) {
        return;
      }

      state.restoring = true;
      container.scrollLeft = state.scrollLeft;
      state.restoring = false;
    };

    state.onScroll = function onLockedHorizontalScroll() {
      if (state.isUserScrollActive()) {
        state.scrollLeft = container.scrollLeft;
        return;
      }

      state.restore();
    };

    /*
      Горизонтальный тачпад или Shift + колесо мыши.
    */
    state.onWheel = function onHorizontalWheel(e) {
      const hasHorizontalMovement =
        Math.abs(Number(e.deltaX) || 0) > 0.01;

      if (
        hasHorizontalMovement ||
        e.shiftKey
      ) {
        state.allowUserScrollFor(240);
      }
    };

    /*
      При нажатии непосредственно на контейнер
      разрешаем перетаскивание его полосы прокрутки.

      Нажатие на кнопку или ячейку сюда не попадёт,
      поскольку e.target будет внутренним элементом.
    */
    state.onPointerDown = function onContainerPointerDown(e) {
      if (e.target !== container) return;

      state.draggingHorizontalScrollbar = true;
      state.allowUserScrollFor(1000);
    };

    state.onPointerUp = function onContainerPointerUp() {
      if (!state.draggingHorizontalScrollbar) return;

      /*
        Сохраняем конечную позицию, выбранную мышью.
      */
      state.scrollLeft = container.scrollLeft;
      state.draggingHorizontalScrollbar = false;
      state.allowUserScrollFor(100);
    };

    state.tick = function keepHorizontalPositionFrozen() {
      if (
        !horizontalScrollLocks.has(container) ||
        state.count <= 0 ||
        !container.isConnected
      ) {
        state.rafId = null;
        return;
      }

      if (state.isUserScrollActive()) {
        state.scrollLeft = container.scrollLeft;
      } else {
        state.restore();
      }

      state.rafId = requestAnimationFrame(
        state.tick
      );
    };

    container.style.scrollBehavior = "auto";
    container.style.overflowAnchor = "none";
    container.style.overscrollBehaviorX = "none";

    container.addEventListener(
      "scroll",
      state.onScroll,
      {
        passive: true,
      }
    );

    container.addEventListener(
      "wheel",
      state.onWheel,
      {
        passive: true,
      }
    );

    container.addEventListener(
      "pointerdown",
      state.onPointerDown,
      true
    );

    window.addEventListener(
      "pointerup",
      state.onPointerUp,
      true
    );

    window.addEventListener(
      "pointercancel",
      state.onPointerUp,
      true
    );

    horizontalScrollLocks.set(container, state);

    state.rafId = requestAnimationFrame(
      state.tick
    );
  }

  state.count += 1;
  state.restore();

  let released = false;

  return function releaseHorizontalPosition() {
    if (released) return;

    released = true;

    state.count = Math.max(
      0,
      state.count - 1
    );

    if (state.count > 0) return;

    state.restore();

    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    container.removeEventListener(
      "scroll",
      state.onScroll
    );

    container.removeEventListener(
      "wheel",
      state.onWheel
    );

    container.removeEventListener(
      "pointerdown",
      state.onPointerDown,
      true
    );

    window.removeEventListener(
      "pointerup",
      state.onPointerUp,
      true
    );

    window.removeEventListener(
      "pointercancel",
      state.onPointerUp,
      true
    );

    container.style.scrollBehavior =
      state.previousScrollBehavior;

    container.style.overflowAnchor =
      state.previousOverflowAnchor;

    container.style.overscrollBehaviorX =
      state.previousOverscrollBehaviorX;

    horizontalScrollLocks.delete(container);
  };
}

function isHorizontalPositionLocked(cellOrContainer) {
  const container =
    cellOrContainer?.classList?.contains("main")
      ? cellOrContainer
      : findHorizontalScrollContainer(
          cellOrContainer
        );

  return !!(
    container &&
    horizontalScrollLocks.has(container)
  );
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

  function getVisibleTableRows(table) {
  if (!table) return [];

  return Array.from(
    table.querySelectorAll("tbody tr")
  ).filter((row) => {
    if (row.hidden || row.closest("[hidden]")) {
      return false;
    }

    const style =
      window.getComputedStyle(row);

    if (
      style.display === "none" ||
      style.visibility === "hidden"
    ) {
      return false;
    }

    return (
      row.getBoundingClientRect().height > 0
    );
  });
}

function getAdjacentRowsHeight(
  rows,
  currentIndex,
  direction,
  count
) {
  let totalHeight = 0;
  let collectedRows = 0;

  for (
    let index = currentIndex + direction;
    index >= 0 &&
    index < rows.length &&
    collectedRows < count;
    index += direction
  ) {
    const rowRect =
      rows[index].getBoundingClientRect();

    if (rowRect.height <= 0) {
      continue;
    }

    totalHeight += rowRect.height;
    collectedRows += 1;
  }

  return totalHeight;
}

  function performScroll() {
    scrollRaf = null;

    const cell = pendingCell;
    const scrollMode = pendingMode;

    pendingCell = null;
    pendingMode = "keyboard";

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

const visibleRows =
  getVisibleTableRows(table);

const currentRowIndex =
  visibleRows.indexOf(row);

/*
  Для верхней границы считаем высоту
  реальных строк над активной строкой.
*/
const requestedTopBuffer =
  currentRowIndex >= 0
    ? getAdjacentRowsHeight(
        visibleRows,
        currentRowIndex,
        -1,
        VERTICAL_BUFFER_ROWS
      )
    : 0;

/*
  Для нижней границы считаем высоту
  реальных строк под активной строкой.
*/
const requestedBottomBuffer =
  currentRowIndex >= 0
    ? getAdjacentRowsHeight(
        visibleRows,
        currentRowIndex,
        1,
        VERTICAL_BUFFER_ROWS
      )
    : 0;

const visibleVerticalHeight = Math.max(
  0,
  visibleBottom - visibleTop
);

/*
  Не позволяем зонам сверху и снизу
  полностью перекрыть активную строку,
  если окно очень маленькое.
*/
const maxVerticalBuffer = Math.max(
  0,
  (
    visibleVerticalHeight -
    cellRect.height
  ) / 2
);

const keyboardTopBuffer =
  Math.min(
    requestedTopBuffer,
    maxVerticalBuffer
  );

const keyboardBottomBuffer =
  Math.min(
    requestedBottomBuffer,
    maxVerticalBuffer
  );

const mouseVerticalBuffer =
  Math.min(
    MOUSE_VERTICAL_EDGE_GAP,
    maxVerticalBuffer
  );

const topBuffer =
  scrollMode === "mouse"
    ? mouseVerticalBuffer
    : keyboardTopBuffer;

const bottomBuffer =
  scrollMode === "mouse"
    ? mouseVerticalBuffer
    : keyboardBottomBuffer;

const safeTop =
  visibleTop + topBuffer;

const safeBottom =
  visibleBottom - bottomBuffer;

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

/*
  Автоскролл начинается только тогда,
  когда ячейка действительно скрыта за краем.

  После прокрутки оставляем дополнительный
  отступ HORIZONTAL_EDGE_GAP от края экрана.
*/
if (cellRect.left < visibleLeft) {
  deltaX =
    cellRect.left -
    (visibleLeft + HORIZONTAL_EDGE_GAP);
} else if (cellRect.right > visibleRight) {
  deltaX =
    cellRect.right -
    (visibleRight - HORIZONTAL_EDGE_GAP);
}

    if (Math.abs(deltaY) >= 1) {
      verticalContainer.scrollTop =
        Math.round(
          verticalContainer.scrollTop + deltaY
        );
    }

if (
  !horizontalScrollLocks.has(horizontalContainer) &&
  Math.abs(deltaX) >= 1
) {
  horizontalContainer.scrollLeft =
    Math.round(
      horizontalContainer.scrollLeft + deltaX
    );
}
  }

function scrollCellIntoView(
  cell,
  options = {}
) {
  if (!cell || !isTableViewActive()) {
    return;
  }

  pendingCell = cell;

  pendingMode =
    options.mode === "mouse"
      ? "mouse"
      : "keyboard";

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
  lockHorizontalPosition,
  isHorizontalPositionLocked,

    cancel() {
      if (scrollRaf !== null) {
        cancelAnimationFrame(scrollRaf);
      }

      scrollRaf = null;
      scrollRequested = false;
      pendingCell = null;
      pendingMode = "keyboard";
    },
  };
})();