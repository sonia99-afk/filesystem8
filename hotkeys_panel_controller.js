// hotkeys_panel_controller.js
// Управляет открытием и закрытием панели хоткеев.
//
// sidebar:
// - кнопка слева вызывает старую кнопку правого бара;
//
// modal:
// - кнопка слева открывает большое окно;
// - крестик, Esc и нажатие на затемнение закрывают его.

(function () {
  if (typeof window === "undefined") return;

  let backdrop = null;
  let previouslyFocusedElement = null;

  function getPanel() {
    return (
      document.getElementById("hotkeysPanel") ||
      document.querySelector(".sidebar")
    );
  }

  function getOpenButton() {
    return document.getElementById(
      "hotkeysPanelOpenBtn"
    );
  }

  function getCloseButton() {
    return document.getElementById(
      "hotkeysPanelCloseBtn"
    );
  }

  function isModalMode() {
    return !!window.hotkeysPanelMode
      ?.isModal?.();
  }

  function isModalOpen() {
    return document.body.classList.contains(
      "hotkeys-panel-modal-open"
    );
  }

  function createBackdrop() {
    if (backdrop?.isConnected) {
      return backdrop;
    }

    backdrop = document.createElement("div");
    backdrop.className =
      "hotkeys-modal-backdrop";

    backdrop.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", () => {
      closeModal();
    });

    return backdrop;
  }

  function updatePanelAccessibility(open) {
    const panel = getPanel();
    if (!panel) return;

    if (isModalMode()) {
      panel.setAttribute(
        "role",
        "dialog"
      );

      panel.setAttribute(
        "aria-modal",
        "true"
      );

      panel.setAttribute(
        "aria-hidden",
        open ? "false" : "true"
      );
    } else {
      panel.removeAttribute("role");
      panel.removeAttribute("aria-modal");

      panel.setAttribute(
        "aria-hidden",
        "false"
      );
    }
  }

  function openModal() {
    if (!isModalMode()) return false;
    if (isModalOpen()) return true;

    createBackdrop();

    previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.body.classList.add(
      "hotkeys-panel-modal-open"
    );

    updatePanelAccessibility(true);

    requestAnimationFrame(() => {
      getCloseButton()?.focus({
        preventScroll: true,
      });
    });

    window.dispatchEvent(
      new CustomEvent(
        "hotkeys-panel-open",
        {
          detail: {
            mode: "modal",
          },
        }
      )
    );

    return true;
  }

  function closeModal() {
    if (!isModalOpen()) return false;

    /*
      Если пользователь сейчас редактирует хоткеи,
      сначала используем уже существующую проверку
      несохранённых изменений.
    */
    if (
      window.hotkeysMode === "custom" &&
      window.hasUnsavedHotkeyChanges?.()
    ) {
      /*
        Имитируем клик вне панели.
        Существующий hotkeys_ui.js покажет
        собственное окно сохранения.
      */
      document.body.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
        })
      );

      return false;
    }

    document.body.classList.remove(
      "hotkeys-panel-modal-open"
    );

    updatePanelAccessibility(false);

    if (
      previouslyFocusedElement?.isConnected
    ) {
      previouslyFocusedElement.focus({
        preventScroll: true,
      });
    } else {
      getOpenButton()?.focus({
        preventScroll: true,
      });
    }

    previouslyFocusedElement = null;

    window.dispatchEvent(
      new CustomEvent(
        "hotkeys-panel-close",
        {
          detail: {
            mode: "modal",
          },
        }
      )
    );

    return true;
  }

  function toggleModal() {
    return isModalOpen()
      ? closeModal()
      : openModal();
  }

function openSidebarPanel() {
  const oldToggle = document.querySelector(
    ".sidebar .toggle-right"
  );

  if (!oldToggle) {
    return false;
  }

  /*
    Если панель уже открыта,
    ничего не переключаем.
  */
  if (
    !document.body.classList.contains(
      "right-collapsed"
    )
  ) {
    return true;
  }

  oldToggle.click();

  return true;
}

function openPanel() {
  if (isModalMode()) {
    return openModal();
  }

  return openSidebarPanel();
}

function closePanel() {
  if (isModalMode()) {
    return closeModal();
  }

  /*
    В боковом режиме крестик закрывает
    старую правую панель через существующую
    кнопку panel_toggle.js.
  */
  const oldToggle = document.querySelector(
    ".sidebar .toggle-right"
  );

  if (!oldToggle) {
    return false;
  }

  /*
    Если панель уже закрыта,
    повторно ничего не делаем.
  */
  if (
    document.body.classList.contains(
      "right-collapsed"
    )
  ) {
    return true;
  }

  oldToggle.click();

  return true;
}

  function handleModeChange(e) {
    const mode = e.detail?.mode;

    if (mode === "sidebar") {
      document.body.classList.remove(
        "hotkeys-panel-modal-open"
      );

      updatePanelAccessibility(false);
      return;
    }

    /*
      При переключении на modal окно не открываем
      автоматически. Оно откроется кнопкой слева.
    */
    updatePanelAccessibility(false);
  }

  function handleKeyDown(e) {
    if (!isModalMode()) return;
    if (!isModalOpen()) return;

    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();

      closeModal();
    }
  }

  function handleOutsideSidebarClick(e) {
  /*
    Для модального режима уже существует
    отдельный backdrop.
  */
  if (isModalMode()) return;

  /*
    Закрытая боковая панель не требует обработки.
  */
  if (
    document.body.classList.contains(
      "right-collapsed"
    )
  ) {
    return;
  }

  const panel = getPanel();
  if (!panel) return;

  /*
    Клик внутри самой панели ничего не закрывает.
  */
  if (panel.contains(e.target)) {
    return;
  }

  /*
    Не закрываем панель при работе с элементами
    управления в нижней части левого бара.
  */
  if (
    e.target?.closest?.(
      "#hotkeysPanelOpenBtn," +
      "#hotkeysPanelModeToggle," +
      ".hotkeys-panel-mode-control"
    )
  ) {
    return;
  }

  /*
    Если хоткеи редактируются и есть
    несохранённые изменения, панель самостоятельно
    не закрываем. Существующий hotkeys_ui.js
    покажет окно сохранения.
  */
  if (
    window.hotkeysMode === "custom" &&
    window.hasUnsavedHotkeyChanges?.()
  ) {
    return;
  }

  closePanel();
}

  function init() {
    createBackdrop();

    getOpenButton()?.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        openPanel();
      }
    );

    getCloseButton()?.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        closePanel();
      }
    );

    window.addEventListener(
      "hotkeys-panel-mode-change",
      handleModeChange
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    document.addEventListener(
  "mousedown",
  handleOutsideSidebarClick,
  true
);

    updatePanelAccessibility(false);
  }

  window.hotkeysPanelController = {
    open: openPanel,
    close: closePanel,

    openModal,
    closeModal,
    toggleModal,

    isOpen: isModalOpen,
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