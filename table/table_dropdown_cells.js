// table/table_dropdown_cells.js
// Dropdown-ячейки табличного отображения.
//
// Используется для:
// - Иконка
// - Тег
// - Приоритет
// - Фокус
// - Статус

(function () {
  if (typeof window === "undefined") return;

  function getTagAddValue() {
    return window.TABLE_TAG_ADD_VALUE || "__add_tag__";
  }

  function getTableIconSymbol(value) {
    switch (value) {
      case "circle":
        return "●";

      case "diamond":
        return "◆";

      case "star":
        return "★";

      case "flag":
        return "⚑";

      case "spark":
        return "✦";

      default:
        return "";
    }
  }

  function getTableSelectOptions(node, column) {
    const currentValue = getTableProp(node, column.key);

    const rawOptions =
      typeof column.options === "function"
        ? column.options(node)
        : column.options || [];

    const options = rawOptions.map((option) => ({
      value: String(option.value ?? ""),
      label: String(option.label ?? option.value ?? ""),
    }));

    if (
      currentValue &&
      !options.some((option) => option.value === currentValue)
    ) {
      const addIndex = options.findIndex((option) => {
        return option.value === getTagAddValue();
      });

      const currentOption = {
        value: currentValue,
        label: currentValue,
      };

      if (addIndex >= 0) {
        options.splice(addIndex, 0, currentOption);
      } else {
        options.push(currentOption);
      }
    }

    return options;
  }

  function getTableSelectOptionLabel(node, column, value) {
    const strValue = String(value ?? "");

    const found = getTableSelectOptions(node, column).find((option) => {
      return option.value === strValue;
    });

    return found ? found.label : strValue;
  }

  function getTableSelectLabel(node, column) {
    const value = getTableProp(node, column.key);

    if (!value) return "";

    return getTableSelectOptionLabel(node, column, value);
  }

  function isDropdownActivateHotkey(e) {
    return !!window.tableCellNav?.isCellActivateHotkey?.(e);
  }

  function isNativeDropdownActionKey(e) {
    return (
      e.key === "Enter" ||
      e.code === "NumpadEnter" ||
      e.key === " " ||
      e.code === "Space"
    );
  }

  function stopDropdownActionKey(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }

  function getVisibleFocusableElements(rootEl) {
    return Array.from(
      rootEl.querySelectorAll(
        [
          "button:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      )
    ).filter((el) => {
      if (!el) return false;
      if (el.hidden) return false;
      if (el.closest("[hidden]")) return false;

      const style = window.getComputedStyle(el);

      return (
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    });
  }

  function makeTableDropdownControl(node, column, config = {}) {
    const wrap = document.createElement("div");

    wrap.className = [
      "table-tag-compact-control",
      "table-dropdown-cell-control",
      config.controlClass || "",
    ]
      .filter(Boolean)
      .join(" ");

    const view = document.createElement("div");

    view.className = [
      "table-tag-compact-view",
      config.viewClass || "",
    ]
      .filter(Boolean)
      .join(" ");

    view.title = column.title || "";

    const editor = document.createElement("div");

    editor.className = [
      "table-tag-compact-editor",
      config.editorClass || "",
    ]
      .filter(Boolean)
      .join(" ");

    const trigger = document.createElement("button");

    trigger.type = "button";

    trigger.className = [
      "table-tag-compact-trigger",
      config.triggerClass || "",
    ]
      .filter(Boolean)
      .join(" ");

    const menu = document.createElement("div");

    menu.className = [
      "table-tag-compact-menu",
      config.menuClass || "",
    ]
      .filter(Boolean)
      .join(" ");

    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    let isMenuOpen = false;

    let releaseHorizontalScrollLock = null;

function lockHorizontalScroll() {
  if (releaseHorizontalScrollLock) return;

  const td = wrap.closest("td");

  releaseHorizontalScrollLock =
    window.tableAutoscroll
      ?.lockHorizontalPosition?.(td) || null;
}

function unlockHorizontalScrollSoon() {
  const release = releaseHorizontalScrollLock;

  releaseHorizontalScrollLock = null;

  if (typeof release !== "function") return;

  /*
    Ждём возвращения фокуса на саму ячейку,
    чтобы браузер не прокрутил таблицу в этот момент.
  */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      release();
    });
  });
}

    function getCellFocusableElements() {
      const cell = wrap.closest("td") || wrap;

      return getVisibleFocusableElements(cell);
    }

    function trapTabInsideCell(e) {
      if (e.key !== "Tab") return;

      const items = getCellFocusableElements();

      if (!items.length) {
        e.preventDefault();
        return;
      }

      if (items.length === 1) {
        e.preventDefault();

        items[0].focus({
          preventScroll: true,
        });

        return;
      }

      const active = document.activeElement;
      let index = items.indexOf(active);

      if (index < 0) {
        index = 0;
      }

      const nextIndex = e.shiftKey
        ? (index - 1 + items.length) % items.length
        : (index + 1) % items.length;

      e.preventDefault();

      items[nextIndex].focus({
        preventScroll: true,
      });
    }

    function getCurrentValue() {
      return getTableProp(node, column.key) || "";
    }

    function getOptions() {
      return getTableSelectOptions(node, column);
    }

    function getLabel(value) {
      return getTableSelectOptionLabel(node, column, value);
    }

    function getViewText(value) {
      if (typeof config.formatView === "function") {
        return String(
          config.formatView(value, node, column) || ""
        );
      }

      if (!value) return "";

      return getLabel(value);
    }

    function getTriggerText(value) {
      if (typeof config.formatTrigger === "function") {
        return String(
          config.formatTrigger(value, node, column) || ""
        );
      }

      return getLabel(value) || config.emptyLabel || "нет";
    }

    function syncView() {
      const value = getCurrentValue();

      const viewText = getViewText(value);
      const triggerText = getTriggerText(value);

      view.textContent = viewText;

      view.classList.toggle(
        "is-empty",
        !viewText
      );

      trigger.textContent = triggerText;
    }

    function restoreCellFocus() {
      requestAnimationFrame(() => {
        const td = wrap.closest("td");

        if (!td || !document.body.contains(td)) {
          return;
        }

        window.tableCellNav?.selectCell?.(td, {
          focus: true,
          scroll: false,
        });
      });
    }

function getMenuNavigationItems() {
  return Array.from(
    menu.querySelectorAll(
      [
        ".table-tag-compact-option",
        ".table-tag-compact-action",
      ].join(",")
    )
  ).filter((element) => {
    if (!element) return false;
    if (element.disabled) return false;
    if (element.hidden) return false;
    if (element.closest("[hidden]")) return false;

    const style = window.getComputedStyle(element);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

function getMenuOptions() {
  return Array.from(
    menu.querySelectorAll(
      ".table-tag-compact-option"
    )
  );
}

    /*
      При открытии меню всегда ставим
      фокус на первый пункт списка.

      Текущее сохранённое значение
      на начальную позицию не влияет.
    */
    function focusFirstMenuOption() {
      const firstOption = getMenuOptions()[0];

      if (!firstOption) return;

      firstOption.focus({
        preventScroll: true,
      });
    }

    /*
      Двигаем фокус относительно пункта,
      который реально сфокусирован сейчас.

      Если фокус по какой-либо причине
      ещё не находится внутри меню,
      начальной позицией считаем первый пункт.
    */
function focusMenuItem(delta = 0) {
  const items = getMenuNavigationItems();

  if (!items.length) return;

  const active = document.activeElement;
  let index = items.indexOf(active);

  if (index < 0) {
    index = delta < 0
      ? items.length - 1
      : 0;
  } else {
    index =
      (
        index +
        delta +
        items.length
      ) % items.length;
  }

  items[index].focus({
    preventScroll: true,
  });
}

    function closeMenu() {
      isMenuOpen = false;
      menu.hidden = true;

      wrap.classList.remove(
        "is-menu-open"
      );
    }

    function closeEditor(options = {}) {
      closeMenu();

      wrap.classList.remove(
        "is-editing"
      );

      syncView();

      if (options.restoreFocus !== false) {
        restoreCellFocus();
      }

      unlockHorizontalScrollSoon();
    }

    function commitValue(value) {
      if (typeof config.beforeCommit === "function") {
        const result = config.beforeCommit(value, {
          node,
          column,
          closeEditor,
        });

        if (result === false) {
          return;
        }

        if (typeof result === "string") {
          value = result;
        }
      }

      const oldValue = getCurrentValue();

      if (oldValue !== value) {
        setTableProp(
          node,
          column.key,
          value
        );
      }

      closeEditor();
    }

    function fillMenu() {
      menu.innerHTML = "";

      const currentValue = getCurrentValue();
      const options = getOptions();

      options.forEach((option) => {
        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "table-tag-compact-option";
        btn.dataset.value = option.value;
        btn.textContent = option.label;

        const isSelected =
          option.value === currentValue;

        btn.classList.toggle(
          "is-selected",
          isSelected
        );

        btn.setAttribute(
          "aria-selected",
          isSelected ? "true" : "false"
        );

        btn.setAttribute(
          "role",
          "option"
        );

        /*
          Текущее сохранённое значение
          намеренно не получает:

          - класс is-current;
          - aria-selected="true".

          Поэтому оно не подсвечивается
          отдельным серым фоном и не влияет
          на старт клавиатурной навигации.
        */

        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
        });

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          commitValue(option.value);
        });

        btn.addEventListener("keydown", (e) => {
          e.stopPropagation();

          if (e.key === "Escape") {
            e.preventDefault();
            closeEditor();
            return;
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            focusMenuItem(1);
            return;
          }

          if (e.key === "ArrowUp") {
            e.preventDefault();
            focusMenuItem(-1);
            return;
          }

          if (
            isNativeDropdownActionKey(e) &&
            !isDropdownActivateHotkey(e)
          ) {
            stopDropdownActionKey(e);
            return;
          }

          if (isDropdownActivateHotkey(e)) {
            stopDropdownActionKey(e);
            commitValue(option.value);
          }
        });

        menu.appendChild(btn);
      });

      if (typeof config.renderActions === "function") {
        const actions = config.renderActions({
  node,
  column,
  value: currentValue,
  closeEditor,
  restoreCellFocus,
  focusMenuItem,
});

        if (actions) {
          menu.appendChild(actions);
        }
      }
    }

function openMenu() {
  fillMenu();

  isMenuOpen = true;
  menu.hidden = false;

  wrap.classList.add(
    "is-menu-open"
  );

  /*
    При открытии ни один пункт списка
    не должен быть активным.

    Фокус оставляем на кнопке списка.
    Первое ArrowDown активирует первый пункт.
  */
  requestAnimationFrame(() => {
    trigger.focus({
      preventScroll: true,
    });
  });
}

    function openEditor(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      window.selectedId = node.id;
      window.treeHasFocus = true;

      lockHorizontalScroll();

      closeMenu();
      syncView();

      wrap.classList.add(
        "is-editing"
      );

      requestAnimationFrame(() => {
        trigger.focus({
          preventScroll: true,
        });
      });
    }

    wrap.openEditor = openEditor;

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isMenuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    trigger.addEventListener("keydown", (e) => {
      e.stopPropagation();

      if (e.key === "Escape") {
        e.preventDefault();
        closeEditor();
        return;
      }

      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp"
      ) {
        e.preventDefault();

        if (!isMenuOpen) {
          openMenu();
          return;
        }

        focusMenuItem(
          e.key === "ArrowDown"
            ? 1
            : -1
        );

        return;
      }

      if (
        isNativeDropdownActionKey(e) &&
        !isDropdownActivateHotkey(e)
      ) {
        stopDropdownActionKey(e);
        return;
      }

      if (isDropdownActivateHotkey(e)) {
        stopDropdownActionKey(e);

        if (!isMenuOpen) {
          openMenu();
          return;
        }

        /*
          Если меню уже открыто,
          возвращаем курсор на первый пункт.
        */
        focusFirstMenuOption();
      }
    });

    editor.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    wrap.addEventListener(
      "keydown",
      trapTabInsideCell,
      true
    );

    wrap.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!wrap.contains(document.activeElement)) {
          closeEditor({
            restoreFocus: false,
          });
        }
      }, 0);
    });

    syncView();

    editor.appendChild(trigger);
    editor.appendChild(menu);

    wrap.appendChild(view);
    wrap.appendChild(editor);

    return wrap;
  }

function makeTableTagActions({
  value,
  closeEditor,
  focusMenuItem,
}) {
    if (!isRealTableTag(value)) {
      return null;
    }

    const actions = document.createElement("div");

    actions.className =
      "table-tag-compact-actions";

    const renameBtn =
      document.createElement("button");

    renameBtn.type = "button";
    renameBtn.className =
      "table-tag-compact-action";

    renameBtn.textContent =
      "переименовать";

    const deleteBtn =
      document.createElement("button");

    deleteBtn.type = "button";
    deleteBtn.className =
      "table-tag-compact-action";

    deleteBtn.textContent =
      "удалить";

    [renameBtn, deleteBtn].forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
    });

    renameBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (renameTableTagOption(value)) {
        closeEditor({
          restoreFocus: false,
        });
      }
    });

    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (deleteTableTagOption(value)) {
        closeEditor({
          restoreFocus: false,
        });
      }
    });

    [renameBtn, deleteBtn].forEach((btn) => {
      btn.addEventListener("keydown", (e) => {
        e.stopPropagation();

        if (e.key === "ArrowDown") {
  e.preventDefault();
  e.stopImmediatePropagation?.();

  focusMenuItem?.(1);
  return;
}

if (e.key === "ArrowUp") {
  e.preventDefault();
  e.stopImmediatePropagation?.();

  focusMenuItem?.(-1);
  return;
}

        if (e.key === "Escape") {
          e.preventDefault();
          closeEditor();
          return;
        }

        const isNativeActionKey =
          e.key === "Enter" ||
          e.code === "NumpadEnter" ||
          e.key === " " ||
          e.code === "Space";

        const isActivateHotkey =
          !!window.tableCellNav
            ?.isCellActivateHotkey?.(e);

        if (
          isNativeActionKey &&
          !isActivateHotkey
        ) {
          e.preventDefault();
          e.stopImmediatePropagation?.();
          return;
        }

        if (isActivateHotkey) {
          e.preventDefault();
          e.stopImmediatePropagation?.();
          btn.click();
        }
      });
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    return actions;
  }

  function makeTableIconControl(node, column) {
    return makeTableDropdownControl(node, column, {
      controlClass:
        "table-icon-dropdown-control",

      emptyLabel: "сбросить",

      formatView(value) {
        return getTableIconSymbol(value);
      },

      formatTrigger(value) {
        return (
          getTableSelectOptionLabel(
            node,
            column,
            value
          ) || "сбросить"
        );
      },
    });
  }

  function makeTableTagCompactControl(node, column) {
    return makeTableDropdownControl(node, column, {
      controlClass:
        "table-tag-dropdown-control",

      emptyLabel: "нет",

      formatView(value) {
        return value || "";
      },

      formatTrigger(value) {
        return (
          getTableSelectOptionLabel(
            node,
            column,
            value
          ) || "нет"
        );
      },

      beforeCommit(value) {
        if (value !== getTagAddValue()) {
          return value;
        }

        const newTag = window.prompt(
          "Новый тег",
          ""
        );

        if (!newTag || !newTag.trim()) {
          return false;
        }

        return addTableTagOption(newTag);
      },

renderActions({
  value,
  closeEditor,
  focusMenuItem,
}) {
  return makeTableTagActions({
    value,
    closeEditor,
    focusMenuItem,
  });
},
    });
  }

  function makeTableCompactSelectControl(node, column) {
    return makeTableDropdownControl(node, column, {
      controlClass:
        "table-simple-dropdown-control",

      emptyLabel: "нет",

      formatView(value) {
        if (!value) return "";

        return getTableSelectOptionLabel(
          node,
          column,
          value
        );
      },

      formatTrigger(value) {
        return (
          getTableSelectOptionLabel(
            node,
            column,
            value
          ) || "нет"
        );
      },
    });
  }

  window.tableDropdownCells = {
    getIconSymbol:
      getTableIconSymbol,

    getSelectOptions:
      getTableSelectOptions,

    getSelectLabel:
      getTableSelectLabel,

    getSelectOptionLabel:
      getTableSelectOptionLabel,

    makeDropdownControl:
      makeTableDropdownControl,

    makeIconControl:
      makeTableIconControl,

    makeTagControl:
      makeTableTagCompactControl,

    makeSelectControl:
      makeTableCompactSelectControl,
  };

  window.getTableIconSymbol =
    getTableIconSymbol;

  window.getTableSelectOptions =
    getTableSelectOptions;

  window.getTableSelectLabel =
    getTableSelectLabel;

  window.getTableSelectOptionLabel =
    getTableSelectOptionLabel;

  window.makeTableDropdownControl =
    makeTableDropdownControl;

  window.makeTableIconControl =
    makeTableIconControl;

  window.makeTableTagCompactControl =
    makeTableTagCompactControl;

  window.makeTableCompactSelectControl =
    makeTableCompactSelectControl;
})();