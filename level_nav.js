// level_nav.js
// Навигация по всему дереву среди узлов того же level:
// по настраиваемым хоткеям levelNavUp / levelNavDown

(function () {
  if (typeof window === "undefined") return;

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;

    if (
      ae.tagName === "INPUT" &&
      ae.classList?.contains("edit")
    ) {
      return true;
    }

    if (
      ae.tagName === "TEXTAREA" &&
      ae.classList?.contains("tg-export")
    ) {
      return true;
    }

    if (ae.isContentEditable) {
      return true;
    }

    return false;
  }

  function collectNodesOfSameLevel(targetLevel) {
    const out = [];

    (function walk(node) {
      if (!node) return;

      if (node.level === targetLevel) {
        out.push(node.id);
      }

      for (const ch of node.children || []) {
        walk(ch);
      }
    })(root);

    return out;
  }

  function moveSelectionByLevel(dir) {
    if (!selectedId) return false;
    if (dir !== -1 && dir !== 1) return false;

    const found = findWithParent(root, selectedId);

    if (!found?.node) {
      return false;
    }

    const level = found.node.level;
    const ids = collectNodesOfSameLevel(level);

    if (!ids.length) {
      return false;
    }

    const idx = ids.indexOf(selectedId);

    if (idx < 0) {
      return false;
    }

    const nextId = ids[idx + dir];

    if (!nextId) {
      return false;
    }

    if (
      !window.objectFocus
        ?.isInsideFocusedRoot?.(nextId)
    ) {
      return false;
    }

    selectedId = nextId;
    treeHasFocus = true;

    render();

    return true;
  }

  window.addEventListener(
    "keydown",
    (e) => {
      /*
        Обычные levelNavUp / levelNavDown
        работают только в основной группе.

        В вертикальной группе используются:
        verticalLevelLeft / verticalLevelRight.

        В таблице используются собственные
        табличные действия.
      */
      if (
        window.hotkeysViewGroup &&
        !window.hotkeysViewGroup.isMain()
      ) {
        return;
      }

      /*
        Запасная проверка на случай,
        если hotkeys_view_group.js
        ещё не подключён.
      */
      if (
        !window.hotkeysViewGroup &&
        window.currentView ===
          window.VIEW?.TABLE
      ) {
        return;
      }

      if (
        window.hotkeysMode === "custom"
      ) {
        return;
      }

      if (isEditingNow()) return;

      if (
        typeof isHotkey !== "function"
      ) {
        return;
      }

      if (!treeHasFocus) return;
      if (!selectedId) return;

      if (
        isHotkey(e, "levelNavUp")
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        moveSelectionByLevel(-1);
        return;
      }

      if (
        isHotkey(e, "levelNavDown")
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        moveSelectionByLevel(1);
      }
    },
    true
  );

  /*
    Эти методы оставляем доступными глобально.

    vertical_nav.js вызывает их напрямую:
    verticalLevelLeft  -> levelNav.up()
    verticalLevelRight -> levelNav.down()
  */
  window.levelNav = {
    up() {
      return moveSelectionByLevel(-1);
    },

    down() {
      return moveSelectionByLevel(1);
    },
  };
})();