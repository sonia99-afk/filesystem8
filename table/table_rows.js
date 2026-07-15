// table/table_rows.js
// Рендер строк табличного отображения.
//
// Здесь лежит:
// - flattenTableRows()
// - renderTableRow()

(function () {
  if (typeof window === "undefined") return;

  function getSelectedId() {
    if (typeof selectedId !== "undefined") {
      return selectedId;
    }

    return window.selectedId || "";
  }

  function selectNodeById(id) {
    if (!id) return;

    if (typeof selectedId !== "undefined") {
      selectedId = id;
    }

    window.selectedId = id;

    if (typeof treeHasFocus !== "undefined") {
      treeHasFocus = true;
    }

    window.treeHasFocus = true;
  }

  function startTableNameRename(node, cell) {
  if (!node || !cell) return false;

  selectNodeById(node.id);

  const oldName = String(node.name || "");
  const oldHtml = String(node.nameHtml || "");

  cell.classList.add("is-editing");
  cell.innerHTML = "";

  const input = document.createElement("input");
  input.className = "edit table-name-rename-input";
  input.type = "text";
  input.value = oldName;
  input.style.width =
    Math.max(120, Math.min(520, (oldName.length + 4) * 9)) + "px";

  let finished = false;

  function finish(save) {
    if (finished) return;
    finished = true;

    if (save) {
      const nextName = input.value.trim();

      if (nextName && nextName !== oldName) {
        if (typeof pushHistory === "function" && typeof snapshot === "function") {
          pushHistory(snapshot());
        } else if (typeof pushHistory === "function") {
          pushHistory();
        }

        node.name = nextName;

        /*
          Старое переименование названия делает обычный текст.
          Поэтому, если раньше у названия было rich/html оформление,
          после ручного переименования его сбрасываем.
        */
        node.nameHtml = "";
      }
    } else {
      node.name = oldName;
      node.nameHtml = oldHtml;
    }

    if (typeof render === "function") {
      render();
    }
  }

  input.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  input.addEventListener("dblclick", (e) => {
    e.stopPropagation();
  });

  input.addEventListener("keydown", (e) => {
    e.stopPropagation();

    if (e.key === "Enter" || e.code === "NumpadEnter") {
      e.preventDefault();
      finish(true);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });

  input.addEventListener("blur", () => {
    finish(true);
  });

  cell.appendChild(input);

  requestAnimationFrame(() => {
    input.focus({
      preventScroll: true,
    });

    input.select?.();
  });

  return true;
}

  function flattenTableRows(node, ordinalPath = [], out = []) {
    out.push({
      node,
      ordinalPath,
    });

    const collapsed =
      window.collapseNodes?.isCollapsed?.(node.id);

    if (collapsed) {
      return out;
    }

    (node.children || []).forEach((child, index) => {
      flattenTableRows(child, ordinalPath.concat(index + 1), out);
    });

    return out;
  }

  function makeNameActions(node) {
    const act = document.createElement("span");
    act.className = "act table-name-cell-actions";

    {
      const plus = makeBtn("+", (e) => {
        e.stopPropagation();

        selectNodeById(node.id);

        addSibling(node.id);
      });

      act.appendChild(plus);
    }

{
  const rename = makeBtn("..", (e) => {
    e.preventDefault?.();
    e.stopPropagation();

    const cell = e.currentTarget?.closest?.(".table-name-cell");

    startTableNameRename(node, cell);
  });

  act.appendChild(rename);
}

    if (canHaveChild(node)) {
      const child = makeBtn(">", (e) => {
        e.stopPropagation();

        selectNodeById(node.id);

        addChild(node.id);
      });

      act.appendChild(child);
    }

    if (typeof root !== "undefined" && node.id !== root.id) {
      const del = makeBtn("x", (e) => {
        e.stopPropagation();

        selectNodeById(node.id);

        removeSelected();
      });

      act.appendChild(del);
    }

    return act;
  }

  function makeNameCell(node) {
    const nameTd = document.createElement("td");

    nameTd.className = "table-name-cell table-name-row row";
    nameTd.dataset.id = node.id;
    nameTd.dataset.cellKey = "__name";

    const label = document.createElement("span");
    label.className = "label table-name-cell-label";

    if (node.nameHtml) {
      label.innerHTML = node.nameHtml;
    } else {
      label.textContent = node.name || "";
    }

    nameTd.appendChild(label);
    nameTd.appendChild(makeNameActions(node));

    nameTd.addEventListener("dblclick", (e) => {
  e.preventDefault();
  e.stopPropagation();

  startTableNameRename(node, nameTd);
});

    return nameTd;
  }

  function makeMarkCell(node) {
    const markTd = document.createElement("td");

    markTd.className = "table-mark-cell";
    markTd.dataset.id = node.id;
    markTd.dataset.cellKey = "__mark";

    if (window.markProperty?.buildMarkDot) {
      markTd.appendChild(window.markProperty.buildMarkDot(node.id));
    }

    return markTd;
  }

  function makeIdCell(node) {
    const idTd = document.createElement("td");

    idTd.className = "table-id-cell table-builtin-cell";
    idTd.dataset.id = node.id;
    idTd.dataset.cellKey = "__id";

    renderTableIdCell(idTd, node);

    return idTd;
  }

  function makeOrdinalCell(node, ordinalPath) {
    const ordTd = document.createElement("td");

    ordTd.className = "table-ordinal-cell table-builtin-cell";
    ordTd.dataset.id = node.id;
    ordTd.dataset.cellKey = "__ordinal";

    renderTableOrdinalCell(ordTd, node, ordinalPath);

    return ordTd;
  }

  function makeLevelCell(node) {
    const levelTd = document.createElement("td");

    levelTd.textContent =
      DEFAULT_NAME[node.level] || `Уровень ${node.level}`;

    return levelTd;
  }

  function makeNotesCell(node) {
    const notesTd = document.createElement("td");

    notesTd.className = "table-notes-cell table-builtin-cell";
    notesTd.dataset.id = node.id;
    notesTd.dataset.cellKey = "__notes";

    renderTableDescriptionCell(notesTd, node);

    return notesTd;
  }

  function renderTableRow(node, ordinalPath) {
    const tr = document.createElement("tr");

    tr.className = node.id === getSelectedId() ? "is-selected" : "";

    const idTd = makeIdCell(node);
    const markTd = makeMarkCell(node);
    const ordTd = makeOrdinalCell(node, ordinalPath);

    const iconTd = makeTablePropCell(node, TABLE_ICON_COLUMN);
    iconTd.classList.add("table-icon-cell");

    const coverTd = makeTableCoverCell(node);
    const levelTd = makeLevelCell(node);
    const nameTd = makeNameCell(node);
    const notesTd = makeNotesCell(node);

    tr.append(
      idTd,
      markTd,
      ordTd,
      iconTd,
      coverTd,
      levelTd,
      nameTd,
      notesTd
    );

    appendTablePropertyCells(tr, node);

    return tr;
  }

  window.tableRows = {
    flatten: flattenTableRows,
    renderRow: renderTableRow,
    startNameRename: startTableNameRename,
  };

  window.flattenTableRows = flattenTableRows;
  window.renderTableRow = renderTableRow;
  window.startTableNameRename = startTableNameRename;
})();