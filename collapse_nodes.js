(function () {
    if (typeof window === "undefined") return;
  
    const collapsed = new Set();
  
    function isCollapsed(id) {
      return collapsed.has(id);
    }
  
function toggle(id) {
  if (!id) return;

  const wasCollapsed = collapsed.has(id);

if (wasCollapsed) {
  /*
    Раскрываем объект, но активным
    оставляем сам раскрываемый объект.
  */
  collapsed.delete(id);

  selectedId = id;
  treeHasFocus = true;

  /*
    В таблице сохраняем текущую колонку,
    но активной оставляем строку родителя.
  */
  if (window.tableSelectedCell) {
    window.tableSelectedCell = {
      ...window.tableSelectedCell,
      rowId: id,
    };
  }

  } else {
    /*
      Сворачиваем объект.
      Выбранным остаётся сам сворачиваемый объект.
    */
    collapsed.add(id);

    selectedId = id;
    treeHasFocus = true;

    if (window.tableSelectedCell) {
      window.tableSelectedCell = {
        ...window.tableSelectedCell,
        rowId: id,
      };
    }
  }

  render();
}

    function collapseLevel(level) {
        if (typeof root === "undefined") return;
      
        (function walk(node) {
          if (!node) return;
      
          if (node.level === Number(level) && node.children?.length) {
            collapsed.add(node.id);
          }
      
          (node.children || []).forEach(walk);
        })(root);
      
        render();
      }
      
      function expandLevel(level) {
        if (typeof root === "undefined") return;
      
        (function walk(node) {
          if (!node) return;
      
          if (node.level === Number(level)) {
            collapsed.delete(node.id);
          }
      
          (node.children || []).forEach(walk);
        })(root);
      
        render();
      }

      function isLevelCollapsed(level) {
        if (typeof root === "undefined") return false;
      
        let total = 0;
        let collapsedCount = 0;
      
        (function walk(node) {
          if (!node) return;
      
          if (node.level === Number(level) && node.children?.length) {
            total += 1;
            if (collapsed.has(node.id)) collapsedCount += 1;
          }
      
          (node.children || []).forEach(walk);
        })(root);
      
        return total > 0 && total === collapsedCount;
      }
  
    window.collapseNodes = {
        isLevelCollapsed,
        collapseLevel,
        expandLevel,
      isCollapsed,
      toggle,
      getAll() {
        return [...collapsed];
      }
    };
  })();

 