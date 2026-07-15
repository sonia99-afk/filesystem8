(function () {
  if (typeof window === "undefined") return;

  window.renderTableView = function renderTableView() {
    syncProjectsSidebar();

    const host = document.getElementById("tree");
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.className = "table-view";

    const table = document.createElement("table");
    table.className = "structure-table";

    table.innerHTML = `
      <thead>
        <tr>
          <th>ID</th>
          <th>Отметка</th>
          <th>Нумерация</th>
          <th>Иконка</th>
          <th>Обложка</th>
          <th>Уровень</th>
          <th>Название</th>
          <th>Описание</th>
          ${getAllTablePropertyColumns()
            .map((col) => `<th>${col.title}</th>`)
            .join("")}
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");

    const displayRoot =
      window.objectFocus?.getFocusedRootNode?.() || root;

    const displayRootOrdinalPath =
      window.objectFocus?.getFocusedRootOrdinalPath?.() || [];

    const rows = flattenTableRows(displayRoot, displayRootOrdinalPath);

    rows.forEach((item) => {
      tbody.appendChild(renderTableRow(item.node, item.ordinalPath));
    });

    table.appendChild(tbody);
    wrap.appendChild(table);

    const oldMinWidth = host.style.minWidth;
    const oldScrollWidth = host.scrollWidth;

    if (oldScrollWidth) {
      host.style.minWidth = `${oldScrollWidth}px`;
    }

    host.replaceChildren(wrap);

    requestAnimationFrame(() => {
      host.style.minWidth = oldMinWidth;
    });

    layoutTableCollapseColumn(host, wrap);
    ensureTableCellTabNavigation();
    ensureTableTimerCellsEnterHotkey();
    ensureTableUploadCellsEnterHotkey();

    if (treeHasFocus) {
      const selectedRow = host.querySelector(
        `.row[data-id="${cssEscape(selectedId)}"]`
      );

      selectedRow?.focus({
        preventScroll: true,
      });
    }

    updateTableDescendantRowHighlights();

    requestAnimationFrame(() => {
      updateTableDescendantRowHighlights();
      ensureTableDescendantHighlightWatcher();
    });
  };
})();