// schema_autoscroll.js
// Автоскролл активного объекта в режиме структуры.
// Клавиатура сохраняет запас в несколько строк.
// Мышь оставляет отступ 10px от края.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  const BUFFER_ROWS = 3;
  const HORIZONTAL_BUFFER_PX = 80;
  const MOUSE_VERTICAL_EDGE_GAP = 10;

  let scrollRaf = null;
  let scrollRequested = false;
  let pendingMode = "keyboard";

  function findSelectedRow() {
    if (
      typeof selectedId === "undefined" ||
      !selectedId
    ) {
      return null;
    }

    const tree =
      document.getElementById("tree");

    if (!tree) return null;

    const escapedId =
      typeof cssEscape === "function"
        ? cssEscape(selectedId)
        : CSS.escape(
            String(selectedId)
          );

    return tree.querySelector(
      `.row[data-id="${escapedId}"]`
    );
  }

  function performScroll() {
    scrollRaf = null;

    const scrollMode = pendingMode;
    pendingMode = "keyboard";

    const row = findSelectedRow();
    const container =
      document.querySelector(".main");

    if (!row || !container) {
      return;
    }

    const rowRect =
      row.getBoundingClientRect();

    const containerRect =
      container.getBoundingClientRect();

    /*
      Вертикальный автоскролл.
    */

    const rowHeight = Math.max(
      rowRect.height,
      1
    );

    const requestedKeyboardBuffer =
      rowHeight * BUFFER_ROWS;

    const maxVerticalBuffer = Math.max(
      0,
      (
        containerRect.height -
        rowHeight
      ) / 2
    );

    const keyboardVerticalBuffer =
      Math.min(
        requestedKeyboardBuffer,
        maxVerticalBuffer
      );

    const mouseVerticalBuffer =
      Math.min(
        MOUSE_VERTICAL_EDGE_GAP,
        maxVerticalBuffer
      );

    const verticalBuffer =
      scrollMode === "mouse"
        ? mouseVerticalBuffer
        : keyboardVerticalBuffer;

    const safeTop =
      containerRect.top +
      verticalBuffer;

    const safeBottom =
      containerRect.bottom -
      verticalBuffer;

    let deltaY = 0;

    if (rowRect.top < safeTop) {
      deltaY =
        rowRect.top -
        safeTop;
    } else if (
      rowRect.bottom >
      safeBottom
    ) {
      deltaY =
        rowRect.bottom -
        safeBottom;
    }

    /*
      Горизонтальный автоскролл.
    */

    const maxHorizontalBuffer =
      Math.max(
        0,
        (
          containerRect.width -
          rowRect.width
        ) / 2
      );

    const horizontalBuffer =
      Math.min(
        HORIZONTAL_BUFFER_PX,
        maxHorizontalBuffer
      );

    const safeLeft =
      containerRect.left +
      horizontalBuffer;

    const safeRight =
      containerRect.right -
      horizontalBuffer;

    let deltaX = 0;

    if (rowRect.left < safeLeft) {
      deltaX =
        rowRect.left -
        safeLeft;
    } else if (
      rowRect.right >
      safeRight
    ) {
      deltaX =
        rowRect.right -
        safeRight;
    }

    if (Math.abs(deltaY) >= 1) {
      container.scrollTop =
        Math.round(
          container.scrollTop +
          deltaY
        );
    }

    if (Math.abs(deltaX) >= 1) {
      container.scrollLeft =
        Math.round(
          container.scrollLeft +
          deltaX
        );
    }
  }

  function scrollSelectedIntoView(
    options = {}
  ) {
    if (
      typeof currentView !==
        "undefined" &&
      typeof VIEW !== "undefined" &&
      currentView === VIEW.TABLE
    ) {
      return;
    }

    const requestedMode =
      options.mode === "mouse"
        ? "mouse"
        : "keyboard";

    /*
      Если обычный скролл уже запланирован,
      мышиный режим получает приоритет.
    */
    if (scrollRequested) {
      if (
        requestedMode === "mouse"
      ) {
        pendingMode = "mouse";
      }

      return;
    }

    pendingMode = requestedMode;
    scrollRequested = true;

    scrollRaf =
      requestAnimationFrame(() => {
        scrollRequested = false;
        performScroll();
      });
  }

  window.schemaAutoscroll = {
    scrollSelectedIntoView,

    cancel() {
      if (scrollRaf !== null) {
        cancelAnimationFrame(
          scrollRaf
        );
      }

      scrollRaf = null;
      scrollRequested = false;
      pendingMode = "keyboard";
    },
  };
})();