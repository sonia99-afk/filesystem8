// vertical_nav.js
// Навигация для вертикальной иерархии
// и вертикального айсикла.
//
// По списку: ↑ / ↓
// По уровню: ← / →
// По ветке:  ↑ / ↓
// Это разные назначаемые действия.

(function () {
  if (typeof window === "undefined") return;

  function isVerticalGroupActive() {
    return !!window.hotkeysViewGroup
      ?.isVertical?.();
  }

  function isEditingNow() {
    const ae = document.activeElement;
    if (!ae) return false;

    const tag = String(
      ae.tagName || ""
    ).toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      ae.isContentEditable ||
      !!ae.closest?.(".edit")
    );
  }

  function stopEvent(e) {
  e.preventDefault();
  e.stopPropagation();

  /*
    stopImmediatePropagation здесь нельзя использовать:
    после vertical_nav.js событие должно дойти
    до hotkey_hold_repeat.js, чтобы запустился таймер удержания.
  */
}

  function runAction(action) {
    switch (action) {
      case "verticalListUp":
        if (
          typeof window.moveSelection ===
          "function"
        ) {
          window.moveSelection(-1);
          return true;
        }

        if (
          typeof moveSelection ===
          "function"
        ) {
          moveSelection(-1);
          return true;
        }

        return false;

      case "verticalListDown":
        if (
          typeof window.moveSelection ===
          "function"
        ) {
          window.moveSelection(1);
          return true;
        }

        if (
          typeof moveSelection ===
          "function"
        ) {
          moveSelection(1);
          return true;
        }

        return false;

      /*
        В вертикальном отображении
        соседние объекты одного уровня
        расположены слева и справа.
      */
      case "verticalLevelLeft":
        return !!window.levelNav?.up?.();

      case "verticalLevelRight":
        return !!window.levelNav?.down?.();

      /*
        Родитель расположен сверху,
        ребёнок — снизу.
      */
      case "verticalBranchUp":
        return !!window.branchNav?.left?.();

      case "verticalBranchDown":
        return !!window.branchNav?.right?.();

      default:
        return false;
    }
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (!isVerticalGroupActive()) return;
      if (e.repeat) return;
      if (window.hotkeysMode === "custom") return;
      if (isEditingNow()) return;

      if (
        typeof window.isHotkey !==
          "function" &&
        typeof isHotkey !== "function"
      ) {
        return;
      }

      if (
        typeof treeHasFocus !==
          "undefined" &&
        !treeHasFocus
      ) {
        return;
      }

      if (
        typeof selectedId ===
          "undefined" ||
        !selectedId
      ) {
        return;
      }

      const matcher =
        typeof window.isHotkey ===
        "function"
          ? window.isHotkey
          : isHotkey;

      const actions = [
        "verticalListUp",
        "verticalListDown",
        "verticalLevelLeft",
        "verticalLevelRight",
        "verticalBranchUp",
        "verticalBranchDown",
      ];

      for (const action of actions) {
        if (!matcher(e, action)) {
          continue;
        }

        stopEvent(e);
        runAction(action);
        return;
      }
    },
    true
  );

  window.verticalNav = {
    run: runAction,

    listUp() {
      return runAction(
        "verticalListUp"
      );
    },

    listDown() {
      return runAction(
        "verticalListDown"
      );
    },

    levelLeft() {
      return runAction(
        "verticalLevelLeft"
      );
    },

    levelRight() {
      return runAction(
        "verticalLevelRight"
      );
    },

    branchUp() {
      return runAction(
        "verticalBranchUp"
      );
    },

    branchDown() {
      return runAction(
        "verticalBranchDown"
      );
    },
  };
})();