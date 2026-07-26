// app2.js
// Страничная логика основного редактора.
// Требует подключения app_core.js перед этим файлом.

if (!window.root || !window.VIEW || typeof window.snapshot !== "function") {
  console.error("app2.js: сначала подключи app_core.js");
}

function syncViewButtons() {
  document.getElementById("modeStd")?.classList.toggle("is-active", currentView === VIEW.SCHEMA);
  document.getElementById("modeHierarchy")?.classList.toggle("is-active", currentView === VIEW.HIERARCHY);
  document.getElementById("modeAicycle")?.classList.toggle("is-active", currentView === VIEW.AICYCLE);
  document.getElementById("modeTable")?.classList.toggle("is-active", currentView === VIEW.TABLE);
  document.getElementById("modeList")?.classList.toggle("is-active", currentView === VIEW.LIST);
  document.getElementById("modeText")?.classList.toggle("is-active", currentView === VIEW.TEXT);
}

function setCurrentView(view) {
  if (view === VIEW.TABLE || view === "table") {
    window.appRouter?.open?.("table");
    return;
  }

  currentView = view || VIEW.SCHEMA;

  if (currentView === VIEW.AICYCLE) {
    viewOrientation = VIEW_ORIENTATION.HORIZONTAL;
  }

  document.body.classList.toggle("view-hierarchy", currentView === VIEW.HIERARCHY);
  document.body.classList.toggle("view-schema", currentView === VIEW.SCHEMA);

  if (currentView === VIEW.TEXT) {
    if (typeof setTelegramMode === "function") {
      setTelegramMode(true);
    }
  
    syncViewButtons();
    return;
  }
  
  if (typeof setTelegramMode === "function") {
    setTelegramMode(false);
  }
  
  render();
  syncViewButtons();
}

function syncViewOrientationButtons() {
  document.getElementById("hierarchyHorizontalBtn")?.classList.toggle(
    "is-active",
    viewOrientation === VIEW_ORIENTATION.HORIZONTAL
  );

  document.getElementById("hierarchyVerticalBtn")?.classList.toggle(
    "is-active",
    viewOrientation === VIEW_ORIENTATION.VERTICAL
  );
}

function setViewOrientation(orientation) {
  viewOrientation = orientation || VIEW_ORIENTATION.VERTICAL;
  render();
  syncViewOrientationButtons();
}

/* ======== Navigation ======== */

function isSelectableVisibleId(id) {
  if (!id) return false;

  // скрытые через [x] объекты нельзя выбирать
  if (window.hideNodes?.isHidden?.(id)) {
    return false;
  }

  if (isMarkHiddenId(id)) {
    return false;
  }

  // объекты вне режима фокуса нельзя выбирать
  if (window.objectFocus?.isInsideFocusedRoot?.(id) === false) {
    return false;
  }

  // дети свернутого объекта нельзя выбирать
  if (hasCollapsedAncestor(id)) {
    return false;
  }

  return true;
}

function nearestVisibleAncestor(id) {
  if (!id || typeof findWithParent !== "function") return null;

  let found = findWithParent(root, id);
  let parent = found?.parent || null;

  while (parent) {
    if (isSelectableVisibleId(parent.id)) {
      return parent.id;
    }

    found = findWithParent(root, parent.id);
    parent = found?.parent || null;
  }

  return null;
}

function ensureSelectedVisible() {
  if (isSelectableVisibleId(selectedId)) return;

  const ancestor = nearestVisibleAncestor(selectedId);

  if (ancestor) {
    selectedId = ancestor;
    return;
  }

  const flat = typeof flatten === "function" ? flatten() : [];
  const firstVisible = flat.find(isSelectableVisibleId);

  if (firstVisible) {
    selectedId = firstVisible;
  }
}

window.ensureSelectedVisible = ensureSelectedVisible;

function firstVisibleDescendantOf(id) {
  const found = findWithParent(root, id);
  if (!found?.node) return null;

  let result = null;

  function walk(node) {
    if (!node || result) return;

    if (node.id !== id && isSelectableVisibleId(node.id)) {
      result = node.id;
      return;
    }

    for (const child of node.children || []) {
      walk(child);
      if (result) return;
    }
  }

  walk(found.node);

  return result;
}

function nearestVisibleFromFlat(fromId, dir) {
  const flat = flatten();
  const idx = flat.indexOf(fromId);

  if (idx < 0) {
    return flat.find(isSelectableVisibleId) || null;
  }

  for (let i = idx + dir; i >= 0 && i < flat.length; i += dir) {
    if (isSelectableVisibleId(flat[i])) {
      return flat[i];
    }
  }

  return null;
}

function hasCollapsedAncestor(id) {
  if (!id || typeof findWithParent !== "function") return false;

  let found = findWithParent(root, id);
  let parent = found?.parent || null;

  while (parent) {
    if (window.collapseNodes?.isCollapsed?.(parent.id)) {
      return true;
    }

    found = findWithParent(root, parent.id);
    parent = found?.parent || null;
  }

  return false;
}

function isMarkHiddenId(id) {
  if (!id) return false;

  if (window.__markHiddenMap?.[id]) {
    return true;
  }

  const h = document.getElementById("tree");
  if (!h) return false;

  const row = h.querySelector(`.row[data-id="${cssEscape(id)}"]`);
  if (!row) return false;

  const holder = row.closest("li, tr");

  return !!holder?.classList.contains("mark-hidden-object");
}

function updateSchemaSelectionWithoutRender() {
  const tree = document.getElementById("tree");
  if (!tree || !selectedId) return false;

  const previousRow = tree.querySelector(".row.sel");

  if (previousRow) {
    previousRow.classList.remove("sel");
  }

  const nextRow = tree.querySelector(
    `.row[data-id="${cssEscape(selectedId)}"]`
  );

  if (!nextRow) {
    return false;
  }

  nextRow.classList.add("sel");

  if (treeHasFocus) {
    nextRow.focus({
      preventScroll: true,
    });
  }

  window.schemaAutoscroll?.scrollSelectedIntoView?.();

  return true;
}

function moveSelection(dir) {
  const flat = flatten();
  const visible = flat.filter(isSelectableVisibleId);

  if (!visible.length) return;

  const visibleIdx = visible.indexOf(selectedId);

  let next = null;

  if (visibleIdx >= 0) {
    next = visible[visibleIdx + dir];
  } else {
    next = visible[0];
  }

  if (!next) return;

  selectedId = next;
  treeHasFocus = true;

  /*
    В обычной структуре не перестраиваем всё дерево.
    Меняем только активную строку и запускаем автоскролл.
  */
  if (currentView === VIEW.SCHEMA) {
    const updated = updateSchemaSelectionWithoutRender();

    if (updated) {
      return;
    }
  }

  /*
    Для других режимов пока сохраняем прежнее поведение.
  */
  render();
}

function goParent(fromId) {
  let p = parentOf(fromId);

  while (p) {
    if (isSelectableVisibleId(p)) {
      selectedId = p;
      treeHasFocus = true;

      if (
        currentView === VIEW.SCHEMA &&
        updateSchemaSelectionWithoutRender()
      ) {
        return;
      }

      render();
      return;
    }

    p = parentOf(p);
  }
}

function goDeeper(fromId) {
  const deeper = firstVisibleDescendantOf(fromId);

  if (!deeper) return;

  selectedId = deeper;
  treeHasFocus = true;

  if (
    currentView === VIEW.SCHEMA &&
    updateSchemaSelectionWithoutRender()
  ) {
    return;
  }

  render();
}

/* ======== Render ======== */

// function focusSelectedRow() {
//   if (!treeHasFocus) return;
//   const host = document.getElementById('tree');
//   const r = host.querySelector(`.row[data-id="${cssEscape(selectedId)}"]`);
//   if (!r) return;
//   r.focus({ preventScroll: true });
// }

function focusSelectedRow() {
  if (!treeHasFocus) return;

  const host = document.getElementById("tree");
  const r = host.querySelector(`.row[data-id="${cssEscape(selectedId)}"]`);

  if (!r) return;

  r.focus({ preventScroll: true });
}



function syncProjectsSidebar() {
  const firstProjectItem = document.querySelector('.projects-list .project-item');
  if (!firstProjectItem) return;

  const projectTitle = (root?.name || '').trim() || getDefaultNodeName(LEVEL.COMPANY) || 'Проект';
  firstProjectItem.textContent = projectTitle;
  firstProjectItem.title = projectTitle;
}

function initProjectsSidebar() {
  const addButton = document.querySelector('.project-add');
  const projectsList = document.querySelector('.projects-list');

  if (!addButton || !projectsList) return;
  if (addButton.dataset.bound === '1') return;

  addButton.dataset.bound = '1';
  addButton.addEventListener('click', () => {
    const projectItem = document.createElement('button');
    projectItem.className = 'project-item';
    projectItem.type = 'button';
    projectItem.textContent = 'Новый проект';
    projectItem.title = 'Проект';
    projectsList.appendChild(projectItem);
  });
}

function renderSchemaView() {
  syncProjectsSidebar();

  const host = document.getElementById('tree');
  host.innerHTML = '';

  const displayRoot =
    window.objectFocus?.getFocusedRootNode?.() || root;

  const displayRootOrdinalPath =
    window.objectFocus?.getFocusedRootOrdinalPath?.() || [];

    const ul = document.createElement('ul');
    ul.dataset.level = String(displayRoot.level);
    
    if (displayRoot.id !== root.id) {
      ul.classList.add("focus-root");
    }

  ul.appendChild(
    renderNode(displayRoot, displayRootOrdinalPath, {
      suppressOwnOrdinal: displayRoot.id !== root.id,
      forceRootClass: displayRoot.id !== root.id,
    })
  );

  const levelHeadersBlock =
    window.levelHeaders?.buildHeaderRowForSchema?.()
    || window.levelHeaders?.buildHeaderCascadeForSchema?.();

    const levelHeadersColumn =
    window.levelHeaders?.buildColumnStackForSchema?.()
    || window.levelHeaders?.buildColumnCascadeForSchema?.();

  if (levelHeadersBlock) {
    host.appendChild(levelHeadersBlock);
  }

  if (levelHeadersColumn) {
    const contentWrap = document.createElement("div");
    contentWrap.className = "schema-with-level-column";

    contentWrap.appendChild(levelHeadersColumn);
    contentWrap.appendChild(ul);

    host.appendChild(contentWrap);
  } else {
    host.appendChild(ul);
  }

  applyCaptionOrdinalOffsets();
  layoutTrunks();
  layoutCollapseColumn();
  layoutLevelCollapseBar();

  requestAnimationFrame(() => {
    window.levelHeaders?.alignHeaderRowForSchema?.();
    window.levelHeaders?.layoutColumnCascadeLines?.();
  });

  window.objectFocus?.renderBreadcrumbs?.();

  if (treeHasFocus) focusSelectedRow();

  const rid = consumeRenameRequest?.();
  if (rid) startRename(rid);
}

// function render() {
//   if (currentView === VIEW.HIERARCHY) {
//     if (hierarchyOrientation === HIERARCHY_ORIENTATION.HORIZONTAL) {
//       window.renderHierarchyHorizontalView?.();
//     } else {
//       window.renderHierarchyView?.();
//     }
  
//     syncHierarchyOrientationButtons();
//     return;
//   }

//   renderSchemaView();
// }

function render() {
  ensureSelectedVisible();
  updateDirectionButtons();

  if (currentView === VIEW.HIERARCHY) {
    if (viewOrientation === VIEW_ORIENTATION.HORIZONTAL) {
      window.renderHierarchyHorizontalView?.();
    } else {
      window.renderHierarchyView?.();
    }

    syncViewOrientationButtons();
    window.schemaAutoscroll?.scrollSelectedIntoView?.();
    return;
  }

  if (currentView === VIEW.AICYCLE) {
    if (viewOrientation === VIEW_ORIENTATION.VERTICAL) {
      window.renderIcicleVerticalView?.();
    } else {
      window.renderIcicleHorizontalView?.();
    }

    syncViewOrientationButtons();
    window.schemaAutoscroll?.scrollSelectedIntoView?.();
    return;
  }

  if (currentView === VIEW.LIST) {
    window.renderListView?.();
    window.schemaAutoscroll?.scrollSelectedIntoView?.();
    return;
  }

  if (currentView === VIEW.TABLE) {
    window.renderTableView?.();
    syncViewButtons();
    return;
  }

  renderSchemaView();
  window.schemaAutoscroll?.scrollSelectedIntoView?.();
}

function isTreeLocked() {
  return window.hotkeysMode === "custom";
}

function makeBtn(midText, onClick) {
  const b = document.createElement('span');
  b.className = 'btn';

  const l = document.createElement('span');
  l.className = 'br';
  l.textContent = '[';

  const m = document.createElement('span');
  m.className = 'mid';
  m.textContent = midText;

  const r = document.createElement('span');
  r.className = 'br';
  r.textContent = ']';

  b.append(l, m, r);

  b.addEventListener('click', (e) => {
    if (isTreeLocked()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick(e);
  });

  return b;
}



function handleRowMouseHotkeys(e, n, baseToken) {
  if (isTreeLocked()) return false;

  if (isMouseHotkey(e, "redoClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    treeHasFocus = true;
    redo();
    return true;
  }

  if (isMouseHotkey(e, "undoClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    treeHasFocus = true;
    undo();
    return true;
  }

  if (isMouseHotkey(e, "deleteClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    selectedId = n.id;
    treeHasFocus = true;
    removeSelected();
    return true;
  }

  if (isMouseHotkey(e, "addSiblingClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    selectedId = n.id;
    treeHasFocus = true;
    addSibling(n.id);
    return true;
  }

  if (isMouseHotkey(e, "addChildClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    selectedId = n.id;
    treeHasFocus = true;
    addChild(n.id);
    return true;
  }

  if (isMouseHotkey(e, "renameClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    selectedId = n.id;
    treeHasFocus = true;
    render();
    startRename(n.id);
    return true;
  }

  if (isMouseHotkey(e, "navClick", baseToken)) {
    e.preventDefault();
    e.stopPropagation();
    selectedId = n.id;
    treeHasFocus = true;
    render();
    return true;
  }

  return false;
}

function applyCaptionOrdinalOffsets() {
  const tree = document.getElementById("tree");
  if (!tree) return;

  const rows = tree.querySelectorAll(".row[data-id]");

  rows.forEach((row) => {
    const li = row.closest("li");
    if (!li) return;

    const caps = li.querySelector(":scope > .captions");
    if (!caps) return;

    // если нумерация выключена — сбрасываем
    if (!showOrdinals || !document.body.classList.contains("ordinals-on")) {
      caps.style.marginLeft = "0px";
      return;
    }

    const badge = row.querySelector(":scope > .ordinal-badge");
    if (!badge) {
      caps.style.marginLeft = "0px";
      return;
    }

    const badgeBox = badge.getBoundingClientRect();
    const badgeStyle = getComputedStyle(badge);
    const mr = parseFloat(badgeStyle.marginRight) || 0;

    const shift = badgeBox.width + mr;
    caps.style.marginLeft = `${Math.ceil(shift)}px`;
  });
}

function renderCaptions(node, li) {
  if (!showCaptions || !Array.isArray(node.captions) || !node.captions.length) {
    return;
  }

  const caps = document.createElement("div");
  caps.className = "captions";

  if (node.captionsBgColor) {
    caps.style.backgroundColor = node.captionsBgColor;
  }

  for (const c of node.captions) {
    const cap = document.createElement("div");

    const isMultiline =
      (c.text || "").includes("\n") ||
      (c.textHtml || "").includes("<br>");

    cap.className = "caption" + (isMultiline ? " caption-multiline" : "");
    cap.dataset.nodeId = node.id;
    cap.dataset.captionId = c.id;

    if (c.textHtml) cap.innerHTML = c.textHtml;
    else cap.textContent = c.text || "";

    cap.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      selectedId = node.id;
      treeHasFocus = true;
      startCaptionEdit(node.id, c.id);
    });

    caps.appendChild(cap);
  }

  li.appendChild(caps);
}

function renderNode(n, ordinalPath = [], options = {}) {
  const li = document.createElement('li');

  if (n.id === root.id || options.forceRootClass) {
    li.classList.add('root');
  }

  const anchor = document.createElement('span');
  anchor.className = 'anchor';
  li.appendChild(anchor);

  const row = document.createElement('span');
  row.dataset.id = n.id;
  row.className = 'row' + ((treeHasFocus && n.id === selectedId) ? ' sel' : '');
  row.tabIndex = 0;

  const label = document.createElement('span');
label.className = 'label';

// ← добавили индекс
if (showOrdinals && !options.suppressOwnOrdinal) {
  const ordinalBadge = buildOrdinalBadge(ordinalPath);
  if (ordinalBadge) {
    row.appendChild(ordinalBadge);
  }
}

if (n.nameHtml) label.innerHTML = n.nameHtml;
else label.textContent = n.name || '';

row.appendChild(label);

  const act = document.createElement('span');
  act.className = 'act';

  {
    const plus = makeBtn('+', (e) => {
      e.stopPropagation();
      selectedId = n.id;
      addSibling(n.id);
    });
    act.appendChild(plus);
  }

  {
    const rename = makeBtn('..', (e) => {
      e.stopPropagation();
      selectedId = n.id;
      treeHasFocus = true;
      render();
      startRename(n.id);
    });
    act.appendChild(rename);
  }

  if (canHaveChild(n)) {
    const child = makeBtn('>', (e) => {
      e.stopPropagation();
      selectedId = n.id;
      addChild(n.id);
    });
    act.appendChild(child);
  }

  if (n.id !== root.id) {
    const del = makeBtn('x', (e) => {
      e.stopPropagation();
      selectedId = n.id;
      removeSelected();
    });
    act.appendChild(del);
  } else {
    const lock = document.createElement('span');
    lock.className = 'mut';
    lock.style.marginLeft = '6px';
    act.appendChild(lock);
  }

  row.appendChild(act);

  row.addEventListener('click', (e) => {
    handleRowMouseHotkeys(e, n, "Click");
  });

  row.addEventListener('dblclick', (e) => {
    handleRowMouseHotkeys(e, n, "DblClick");
  });

  row.addEventListener('keydown', (e) => {
    if (isTreeLocked()) {
      return;
    }

    if (isUndoHotkey(e)) {
      e.preventDefault();
      undo();
      return;
    }

    if (isRedoHotkey(e)) {
      e.preventDefault();
      redo();
      return;
    }

    if (isHotkey(e, "indent")) {
      e.preventDefault();
      selectedId = n.id;
      indentNode(n.id);
      return;
    }

    if (isHotkey(e, "outdent")) {
      e.preventDefault();
      selectedId = n.id;
      outdentNode(n.id);
      return;
    }


    if (isHotkey(e, "navUp")) {
      e.preventDefault();
      selectedId = n.id;
      moveSelection(-1);
      return;
    }

    if (isHotkey(e, "navDown")) {
      e.preventDefault();
      selectedId = n.id;
      moveSelection(+1);
      return;
    }

    if (isHotkey(e, "moveUp")) {
      e.preventDefault();
      selectedId = n.id;
      moveByVisibleOrder(-1);
      return;
    }
    
    if (isHotkey(e, "moveDown")) {
      e.preventDefault();
      selectedId = n.id;
      moveByVisibleOrder(+1);
      return;
    }

    if (isHotkey(e, "rename")) {
      e.preventDefault();
      selectedId = n.id;
      treeHasFocus = true;
      render();
      startRename(n.id);
      return;
    }

    if (isHotkey(e, "delete")) {
      e.preventDefault();
      selectedId = n.id;
      removeSelected();
      return;
    }

    if (isHotkey(e, "addChild")) {
      e.preventDefault();
      selectedId = n.id;
      addChild(n.id);
      return;
    }

    if (isHotkey(e, "addSibling")) {
      e.preventDefault();
    
      const focusedRootId = window.objectFocus?.getFocusedRootId?.();
      const isFocusedRoot = !!focusedRootId && focusedRootId === n.id;
    
      selectedId = n.id;
    
      if (isFocusedRoot) {
        addChild(n.id);
      } else {
        addSibling(n.id);
      }
    
      return;
    }

    if (isHotkey(e, "addCaption")) {
      e.preventDefault();
      addCaption(selectedId);
      return;
    }
  });

  li.appendChild(row);

  renderCaptions(n, li);

  const collapsed = window.collapseNodes?.isCollapsed(n.id);

if (
  n.children &&
  n.children.length &&
  !collapsed
) {
    const ul = document.createElement('ul');
    ul.dataset.level = String(n.level + 1);
    n.children.forEach((ch, index) => {
      ul.appendChild(renderNode(ch, [...ordinalPath, index + 1]));
    });
    li.appendChild(ul);
  }

  return li;
}

/* ======== layout lines ======== */
function layoutCollapseColumn() {
  const tree = document.getElementById("tree");
  if (!tree) return;

  tree.querySelectorAll(".collapse-col").forEach((el) => el.remove());

  const treeBox = tree.getBoundingClientRect();
  const rows = Array.from(tree.querySelectorAll(".row[data-id]"))
  .filter((row) => {
    const found = findWithParent(root, row.dataset.id);
    return !!found?.node?.children?.length;
  });

  rows.forEach((row) => {
    const id = row.dataset.id;
  
    const col = document.createElement("button");
    col.type = "button";
    
    const isCollapsed = window.collapseNodes?.isCollapsed?.(id);

col.className = "collapse-col" + (isCollapsed ? " is-collapsed" : "");
col.dataset.id = id;

col.textContent = isCollapsed ? "[+]" : "[-]";

    row.addEventListener("mouseenter", () => {
      col.classList.add("is-visible");
    });
    
    row.addEventListener("mouseleave", () => {
      if (!col.matches(":hover")) {
        col.classList.remove("is-visible");
      }
    });
    
    col.addEventListener("mouseleave", () => {
      col.classList.remove("is-visible");
    });
  
    
  
    col.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
  
      window.collapseNodes?.toggle?.(id);
    });
  
    const rowBox = row.getBoundingClientRect();
    col.style.top = `${Math.round(rowBox.top - treeBox.top)}px`;
  
    tree.appendChild(col);
  });
}

function layoutLevelCollapseBar() {
  const tree = document.getElementById("tree");
  if (!tree) return;

  tree.querySelector(".level-collapse-bar")?.remove();

  const levels = new Set();

  (function walk(node) {
    if (!node) return;

    if (node.children?.length) {
      levels.add(node.level);
    }

    (node.children || []).forEach(walk);
  })(root);

  if (!levels.size) return;

  const bar = document.createElement("div");
  bar.className = "level-collapse-bar";

  [...levels].sort((a, b) => a - b).forEach((level) => {
    const isCollapsed =
      window.collapseNodes?.isLevelCollapsed?.(level);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-collapse-btn";

    btn.textContent = isCollapsed ? "[+]" : "[-]";

    btn.title = isCollapsed
      ? `Развернуть уровень ${level}`
      : `Свернуть уровень ${level}`;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (window.collapseNodes?.isLevelCollapsed?.(level)) {
        window.collapseNodes?.expandLevel?.(level);
      } else {
        window.collapseNodes?.collapseLevel?.(level);
      }
    });

    bar.appendChild(btn);
  });

  tree.prepend(bar);
}

function layoutTrunks() {
  window.schemaLines?.layout?.();
}

/* ======== focus / global hotkeys ======== */

document.getElementById('tree').addEventListener('click', (e) => {
  if (e.target.closest('.row')) return;
  treeHasFocus = false;
  const ae = document.activeElement;
  if (ae && ae.classList && ae.classList.contains('row')) ae.blur();
  render();
});

window.addEventListener(
  "keydown",
  (e) => {
    if (isTreeLocked()) return;

    /*
      Старый глобальный обработчик
      относится только к основной группе.
    */
    if (
      window.hotkeysViewGroup &&
      !window.hotkeysViewGroup.isMain()
    ) {
      return;
    }

    /*
      Запасной вариант для старого подключения.
    */
    if (
      !window.hotkeysViewGroup &&
      currentView === VIEW.TABLE
    ) {
      return;
    }

  const active = document.activeElement;
  const isRow = active && active.classList && active.classList.contains('row');
  const isEditing =
    active &&
    active.classList &&
    active.classList.contains('edit') &&
    (active.tagName === 'INPUT' || active.isContentEditable);

  if (isRow || isEditing) return;
  if (!treeHasFocus) return;
  if (!selectedId) return;

  if (isUndoHotkey(e)) {
    e.preventDefault();
    undo();
    return;
  }

  if (isRedoHotkey(e)) {
    e.preventDefault();
    redo();
    return;
  }

  if (isHotkey(e, "indent")) {
    e.preventDefault();
    indentNode(selectedId);
    return;
  }

  if (isHotkey(e, "outdent")) {
    e.preventDefault();
    outdentNode(selectedId);
    return;
  }

  if (isHotkey(e, "navLeft")) {
    e.preventDefault();
    goParent(selectedId);
    return;
  }

  if (isHotkey(e, "navRight")) {
    e.preventDefault();
    goDeeper(selectedId);
    return;
  }

  if (isHotkey(e, "navUp")) {
    e.preventDefault();
    moveSelection(-1);
    return;
  }

  if (isHotkey(e, "navDown")) {
    e.preventDefault();
    moveSelection(+1);
    return;
  }

  if (isHotkey(e, "moveUp")) {
    e.preventDefault();
    moveByVisibleOrder(-1);
    return;
  }
  
  if (isHotkey(e, "moveDown")) {
    e.preventDefault();
    moveByVisibleOrder(+1);
    return;
  }

  if (isHotkey(e, "rename")) {
    e.preventDefault();
    render();
    startRename(selectedId);
    return;
  }

  if (isHotkey(e, "delete")) {
    e.preventDefault();
    removeSelected();
    return;
  }

  if (isHotkey(e, "addCaption")) {
    e.preventDefault();
    addCaption(selectedId);
    return;
  }

  if (isHotkey(e, "addChild")) {
    e.preventDefault();
    addChild(selectedId);
    return;
  }

  if (isHotkey(e, "addSibling")) {
    e.preventDefault();
  
    const focusedRootId = window.objectFocus?.getFocusedRootId?.();
    const isFocusedRoot =
      !!focusedRootId && focusedRootId === selectedId;
  
    if (isFocusedRoot) {
      addChild(selectedId);
    } else {
      addSibling(selectedId);
    }
  
    return;
  }
});

/* ======== tests ======== */

function assert(cond, msg) {
  if (!cond) throw new Error('TEST FAIL: ' + msg);
}

function runTests() {
  const tRoot = makeNode(LEVEL.COMPANY, 'Проект');

  function tFind(id) {
    return findWithParent(tRoot, id);
  }

  function tAddChild(pid) {
    const r = tFind(pid);
    if (!r) return null;
    if (!canHaveChild(r.node)) return null;
    const child = makeNode(r.node.level + 1);
    r.node.children.push(child);
    return child.id;
  }

  function tAddSibling(tid) {
    if (tid === tRoot.id) return tAddChild(tRoot.id);
    const r = tFind(tid);
    if (!r || !r.parent) return null;
    const idx = r.parent.children.findIndex(x => x.id === tid);
    const sib = makeNode(r.node.level);
    r.parent.children.splice(idx + 1, 0, sib);
    return sib.id;
  }

  function tFlattenWL() {
    const out = [];
    (function walk(n) {
      out.push({ id: n.id, level: n.level });
      for (const ch of n.children) walk(ch);
    })(tRoot);
    return out;
  }

  function tFirstDeeperAfter(id) {
    const flat = tFlattenWL();
    const idx = flat.findIndex(x => x.id === id);
    if (idx < 0) return null;
    const base = flat[idx].level;
    for (let i = idx + 1; i < flat.length; i++) {
      if (flat[i].level > base) return flat[i].id;
    }
    return null;
  }

  assert(tRoot.level === LEVEL.COMPANY, 'root is company');

  const p1 = tAddSibling(tRoot.id);
  assert(!!p1, 'project added under root');

  const p2 = tAddSibling(p1);
  assert(!!p2, 'project sibling added');

  const d1 = tAddChild(p1);
  assert(!!d1, 'dept child added');

  const r1 = tAddChild(d1);
  assert(!!r1, 'role child added');

  const before = findWithParent(tRoot, r1).node.children.length;
  const nope = tAddChild(r1);
  assert(nope === null, 'no children under role');
  assert(findWithParent(tRoot, r1).node.children.length === before, 'role still leaf');

  const tRoot2 = makeNode(LEVEL.COMPANY, 'Проект');
  const pA = makeNode(LEVEL.PROJECT, 'P1');
  const pB = makeNode(LEVEL.PROJECT, 'P2');
  const dB = makeNode(LEVEL.DEPT, 'D2');
  pB.children.push(dB);
  tRoot2.children.push(pA, pB);

  function tFlattenWL2() {
    const out = [];
    (function walk(n) {
      out.push({ id: n.id, level: n.level });
      for (const ch of n.children) walk(ch);
    })(tRoot2);
    return out;
  }

  function tFirstDeeperAfter2(id) {
    const flat = tFlattenWL2();
    const idx = flat.findIndex(x => x.id === id);
    if (idx < 0) return null;
    const base = flat[idx].level;
    for (let i = idx + 1; i < flat.length; i++) {
      if (flat[i].level > base) return flat[i].id;
    }
    return null;
  }

  assert(tFirstDeeperAfter2(pA.id) === dB.id, 'arrow right deeper navigation skips to next subtree');
  assert(tFirstDeeperAfter(pA.id) === null, 'firstDeeperAfter is tree-specific');

  console.log('All tests passed');
}

function updateOrdinalButton() {
  const btn = document.getElementById("toggleOrdinals");
  if (!btn) return;

  if (showOrdinals) {
    btn.classList.add("is-active");
  } else {
    btn.classList.remove("is-active");
  }
}

function syncOrdinalsModeClass() {
  document.body.classList.toggle("ordinals-on", !!showOrdinals);
}

function initOrdinalToggle() {
  const btn = document.getElementById("toggleOrdinals");
  if (!btn) return;

  btn.addEventListener("click", () => {
    showOrdinals = !showOrdinals;
    updateOrdinalButton();
    syncOrdinalsModeClass();
    render();
  });

  updateOrdinalButton();
  syncOrdinalsModeClass();
}

function updateCaptionButton() {
  const btn = document.getElementById("toggleCaptions");
  if (!btn) return;

  if (showCaptions) {
    btn.classList.add("is-active");
  } else {
    btn.classList.remove("is-active");
  }
}

function initCaptionToggle() {
  const btn = document.getElementById("toggleCaptions");
  if (!btn) return;

  btn.addEventListener("click", () => {
    showCaptions = !showCaptions;
    updateCaptionButton();
    render();
  });

  updateCaptionButton();
}

initProjectsSidebar();
render();
initOrdinalToggle();
initCaptionToggle();

if (new URLSearchParams(location.search).get('test') === '1') {
  runTests();
}

function updateDirectionButtons() {
  const horizontalBtn = document.getElementById("hierarchyHorizontalBtn");
  const verticalBtn = document.getElementById("hierarchyVerticalBtn");

  if (!horizontalBtn || !verticalBtn) return;

  const enabled =
    currentView === VIEW.HIERARCHY ||
    currentView === VIEW.AICYCLE;

  horizontalBtn.disabled = !enabled;
  verticalBtn.disabled = !enabled;
}
