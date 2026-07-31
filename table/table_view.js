// table/table_view.js
// Рендер табличного отображения.
//
// Учитывает индивидуальные настройки
// активной вкладки таблицы и скрывает
// отключённые колонки.

(function () {
  if (typeof window === "undefined") {
    return;
  }

  /* =========================================================
     Проверка настройки свойства
  ========================================================= */

  function isViewPropertyEnabled(
    propertyKey
  ) {
    /*
      Название нельзя выключить.
    */

    if (propertyKey === "name") {
      return true;
    }

    const checker =
      window.viewSettings
        ?.isPropertyEnabled;

    /*
      Пока viewSettings не загружен,
      сохраняем прежнее поведение:
      показываем все колонки.
    */

    if (
      typeof checker !==
      "function"
    ) {
      return true;
    }

    return (
      checker.call(
        window.viewSettings,
        propertyKey
      ) !== false
    );
  }

  /* =========================================================
     Соответствие сложных колонок настройкам
  ========================================================= */

  function getColumnSettingKeys(
    column
  ) {
    if (!column) {
      return [];
    }

    /*
      Объединённая колонка:
      дата начала + дата завершения.
    */

    if (
      column.inputType ===
      "dateRange"
    ) {
      return [
        column.startKey,
        column.endKey,
      ].filter(Boolean);
    }

    /*
      Объединённая колонка:
      время начала + время завершения.
    */

    if (
      column.inputType ===
      "timeRange"
    ) {
      return [
        column.startKey,
        column.endKey,
      ].filter(Boolean);
    }

    /*
      Дата и время начала
      или дата и время завершения.
    */

    if (
      column.inputType ===
      "dateTimePair"
    ) {
      return [
        column.dateKey,
        column.timeKey,
      ].filter(Boolean);
    }

    /*
      Полный диапазон:
      дата и время начала и завершения.
    */

    if (
      column.inputType ===
      "dateTimeRangePair"
    ) {
      return [
        column.startDateKey,
        column.startTimeKey,
        column.endDateKey,
        column.endTimeKey,
      ].filter(Boolean);
    }

    /*
      Обе таймерные колонки используют
      внутри данных один ключ "timer",
      но в панели у них отдельные настройки.
    */

    if (
      column.inputType ===
      "timerDuration"
    ) {
      return [
        "timerDuration",
      ];
    }

    if (
      column.inputType ===
      "timerRemaining"
    ) {
      return [
        "timerRemaining",
      ];
    }

    /*
      Для остальных колонок ключ таблицы
      совпадает с ключом настройки.
    */

    return column.key
      ? [column.key]
      : [];
  }

  /* =========================================================
     Полная схема колонок таблицы
  ========================================================= */

  function getTableColumnDescriptors() {
    const propertyColumns =
      typeof window
        .getAllTablePropertyColumns ===
      "function"
        ? window
            .getAllTablePropertyColumns()
        : [];

    return [
      /*
        ID пока остаётся служебной
        постоянно видимой колонкой.
      */

      {
        title: "ID",
        alwaysVisible: true,
      },

      {
        title: "Отметка",
        settingKeys: [
          "marks",
        ],
      },

      {
        title: "Нумерация",
        settingKeys: [
          "ordinals",
        ],
      },

      {
        title: "Иконка",
        settingKeys: [
          "icon",
        ],
      },

      {
        title: "Обложка",
        settingKeys: [
          "cover",
        ],
      },

      /*
        Уровень пока остаётся служебной
        постоянно видимой колонкой.
      */

      {
        title: "Уровень",
        alwaysVisible: true,
      },

      {
        title: "Название",
        settingKeys: [
          "name",
        ],
        alwaysVisible: true,
      },

      {
        title: "Описание",
        settingKeys: [
          "captions",
        ],
      },

      /*
        Остальные колонки берём из
        существующей конфигурации таблицы.
      */

      ...propertyColumns.map(
        (column) => {
          return {
            title:
              column.title || "",

            column,

            settingKeys:
              getColumnSettingKeys(
                column
              ),
          };
        }
      ),
    ];
  }

  /* =========================================================
     Видимость одной колонки
  ========================================================= */

  function isColumnVisible(
    descriptor
  ) {
    if (
      descriptor
        ?.alwaysVisible
    ) {
      return true;
    }

    const settingKeys =
      Array.isArray(
        descriptor?.settingKeys
      )
        ? descriptor.settingKeys
        : [];

    /*
      Колонка без связанной настройки
      остаётся видимой.
    */

    if (!settingKeys.length) {
      return true;
    }

    /*
      Для составной колонки должны быть
      включены все необходимые свойства.

      Например, колонка диапазона дат
      исчезнет, если отключена хотя бы
      одна из двух дат.
    */

    return settingKeys.every(
      (key) =>
        isViewPropertyEnabled(
          key
        )
    );
  }

  /* =========================================================
     Шапка таблицы
  ========================================================= */

  function buildTableHead(
    descriptors
  ) {
    const thead =
      document.createElement(
        "thead"
      );

    const row =
      document.createElement(
        "tr"
      );

    descriptors.forEach(
      (descriptor) => {
        if (
          !isColumnVisible(
            descriptor
          )
        ) {
          return;
        }

        const th =
          document.createElement(
            "th"
          );

        th.textContent =
          descriptor.title || "";

        row.appendChild(th);
      }
    );

    thead.appendChild(row);

    return thead;
  }

  /* =========================================================
     Удаление отключённых ячеек из строки
  ========================================================= */

  function removeHiddenCellsFromRow(
    row,
    descriptors
  ) {
    if (!row) {
      return;
    }

    /*
      Идём справа налево.

      Так удаление одной ячейки
      не изменит индексы ячеек,
      которые ещё нужно проверить.
    */

    for (
      let index =
        descriptors.length - 1;

      index >= 0;

      index -= 1
    ) {
      const descriptor =
        descriptors[index];

      if (
        isColumnVisible(
          descriptor
        )
      ) {
        continue;
      }

      row.children[index]
        ?.remove();
    }
  }

  /* =========================================================
     Рендер таблицы
  ========================================================= */

  window.renderTableView =
    function renderTableView() {
      syncProjectsSidebar();

      const host =
        document.getElementById(
          "tree"
        );

      if (!host) {
        return;
      }

      const wrap =
        document.createElement(
          "div"
        );

      wrap.className =
        "table-view";

      const table =
        document.createElement(
          "table"
        );

      table.className =
        "structure-table";

      /*
        Единая схема нужна одновременно
        для шапки и для строк таблицы.
      */

      const descriptors =
        getTableColumnDescriptors();

      table.appendChild(
        buildTableHead(
          descriptors
        )
      );

      const tbody =
        document.createElement(
          "tbody"
        );

      const displayRoot =
        window.objectFocus
          ?.getFocusedRootNode?.() ||
        root;

      const displayRootOrdinalPath =
        window.objectFocus
          ?.getFocusedRootOrdinalPath?.() ||
        [];

      const rows =
        flattenTableRows(
          displayRoot,
          displayRootOrdinalPath
        );

      rows.forEach(
        (item) => {
          /*
            renderTableRow по-прежнему
            создаёт полную строку.

            После этого удаляем из неё
            ячейки отключённых колонок.
          */

          const row =
            renderTableRow(
              item.node,
              item.ordinalPath
            );

          removeHiddenCellsFromRow(
            row,
            descriptors
          );

          tbody.appendChild(row);
        }
      );

      table.appendChild(tbody);
      wrap.appendChild(table);

      /*
        Сохраняем прежнюю защиту
        от резкого изменения ширины
        во время перестроения таблицы.
      */

      const oldMinWidth =
        host.style.minWidth;

      const oldScrollWidth =
        host.scrollWidth;

      if (oldScrollWidth) {
        host.style.minWidth =
          `${oldScrollWidth}px`;
      }

      host.replaceChildren(
        wrap
      );

      requestAnimationFrame(
        () => {
          host.style.minWidth =
            oldMinWidth;
        }
      );

      layoutTableCollapseColumn(
        host,
        wrap
      );

      ensureTableCellTabNavigation();
      ensureTableTimerCellsEnterHotkey();
      ensureTableUploadCellsEnterHotkey();

      if (treeHasFocus) {
        const selectedRow =
          host.querySelector(
            `.row[data-id="${cssEscape(
              selectedId
            )}"]`
          );

        selectedRow?.focus({
          preventScroll: true,
        });
      }

      updateTableDescendantRowHighlights();

      requestAnimationFrame(
        () => {
          updateTableDescendantRowHighlights();

          ensureTableDescendantHighlightWatcher();
        }
      );
    };

  /* =========================================================
     Мгновенное обновление после тумблера
  ========================================================= */

  if (
    !window
      .__tableViewPropertySettingsBound
  ) {
    window
      .__tableViewPropertySettingsBound =
        true;

    window.addEventListener(
      "view-property-settings-change",
      (event) => {

        const property =
  event.detail
    ?.property || "";

/*
  Заголовки уровней — это настройка интерфейса,
  а не колонка таблицы.

  level_headers.js сам выполняет рендер
  и монтирует строку N/A. Повторный рендер
  таблицы здесь удалял эту строку.
*/

if (
  property ===
  "levelHeaders"
) {
  return;
}
        /*
          В другом отображении таблицу
          перестраивать не нужно.
        */

        if (
          String(
            window.currentView || ""
          ) !== "table"
        ) {
          return;
        }

        const changedItemId =
          event.detail
            ?.itemId || "";

        const activeItemId =
          window.viewSettings
            ?.getActiveItem?.()
            ?.id || "";

        /*
          Защита на случай, если событие
          относится уже к другой вкладке.
        */

        if (
          changedItemId &&
          activeItemId &&
          changedItemId !==
            activeItemId
        ) {
          return;
        }

        requestAnimationFrame(
          () => {
            window
              .renderTableView
              ?.();
          }
        );
      }
    );
  }
})();