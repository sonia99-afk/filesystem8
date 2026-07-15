// table_dropdown_editor.js
// Общий dropdown-редактор для select-ячеек таблицы.
//
// Используется для:
// - тег
// - иконка
// - приоритет
// - фокус
// - статус
// - будущие select-поля

(function () {
  if (typeof window === "undefined") return;

  function normalizeOptions(options) {
    return (options || [])
      .filter(Boolean)
      .map((option) => ({
        value: String(option.value ?? ""),
        label: String(option.label ?? option.value ?? ""),
      }));
  }

  function getOptionLabel(options, value) {
    const strValue = String(value ?? "");
    const found = options.find((option) => option.value === strValue);

    return found ? found.label : strValue;
  }

  function makeClass(...classes) {
    return classes.filter(Boolean).join(" ");
  }

  function stopDropdownEvent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function createElement(tag, className) {
    const el = document.createElement(tag);

    if (className) {
      el.className = className;
    }

    return el;
  }

  function createDropdownControl(config = {}) {
    const wrap = createElement(
      "div",
      makeClass("table-dropdown-control", config.controlClass)
    );

    const view = createElement(
      "div",
      makeClass("table-dropdown-view", config.viewClass)
    );

    const editor = createElement(
      "div",
      makeClass("table-dropdown-editor", config.editorClass)
    );

    const trigger = createElement(
      "button",
      makeClass("table-dropdown-trigger", config.triggerClass)
    );

    trigger.type = "button";

    const menu = createElement(
      "div",
      makeClass("table-dropdown-menu", config.menuClass)
    );

    menu.hidden = true;
    menu.setAttribute("role", "listbox");

    let isMenuOpen = false;

    function getValue() {
      return String(config.getValue?.() ?? "");
    }

    function getOptions() {
      return normalizeOptions(config.getOptions?.() || []);
    }

    function formatView(value) {
      if (typeof config.formatView === "function") {
        return String(config.formatView(value) ?? "");
      }

      return value;
    }

    function formatTrigger(value, options) {
      if (typeof config.formatTrigger === "function") {
        return String(config.formatTrigger(value, options) ?? "");
      }

      return getOptionLabel(options, value);
    }

    function syncView() {
      const value = getValue();
      const options = getOptions();

      const viewText = formatView(value);
      const triggerText =
        formatTrigger(value, options) ||
        config.placeholder ||
        "";

      view.textContent = viewText;
      view.classList.toggle("is-empty", !viewText);

      trigger.textContent = triggerText;
    }

    function restoreCellFocus() {
      requestAnimationFrame(() => {
        const td = wrap.closest("td");

        if (!td || !document.body.contains(td)) return;

        window.tableCellNav?.selectCell?.(td, {
          focus: true,
          scroll: false,
        });
      });
    }

    function closeMenu() {
      isMenuOpen = false;
      menu.hidden = true;
      wrap.classList.remove("is-menu-open");
    }

    function closeEditor(options = {}) {
      closeMenu();

      wrap.classList.remove("is-editing");
      syncView();

      if (options.restoreFocus !== false) {
        restoreCellFocus();
      }
    }

    function getMenuOptions() {
      return Array.from(menu.querySelectorAll(".table-dropdown-option"));
    }

    function getCurrentOptionIndex(options) {
      const active = document.activeElement;
      let index = options.indexOf(active);

      if (index >= 0) {
        return index;
      }

      const currentValue = getValue();

      index = options.findIndex((button) => {
        return button.dataset.value === currentValue;
      });

      return index >= 0 ? index : 0;
    }

    function focusMenuOption(delta = 0) {
      const options = getMenuOptions();
      if (!options.length) return;

      const currentIndex = getCurrentOptionIndex(options);

      const nextIndex = Math.max(
        0,
        Math.min(options.length - 1, currentIndex + delta)
      );

      options[nextIndex].focus({
        preventScroll: true,
      });
    }

    function commitValue(value) {
      const result = config.onCommit?.(String(value ?? ""));

      if (result === false) {
        return false;
      }

      closeEditor();

      return true;
    }

    function createOptionButton(option, currentValue) {
      const button = createElement(
        "button",
        makeClass("table-dropdown-option", config.optionClass)
      );

      button.type = "button";
      button.dataset.value = option.value;
      button.textContent = option.label;
      button.setAttribute("role", "option");

      if (option.value === currentValue) {
        button.classList.add("is-current");
        button.setAttribute("aria-selected", "true");
      }

      button.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      button.addEventListener("click", (e) => {
        stopDropdownEvent(e);
        commitValue(option.value);
      });

      button.addEventListener("keydown", (e) => {
        e.stopPropagation();

        if (e.key === "Escape") {
          e.preventDefault();
          closeEditor();
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusMenuOption(1);
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          focusMenuOption(-1);
          return;
        }

        if (e.key === "Enter" || e.code === "NumpadEnter") {
          e.preventDefault();
          commitValue(option.value);
        }
      });

      return button;
    }

    function createActionButton(action, currentValue) {
      const button = createElement(
        "button",
        makeClass("table-dropdown-action", config.actionClass)
      );

      button.type = "button";
      button.textContent = action.text;

      button.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      button.addEventListener("click", (e) => {
        stopDropdownEvent(e);

        action.onClick?.({
          value: currentValue,
          closeEditor,
          closeMenu,
          restoreCellFocus,
        });
      });

      button.addEventListener("keydown", (e) => {
        e.stopPropagation();

        if (e.key === "Escape") {
          e.preventDefault();
          closeEditor();
        }
      });

      return button;
    }

    function fillMenu() {
      menu.innerHTML = "";

      const currentValue = getValue();
      const options = getOptions();

      options.forEach((option) => {
        menu.appendChild(createOptionButton(option, currentValue));
      });

      const actions =
        typeof config.getActions === "function"
          ? config.getActions(currentValue)
          : [];

      if (!actions?.length) return;

      const actionsWrap = createElement(
        "div",
        makeClass("table-dropdown-actions", config.actionsClass)
      );

      actions.forEach((action) => {
        actionsWrap.appendChild(createActionButton(action, currentValue));
      });

      menu.appendChild(actionsWrap);
    }

    function openMenu() {
      fillMenu();

      isMenuOpen = true;
      menu.hidden = false;
      wrap.classList.add("is-menu-open");

      requestAnimationFrame(() => {
        focusMenuOption(0);
      });
    }

    function toggleMenu() {
      if (isMenuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function openEditor(e) {
      if (e) {
        stopDropdownEvent(e);
      }

      config.onOpen?.();

      closeMenu();
      syncView();

      wrap.classList.add("is-editing");

      requestAnimationFrame(() => {
        trigger.focus({
          preventScroll: true,
        });
      });
    }

    function handleTriggerKeydown(e) {
      e.stopPropagation();

      if (e.key === "Escape") {
        e.preventDefault();
        closeEditor();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();

        if (!isMenuOpen) {
          openMenu();
          return;
        }

        focusMenuOption(e.key === "ArrowDown" ? 1 : -1);
        return;
      }

      if (e.key === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();

        if (!isMenuOpen) {
          openMenu();
          return;
        }

        focusMenuOption(0);
      }
    }

    function handleFocusOut() {
      setTimeout(() => {
        if (!wrap.contains(document.activeElement)) {
          closeEditor({
            restoreFocus: false,
          });
        }
      }, 0);
    }

    wrap.openEditor = openEditor;
    wrap.closeEditor = closeEditor;
    wrap.closeMenu = closeMenu;
    wrap.openMenu = openMenu;

    trigger.addEventListener("click", (e) => {
      stopDropdownEvent(e);
      toggleMenu();
    });

    trigger.addEventListener("keydown", handleTriggerKeydown);

    editor.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    wrap.addEventListener("focusout", handleFocusOut);

    syncView();

    editor.appendChild(trigger);
    editor.appendChild(menu);

    wrap.appendChild(view);
    wrap.appendChild(editor);

    return wrap;
  }

  window.tableDropdownEditor = {
    create: createDropdownControl,
  };
})();