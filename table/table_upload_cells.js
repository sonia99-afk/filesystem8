// table/table_upload_cells.js
// Upload-ячейки табличного отображения.
//
// Здесь лежит логика для:
// - Обложка — одно изображение
// - Доп изображение — несколько изображений
// - Файл — несколько файлов

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

    if (
      name.endsWith(".zip") ||
      name.endsWith(".rar") ||
      name.endsWith(".7z")
    ) {
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

  function readFileAsDataUrlPromise(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = String(reader.result || "");

        if (!dataUrl) {
          reject(
            new Error(
              `Не удалось прочитать файл: ${file?.name || "файл"}`
            )
          );

          return;
        }

        resolve(dataUrl);
      };

      reader.onerror = () => {
        reject(
          reader.error ||
            new Error(
              `Не удалось прочитать файл: ${file?.name || "файл"}`
            )
        );
      };

      reader.readAsDataURL(file);
    });
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

    if (options.multiple) {
      input.multiple = true;
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

  /* =========================================================
     Нормализация старых и новых сохранённых значений
  ========================================================= */

  function normalizeStoredFiles(value) {
    if (Array.isArray(value)) {
      return value.filter((item) => {
        return item && typeof item === "object" && item.dataUrl;
      });
    }

    /*
      Поддержка старого одиночного файла.
    */
    if (value && typeof value === "object" && value.dataUrl) {
      return [value];
    }

    return [];
  }

  function getStoredImageUrl(item) {
    if (typeof item === "string") {
      return item;
    }

    if (item && typeof item === "object") {
      return String(item.dataUrl || item.url || "");
    }

    return "";
  }

  function normalizeStoredImages(value) {
    if (Array.isArray(value)) {
      return value
        .map(getStoredImageUrl)
        .filter(Boolean);
    }

    /*
      Поддержка старого одиночного изображения.
    */
    const oldUrl = getStoredImageUrl(value);

    return oldUrl ? [oldUrl] : [];
  }

  /* =========================================================
     Несколько файлов
  ========================================================= */

  function makeTableFileControl(node, key) {
    const files = normalizeStoredFiles(
      getTableProp(node, key)
    );

    const wrap = document.createElement("div");
    wrap.className = "table-file-control";

    const list = document.createElement("div");
    list.className = "table-file-list";

    const fileInput = makeHiddenFileInput({
      multiple: true,
    });

    const uploadBtn = makeUploadButton(
      files.length
        ? "добавить файлы"
        : "загрузить файлы",
      "table-file-btn"
    );

    function selectNode(e) {
      selectUploadTableCellFromEvent(e, node);
    }

    wrap.addEventListener("click", selectNode);

    wrap.addEventListener("dblclick", (e) => {
      e.stopPropagation();
    });

    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault();

      selectUploadTableCellFromEvent(e, node);

      fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      const selectedFiles = Array.from(
        fileInput.files || []
      );

      if (!selectedFiles.length) return;

      try {
        const addedFiles = await Promise.all(
          selectedFiles.map(async (file) => {
            const dataUrl =
              await readFileAsDataUrlPromise(file);

            return {
              name: file.name,
              type: file.type || "",
              size: file.size || 0,
              dataUrl,
            };
          })
        );

        const currentFiles = normalizeStoredFiles(
          getTableProp(node, key)
        );

        setTableProp(node, key, [
          ...currentFiles,
          ...addedFiles,
        ]);

        fileInput.value = "";

        rerender();
      } catch (error) {
        console.error(error);

        alert(
          "Не удалось загрузить один или несколько файлов."
        );

        fileInput.value = "";
      }
    });

    files.forEach((fileData, index) => {
      const fileBox = document.createElement("div");

      fileBox.className = "table-file-box";
      fileBox.dataset.fileIndex = String(index);

      const icon = document.createElement("span");

      icon.className = "table-file-icon";
      icon.textContent = getFileIcon(fileData);

      const name = document.createElement("span");

      name.className = "table-file-name";
      name.textContent = fileData.name || "файл";
      name.title = fileData.name || "файл";

      const removeBtn = makeRemoveButton(
        "table-file-remove",
        "Удалить файл",
        () => {
          window.selectedId = node.id;
          window.treeHasFocus = true;

          const currentFiles = normalizeStoredFiles(
            getTableProp(node, key)
          );

          const nextFiles = currentFiles.filter(
            (_, currentIndex) => {
              return currentIndex !== index;
            }
          );

          setTableProp(node, key, nextFiles);

          rerender();
        }
      );

      fileBox.appendChild(icon);
      fileBox.appendChild(name);
      fileBox.appendChild(removeBtn);

      list.appendChild(fileBox);
    });

    if (files.length) {
      wrap.appendChild(list);
    }

    wrap.appendChild(uploadBtn);
    wrap.appendChild(fileInput);

    return wrap;
  }

  /* =========================================================
     Несколько дополнительных изображений
  ========================================================= */

  function makeTableImageControl(node, key) {
    const images = normalizeStoredImages(
      getTableProp(node, key)
    );

    const wrap = document.createElement("div");
    wrap.className = "table-image-control";

    const list = document.createElement("div");
    list.className = "table-image-preview-list";

    const fileInput = makeHiddenFileInput({
      accept: "image/*",
      multiple: true,
    });

    const uploadBtn = makeUploadButton(
      images.length ? "добавить" : "загрузить",
      "table-image-btn"
    );

    function selectNode(e) {
      selectNodeOnly(e, node);
    }

    wrap.addEventListener("click", selectNode);

    wrap.addEventListener("dblclick", (e) => {
      e.stopPropagation();
    });

    uploadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      window.selectedId = node.id;
      window.treeHasFocus = true;

      fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
      const selectedFiles = Array.from(
        fileInput.files || []
      );

      if (!selectedFiles.length) return;

      const invalidFiles = selectedFiles.filter((file) => {
        return !isImageFile(file);
      });

      if (invalidFiles.length) {
        alert(
          "В колонку «Доп изображение» можно загружать только изображения."
        );

        fileInput.value = "";
        return;
      }

      try {
        const addedImages = await Promise.all(
          selectedFiles.map((file) => {
            return readFileAsDataUrlPromise(file);
          })
        );

        const currentImages = normalizeStoredImages(
          getTableProp(node, key)
        );

        setTableProp(node, key, [
          ...currentImages,
          ...addedImages,
        ]);

        fileInput.value = "";

        rerender();
      } catch (error) {
        console.error(error);

        alert(
          "Не удалось загрузить одно или несколько изображений."
        );

        fileInput.value = "";
      }
    });

    images.forEach((imageUrl, index) => {
      const previewBox =
        document.createElement("div");

      previewBox.className =
        "table-image-preview-box";

      previewBox.dataset.imageIndex =
        String(index);

      const img = document.createElement("img");

      img.className = "table-image-preview";
      img.src = imageUrl;
      img.alt = `Доп изображение ${index + 1}`;

      const removeBtn = makeRemoveButton(
        "table-image-remove",
        "Удалить изображение",
        () => {
          window.selectedId = node.id;
          window.treeHasFocus = true;

          const currentImages =
            normalizeStoredImages(
              getTableProp(node, key)
            );

          const nextImages = currentImages.filter(
            (_, currentIndex) => {
              return currentIndex !== index;
            }
          );

          setTableProp(node, key, nextImages);

          rerender();
        }
      );

      previewBox.appendChild(img);
      previewBox.appendChild(removeBtn);

      list.appendChild(previewBox);
    });

    if (images.length) {
      wrap.appendChild(list);
    }

    wrap.appendChild(uploadBtn);
    wrap.appendChild(fileInput);

    return wrap;
  }

  /* =========================================================
     Одна обложка — оставляем прежнее поведение
  ========================================================= */

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

    td.addEventListener("dblclick", (e) => {
      e.stopPropagation();
    });

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
        alert(
          "Можно загрузить только изображение."
        );

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
      const previewBox =
        document.createElement("div");

      previewBox.className =
        "table-cover-preview-box";

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
    selectFromEvent:
      selectUploadTableCellFromEvent,

    bindSelection:
      bindUploadTableCellSelection,

    markCell:
      markTableUploadCell,

    getFileIcon,

    makeFileControl:
      makeTableFileControl,

    makeImageControl:
      makeTableImageControl,

    makeCoverCell:
      makeTableCoverCell,
  };

  window.selectUploadTableCellFromEvent =
    selectUploadTableCellFromEvent;

  window.bindUploadTableCellSelection =
    bindUploadTableCellSelection;

  window.markTableUploadCell =
    markTableUploadCell;

  window.getFileIcon =
    getFileIcon;

  window.makeTableFileControl =
    makeTableFileControl;

  window.makeTableImageControl =
    makeTableImageControl;

  window.makeTableCoverCell =
    makeTableCoverCell;
})();