// table/table_rich_text_cells.js
// Rich-text ячейки табличного отображения.
//
// Используется для:
// - Описание
// - Текст

(function () {
  if (typeof window === "undefined") return;

  function escapeTableRichText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function plainTextFromRichHtml(html) {
    if (typeof htmlPlainText === "function") {
      return htmlPlainText(html);
    }

    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";

    return (tmp.textContent || "").trim();
  }

  function normalizeTableRichHtml(html) {
    if (window.__fmtSync?.normalizeRichHtml) {
      const next = window.__fmtSync.normalizeRichHtml(html || "");

      return {
        html: next.html || "",
        text: next.text || "",
      };
    }

    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";

    function replaceTag(selector, cls) {
      tmp.querySelectorAll(selector).forEach((el) => {
        const span = document.createElement("span");
        span.className = cls;
        span.innerHTML = el.innerHTML;
        el.replaceWith(span);
      });
    }

    replaceTag("b,strong", "rt-b");
    replaceTag("i,em", "rt-i");
    replaceTag("u", "rt-u");
    replaceTag("s,strike,del", "rt-s");

    function walk(node) {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType !== Node.ELEMENT_NODE) continue;

        const tag = child.tagName.toLowerCase();

        if (tag === "br") {
          continue;
        }

        if (tag === "div") {
          child.before(
            ...Array.from(child.childNodes),
            document.createElement("br")
          );
          child.remove();
          continue;
        }

        if (tag === "span") {
          const keep =
            child.classList.contains("rt-b") ||
            child.classList.contains("rt-i") ||
            child.classList.contains("rt-u") ||
            child.classList.contains("rt-s") ||
            child.classList.contains("rt-color") ||
            child.classList.contains("rt-bg");

          if (!keep) {
            child.replaceWith(...Array.from(child.childNodes));
            continue;
          }

          const styleParts = [];

          if (child.classList.contains("rt-color")) {
            const color = child.style.getPropertyValue("--rt-color") || "";

            if (color) {
              styleParts.push(`--rt-color:${color}`);
            }
          }

          if (child.classList.contains("rt-bg")) {
            const bg = child.style.getPropertyValue("--rt-bg") || "";

            if (bg) {
              styleParts.push(`--rt-bg:${bg}`);
            }
          }

          if (styleParts.length) {
            child.setAttribute("style", styleParts.join(";"));
          } else {
            child.removeAttribute("style");
          }

          walk(child);
          continue;
        }

        child.replaceWith(...Array.from(child.childNodes));
      }
    }

    walk(tmp);

    while (tmp.lastChild && tmp.lastChild.nodeName === "BR") {
      tmp.removeChild(tmp.lastChild);
    }

    const hasFmt = !!tmp.querySelector(
      "span.rt-b, span.rt-i, span.rt-u, span.rt-s, span.rt-color, span.rt-bg"
    );

    return {
      html: hasFmt ? tmp.innerHTML : "",
      text: (tmp.textContent || "").trim(),
    };
  }

  function renderTableRichCellValue(td, rich) {
    td.innerHTML = "";

    const view = document.createElement("div");
    view.className = "table-cell-value table-rich-cell-value";

    const html = rich?.html || "";
    const text = rich?.text || "";

    if (html) {
      view.innerHTML = html;
    } else if (text) {
      view.textContent = text;
    } else {
      view.classList.add("is-empty");
      view.textContent = "";
    }

    td.appendChild(view);
  }

  function getTableDescriptionRich(node) {
    if (!Array.isArray(node.captions) || !node.captions.length) {
      return {
        text: "",
        html: "",
      };
    }

    const parts = node.captions
      .map((caption) => {
        const html = caption.textHtml || "";
        const text = caption.text || plainTextFromRichHtml(html);

        return {
          text,
          html,
        };
      })
      .filter((part) => part.text || part.html);

    if (!parts.length) {
      return {
        text: "",
        html: "",
      };
    }

    if (parts.length === 1) {
      return parts[0];
    }

    const hasHtml = parts.some((part) => part.html);

    return {
      text: parts.map((part) => part.text).join("\n"),
      html: hasHtml
        ? parts
            .map((part) => part.html || escapeTableRichText(part.text))
            .join("<br>")
        : "",
    };
  }

  function setTableDescriptionRich(node, rich) {
    const nextText = String(rich?.text || "");
    const nextHtml = String(rich?.html || "");

    const old = getTableDescriptionRich(node);

    if (old.text === nextText && old.html === nextHtml) {
      return;
    }

    if (typeof pushHistory === "function") {
      pushHistory();
    }

    if (!nextText.trim() && !nextHtml.trim()) {
      node.captions = [];
      return;
    }

    const first = Array.isArray(node.captions) ? node.captions[0] : null;

    node.captions = [
      {
        id: first?.id || uid(),
        text: nextText,
        textHtml: nextHtml,
      },
    ];
  }

  function getTablePropRich(node, key) {
    const text = String(getTableProp(node, key) || "");
    const html = String(getTableProp(node, `${key}Html`) || "");

    return {
      text,
      html,
    };
  }

  function setTablePropRich(node, key, rich) {
    const props = ensureTableProps(node);

    const nextText = String(rich?.text || "");
    const nextHtml = String(rich?.html || "");

    const oldText = String(props[key] || "");
    const oldHtml = String(props[`${key}Html`] || "");

    if (oldText === nextText && oldHtml === nextHtml) {
      return;
    }

    if (typeof pushHistory === "function" && typeof snapshot === "function") {
      pushHistory(snapshot());
    } else if (typeof pushHistory === "function") {
      pushHistory();
    }

    props[key] = nextText;
    props[`${key}Html`] = nextHtml;
  }

  function renderTableDescriptionCell(td, node) {
    renderTableRichCellValue(td, getTableDescriptionRich(node));
  }

  function renderTableTextPropCell(td, node, column) {
    renderTableRichCellValue(td, getTablePropRich(node, column.key));
  }

  function startTableRichTextCellEditor(td, options) {
    if (!td) return false;
    if (td.classList.contains("is-editing")) return true;

    const {
      value = {
        text: "",
        html: "",
      },
      multiline = false,
      save,
      render,
    } = options || {};

    td.classList.add("is-editing", "table-rich-cell-editing");
    td.innerHTML = "";

    const editor = document.createElement("div");
    editor.className = multiline
      ? "edit edit-rich edit-caption table-rich-cell-editor table-rich-cell-editor-multiline"
      : "edit edit-rich table-rich-cell-editor";

    editor.contentEditable = "true";
    editor.spellcheck = false;

    if (value.html) {
      editor.innerHTML = value.html;
    } else {
      editor.textContent = value.text || "";
    }

    const stopMouse = (e) => {
      e.stopPropagation();
    };

    [
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "click",
      "dblclick",
    ].forEach((eventName) => {
      editor.addEventListener(eventName, stopMouse);
    });

    let done = false;

    function syncFormattingButtons() {
      if (typeof window.syncFmtButtons === "function") {
        window.syncFmtButtons();
      }

      window.colorFormatting?.syncToolbar?.();
    }

    function finish(shouldSave) {
      if (done) return;
      done = true;

      if (shouldSave && typeof save === "function") {
        const normalized = normalizeTableRichHtml(editor.innerHTML);

        const editorText = editor.textContent ?? "";
        const nextText = editorText === "" ? "" : normalized.text || "";

        save({
          text: nextText,
          html: normalized.html || "",
        });
      }

      td.classList.remove("is-editing", "table-rich-cell-editing");

      if (typeof render === "function") {
        render();
      }

      requestAnimationFrame(() => {
        window.tableCellNav?.selectCell?.(td, {
          focus: true,
          scroll: false,
        });
      });
    }

    editor.addEventListener(
      "keydown",
      (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
          return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finish(true);
        }
      },
      true
    );

    editor.addEventListener("keyup", syncFormattingButtons);
    editor.addEventListener("mouseup", syncFormattingButtons);
    editor.addEventListener("input", syncFormattingButtons);

    editor.addEventListener("blur", () => {
      finish(true);
    });

    td.appendChild(editor);

    requestAnimationFrame(() => {
      editor.focus({
        preventScroll: true,
      });

      const selection = window.getSelection();
      const range = document.createRange();

      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);

      syncFormattingButtons();
    });

    return true;
  }

  function startTableRichTextCellFromTd(td) {
    if (!td) return false;

    const id = td.dataset.id || td.dataset.rowId;
    const key = td.dataset.prop;

    if (!id || !key) return false;
    if (key !== "text") return false;

    const found = findWithParent(root, id);
    const node = found?.node;
    const column = window.getTableColumnByKey?.(key);

    if (!node || !column) return false;

    window.selectedId = node.id;
    window.treeHasFocus = true;

    return startTableRichTextCellEditor(td, {
      value: getTablePropRich(node, column.key),
      multiline: true,

      save(rich) {
        setTablePropRich(node, column.key, rich);
      },

      render() {
        renderTableTextPropCell(td, node, column);
      },
    });
  }

  function makeTableRichTextPropCell(node, column) {
    const td = document.createElement("td");

    td.className = "table-prop-cell table-rich-text-cell table-text-cell";
    td.dataset.prop = column.key;
    td.dataset.id = node.id;
    td.dataset.editorType = "richText";

    renderTableTextPropCell(td, node, column);

    td.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();

      window.tableCellNav?.selectCell?.(td, {
        focus: true,
        scroll: false,
      });

      startTableRichTextCellFromTd(td);
    });

    return td;
  }

  window.tableRichTextCells = {
    escape: escapeTableRichText,
    plainTextFromHtml: plainTextFromRichHtml,
    normalizeHtml: normalizeTableRichHtml,

    renderRichValue: renderTableRichCellValue,

    getDescription: getTableDescriptionRich,
    setDescription: setTableDescriptionRich,
    renderDescription: renderTableDescriptionCell,

    getProp: getTablePropRich,
    setProp: setTablePropRich,
    renderTextProp: renderTableTextPropCell,

    startEditor: startTableRichTextCellEditor,
    startFromTd: startTableRichTextCellFromTd,
    makeTextPropCell: makeTableRichTextPropCell,
  };

  window.escapeTableRichText = escapeTableRichText;
  window.plainTextFromRichHtml = plainTextFromRichHtml;
  window.normalizeTableRichHtml = normalizeTableRichHtml;

  window.renderTableRichCellValue = renderTableRichCellValue;

  window.getTableDescriptionRich = getTableDescriptionRich;
  window.setTableDescriptionRich = setTableDescriptionRich;
  window.renderTableDescriptionCell = renderTableDescriptionCell;

  window.getTablePropRich = getTablePropRich;
  window.setTablePropRich = setTablePropRich;
  window.renderTableTextPropCell = renderTableTextPropCell;

  window.startTableRichTextCellEditor = startTableRichTextCellEditor;
  window.startTableRichTextCellFromTd = startTableRichTextCellFromTd;
  window.makeTableRichTextPropCell = makeTableRichTextPropCell;
})();