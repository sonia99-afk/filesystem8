// table/table_props.js
// Общие свойства табличного отображения.
//
// Здесь хранятся:
// - ensureTableProps(node)
// - getTableProp(node, key)
// - setTableProp(node, key, value)
//
// Эти функции используются почти всеми табличными модулями.

(function () {
  if (typeof window === "undefined") return;

  const DATE_TIME_LINKED_KEYS = new Set([
    "startDate",
    "endDate",
    "startTime",
    "endTime",
  ]);

  function ensureTableProps(node) {
    if (!node) return {};

    if (!node.tableProps || typeof node.tableProps !== "object") {
      node.tableProps = {};
    }

    return node.tableProps;
  }

  function getTableProp(node, key) {
    if (!node || !key) return "";

    const props = ensureTableProps(node);

    return props[key] || "";
  }

  function syncLinkedControlsIfNeeded(node, key) {
    if (!node || !key) return;
    if (!DATE_TIME_LINKED_KEYS.has(key)) return;

    requestAnimationFrame(() => {
      /*
        Пока date/time-блок ещё находится внутри table_view.js.
        Когда вынесем его в отдельный файл, он сможет зарегистрировать
        window.tableDateTimeCells.syncLinkedControlsForKey.
      */
      if (window.tableDateTimeCells?.syncLinkedControlsForKey) {
        window.tableDateTimeCells.syncLinkedControlsForKey(node, key);
        return;
      }

      /*
        Временный fallback, если мы просто экспортируем старую функцию
        из table_view.js наружу.
      */
      window.syncTableDateTimeLinkedControlsForKey?.(node, key);
    });
  }

  function setTableProp(node, key, value) {
    if (!node || !key) return false;

    const props = ensureTableProps(node);
    const oldValue = props[key] || "";

    if (oldValue === value) return false;

    if (typeof pushHistory === "function" && typeof snapshot === "function") {
      pushHistory(snapshot());
    }

    props[key] = value;

    syncLinkedControlsIfNeeded(node, key);

    return true;
  }

  window.tableProps = {
    ensure: ensureTableProps,
    get: getTableProp,
    set: setTableProp,
  };

  window.ensureTableProps = ensureTableProps;
  window.getTableProp = getTableProp;
  window.setTableProp = setTableProp;
})();