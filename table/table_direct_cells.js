// table/table_direct_cells.js
// Direct-edit ячейки табличного отображения.
//
// Используется для простых date/time ячеек:
// - startDate
// - startTime
// - endDate
// - endTime

(function () {
  if (typeof window === "undefined") return;

  function getTableColumnByKey(key) {
    if (key === window.TABLE_ICON_COLUMN?.key) {
      return window.TABLE_ICON_COLUMN;
    }

    return getAllTablePropertyColumns().find((column) => {
      return column.key === key;
    }) || null;
  }

  function isDirectEditableTableColumn(column) {
    if (!column) return false;

    return (
      column.key === "startDate" ||
      column.key === "startTime" ||
      column.key === "endDate" ||
      column.key === "endTime"
    );
  }

  function formatDirectTableDateCompact(value) {
    const raw = String(value || "");
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return raw;

    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function formatDirectTableTimeCompact(value) {
    return String(value || "");
  }

  function getDirectTableCellValueText(node, column) {
    const value = getTableProp(node, column.key);

    if (column.key === "icon") {
      return getTableIconSymbol(value);
    }

    if (column.inputType === "select") {
      return getTableSelectLabel(node, column);
    }

    if (column.inputType === "date") {
      return formatDirectTableDateCompact(value);
    }

    if (column.inputType === "time") {
      return formatDirectTableTimeCompact(value);
    }

    return String(value || "");
  }

  function renderDirectTableCellView(td, node, column) {
    td.innerHTML = "";

    const value = getDirectTableCellValueText(node, column);

    const view = document.createElement("div");
    view.className = "table-cell-value";

    if (value) {
      view.textContent = value;
    } else {
      view.classList.add("is-empty");
      view.textContent = "";
    }

    td.appendChild(view);
  }

  function makeDirectTablePropCell(node, column) {
    const td = document.createElement("td");

    td.className = "table-prop-cell table-direct-cell";
    td.dataset.prop = column.key;
    td.dataset.id = node.id;
    td.dataset.editorType = column.inputType || "text";

    renderDirectTableCellView(td, node, column);

    td.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();

      window.tableCellNav?.selectCell?.(td, {
        focus: true,
        scroll: false,
      });

      startDirectTableCellEdit(td);
    });

    return td;
  }

  function isValidDirectDateValue(value) {
    const str = String(value || "").trim();

    if (!str) return true;

    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (year < 1900 || year > 2100) return false;

    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function isValidDirectTimeValue(value) {
    const str = String(value || "").trim();

    if (!str) return true;

    return /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
  }

  function isValidDirectDateTimeValue(column, value) {
    if (!column) return true;

    if (column.inputType === "date") {
      return isValidDirectDateValue(value);
    }

    if (column.inputType === "time") {
      return isValidDirectTimeValue(value);
    }

    return true;
  }

  function startDirectTableCellEdit(td) {
    if (!td || !td.classList.contains("table-direct-cell")) return false;
    if (td.classList.contains("is-editing")) return true;

    const id = td.dataset.id || td.dataset.rowId;
    const key = td.dataset.prop;

    if (!id || !key) return false;

    const found = findWithParent(root, id);
    const node = found?.node;
    const column = getTableColumnByKey(key);

    if (!node || !column || !isDirectEditableTableColumn(column)) {
      return false;
    }

    const releaseHorizontalScrollLock =
  window.tableAutoscroll?.lockHorizontalPosition?.(td);

let horizontalScrollLockReleased = false;

function releaseHorizontalScroll() {
  if (horizontalScrollLockReleased) return;

  horizontalScrollLockReleased = true;

  if (
    typeof releaseHorizontalScrollLock === "function"
  ) {
    releaseHorizontalScrollLock();
  }
}

    const oldValue = getTableProp(node, column.key);

    td.classList.add("is-editing");
    td.innerHTML = "";

    const editor = document.createElement("input");
    editor.className = "table-cell-editor table-cell-input-editor";
    editor.type = column.inputType || "text";
    editor.value = oldValue || "";

    let editorWrap = null;
let datePickerHitArea = null;

if (editor.type === "date") {
  editorWrap =
    document.createElement("div");

  editorWrap.className =
    "table-direct-date-editor-wrap";

  /*
    Прозрачная кнопка располагается поверх
    существующей браузерной иконки календаря.

    Сама иконка остаётся видна под кнопкой.
  */
  datePickerHitArea =
    document.createElement("button");

  datePickerHitArea.type = "button";

  datePickerHitArea.className =
    "table-direct-date-picker-hit-area";

  datePickerHitArea.tabIndex = -1;

  datePickerHitArea.setAttribute(
    "aria-label",
    "Открыть календарь"
  );

  datePickerHitArea.title =
    "Открыть календарь";

  /*
    Не разрешаем кнопке забрать фокус
    у поля даты, иначе редактор закроется по blur.
  */
  datePickerHitArea.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
    }
  );

  datePickerHitArea.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      window.tableDatePicker?.toggle?.({
        input: editor,
        anchor: td,
      });

      editor.focus({
        preventScroll: true,
      });
    }
  );
}

    if (editor.type === "date") {
  editor.addEventListener(
    "pointerdown",
    (e) => {
      const rect =
        editor.getBoundingClientRect();

      /*
        Нативная иконка календаря находится
        примерно в последних 32 пикселях input.
      */
      const pickerZoneLeft =
        rect.right - 32;

      if (e.clientX < pickerZoneLeft) {
        return;
      }

      /*
        Не разрешаем браузеру открыть
        собственный календарь.
      */
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      window.tableDatePicker?.toggle?.({
        input: editor,
        anchor: td,
      });

      editor.focus({
        preventScroll: true,
      });
    },
    true
  );
}

    let finished = false;

    function finish(save, options = {}) {
      if (finished) return;
      window.tableDatePicker
  ?.closeForInput?.(editor);

      const mode = options.mode || "blur";

      if (save) {
        const nextValue = String(editor.value || "").trim();

        if (!isValidDirectDateTimeValue(column, nextValue)) {
          editor.classList.add("is-invalid");
          td.classList.add("is-invalid");

          if (mode === "enter") {
            requestAnimationFrame(() => {
              editor.focus({
                preventScroll: true,
              });
            });

            return;
          }

          save = false;
        }
      }

      finished = true;

      if (save) {
        setTableProp(node, column.key, String(editor.value || "").trim());
      }

      td.classList.remove("is-editing", "is-invalid");
      renderDirectTableCellView(td, node, column);

requestAnimationFrame(() => {
  window.tableCellNav?.selectCell?.(td, {
    focus: true,
    scroll: false,
  });

  /*
    Снимаем блокировку только после возвращения
    фокуса на ячейку.
  */
  requestAnimationFrame(() => {
    releaseHorizontalScroll();
  });
});
    }

    editor.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    editor.addEventListener("dblclick", (e) => {
      e.stopPropagation();
    });

    editor.addEventListener("keydown", (e) => {
      e.stopPropagation();

      if (e.key === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();

        finish(true, {
          mode: "enter",
        });

        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });

   editor.addEventListener("input", () => {
  editor.classList.remove("is-invalid");
  td.classList.remove("is-invalid");

  window.tableDatePicker
    ?.position?.();
});

editor.addEventListener("change", () => {
  editor.classList.remove("is-invalid");
  td.classList.remove("is-invalid");

  window.tableDatePicker
    ?.position?.();
});

    editor.addEventListener("blur", () => {
      finish(true, {
        mode: "blur",
      });
    });

    if (
  editorWrap &&
  datePickerHitArea
) {
  editorWrap.appendChild(editor);
  editorWrap.appendChild(
    datePickerHitArea
  );

  td.appendChild(editorWrap);
} else {
  td.appendChild(editor);
}

requestAnimationFrame(() => {
  editor.focus({
    preventScroll: true,
  });

  if (editor.type === "date") {
    window.tableDatePicker?.open?.({
      input: editor,
      anchor: td,
    });

    return;
  }

  if (
    editor instanceof HTMLInputElement &&
    editor.type !== "time"
  ) {
    editor.select?.();
  }
});

    return true;
  }

  window.tableDirectCells = {
    getColumnByKey: getTableColumnByKey,
    isDirectEditableColumn: isDirectEditableTableColumn,
    getValueText: getDirectTableCellValueText,
    renderView: renderDirectTableCellView,
    makeCell: makeDirectTablePropCell,
    startEdit: startDirectTableCellEdit,
  };

  window.getTableColumnByKey = getTableColumnByKey;
  window.isDirectEditableTableColumn = isDirectEditableTableColumn;
  window.getDirectTableCellValueText = getDirectTableCellValueText;
  window.renderDirectTableCellView = renderDirectTableCellView;
  window.makeDirectTablePropCell = makeDirectTablePropCell;
  window.startDirectTableCellEdit = startDirectTableCellEdit;
})();