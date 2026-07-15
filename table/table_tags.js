// table/table_tags.js
// Логика тегов табличного отображения.
//
// Здесь хранится:
// - список пользовательских тегов
// - сбор тегов, уже используемых в дереве
// - добавление нового тега
// - переименование тега
// - удаление тега у всех объектов
// - варианты для dropdown-колонки "Тег"

(function () {
  if (typeof window === "undefined") return;

  let tableExtraTagOptions = [];

  function getTagAddValue() {
    return window.TABLE_TAG_ADD_VALUE || "__add_tag__";
  }

  function normalizeTableTag(tag) {
    return String(tag || "").trim();
  }

  function isRealTableTag(tag) {
    const value = normalizeTableTag(tag);

    return !!value && value !== getTagAddValue();
  }

  function walkTableNodes(fn) {
    function walk(node) {
      if (!node) return;

      fn(node);

      (node.children || []).forEach(walk);
    }

    if (typeof root !== "undefined") {
      walk(root);
    }
  }

  function collectUsedTableTags() {
    const tags = new Set();

    walkTableNodes((node) => {
      const tag = node.tableProps?.tag;

      if (isRealTableTag(tag)) {
        tags.add(tag);
      }
    });

    tableExtraTagOptions.forEach((tag) => {
      if (isRealTableTag(tag)) {
        tags.add(tag);
      }
    });

    return Array.from(tags);
  }

  function addTableTagOption(tag) {
    const value = normalizeTableTag(tag);

    if (!value) return "";

    if (!tableExtraTagOptions.includes(value)) {
      tableExtraTagOptions.push(value);
    }

    return value;
  }

  function renameTableTagOption(oldTag) {
    const oldValue = normalizeTableTag(oldTag);
    if (!isRealTableTag(oldValue)) return false;

    const newValue = normalizeTableTag(
      window.prompt("Новое название тега", oldValue)
    );

    if (!newValue || newValue === oldValue) return false;

    if (typeof pushHistory === "function") {
      pushHistory();
    }

    tableExtraTagOptions = tableExtraTagOptions
      .map((tag) => (tag === oldValue ? newValue : tag))
      .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);

    if (!tableExtraTagOptions.includes(newValue)) {
      tableExtraTagOptions.push(newValue);
    }

    walkTableNodes((node) => {
      if (node.tableProps?.tag === oldValue) {
        node.tableProps.tag = newValue;
      }
    });

    if (typeof render === "function") {
      render();
    }

    return true;
  }

  function deleteTableTagOption(tag) {
    const value = normalizeTableTag(tag);
    if (!isRealTableTag(value)) return false;

    const ok = window.confirm(`Удалить тег "${value}" у всех объектов?`);
    if (!ok) return false;

    if (typeof pushHistory === "function") {
      pushHistory();
    }

    tableExtraTagOptions = tableExtraTagOptions.filter((tag) => {
      return tag !== value;
    });

    walkTableNodes((node) => {
      if (node.tableProps?.tag === value) {
        node.tableProps.tag = "";
      }
    });

    if (typeof render === "function") {
      render();
    }

    return true;
  }

  function getTableTagOptions() {
    const tags = collectUsedTableTags();

    return [
      { value: "", label: "нет" },
      ...tags.map((tag) => ({
        value: tag,
        label: tag,
      })),
      { value: getTagAddValue(), label: "добавить вариант" },
    ];
  }

  window.tableTags = {
    normalize: normalizeTableTag,
    isReal: isRealTableTag,
    collectUsed: collectUsedTableTags,
    add: addTableTagOption,
    rename: renameTableTagOption,
    delete: deleteTableTagOption,
    getOptions: getTableTagOptions,
  };

  window.normalizeTableTag = normalizeTableTag;
  window.isRealTableTag = isRealTableTag;
  window.collectUsedTableTags = collectUsedTableTags;
  window.addTableTagOption = addTableTagOption;
  window.renameTableTagOption = renameTableTagOption;
  window.deleteTableTagOption = deleteTableTagOption;
  window.getTableTagOptions = getTableTagOptions;
})();