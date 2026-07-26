// table/table_datetime_cells.js
// Date/time ячейки табличного отображения.
//
// Здесь лежит логика для:
// - одиночных date/time значений
// - диапазона дат
// - диапазона времени
// - пары дата + время
// - полного диапазона дата/время
// - синхронизации связанных date/time ячеек

(function () {
  if (typeof window === "undefined") return;

  function syncTableDateTimeLinkedControlsForKey(node, key) {
    if (!node || !key) return;

    syncTableSingleInputsForKey(node, key);
    syncTableRangeControlsForKey(node, key);
    syncTableDateTimeControlsForKey(node, key);
    syncTableFullDateTimeRangeControlsForKey(node, key);
  }

  function syncTableRangeControlsForKey(node, key) {
    const host = document.getElementById("tree");
    if (!host || !node?.id) return;

    host.querySelectorAll(".table-range-control[data-id]").forEach((wrap) => {
      if (wrap.dataset.id !== node.id) return;

      const startKey = wrap.dataset.startKey;
      const endKey = wrap.dataset.endKey;
      const inputType = wrap.dataset.inputType || "text";

      if (key && key !== startKey && key !== endKey) return;

      const startInput = wrap.querySelector(
        '.table-range-input[data-role="start"]'
      );
      const endInput = wrap.querySelector(
        '.table-range-input[data-role="end"]'
      );
      const view = wrap.querySelector(".table-range-view");

      if (startInput && document.activeElement !== startInput) {
        startInput.value = getTableProp(node, startKey);
      }

      if (endInput && document.activeElement !== endInput) {
        endInput.value = getTableProp(node, endKey);
      }

      if (view) {
        view.textContent = getTableRangeViewText(
          node,
          {
            startKey,
            endKey,
          },
          inputType
        );
      }
    });
  }

  function syncTableSingleInputsForKey(node, key) {
    const host = document.getElementById("tree");
    if (!host || !node?.id || !key) return;

    host.querySelectorAll(".table-prop-cell[data-id]").forEach((cell) => {
      if (cell.dataset.id !== node.id) return;
      if (cell.dataset.prop !== key) return;

      const column = window.getTableColumnByKey?.(key);

      if (!column) return;

      const input = cell.querySelector(".table-prop-input");

      if (input && document.activeElement !== input) {
        input.value = getTableProp(node, key);
      }

      if (
        cell.classList.contains("table-direct-cell") &&
        !cell.classList.contains("is-editing")
      ) {
        window.renderDirectTableCellView?.(cell, node, column);
      }
    });
  }

  function syncTableDateTimeControlsForKey(node, key) {
    const host = document.getElementById("tree");
    if (!host || !node?.id || !key) return;

    host.querySelectorAll(".table-datetime-control[data-id]").forEach((wrap) => {
      if (wrap.dataset.id !== node.id) return;

      const dateKey = wrap.dataset.dateKey;
      const timeKey = wrap.dataset.timeKey;

      if (key !== dateKey && key !== timeKey) return;

      const dateInput = wrap.querySelector(
        '.table-datetime-input[data-role="date"]'
      );
      const timeInput = wrap.querySelector(
        '.table-datetime-input[data-role="time"]'
      );
      const view = wrap.querySelector(".table-datetime-view");

      if (dateInput && document.activeElement !== dateInput) {
        dateInput.value = getTableProp(node, dateKey);
      }

      if (timeInput && document.activeElement !== timeInput) {
        timeInput.value = getTableProp(node, timeKey);
      }

      if (view) {
        view.textContent = getTableDateTimeViewText(node, {
          dateKey,
          timeKey,
        });
      }
    });
  }

  function syncTableFullDateTimeRangeControlsForKey(node, key) {
    const host = document.getElementById("tree");
    if (!host || !node?.id || !key) return;

    host
      .querySelectorAll(".table-full-datetime-range-control[data-id]")
      .forEach((wrap) => {
        if (wrap.dataset.id !== node.id) return;

        const startDateKey = wrap.dataset.startDateKey;
        const startTimeKey = wrap.dataset.startTimeKey;
        const endDateKey = wrap.dataset.endDateKey;
        const endTimeKey = wrap.dataset.endTimeKey;

        if (
          key !== startDateKey &&
          key !== startTimeKey &&
          key !== endDateKey &&
          key !== endTimeKey
        ) {
          return;
        }

        const startDateInput = wrap.querySelector(
          '.table-full-datetime-range-input[data-role="start-date"]'
        );
        const startTimeInput = wrap.querySelector(
          '.table-full-datetime-range-input[data-role="start-time"]'
        );
        const endDateInput = wrap.querySelector(
          '.table-full-datetime-range-input[data-role="end-date"]'
        );
        const endTimeInput = wrap.querySelector(
          '.table-full-datetime-range-input[data-role="end-time"]'
        );
        const view = wrap.querySelector(".table-full-datetime-range-view");

        if (startDateInput && document.activeElement !== startDateInput) {
          startDateInput.value = getTableProp(node, startDateKey);
        }

        if (startTimeInput && document.activeElement !== startTimeInput) {
          startTimeInput.value = getTableProp(node, startTimeKey);
        }

        if (endDateInput && document.activeElement !== endDateInput) {
          endDateInput.value = getTableProp(node, endDateKey);
        }

        if (endTimeInput && document.activeElement !== endTimeInput) {
          endTimeInput.value = getTableProp(node, endTimeKey);
        }

        if (view) {
          view.textContent = getTableFullDateTimeRangeViewText(node, {
            startDateKey,
            startTimeKey,
            endDateKey,
            endTimeKey,
          });
        }
      });
  }

  function setTableRangeProps(node, startKey, endKey, startValue, endValue) {
    const props = ensureTableProps(node);

    const oldStart = props[startKey] || "";
    const oldEnd = props[endKey] || "";

    if (oldStart === startValue && oldEnd === endValue) return;

    if (typeof pushHistory === "function" && typeof snapshot === "function") {
      pushHistory(snapshot());
    }

    props[startKey] = startValue;
    props[endKey] = endValue;

    requestAnimationFrame(() => {
      syncTableDateTimeLinkedControlsForKey(node, startKey);
      syncTableDateTimeLinkedControlsForKey(node, endKey);
    });
  }

  function setTableDateTimeProps(node, dateKey, timeKey, dateValue, timeValue) {
    const props = ensureTableProps(node);

    const oldDate = props[dateKey] || "";
    const oldTime = props[timeKey] || "";

    if (oldDate === dateValue && oldTime === timeValue) return;

    if (typeof pushHistory === "function" && typeof snapshot === "function") {
      pushHistory(snapshot());
    }

    props[dateKey] = dateValue;
    props[timeKey] = timeValue;

    requestAnimationFrame(() => {
      syncTableDateTimeLinkedControlsForKey(node, dateKey);
      syncTableDateTimeLinkedControlsForKey(node, timeKey);
    });
  }

  function setTableFullDateTimeRangeProps(
    node,
    startDateKey,
    startTimeKey,
    endDateKey,
    endTimeKey,
    startDateValue,
    startTimeValue,
    endDateValue,
    endTimeValue
  ) {
    const props = ensureTableProps(node);

    const oldStartDate = props[startDateKey] || "";
    const oldStartTime = props[startTimeKey] || "";
    const oldEndDate = props[endDateKey] || "";
    const oldEndTime = props[endTimeKey] || "";

    if (
      oldStartDate === startDateValue &&
      oldStartTime === startTimeValue &&
      oldEndDate === endDateValue &&
      oldEndTime === endTimeValue
    ) {
      return;
    }

    if (typeof pushHistory === "function" && typeof snapshot === "function") {
      pushHistory(snapshot());
    }

    props[startDateKey] = startDateValue;
    props[startTimeKey] = startTimeValue;
    props[endDateKey] = endDateValue;
    props[endTimeKey] = endTimeValue;

    requestAnimationFrame(() => {
      [startDateKey, startTimeKey, endDateKey, endTimeKey].forEach((key) => {
        syncTableDateTimeLinkedControlsForKey(node, key);
      });
    });
  }

  function isValidTableDateValue(value) {
    const str = String(value || "").trim();

    if (!str) return true;

    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (year < 1900 || year > 2100) return false;

    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  function isValidTableTimeValue(value) {
    const str = String(value || "").trim();

    if (!str) return true;

    return /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
  }

  function isValidTableCompositeInput(input) {
    if (!input) return true;

    if (input.type === "date") {
      return isValidTableDateValue(input.value);
    }

    if (input.type === "time") {
      return isValidTableTimeValue(input.value);
    }

    return true;
  }

  function getFirstInvalidTableCompositeInput(inputs) {
    return inputs.find((input) => !isValidTableCompositeInput(input)) || null;
  }

  function makeTableCompositeDateTimeControl(node, config) {
    const wrap = document.createElement("div");

    wrap.className = [
      config.controlClass || "",
      "table-composite-datetime-control",
    ]
      .filter(Boolean)
      .join(" ");

    wrap.dataset.id = node.id;

    Object.entries(config.dataset || {}).forEach(([key, value]) => {
      wrap.dataset[key] = value;
    });

    const view = document.createElement("div");
    view.className = [
      config.viewClass || "",
      "table-composite-datetime-view",
    ]
      .filter(Boolean)
      .join(" ");

    view.title = config.title || "";

    const editor = document.createElement("div");
    editor.className = "table-composite-datetime-editor";

    const inputs = [];

    let releaseHorizontalScrollLock = null;

function lockHorizontalScroll() {
  if (releaseHorizontalScrollLock) return;

  const td = wrap.closest("td");

  releaseHorizontalScrollLock =
    window.tableAutoscroll
      ?.lockHorizontalPosition?.(td) || null;
}

function unlockHorizontalScrollSoon() {
  const release = releaseHorizontalScrollLock;

  releaseHorizontalScrollLock = null;

  if (typeof release !== "function") return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      release();
    });
  });
}

    function syncView() {
      config.items.forEach((item, index) => {
        const input = inputs[index];

        if (input && document.activeElement !== input) {
          input.value = getTableProp(node, item.key);
        }
      });

      view.textContent = config.getViewText();
    }

    function restoreCellFocus() {
      requestAnimationFrame(() => {
        const td = wrap.closest("td");

        if (!td || !document.body.contains(td)) return;

        window.tableCellNav?.selectCell?.(td, {
          focus: true,
          scroll: false,
        });
      });
    }

    function closeEditor(options = {}) {
      syncView();
      wrap.classList.remove("is-editing", "is-invalid");

      inputs.forEach((input) => {
        input.classList.remove("is-invalid");
      });

      if (options.restoreFocus !== false) {
        restoreCellFocus();
      }

      unlockHorizontalScrollSoon();
    }

    function markInvalid() {
      wrap.classList.add("is-invalid");

      inputs.forEach((input) => {
        if (!isValidTableCompositeInput(input)) {
          input.classList.add("is-invalid");
        } else {
          input.classList.remove("is-invalid");
        }
      });

      const firstInvalid = getFirstInvalidTableCompositeInput(inputs);

      if (firstInvalid) {
        requestAnimationFrame(() => {
          firstInvalid.focus({
            preventScroll: true,
          });
        });
      }
    }

    function commit() {
      if (inputs.some((input) => !isValidTableCompositeInput(input))) {
        markInvalid();
        return false;
      }

      const values = {};

      config.items.forEach((item, index) => {
        values[item.key] = String(inputs[index]?.value || "").trim();
      });

      config.commit(values);

      closeEditor();

      return true;
    }

    function openEditor(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      window.selectedId = node.id;
      window.treeHasFocus = true;

      syncView();

      lockHorizontalScroll();

      wrap.classList.add("is-editing");

      requestAnimationFrame(() => {
        inputs[0]?.focus({
          preventScroll: true,
        });
      });
    }

    wrap.openEditor = openEditor;

    config.items.forEach((item, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "table-composite-datetime-separator";
        separator.textContent = item.separator || "→";
        editor.appendChild(separator);
      }

      const input = document.createElement("input");
      input.className = [
        "table-composite-datetime-input",
        item.inputClass || "",
      ]
        .filter(Boolean)
        .join(" ");

      input.type = item.type;
      input.value = getTableProp(node, item.key);
      input.dataset.role = item.role || item.key;

      input.addEventListener("click", (e) => {
        e.stopPropagation();

        window.selectedId = node.id;
        window.treeHasFocus = true;
      });

      input.addEventListener("dblclick", (e) => {
        e.stopPropagation();
      });

      input.addEventListener("input", () => {
        wrap.classList.remove("is-invalid");
        input.classList.remove("is-invalid");
      });

      input.addEventListener("keydown", (e) => {
        e.stopPropagation();

        if (e.key === "Enter" || e.code === "NumpadEnter") {
          e.preventDefault();
          commit();
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          closeEditor();
        }
      });

      inputs.push(input);
      editor.appendChild(input);
    });

    wrap.addEventListener("dblclick", openEditor);

    wrap.addEventListener("focusout", () => {
      setTimeout(() => {
        if (!wrap.contains(document.activeElement)) {
          commit();
        }
      }, 0);
    });

    syncView();

    wrap.appendChild(view);
    wrap.appendChild(editor);

    return wrap;
  }

  function makeTableRangeControl(node, column, inputType) {
    return makeTableCompositeDateTimeControl(node, {
      controlClass: "table-range-control",
      viewClass: "table-range-view",
      title: column.title || "Изменить период",

      dataset: {
        startKey: column.startKey,
        endKey: column.endKey,
        inputType,
      },

      items: [
        {
          key: column.startKey,
          type: inputType,
          role: "start",
          inputClass: "table-range-input",
        },
        {
          key: column.endKey,
          type: inputType,
          role: "end",
          inputClass: "table-range-input",
          separator: "→",
        },
      ],

      getViewText() {
        return getTableRangeViewText(node, column, inputType);
      },

      commit(values) {
        setTableRangeProps(
          node,
          column.startKey,
          column.endKey,
          values[column.startKey],
          values[column.endKey]
        );
      },
    });
  }

  function makeTableDateTimeControl(node, column) {
    return makeTableCompositeDateTimeControl(node, {
      controlClass: "table-datetime-control",
      viewClass: "table-datetime-view",
      title: column.title || "Изменить дату и время",

      dataset: {
        dateKey: column.dateKey,
        timeKey: column.timeKey,
      },

      items: [
        {
          key: column.dateKey,
          type: "date",
          role: "date",
          inputClass: "table-datetime-input",
        },
        {
          key: column.timeKey,
          type: "time",
          role: "time",
          inputClass: "table-datetime-input",
          separator: "",
        },
      ],

      getViewText() {
        return getTableDateTimeViewText(node, column);
      },

      commit(values) {
        setTableDateTimeProps(
          node,
          column.dateKey,
          column.timeKey,
          values[column.dateKey],
          values[column.timeKey]
        );
      },
    });
  }

  function makeTableFullDateTimeRangeControl(node, column) {
    return makeTableCompositeDateTimeControl(node, {
      controlClass: "table-full-datetime-range-control",
      viewClass: "table-full-datetime-range-view",
      title: column.title || "Изменить полный период",

      dataset: {
        startDateKey: column.startDateKey,
        startTimeKey: column.startTimeKey,
        endDateKey: column.endDateKey,
        endTimeKey: column.endTimeKey,
      },

      items: [
        {
          key: column.startDateKey,
          type: "date",
          role: "start-date",
          inputClass: "table-full-datetime-range-input",
        },
        {
          key: column.startTimeKey,
          type: "time",
          role: "start-time",
          inputClass: "table-full-datetime-range-input",
          separator: "",
        },
        {
          key: column.endDateKey,
          type: "date",
          role: "end-date",
          inputClass: "table-full-datetime-range-input",
          separator: "→",
        },
        {
          key: column.endTimeKey,
          type: "time",
          role: "end-time",
          inputClass: "table-full-datetime-range-input",
          separator: "",
        },
      ],

      getViewText() {
        return getTableFullDateTimeRangeViewText(node, column);
      },

      commit(values) {
        setTableFullDateTimeRangeProps(
          node,
          column.startDateKey,
          column.startTimeKey,
          column.endDateKey,
          column.endTimeKey,
          values[column.startDateKey],
          values[column.startTimeKey],
          values[column.endDateKey],
          values[column.endTimeKey]
        );
      },
    });
  }

  function formatTableDateCompact(value) {
    const raw = String(value || "");
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return raw;

    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  function formatTableTimeCompact(value) {
    return String(value || "");
  }

  function formatTableRangeValue(value, inputType) {
    if (inputType === "date") {
      return formatTableDateCompact(value);
    }

    if (inputType === "time") {
      return formatTableTimeCompact(value);
    }

    return String(value || "");
  }

  function getTableRangeViewText(node, column, inputType) {
    const startValue = getTableProp(node, column.startKey);
    const endValue = getTableProp(node, column.endKey);

    const startText = formatTableRangeValue(startValue, inputType);
    const endText = formatTableRangeValue(endValue, inputType);

    if (!startText && !endText) return "";
    if (startText && !endText) return `${startText} →`;
    if (!startText && endText) return `→ ${endText}`;

    return `${startText} → ${endText}`;
  }

  function getTableDateTimeViewText(node, column) {
    const dateValue = getTableProp(node, column.dateKey);
    const timeValue = getTableProp(node, column.timeKey);

    const dateText = formatTableDateCompact(dateValue);
    const timeText = formatTableTimeCompact(timeValue);

    if (!dateText && !timeText) return "";
    if (dateText && !timeText) return dateText;
    if (!dateText && timeText) return timeText;

    return `${dateText} ${timeText}`;
  }

  function getTableFullDateTimeRangeViewText(node, column) {
    const startDate = formatTableDateCompact(
      getTableProp(node, column.startDateKey)
    );
    const startTime = formatTableTimeCompact(
      getTableProp(node, column.startTimeKey)
    );
    const endDate = formatTableDateCompact(
      getTableProp(node, column.endDateKey)
    );
    const endTime = formatTableTimeCompact(
      getTableProp(node, column.endTimeKey)
    );

    const startText = [startDate, startTime].filter(Boolean).join(" ");
    const endText = [endDate, endTime].filter(Boolean).join(" ");

    if (!startText && !endText) return "";
    if (startText && !endText) return `${startText} →`;
    if (!startText && endText) return `→ ${endText}`;

    return `${startText} → ${endText}`;
  }

  window.tableDateTimeCells = {
    syncLinkedControlsForKey: syncTableDateTimeLinkedControlsForKey,

    makeCompositeControl: makeTableCompositeDateTimeControl,
    makeRangeControl: makeTableRangeControl,
    makeDateTimeControl: makeTableDateTimeControl,
    makeFullDateTimeRangeControl: makeTableFullDateTimeRangeControl,

    formatDateCompact: formatTableDateCompact,
    formatTimeCompact: formatTableTimeCompact,

    getRangeViewText: getTableRangeViewText,
    getDateTimeViewText: getTableDateTimeViewText,
    getFullDateTimeRangeViewText: getTableFullDateTimeRangeViewText,
  };

  window.syncTableDateTimeLinkedControlsForKey =
    syncTableDateTimeLinkedControlsForKey;

  window.makeTableCompositeDateTimeControl =
    makeTableCompositeDateTimeControl;
  window.makeTableRangeControl = makeTableRangeControl;
  window.makeTableDateTimeControl = makeTableDateTimeControl;
  window.makeTableFullDateTimeRangeControl = makeTableFullDateTimeRangeControl;

  window.formatTableDateCompact = formatTableDateCompact;
  window.formatTableTimeCompact = formatTableTimeCompact;

  window.getTableRangeViewText = getTableRangeViewText;
  window.getTableDateTimeViewText = getTableDateTimeViewText;
  window.getTableFullDateTimeRangeViewText =
    getTableFullDateTimeRangeViewText;
})();