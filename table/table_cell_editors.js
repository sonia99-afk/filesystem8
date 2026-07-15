// table/table_cell_editors.js
// Общий диспетчер редакторов ячеек таблицы.
//
// Решает, какой редактор открыть:
// - built-in ячейки: ID, нумерация, отметка, описание
// - rich-text ячейки
// - составные date/time ячейки
// - direct-edit date/time ячейки

(function () {
  if (typeof window === "undefined") return;

  function startTableCompositeDateTimeCellFromTd(td) {
    const control = td?.querySelector?.(".table-composite-datetime-control");

    if (!control?.openEditor) {
      return false;
    }

    control.openEditor();

    return true;
  }

  function startTableCellEdit(td) {
  if (window.startBuiltinTableCellEdit?.(td)) {
    return true;
  }

  if (td?.dataset?.cellKey === "__name") {
    const id = td.dataset.rowId || td.dataset.id;

    if (id && typeof findWithParent === "function") {
      const node = findWithParent(root, id)?.node;

      if (node) {
        return window.startTableNameRename?.(node, td) || false;
      }
    }
  }

  if (window.startTableRichTextCellFromTd?.(td)) {
    return true;
  }

  if (startTableCompositeDateTimeCellFromTd(td)) {
    return true;
  }

  return window.startDirectTableCellEdit?.(td) || false;
}

  window.tableCellEditors = {
    startEdit: startTableCellEdit,
    startCompositeDateTime: startTableCompositeDateTimeCellFromTd,
  };

  window.startTableCompositeDateTimeCellFromTd =
    startTableCompositeDateTimeCellFromTd;

  window.startTableCellEdit = startTableCellEdit;
})();