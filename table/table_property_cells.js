// table/table_property_cells.js
// Property-ячейки табличного отображения.
//
// Здесь лежит общий распределитель типов колонок:
// - text / rich-text
// - date/time
// - dropdown
// - image/file
// - timer/time counter
// - обычный input

(function () {
  if (typeof window === "undefined") return;

  function selectNode(node) {
    if (!node?.id) return;

    if (typeof selectedId !== "undefined") {
      selectedId = node.id;
    }

    window.selectedId = node.id;

    if (typeof treeHasFocus !== "undefined") {
      treeHasFocus = true;
    }

    window.treeHasFocus = true;
  }

  function makePlainInputTablePropCell(node, column) {
    const td = document.createElement("td");

    td.className = "table-prop-cell";
    td.dataset.prop = column.key;
    td.dataset.id = node.id;

    const input = document.createElement("input");
    input.className = "table-prop-input";
    input.type = column.inputType || "text";
    input.value = getTableProp(node, column.key);

    if (column.placeholder) {
      input.placeholder = column.placeholder;
    }

    input.addEventListener("click", (e) => {
      e.stopPropagation();
      selectNode(node);
    });

    input.addEventListener("dblclick", (e) => {
      e.stopPropagation();
    });

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();

      if (e.key === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();

        setTableProp(node, column.key, input.value);

        input.blur();
      }
    });

    input.addEventListener("change", () => {
      setTableProp(node, column.key, input.value);
    });

    input.addEventListener("blur", () => {
      setTableProp(node, column.key, input.value);
    });

    td.appendChild(input);

    return td;
  }

  function makeTablePropCell(node, column) {
    const td = document.createElement("td");

    td.className = "table-prop-cell";
    td.dataset.prop = column.key;
    td.dataset.id = node.id;

    if (column.key === "text") {
      return makeTableRichTextPropCell(node, column);
    }

    if (isDirectEditableTableColumn(column)) {
      return makeDirectTablePropCell(node, column);
    }

    if (column.inputType === "dateRange") {
      td.classList.add("table-date-range-cell");
      td.appendChild(makeTableRangeControl(node, column, "date"));
      return td;
    }

    if (column.inputType === "timeRange") {
      td.classList.add("table-time-range-cell");
      td.appendChild(makeTableRangeControl(node, column, "time"));
      return td;
    }

    if (column.inputType === "dateTimePair") {
      td.classList.add("table-datetime-cell");
      td.appendChild(makeTableDateTimeControl(node, column));
      return td;
    }

    if (column.inputType === "dateTimeRangePair") {
      td.classList.add("table-full-datetime-range-cell");
      td.appendChild(makeTableFullDateTimeRangeControl(node, column));
      return td;
    }

    if (column.key === "icon") {
      td.classList.add("table-icon-cell", "table-dropdown-cell");
      td.appendChild(makeTableIconControl(node, column));
      return td;
    }

    if (column.key === "tag") {
      td.classList.add("table-tag-compact-cell", "table-dropdown-cell");
      td.appendChild(makeTableTagCompactControl(node, column));
      return td;
    }

    if (
      column.key === "priority" ||
      column.key === "focus" ||
      column.key === "status"
    ) {
      td.classList.add("table-compact-select-cell", "table-dropdown-cell");
      td.appendChild(makeTableCompactSelectControl(node, column));
      return td;
    }

    if (column.inputType === "select") {
      td.classList.add("table-compact-select-cell", "table-dropdown-cell");
      td.appendChild(makeTableCompactSelectControl(node, column));
      return td;
    }

    if (column.inputType === "image") {
      td.classList.add("table-extra-image-cell");

      markTableUploadCell(td, "image");
      bindUploadTableCellSelection(td, node);

      td.appendChild(makeTableImageControl(node, column.key));

      return td;
    }

    if (column.inputType === "file") {
      td.classList.add("table-file-cell");

      markTableUploadCell(td, "file");
      bindUploadTableCellSelection(td, node);

      td.appendChild(makeTableFileControl(node, column.key));

      return td;
    }

    if (column.inputType === "timeCounter") {
      td.classList.add("table-time-cell");
      td.appendChild(makeTableTimeCounterControl(node, column.key));
      return td;
    }

    if (column.inputType === "timerDuration") {
      td.classList.add("table-timer-duration-cell");
      td.appendChild(makeTableTimerDurationControl(node, column.key));
      return td;
    }

    if (column.inputType === "timerRemaining") {
      td.classList.add("table-timer-remaining-cell");
      td.appendChild(makeTableTimerRemainingControl(node, column.key));
      return td;
    }

    return makePlainInputTablePropCell(node, column);
  }

  function appendTablePropertyCells(tr, node) {
    getAllTablePropertyColumns().forEach((column) => {
      tr.appendChild(makeTablePropCell(node, column));
    });
  }

  window.tablePropertyCells = {
    makeCell: makeTablePropCell,
    appendToRow: appendTablePropertyCells,
    makePlainInput: makePlainInputTablePropCell,
  };

  window.makeTablePropCell = makeTablePropCell;
  window.appendTablePropertyCells = appendTablePropertyCells;
  window.makePlainInputTablePropCell = makePlainInputTablePropCell;
})();