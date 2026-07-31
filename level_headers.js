// level_headers.js

(function () {
  if (typeof window === "undefined") return;

  window.__levelHeaderNames = window.__levelHeaderNames || Object.create(null);

  const MODES = {
    HEADER_ROW: "header-row",
    HEADER_CASCADE: "header-cascade",
    COLUMN_STACK: "column-stack",
    COLUMN_CASCADE: "column-cascade",
  };

  const DEFAULTS = {
    enabled: false,
    mode: MODES.HEADER_ROW,
  };

  const STORAGE_KEY = "org_structure_level_headers_v1";

  const state = {
    enabled: DEFAULTS.enabled,
    mode: DEFAULTS.mode,
  };

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
  
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;
  
      if (typeof saved.enabled === "boolean") {
        state.enabled = saved.enabled;
      }
  
      if (Object.values(MODES).includes(saved.mode)) {
        state.mode = saved.mode;
      }
  
      if (saved.names && typeof saved.names === "object") {
        window.__levelHeaderNames = { ...saved.names };
      }
    } catch (_) {}
  }
  
  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          enabled: state.enabled,
          mode: state.mode,
          names: window.__levelHeaderNames || {},
        })
      );
    } catch (_) {}
  }

  function getToggleBtn() {
    return document.getElementById("toggleLevelHeaders");
  }

  function getSettingsBtn() {
    return document.getElementById("levelHeadersSettingsBtn");
  }

  function getMenu() {
    return document.getElementById("levelHeadersMenu");
  }

  function closeMenu() {
    const menu = getMenu();
    const btn = getSettingsBtn();

    menu?.classList.remove("is-open");
    menu?.setAttribute("aria-hidden", "true");
    btn?.classList.remove("is-active");
  }

  function toggleMenu() {
    if (!state.enabled) return;

    const menu = getMenu();
    const btn = getSettingsBtn();
    if (!menu) return;

    const willOpen = !menu.classList.contains("is-open");

    menu.classList.toggle("is-open", willOpen);
    menu.setAttribute("aria-hidden", willOpen ? "false" : "true");
    btn?.classList.toggle("is-active", willOpen);
  }

function setState(nextState = {}) {
  const nextEnabled =
    typeof nextState.enabled ===
    "boolean"
      ? nextState.enabled
      : state.enabled;

  const nextMode =
    Object.values(MODES).includes(
      nextState.mode
    )
      ? nextState.mode
      : state.mode;

  const changed =
    state.enabled !== nextEnabled ||
    state.mode !== nextMode;

  state.enabled =
    nextEnabled;

  state.mode =
    nextMode;

  if (!state.enabled) {
    closeMenu();
  }

  syncToolbar();
  saveState();

  /*
    Режим и включённость применяются
    одним общим рендером.
  */

  if (
    changed &&
    typeof render === "function"
  ) {
    render();
  }
}

function setEnabled(value) {
  setState({
    enabled: !!value,
  });
}

function toggleEnabled() {
  setEnabled(
    !state.enabled
  );
}

function setMode(mode) {
  if (
    !Object.values(MODES).includes(
      mode
    )
  ) {
    return;
  }

  setState({
    mode,
  });
}

  function syncToolbar() {
    const toggleBtn = getToggleBtn();
    const settingsBtn = getSettingsBtn();
    const menu = getMenu();

    if (toggleBtn) {
      toggleBtn.classList.toggle("is-active", state.enabled);
      toggleBtn.title = state.enabled
        ? UI.labels.levelHeaders.disable
        : UI.labels.levelHeaders.enable;
    }

    if (settingsBtn) {
      settingsBtn.disabled = !state.enabled;
      settingsBtn.classList.toggle("is-inactive", !state.enabled);
      settingsBtn.title = state.enabled
        ? UI.labels.levelHeaders.settings
        : UI.labels.levelHeaders.needEnable;
    }

    if (menu) {
      menu.querySelectorAll("[data-level-header-mode]").forEach((item) => {
        item.classList.toggle(
          "is-active",
          item.dataset.levelHeaderMode === state.mode
        );
      });
    }
  }

  function bindToolbar() {
    const toggleBtn = getToggleBtn();
    const settingsBtn = getSettingsBtn();
    const menu = getMenu();

    if (toggleBtn && !toggleBtn.__levelHeadersBound) {
      toggleBtn.__levelHeadersBound = true;

      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleEnabled();
      });
    }

    if (settingsBtn && !settingsBtn.__levelHeadersBound) {
      settingsBtn.__levelHeadersBound = true;

      settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
      });
    }

    if (menu && !menu.__levelHeadersBound) {
      menu.__levelHeadersBound = true;

      menu.addEventListener("click", (e) => {
        e.stopPropagation();

        const item = e.target?.closest?.("[data-level-header-mode]");
        if (!item) return;

        setMode(item.dataset.levelHeaderMode);
        closeMenu();
      });
    }

    if (!document.__levelHeadersOutsideBound) {
      document.__levelHeadersOutsideBound = true;

      document.addEventListener("click", (e) => {
        const tools = document.getElementById("levelHeadersTools");
        if (tools && tools.contains(e.target)) return;
        closeMenu();
      });
    }

    syncToolbar();
  }

  function setLevelTitle(level, title) {
    window.__levelHeaderNames ||= Object.create(null);
  
    const oldDefaultTitle =
      window.__levelHeaderNames[level] ??
      DEFAULT_NAME?.[level] ??
      `Уровень ${level}`;
  
    const rawValue = String(title ?? "");
  
    const newTitle =
      rawValue === ""
        ? (DEFAULT_NAME?.[level] ?? `Уровень ${level}`)
        : rawValue;
  
    if (rawValue === "") {
      delete window.__levelHeaderNames[level];
    } else {
      window.__levelHeaderNames[level] = rawValue;
    }
  
    updateDefaultNamedNodes(level, oldDefaultTitle, newTitle);
    saveState();
  }

  function updateDefaultNamedNodes(level, oldTitle, newTitle) {
    if (!root) return;
  
    (function walk(node) {
      if (!node) return;
  
      if (
        node.level === Number(level) &&
        !node.nameHtml &&
        (node.name === oldTitle ||
          node.name === DEFAULT_NAME?.[level] ||
          node.name === `Уровень ${level}`)
      ) {
        node.name = newTitle;
      }
  
      (node.children || []).forEach(walk);
    })(root);
  }

  function getLevelTitle(level) {
    if (window.__levelHeaderNames && level in window.__levelHeaderNames) {
      return window.__levelHeaderNames[level];
    }

    return DEFAULT_NAME?.[level] ?? `Уровень ${level}`;
  }

  function startLevelTitleEdit(item, level) {
    const input = document.createElement("input");
    input.className = "level-header-edit";
    input.value = getLevelTitle(level);
    input.dataset.level = String(level);

    if (!item.classList.contains("level-header-mini-item")) {
      input.style.left = item.style.left;
      input.style.top = item.style.top || "0px";
    }

    const editWidth = Math.max(160, input.value.length * 9 + 24);
    input.style.width = `${editWidth}px`;

    const oldLeft = parseFloat(item.style.left) || 0;
    const oldWidth = parseFloat(item.style.width) || item.offsetWidth;
    const extra = Math.max(0, editWidth - oldWidth);

    const row = item.closest(".level-headers-row");
    if (row && extra > 0) {
      const levelItems = Array.from(row.querySelectorAll(".level-header-item"));

      levelItems.forEach((nextItem) => {
        const nextLeft = parseFloat(nextItem.style.left) || 0;

        if (nextLeft > oldLeft) {
          nextItem.style.left = `${nextLeft + extra}px`;
        }
      });
    }

    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("mousedown", (e) => e.stopPropagation());
    input.addEventListener("pointerdown", (e) => e.stopPropagation());

    let committed = false;

    item.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      if (committed) return;
      committed = true;
      setLevelTitle(level, input.value);

      if (typeof render === "function") render();
    }

    function cancel() {
      if (committed) return;
      committed = true;

      if (typeof render === "function") render();
    }

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();

      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    });

    input.addEventListener("blur", commit);
  }

  function getDisplayRoot() {
    return window.objectFocus?.getFocusedRootNode?.() || root;
  }

  function getVisibleLevelsForCurrentRoot() {
    const displayRoot = getDisplayRoot();
    const levels = [];

    (function walk(node) {
      if (!node) return;
      if (!levels.includes(node.level)) levels.push(node.level);
      (node.children || []).forEach(walk);
    })(displayRoot);

    return levels;
  }

  function getVisibleLevelsForSchema() {
    return getVisibleLevelsForCurrentRoot();
  }

  function flattenCurrentRoot(out = []) {
    const displayRoot = getDisplayRoot();

    (function walk(node) {
      if (!node) return;
      out.push(node);
      (node.children || []).forEach(walk);
    })(displayRoot);

    return out;
  }

  function makeEditableLevelItem(level, className) {
    const item = document.createElement("span");
    item.className = className;
    item.dataset.level = String(level);
    item.textContent = getLevelTitle(level);
    item.title = "Клик для переименования";

    item.addEventListener("pointerdown", (e) => e.stopPropagation());
    item.addEventListener("mousedown", (e) => e.stopPropagation());

    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startLevelTitleEdit(item, level);
    });

    return item;
  }

  function buildHeaderRowForSchema() {
    if (!state.enabled) return null;
    if (state.mode !== MODES.HEADER_ROW) return null;
    if (currentView !== VIEW.SCHEMA) return null;

    const levels = getVisibleLevelsForSchema();

    const row = document.createElement("div");
    row.className = "level-headers-row level-headers-row-schema";

    levels.forEach((level) => {
      row.appendChild(makeEditableLevelItem(level, "level-header-item"));
    });

    return row;
  }

  function buildHeaderCascadeForSchema() {
    if (!state.enabled) return null;
    if (state.mode !== MODES.HEADER_CASCADE) return null;
    if (currentView !== VIEW.SCHEMA) return null;

    const levels = getVisibleLevelsForSchema();

    const wrap = document.createElement("div");
    wrap.className = "level-headers-cascade level-headers-cascade-schema";

    let currentList = document.createElement("ul");
    currentList.className = "level-header-mini-tree";

    wrap.appendChild(currentList);

    levels.forEach((level) => {
      const li = document.createElement("li");
      li.className = "level-header-mini-li";

      const item = makeEditableLevelItem(level, "level-header-mini-item");
      li.appendChild(item);

      const childList = document.createElement("ul");
      childList.className = "level-header-mini-tree";
      li.appendChild(childList);

      currentList.appendChild(li);
      currentList = childList;
    });

    return wrap;
  }

  function buildColumnStackForSchema() {
    if (!state.enabled) return null;
    if (state.mode !== MODES.COLUMN_STACK) return null;
    if (currentView !== VIEW.SCHEMA) return null;

    const displayRoot = getDisplayRoot();

    const col = document.createElement("div");
    col.className = "level-headers-column level-headers-column-stack";

    (function walk(node) {
      if (!node) return;

      const item = makeEditableLevelItem(node.level, "level-header-column-item");
      col.appendChild(item);

      (node.children || []).forEach(walk);
    })(displayRoot);

    return col;
  }

  function buildColumnCascadeForSchema() {
    if (!state.enabled) return null;
    if (state.mode !== MODES.COLUMN_CASCADE) return null;
    if (currentView !== VIEW.SCHEMA) return null;

    const displayRoot = getDisplayRoot();

    const col = document.createElement("div");
    col.className = "level-headers-column level-headers-column-cascade";

    let currentList = document.createElement("ul");
    currentList.className = "level-header-mini-tree";
    currentList.dataset.level = String(displayRoot.level);
    col.appendChild(currentList);

    (function walk(node, list) {
      if (!node) return;

      const li = document.createElement("li");
      li.className = "level-header-mini-li";

      const anchor = document.createElement("span");
      anchor.className = "level-header-anchor";
      li.appendChild(anchor);

      const item = makeEditableLevelItem(node.level, "level-header-mini-item");
      li.appendChild(item);

      const childList = document.createElement("ul");
      childList.className = "level-header-mini-tree";
      childList.dataset.level = String(node.level + 1);
      li.appendChild(childList);

      list.appendChild(li);

      (node.children || []).forEach((child) => {
        walk(child, childList);
      });
    })(displayRoot, currentList);

    return col;
  }

  function buildHeaderRowForTable() {
    const row = document.createElement("div");
    row.className = "level-headers-row level-headers-row-table";
  
    const item = document.createElement("span");
    item.className = "level-header-item level-header-na";
    item.textContent = "N/A";
  
    row.appendChild(item);
  
    return row;
  }

  function buildHeaderCascadeForTable() {
    const levels = getVisibleLevelsForCurrentRoot();
  
    const wrap = document.createElement("div");
    wrap.className = "level-headers-cascade level-headers-cascade-table";

    let currentList = document.createElement("ul");
    currentList.className = "level-header-mini-tree";
    wrap.appendChild(currentList);

    levels.forEach((level) => {
      const li = document.createElement("li");
      li.className = "level-header-mini-li";

      const item = makeEditableLevelItem(level, "level-header-mini-item");
      li.appendChild(item);

      const childList = document.createElement("ul");
      childList.className = "level-header-mini-tree";
      li.appendChild(childList);

      currentList.appendChild(li);
      currentList = childList;
    });

    return wrap;
  }

  function buildColumnStackForTable() {
    const nodes = flattenCurrentRoot();
  
    const col = document.createElement("div");
    col.className =
      "level-headers-column level-headers-column-table level-headers-column-stack-table";

    nodes.forEach((node) => {
      const item = makeEditableLevelItem(node.level, "level-header-column-item");
      col.appendChild(item);
    });

    return col;
  }

  function buildColumnCascadeForTable() {
    const displayRoot = getDisplayRoot();
  
    const col = document.createElement("div");
    col.className =
      "level-headers-column level-headers-column-cascade level-headers-column-table level-headers-column-cascade-table";

    let currentList = document.createElement("ul");
    currentList.className = "level-header-mini-tree";
    currentList.dataset.level = String(displayRoot.level);
    col.appendChild(currentList);

    (function walk(node, list) {
      if (!node) return;

      const li = document.createElement("li");
      li.className = "level-header-mini-li";

      const anchor = document.createElement("span");
      anchor.className = "level-header-anchor";
      li.appendChild(anchor);

      const item = makeEditableLevelItem(node.level, "level-header-mini-item");
      li.appendChild(item);

      const childList = document.createElement("ul");
      childList.className = "level-header-mini-tree";
      childList.dataset.level = String(node.level + 1);
      li.appendChild(childList);

      list.appendChild(li);

      (node.children || []).forEach((child) => {
        walk(child, childList);
      });
    })(displayRoot, currentList);

    return col;
  }

  function mountTableHeaders() {
    if (!state.enabled) return;
    if (typeof VIEW === "undefined" || currentView !== VIEW.TABLE) return;

    const wrap = document.querySelector("#tree .table-view");
    if (!wrap) return;

    if (wrap.querySelector(":scope > .level-headers-table-mounted")) return;

    const table = wrap.querySelector(":scope > .structure-table");
    if (!table) return;

    let block = null;
    let position = "top";

    if (state.mode === MODES.HEADER_ROW) {
      block = buildHeaderRowForTable();
      position = "top";
    }

    if (state.mode === MODES.HEADER_CASCADE) {
      block = buildHeaderCascadeForTable();
      position = "top";
    }

    if (state.mode === MODES.COLUMN_STACK) {
      block = buildColumnStackForTable();
      position = "left";
    }

    if (state.mode === MODES.COLUMN_CASCADE) {
      block = buildColumnCascadeForTable();
      position = "left";
    }

    if (!block) return;

    block.classList.add("level-headers-table-mounted");

    if (position === "top") {
      wrap.insertBefore(block, table);
      return;
    }

    const layout = document.createElement("div");
layout.className = "table-with-level-headers level-headers-table-mounted";
    wrap.insertBefore(layout, table);
    layout.appendChild(block);
    layout.appendChild(table);

    requestAnimationFrame(() => {
      layoutColumnCascadeLines();
    });
  }

  function mountForCurrentView() {
    mountTableHeaders();
  }

  function layoutColumnCascadeLines() {
    const rootCol = document.querySelector(".level-headers-column-cascade");
    if (!rootCol) return;

    rootCol.querySelectorAll(".level-header-trunk, .level-header-plink").forEach((el) => {
      el.remove();
    });

    const uls = rootCol.querySelectorAll("ul.level-header-mini-tree[data-level]");

    for (const ul of uls) {
      const items = Array.from(ul.children).filter((el) => el.tagName === "LI");
      if (!items.length) continue;

      const first = items[0].querySelector(":scope > .level-header-anchor");
      const last = items[items.length - 1].querySelector(":scope > .level-header-anchor");
      if (!first || !last) continue;

      const ulBox = ul.getBoundingClientRect();
      const fBox = first.getBoundingClientRect();
      const lBox = last.getBoundingClientRect();

      const top = fBox.top - ulBox.top;
      const height = lBox.top - ulBox.top - top;

      if (height <= 0) continue;

      const trunk = document.createElement("div");
      trunk.className = "level-header-trunk";
      trunk.style.top = `${top}px`;
      trunk.style.height = `${height}px`;

      ul.prepend(trunk);
    }

    const lis = rootCol.querySelectorAll("li.level-header-mini-li");

    for (const li of lis) {
      const childUl = li.querySelector(":scope > ul.level-header-mini-tree[data-level]");
      if (!childUl) continue;

      const parentAnchor = li.querySelector(":scope > .level-header-anchor");
      if (!parentAnchor) continue;

      const items = Array.from(childUl.children).filter((el) => el.tagName === "LI");
      if (!items.length) continue;

      const firstChildAnchor = items[0].querySelector(":scope > .level-header-anchor");
      if (!firstChildAnchor) continue;

      const liBox = li.getBoundingClientRect();
      const pBox = parentAnchor.getBoundingClientRect();
      const cBox = firstChildAnchor.getBoundingClientRect();
      const ulBox = childUl.getBoundingClientRect();

      const plink = document.createElement("div");
      plink.className = "level-header-plink";

      const top = pBox.top - liBox.top + 9;
      const childY = cBox.top - liBox.top;

      plink.style.left = `12px`;
      plink.style.top = `${top}px`;
      plink.style.height = `${Math.max(0, childY - top)}px`;

      li.appendChild(plink);
    }
  }

  function alignHeaderRowForSchema() {
    const row = document.querySelector(".level-headers-row-schema");
    const tree = document.getElementById("tree");

    if (!row || !tree) return;

    if (row.classList.contains("level-headers-cascade")) {
      return;
    }

    const items = Array.from(row.querySelectorAll(".level-header-item"));
    const treeRows = Array.from(tree.querySelectorAll("ul li > .row[data-id]"));

    if (!items.length || !treeRows.length) return;

    const treeBox = tree.getBoundingClientRect();

    items.forEach((item) => {
      const level = Number(item.dataset.level);

      const matchingRow = treeRows.find((r) => {
        const id = r.dataset.id;
        const found = findWithParent(root, id);
        return found?.node?.level === level;
      });

      if (!matchingRow) return;

      const box = matchingRow.getBoundingClientRect();
      const left = Math.round(box.left - treeBox.left);

      item.style.left = `${left}px`;
    });

    for (let i = 0; i < items.length; i++) {
      const current = items[i];
      const next = items[i + 1];

      const currentLeft = parseFloat(current.style.left) || 0;
      const nextLeft = next ? parseFloat(next.style.left) || 0 : currentLeft + 160;

      current.style.width = `${Math.max(24, nextLeft - currentLeft)}px`;
    }

    row.style.height = "24px";
  }

  function patchRenderOnce() {
    if (typeof window.render !== "function") return;
    if (window.render.__levelHeadersMountedPatch) return;

    const originalRender = window.render;

    window.render = function patchedRenderWithLevelHeaders() {
      const result = originalRender.apply(this, arguments);

      requestAnimationFrame(() => {
        mountForCurrentView();
      });

      return result;
    };

    window.render.__levelHeadersMountedPatch = true;
  }

  function init() {
    loadSavedState();
    bindToolbar();
    patchRenderOnce();

    requestAnimationFrame(() => {
      mountForCurrentView();
    });
  }

  window.levelHeaders = {
    MODES,

    buildHeaderRowForSchema,
    buildHeaderCascadeForSchema,
    alignHeaderRowForSchema,
    buildColumnStackForSchema,
    buildColumnCascadeForSchema,
    layoutColumnCascadeLines,

    mountForCurrentView,
    createEditableItem: makeEditableLevelItem,

    getState() {
      return { ...state };
    },

    isEnabled() {
      return !!state.enabled;
    },

    getMode() {
      return state.mode;
    },

    getLevelTitle,
    setLevelTitle,

    setState,
    setEnabled,
    setMode,
    refresh: syncToolbar,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();