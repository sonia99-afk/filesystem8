// hotkeys_view_group.js
// Три независимые области навигационных хоткеев:
//
// 1. table — таблица;
// 2. vertical — вертикальная иерархия и вертикальный айсикл;
// 3. main — все остальные отображения.

(function () {
  if (typeof window === "undefined") return;

  const GROUP = Object.freeze({
    MAIN: "main",
    VERTICAL: "vertical",
    TABLE: "table",
  });

  function isVerticalOrientation() {
    const orientation = window.viewOrientation;

    return (
      orientation === window.VIEW_ORIENTATION?.VERTICAL ||
      orientation === "vertical"
    );
  }

  function isVerticalSpecialView() {
    const view = window.currentView;

    const isSupportedView =
      view === window.VIEW?.HIERARCHY ||
      view === window.VIEW?.AICYCLE ||
      view === "hierarchy" ||
      view === "aicycle";

    return (
      isSupportedView &&
      isVerticalOrientation()
    );
  }

  function getActiveGroup() {
    const view = window.currentView;

    if (
      view === window.VIEW?.TABLE ||
      view === "table"
    ) {
      return GROUP.TABLE;
    }

    if (isVerticalSpecialView()) {
      return GROUP.VERTICAL;
    }

    return GROUP.MAIN;
  }

  function isActive(group) {
    return getActiveGroup() === group;
  }

  window.hotkeysViewGroup = {
    GROUP,
    getActiveGroup,
    isActive,

    isMain() {
      return isActive(GROUP.MAIN);
    },

    isVertical() {
      return isActive(GROUP.VERTICAL);
    },

    isTable() {
      return isActive(GROUP.TABLE);
    },
  };
})();