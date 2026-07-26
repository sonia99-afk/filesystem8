// hotkey_hold_repeat.js
// Единый repeat для зажатых хоткей-комбинаций.
// Первое нажатие выполняют обычные keydown-обработчики.
// Этот файл запускает только последующий повтор.

(function () {
  if (typeof window === "undefined") return;

  const INITIAL_DELAY = 450;
  const REPEAT_MS = 60;

  let heldCode = null;
  let heldAction = null;
  let heldEventSnapshot = null;

  let tStart = null;
  let tRepeat = null;

  const downKeys = new Set();

  /*
    Действия, доступные в структурных отображениях.
  */
  const TREE_REPEAT_ACTIONS = [
    "navUp",
    "navDown",

    "levelNavUp",
    "levelNavDown",

    "branchNavLeft",
    "branchNavRight",

    "rangeUp",
    "rangeDown",

    "deepUp",
    "deepDown",

    "branchRangeLeft",
    "branchRangeRight",

    "moveUp",
    "moveDown",

    "levelMoveUp",
    "levelMoveDown",

    "branchMoveLeft",
    "branchMoveRight",
  ];

  /*
  Действия вертикальной иерархии
  и вертикального айсикла.
*/
const VERTICAL_REPEAT_ACTIONS = [
  "verticalListUp",
  "verticalListDown",

  "verticalLevelLeft",
  "verticalLevelRight",

  "verticalBranchUp",
  "verticalBranchDown",

  "rangeUp",
  "rangeDown",

  "deepUp",
  "deepDown",

  "branchRangeLeft",
  "branchRangeRight",
];

  /*
    Действия, доступные в табличном отображении.
    По уровню и по ветке в таблице сейчас недоступны.
  */
  const TABLE_REPEAT_ACTIONS = [
    "tableListUp",
    "tableListDown",

    "tablePropertyLeft",
    "tablePropertyRight",

    "rangeUp",
    "rangeDown",

    "deepUp",
    "deepDown",

    "branchRangeLeft",
    "branchRangeRight",
  ];

function getActiveGroup() {
  return (
    window.hotkeysViewGroup
      ?.getActiveGroup?.() ||
    (
      window.currentView ===
      window.VIEW?.TABLE
        ? "table"
        : "main"
    )
  );
}

function isTableViewActive() {
  return getActiveGroup() === "table";
}

function isVerticalViewActive() {
  return getActiveGroup() ===
    "vertical";
}

  function isTypingTarget(el) {
    if (!el) return false;

    const tag = String(el.tagName || "").toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      el.isContentEditable ||
      !!el.closest?.(".edit") ||
      !!el.closest?.(".table-cell-editor") ||
      !!el.closest?.(".table-rich-cell-editor") ||
      !!el.closest?.(".table-duration-mask-editor") ||
      !!el.closest?.(".table-dropdown-menu") ||
      !!el.closest?.(".table-tag-compact-menu")
    );
  }

  function isModifierKey(e) {
    return (
      e.key === "Shift" ||
      e.key === "Alt" ||
      e.key === "Control" ||
      e.key === "Meta" ||
      e.key === "OS"
    );
  }

  function isRepeatableBaseKey(e) {
    return (
      e.code === "ArrowUp" ||
      e.code === "ArrowDown" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight"
    );
  }

  function stop() {
    heldCode = null;
    heldAction = null;
    heldEventSnapshot = null;

    if (tStart) {
      clearTimeout(tStart);
      tStart = null;
    }

    if (tRepeat) {
      clearInterval(tRepeat);
      tRepeat = null;
    }
  }

  function makeEventSnapshot(e) {
    return {
      key: e.key,
      code: e.code,

      shiftKey: !!e.shiftKey,
      altKey: !!e.altKey,
      ctrlKey: !!e.ctrlKey,
      metaKey: !!e.metaKey,
    };
  }

  function getHotkeyMatcher() {
    if (typeof window.isHotkey === "function") {
      return window.isHotkey;
    }

    if (typeof isHotkey === "function") {
      return isHotkey;
    }

    return null;
  }

  function resolveActionFromEvent(e) {
    if (!isRepeatableBaseKey(e)) return null;
    if (window.hotkeysMode === "custom") return null;

    const matcher = getHotkeyMatcher();
    if (!matcher) return null;

const group = getActiveGroup();

const actions =
  group === "table"
    ? TABLE_REPEAT_ACTIONS
    : group === "vertical"
      ? VERTICAL_REPEAT_ACTIONS
      : TREE_REPEAT_ACTIONS;

    for (const action of actions) {
      if (matcher(e, action)) {
        return action;
      }
    }

    return null;
  }

  function canRunTreeActionNow() {
    if (
      typeof isTreeLocked === "function" &&
      isTreeLocked()
    ) {
      return false;
    }

    if (
      typeof treeHasFocus !== "undefined" &&
      !treeHasFocus
    ) {
      return false;
    }

    if (
      typeof selectedId === "undefined" ||
      !selectedId
    ) {
      return false;
    }

    return true;
  }

  function canRunTableActionNow() {
    return !!(
      isTableViewActive() &&
      document
        .getElementById("tree")
        ?.querySelector?.(".structure-table") &&
      window.tableCellNav?.getSelectedCell?.()
    );
  }

  function runTableAction(action) {
    if (!canRunTableActionNow()) {
      stop();
      return false;
    }

    switch (action) {
      case "tableListUp":
        return !!window.tableCellNav?.moveUp?.();

      case "tableListDown":
        return !!window.tableCellNav?.moveDown?.();

      case "tablePropertyLeft":
        return !!window.tableCellNav?.moveLeft?.();

      case "tablePropertyRight":
        return !!window.tableCellNav?.moveRight?.();

      case "rangeUp":
        return !!window.tableMultiSelectTree
          ?.handleRangeKey?.(-1);

      case "rangeDown":
        return !!window.tableMultiSelectTree
          ?.handleRangeKey?.(1);

      case "deepUp":
        return !!window.tableMultiSelectDeep
          ?.handleDeepRangeKey?.(-1);

      case "deepDown":
        return !!window.tableMultiSelectDeep
          ?.handleDeepRangeKey?.(1);

      case "branchRangeLeft":
        return !!window.tableMultiSelectBranch
          ?.handleBranchRangeKey?.(-1);

      case "branchRangeRight":
        return !!window.tableMultiSelectBranch
          ?.handleBranchRangeKey?.(1);

      default:
        return false;
    }
  }

  function runVerticalAction(action) {
  if (!canRunTreeActionNow()) {
    stop();
    return false;
  }

  switch (action) {
    case "verticalListUp":
      return !!window.verticalNav
        ?.listUp?.();

    case "verticalListDown":
      return !!window.verticalNav
        ?.listDown?.();

    case "verticalLevelLeft":
      return !!window.verticalNav
        ?.levelLeft?.();

    case "verticalLevelRight":
      return !!window.verticalNav
        ?.levelRight?.();

    case "verticalBranchUp":
      return !!window.verticalNav
        ?.branchUp?.();

    case "verticalBranchDown":
      return !!window.verticalNav
        ?.branchDown?.();

    case "rangeUp":
      return !!window.multiSelect
        ?.handleRangeKey?.(-1);

    case "rangeDown":
      return !!window.multiSelect
        ?.handleRangeKey?.(1);

    case "deepUp":
      return !!window.multiSelectDeep
        ?.handleDeepRangeKey?.(-1);

    case "deepDown":
      return !!window.multiSelectDeep
        ?.handleDeepRangeKey?.(1);

    case "branchRangeLeft":
      return !!window.multiSelectBranch
        ?.handleBranchRangeKey?.(-1);

    case "branchRangeRight":
      return !!window.multiSelectBranch
        ?.handleBranchRangeKey?.(1);

    default:
      return false;
  }
}

  function runTreeAction(action) {
    if (!canRunTreeActionNow()) {
      stop();
      return false;
    }

    switch (action) {
      case "navUp":
        if (typeof moveSelection === "function") {
          moveSelection(-1);
          return true;
        }

        return false;

      case "navDown":
        if (typeof moveSelection === "function") {
          moveSelection(1);
          return true;
        }

        return false;

      case "levelNavUp":
        return !!window.levelNav?.up?.();

      case "levelNavDown":
        return !!window.levelNav?.down?.();

      case "branchNavLeft":
        return !!window.branchNav?.left?.();

      case "branchNavRight":
        return !!window.branchNav?.right?.();

      case "rangeUp":
        return !!window.multiSelect
          ?.handleRangeKey?.(-1);

      case "rangeDown":
        return !!window.multiSelect
          ?.handleRangeKey?.(1);

      case "deepUp":
        return !!window.multiSelectDeep
          ?.handleDeepRangeKey?.(-1);

      case "deepDown":
        return !!window.multiSelectDeep
          ?.handleDeepRangeKey?.(1);

      case "branchRangeLeft":
        return !!window.multiSelectBranch
          ?.handleBranchRangeKey?.(-1);

      case "branchRangeRight":
        return !!window.multiSelectBranch
          ?.handleBranchRangeKey?.(1);

      case "moveUp":
        if (typeof moveByVisibleOrder === "function") {
          moveByVisibleOrder(-1);
          return true;
        }

        return false;

      case "moveDown":
        if (typeof moveByVisibleOrder === "function") {
          moveByVisibleOrder(1);
          return true;
        }

        return false;

      case "levelMoveUp":
        return !!window.levelMove?.up?.();

      case "levelMoveDown":
        return !!window.levelMove?.down?.();

      case "branchMoveLeft":
        return !!window.branchMove?.left?.();

      case "branchMoveRight":
        return !!window.branchMove?.right?.();

      default:
        return false;
    }
  }

function runAction(action) {
  const group = getActiveGroup();

  if (group === "table") {
    return runTableAction(action);
  }

  if (group === "vertical") {
    return runVerticalAction(action);
  }

  return runTreeAction(action);
}

  function step() {
    if (
      !heldCode ||
      !heldAction ||
      !downKeys.has(heldCode)
    ) {
      stop();
      return;
    }

    runAction(heldAction);
  }

  function startRepeat(action, code, e) {
    stop();

    heldAction = action;
    heldCode = code;
    heldEventSnapshot = makeEventSnapshot(e);

    tStart = setTimeout(() => {
      tStart = null;

      if (
        !heldAction ||
        !heldCode ||
        !downKeys.has(heldCode)
      ) {
        stop();
        return;
      }

      tRepeat = setInterval(step, REPEAT_MS);
    }, INITIAL_DELAY);
  }

  function isSameHeldCombo(e) {
    if (!heldCode || !heldEventSnapshot) {
      return false;
    }

    if (e.code !== heldCode) {
      return false;
    }

    return (
      !!e.shiftKey === heldEventSnapshot.shiftKey &&
      !!e.altKey === heldEventSnapshot.altKey &&
      !!e.ctrlKey === heldEventSnapshot.ctrlKey &&
      !!e.metaKey === heldEventSnapshot.metaKey
    );
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (window.hotkeysMode === "custom") return;

      
      if (isTypingTarget(e.target)) return;
      if (!isRepeatableBaseKey(e)) return;

      const action = resolveActionFromEvent(e);
      if (!action) return;

      /*
        Повторные системные keydown блокируем.
        Фактический повтор выполняет наш таймер.
      */
      if (e.repeat) {
        if (isSameHeldCombo(e)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
        }

        return;
      }

      if (e.code) {
        downKeys.add(e.code);
      }

      startRepeat(action, e.code, e);
    },
    true
  );

  window.addEventListener(
    "keyup",
    (e) => {
      if (e.code) {
        downKeys.delete(e.code);
      }

      if (!heldCode) return;

      if (
        e.code === heldCode ||
        isModifierKey(e)
      ) {
        stop();
      }
    },
    true
  );

  window.addEventListener("blur", () => {
    downKeys.clear();
    stop();
  });

  window.addEventListener("focus", () => {
    downKeys.clear();
    stop();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;

    downKeys.clear();
    stop();
  });

  window.addEventListener("mouseup", stop, true);

  window.hotkeyHoldRepeat = {
    stop,

    debug() {
      return {
        heldCode,
        heldAction,
        heldEventSnapshot,
        downKeys: Array.from(downKeys),
        activeGroup: getActiveGroup(),
tableView: isTableViewActive(),
verticalView: isVerticalViewActive(),
      };
    },
  };
})();