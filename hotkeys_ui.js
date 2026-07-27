// hotkeys_ui.js
// Редактирование хоткеев:
// - вход в режим по клику в область хоткеев
// - кнопки: Сохранить / Не сохранять / Сброс к исходным
// - выход кликом вне области
// - если есть несохранённые изменения — модалка

(function () {
  if (typeof window === "undefined") return;

  window.hotkeysMode = window.hotkeysMode || "builtin";

  const IDs = {
    edit: "hkEditBtn",
    save: "hkSaveBtn",
    discard: "hkDiscardBtn",
    reset: "hotkeysResetBtn",
  };

  let snapshot = null;

  function el(id) {
    return document.getElementById(id);
  }

  function isEditing() {
    return window.hotkeysMode === "custom";
  }

  function setInactive(btn, inactive) {
    if (!btn) return;
    btn.disabled = !!inactive;
    btn.classList.toggle("is-inactive", !!inactive);
  }

  function platform() {
    return window.hotkeys?.getPlatformInfo?.() || {
      primaryToken: "Primary",
      primaryLabel: "Ctrl",
    };
  }

  function prettyHotkey(v) {
    const { primaryToken, primaryLabel, altLabel = "Alt" } = platform();

    if (typeof v !== "string") return String(v ?? "");
    if (v.trim() === "") return "";
    if (v.trim() === "+") return "+";

    const rawTokens = v.split("+").map((s) => s.trim()).filter(Boolean);
    if (!rawTokens.length) return "";

    const prio = (t) => {
      if (t === primaryToken) return 1;
      if (t === "Alt") return 2;
      if (t === "Shift") return 3;
      return 4;
    };

    const tokens = [...rawTokens].sort((a, b) => {
      const pa = prio(a);
      const pb = prio(b);
      if (pa !== pb) return pa - pb;
      return String(a).localeCompare(String(b));
    });

    const mapToken = (t) => {
      if (t === primaryToken) return primaryLabel;
      if (t === "Alt") return altLabel;
      if (t === "Plus") return "+";
      if (t === "ArrowUp") return "↑";
      if (t === "ArrowDown") return "↓";
      if (t === "ArrowLeft") return "←";
      if (t === "ArrowRight") return "→";
      if (t === "DblClick") return "DblClick";
      if (t === "BracketLeft") return "{";
      if (t === "BracketRight") return "}";
      return t;
    };

    return tokens.map(mapToken).join("+");
  }

  function attachClearButton(td, action, value) {
    td.querySelector(".hk-clear")?.remove();

    if (window.hotkeysMode !== "custom") return;
    if (!value) return;

    const btn = document.createElement("span");
    btn.className = "hk-clear";
    btn.textContent = "×";
    btn.title = "Удалить хоткей";

    ["mousedown", "pointerdown", "dblclick"].forEach((ev) => {
      btn.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      });
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      window.hotkeys?.set?.(action, "");
      syncHotkeysTable();
    });

    td.appendChild(btn);
  }

  function syncLabelAndButtons() {
    const bEdit = el(IDs.edit);
    const bSave = el(IDs.save);
    const bDiscard = el(IDs.discard);
    const bReset = el(IDs.reset);

    const on = isEditing();

    // кнопку "Редактировать" больше не используем
    if (bEdit) bEdit.style.display = "none";

    if (bSave) bSave.textContent = UI.labels.hotkeys.save;
if (bDiscard) bDiscard.textContent = UI.labels.hotkeys.discard;
if (bReset) bReset.textContent = UI.labels.hotkeys.reset;

    setInactive(bSave, !on);
    setInactive(bDiscard, !on);
    setInactive(bReset, !on);
  }

  function syncHotkeysTable() {
    try {
      document.querySelectorAll("td[data-action]").forEach((td) => {
        const action = td.dataset.action;
        const v = window.hotkeys?.get?.(action) || "";

        td.textContent = v ? prettyHotkey(v) : "";
        attachClearButton(td, action, v);
      });

      const conflicts = window.hotkeys?.findConflicts?.() || new Set();

      document.querySelectorAll("td[data-action].conflict").forEach((td) => {
        td.classList.remove("conflict");
      });

      document.querySelectorAll("td[data-action]").forEach((td) => {
        const action = td.dataset.action;
        if (conflicts.has(action)) td.classList.add("conflict");
      });
    } catch (_) {}
  }

  window.syncHotkeysTable = syncHotkeysTable;

  function takeSnapshot() {
    snapshot = window.hotkeys?.getAll?.() || null;
  }

  function currentConfig() {
    return window.hotkeys?.getAll?.() || null;
  }

  function hasUnsavedChanges() {
    if (!snapshot) return false;
    return JSON.stringify(snapshot) !== JSON.stringify(currentConfig());
  }

  function restoreSnapshot() {
    if (!snapshot) return;

    for (const [action, combo] of Object.entries(snapshot)) {
      window.hotkeys?.set?.(action, combo);
    }

    syncHotkeysTable();
  }

  function enterEditMode() {
    if (isEditing()) return;

    takeSnapshot();

    window.hotkeysMode = "custom";
    document.body.classList.add("hotkeys-edit-mode");

    syncLabelAndButtons();
    syncHotkeysTable();
  }

  function exitEditModeKeep() {
    if (!isEditing()) return;

    window.hotkeysMode = "builtin";
    document.body.classList.remove("hotkeys-edit-mode");

    snapshot = null;

    syncLabelAndButtons();
    syncHotkeysTable();
  }

  function exitEditModeDiscard() {
    if (!isEditing()) return;

    restoreSnapshot();

    window.hotkeysMode = "builtin";
    document.body.classList.remove("hotkeys-edit-mode");

    snapshot = null;

    syncLabelAndButtons();
    syncHotkeysTable();
  }

  function resetToDefaults() {
    if (!isEditing()) return;

    try {
      window.hotkeys?.reset?.();
    } catch (_) {}

    syncHotkeysTable();
  }

  function isInsideHotkeysArea(target) {
    return !!(
      target &&
      target.closest &&
      (
        target.closest(".hotkeys-editor") ||
        target.closest(".hotkeys-table") ||
        target.closest("table")?.querySelector?.("td[data-action]") ||
        target.closest("td[data-action]") ||
        target.closest("#hkSaveBtn") ||
        target.closest("#hkDiscardBtn") ||
        target.closest("#hotkeysResetBtn")
      )
    );
  }

  function showExitConfirmModal() {
    if (document.querySelector(".hk-exit-modal-backdrop")) return;

    const backdrop = document.createElement("div");
    backdrop.className = "hk-exit-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "hk-exit-modal";

    // modal.innerHTML = `
    //   <div class="hk-exit-modal-title">Сохранить изменения перед выходом?</div>
    //   <div class="hk-exit-modal-text">
    //     Вы выходите из режима редактирования хоткеев.<br>
    //     Без сохранения изменения будут потеряны.
    //   </div>
    //   <div class="hk-exit-modal-actions">
    //     <button type="button" class="btnn hk-stay">Остаться</button>
    //     <button type="button" class="btnn save hk-save">Сохранить</button>
    //     <button type="button" class="btnn dontsave hk-discard">Не сохранять</button>
    //   </div>
    // `;

    modal.innerHTML = `
  <div class="hk-exit-modal-title">${UI.labels.hotkeys.exitTitle}</div>
  <div class="hk-exit-modal-text">
    ${UI.labels.hotkeys.exitText}
  </div>
  <div class="hk-exit-modal-actions">
    <button type="button" class="btnn dontsave hk-discard">${UI.labels.hotkeys.discard}</button>
    <button type="button" class="btnn hk-stay">${UI.labels.hotkeys.stay}</button>
    <button type="button" class="btnn save hk-save">${UI.labels.hotkeys.save}</button>
  </div>
`;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal.querySelector(".hk-stay")?.addEventListener("click", () => {
      backdrop.remove();
    });

modal.querySelector(".hk-save")?.addEventListener("click", () => {
  backdrop.remove();

  /*
    Сначала сохраняем изменения и выходим
    из режима редактирования.
  */
  exitEditModeKeep();

  /*
    Затем полностью закрываем панель хоткеев.
  */
  window.hotkeysPanelController
    ?.close?.();
});

modal.querySelector(".hk-discard")?.addEventListener("click", () => {
  backdrop.remove();

  /*
    Сначала возвращаем предыдущие значения
    и выходим из режима редактирования.
  */
  exitEditModeDiscard();

  /*
    Затем полностью закрываем панель хоткеев.
  */
  window.hotkeysPanelController
    ?.close?.();
});

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });
  }

  function tryExitByOutsideClick() {
    if (!isEditing()) return;

    if (hasUnsavedChanges()) {
      showExitConfirmModal();
      return;
    }

    exitEditModeKeep();
  }

  function initOutsideClickHandler() {
    document.addEventListener(
      "mousedown",
      (e) => {
        if (!isEditing()) return;
        if (document.querySelector(".hk-exit-modal-backdrop")) return;

        if (isInsideHotkeysArea(e.target)) return;

        e.preventDefault();
        e.stopPropagation();

        tryExitByOutsideClick();
      },
      true
    );
  }

  function initEnterByClickHandler() {
    document.addEventListener(
      "mousedown",
      (e) => {
        const cell = e.target?.closest?.("td[data-action]");
        if (!cell) return;

        if (!isEditing()) {
          enterEditMode();
        }
      },
      true
    );
  }

  function init() {
    const bEdit = el(IDs.edit);
    const bSave = el(IDs.save);
    const bDiscard = el(IDs.discard);
    const bReset = el(IDs.reset);

    if (bEdit) bEdit.style.display = "none";

    if (bSave) bSave.addEventListener("click", exitEditModeKeep);
    if (bDiscard) bDiscard.addEventListener("click", exitEditModeDiscard);
    if (bReset) bReset.addEventListener("click", resetToDefaults);

    document.body.classList.toggle("hotkeys-edit-mode", isEditing());

    initEnterByClickHandler();
    initOutsideClickHandler();

    syncLabelAndButtons();
    setTimeout(syncHotkeysTable, 0);
  }

  window.enterHotkeysEditMode = enterEditMode;
  window.exitHotkeysEditModeKeep = exitEditModeKeep;
  window.exitHotkeysEditModeDiscard = exitEditModeDiscard;
  window.resetHotkeysToDefaults = resetToDefaults;
  window.hasUnsavedHotkeyChanges = hasUnsavedChanges;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();