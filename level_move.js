// level_move.js
// Перемещение по одному level:
// Shift+Alt+ArrowUp / Shift+Alt+ArrowDown
// Логика аналогична level_nav.js, но вместо навигации двигает узел.

(function () {
    if (typeof window === "undefined") return;
  
    function isEditingNow() {
      const ae = document.activeElement;
      if (!ae) return false;
      if (ae.tagName === "INPUT" && ae.classList?.contains("edit")) return true;
      if (ae.tagName === "TEXTAREA" && ae.classList?.contains("tg-export")) return true;
      if (ae.isContentEditable) return true;
      return false;
    }
  
    function collectNodesOfSameLevel(targetLevel) {
      const out = [];
  
      (function walk(node) {
        if (!node) return;
  
        if (node.level === targetLevel) {
          out.push(node.id);
        }
  
        for (const ch of (node.children || [])) {
          walk(ch);
        }
      })(root);
  
      return out;
    }
  
function moveNodeIntoParent(
  nodeId,
  parentId,
  insertMode = "start"
) {
  if (!nodeId || !parentId) return false;
  if (nodeId === root.id) return false;
  if (nodeId === parentId) return false;

  const movingInfo =
    findWithParent(root, nodeId);

  const parentInfo =
    findWithParent(root, parentId);

  if (
    !movingInfo?.node ||
    !movingInfo.parent ||
    !parentInfo?.node
  ) {
    return false;
  }

  const newParent = parentInfo.node;

  if (!canHaveChild(newParent)) {
    return false;
  }

  /*
    Нельзя переносить объект внутрь
    собственного потомка.
  */
  const movingSubtreeIds =
    typeof collectSubtreeIds === "function"
      ? collectSubtreeIds(movingInfo.node)
      : [];

  if (movingSubtreeIds.includes(parentId)) {
    return false;
  }

  const newLevel =
    newParent.level + 1;

  const levelDelta =
    newLevel - movingInfo.node.level;

  const maxLevel =
    getMaxLevelInSubtree(movingInfo.node);

  if (
    newLevel < LEVEL.COMPANY ||
    maxLevel + levelDelta > LEVEL.STEP
  ) {
    return false;
  }

  pushHistory();

  /*
    Удаляем объект из старого родителя.
  */
  movingInfo.parent.children =
    (movingInfo.parent.children || [])
      .filter((node) => {
        return node.id !== nodeId;
      });

  /*
    Обычно уровень уже правильный,
    но оставляем поддержку более общих случаев.
  */
  if (levelDelta !== 0) {
    const shifted =
      shiftSubtreeLevel(
        movingInfo.node,
        levelDelta
      );

    if (!shifted) {
      undo();
      return false;
    }
  }

  newParent.children ||= [];

  if (insertMode === "end") {
    newParent.children.push(
      movingInfo.node
    );
  } else {
    newParent.children.unshift(
      movingInfo.node
    );
  }

  selectedId = nodeId;
  treeHasFocus = true;

  render();

  return true;
}

   function moveByLevel(dir) {
  if (!selectedId) return false;
  if (selectedId === root.id) return false;
  if (dir !== -1 && dir !== 1) return false;

  const found =
    findWithParent(root, selectedId);

  if (
    !found?.node ||
    !found.parent
  ) {
    return false;
  }

  const level = found.node.level;

  const ids =
    collectNodesOfSameLevel(level);

  if (!ids.length) {
    return false;
  }

  const idx =
    ids.indexOf(selectedId);

  if (idx < 0) {
    return false;
  }

  const selectedParentId =
    found.parent.id;

  /*
    Получаем все возможные родительские
    объекты предыдущего уровня.

    Это нужно, чтобы учитывать даже тех
    родителей, у которых пока нет детей.
  */
  const parentLevel =
    found.parent.level;

  const parentIds =
    collectNodesOfSameLevel(
      parentLevel
    );

  const selectedParentIndex =
    parentIds.indexOf(
      selectedParentId
    );

  const adjacentParentId =
    selectedParentIndex >= 0
      ? parentIds[
          selectedParentIndex + dir
        ]
      : null;

  const adjacentParentInfo =
    adjacentParentId
      ? findWithParent(
          root,
          adjacentParentId
        )
      : null;

  const adjacentParentChildren =
    Array.isArray(
      adjacentParentInfo
        ?.node
        ?.children
    )
      ? adjacentParentInfo
          .node
          .children
      : [];

  const targetId =
    ids[idx + dir] || null;

  const targetParentId =
    targetId
      ? parentOf(targetId)
      : null;

  /*
    Если движение переходит в следующую
    или предыдущую родительскую группу,
    а соседний родитель пустой —
    помещаем объект прямо внутрь него.

    Вниз:
    объект становится первым ребёнком.

    Вверх:
    объект становится последним ребёнком.
    Для пустого родителя результат одинаков,
    но такая логика сохраняет правильный порядок.
  */
  const leavesCurrentParent =
    !targetId ||
    targetParentId !==
      selectedParentId;

  if (
    leavesCurrentParent &&
    adjacentParentInfo?.node &&
    adjacentParentChildren.length === 0
  ) {
    return moveNodeIntoParent(
      selectedId,
      adjacentParentId,
      dir === -1
        ? "end"
        : "start"
    );
  }

  /*
    Обычное перемещение среди уже
    существующих объектов того же уровня.
  */
  if (!targetId) {
    return false;
  }

  if (targetId === selectedId) {
    return false;
  }

  const sameParent =
    selectedParentId ===
    targetParentId;

  if (dir === -1) {
    return moveNodeRelativeToTarget(
      selectedId,
      targetId,
      sameParent
        ? "before"
        : "after"
    );
  }

  return moveNodeRelativeToTarget(
    selectedId,
    targetId,
    sameParent
      ? "after"
      : "before"
  );
}
  
    window.addEventListener(
      "keydown",
      (e) => {
        if (window.hotkeysMode === "custom") return;
        if (isEditingNow()) return;
        if (typeof isHotkey !== "function") return;
        if (!treeHasFocus) return;
        if (!selectedId) return;
  
        if (isHotkey(e, "levelMoveUp")) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          moveByLevel(-1);
          return;
        }
  
        if (isHotkey(e, "levelMoveDown")) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          moveByLevel(+1);
        }
      },
      true
    );
  
    window.levelMove = {
      up() {
        return moveByLevel(-1);
      },
      down() {
        return moveByLevel(+1);
      },
    };
  })();