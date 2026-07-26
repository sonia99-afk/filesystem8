// hotkeys_panel_mode.js
// Хранит способ отображения панели хоткеев:
//
// sidebar — обычный правый бар;
// modal   — большое модальное окно.
//
// На первом этапе файл только:
// - переключает режим;
// - ставит классы на body;
// - сохраняет выбор в localStorage.
//
// Сам модальный внешний вид подключим следующим шагом.

(function () {
  if (typeof window === "undefined") return;

  const STORAGE_KEY =
    "org_structure_hotkeys_panel_mode_v1";

  const MODE = Object.freeze({
    SIDEBAR: "sidebar",
    MODAL: "modal",
  });

  let currentMode = MODE.SIDEBAR;

  function normalizeMode(value) {
    return value === MODE.MODAL
      ? MODE.MODAL
      : MODE.SIDEBAR;
  }

  function loadMode() {
    try {
      return normalizeMode(
        localStorage.getItem(STORAGE_KEY)
      );
    } catch (_) {
      return MODE.SIDEBAR;
    }
  }

  function saveMode(mode) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        mode
      );
    } catch (_) {}
  }

  function getToggle() {
    return document.getElementById(
      "hotkeysPanelModeToggle"
    );
  }

  function getStatusElement() {
    return document.getElementById(
      "hotkeysPanelModeStatus"
    );
  }

  function syncBodyClasses() {
    document.body.classList.toggle(
      "hotkeys-panel-mode-sidebar",
      currentMode === MODE.SIDEBAR
    );

    document.body.classList.toggle(
      "hotkeys-panel-mode-modal",
      currentMode === MODE.MODAL
    );

    document.body.dataset.hotkeysPanelMode =
      currentMode;
  }

  function syncToggle() {
    const toggle = getToggle();
    if (!toggle) return;

    /*
      Тумблер называется «Открывать сбоку».

      Включён  -> sidebar.
      Выключен -> modal.
    */
    const sidebarEnabled =
      currentMode === MODE.SIDEBAR;

    if (window.uiToggle?.setChecked) {
      window.uiToggle.setChecked(
        toggle,
        sidebarEnabled,
        { emit: false }
      );
    } else {
      toggle.setAttribute(
        "aria-checked",
        sidebarEnabled ? "true" : "false"
      );
    }
  }

  function syncStatus() {
    const status = getStatusElement();
    if (!status) return;

    status.textContent =
      currentMode === MODE.SIDEBAR
        ? "Панель откроется сбоку"
        : "Панель откроется окном";
  }

  function syncAll() {
    syncBodyClasses();
    syncToggle();
    syncStatus();
  }

  function setMode(mode, options = {}) {
    const nextMode = normalizeMode(mode);

    if (currentMode === nextMode) {
      syncAll();
      return currentMode;
    }

    const previousMode = currentMode;
    currentMode = nextMode;

    if (options.save !== false) {
      saveMode(currentMode);
    }

    syncAll();

    window.dispatchEvent(
      new CustomEvent(
        "hotkeys-panel-mode-change",
        {
          detail: {
            mode: currentMode,
            previousMode,
          },
        }
      )
    );

    return currentMode;
  }

  function toggleMode() {
    return setMode(
      currentMode === MODE.SIDEBAR
        ? MODE.MODAL
        : MODE.SIDEBAR
    );
  }

  function handleToggleChange(e) {
    const toggle = e.target?.closest?.(
      "#hotkeysPanelModeToggle"
    );

    if (!toggle) return;

    const checked = !!e.detail?.checked;

    setMode(
      checked
        ? MODE.SIDEBAR
        : MODE.MODAL
    );
  }

  function init() {
    currentMode = loadMode();

    const toggle = getToggle();

    if (toggle) {
      window.uiToggle?.prepare?.(toggle);
    }

    document.addEventListener(
      "ui-toggle-change",
      handleToggleChange
    );

    syncAll();
  }

  window.hotkeysPanelMode = {
    MODE,

    getMode() {
      return currentMode;
    },

    setMode,
    toggleMode,

    isSidebar() {
      return currentMode === MODE.SIDEBAR;
    },

    isModal() {
      return currentMode === MODE.MODAL;
    },

    sync: syncAll,
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