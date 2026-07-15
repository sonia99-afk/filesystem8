// table_multi_select.js
// Единое мультивыделение строк в таблице.
//
// Поддерживает:
// - rangeUp / rangeDown                 → выделение внутри одного уровня
// - deepUp / deepDown                   → глубокое выделение по видимым строкам
// - branchRangeLeft / branchRangeRight → выделение по ветке
// - selectAll                           → выделить все видимые строки таблицы

(function () {
  if (typeof window === "undefined") return;

  const OWNER = "table-multi-select";

  const MODE = {
    RANGE: "range",
    DEEP: "deep",
    BRANCH: "branch",
    ALL: "all",
  };

  const state = {
    mode: null,
    anchorId: null,
    activeId: null,
    contextKey: null,
    branchKey: null,
    ids: new Set(),
  };

  function isTableViewActive() {
    const h = host();

    return (
      !!h?.querySelector?.(".structure-table") &&
      (!window.VIEW || window.currentView === window.VIEW.TABLE)
    );
  }

  function host() {
    return document.getElementById("tree");
  }

  function cssEscapeLocal(value) {
    const s = String(value || "");

    if (window.CSS && typeof CSS.escape === "function") {
      return CSS.escape(s);
    }

    return s.replace(/[^a-zA-Z0-9_\-]/g, "\\$&");
  }

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;

    const tag = (ae.tagName || "").toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      ae.isContentEditable ||
      !!ae.closest?.(".edit") ||
      !!ae.closest?.(".table-cell-editor") ||
      !!ae.closest?.(".table-rich-cell-editor") ||
      !!ae.closest?.(".table-duration-mask-editor") ||
      !!ae.closest?.(".table-dropdown-menu") ||
      !!ae.closest?.(".table-tag-compact-menu")
    );
  }

  function getNodeById(id) {
    if (!id || typeof findWithParent !== "function") return null;

    return findWithParent(root, id);
  }

  function getSelectedRowId() {
    const h = host();
    if (!h) return "";

    const selectedCell = h.querySelector("td.table-cell-selected");

    if (selectedCell?.dataset?.rowId) {
      return selectedCell.dataset.rowId;
    }

    if (window.selectedId) {
      return window.selectedId;
    }

    const selectedRow = h.querySelector(".row.sel[data-id]");

    if (selectedRow?.dataset?.id) {
      return selectedRow.dataset.id;
    }

    return "";
  }

  function rowById(id) {
    const h = host();
    if (!h || !id) return null;

    return h.querySelector(`.row[data-id="${cssEscapeLocal(id)}"]`);
  }

  function trById(id) {
    return rowById(id)?.closest?.("tr") || null;
  }

  function getRowIdFromTr(tr) {
    return tr?.querySelector?.(".row[data-id]")?.dataset?.id || "";
  }

  function getVisibleTableRows() {
    const h = host();
    if (!h) return [];

    return Array.from(h.querySelectorAll(".structure-table tbody tr")).filter(
      (tr) => !!getRowIdFromTr(tr)
    );
  }

  function getContextKeyForSameLevel(id) {
    const found = getNodeById(id);

    if (!found?.node) return null;

    return String(found.node.level);
  }

  function getRowsBySameLevel(id) {
    const h = host();
    if (!h || !id) return [];

    const found = getNodeById(id);
    if (!found?.node) return [];

    const targetLevel = found.node.level;

    return Array.from(h.querySelectorAll(".structure-table tbody tr")).filter(
      (tr) => {
        const rowId = getRowIdFromTr(tr);
        if (!rowId) return false;

        const info = getNodeById(rowId);

        return !!info?.node && info.node.level === targetLevel;
      }
    );
  }

  function buildAncestorChain(id) {
    const out = [];
    let cur = id;

    while (cur) {
      out.push(cur);

      if (typeof parentOf !== "function") break;

      cur = parentOf(cur);
    }

    out.reverse();

    return out;
  }

  function buildDescendantFirstChildChain(id) {
    const out = [];

    if (typeof firstChildOf !== "function") {
      return out;
    }

    let cur = firstChildOf(id);

    while (cur) {
      out.push(cur);
      cur = firstChildOf(cur);
    }

    return out;
  }

  function getRowsInBranchChain(branchKey) {
    if (!branchKey) return [];

    const ids = [
      ...buildAncestorChain(branchKey),
      ...buildDescendantFirstChildChain(branchKey),
    ];

    return ids.map((id) => trById(id)).filter(Boolean);
  }

  function clearClasses() {
    const h = host();
    if (!h) return;

    /*
      Старые следы от прошлых версий.
      В новой версии визуальное выделение живёт только на tr,
      а не на .row.multi.
    */
    h.querySelectorAll(".structure-table .row.multi, .structure-table .row.multi-anchor").forEach((row) => {
      row.classList.remove("multi");
      row.classList.remove("multi-anchor");
      row.removeAttribute("data-multi-owner");
    });

    h.querySelectorAll(".structure-table tbody tr").forEach((tr) => {
      tr.classList.remove("table-row-multi");
      tr.classList.remove("table-row-multi-anchor");
      tr.removeAttribute("data-table-multi-owner");
      tr.removeAttribute("data-table-multi-mode");
    });
  }

  function applyClasses() {
    if (!isTableViewActive()) return;

    clearClasses();

    for (const id of state.ids) {
      const tr = trById(id);

      if (!tr) continue;

      tr.classList.add("table-row-multi");
      tr.setAttribute("data-table-multi-owner", OWNER);

      if (state.mode) {
        tr.setAttribute("data-table-multi-mode", state.mode);
      }

      if (id === state.anchorId) {
        tr.classList.add("table-row-multi-anchor");
      }
    }
  }

  function reset() {
    state.mode = null;
    state.anchorId = null;
    state.activeId = null;
    state.contextKey = null;
    state.branchKey = null;
    state.ids.clear();

    clearClasses();
  }

  function selectCellForRow(id) {
    const h = host();
    if (!h || !id) return;

    const selectedCell = h.querySelector("td.table-cell-selected");
    const selectedColIndex = Number(selectedCell?.dataset?.colIndex || 0);

    const targetCell =
      h.querySelector(
        `td.table-cell[data-row-id="${cssEscapeLocal(id)}"][data-col-index="${selectedColIndex}"]`
      ) ||
      h.querySelector(
        `td.table-cell[data-row-id="${cssEscapeLocal(id)}"]`
      );

    if (targetCell) {
      window.tableCellNav?.selectCell?.(targetCell, {
        focus: true,
        scroll: false,
      });
    }
  }

  function focusAnchor() {
    if (!state.anchorId) return;

    window.selectedId = state.anchorId;
    window.treeHasFocus = true;

    selectCellForRow(state.anchorId);
  }

  function setRangeFromRows(rows, anchorId, activeId, mode, contextKey = null) {
    const anchorTr = trById(anchorId);
    const activeTr = trById(activeId);

    if (!anchorTr || !activeTr) return false;

    const anchorIndex = rows.indexOf(anchorTr);
    const activeIndex = rows.indexOf(activeTr);

    if (anchorIndex < 0 || activeIndex < 0) return false;

    const from = Math.min(anchorIndex, activeIndex);
    const to = Math.max(anchorIndex, activeIndex);

    state.mode = mode;
    state.anchorId = anchorId;
    state.activeId = activeId;
    state.contextKey = contextKey;
    state.ids = new Set(
      rows
        .slice(from, to + 1)
        .map(getRowIdFromTr)
        .filter(Boolean)
    );

    return true;
  }

  function handleRangeKey(dir) {
    if (!isTableViewActive()) return false;

    const currentId = getSelectedRowId();
    if (!currentId) return false;

    const contextKey = getContextKeyForSameLevel(currentId);
    if (!contextKey) return false;

    const rows = getRowsBySameLevel(currentId);
    const currentTr = trById(currentId);
    const currentIndex = rows.indexOf(currentTr);

    if (currentIndex < 0) return false;

    if (
      state.mode !== MODE.RANGE ||
      !state.anchorId ||
      state.contextKey !== contextKey
    ) {
      const nextTr = rows[currentIndex + dir];
      const nextId = getRowIdFromTr(nextTr);

      if (!nextId) return false;

      if (!setRangeFromRows(rows, currentId, nextId, MODE.RANGE, contextKey)) {
        return false;
      }

      focusAnchor();
      applyClasses();

      return true;
    }

    const activeTr = trById(state.activeId) || trById(state.anchorId);
    const activeIndex = rows.indexOf(activeTr);

    if (activeIndex < 0) return false;

    const nextActiveTr = rows[activeIndex + dir];
    const nextActiveId = getRowIdFromTr(nextActiveTr);

    if (!nextActiveId) return false;

    if (!setRangeFromRows(rows, state.anchorId, nextActiveId, MODE.RANGE, contextKey)) {
      return false;
    }

    focusAnchor();
    applyClasses();

    return true;
  }

  function handleDeepRangeKey(dir) {
    if (!isTableViewActive()) return false;

    const currentId = getSelectedRowId();
    if (!currentId) return false;

    const rows = getVisibleTableRows();
    const currentTr = trById(currentId);
    const currentIndex = rows.indexOf(currentTr);

    if (currentIndex < 0) return false;

    if (state.mode !== MODE.DEEP || !state.anchorId) {
      const nextTr = rows[currentIndex + dir];
      const nextId = getRowIdFromTr(nextTr);

      if (!nextId) return false;

      if (!setRangeFromRows(rows, currentId, nextId, MODE.DEEP, "deep")) {
        return false;
      }

      focusAnchor();
      applyClasses();

      return true;
    }

    const activeTr = trById(state.activeId) || trById(state.anchorId);
    const activeIndex = rows.indexOf(activeTr);

    if (activeIndex < 0) return false;

    const nextActiveTr = rows[activeIndex + dir];
    const nextActiveId = getRowIdFromTr(nextActiveTr);

    if (!nextActiveId) return false;

    if (!setRangeFromRows(rows, state.anchorId, nextActiveId, MODE.DEEP, "deep")) {
      return false;
    }

    focusAnchor();
    applyClasses();

    return true;
  }

  function handleBranchRangeKey(dir) {
    if (!isTableViewActive()) return false;

    const currentId = getSelectedRowId();
    if (!currentId) return false;

    const branchKey =
      state.mode === MODE.BRANCH && state.branchKey
        ? state.branchKey
        : currentId;

    const rows = getRowsInBranchChain(branchKey);
    const currentTr = trById(currentId);
    const currentIndex = rows.indexOf(currentTr);

    if (currentIndex < 0) return false;

    if (state.mode !== MODE.BRANCH || !state.anchorId) {
      const nextTr = rows[currentIndex + dir];
      const nextId = getRowIdFromTr(nextTr);

      if (!nextId) return false;

      state.branchKey = currentId;

      if (!setRangeFromRows(rows, currentId, nextId, MODE.BRANCH, "branch")) {
        return false;
      }

      focusAnchor();
      applyClasses();

      return true;
    }

    const activeTr = trById(state.activeId) || trById(state.anchorId);
    const activeIndex = rows.indexOf(activeTr);

    if (activeIndex < 0) return false;

    const nextActiveTr = rows[activeIndex + dir];
    const nextActiveId = getRowIdFromTr(nextActiveTr);

    if (!nextActiveId) return false;

    if (!setRangeFromRows(rows, state.anchorId, nextActiveId, MODE.BRANCH, "branch")) {
      return false;
    }

    focusAnchor();
    applyClasses();

    return true;
  }

  function handleSelectAll() {
    if (!isTableViewActive()) return false;

    const rows = getVisibleTableRows();
    if (!rows.length) return false;

    const ids = rows.map(getRowIdFromTr).filter(Boolean);
    if (!ids.length) return false;

    const currentId = getSelectedRowId();
    const anchorId = currentId && ids.includes(currentId) ? currentId : ids[0];

    state.mode = MODE.ALL;
    state.anchorId = anchorId;
    state.activeId = ids[ids.length - 1];
    state.contextKey = "all";
    state.branchKey = null;
    state.ids = new Set(ids);

    focusAnchor();
    applyClasses();

    return true;
  }

  function handleKeydown(e) {
    if (!isTableViewActive()) return;
    if (isEditingNow()) return;

    /*
      Browser-repeat глушим.
      Повтор зажатых хоткеев делает hotkey_hold_repeat.js напрямую
      через публичные методы ниже.
    */
    if (e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      return;
    }

    if (window.hotkeysMode === "custom") return;
    if (typeof isHotkey !== "function") return;

    if (isHotkey(e, "rangeUp")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleRangeKey(-1);
      return;
    }

    if (isHotkey(e, "rangeDown")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleRangeKey(+1);
      return;
    }

    if (isHotkey(e, "deepUp")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleDeepRangeKey(-1);
      return;
    }

    if (isHotkey(e, "deepDown")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleDeepRangeKey(+1);
      return;
    }

    if (isHotkey(e, "branchRangeLeft")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleBranchRangeKey(-1);
      return;
    }

    if (isHotkey(e, "branchRangeRight")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleBranchRangeKey(+1);
      return;
    }

    if (isHotkey(e, "selectAll")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      handleSelectAll();
      return;
    }
  }

  function handlePointerClear() {
    if (!isTableViewActive()) return;
    if (!state.ids.size) return;

    reset();
  }

  function patchRenderTableView() {
    if (window.renderTableView?.__tableMultiSelectPatched) return;
    if (typeof window.renderTableView !== "function") return;

    const original = window.renderTableView;

    window.renderTableView = function patchedRenderTableView() {
      const result = original.apply(this, arguments);

      requestAnimationFrame(() => {
        applyClasses();
      });

      return result;
    };

    window.renderTableView.__tableMultiSelectPatched = true;
  }

  function init() {
    if (document.__tableMultiSelectBound) return;

    document.__tableMultiSelectBound = true;

    patchRenderTableView();

    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("mousedown", handlePointerClear, true);

    if (isTableViewActive()) {
      requestAnimationFrame(() => {
        applyClasses();
      });
    }
  }

  const api = {
    init,
    clear: reset,
    reset,

    getIds() {
      return Array.from(state.ids);
    },

    has(id) {
      return state.ids.has(id);
    },

    size() {
      return state.ids.size;
    },

    getMode() {
      return state.mode;
    },

    handleRangeKey,
    handleDeepRangeKey,
    handleBranchRangeKey,
    handleSelectAll,

    debug() {
      return {
        mode: state.mode,
        anchorId: state.anchorId,
        activeId: state.activeId,
        contextKey: state.contextKey,
        branchKey: state.branchKey,
        ids: Array.from(state.ids),
      };
    },
  };

  window.tableMultiSelect = api;

  /*
    Алиасы для совместимости со старым кодом:
    table_cell_nav.js и hotkey_hold_repeat.js могли обращаться
    к tableMultiSelectTree / Deep / Branch.
  */
  window.tableMultiSelectTree = {
    init,
    clear: reset,
    getIds: api.getIds,
    has: api.has,
    size: api.size,
    handleRangeKey,
    handleSelectAll,
    debug: api.debug,
  };

  window.tableMultiSelectDeep = {
    init,
    clear: reset,
    getIds: api.getIds,
    has: api.has,
    size: api.size,
    handleDeepRangeKey,
    debug: api.debug,
  };

  window.tableMultiSelectBranch = {
    init,
    clear: reset,
    getIds: api.getIds,
    has: api.has,
    size: api.size,
    handleBranchRangeKey,
    debug: api.debug,
  };

  init();
})();