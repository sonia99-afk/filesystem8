// table/table_descendant_highlight.js
// Подсветка строк-потомков выбранного объекта в табличном режиме.
//
// Если выбрана строка родителя, все его видимые потомки получают класс:
// .table-selected-descendant-row

(function () {
  if (typeof window === "undefined") return;

  let observer = null;
  let rafId = null;
  let observedHost = null;

  function getTableRowNodeId(tr) {
    if (!tr) return "";

    return tr.querySelector(".row[data-id]")?.dataset?.id || "";
  }

  function collectDescendantIds(node, out = new Set()) {
    if (!node) return out;

    (node.children || []).forEach((child) => {
      if (!child?.id) return;

      out.add(child.id);
      collectDescendantIds(child, out);
    });

    return out;
  }

  function getCurrentSelectedRowId(host) {
    const selectedCell = host?.querySelector("td.table-cell-selected");
    const selectedTr = selectedCell?.closest("tr");

    return getTableRowNodeId(selectedTr) || window.selectedId || "";
  }

  function clearHighlights(host) {
    host
      ?.querySelectorAll("tr.table-selected-descendant-row")
      .forEach((tr) => {
        tr.classList.remove("table-selected-descendant-row");
      });
  }

  function getNodeById(id) {
    if (!id || typeof findWithParent !== "function") return null;

    return findWithParent(root, id)?.node || null;
  }

  function updateTableDescendantRowHighlights() {
    const host = document.getElementById("tree");
    if (!host) return;

    clearHighlights(host);

    const selectedRowId = getCurrentSelectedRowId(host);
    if (!selectedRowId) return;

    const selectedNode = getNodeById(selectedRowId);
    if (!selectedNode) return;

    const descendantIds = collectDescendantIds(selectedNode);
    if (!descendantIds.size) return;

    host.querySelectorAll(".structure-table tbody tr").forEach((tr) => {
      const rowId = getTableRowNodeId(tr);

      if (descendantIds.has(rowId)) {
        tr.classList.add("table-selected-descendant-row");
      }
    });
  }

  function scheduleUpdate() {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateTableDescendantRowHighlights();
    });
  }

  function shouldIgnoreMutationTarget(el) {
    if (!el?.classList) return false;

    /*
      Не реагируем на наши служебные классы,
      чтобы не запускать лишние пересчёты по кругу.
    */
    return (
      el.classList.contains("table-collapse-col") ||
      el.classList.contains("table-cell") ||
      el.classList.contains("table-selected-descendant-row")
    );
  }

  function ensureTableDescendantHighlightWatcher() {
    const host = document.getElementById("tree");
    if (!host) return;

    /*
      Если таблица перерисовалась и host другой,
      старый observer лучше отключить.
    */
    if (observer && observedHost !== host) {
      observer.disconnect();
      observer = null;
      observedHost = null;
    }

    if (observer) return;

    observer = new MutationObserver((mutations) => {
      const shouldUpdate = mutations.some((mutation) => {
        return !shouldIgnoreMutationTarget(mutation.target);
      });

      if (shouldUpdate) {
        scheduleUpdate();
      }
    });

    observer.observe(host, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    observedHost = host;

    host.addEventListener("click", scheduleUpdate, true);
    host.addEventListener("keyup", scheduleUpdate, true);
  }

  function disconnect() {
    if (observer) {
      observer.disconnect();
    }

    observer = null;
    observedHost = null;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  window.tableDescendantHighlight = {
    update: updateTableDescendantRowHighlights,
    ensureWatcher: ensureTableDescendantHighlightWatcher,
    disconnect,
  };

  window.updateTableDescendantRowHighlights =
    updateTableDescendantRowHighlights;

  window.ensureTableDescendantHighlightWatcher =
    ensureTableDescendantHighlightWatcher;
})();