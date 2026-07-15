// table/table_builtin_cells.js
// Системные ячейки табличного отображения.
//
// Используется для:
// - ID
// - Нумерация
// - Отметка
// - встроенное редактирование описания

(function () {
  if (typeof window === "undefined") return;

  function selectNodeById(id) {
    if (!id) return;

    window.selectedId = id;
    window.treeHasFocus = true;
  }

  function renderTablePlainCellValue(td, value) {
    td.innerHTML = "";

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

  function renderTableIdCell(td, node) {
    renderTablePlainCellValue(td, node.id || "");
  }

  function renderTableOrdinalCell(td, node, ordinalPath) {
    const isFocusedRoot =
      window.objectFocus?.getFocusedRootId?.() === node.id;

    const ordinal = isFocusedRoot
      ? ""
      : ordinalPath.length
        ? ordinalPath.join(".")
        : "0";

    td.dataset.defaultOrdinal = ordinal;

    renderTablePlainCellValue(td, ordinal);
  }

  function toggleTableMarkFromCell(td) {
    const id = td.dataset.id || td.dataset.rowId;
    if (!id) return false;

    selectNodeById(id);

    window.markProperty?.toggleMarked?.(id);

    if (typeof render === "function") {
      render();
    }

    return true;
  }

  function startBuiltinTableCellEdit(td) {
    if (!td) return false;

    const key = td.dataset.cellKey;
    const id = td.dataset.id || td.dataset.rowId;

    if (!key || !id) return false;

    const found =
      typeof findWithParent === "function"
        ? findWithParent(root, id)
        : null;

    const node = found?.node;

    if (!node) return false;

    selectNodeById(node.id);

    if (key === "__mark") {
      return toggleTableMarkFromCell(td);
    }

    if (key === "__id" || key === "__ordinal") {
      /*
        ID и нумерация — системные read-only ячейки.
        Считаем событие обработанным, чтобы не срабатывали fallback-механики.
      */
      return true;
    }

    if (key === "__notes") {
      return window.startTableRichTextCellEditor?.(td, {
        value: window.getTableDescriptionRich?.(node) || {
          text: "",
          html: "",
        },

        multiline: true,

        save(rich) {
          window.setTableDescriptionRich?.(node, rich);
        },

        render() {
          window.renderTableDescriptionCell?.(td, node);
        },
      }) || false;
    }

    return false;
  }

  window.tableBuiltinCells = {
    renderPlainValue: renderTablePlainCellValue,
    renderId: renderTableIdCell,
    renderOrdinal: renderTableOrdinalCell,
    toggleMark: toggleTableMarkFromCell,
    startEdit: startBuiltinTableCellEdit,
  };

  window.renderTablePlainCellValue = renderTablePlainCellValue;
  window.renderTableIdCell = renderTableIdCell;
  window.renderTableOrdinalCell = renderTableOrdinalCell;
  window.toggleTableMarkFromCell = toggleTableMarkFromCell;
  window.startBuiltinTableCellEdit = startBuiltinTableCellEdit;
})();