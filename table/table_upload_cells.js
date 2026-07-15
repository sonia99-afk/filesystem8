// table/table_upload_cells.js
// Upload-ячейки табличного отображения.
//
// Здесь лежит логика для:
// - Обложка
// - Доп изображение
// - Файл

(function () {
  if (typeof window === "undefined") return;

  function selectUploadTableCellFromEvent(e, node) {
    e.stopPropagation();

    window.selectedId = node.id;
    window.treeHasFocus = true;

    const td = e.currentTarget?.closest?.("td");

    if (td) {
      window.tableCellNav?.selectCell?.(td, {
        focus: true,
        scroll: false,
      });
    }
  }

  function bindUploadTableCellSelection(td, node) {
    if (!td || !node) return td;
    if (td.__uploadCellSelectionBound) return td;

    td.__uploadCellSelectionBound = true;

    function selectThisCell() {
      window.selectedId = node.id;
      window.treeHasFocus = true;

      window.tableCellNav?.selectCell?.(td, {
        focus: true,
        scroll: false,
      });
    }

    td.addEventListener(
      "click",
      () => {
        selectThisCell();
      },
      true
    );

    td.addEventListener(
      "dblclick",
      (e) => {
        e.preventDefault();

        selectThisCell();

        window.tableCellNav?.activateCell?.(td);
      },
      true
    );

    return td;
  }

  function markTableUploadCell(td, type) {
    if (!td) return td;

    td.classList.add("table-upload-cell");

    if (type) {
      td.classList.add(`table-upload-cell-${type}`);
    }

    return td;
  }

  function getFileIcon(fileData) {
    const name = String(fileData?.name || "").toLowerCase();
    const type = String(fileData?.type || "").toLowerCase();

    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎵";

    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "📘";
    if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "📗";
    if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "📙";
    if (name.endsWith(".zip") || name.endsWith(".rar") || name.endsWith(".7z")) {
      return "🗜️";
    }

    return "📄";
  }

  function selectNodeOnly(e, node) {
    e.stopPropagation();

    window.selectedId = node.id;
    window.treeHasFocus = true;
  }

  function rerender() {
    if (typeof render === "function") {
      render();
    }
  }

  function isImageFile(file) {
    return !!file?.type && file.type.startsWith("image/");
  }

  function readFileAsDataUrl(file, onLoad) {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");

      if (!dataUrl) return;

      onLoad(dataUrl);
    };

    reader.readAsDataURL(file);
  }

  function makeHiddenFileInput(options = {}) {
    const input = document.createElement("input");

    input.type = "file";
    input.hidden = true;

    if (options.accept) {
      input.accept = options.accept;
    }

    if (options.className) {
      input.className = options.className;
    }

    input.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    return input;
  }

  function makeUploadButton(text, className) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;

    return button;
  }

  function makeRemoveButton(className, title, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = "×";
    button.title = title;

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      onClick(e);
    });

    return button;
  }

  function makeTableFileControl(node, key) {
    const value = getTableProp(node, key);

    const wrap = document.createElement("div");
    wrap.className = "table-file-control";

    const fileInput = makeHiddenFileInput();

    const uploadBtn = makeUploadButton("загрузить файл", "table-file-btn");

    function selectNode(e) {
      selectUploadTableCellFromEvent(e, node);
    }

    wrap.addEventListener("click", selectNode);
    wrap.addEventListener("dblclick", (e) => e.stopPropagation());

    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault();

      selectUploadTableCellFromEvent(e, node);

      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      readFileAsDataUrl(file, (dataUrl) => {
        setTableProp(node, key, {
          name: file.name,
          type: file.type || "",
          size: file.size || 0,
          dataUrl,
        });

        fileInput.value = "";

        rerender();
      });
    });

    if (value && typeof value === "object") {
      const fileBox = document.createElement("div");
      fileBox.className = "table-file-box";

      const icon = document.createElement("span");
      icon.className = "table-file-icon";
      icon.textContent = getFileIcon(value);

      const name = document.createElement("span");
      name.className = "table-file-name";
      name.textContent = value.name || "файл";
      name.title = value.name || "файл";

      const removeBtn = makeRemoveButton(
        "table-file-remove",
        "Удалить файл",
        () => {
          window.selectedId = node.id;
          window.treeHasFocus = true;

          setTableProp(node, key, "");

          rerender();
        }
      );

      fileBox.appendChild(icon);
      fileBox.appendChild(name);
      fileBox.appendChild(removeBtn);

      wrap.appendChild(fileBox);
    }

    wrap.appendChild(uploadBtn);
    wrap.appendChild(fileInput);

    return wrap;
  }

  function makeTableImageControl(node, key) {
    const value = getTableProp(node, key);

    const wrap = document.createElement("div");
    wrap.className = "table-image-control";

    const fileInput = makeHiddenFileInput({
      accept: "image/*",
    });

    const uploadBtn = makeUploadButton("загрузить", "table-image-btn");

    function selectNode(e) {
      selectNodeOnly(e, node);
    }

    wrap.addEventListener("click", selectNode);
    wrap.addEventListener("dblclick", (e) => e.stopPropagation());

    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      window.selectedId = node.id;
      window.treeHasFocus = true;

      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];

      if (!file) return;

      if (!isImageFile(file)) {
        alert("Можно загрузить только изображение.");
        fileInput.value = "";
        return;
      }

      readFileAsDataUrl(file, (dataUrl) => {
        setTableProp(node, key, dataUrl);

        fileInput.value = "";

        rerender();
      });
    });

    if (value) {
      const previewBox = document.createElement("div");
      previewBox.className = "table-image-preview-box";

      const img = document.createElement("img");
      img.className = "table-image-preview";
      img.src = value;
      img.alt = "Доп изображение";

      const removeBtn = makeRemoveButton(
        "table-image-remove",
        "Удалить изображение",
        () => {
          window.selectedId = node.id;
          window.treeHasFocus = true;

          setTableProp(node, key, "");

          rerender();
        }
      );

      previewBox.appendChild(img);
      previewBox.appendChild(removeBtn);

      wrap.appendChild(previewBox);
    }

    wrap.appendChild(uploadBtn);
    wrap.appendChild(fileInput);

    return wrap;
  }

  function makeTableCoverCell(node) {
    const td = document.createElement("td");

    td.className = "table-cover-cell";
    td.dataset.id = node.id;
    td.dataset.prop = "cover";

    markTableUploadCell(td, "cover");

    const value = getTableProp(node, "cover");

    const wrap = document.createElement("div");
    wrap.className = "table-cover-wrap";

    const fileInput = makeHiddenFileInput({
      accept: "image/*",
      className: "table-cover-file",
    });

    function selectNode(e) {
      selectUploadTableCellFromEvent(e, node);
    }

    td.addEventListener("click", selectNode);
    td.addEventListener("dblclick", (e) => e.stopPropagation());

    const uploadBtn = makeUploadButton(
      value ? "заменить" : "загрузить",
      "table-cover-btn"
    );

    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      window.selectedId = node.id;
      window.treeHasFocus = true;

      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];

      if (!file) return;

      if (!isImageFile(file)) {
        alert("Можно загрузить только изображение.");
        fileInput.value = "";
        return;
      }

      readFileAsDataUrl(file, (dataUrl) => {
        setTableProp(node, "cover", dataUrl);

        fileInput.value = "";

        rerender();
      });
    });

    if (value) {
      const previewBox = document.createElement("div");
      previewBox.className = "table-cover-preview-box";

      const img = document.createElement("img");
      img.className = "table-cover-preview";
      img.src = value;
      img.alt = "Обложка";

      const removeBtn = makeRemoveButton(
        "table-cover-remove",
        "Удалить обложку",
        () => {
          window.selectedId = node.id;
          window.treeHasFocus = true;

          setTableProp(node, "cover", "");

          rerender();
        }
      );

      previewBox.appendChild(img);
      previewBox.appendChild(removeBtn);

      wrap.appendChild(previewBox);
    }

    wrap.appendChild(uploadBtn);
    wrap.appendChild(fileInput);

    td.appendChild(wrap);

    return td;
  }

  window.tableUploadCells = {
    selectFromEvent: selectUploadTableCellFromEvent,
    bindSelection: bindUploadTableCellSelection,
    markCell: markTableUploadCell,
    getFileIcon,
    makeFileControl: makeTableFileControl,
    makeImageControl: makeTableImageControl,
    makeCoverCell: makeTableCoverCell,
  };

  window.selectUploadTableCellFromEvent = selectUploadTableCellFromEvent;
  window.bindUploadTableCellSelection = bindUploadTableCellSelection;
  window.markTableUploadCell = markTableUploadCell;
  window.getFileIcon = getFileIcon;
  window.makeTableFileControl = makeTableFileControl;
  window.makeTableImageControl = makeTableImageControl;
  window.makeTableCoverCell = makeTableCoverCell;
})();