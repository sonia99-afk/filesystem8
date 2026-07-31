// view_tabs.js
// Вкладки представлений редактора.
//
// Поддерживает:
// - восемь стандартных видов;
// - создание дополнительных вкладок;
// - смену типа вкладки;
// - переименование;
// - дублирование;
// - удаление;
// - отдельные горизонтальные и вертикальные виды;
// - сохранение состояния внутри проекта.

(function () {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const VERSION = 1;

const DEFINITIONS = {
  schema: {
    view: "schema",
    orientation: null,
    name: "Структура",

    icon:
      "icons/view_tabs/icon1.png",

    description:
      "Список объектов и уровни через отступы",
  },

  "hierarchy-horizontal": {
    view: "hierarchy",
    orientation: "horizontal",
    name: "Иерархия Горизонтальная",

    icon:
      "icons/view_tabs/icon2.png",

    description:
      "Иерархия слева направо",
  },

  "hierarchy-vertical": {
    view: "hierarchy",
    orientation: "vertical",
    name: "Иерархия Вертикальная",

    icon:
      "icons/view_tabs/icon3.png",

    description:
      "Иерархия сверху вниз",
  },

  "aicycle-horizontal": {
    view: "aicycle",
    orientation: "horizontal",
    name: "Айсикл Горизонтальная",

    icon:
      "icons/view_tabs/icon4.png",

    description:
      "Уровни по колонкам",
  },

  "aicycle-vertical": {
    view: "aicycle",
    orientation: "vertical",
    name: "Айсикл Вертикальная",

    icon:
      "icons/view_tabs/icon5.png",

    description:
      "Уровни по строкам",
  },

  table: {
    view: "table",
    orientation: null,
    name: "Таблица",

    icon:
      "icons/view_tabs/icon6.png",

    description:
      "Объекты в строках и свойства в колонках",
  },

  list: {
    view: "list",
    orientation: null,
    name: "Лист",

    icon:
      "icons/view_tabs/icon7.png",

    description:
      "Итоговый список объектов",
  },

  text: {
    view: "text",
    orientation: null,
    name: "Текст",

    icon:
      "icons/view_tabs/icon8.png",

    description:
      "Иерархия через заголовки и отступы",
  },
};

  const DEFAULT_ORDER = [
    "schema",

    "hierarchy-horizontal",
    "hierarchy-vertical",

    "aicycle-horizontal",
    "aicycle-vertical",

    "table",
    "list",
    "text",
  ];

  let typeMenu = null;
  let contextMenu = null;

  let menuTrigger = null;

  /* =========================================================
     Общие helpers
  ========================================================= */

  function uid() {
    return (
      "view_" +

      Math.random()
        .toString(36)
        .slice(2, 9) +

      "_" +

      Date.now()
        .toString(36)
    );
  }

  function clone(value) {
    if (value == null) {
      return value;
    }

    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function definition(kind) {
    return (
      DEFINITIONS[kind] ||
      DEFINITIONS.schema
    );
  }

  function createViewIcon(
  src,
  className
) {
  const image =
    document.createElement(
      "img"
    );

  image.className =
    className;

  image.src =
    src;

  image.alt =
    "";

  image.draggable =
    false;

  return image;
}

  /*
    Определяет текущий вид приложения
    с учётом ориентации.
  */
  function currentKind() {
    const view =
      String(
        window.currentView ||
        "schema"
      );

    const orientation =
      String(
        window.viewOrientation ||
        "vertical"
      );

    if (
      view === "hierarchy"
    ) {
      return (
        orientation ===
        "horizontal"
          ? "hierarchy-horizontal"
          : "hierarchy-vertical"
      );
    }

    if (
      view === "aicycle"
    ) {
      return (
        orientation ===
        "horizontal"
          ? "aicycle-horizontal"
          : "aicycle-vertical"
      );
    }

    return DEFINITIONS[view]
      ? view
      : "schema";
  }

  /* =========================================================
     Состояние вкладок
  ========================================================= */

  function makeDefaultState() {
    const items =
      DEFAULT_ORDER.map(
        (kind) => {
          return {
            id: uid(),

            kind,

            name:
              definition(kind)
                .name,

            settings: {},
          };
        }
      );

    const active =
      items.find(
        (item) => {
          return (
            item.kind ===
            currentKind()
          );
        }
      ) ||
      items[0];

    return {
      version: VERSION,

      activeId:
        active.id,

      items,
    };
  }

  function normalizeState() {
    let state =
      window.viewTabsState;

    if (
      !state ||
      typeof state !== "object"
    ) {
      state =
        makeDefaultState();

      window.viewTabsState =
        state;

      return state;
    }

    const seen =
      new Set();

    const items = [];

    const source =
      Array.isArray(
        state.items
      )
        ? state.items
        : [];

    source.forEach(
      (raw) => {
        if (
          !raw ||
          typeof raw !== "object"
        ) {
          return;
        }

        const kind =
          DEFINITIONS[raw.kind]
            ? raw.kind
            : "schema";

        let id =
          String(
            raw.id || ""
          ).trim();

        if (
          !id ||
          seen.has(id)
        ) {
          id = uid();
        }

        seen.add(id);

        const name =
          String(
            raw.name || ""
          ).trim() ||
          definition(kind)
            .name;

          items.push({
            id,
            kind,
            name,

            settings:
              raw.settings &&
              typeof raw.settings === "object"
                ? raw.settings
                : {},
          });
      }
    );

    if (!items.length) {
      state =
        makeDefaultState();

      window.viewTabsState =
        state;

      return state;
    }

    let activeId =
      String(
        state.activeId || ""
      );

    const activeExists =
      items.some(
        (item) => {
          return (
            item.id ===
            activeId
          );
        }
      );

    if (!activeExists) {
      const current =
        currentKind();

      activeId =
        items.find(
          (item) => {
            return (
              item.kind ===
              current
            );
          }
        )?.id ||
        items[0].id;
    }

/*
  Важно: не создаём здесь новый объект состояния.

  Другие функции могут уже хранить ссылку
  на window.viewTabsState. Если заменить объект,
  их последующие изменения будут потеряны.
*/
state.version =
  VERSION;

state.activeId =
  activeId;

state.items =
  items;

window.viewTabsState =
  state;

return state;
  }

  function exportState() {
    return clone(
      normalizeState()
    );
  }

  function saveState() {
    window.dispatchEvent(
      new CustomEvent(
        "view-tabs-change",
        {
          detail:
            exportState(),
        }
      )
    );

    window.projectAutosave
      ?.saveNow?.();
  }

  function uniqueName(
    base,
    ignoredId = ""
  ) {
    const state =
      normalizeState();

    const clean =
      String(
        base || "Вид"
      ).trim() ||
      "Вид";

    const names =
      new Set(
        state.items
          .filter(
            (item) => {
              return (
                item.id !==
                ignoredId
              );
            }
          )
          .map(
            (item) => {
              return item.name
                .toLocaleLowerCase(
                  "ru-RU"
                );
            }
          )
      );

    if (
      !names.has(
        clean.toLocaleLowerCase(
          "ru-RU"
        )
      )
    ) {
      return clean;
    }

    let number = 2;

    let result =
      `${clean} ${number}`;

    while (
      names.has(
        result.toLocaleLowerCase(
          "ru-RU"
        )
      )
    ) {
      number += 1;

      result =
        `${clean} ${number}`;
    }

    return result;
  }

  /* =========================================================
     Закрытие и позиционирование меню
  ========================================================= */

  function closeMenus(
    options = {}
  ) {
    typeMenu?.remove();
    contextMenu?.remove();

    typeMenu = null;
    contextMenu = null;

    const trigger =
      menuTrigger;

    menuTrigger = null;

    if (
      options.restoreFocus &&
      trigger?.isConnected
    ) {
      trigger.focus({
        preventScroll: true,
      });
    }
  }

  function placeMenu(
    menu,
    left,
    top
  ) {
    document.body
      .appendChild(menu);

    const gap = 8;

    const rect =
      menu.getBoundingClientRect();

    const nextLeft =
      Math.max(
        gap,

        Math.min(
          left,

          window.innerWidth -
          rect.width -
          gap
        )
      );

    const nextTop =
      Math.max(
        gap,

        Math.min(
          top,

          window.innerHeight -
          rect.height -
          gap
        )
      );

    menu.style.left =
      `${nextLeft}px`;

    menu.style.top =
      `${nextTop}px`;
  }

  /* =========================================================
     Возврат фокуса редактору
  ========================================================= */

  function restoreEditorFocus() {
    requestAnimationFrame(
      () => {
        requestAnimationFrame(
          () => {
            if (
              window.currentView ===
              "table"
            ) {
              const td =
                window
                  .tableCellNav
                  ?.getSelectedCell?.();

              if (td) {
                window
                  .tableCellInnerMode
                  ?.clear?.();

                window
                  .tableCellNav
                  ?.selectCell?.(
                    td,
                    {
                      focus: true,
                      scroll: false,
                    }
                  );
              }

              return;
            }

            window.treeHasFocus =
              true;

            window
              .focusSelectedRow
              ?.();
          }
        );
      }
    );
  }

  /* =========================================================
     Открытие вкладки
  ========================================================= */

  async function openItem(
    itemId,
    options = {}
  ) {
    const state =
      normalizeState();

    const item =
      state.items.find(
        (entry) => {
          return (
            entry.id ===
            itemId
          );
        }
      );

    if (!item) {
      return false;
    }

    closeMenus();

    state.activeId =
      item.id;

    const def =
      definition(
        item.kind
      );

    /*
      Ориентацию устанавливаем
      до вызова роутера.
    */
    if (def.orientation) {
      window.viewOrientation =
        def.orientation;
    }

    window
      .tableCellInnerMode
      ?.clear?.();

    window.treeHasFocus =
      true;

    if (
      window.appRouter?.open
    ) {
      await window
        .appRouter
        .open(def.view);
    } else {
      window.currentView =
        def.view;

      window.render?.();

      window
        .syncViewButtons
        ?.();
    }

    /*
      При наличии нескольких вкладок
      одного типа сохраняем конкретную
      выбранную вкладку.
    */
    normalizeState()
      .activeId =
        item.id;

    renderTabs();
    saveState();

    if (
      options.restoreFocus !==
      false
    ) {
      restoreEditorFocus();
    }

    return true;
  }

  /* =========================================================
     Изменение типа вкладки
  ========================================================= */

  function changeKind(
    itemId,
    kind
  ) {
    if (!DEFINITIONS[kind]) {
      return;
    }

    const state =
      normalizeState();

    const item =
      state.items.find(
        (entry) => {
          return (
            entry.id ===
            itemId
          );
        }
      );

    if (!item) {
      return;
    }

    item.kind =
      kind;

    /*
      При смене типа возвращаем
      системное название.

      После этого его можно снова
      переименовать через ПКМ.
    */
    item.name =
      definition(kind)
        .name;

        item.settings =
  window.viewSettings
    ?.createDefaultSettings
    ?.(kind) || {};

    state.activeId =
      item.id;

    openItem(item.id);
  }

  /* =========================================================
     Создание вкладки
  ========================================================= */

  function addItem(kind) {
    if (!DEFINITIONS[kind]) {
      return;
    }

    const state =
      normalizeState();

    const def =
      definition(kind);

  const item = {
  id: uid(),

  kind,

  name:
    uniqueName(
      def.name
    ),

  settings:
    window.viewSettings
      ?.createDefaultSettings
      ?.(kind) || {},
};

    state.items.push(item);

    state.activeId =
      item.id;

    openItem(item.id);
  }

  /* =========================================================
     Переименование
  ========================================================= */

  function renameItem(
    itemId
  ) {
    const state =
      normalizeState();

    const item =
      state.items.find(
        (entry) => {
          return (
            entry.id ===
            itemId
          );
        }
      );

    if (!item) {
      return;
    }

    closeMenus();

    const next =
      window.prompt(
        "Новое название вида",
        item.name
      );

    if (
      next !== null &&
      String(next).trim()
    ) {
      item.name =
        String(next)
          .trim();

      saveState();
    }

    renderTabs();
    restoreEditorFocus();
  }

  /* =========================================================
     Дублирование
  ========================================================= */

async function duplicateItem(
  itemId
) {
  const state =
    normalizeState();

  const index =
    state.items.findIndex(
      (entry) => {
        return (
          entry.id ===
          itemId
        );
      }
    );

  if (index < 0) {
    return false;
  }

  const source =
    state.items[index];

const copy = {
  id: uid(),

  kind:
    source.kind,

  name:
    uniqueName(
      `${source.name} копия`
    ),

  settings:
    clone(
      source.settings || {}
    ),
};

  /*
    Копия появляется сразу
    после исходной вкладки.
  */
  state.items.splice(
    index + 1,
    0,
    copy
  );

  /*
    Новая вкладка становится активной.
  */
  state.activeId =
    copy.id;

  /*
    Дожидаемся полного открытия вида
    и повторного рендера вкладок.
  */
  await openItem(
    copy.id,
    {
      restoreFocus: false,
    }
  );

  /*
    После рендера прокручиваем строку
    к созданной вкладке.

    Иначе при большом количестве видов
    копия может оказаться за правой границей.
  */
  requestAnimationFrame(
    () => {
      const copyTab =
        document.querySelector(
          `.view-tab-shell[data-view-tab-id="${copy.id}"]`
        );

      copyTab?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });

      restoreEditorFocus();
    }
  );

  return true;
}

  /* =========================================================
     Удаление
  ========================================================= */

  function deleteItem(
    itemId
  ) {
    const state =
      normalizeState();

    /*
      Последнюю вкладку удалить нельзя.
    */
    if (
      state.items.length <= 1
    ) {
      return;
    }

    const index =
      state.items.findIndex(
        (entry) => {
          return (
            entry.id ===
            itemId
          );
        }
      );

    if (index < 0) {
      return;
    }

    const wasActive =
      state.activeId ===
      itemId;

    state.items.splice(
      index,
      1
    );

    /*
      Удалили неактивную вкладку:
      текущий вид не переключаем.
    */
    if (!wasActive) {
      closeMenus();
      renderTabs();
      saveState();
      restoreEditorFocus();

      return;
    }

    /*
      После удаления активной вкладки
      открываем соседнюю.
    */
    const next =
      state.items[
        Math.min(
          index,
          state.items.length - 1
        )
      ] ||
      state.items[0];

    state.activeId =
      next.id;

    openItem(next.id);
  }

  /* =========================================================
     Элемент меню выбора типа
  ========================================================= */

  function makeTypeItem(
    kind,
    mode,
    itemId,
    currentItemKind
  ) {
    const def =
      definition(kind);

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "view-type-menu-item";

    if (
      mode === "change" &&
      kind === currentItemKind
    ) {
      button.classList.add(
        "is-current"
      );
    }

const icon =
  document.createElement(
    "span"
  );

icon.className =
  "view-type-menu-icon";

icon.appendChild(
  createViewIcon(
    def.icon,
    "view-type-menu-icon-img"
  )
);

    const text =
      document.createElement(
        "span"
      );

    text.className =
      "view-type-menu-text";

    const title =
      document.createElement(
        "span"
      );

    title.className =
      "view-type-menu-title";

    title.textContent =
      def.name;

    const description =
      document.createElement(
        "span"
      );

    description.className =
      "view-type-menu-description";

    description.textContent =
      def.description;

    text.append(
      title,
      description
    );

    button.append(
      icon,
      text
    );

    if (
      mode === "change" &&
      kind === currentItemKind
    ) {
      const check =
        document.createElement(
          "span"
        );

      check.className =
        "view-type-menu-check";

      check.textContent =
        "✓";

      button.appendChild(
        check
      );
    }

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (mode === "add") {
          addItem(kind);
        } else {
          changeKind(
            itemId,
            kind
          );
        }
      }
    );

    return button;
  }

  /* =========================================================
     Меню выбора типа
  ========================================================= */

  function openTypeMenu(
    trigger,
    mode,
    itemId = ""
  ) {
    const state =
      normalizeState();

    const currentItem =
      state.items.find(
        (item) => {
          return (
            item.id ===
            itemId
          );
        }
      );

    closeMenus();

    menuTrigger =
      trigger;

    typeMenu =
      document.createElement(
        "div"
      );

    typeMenu.className =
      "view-type-menu";

    typeMenu.setAttribute(
      "role",
      "menu"
    );

    DEFAULT_ORDER.forEach(
      (kind) => {
        typeMenu.appendChild(
          makeTypeItem(
            kind,
            mode,
            itemId,
            currentItem?.kind || ""
          )
        );
      }
    );

    const rect =
      trigger
        .getBoundingClientRect();

    placeMenu(
      typeMenu,
      rect.left,
      rect.bottom + 6
    );
  }

/* =========================================================
   Кнопка контекстного меню
========================================================= */

function contextButton(
  label,
  callback,
  options = {}
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "view-tab-context-item";

  button.textContent =
    label;

  if (options.danger) {
    button.classList.add(
      "is-danger"
    );
  }

  button.disabled =
    options.disabled === true;

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (button.disabled) {
        return;
      }

      closeMenus();

      callback();
    }
  );

  return button;
}

/* =========================================================
   Контекстное меню вкладки
========================================================= */

function openContextMenu(
  itemId,
  trigger,
  x,
  y
) {
  const state =
    normalizeState();

  const item =
    state.items.find(
      (entry) =>
        entry.id === itemId
    );

  if (!item) {
    return;
  }

  closeMenus();

  menuTrigger =
    trigger;

  const menu =
    document.createElement(
      "div"
    );

  menu.className =
    "view-tab-context-menu";

  menu.setAttribute(
    "role",
    "menu"
  );

  const renameButton =
    contextButton(
      "Переименовать",
      () => {
        renameItem(
          item.id
        );
      }
    );

  const duplicateButton =
    contextButton(
      "Дублировать вид",
      () => {
        duplicateItem(
          item.id
        );
      }
    );

  const deleteButton =
    contextButton(
      "Удалить вид",
      () => {
        deleteItem(
          item.id
        );
      },
      {
        danger: true,

        disabled:
          state.items.length <= 1,
      }
    );

  menu.appendChild(
    renameButton
  );

  menu.appendChild(
    duplicateButton
  );

  menu.appendChild(
    deleteButton
  );

  contextMenu =
    menu;

  placeMenu(
    contextMenu,
    x,
    y
  );
}

  /* =========================================================
     Рендер строки вкладок
  ========================================================= */

  function renderTabs() {
    const list =
      document.getElementById(
        "viewTabsList"
      );

    if (!list) {
      return;
    }

    const state =
      normalizeState();

    list.innerHTML = "";

    state.items.forEach(
      (item) => {
        const def =
          definition(
            item.kind
          );

        const shell =
          document.createElement(
            "div"
          );

        shell.className =
          "view-tab-shell";

        shell.dataset.viewTabId =
          item.id;

        if (
          item.id ===
          state.activeId
        ) {
          shell.classList.add(
            "is-active"
          );
        }

/*
  Эмблема теперь только декоративная.

  Она больше не является отдельной кнопкой
  и не открывает меню смены типа вида.
*/
const emblem =
  document.createElement(
    "span"
  );

emblem.className =
  "view-tab-emblem";

emblem.setAttribute(
  "aria-hidden",
  "true"
);

emblem.appendChild(
  createViewIcon(
    def.icon,
    "view-tab-emblem-img"
  )
);

/*
  Название остаётся настоящей кнопкой,
  чтобы вкладка поддерживала фокус
  и клавиатурное взаимодействие.
*/
const label =
  document.createElement(
    "button"
  );

label.type =
  "button";

label.className =
  "view-tab-label";

label.textContent =
  item.name;

label.title =
  `${item.name} — ${def.description}`;

label.setAttribute(
  "role",
  "tab"
);

label.setAttribute(
  "aria-selected",

  item.id === state.activeId
    ? "true"
    : "false"
);

/*
  Обычный ЛКМ по любой части вкладки,
  включая эмблему, открывает вид.
*/
shell.addEventListener(
  "click",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    openItem(
      item.id
    );
  }
);

/*
  ПКМ по любой части вкладки
  открывает контекстное меню.
*/
shell.addEventListener(
  "contextmenu",
  (event) => {
    event.preventDefault();
    event.stopPropagation();

    openContextMenu(
      item.id,
      label,
      event.clientX,
      event.clientY
    );
  }
);

shell.append(
  emblem,
  label
);

        list.appendChild(
          shell
        );
      }
    );
  }

  /* =========================================================
     Синхронизация после работы роутера
  ========================================================= */

  function syncFromCurrentView() {
    const state =
      normalizeState();

    const active =
      state.items.find(
        (item) => {
          return (
            item.id ===
            state.activeId
          );
        }
      );

    const kind =
      currentKind();

    /*
      Если активная вкладка уже имеет
      текущий тип, сохраняем её id.

      Это важно для дубликатов
      одного и того же вида.
    */
    if (
      !active ||
      active.kind !== kind
    ) {
      const match =
        state.items.find(
          (item) => {
            return (
              item.kind === kind
            );
          }
        );

      if (match) {
        state.activeId =
          match.id;
      }
    }

    renderTabs();
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function init() {
    normalizeState();

    const addButton =
      document.getElementById(
        "addViewTabBtn"
      );

    if (
      addButton &&
      addButton.dataset.bound !==
        "1"
    ) {
      addButton.dataset.bound =
        "1";

      addButton.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          openTypeMenu(
            addButton,
            "add"
          );
        }
      );
    }

    if (
      !document
        .__viewTabsBound
    ) {
      document
        .__viewTabsBound =
          true;

      /*
        Клик вне меню.
      */
      document.addEventListener(
        "pointerdown",
        (event) => {
          if (
            typeMenu?.contains(
              event.target
            ) ||

            contextMenu?.contains(
              event.target
            )
          ) {
            return;
          }

          closeMenus();
        },
        true
      );

      /*
        Escape закрывает меню
        и возвращает фокус кнопке.
      */
      document.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key !==
            "Escape"
          ) {
            return;
          }

          if (
            !typeMenu &&
            !contextMenu
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          closeMenus({
            restoreFocus: true,
          });
        },
        true
      );

      window.addEventListener(
        "resize",
        () => {
          closeMenus();
        }
      );

      window.addEventListener(
        "scroll",
        () => {
          closeMenus();
        },
        true
      );
    }

    syncFromCurrentView();
    saveState();
  }

  window.viewTabs = {
    init,

    render:
      renderTabs,

    normalizeState,

    exportState,

    syncFromCurrentView,

    open:
      openItem,

    add:
      addItem,

    rename:
      renameItem,

    duplicate:
      duplicateItem,

    delete:
      deleteItem,

    changeKind,
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }
})();