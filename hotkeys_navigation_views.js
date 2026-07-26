// hotkeys_navigation_views.js
// Переключает строки блока «Выбор»
// в панели настройки хоткеев.
//
// Этот переключатель не меняет реальное
// отображение приложения.
//
// Доступны три группы:
// - schema — горизонтальные и основные отображения;
// - vertical — вертикальная иерархия и вертикальный айсикл;
// - table — таблица.

(function () {
  if (typeof window === "undefined") return;

  const ALLOWED_GROUPS = new Set([
    "schema",
    "vertical",
    "table",
  ]);

  let selectedGroup = "schema";

  function getButtons() {
    return Array.from(
      document.querySelectorAll(
        ".hotkeys-group-switcher [data-hotkeys-group]"
      )
    );
  }

  function getSelectionRows() {
    return Array.from(
      document.querySelectorAll(
        "[data-selection-view]"
      )
    );
  }

  function syncButtons() {
    getButtons().forEach((button) => {
      const isActive =
        button.dataset.hotkeysGroup ===
        selectedGroup;

      button.classList.toggle(
        "is-active",
        isActive
      );

      button.classList.toggle(
        "active",
        isActive
      );

      button.setAttribute(
        "aria-pressed",
        isActive ? "true" : "false"
      );
    });
  }

  function syncRows() {
    getSelectionRows().forEach((row) => {
      row.hidden =
        row.dataset.selectionView !==
        selectedGroup;
    });

    window.syncHotkeysTable?.();
  }

  function syncAll() {
    syncButtons();
    syncRows();
  }

  function selectGroup(group) {
    if (!ALLOWED_GROUPS.has(group)) {
      return;
    }

    selectedGroup = group;
    syncAll();
  }

  function init() {
    getButtons().forEach((button) => {
      button.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();

          selectGroup(
            button.dataset.hotkeysGroup
          );
        }
      );
    });

    selectGroup("schema");
  }

  window.hotkeysNavigationViews = {
    selectGroup,

    getSelectedGroup() {
      return selectedGroup;
    },

    /*
      Оставляем для совместимости,
      если где-то старый код ещё вызывает
      getVisibleGroup().
    */
    getVisibleGroup() {
      return selectedGroup;
    },

    /*
      Совместимость со старым API.
    */
    selectView(view) {
      if (view === "table") {
        selectGroup("table");
        return;
      }

      if (view === "vertical") {
        selectGroup("vertical");
        return;
      }

      selectGroup("schema");
    },

    getSelectedView() {
      return selectedGroup;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();