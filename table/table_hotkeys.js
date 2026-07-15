// table_hotkeys.js
// Глобальные объектные хоткеи в табличном режиме.
//
// Этот файл отвечает НЕ за перемещение активной ячейки,
// а за действия над выбранным объектом таблицы:
// undo / redo / delete / add / move / focus in-out.

(function () {
  if (typeof window === "undefined") return;

  function isTableViewActiveForHotkeys() {
    const host = document.getElementById("tree");

    return !!(
      host &&
      host.querySelector(".structure-table") &&
      (!window.VIEW || window.currentView === window.VIEW.TABLE)
    );
  }

  function isTypingTarget(el) {
    if (!el) return false;

    const tag = (el.tagName || "").toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      el.isContentEditable ||
      el.classList?.contains("edit") ||
      !!el.closest?.(".edit") ||
      !!el.closest?.(".table-cell-editor") ||
      !!el.closest?.(".table-rich-cell-editor") ||
      !!el.closest?.(".table-duration-mask-editor") ||
      !!el.closest?.(".table-dropdown-menu") ||
      !!el.closest?.(".table-tag-compact-menu") ||
      !!el.closest?.(".table-composite-datetime-editor")
    );
  }

  function isInnerControlTarget(el) {
    if (!el) return false;

    return !!el.closest?.(
      [
        "button",
        "input",
        "textarea",
        "select",
        "label",
        "a",
        "[contenteditable='true']",
        ".edit",
        ".table-cell-editor",
        ".table-rich-cell-editor",
        ".table-duration-mask-editor",
        ".table-dropdown-menu",
        ".table-tag-compact-menu",
        ".table-tag-compact-editor",
        ".table-composite-datetime-editor",
      ].join(",")
    );
  }

  function shouldIgnoreHotkeyEvent(e) {
    return (
      window.hotkeysMode === "custom" ||
      !isTableViewActiveForHotkeys() ||
      typeof isHotkey !== "function" ||
      isTypingTarget(document.activeElement) ||
      isTypingTarget(e.target) ||
      isInnerControlTarget(document.activeElement) ||
      isInnerControlTarget(e.target)
    );
  }

  function stopTableGlobalHotkey(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
  }

  function getSelectedTableCell() {
    const host = document.getElementById("tree");
    if (!host) return null;

    return host.querySelector("td.table-cell-selected");
  }

  function getTableRowNodeIdFromTr(tr) {
    if (!tr) return "";

    return (
      tr.querySelector?.(".row[data-id]")?.dataset?.id ||
      tr.querySelector?.("td[data-id]")?.dataset?.id ||
      ""
    );
  }

  function getSelectedTableNodeId() {
    const selectedCell = getSelectedTableCell();

    if (selectedCell) {
      const idFromCell =
        selectedCell.dataset.rowId ||
        selectedCell.dataset.id ||
        "";

      if (idFromCell) return idFromCell;

      const idFromRow = getTableRowNodeIdFromTr(selectedCell.closest("tr"));

      if (idFromRow) return idFromRow;
    }

    return window.selectedId || "";
  }

  function getSelectedTableNode() {
    const id = getSelectedTableNodeId();
    if (!id) return null;

    const found =
      typeof findWithParent === "function"
        ? findWithParent(root, id)
        : null;

    return found?.node || null;
  }

  function withSelectedTableNode(fn) {
    const node = getSelectedTableNode();
    if (!node) return false;

    window.selectedId = node.id;
    window.treeHasFocus = true;

    fn(node);

    return true;
  }

  function runSelectedNodeAction(e, action) {
    if (!withSelectedTableNode(action)) return false;

    stopTableGlobalHotkey(e);
    return true;
  }

  function getFocusedRootId() {
    return window.objectFocus?.getFocusedRootId?.() || null;
  }

  function isInsideFocusedObject() {
    const focusedRootId = getFocusedRootId();

    return !!(
      focusedRootId &&
      focusedRootId !== root?.id
    );
  }

  function focusOutFromTable() {
    if (!isInsideFocusedObject()) {
      return false;
    }

    const focusedRootId = getFocusedRootId();

    const parentId =
      typeof parentOf === "function"
        ? parentOf(focusedRootId)
        : null;

    window.objectFocus?.focusOutTo?.(parentId || null);

    return true;
  }

  function handleUndoRedo(e) {
    if (isHotkey(e, "undo")) {
      stopTableGlobalHotkey(e);
      undo?.();
      return true;
    }

    if (isHotkey(e, "redo")) {
      stopTableGlobalHotkey(e);
      redo?.();
      return true;
    }

    return false;
  }

  function handleAddDeleteHotkeys(e) {
    if (isHotkey(e, "delete")) {
      return runSelectedNodeAction(e, () => {
        removeSelected?.();
      });
    }

    if (isHotkey(e, "addCaption")) {
      return runSelectedNodeAction(e, (node) => {
        addCaption?.(node.id);
      });
    }

    if (isHotkey(e, "addChild")) {
      return runSelectedNodeAction(e, (node) => {
        addChild?.(node.id);
      });
    }

    if (isHotkey(e, "addSibling")) {
      return runSelectedNodeAction(e, (node) => {
        const focusedRootId = getFocusedRootId();
        const isFocusedRoot = !!focusedRootId && focusedRootId === node.id;

        /*
          Если мы стоим на корне текущего focus-режима,
          сосед рядом с ним добавлять нельзя/неудобно.
          Поэтому добавляем первого ребёнка внутрь него.
        */
        if (isFocusedRoot) {
          addChild?.(node.id);
        } else {
          addSibling?.(node.id);
        }
      });
    }

    return false;
  }

  function handleMoveHotkeys(e) {
    if (isHotkey(e, "levelMoveUp")) {
      return runSelectedNodeAction(e, () => {
        window.levelMove?.up?.();
      });
    }

    if (isHotkey(e, "levelMoveDown")) {
      return runSelectedNodeAction(e, () => {
        window.levelMove?.down?.();
      });
    }

    if (isHotkey(e, "branchMoveLeft")) {
      return runSelectedNodeAction(e, () => {
        window.branchMove?.left?.();
      });
    }

    if (isHotkey(e, "branchMoveRight")) {
      return runSelectedNodeAction(e, () => {
        window.branchMove?.right?.();
      });
    }

    return false;
  }

  function handleObjectFocusHotkeys(e) {
    if (isHotkey(e, "focusIntoObject")) {
      return runSelectedNodeAction(e, (node) => {
        window.objectFocus?.focusInto?.(node.id);
      });
    }

    if (isHotkey(e, "focusOutObject")) {
      /*
        Важно:
        выход наружу работает только если мы реально внутри focus-режима.
        Если focusedRootId нет — ничего не делаем.
      */
      if (!focusOutFromTable()) {
        return false;
      }

      stopTableGlobalHotkey(e);
      return true;
    }

    return false;
  }

  function handleTableObjectHotkeys(e) {
    if (shouldIgnoreHotkeyEvent(e)) return;

    const selectedCell = getSelectedTableCell();
    if (!selectedCell) return;

    if (handleUndoRedo(e)) return;
    if (handleAddDeleteHotkeys(e)) return;
    if (handleMoveHotkeys(e)) return;
    if (handleObjectFocusHotkeys(e)) return;
  }

  function init() {
    if (document.__tableObjectHotkeysBound) return;

    document.__tableObjectHotkeysBound = true;

    document.addEventListener("keydown", handleTableObjectHotkeys, true);
  }

  window.tableHotkeys = {
    init,
    getSelectedTableCell,
    getSelectedTableNodeId,
    getSelectedTableNode,
  };

  init();
})();