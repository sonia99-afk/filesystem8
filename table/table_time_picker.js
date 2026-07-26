// table/table_time_picker.js
// Floating-виджет выбора времени для одиночных time-ячеек.

(function () {
  if (typeof window === "undefined") return;

  const POPUP_GAP = 6;
  const VIEWPORT_GAP = 8;

  let popup = null;
  let activeInput = null;
  let activeAnchor = null;

  let selectedHour = 0;
  let selectedMinute = 0;

  let repositionRaf = null;

  function parseTime(value) {
    const match = String(value || "").match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

    if (!match) return null;

    return {
      hour: Number(match[1]),
      minute: Number(match[2]),
    };
  }

  function getCurrentTime() {
    const now = new Date();

    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }

  function formatTime(hour, minute) {
    return (
      String(hour).padStart(2, "0") +
      ":" +
      String(minute).padStart(2, "0")
    );
  }

  function setInputValue(value) {
    if (
      !activeInput ||
      !activeInput.isConnected
    ) {
      return;
    }

    activeInput.value = value;

    activeInput.dispatchEvent(
      new Event("input", {
        bubbles: true,
      })
    );

    activeInput.dispatchEvent(
      new Event("change", {
        bubbles: true,
      })
    );

    activeInput.focus({
      preventScroll: true,
    });
  }

  function close() {
    if (repositionRaf !== null) {
      cancelAnimationFrame(repositionRaf);
      repositionRaf = null;
    }

    popup?.remove();

    popup = null;
    activeInput = null;
    activeAnchor = null;
  }

  function closeForInput(input) {
    if (!input || input === activeInput) {
      close();
    }
  }

  function createButton(
    className,
    text,
    title = ""
  ) {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.tabIndex = -1;

    if (title) {
      button.title = title;
    }

    return button;
  }

  function scrollSelectedIntoView(list) {
    const selected =
      list.querySelector(".is-selected");

    if (!selected) return;

    list.scrollTop =
      selected.offsetTop -
      list.clientHeight / 2 +
      selected.offsetHeight / 2;
  }

  function makeValueList({
    type,
    count,
    selectedValue,
    onSelect,
  }) {
    const list =
      document.createElement("div");

    list.className =
      "table-time-picker-list";

    list.dataset.type = type;

    for (
      let value = 0;
      value < count;
      value += 1
    ) {
      const button = createButton(
        "table-time-picker-option",
        String(value).padStart(2, "0")
      );

      button.dataset.value =
        String(value);

      if (value === selectedValue) {
        button.classList.add(
          "is-selected"
        );
      }

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          onSelect(value);
        }
      );

      list.appendChild(button);
    }

    return list;
  }

  function renderHeader(container) {
    const header =
      document.createElement("div");

    header.className =
      "table-time-picker-header";

    header.textContent =
      formatTime(
        selectedHour,
        selectedMinute
      );

    container.appendChild(header);
  }

  function renderColumns(container) {
    const columns =
      document.createElement("div");

    columns.className =
      "table-time-picker-columns";

    const hourGroup =
      document.createElement("div");

    hourGroup.className =
      "table-time-picker-group";

    const minuteGroup =
      document.createElement("div");

    minuteGroup.className =
      "table-time-picker-group";

    const hourLabel =
      document.createElement("div");

    hourLabel.className =
      "table-time-picker-label";

    hourLabel.textContent = "Часы";

    const minuteLabel =
      document.createElement("div");

    minuteLabel.className =
      "table-time-picker-label";

    minuteLabel.textContent = "Минуты";

    const hourList = makeValueList({
      type: "hours",
      count: 24,
      selectedValue: selectedHour,

      onSelect(hour) {
        selectedHour = hour;
        renderPopup();
      },
    });

    const minuteList = makeValueList({
      type: "minutes",
      count: 60,
      selectedValue: selectedMinute,

      onSelect(minute) {
        selectedMinute = minute;

        setInputValue(
          formatTime(
            selectedHour,
            selectedMinute
          )
        );

        close();
      },
    });

    hourGroup.appendChild(hourLabel);
    hourGroup.appendChild(hourList);

    minuteGroup.appendChild(minuteLabel);
    minuteGroup.appendChild(minuteList);

    columns.appendChild(hourGroup);
    columns.appendChild(minuteGroup);

    container.appendChild(columns);

    requestAnimationFrame(() => {
      scrollSelectedIntoView(hourList);
      scrollSelectedIntoView(minuteList);
    });
  }

  function renderFooter(container) {
    const footer =
      document.createElement("div");

    footer.className =
      "table-time-picker-footer";

    const nowButton = createButton(
      "table-time-picker-footer-btn",
      "Сейчас"
    );

    const clearButton = createButton(
      "table-time-picker-footer-btn",
      "Очистить"
    );

    nowButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        const current =
          getCurrentTime();

        setInputValue(
          formatTime(
            current.hour,
            current.minute
          )
        );

        close();
      }
    );

    clearButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        setInputValue("");
        close();
      }
    );

    footer.appendChild(nowButton);
    footer.appendChild(clearButton);

    container.appendChild(footer);
  }

  function renderPopup() {
    if (
      !activeInput ||
      !activeInput.isConnected
    ) {
      close();
      return;
    }

    const previousPopup = popup;

    popup =
      document.createElement("div");

    popup.className =
      "table-time-picker-popup";

    popup.setAttribute(
      "role",
      "dialog"
    );

    popup.setAttribute(
      "aria-label",
      "Выбор времени"
    );

    /*
      Виджет не должен забирать фокус
      у временного input.
    */
    popup.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
      }
    );

    renderHeader(popup);
    renderColumns(popup);
    renderFooter(popup);

    if (previousPopup?.isConnected) {
      previousPopup.replaceWith(popup);
    } else {
      document.body.appendChild(popup);
    }

    positionPopup();
  }

  function positionPopup() {
    if (
      !popup ||
      !activeAnchor ||
      !activeAnchor.isConnected
    ) {
      return;
    }

    const anchorRect =
      activeAnchor.getBoundingClientRect();

    const popupRect =
      popup.getBoundingClientRect();

    let left = anchorRect.left;

    left = Math.max(
      VIEWPORT_GAP,
      Math.min(
        left,
        window.innerWidth -
          popupRect.width -
          VIEWPORT_GAP
      )
    );

    let top =
      anchorRect.bottom + POPUP_GAP;

    if (
      top + popupRect.height >
      window.innerHeight - VIEWPORT_GAP
    ) {
      top =
        anchorRect.top -
        popupRect.height -
        POPUP_GAP;
    }

    top = Math.max(
      VIEWPORT_GAP,
      Math.min(
        top,
        window.innerHeight -
          popupRect.height -
          VIEWPORT_GAP
      )
    );

    popup.style.left =
      `${Math.round(left)}px`;

    popup.style.top =
      `${Math.round(top)}px`;
  }

  function schedulePosition() {
    if (repositionRaf !== null) {
      return;
    }

    repositionRaf =
      requestAnimationFrame(() => {
        repositionRaf = null;
        positionPopup();
      });
  }

  function open(options = {}) {
    const input = options.input;

    const anchor =
      options.anchor ||
      input?.closest?.("td") ||
      input;

    if (
      !(input instanceof HTMLInputElement) ||
      input.type !== "time" ||
      !anchor
    ) {
      return false;
    }

    /*
      Одновременно показываем только
      один наш виджет.
    */
    window.tableDatePicker?.close?.();

    activeInput = input;
    activeAnchor = anchor;

    const value =
      parseTime(input.value) ||
      getCurrentTime();

    selectedHour = value.hour;
    selectedMinute = value.minute;

    renderPopup();

    return true;
  }

  function toggle(options = {}) {
    const input = options.input;

    if (
      popup &&
      input &&
      input === activeInput
    ) {
      close();
      return false;
    }

    return open(options);
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!popup) return;

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        popup.contains(target) ||
        activeInput?.contains?.(target)
      ) {
        return;
      }

      close();
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        popup &&
        event.key === "Escape"
      ) {
        close();
      }
    },
    true
  );

  window.addEventListener(
    "resize",
    schedulePosition
  );

  window.addEventListener(
    "scroll",
    schedulePosition,
    true
  );

  window.tableTimePicker = {
    open,
    close,
    toggle,
    closeForInput,
    position: schedulePosition,

    isOpenFor(input) {
      return !!(
        popup &&
        input &&
        input === activeInput
      );
    },
  };
})();