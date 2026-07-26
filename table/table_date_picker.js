// table/table_date_picker.js
// Не забирающий фокус календарь для одиночных date-ячеек.
//
// Календарь добавляется в document.body и не участвует
// в расчёте ширины таблицы.

(function () {
  if (typeof window === "undefined") return;

  const MONTH_GAP = 6;
  const VIEWPORT_GAP = 8;

  let popup = null;
  let activeInput = null;
  let activeAnchor = null;
  let visibleYear = null;
  let visibleMonth = null;
  let repositionRaf = null;

  const WEEKDAYS = [
    "Пн",
    "Вт",
    "Ср",
    "Чт",
    "Пт",
    "Сб",
    "Вс",
  ];

  function parseIsoDate(value) {
    const match = String(value || "").match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
      year,
      month - 1,
      day
    );

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function formatIsoDate(date) {
    if (!(date instanceof Date)) {
      return "";
    }

    return [
      String(date.getFullYear()).padStart(4, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function isSameDate(a, b) {
    return !!(
      a &&
      b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function getToday() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  function capitalizeMonthTitle(value) {
    const text = String(value || "");

    if (!text) return "";

    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
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

    /*
      pointerdown внутри календаря отменяется,
      поэтому input сохраняет фокус.
    */
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
    visibleYear = null;
    visibleMonth = null;
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

  function moveMonth(delta) {
    const date = new Date(
      visibleYear,
      visibleMonth + delta,
      1
    );

    visibleYear = date.getFullYear();
    visibleMonth = date.getMonth();

    renderPopup();
  }

  function selectDate(date) {
    setInputValue(
      formatIsoDate(date)
    );

    close();
  }

  function renderHeader(container) {
    const header =
      document.createElement("div");

    header.className =
      "table-date-picker-header";

    const previousButton = createButton(
      "table-date-picker-nav",
      "‹",
      "Предыдущий месяц"
    );

    const nextButton = createButton(
      "table-date-picker-nav",
      "›",
      "Следующий месяц"
    );

    const title =
      document.createElement("div");

    title.className =
      "table-date-picker-title";

    title.textContent =
      capitalizeMonthTitle(
        new Date(
          visibleYear,
          visibleMonth,
          1
        ).toLocaleDateString(
          "ru-RU",
          {
            month: "long",
            year: "numeric",
          }
        )
      );

    previousButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        moveMonth(-1);
      }
    );

    nextButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        moveMonth(1);
      }
    );

    header.appendChild(previousButton);
    header.appendChild(title);
    header.appendChild(nextButton);

    container.appendChild(header);
  }

  function renderWeekdays(container) {
    const weekdays =
      document.createElement("div");

    weekdays.className =
      "table-date-picker-weekdays";

    WEEKDAYS.forEach((weekday) => {
      const item =
        document.createElement("div");

      item.className =
        "table-date-picker-weekday";

      item.textContent = weekday;

      weekdays.appendChild(item);
    });

    container.appendChild(weekdays);
  }

  function renderDays(container) {
    const grid =
      document.createElement("div");

    grid.className =
      "table-date-picker-grid";

    const selectedDate =
      parseIsoDate(
        activeInput?.value
      );

    const today = getToday();

    const firstDay = new Date(
      visibleYear,
      visibleMonth,
      1
    );

    /*
      Переводим воскресенье=0 в формат:
      понедельник=0 ... воскресенье=6.
    */
    const mondayIndex =
      (firstDay.getDay() + 6) % 7;

    const cursor = new Date(
      visibleYear,
      visibleMonth,
      1 - mondayIndex
    );

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + index
      );

      const button = createButton(
        "table-date-picker-day",
        String(date.getDate())
      );

      button.dataset.value =
        formatIsoDate(date);

      if (
        date.getMonth() !== visibleMonth
      ) {
        button.classList.add(
          "is-outside-month"
        );
      }

      if (
        isSameDate(
          date,
          selectedDate
        )
      ) {
        button.classList.add(
          "is-selected"
        );
      }

      if (
        isSameDate(
          date,
          today
        )
      ) {
        button.classList.add(
          "is-today"
        );
      }

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          selectDate(date);
        }
      );

      grid.appendChild(button);
    }

    container.appendChild(grid);
  }

  function renderFooter(container) {
    const footer =
      document.createElement("div");

    footer.className =
      "table-date-picker-footer";

    const todayButton = createButton(
      "table-date-picker-footer-btn",
      "Сегодня"
    );

    const clearButton = createButton(
      "table-date-picker-footer-btn",
      "Очистить"
    );

    todayButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        selectDate(getToday());
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

    footer.appendChild(todayButton);
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
      "table-date-picker-popup";

    popup.setAttribute(
      "role",
      "dialog"
    );

    popup.setAttribute(
      "aria-label",
      "Выбор даты"
    );

    /*
      Критически важно: клик по календарю
      не должен переводить фокус с input.
    */
    popup.addEventListener(
      "pointerdown",
      (event) => {
        event.preventDefault();
      }
    );

    renderHeader(popup);
    renderWeekdays(popup);
    renderDays(popup);
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
      anchorRect.bottom + MONTH_GAP;

    if (
      top + popupRect.height >
      window.innerHeight - VIEWPORT_GAP
    ) {
      top =
        anchorRect.top -
        popupRect.height -
        MONTH_GAP;
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
      input.type !== "date" ||
      !anchor
    ) {
      return false;
    }

    activeInput = input;
    activeAnchor = anchor;

    const selected =
      parseIsoDate(input.value) ||
      getToday();

    visibleYear =
      selected.getFullYear();

    visibleMonth =
      selected.getMonth();

    renderPopup();

    return true;
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
      if (!popup) return;

      if (event.key === "Escape") {
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

window.tableDatePicker = {
  open,
  close,
  closeForInput,
  position: schedulePosition,

  isOpenFor(input) {
    return !!(
      popup &&
      input &&
      input === activeInput
    );
  },

  toggle(options = {}) {
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
  },
};
})();