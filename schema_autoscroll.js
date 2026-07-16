// schema_autoscroll.js
// Автоскролл активного объекта в режиме структуры.
// Работает по вертикали и по горизонтали.

(function () {
  if (typeof window === "undefined") return;

  const BUFFER_ROWS = 3;
  const HORIZONTAL_BUFFER_PX = 80;

  let scrollRaf = null;
  let scrollRequested = false;

  function findSelectedRow() {
    if (typeof selectedId === "undefined" || !selectedId) {
      return null;
    }

    const tree = document.getElementById("tree");
    if (!tree) return null;

    const escapedId =
      typeof cssEscape === "function"
        ? cssEscape(selectedId)
        : CSS.escape(String(selectedId));

    return tree.querySelector(
      `.row[data-id="${escapedId}"]`
    );
  }

  function performScroll() {
    scrollRaf = null;

    const row = findSelectedRow();
    const container = document.querySelector(".main");

    if (!row || !container) return;

    const rowRect = row.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    /* ===== Вертикальный автоскролл ===== */

    const rowHeight = Math.max(rowRect.height, 1);
    const requestedVerticalBuffer =
      rowHeight * BUFFER_ROWS;

    const maxVerticalBuffer = Math.max(
      0,
      (containerRect.height - rowHeight) / 2
    );

    const verticalBuffer = Math.min(
      requestedVerticalBuffer,
      maxVerticalBuffer
    );

    const safeTop =
      containerRect.top + verticalBuffer;

    const safeBottom =
      containerRect.bottom - verticalBuffer;

    let deltaY = 0;

    if (rowRect.top < safeTop) {
      deltaY = rowRect.top - safeTop;
    } else if (rowRect.bottom > safeBottom) {
      deltaY = rowRect.bottom - safeBottom;
    }

    /* ===== Горизонтальный автоскролл ===== */

    const maxHorizontalBuffer = Math.max(
      0,
      (containerRect.width - rowRect.width) / 2
    );

    const horizontalBuffer = Math.min(
      HORIZONTAL_BUFFER_PX,
      maxHorizontalBuffer
    );

    const safeLeft =
      containerRect.left + horizontalBuffer;

    const safeRight =
      containerRect.right - horizontalBuffer;

    let deltaX = 0;

    if (rowRect.left < safeLeft) {
      deltaX = rowRect.left - safeLeft;
    } else if (rowRect.right > safeRight) {
      deltaX = rowRect.right - safeRight;
    }

    if (
      Math.abs(deltaY) < 1 &&
      Math.abs(deltaX) < 1
    ) {
      return;
    }

    if (Math.abs(deltaY) >= 1) {
      container.scrollTop = Math.round(
        container.scrollTop + deltaY
      );
    }

    if (Math.abs(deltaX) >= 1) {
      container.scrollLeft = Math.round(
        container.scrollLeft + deltaX
      );
    }
  }

  function scrollSelectedIntoView() {
    if (
      typeof currentView !== "undefined" &&
      typeof VIEW !== "undefined" &&
      currentView === VIEW.TABLE
    ) {
      return;
    }

    /*
      На один кадр допускаем только один запрос.
      При быстром удержании стрелок используется
      самое актуальное значение selectedId.
    */
    if (scrollRequested) return;

    scrollRequested = true;

    scrollRaf = requestAnimationFrame(() => {
      scrollRequested = false;
      performScroll();
    });
  }

  window.schemaAutoscroll = {
    scrollSelectedIntoView,

    cancel() {
      if (scrollRaf !== null) {
        cancelAnimationFrame(scrollRaf);
      }

      scrollRaf = null;
      scrollRequested = false;
    },
  };
})();