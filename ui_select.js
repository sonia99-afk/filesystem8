// ui_select.js
// Визуальная оболочка для интерфейсных <select>.
//
// Настоящий select остаётся источником данных.
// При выборе нового пункта компонент изменяет
// select.value и отправляет обычное событие change.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  const instances = new WeakMap();
  const openedInstances = new Set();

  /* =========================================================
     Иконки видов
  ========================================================= */

  const VIEW_ICONS = {
    schema:
      "icons/view_tabs/icon1.png",

    "hierarchy-horizontal":
      "icons/view_tabs/icon2.png",

    "hierarchy-vertical":
      "icons/view_tabs/icon3.png",

    "aicycle-horizontal":
      "icons/view_tabs/icon4.png",

    "aicycle-vertical":
      "icons/view_tabs/icon5.png",

    table:
      "icons/view_tabs/icon6.png",

    list:
      "icons/view_tabs/icon7.png",

    text:
      "icons/view_tabs/icon8.png",
  };

  function getViewItemByOption(
    option
  ) {
    const itemId =
      String(
        option?.value || ""
      );

    const items =
      window.viewTabsState?.items;

    if (!Array.isArray(items)) {
      return null;
    }

    return (
      items.find(
        (item) =>
          item?.id === itemId
      ) || null
    );
  }

  function getOptionIcon(
    option
  ) {
    const explicitIcon =
      String(
        option?.dataset?.icon || ""
      ).trim();

    if (explicitIcon) {
      return explicitIcon;
    }

    const item =
      getViewItemByOption(option);

    return (
      VIEW_ICONS[item?.kind] || ""
    );
  }

  function createIcon(
    src,
    className
  ) {
    const holder =
      document.createElement("span");

    holder.className =
      className;

    holder.setAttribute(
      "aria-hidden",
      "true"
    );

    if (src) {
      const image =
        document.createElement("img");

      image.src = src;
      image.alt = "";
      image.draggable = false;

      holder.appendChild(image);
    }

    return holder;
  }

  /* =========================================================
     Общие операции
  ========================================================= */

  function closeAll(
    except = null
  ) {
    Array.from(
      openedInstances
    ).forEach((instance) => {
      if (instance !== except) {
        instance.close();
      }
    });
  }

  function selectedOption(
    select
  ) {
    return (
      select.selectedOptions?.[0] ||
      select.options?.[
        select.selectedIndex
      ] ||
      null
    );
  }

  /* =========================================================
     Создание одного компонента
  ========================================================= */

  function enhance(
    select
  ) {
    if (
      !select ||
      select.tagName !== "SELECT"
    ) {
      return null;
    }

    const existing =
      instances.get(select);

    if (existing) {
      existing.refresh();
      return existing;
    }

    /* -------------------------
       Корневой контейнер
    ------------------------- */

    const root =
      document.createElement("div");

    root.className =
      "ui-select";

    select.parentNode.insertBefore(
      root,
      select
    );

    root.appendChild(select);

    select.classList.add(
      "ui-select__native"
    );

    /* -------------------------
       Кнопка открытия
    ------------------------- */

    const trigger =
      document.createElement("button");

    trigger.type = "button";

    trigger.className =
      "ui-select__trigger";

    trigger.setAttribute(
      "role",
      "combobox"
    );

    trigger.setAttribute(
      "aria-haspopup",
      "listbox"
    );

    trigger.setAttribute(
      "aria-expanded",
      "false"
    );

    const triggerIcon =
      createIcon(
        "",
        "ui-select__trigger-icon"
      );

    const triggerLabel =
      document.createElement("span");

    triggerLabel.className =
      "ui-select__trigger-label";

    const chevron =
      document.createElement("span");

    chevron.className =
      "ui-select__chevron";

    chevron.setAttribute(
      "aria-hidden",
      "true"
    );

    trigger.append(
      triggerIcon,
      triggerLabel,
      chevron
    );

    root.appendChild(trigger);

    /* -------------------------
       Раскрывающееся меню
    ------------------------- */

    const menu =
      document.createElement("div");

    menu.className =
      "ui-dropdown-menu ui-select__menu";

    menu.setAttribute(
      "role",
      "listbox"
    );

    menu.hidden = true;

    document.body.appendChild(menu);

    let optionButtons = [];

    /* =======================================================
       Отображение выбранного значения
    ======================================================= */

    function syncTrigger() {
      const option =
        selectedOption(select);

      triggerLabel.textContent =
        option?.textContent?.trim() ||
        "Выберите значение";

      triggerIcon.replaceChildren();

      const iconSrc =
        getOptionIcon(option);

      if (iconSrc) {
        const image =
          document.createElement("img");

        image.src = iconSrc;
        image.alt = "";
        image.draggable = false;

        triggerIcon.appendChild(image);
      }

      trigger.disabled =
        !!select.disabled;

      root.classList.toggle(
        "is-disabled",
        !!select.disabled
      );
    }

    /* =======================================================
       Создание пунктов
    ======================================================= */

    function buildMenu() {
      menu.innerHTML = "";
      optionButtons = [];

      Array.from(
        select.options
      ).forEach((option) => {
        const button =
          document.createElement(
            "button"
          );

        button.type = "button";

        button.className =
          "ui-dropdown-item ui-select__option";

        button.setAttribute(
          "role",
          "option"
        );

        button.dataset.value =
          option.value;

        button.disabled =
          !!option.disabled;

        const isSelected =
          option ===
          selectedOption(select);

        button.setAttribute(
          "aria-selected",
          isSelected
            ? "true"
            : "false"
        );

        if (isSelected) {
          button.classList.add(
            "is-active"
          );
        }

        const icon =
          createIcon(
            getOptionIcon(option),
            "ui-select__option-icon"
          );

        const label =
          document.createElement(
            "span"
          );

        label.className =
          "ui-select__option-label";

        label.textContent =
          option.textContent.trim();

        const check =
          document.createElement(
            "span"
          );

        check.className =
          "ui-select__option-check";

        check.setAttribute(
          "aria-hidden",
          "true"
        );

        check.textContent =
          isSelected ? "✓" : "";

        button.append(
          icon,
          label,
          check
        );

        button.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (button.disabled) {
              return;
            }

            select.value =
              option.value;

            select.dispatchEvent(
              new Event(
                "change",
                {
                  bubbles: true,
                }
              )
            );

            syncTrigger();
            buildMenu();
            close();

            trigger.focus({
              preventScroll: true,
            });
          }
        );

        menu.appendChild(button);

        optionButtons.push(button);
      });
    }

    /* =======================================================
       Позиционирование меню
    ======================================================= */

    function placeMenu() {
      if (menu.hidden) {
        return;
      }

      const rect =
        trigger.getBoundingClientRect();

      const gap = 8;

      menu.style.width =
        `${rect.width}px`;

      let left =
        rect.left;

      let top =
        rect.bottom + gap;

      const menuRect =
        menu.getBoundingClientRect();

      if (
        top +
        menuRect.height >
        window.innerHeight - gap
      ) {
        top =
          rect.top -
          menuRect.height -
          gap;
      }

      left =
        Math.max(
          gap,
          Math.min(
            left,
            window.innerWidth -
              menuRect.width -
              gap
          )
        );

      top =
        Math.max(
          gap,
          Math.min(
            top,
            window.innerHeight -
              menuRect.height -
              gap
          )
        );

      menu.style.left =
        `${left}px`;

      menu.style.top =
        `${top}px`;
    }

    /* =======================================================
       Открытие и закрытие
    ======================================================= */

    function open() {
      if (select.disabled) {
        return;
      }

      closeAll(api);

      buildMenu();

      menu.hidden = false;

      root.classList.add(
        "is-open"
      );

      trigger.setAttribute(
        "aria-expanded",
        "true"
      );

      openedInstances.add(api);

      requestAnimationFrame(
        placeMenu
      );
    }

    function close() {
      menu.hidden = true;

      root.classList.remove(
        "is-open"
      );

      trigger.setAttribute(
        "aria-expanded",
        "false"
      );

      openedInstances.delete(api);
    }

    function toggle() {
      if (menu.hidden) {
        open();
      } else {
        close();
      }
    }

    function focusSelectedOption() {
      const selectedButton =
        optionButtons.find(
          (button) =>
            button.getAttribute(
              "aria-selected"
            ) === "true"
        );

      (
        selectedButton ||
        optionButtons[0]
      )?.focus({
        preventScroll: true,
      });
    }

    /* =======================================================
       События
    ======================================================= */

    trigger.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        toggle();
      }
    );

    trigger.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp"
        ) {
          event.preventDefault();

          open();

          requestAnimationFrame(
            focusSelectedOption
          );

          return;
        }

        if (event.key === "Escape") {
          close();
        }
      }
    );

    menu.addEventListener(
      "keydown",
      (event) => {
        const enabledButtons =
          optionButtons.filter(
            (button) =>
              !button.disabled
          );

        const currentIndex =
          enabledButtons.indexOf(
            document.activeElement
          );

        if (
          event.key === "ArrowDown" ||
          event.key === "ArrowUp"
        ) {
          event.preventDefault();

          const direction =
            event.key === "ArrowDown"
              ? 1
              : -1;

          const nextIndex =
            currentIndex < 0
              ? 0
              : (
                  currentIndex +
                  direction +
                  enabledButtons.length
                ) %
                enabledButtons.length;

          enabledButtons[
            nextIndex
          ]?.focus({
            preventScroll: true,
          });

          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();

          close();

          trigger.focus({
            preventScroll: true,
          });
        }
      }
    );

    select.addEventListener(
      "change",
      () => {
        syncTrigger();
        buildMenu();
      }
    );

    const observer =
      new MutationObserver(
        () => {
          syncTrigger();
          buildMenu();

          if (!menu.hidden) {
            placeMenu();
          }
        }
      );

    observer.observe(
      select,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "disabled",
          "selected",
          "label",
          "data-icon",
        ],
      }
    );

    /* =======================================================
       Публичный экземпляр
    ======================================================= */

    const api = {
      root,
      select,
      trigger,
      menu,

      open,
      close,
      placeMenu,

      refresh() {
        syncTrigger();
        buildMenu();

        if (!menu.hidden) {
          placeMenu();
        }
      },

      destroy() {
        close();

        observer.disconnect();

        menu.remove();

        select.classList.remove(
          "ui-select__native"
        );

        root.replaceWith(select);

        instances.delete(select);
      },
    };

    instances.set(
      select,
      api
    );

    syncTrigger();
    buildMenu();

    return api;
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init(
    scope = document
  ) {
    scope
      .querySelectorAll(
        "select[data-ui-select]"
      )
      .forEach(enhance);
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      Array.from(
        openedInstances
      ).forEach((instance) => {
        if (
          instance.root.contains(
            event.target
          ) ||
          instance.menu.contains(
            event.target
          )
        ) {
          return;
        }

        instance.close();
      });
    }
  );

  window.addEventListener(
    "resize",
    () => {
      openedInstances.forEach(
        (instance) =>
          instance.placeMenu()
      );
    }
  );

  window.addEventListener(
    "scroll",
    () => {
      openedInstances.forEach(
        (instance) =>
          instance.placeMenu()
      );
    },
    true
  );

  window.addEventListener(
    "view-tabs-change",
    () => {
      document
        .querySelectorAll(
          "select[data-ui-select]"
        )
        .forEach((select) => {
          instances
            .get(select)
            ?.refresh();
        });
    }
  );

  window.uiSelect = {
    init,

    enhance,

    refresh(select) {
      return enhance(select);
    },

    closeAll,
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => init()
    );
  } else {
    init();
  }
})();