// view_settings.js
// Правая панель настройки выбранной вкладки вида.

(function () {
  if (typeof window === "undefined") {
    return;
  }

 const SETTINGS_VERSION = 2;

const DEFAULT_LEVEL_HEADERS_MODE =
  "header-row";

  /* =========================================================
     Каталог дополнительных свойств
  ========================================================= */

  const PROPERTIES_BEFORE_NAME = [
    {
      key: "icon",
      name: "Иконка",
      icon: "◆",
    },

    {
      key: "cover",
      name: "Обложка",
      icon: "▣",
    },
  ];

  const PROPERTIES_AFTER_DESCRIPTION = [
    {
      key: "text",
      name: "Текст",
      icon: "¶",
    },

    {
      key: "startDate",
      name: "Дата начала",
      icon: "◷",
    },

    {
      key: "startTime",
      name: "Время начала",
      icon: "◴",
    },

    {
      key: "endDate",
      name: "Дата завершения",
      icon: "◷",
    },

    {
      key: "endTime",
      name: "Время завершения",
      icon: "◴",
    },

    {
      key: "priority",
      name: "Приоритет",
      icon: "⚑",
    },

    {
      key: "focus",
      name: "Фокус",
      icon: "◎",
    },

    {
      key: "status",
      name: "Статус",
      icon: "●",
    },

    {
      key: "tag",
      name: "Тег",
      icon: "#",
    },

    {
      key: "extraImage",
      name: "Доп. изображения",
      icon: "▧",
    },

    {
      key: "file",
      name: "Файл",
      icon: "□",
    },

    {
      key: "timeCounter",
      name: "Счётчик времени",
      icon: "▶",
    },

    {
      key: "timerDuration",
      name: "Время таймера",
      icon: "⏱",
    },

    {
      key: "timerRemaining",
      name: "Оставшееся время",
      icon: "◉",
    },
  ];

  const ALL_PROPERTY_KEYS = [
    "marks",
    "icon",
    "cover",
    "name",
    "ordinals",
    "captions",

    ...PROPERTIES_AFTER_DESCRIPTION.map(
      (property) => property.key
    ),
  ];

  /*
    Во всех видах, кроме таблицы,
    можно переключать только:

    - Метку;
    - Нумерацию;
    - Описание.

    Название включено всегда.
  */

  const COMMON_EDITABLE_KEYS = new Set([
    "marks",
    "ordinals",
    "captions",
  ]);

  const OLD_TOGGLE_TO_PROPERTY = {
    toggleOrdinals: "ordinals",
    toggleCaptions: "captions",
    toggleMarks: "marks",
  };

  /* =========================================================
     DOM helpers
  ========================================================= */

  function panel() {
    return document.getElementById(
      "viewSettingsPanel"
    );
  }

  function openButton() {
    return document.getElementById(
      "viewSettingsOpenBtn"
    );
  }

  function closeButton() {
    return document.getElementById(
      "viewSettingsCloseBtn"
    );
  }

  function viewSelect() {
    return document.getElementById(
      "viewSettingsViewSelect"
    );
  }

  function propertiesCount() {
    return document.getElementById(
      "viewSettingsPropertiesCount"
    );
  }

  function tabsState() {
    return (
      window.viewTabs
        ?.normalizeState?.() ||

      window.viewTabsState ||

      null
    );
  }

  function activeItem() {
    const state = tabsState();

    if (
      !state ||
      !Array.isArray(state.items)
    ) {
      return null;
    }

    return (
      state.items.find(
        (item) =>
          item.id === state.activeId
      ) ||

      state.items[0] ||

      null
    );
  }

  function isTableItem(item) {
    return item?.kind === "table";
  }

  function isPropertyAvailable(
    item,
    key
  ) {
    if (!item || !key) {
      return false;
    }

    if (key === "name") {
      return true;
    }

    if (isTableItem(item)) {
      return true;
    }

    return COMMON_EDITABLE_KEYS.has(
      key
    );
  }

  /* =========================================================
     Чтение старого глобального состояния
  ========================================================= */

  function readCurrentCommonProperty(
    key
  ) {
    if (key === "marks") {
      return !!window
        .markProperty
        ?.getState?.()
        ?.showMarks;
    }

    if (key === "ordinals") {
      return !!window.showOrdinals;
    }

    if (key === "captions") {
      return !!window.showCaptions;
    }

    return false;
  }

  function readCurrentLevelHeaders() {
    return !!window
      .levelHeaders
      ?.isEnabled?.();
  }

  /* =========================================================
     Настройки конкретной вкладки
  ========================================================= */

function createDefaultSettings(
  kind
) {
  const isTable =
    kind === "table";

  const properties = {};

  ALL_PROPERTY_KEYS.forEach(
    (key) => {
      /*
        Название включено всегда
        и не может быть выключено.
      */

      if (key === "name") {
        properties[key] = true;
        return;
      }

      /*
        В таблице доступны все свойства,
        поэтому новая таблица создаётся
        со всеми включёнными свойствами.
      */

      if (isTable) {
        properties[key] = true;
        return;
      }

      /*
        В остальных отображениях включаем
        все доступные для них свойства:

        - Метка;
        - Нумерация;
        - Описание.

        Недоступные табличные свойства
        остаются выключенными.
      */

      properties[key] =
        COMMON_EDITABLE_KEYS.has(
          key
        );
    }
  );

  return {
    version:
      SETTINGS_VERSION,

    properties,

    /*
      Параметры отметки по умолчанию.

      Сама отметка включена, но отмеченные
      объекты не скрываются и не зачёркиваются.
    */

    propertyOptions: {
      marks: {
        hideMarked: false,
        strikeMarked: false,
      },
    },

    /*
      Заголовки уровней тоже относятся
      к доступным настройкам интерфейса,
      поэтому включены в новом виде.
    */

    interface: {
      levelHeaders: true,

      levelHeadersMode:
        DEFAULT_LEVEL_HEADERS_MODE,
    },
  };
}

  function hasStoredSettings(
    item
  ) {
    return !!(
      item?.settings &&
      typeof item.settings ===
        "object" &&

      item.settings.properties &&
      typeof item.settings.properties ===
        "object" &&

      item.settings.interface &&
      typeof item.settings.interface ===
        "object"
    );
  }

  function isCurrentActiveItem(
    item
  ) {
    return !!(
      item?.id &&
      item.id ===
        window.viewTabsState
          ?.activeId
    );
  }

  function ensureItemSettings(
    item
  ) {
    if (!item) {
      return null;
    }

    /*
      Старая вкладка, у которой ещё
      не было полноценного settings.
    */

    if (!hasStoredSettings(item)) {
      const settings =
        createDefaultSettings(
          item.kind
        );

      /*
        Только активная вкладка получает
        старое текущее глобальное состояние.

        Остальные вкладки не копируют его
        и остаются независимыми.
      */

      if (
        isCurrentActiveItem(item)
      ) {
        settings
          .properties
          .marks =
            readCurrentCommonProperty(
              "marks"
            );

        settings
          .properties
          .ordinals =
            readCurrentCommonProperty(
              "ordinals"
            );

        settings
          .properties
          .captions =
            readCurrentCommonProperty(
              "captions"
            );

        settings
          .interface
          .levelHeaders =
            readCurrentLevelHeaders();
      }

      item.settings =
        settings;
    }

    const defaults =
      createDefaultSettings(
        item.kind
      );

    item.settings.version =
      SETTINGS_VERSION;

    if (
      !item.settings.properties ||
      typeof item.settings.properties !==
        "object"
    ) {
      item.settings.properties = {};
    }

    if (
      !item.settings.interface ||
      typeof item.settings.interface !==
        "object"
    ) {
      item.settings.interface = {};
    }

    /*
  Настройки шестерёнки «Метка».
*/

if (
  !item.settings.propertyOptions ||
  typeof item.settings.propertyOptions !==
    "object"
) {
  item.settings.propertyOptions = {};
}

if (
  !item.settings
    .propertyOptions
    .marks ||

  typeof item.settings
    .propertyOptions
    .marks !== "object"
) {
  item.settings
    .propertyOptions
    .marks = {};
}

const markOptions =
  item.settings
    .propertyOptions
    .marks;

const currentMarkState =
  isCurrentActiveItem(item)
    ? window.markProperty
        ?.getState?.()
    : null;

if (
  typeof markOptions
    .hideMarked !== "boolean"
) {
  markOptions.hideMarked =
    currentMarkState
      ? !!currentMarkState.hideMarked
      : false;
}

if (
  typeof markOptions
    .strikeMarked !== "boolean"
) {
  markOptions.strikeMarked =
    currentMarkState
      ? !!currentMarkState.strikeMarked
      : false;
}

/*
  Режим заголовков уровней.
*/

const availableLevelModes =
  Object.values(
    window.levelHeaders
      ?.MODES || {}
  );

const currentLevelMode =
  isCurrentActiveItem(item)
    ? window.levelHeaders
        ?.getMode?.()
    : null;

if (
  !availableLevelModes.includes(
    item.settings
      .interface
      .levelHeadersMode
  )
) {
  item.settings
    .interface
    .levelHeadersMode =
      availableLevelModes.includes(
        currentLevelMode
      )
        ? currentLevelMode
        : DEFAULT_LEVEL_HEADERS_MODE;
}
    /*
      Добавляем новые свойства,
      появившиеся после сохранения проекта.
    */

    ALL_PROPERTY_KEYS.forEach(
      (key) => {
        if (
          typeof item.settings
            .properties[key] !==
          "boolean"
        ) {
          item.settings
            .properties[key] =
              defaults
                .properties[key];
        }
      }
    );

    /*
      Название нельзя выключить.
    */

    item.settings
      .properties
      .name = true;

    if (
      typeof item.settings
        .interface
        .levelHeaders !==
      "boolean"
    ) {
      item.settings
        .interface
        .levelHeaders =
          defaults
            .interface
            .levelHeaders;
    }

    return item.settings;
  }

  function saveSettings() {
    window
      .projectAutosave
      ?.saveNow?.();
  }

  function dispatchSettingsChange(
    item,
    key,
    enabled
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "view-property-settings-change",
        {
          detail: {
            itemId:
              item?.id || "",

            kind:
              item?.kind || "",

            property:
              key,

            enabled:
              !!enabled,
          },
        }
      )
    );
  }

  /* =========================================================
     Создание дополнительных строк свойств
  ========================================================= */

  function createPropertyRow(
    property
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "view-settings-control-row";

    row.dataset
      .viewPropertyRow = "1";

    row.dataset
      .viewProperty =
        property.key;

    const main =
      document.createElement(
        "div"
      );

    main.className =
      "view-settings-control-main";

    const icon =
      document.createElement(
        "span"
      );

    icon.className =
      "view-settings-property-icon";

    icon.textContent =
      property.icon;

    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    const name =
      document.createElement(
        "span"
      );

    name.className =
      "view-settings-control-name";

    name.textContent =
      property.name;

    main.append(
      icon,
      name
    );

    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "view-settings-control-actions";

    const toggle =
      document.createElement(
        "button"
      );

    toggle.type = "button";

    toggle.className =
      "ui-toggle";

    toggle.setAttribute(
      "role",
      "switch"
    );

    toggle.setAttribute(
      "aria-checked",
      "false"
    );

    toggle.setAttribute(
      "aria-disabled",
      "true"
    );

    toggle.setAttribute(
      "aria-label",
      property.name
    );

    toggle.disabled = true;

    toggle.dataset
      .viewProperty =
        property.key;

    toggle.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (toggle.disabled) {
          return;
        }

        /*
          Запоминаем вкладку непосредственно
          в момент нажатия.

          Даже если пользователь сразу
          переключит вид, настройка не попадёт
          в соседнюю вкладку.
        */

        const itemAtClick =
          activeItem();

        const settings =
          ensureItemSettings(
            itemAtClick
          );

        if (
          !itemAtClick ||
          !settings ||
          !isPropertyAvailable(
            itemAtClick,
            property.key
          )
        ) {
          return;
        }

        const next =
          toggle.getAttribute(
            "aria-checked"
          ) !== "true";

        settings
          .properties[
            property.key
          ] = next;

        toggle.setAttribute(
          "aria-checked",
          next
            ? "true"
            : "false"
        );

        saveSettings();

        syncPropertiesCount();

        dispatchSettingsChange(
          itemAtClick,
          property.key,
          next
        );
      }
    );

    actions.appendChild(
      toggle
    );

    row.append(
      main,
      actions
    );

    return row;
  }

  function renderPropertyGroup(
    containerId,
    properties
  ) {
    const container =
      document.getElementById(
        containerId
      );

    if (!container) {
      return;
    }

    container.innerHTML = "";

    properties.forEach(
      (property) => {
        container.appendChild(
          createPropertyRow(
            property
          )
        );
      }
    );
  }

  function renderPropertyCatalog() {
    renderPropertyGroup(
      "viewSettingsBeforeName",
      PROPERTIES_BEFORE_NAME
    );

    renderPropertyGroup(
      "viewSettingsAfterDescription",
      PROPERTIES_AFTER_DESCRIPTION
    );
  }

  /* =========================================================
     Состояние и доступность тумблеров
  ========================================================= */

  function setToggleState(
    id,
    checked
  ) {
    const toggle =
      document.getElementById(
        id
      );

    if (!toggle) {
      return;
    }

    toggle.setAttribute(
      "aria-checked",
      checked
        ? "true"
        : "false"
    );
  }

  function setToggleAvailability(
    toggle,
    available,
    checked,
    title
  ) {
    if (!toggle) {
      return;
    }

    toggle.disabled =
      !available;

    toggle.setAttribute(
      "aria-disabled",
      available
        ? "false"
        : "true"
    );

    toggle.setAttribute(
      "aria-checked",
      checked
        ? "true"
        : "false"
    );

    toggle.title =
      title || "";
  }

  function syncPropertyAvailability() {
    const item =
      activeItem();

    const settings =
      ensureItemSettings(
        item
      );

    if (
      !item ||
      !settings
    ) {
      return;
    }

    document
      .querySelectorAll(
        "#viewSettingsPanel [data-view-property-row]"
      )
      .forEach(
        (row) => {
          const key =
            row.dataset
              .viewProperty;

          const toggle =
            row.querySelector(
              '.ui-toggle[role="switch"]'
            );

          if (
            !key ||
            !toggle
          ) {
            return;
          }

          /*
            Название всегда включено,
            но его тумблер заблокирован.
          */

          if (key === "name") {
            row.classList.remove(
              "is-unavailable"
            );

            setToggleAvailability(
              toggle,
              false,
              true,
              "Название отображается всегда"
            );

            return;
          }

          const available =
            isPropertyAvailable(
              item,
              key
            );

          const checked =
            available &&
            !!settings
              .properties[key];

          row.classList.toggle(
            "is-unavailable",
            !available
          );

          setToggleAvailability(
            toggle,
            available,
            checked,

            available
              ? ""
              : "Свойство доступно только в таблице"
          );
        }
      );

    /*
      Заголовки уровней доступны
      во всех отображениях.
    */

    const levelHeadersToggle =
      document.getElementById(
        "toggleLevelHeaders"
      );

    setToggleAvailability(
      levelHeadersToggle,
      true,

      !!settings
        .interface
        .levelHeaders,

      ""
    );
  }

  function syncToggleStates() {
    const item =
      activeItem();

    const settings =
      ensureItemSettings(
        item
      );

    if (!settings) {
      return;
    }

    setToggleState(
      "toggleOrdinals",

      !!settings
        .properties
        .ordinals
    );

    setToggleState(
      "toggleCaptions",

      !!settings
        .properties
        .captions
    );

    setToggleState(
      "toggleMarks",

      !!settings
        .properties
        .marks
    );

    setToggleState(
      "toggleLevelHeaders",

      !!settings
        .interface
        .levelHeaders
    );
  }

  function syncPropertiesCount() {
    const output =
      propertiesCount();

    if (!output) {
      return;
    }

    const rows =
      document.querySelectorAll(
        "#viewSettingsPanel [data-view-property-row]"
      );

    let count = 0;

    rows.forEach(
      (row) => {
        const toggle =
          row.querySelector(
            '.ui-toggle[role="switch"]'
          );

        if (
          toggle?.getAttribute(
            "aria-checked"
          ) === "true"
        ) {
          count += 1;
        }
      }
    );

    output.textContent =
      String(count);
  }

  function syncViewSelect() {
    const select =
      viewSelect();

    const state =
      tabsState();

    if (
      !select ||
      !state ||
      !Array.isArray(state.items)
    ) {
      return;
    }

    select.innerHTML = "";

    state.items.forEach(
      (item) => {
        ensureItemSettings(item);

        const option =
          document.createElement(
            "option"
          );

        option.value =
          item.id;

        option.textContent =
          item.name;

        select.appendChild(
          option
        );
      }
    );

    const active =
      activeItem();

    if (active) {
      select.value =
        active.id;
    }
  }

  function sync() {
    syncViewSelect();
    syncPropertyAvailability();
    syncToggleStates();
    syncPropertiesCount();
  }

  /* =========================================================
     Применение настроек активной вкладки
  ========================================================= */

  let applyingSettings = false;

  function applyActiveSettingsToView() {
    if (applyingSettings) {
      return;
    }

    const item =
      activeItem();

    const settings =
      ensureItemSettings(
        item
      );

    if (
      !item ||
      !settings
    ) {
      return;
    }

    applyingSettings = true;

    try {
      let needsRender = false;

      let levelHeadersWillRender =
        false;

      /* -------------------------
         Нумерация
      ------------------------- */

      const nextOrdinals =
        !!settings
          .properties
          .ordinals;

      if (
        !!window.showOrdinals !==
        nextOrdinals
      ) {
        window.showOrdinals =
          nextOrdinals;

        window
          .updateOrdinalButton
          ?.();

        window
          .syncOrdinalsModeClass
          ?.();

        needsRender = true;
      }

      /* -------------------------
         Описание
      ------------------------- */

      const nextCaptions =
        !!settings
          .properties
          .captions;

      if (
        !!window.showCaptions !==
        nextCaptions
      ) {
        window.showCaptions =
          nextCaptions;

        window
          .updateCaptionButton
          ?.();

        needsRender = true;
      }

      /* -------------------------
         Метка
      ------------------------- */
/* -------------------------
   Метка
------------------------- */

const nextMarks =
  !!settings
    .properties
    .marks;

const markOptions =
  settings
    .propertyOptions
    ?.marks || {};

const nextHideMarked =
  nextMarks &&
  !!markOptions.hideMarked;

const nextStrikeMarked =
  nextMarks &&
  !!markOptions.strikeMarked;

const currentMarkState =
  window.markProperty
    ?.getState?.() || {};

if (
  !!currentMarkState
    .showMarks !== nextMarks
) {
  window.markProperty
    ?.setShowMarks?.(
      nextMarks
    );
}

if (
  !!currentMarkState
    .hideMarked !== nextHideMarked
) {
  window.markProperty
    ?.setHideMarked?.(
      nextHideMarked
    );
}

if (
  !!currentMarkState
    .strikeMarked !== nextStrikeMarked
) {
  window.markProperty
    ?.setStrikeMarked?.(
      nextStrikeMarked
    );
}

      /* -------------------------
         Заголовки уровней
      ------------------------- */

/* -------------------------
   Заголовки уровней
------------------------- */

const nextLevelHeaders =
  !!settings
    .interface
    .levelHeaders;

const nextLevelHeadersMode =
  settings
    .interface
    .levelHeadersMode ||
  DEFAULT_LEVEL_HEADERS_MODE;

const currentLevelHeaders =
  readCurrentLevelHeaders();

const currentLevelHeadersMode =
  window.levelHeaders
    ?.getMode?.();

/*
  Новый общий метод меняет режим
  и включённость одним рендером.
*/

if (
  window.levelHeaders
    ?.setState
) {
  if (
    currentLevelHeaders !==
      nextLevelHeaders ||

    currentLevelHeadersMode !==
      nextLevelHeadersMode
  ) {
    levelHeadersWillRender =
      true;

    window.levelHeaders
      .setState({
        enabled:
          nextLevelHeaders,

        mode:
          nextLevelHeadersMode,
      });
  }
} else {
  /*
    Резервная совместимость.
  */

  if (
    currentLevelHeadersMode !==
    nextLevelHeadersMode
  ) {
    levelHeadersWillRender =
      true;

    window.levelHeaders
      ?.setMode?.(
        nextLevelHeadersMode
      );
  }

  if (
    currentLevelHeaders !==
    nextLevelHeaders
  ) {
    levelHeadersWillRender =
      true;

    window.levelHeaders
      ?.setEnabled?.(
        nextLevelHeaders
      );
  }
}
      /*
        Если нумерация или описание изменились,
        но заголовки уровней сами не вызвали render,
        перерисовываем отображение здесь.
      */

      if (
        needsRender &&
        !levelHeadersWillRender
      ) {
        window.render?.();
      }
    } finally {
      applyingSettings = false;
    }
  }
  /* =========================================================
     Открытие и закрытие панели
  ========================================================= */

  function open() {
    const element =
      panel();

    const trigger =
      openButton();

    if (!element) {
      return;
    }

    sync();

    element.classList.add(
      "is-open"
    );

    element.setAttribute(
      "aria-hidden",
      "false"
    );

    trigger?.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  function close() {
    const element =
      panel();

    const trigger =
      openButton();

    if (!element) {
      return;
    }

    element.classList.remove(
      "is-open"
    );

    element.setAttribute(
      "aria-hidden",
      "true"
    );

    trigger?.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function toggle() {
    const element =
      panel();

    if (!element) {
      return;
    }

    if (
      element.classList.contains(
        "is-open"
      )
    ) {
      close();
    } else {
      open();
    }
  }

  async function selectView(
    itemId
  ) {
    if (!itemId) {
      return;
    }

    await window
      .viewTabs
      ?.open?.(
        itemId,
        {
          restoreFocus: false,
        }
      );

    applyActiveSettingsToView();
    sync();
  }

  /* =========================================================
     Сохранение старых рабочих тумблеров
  ========================================================= */

  function bindPropertyToggle(
    id
  ) {
    const toggle =
      document.getElementById(
        id
      );

    if (
      !toggle ||
      toggle.dataset
        .viewSettingsBound === "1"
    ) {
      return;
    }

    toggle.dataset
      .viewSettingsBound = "1";

    toggle.addEventListener(
      "click",
      () => {
        /*
          Вкладку запоминаем сразу,
          до requestAnimationFrame.
        */

        const itemAtClick =
          activeItem();

        requestAnimationFrame(
          () => {
            const settings =
              ensureItemSettings(
                itemAtClick
              );

            if (
              !itemAtClick ||
              !settings
            ) {
              return;
            }

            /*
              Заголовки уровней
              хранятся отдельно.
            */

            if (
              id ===
              "toggleLevelHeaders"
            ) {
              const next =
                readCurrentLevelHeaders();

              settings
                .interface
                .levelHeaders =
                  next;

              saveSettings();

              /*
  После переключения метки применяем
  также её индивидуальные параметры.

  Это нужно, чтобы при выключении
  отметок текущего вида сразу исчезли
  скрытие и зачёркивание.
*/

if (key === "marks") {
  applyActiveSettingsToView();
}

              dispatchSettingsChange(
                itemAtClick,
                "levelHeaders",
                next
              );

              sync();
              return;
            }

            const key =
              OLD_TOGGLE_TO_PROPERTY[id];

            if (!key) {
              return;
            }

            const next =
              readCurrentCommonProperty(
                key
              );

            settings
              .properties[key] =
                next;

            saveSettings();

            dispatchSettingsChange(
              itemAtClick,
              key,
              next
            );

            sync();
          }
        );
      }
    );
  }

  /* =========================================================
     Инициализация
  ========================================================= */

  function bindSettingsOptionMenus() {
  const markMenu =
    document.getElementById(
      "markSettingsMenu"
    );

  if (
    markMenu &&
    markMenu.dataset
      .viewOptionsBound !== "1"
  ) {
    markMenu.dataset
      .viewOptionsBound = "1";

    markMenu.addEventListener(
      "click",
      (event) => {
        const option =
          event.target
            ?.closest?.(
              "[data-mark-mode]"
            );

        if (!option) {
          return;
        }

        if (
          option.classList
            .contains(
              "is-disabled"
            ) ||

          option.getAttribute(
            "aria-disabled"
          ) === "true"
        ) {
          return;
        }

        /*
          Вкладку запоминаем до
          requestAnimationFrame.
        */

        const itemAtClick =
          activeItem();

        requestAnimationFrame(
          () => {
            const settings =
              ensureItemSettings(
                itemAtClick
              );

            const markState =
              window.markProperty
                ?.getState?.();

            if (
              !settings ||
              !markState
            ) {
              return;
            }

            settings
              .propertyOptions
              .marks
              .hideMarked =
                !!markState
                  .hideMarked;

            settings
              .propertyOptions
              .marks
              .strikeMarked =
                !!markState
                  .strikeMarked;

            saveSettings();
          }
        );
      }
    );
  }

  const levelMenu =
    document.getElementById(
      "levelHeadersMenu"
    );

  if (
    levelMenu &&
    levelMenu.dataset
      .viewOptionsBound !== "1"
  ) {
    levelMenu.dataset
      .viewOptionsBound = "1";

    levelMenu.addEventListener(
      "click",
      (event) => {
        const option =
          event.target
            ?.closest?.(
              "[data-level-header-mode]"
            );

        if (!option) {
          return;
        }

        const itemAtClick =
          activeItem();

        requestAnimationFrame(
          () => {
            const settings =
              ensureItemSettings(
                itemAtClick
              );

            const mode =
              window.levelHeaders
                ?.getMode?.();

            if (
              !settings ||
              !mode
            ) {
              return;
            }

            settings
              .interface
              .levelHeadersMode =
                mode;

            saveSettings();
          }
        );
      }
    );
  }
}

function init() {
  renderPropertyCatalog();
  bindSettingsOptionMenus();

    const trigger =
      openButton();

    const closer =
      closeButton();

    const select =
      viewSelect();

    trigger?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        toggle();
      }
    );

    closer?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        close();
      }
    );

    select?.addEventListener(
      "change",
      () => {
        selectView(
          select.value
        );
      }
    );

    [
      "toggleOrdinals",
      "toggleCaptions",
      "toggleMarks",
      "toggleLevelHeaders",
    ].forEach(
      bindPropertyToggle
    );

    /*
      После переключения вкладки
      применяем настройки именно
      новой активной вкладки.
    */

    window.addEventListener(
      "view-tabs-change",
      () => {
        requestAnimationFrame(
          () => {
            applyActiveSettingsToView();
            sync();
          }
        );
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Escape"
        ) {
          return;
        }

        const element =
          panel();

        if (
          !element?.classList
            .contains("is-open")
        ) {
          return;
        }

        close();
      }
    );

    /*
      Создаём индивидуальные настройки
      для всех существующих вкладок.
    */

    syncViewSelect();

    /*
      Применяем настройки текущей вкладки.
    */

    applyActiveSettingsToView();

    sync();

    /*
      Сохраняем созданные settings
      в состоянии проекта.
    */

    saveSettings();
  }

  /* =========================================================
     Публичный API
  ========================================================= */

  window.viewSettings = {
    open,
    close,
    toggle,
    sync,

    applyActiveSettingsToView,

    getActiveItem:
      activeItem,

    createDefaultSettings,

    getActiveSettings() {
      return ensureItemSettings(
        activeItem()
      );
    },

    isPropertyAvailable(
      key
    ) {
      return isPropertyAvailable(
        activeItem(),
        key
      );
    },

    isPropertyEnabled(
      key
    ) {
      const item =
        activeItem();

      const settings =
        ensureItemSettings(
          item
        );

      if (
        !item ||
        !settings
      ) {
        return true;
      }

      if (key === "name") {
        return true;
      }

      if (
        !isPropertyAvailable(
          item,
          key
        )
      ) {
        return false;
      }

      return (
        settings
          .properties[key] !==
        false
      );
    },
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