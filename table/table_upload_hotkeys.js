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
  if (isTableUploadTypingTarget(e.target)) {
    return;
  }

  const selectedCell =
    getSelectedTableUploadCell();

  if (!selectedCell) return;

  const active =
    document.activeElement;

  const isActivateHotkey =
    isTableCellActivateHotkey(e);

  /*
    Если обычный Enter или Space больше
    не являются назначенным хоткеем,
    не разрешаем им нативно нажимать кнопку.
  */
  if (
    isNativeTableActionKey(e) &&
    !isActivateHotkey &&
    active &&
    selectedCell.contains(active) &&
    isTableUploadActionElement(active)
  ) {
    stopTableActionKey(e);
    return;
  }

  if (!isActivateHotkey) {
    return;
  }

  /*
    Режим 2:
    фокус уже находится на кнопке внутри ячейки.

    Повторный хоткей нажимает именно эту кнопку:
    - загрузить;
    - добавить;
    - заменить;
    - удалить файл или изображение.
  */
  if (
    active &&
    selectedCell.contains(active) &&
    isTableUploadActionElement(active)
  ) {
    stopTableActionKey(e);

    active.click();

    return;
  }

  /*
    Режим 1:
    фокус находится на самой ячейке.

    Первый хоткей ничего не открывает,
    а только переводит фокус на основную
    кнопку загрузки / добавления / замены.
  */
  const defaultAction =
    getDefaultUploadActionElement(
      selectedCell
    );

  if (!defaultAction) return;

  stopTableActionKey(e);

  defaultAction.focus({
    preventScroll: true,
  });
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