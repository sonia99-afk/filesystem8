// ui_toggle.js
// Универсальная логика для кнопок:
//
// <button
//   class="ui-toggle"
//   type="button"
//   role="switch"
//   aria-checked="true"
//   data-ui-toggle
// ></button>
//
// После изменения отправляется событие:
// ui-toggle-change
//
// event.detail:
// {
//   checked: boolean,
//   toggle: HTMLElement,
//   name: string
// }

(function () {
  if (typeof window === "undefined") return;

  function normalizeBoolean(value) {
    return (
      value === true ||
      value === "true" ||
      value === "1"
    );
  }

  function isDisabled(toggle) {
    if (!toggle) return true;

    return (
      toggle.disabled ||
      toggle.getAttribute("aria-disabled") === "true"
    );
  }

  function getChecked(toggle) {
    if (!toggle) return false;

    return normalizeBoolean(
      toggle.getAttribute("aria-checked")
    );
  }

  function updateStateClasses(toggle) {
    if (!toggle) return;

    const checked = getChecked(toggle);
    const disabled = isDisabled(toggle);

    toggle.classList.toggle(
      "is-checked",
      checked
    );

    toggle.classList.toggle(
      "is-disabled",
      disabled
    );
  }

  function emitChange(toggle) {
    const checked = getChecked(toggle);

    toggle.dispatchEvent(
      new CustomEvent("ui-toggle-change", {
        bubbles: true,

        detail: {
          checked,
          toggle,
          name:
            toggle.dataset.toggleName ||
            toggle.name ||
            toggle.id ||
            "",
        },
      })
    );
  }

  function setChecked(
    toggle,
    checked,
    options = {}
  ) {
    if (!toggle) return false;

    const nextValue = !!checked;
    const previousValue = getChecked(toggle);

    toggle.setAttribute(
      "aria-checked",
      nextValue ? "true" : "false"
    );

    updateStateClasses(toggle);

    if (
      previousValue !== nextValue &&
      options.emit !== false
    ) {
      emitChange(toggle);
    }

    return true;
  }

  function toggleChecked(toggle) {
    if (!toggle || isDisabled(toggle)) {
      return false;
    }

    return setChecked(
      toggle,
      !getChecked(toggle)
    );
  }

  function setDisabled(toggle, disabled) {
    if (!toggle) return false;

    const nextValue = !!disabled;

    toggle.disabled = nextValue;

    toggle.setAttribute(
      "aria-disabled",
      nextValue ? "true" : "false"
    );

    updateStateClasses(toggle);

    return true;
  }

  function prepareToggle(toggle) {
    if (!toggle) return;
    if (toggle.dataset.uiToggleReady === "1") {
      return;
    }

    toggle.dataset.uiToggleReady = "1";

    if (!toggle.hasAttribute("role")) {
      toggle.setAttribute("role", "switch");
    }

    if (!toggle.hasAttribute("aria-checked")) {
      toggle.setAttribute(
        "aria-checked",
        "false"
      );
    }

    updateStateClasses(toggle);

    toggle.addEventListener("click", (e) => {
      e.preventDefault();

      if (isDisabled(toggle)) {
        return;
      }

      toggleChecked(toggle);
    });
  }

  function init(root = document) {
    root
      .querySelectorAll?.("[data-ui-toggle]")
      .forEach(prepareToggle);
  }

  window.uiToggle = {
    init,
    prepare: prepareToggle,
    getChecked,
    setChecked,
    toggle: toggleChecked,
    setDisabled,
    isDisabled,
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => init()
    );
  } else {
    init();
  }
})();