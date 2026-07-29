(function () {
  if (typeof window === "undefined") return;

  window.renderHierarchyView = function renderHierarchyView() {
    syncProjectsSidebar();

    const host = document.getElementById("tree");
    if (!host) return;

    host.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "hierarchy-view";

    const ul = document.createElement("ul");
    ul.className = "hierarchy-tree";

    const displayRoot =
      window.objectFocus?.getFocusedRootNode?.() || root;

    const displayRootOrdinalPath =
      window.objectFocus?.getFocusedRootOrdinalPath?.() || [];

    ul.appendChild(
      renderHierarchyNode(displayRoot, displayRootOrdinalPath)
    );

    wrap.appendChild(ul);
    host.appendChild(wrap);

requestAnimationFrame(() => {
  alignHierarchyCaptions();

  /*
    Когда дерево активно, после render()
    возвращаем настоящий DOM-фокус
    выбранному объекту.
  */
  if (!treeHasFocus || !selectedId) {
    return;
  }

  /*
    Не перехватываем фокус обратно,
    если уже началось переименование
    или другое редактирование.
  */
  const active =
    document.activeElement;

  const activeTag =
    String(
      active?.tagName || ""
    ).toLowerCase();

  const isEditing =
    activeTag === "input" ||
    activeTag === "textarea" ||
    activeTag === "select" ||
    active?.isContentEditable ||
    !!active?.closest?.(".edit");

  if (isEditing) {
    return;
  }

  const selectedRow =
    host.querySelector(
      `.hierarchy-view .row[data-id="${cssEscape(selectedId)}"]`
    );

  selectedRow?.focus({
    preventScroll: true,
  });
});
  };

  function alignHierarchyCaptions() {
    document.querySelectorAll(".hierarchy-view .hierarchy-li").forEach((li) => {
      const row = li.querySelector(":scope > .hierarchy-node.row");
      const caps = li.querySelector(":scope > .captions");

      if (!row || !caps) return;

      const liBox = li.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();

      caps.style.width = `${Math.ceil(rowBox.width)}px`;
      caps.style.maxWidth = `${Math.ceil(rowBox.width)}px`;
      caps.style.marginLeft = `${Math.round(rowBox.left - liBox.left)}px`;
      caps.style.boxSizing = "border-box";
    });
  }

  function renderHierarchyNode(node, ordinalPath = []) {
    const li = document.createElement("li");
    li.className = "hierarchy-li";

    const row = document.createElement("div");
    row.className =
      "hierarchy-node row" +
      ((treeHasFocus && node.id === selectedId) ? " sel" : "");

    row.dataset.id = node.id;
    row.tabIndex = 0;

    const focusedRootId = window.objectFocus?.getFocusedRootId?.();
    const isFocusedRoot = !!focusedRootId && focusedRootId === node.id;

    if (showOrdinals && !isFocusedRoot) {
      const badge = buildOrdinalBadge(ordinalPath);
      if (badge) row.appendChild(badge);
    }

    const label = document.createElement("span");
    label.className = "label";

    if (node.nameHtml) label.innerHTML = node.nameHtml;
    else label.textContent = node.name || "";

    row.appendChild(label);

    row.addEventListener("click", (e) => {
      e.stopPropagation();
      selectedId = node.id;
      treeHasFocus = true;
      render();
    });

    row.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      selectedId = node.id;
      treeHasFocus = true;
      render();
      startRename(node.id);
    });

    row.addEventListener("keydown", (e) => {
      if (isTreeLocked()) return;

      if (isHotkey(e, "addCaption")) {
        e.preventDefault();
        e.stopPropagation();

        selectedId = node.id;
        treeHasFocus = true;
        addCaption(node.id);
        return;
      }

      if (isHotkey(e, "rename")) {
        e.preventDefault();
        e.stopPropagation();

        selectedId = node.id;
        treeHasFocus = true;
        render();
        startRename(node.id);
        return;
      }

      if (isHotkey(e, "delete")) {
        e.preventDefault();
        e.stopPropagation();

        selectedId = node.id;
        removeSelected();
        return;
      }

      if (isHotkey(e, "addChild")) {
        e.preventDefault();
        e.stopPropagation();

        selectedId = node.id;
        addChild(node.id);
        return;
      }

      if (isHotkey(e, "addSibling")) {
        e.preventDefault();
        e.stopPropagation();

        selectedId = node.id;

        if (isFocusedRoot) {
          addChild(node.id);
        } else {
          addSibling(node.id);
        }

        return;
      }
    });

    li.appendChild(row);

    renderCaptions(node, li);

    if (node.children && node.children.length) {
      const ul = document.createElement("ul");
      ul.className = "hierarchy-children";

      node.children.forEach((child, index) => {
        ul.appendChild(
          renderHierarchyNode(child, ordinalPath.concat(index + 1))
        );
      });

      li.appendChild(ul);
    }

    return li;
  }
})();