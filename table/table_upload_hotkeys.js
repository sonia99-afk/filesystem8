// table/table_upload_hotkeys.js
// Горячая клавиша активации upload-ячеек таблицы.
//
// Используется для:
// - Обложка
// - Доп изображение
// - Файл

(function () {
  if (typeof window === "undefined") return;

  function getSelectedTableUploadCell() {
    const host = document.getElementById("tree");
    if (!host) return null;

    return host.querySelector(
      [
        "td.table-cell-selected.table-upload-cell",
        "td.table-cell-selected.table-cover-cell",
        "td.table-cell-selected.table-extra-image-cell",
        "td.table-cell-selected.table-file-cell",
      ].join(",")
    );
  }

  function isTableUploadTypingTarget(el) {
    if (!el) return false;

    const tag = (el.tagName || "").toLowerCase();

    return (
      (tag === "input" && el.type !== "file") ||
      tag === "textarea" ||
      tag === "select" ||
      el.isContentEditable
    );
  }

  function isTableUploadActionElement(el) {
    if (!el) return false;

    const tag = (el.tagName || "").toLowerCase();

    return (
      tag === "button" ||
      tag === "label" ||
      el.getAttribute?.("role") === "button"
    );
  }

  function isTableCellActivateHotkey(e) {
    return !!window.tableCellNav?.isCellActivateHotkey?.(e);
  }

  function isNativeTableActionKey(e) {
    return (
      e.key === "Enter" ||
      e.code === "NumpadEnter" ||
      e.key === " " ||
      e.code === "Space"
    );
  }

  function stopTableActionKey(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }

  function getDefaultUploadActionElement(td) {
    if (!td) return null;

    /*
      По Enter без Tab не удаляем файл случайно.
      Сначала ищем кнопку загрузки / замены.
    */
    return (
      td.querySelector(".table-cover-btn") ||
      td.querySelector(".table-image-btn") ||
      td.querySelector(".table-file-btn") ||
      td.querySelector("button:not([disabled])")
    );
  }

  function handleTableUploadCellsEnter(e) {
    if (isTableUploadTypingTarget(e.target)) return;

    const selectedCell = getSelectedTableUploadCell();
    if (!selectedCell) return;

    const active = document.activeElement;

    /*
      Если Tab поставил фокус на кнопку внутри upload-ячейки,
      хоткей должен нажать именно её: крестик, загрузку, замену.
    */
    if (
      active &&
      selectedCell.contains(active) &&
      isTableUploadActionElement(active)
    ) {
      /*
        Если хоткей переназначили, старый Enter/Space больше
        не должен нативно нажимать кнопку.
      */
      if (isNativeTableActionKey(e) && !isTableCellActivateHotkey(e)) {
        stopTableActionKey(e);
        return;
      }

      if (!isTableCellActivateHotkey(e)) {
        return;
      }

      stopTableActionKey(e);
      active.click();
      return;
    }

    /*
      Если фокус просто на самой upload-ячейке,
      хоткей открывает загрузку/замену, но не удаление.
    */
    if (!isTableCellActivateHotkey(e)) {
      return;
    }

    const defaultAction = getDefaultUploadActionElement(selectedCell);
    if (!defaultAction) return;

    stopTableActionKey(e);
    defaultAction.click();
  }

  function ensureTableUploadCellsEnterHotkey() {
    if (document.__tableUploadCellsEnterHotkeyBound) return;

    document.__tableUploadCellsEnterHotkeyBound = true;

    document.addEventListener("keydown", handleTableUploadCellsEnter, true);
  }

  window.tableUploadHotkeys = {
    init: ensureTableUploadCellsEnterHotkey,
    getSelectedCell: getSelectedTableUploadCell,
  };

  window.ensureTableUploadCellsEnterHotkey = ensureTableUploadCellsEnterHotkey;
})();