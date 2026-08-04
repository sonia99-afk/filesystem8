// table/table_timer_cells.js
// Счётчик времени и таймеры в табличном отображении.
//
// Здесь лежит логика для:
// - Счётчик времени
// - Сессии счётчика времени
// - Время таймера
// - Оставшееся время таймера
// - Ручной ввод таймера
// - Активация timer-ячеек горячей клавишей

(function () {
  if (typeof window === "undefined") return;

  const tableTimeSessionsOpenIds = new Set();
  const tableTimerSessionsOpenIds = new Set();

  const TIMER_STEP_MS = 5 * 60 * 1000;

  let tableTimeTicker = null;

  /* =========================================================
     Общие helpers
  ========================================================= */

  const TIMER_CONTROL_WRAPPER_SELECTOR = [
    ".table-time-counter",
    ".table-timer-duration",
    ".table-timer-countdown",
  ].join(",");

  function getTimerControlWrapperKey(wrap) {
    if (!wrap) {
      return "";
    }

    if (
      wrap.classList.contains(
        "table-time-counter"
      )
    ) {
      return "counter";
    }

    if (
      wrap.classList.contains(
        "table-timer-duration"
      )
    ) {
      return "duration";
    }

    if (
      wrap.classList.contains(
        "table-timer-countdown"
      )
    ) {
      return "remaining";
    }

    return "";
  }

  /*
    Перед полным render запоминаем,
    на какой именно кнопке timer-ячейки
    сейчас находится внутренний курсор.
  */
  function getActiveTimerControlSnapshot() {
    const active =
      document.activeElement;

    if (!(active instanceof Element)) {
      return null;
    }

    const control =
      active.closest(
        "[data-timer-control]"
      );

    if (!control) {
      return null;
    }

    const wrap =
      control.closest(
        TIMER_CONTROL_WRAPPER_SELECTOR
      );

    if (!wrap) {
      return null;
    }

    const id =
      wrap.dataset.id || "";

    const key =
      wrap.dataset.key || "";

    const controlKey =
      control.dataset.timerControl || "";

    const wrapperKey =
      getTimerControlWrapperKey(
        wrap
      );

    if (
      !id ||
      !key ||
      !controlKey ||
      !wrapperKey
    ) {
      return null;
    }

    return {
      id,
      key,
      controlKey,
      wrapperKey,
    };
  }

  /*
    После render старая кнопка уже удалена.

    Находим новую timer-ячейку и новую кнопку
    с тем же логическим именем.
  */
  function restoreActiveTimerControl(
    snapshot
  ) {
    if (!snapshot) {
      return;
    }

    requestAnimationFrame(() => {
      const host =
        document.getElementById("tree");

      if (!host) {
        return;
      }

      const wrap = Array.from(
        host.querySelectorAll(
          TIMER_CONTROL_WRAPPER_SELECTOR
        )
      ).find((item) => {
        return (
          item.dataset.id ===
            snapshot.id &&

          item.dataset.key ===
            snapshot.key &&

          getTimerControlWrapperKey(
            item
          ) === snapshot.wrapperKey
        );
      });

      if (!wrap) {
        return;
      }

      const control = Array.from(
        wrap.querySelectorAll(
          "[data-timer-control]"
        )
      ).find((item) => {
        return (
          item.dataset.timerControl ===
          snapshot.controlKey
        );
      });

      if (
        !control ||
        control.disabled
      ) {
        return;
      }

      const td =
        control.closest(
          "td.table-cell"
        );

      if (!td) {
        return;
      }

      /*
        Сохраняем ту же активную td,
        но не переносим фокус сначала на неё.
      */
      window.tableCellNav
        ?.selectCell?.(
          td,
          {
            focus: false,
            scroll: false,
          }
        );

      /*
        Возвращаем состояние «внутри».
      */
      window.tableCellInnerMode
        ?.enter?.(td);

      /*
        И возвращаем фокус именно
        на прежнюю кнопку.
      */
      control.focus({
        preventScroll: true,
      });
    });
  }

  function rerender() {
    const activeControl =
      getActiveTimerControlSnapshot();

    if (
      typeof render === "function"
    ) {
      render();
    }

    restoreActiveTimerControl(
      activeControl
    );
  }

  function getNodeById(id) {
    if (
      !id ||
      typeof findWithParent !==
        "function"
    ) {
      return null;
    }

    return (
      findWithParent(root, id)?.node ||
      null
    );
  }

  function selectNode(node) {
    if (!node) return;

    window.selectedId = node.id;
    window.treeHasFocus = true;
  }

  function formatDurationMs(ms) {
    const totalSeconds =
      Math.floor(
        Math.max(0, ms) / 1000
      );

    const hours =
      Math.floor(
        totalSeconds / 3600
      );

    const minutes =
      Math.floor(
        (
          totalSeconds % 3600
        ) / 60
      );

    const seconds =
      totalSeconds % 60;

    return [
      String(hours).padStart(
        2,
        "0"
      ),

      String(minutes).padStart(
        2,
        "0"
      ),

      String(seconds).padStart(
        2,
        "0"
      ),
    ].join(":");
  }

  function formatShortTime(ts) {
    const d = new Date(ts);

    return [
      String(
        d.getHours()
      ).padStart(2, "0"),

      String(
        d.getMinutes()
      ).padStart(2, "0"),
    ].join(":");
  }

  function formatShortDate(ts) {
    const d = new Date(ts);

    const months = [
      "янв",
      "фев",
      "мар",
      "апр",
      "мая",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];

    const day =
      String(
        d.getDate()
      ).padStart(2, "0");

    const month =
      months[d.getMonth()];

    return `${day} ${month}`;
  }

  function isSameCalendarDate(
    aTs,
    bTs
  ) {
    const a = new Date(aTs);
    const b = new Date(bTs);

    return (
      a.getFullYear() ===
        b.getFullYear() &&

      a.getMonth() ===
        b.getMonth() &&

      a.getDate() ===
        b.getDate()
    );
  }

  function formatSessionDateTime(ts) {
    const d = new Date(ts);

    const weekdays = [
      "вс",
      "пн",
      "вт",
      "ср",
      "чт",
      "пт",
      "сб",
    ];

    const months = [
      "янв",
      "фев",
      "мар",
      "апр",
      "мая",
      "июн",
      "июл",
      "авг",
      "сен",
      "окт",
      "ноя",
      "дек",
    ];

    const weekday =
      weekdays[d.getDay()];

    const day =
      String(
        d.getDate()
      ).padStart(2, "0");

    const month =
      months[d.getMonth()];

    const time =
      formatShortTime(ts);

    return (
      `${weekday}, ` +
      `${day} ${month}: ${time}`
    );
  }

  function formatSessionRange(
    session
  ) {
    const startAt =
      Number(session.startAt) || 0;

    const endAt =
      Number(session.endAt) || 0;

    if (
      !startAt ||
      !endAt
    ) {
      return "";
    }

    if (
      isSameCalendarDate(
        startAt,
        endAt
      )
    ) {
      return (
        `${formatSessionDateTime(
          startAt
        )} - ` +
        `${formatShortTime(endAt)}`
      );
    }

    return (
      `${formatSessionDateTime(
        startAt
      )} - ` +
      `${formatSessionDateTime(
        endAt
      )}`
    );
  }

  function formatCurrentSessionRange(
    startAt,
    now = Date.now()
  ) {
    const start =
      Number(startAt) || 0;

    if (!start) {
      return "";
    }

    const startText =
      formatSessionDateTime(start);

    /*
      Если сессия всё ещё идёт в тот же день,
      дату окончания повторно не показываем.
    */
    if (
      isSameCalendarDate(
        start,
        now
      )
    ) {
      return `${startText} - --:--`;
    }

    /*
      Если сессия перешла на другой день,
      вместо даты окончания показываем:
      dd mmm: --:--
    */
    return (
      `${startText} - ` +
      `${formatShortDate(now)}: --:--`
    );
  }

  function makeSessionsBlock(
    sessionsList,
    currentSession = null
  ) {
    const sessions =
      document.createElement("div");

    sessions.className =
      "table-time-sessions";

    const title =
      document.createElement("div");

    title.className =
      "table-time-sessions-title";

    title.textContent =
      "Сессии";

    sessions.appendChild(title);

    /*
      Текущая активная сессия всегда
      показывается первой.
    */
    if (
      currentSession?.startAt
    ) {
      const item =
        document.createElement("div");

      item.className =
        "table-time-session " +
        "table-time-session-current";

      item.dataset.startAt =
        String(
          currentSession.startAt
        );

      const duration =
        document.createElement("div");

      duration.className =
        "table-time-session-duration " +
        "table-time-session-current-label";

      duration.textContent =
        "текущая";

      const range =
        document.createElement("div");

      range.className =
        "table-time-session-range " +
        "table-time-session-current-range";

      range.textContent =
        formatCurrentSessionRange(
          currentSession.startAt
        );

      item.appendChild(duration);
      item.appendChild(range);

      sessions.appendChild(item);
    }

    const finishedSessions =
      Array.isArray(sessionsList)
        ? sessionsList
        : [];

    if (
      !currentSession?.startAt &&
      !finishedSessions.length
    ) {
      const empty =
        document.createElement(
          "div"
        );

      empty.className =
        "table-time-session-empty";

      empty.textContent =
        "сессий пока нет";

      sessions.appendChild(empty);

      return sessions;
    }

    finishedSessions
      .slice()
      .reverse()
      .forEach((session) => {
        const item =
          document.createElement(
            "div"
          );

        item.className =
          "table-time-session";

        const duration =
          document.createElement(
            "div"
          );

        duration.className =
          "table-time-session-duration";

        duration.textContent =
          formatDurationMs(
            session.durationMs
          );

        const range =
          document.createElement(
            "div"
          );

        range.className =
          "table-time-session-range";

        range.textContent =
          formatSessionRange(
            session
          );

        item.appendChild(
          duration
        );

        item.appendChild(
          range
        );

        sessions.appendChild(
          item
        );
      });

    return sessions;
  }

  function hasOpenTableSessionsWindow() {
    return (
      tableTimeSessionsOpenIds.size >
        0 ||

      tableTimerSessionsOpenIds.size >
        0
    );
  }

  function closeAllTableSessionsWindows(
    options = {}
  ) {
    const wasOpen =
      hasOpenTableSessionsWindow();

    tableTimeSessionsOpenIds.clear();
    tableTimerSessionsOpenIds.clear();

    if (!wasOpen) {
      return false;
    }

    /*
      При клавиатурном переходе
      полный render не нужен.
    */
    if (
      options.rerender === false
    ) {
      const host =
        document.getElementById(
          "tree"
        );

      host
        ?.querySelectorAll(
          ".table-time-sessions"
        )
        .forEach((sessions) => {
          sessions.remove();
        });

      return true;
    }

    rerender();

    return true;
  }

  function toggleTableSessionsWindow(
    type,
    nodeId
  ) {
    if (!nodeId) return;

    const targetSet =
      type === "timer"
        ? tableTimerSessionsOpenIds
        : tableTimeSessionsOpenIds;

    const wasAlreadyOpen =
      targetSet.has(nodeId);

    /*
      Одновременно открыто только одно
      окно сессий.
    */
    tableTimeSessionsOpenIds.clear();
    tableTimerSessionsOpenIds.clear();

    if (!wasAlreadyOpen) {
      targetSet.add(nodeId);
    }

    rerender();
  }

  /*
  Открытие окна сессий по одному нажатию
  на область со временем.

  Для мыши и тачпада используем pointerdown,
  чтобы действие произошло раньше общего
  click-обработчика табличной ячейки.

  Обычный click сохраняем для:
  - Enter;
  - Space;
  - назначенного хоткея;
  - программного active.click().
*/

function bindSessionsTimeControl(
  control,
  type,
  node
) {
  if (
    !control ||
    !node?.id
  ) {
    return;
  }

  function activateControl() {
    const td =
      control.closest(
        "td.table-cell"
      );

    /*
      Сначала делаем текущую ячейку
      активной, но не запускаем скролл.
    */

    if (td) {
      window.tableCellNav
        ?.selectCell?.(
          td,
          {
            focus: false,
            scroll: false,
          }
        );

      /*
        Центральное значение времени —
        внутренний элемент ячейки.
      */

      window.tableCellInnerMode
        ?.enter?.(td);
    }

    selectNode(node);

    /*
      Фокусируем именно область времени.
      preventScroll защищает таблицу
      от горизонтального скачка.
    */

    control.focus?.({
      preventScroll: true,
    });

    toggleTableSessionsWindow(
      type,
      node.id
    );
  }

  /*
    Мышь, тачпад и сенсорный экран.

    Окно открывается ещё до обычного click,
    поэтому предварительно выбирать td
    отдельным нажатием больше не нужно.
  */

  control.addEventListener(
    "pointerdown",
    (event) => {
      /*
        Правую и среднюю кнопки мыши
        не перехватываем.
      */

      if (
        event.pointerType ===
          "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      event
        .stopImmediatePropagation?.();

      activateControl();
    }
  );

  /*
    Клавиатурная активация кнопки создаёт
    click с detail === 0.

    Обычный мышиный click здесь повторно
    не выполняем, поскольку его уже
    обработал pointerdown.
  */

  control.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      event
        .stopImmediatePropagation?.();

      if (event.detail !== 0) {
        return;
      }

      activateControl();
    }
  );
}

  function ensureTableSessionsOutsideClick() {
    if (
      document
        .__tableSessionsOutsideClickBound
    ) {
      return;
    }

    document
      .__tableSessionsOutsideClickBound =
        true;

    document.addEventListener(
      "pointerdown",
      (e) => {
        if (
          !hasOpenTableSessionsWindow()
        ) {
          return;
        }

        const target =
          e.target;

        if (
          !(target instanceof Element)
        ) {
          return;
        }

        /*
          Клик внутри окна или его
          timer-ячейки не закрывает окно.
        */
        if (
          target.closest(
            [
              ".table-time-sessions",
              ".table-time-counter",
              ".table-timer-countdown",
            ].join(",")
          )
        ) {
          return;
        }

        setTimeout(() => {
          closeAllTableSessionsWindows();
        }, 0);
      },
      true
    );
  }

  /* =========================================================
     Счётчик времени
  ========================================================= */

  function makeEmptyTimeCounterState() {
    return {
      totalMs: 0,
      running: false,
      startedAt: null,
      sessions: [],
    };
  }

  function getTimeCounterState(
    node,
    key = "timeCounter"
  ) {
    const raw =
      getTableProp(node, key);

    if (
      !raw ||
      typeof raw !== "object"
    ) {
      return (
        makeEmptyTimeCounterState()
      );
    }

    return {
      totalMs:
        Number(raw.totalMs) || 0,

      running:
        !!raw.running,

      startedAt:
        Number(raw.startedAt) ||
        null,

      sessions:
        Array.isArray(
          raw.sessions
        )
          ? raw.sessions
          : [],
    };
  }

  function getTimeCounterElapsedMs(
    state,
    now = Date.now()
  ) {
    let total =
      Number(state.totalMs) || 0;

    if (
      state.running &&
      state.startedAt
    ) {
      total += Math.max(
        0,
        now -
          Number(state.startedAt)
      );
    }

    return total;
  }

  function startTimeCounter(
    node,
    key
  ) {
    const state =
      getTimeCounterState(
        node,
        key
      );

    if (state.running) {
      return;
    }

    setTableProp(
      node,
      key,
      {
        ...state,
        running: true,
        startedAt: Date.now(),
      }
    );

    rerender();
  }

  function pauseTimeCounter(
    node,
    key
  ) {
    const state =
      getTimeCounterState(
        node,
        key
      );

    if (
      !state.running ||
      !state.startedAt
    ) {
      return;
    }

    const endAt =
      Date.now();

    const startAt =
      Number(state.startedAt);

    const durationMs =
      Math.max(
        0,
        endAt - startAt
      );

    const session = {
      startAt,
      endAt,
      durationMs,
    };

    setTableProp(
      node,
      key,
      {
        totalMs:
          (
            Number(
              state.totalMs
            ) || 0
          ) + durationMs,

        running: false,
        startedAt: null,

        sessions: [
          ...state.sessions,
          session,
        ],
      }
    );

    rerender();
  }

  function resetTimeCounter(
    node,
    key
  ) {
    setTableProp(
      node,
      key,
      makeEmptyTimeCounterState()
    );

    tableTimeSessionsOpenIds
      .delete(node.id);

    rerender();
  }

  function toggleTimeCounterFromCell(
    td
  ) {
    if (!td) {
      return false;
    }

    const wrap =
      td.querySelector(
        ".table-time-counter"
      );

    const id =
      td.dataset.id ||
      wrap?.dataset?.id;

    const key =
      td.dataset.prop ||
      wrap?.dataset?.key ||
      "timeCounter";

    if (
      !id ||
      !key
    ) {
      return false;
    }

    const node =
      getNodeById(id);

    if (!node) {
      return false;
    }

    selectNode(node);

    const current =
      getTimeCounterState(
        node,
        key
      );

    if (current.running) {
      pauseTimeCounter(
        node,
        key
      );
    } else {
      startTimeCounter(
        node,
        key
      );
    }

    return true;
  }

    function makeTableTimeCounterControl(
    node,
    key
  ) {
    const state =
      getTimeCounterState(
        node,
        key
      );

    const elapsedMs =
      getTimeCounterElapsedMs(
        state
      );

    const wrap =
      document.createElement("div");

    wrap.className =
      "table-time-counter";

    wrap.dataset.id =
      node.id;

    wrap.dataset.key =
      key;

    function handleSelectNode(e) {
      e.stopPropagation();
      selectNode(node);
    }

    wrap.addEventListener(
      "click",
      handleSelectNode
    );

    wrap.addEventListener(
      "dblclick",
      (e) => {
        e.stopPropagation();
      }
    );

    const top =
      document.createElement("div");

    top.className =
      "table-time-main";

    const playBtn =
      document.createElement(
        "button"
      );

    playBtn.type =
      "button";

    playBtn.className =
      "table-time-btn " +
      "table-time-play";

    playBtn.dataset.timerControl =
      "play";

    playBtn.textContent =
      state.running
        ? "⏸"
        : "▶";

    playBtn.title =
      state.running
        ? "Пауза и записать сессию"
        : "Старт";

    playBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        const current =
          getTimeCounterState(
            node,
            key
          );

        if (current.running) {
          pauseTimeCounter(
            node,
            key
          );
        } else {
          startTimeCounter(
            node,
            key
          );
        }
      }
    );

    const timeBtn =
      document.createElement(
        "button"
      );

    timeBtn.type =
      "button";

    timeBtn.className =
      "table-time-value";

    timeBtn.dataset.timerControl =
      "value";

    timeBtn.textContent =
      formatDurationMs(
        elapsedMs
      );

    timeBtn.title =
      "Показать / скрыть сессии";

bindSessionsTimeControl(
  timeBtn,
  "counter",
  node
);

    const resetBtn =
      document.createElement(
        "button"
      );

    resetBtn.type =
      "button";

    resetBtn.className =
      "table-time-btn " +
      "table-time-reset";

    resetBtn.dataset.timerControl =
      "reset";

    resetBtn.textContent =
      "↺";

    resetBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        resetTimeCounter(
          node,
          key
        );
      }
    );

    top.appendChild(playBtn);
    top.appendChild(timeBtn);
    top.appendChild(resetBtn);

    wrap.appendChild(top);

    if (
      tableTimeSessionsOpenIds
        .has(node.id)
    ) {
      const currentSession =
        state.running &&
        state.startedAt
          ? {
              startAt:
                Number(
                  state.startedAt
                ),
            }
          : null;

      wrap.appendChild(
        makeSessionsBlock(
          state.sessions,
          currentSession
        )
      );
    }

    ensureTableTimeTicker();

    return wrap;
  }

  /* =========================================================
     Таймер
  ========================================================= */

  function makeEmptyTimerState() {
    return {
      durationMs: 0,
      elapsedMs: 0,
      running: false,
      startedAt: null,
      sessions: [],
    };
  }

  function getTimerState(
    node,
    key = "timer"
  ) {
    const raw =
      getTableProp(
        node,
        key
      );

    if (
      !raw ||
      typeof raw !== "object"
    ) {
      return makeEmptyTimerState();
    }

    return {
      durationMs:
        Number(
          raw.durationMs
        ) || 0,

      elapsedMs:
        Number(
          raw.elapsedMs
        ) || 0,

      running:
        !!raw.running,

      startedAt:
        Number(
          raw.startedAt
        ) || null,

      sessions:
        Array.isArray(
          raw.sessions
        )
          ? raw.sessions
          : [],
    };
  }

  function getTimerElapsedMs(
    state,
    now = Date.now()
  ) {
    let elapsed =
      Number(
        state.elapsedMs
      ) || 0;

    if (
      state.running &&
      state.startedAt
    ) {
      elapsed += Math.max(
        0,
        now -
          Number(
            state.startedAt
          )
      );
    }

    return Math.min(
      elapsed,
      Number(
        state.durationMs
      ) || 0
    );
  }

  function getTimerRemainingMs(
    state,
    now = Date.now()
  ) {
    return Math.max(
      0,

      (
        Number(
          state.durationMs
        ) || 0
      ) -
        getTimerElapsedMs(
          state,
          now
        )
    );
  }

  function setTimerState(
    node,
    key,
    state
  ) {
    setTableProp(
      node,
      key,
      {
        durationMs:
          Math.max(
            0,
            Number(
              state.durationMs
            ) || 0
          ),

        elapsedMs:
          Math.max(
            0,
            Number(
              state.elapsedMs
            ) || 0
          ),

        running:
          !!state.running,

        startedAt:
          state.startedAt
            ? Number(
                state.startedAt
              )
            : null,

        sessions:
          Array.isArray(
            state.sessions
          )
            ? state.sessions
            : [],
      }
    );
  }

  function changeTimerDuration(
    node,
    key,
    deltaMs
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    const nextDuration =
      Math.max(
        0,
        state.durationMs +
          deltaMs
      );

    const currentElapsed =
      getTimerElapsedMs(
        state
      );

    setTimerState(
      node,
      key,
      {
        ...state,

        durationMs:
          nextDuration,

        elapsedMs:
          Math.min(
            currentElapsed,
            nextDuration
          ),

        startedAt:
          state.running
            ? Date.now()
            : null,
      }
    );

    rerender();
  }

  function startTimerRemaining(
    node,
    key
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    if (state.running) {
      return;
    }

    if (
      getTimerRemainingMs(
        state
      ) <= 0
    ) {
      return;
    }

    setTimerState(
      node,
      key,
      {
        ...state,
        running: true,
        startedAt: Date.now(),
      }
    );

    rerender();
  }

  function pauseTimerRemaining(
    node,
    key
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    if (
      !state.running ||
      !state.startedAt
    ) {
      return;
    }

    const endAt =
      Date.now();

    const startAt =
      Number(
        state.startedAt
      );

    const beforeElapsed =
      Number(
        state.elapsedMs
      ) || 0;

    const availableMs =
      Math.max(
        0,

        (
          Number(
            state.durationMs
          ) || 0
        ) -
          beforeElapsed
      );

    const rawDurationMs =
      Math.max(
        0,
        endAt - startAt
      );

    const durationMs =
      Math.min(
        rawDurationMs,
        availableMs
      );

    const nextElapsed =
      Math.min(
        Number(
          state.durationMs
        ) || 0,

        beforeElapsed +
          durationMs
      );

    const sessions = [
      ...state.sessions,
    ];

    if (durationMs > 0) {
      sessions.push({
        startAt,
        endAt:
          startAt +
          durationMs,
        durationMs,
      });
    }

    setTimerState(
      node,
      key,
      {
        ...state,
        elapsedMs:
          nextElapsed,
        running: false,
        startedAt: null,
        sessions,
      }
    );

    rerender();
  }

  function resetTimerRemaining(
    node,
    key
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    setTimerState(
      node,
      key,
      {
        ...state,
        elapsedMs: 0,
        running: false,
        startedAt: null,
        sessions: [],
      }
    );

    tableTimerSessionsOpenIds
      .delete(node.id);

    rerender();
  }

  function finishTimerAtZero(
    node,
    key
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    if (
      !state.running ||
      !state.startedAt
    ) {
      return;
    }

    const endAt =
      Date.now();

    const startAt =
      Number(
        state.startedAt
      );

    const beforeElapsed =
      Number(
        state.elapsedMs
      ) || 0;

    const availableMs =
      Math.max(
        0,

        (
          Number(
            state.durationMs
          ) || 0
        ) -
          beforeElapsed
      );

    const rawDurationMs =
      Math.max(
        0,
        endAt - startAt
      );

    const durationMs =
      Math.min(
        rawDurationMs,
        availableMs
      );

    const sessions = [
      ...state.sessions,
    ];

    if (durationMs > 0) {
      sessions.push({
        startAt,
        endAt:
          startAt +
          durationMs,
        durationMs,
      });
    }

    setTimerState(
      node,
      key,
      {
        ...state,

        elapsedMs:
          Number(
            state.durationMs
          ) || 0,

        running: false,
        startedAt: null,
        sessions,
      }
    );

    rerender();
  }

  function toggleTimerRemainingFromCell(
    td
  ) {
    if (!td) {
      return false;
    }

    const wrap =
      td.querySelector(
        ".table-timer-countdown"
      );

    const id =
      td.dataset.id ||
      wrap?.dataset?.id;

    const key =
      td.dataset.prop ||
      wrap?.dataset?.key ||
      "timer";

    if (
      !id ||
      !key
    ) {
      return false;
    }

    const node =
      getNodeById(id);

    if (!node) {
      return false;
    }

    selectNode(node);

    const current =
      getTimerState(
        node,
        key
      );

    if (current.running) {
      pauseTimerRemaining(
        node,
        key
      );
    } else {
      startTimerRemaining(
        node,
        key
      );
    }

    return true;
  }

  /* =========================================================
     Ручной ввод длительности таймера
  ========================================================= */

  function formatTableTimerDurationMask(
    digits
  ) {
    const clean =
      String(digits || "")
        .replace(/\D/g, "")
        .slice(0, 6);

    const masked =
      clean.padEnd(6, "-");

    return [
      masked.slice(0, 2),
      masked.slice(2, 4),
      masked.slice(4, 6),
    ].join(":");
  }

  function canAddTableTimerDurationDigit(
    digits,
    digit
  ) {
    const position =
      digits.length;

    const number =
      Number(digit);

    if (position >= 6) {
      return false;
    }

    if (
      (
        position === 2 ||
        position === 4
      ) &&
      number > 5
    ) {
      return false;
    }

    return true;
  }

  function parseTableTimerDurationMask(
    digits
  ) {
    const clean =
      String(digits || "")
        .replace(/\D/g, "");

    if (clean.length !== 6) {
      return null;
    }

    const hours =
      Number(
        clean.slice(0, 2)
      );

    const minutes =
      Number(
        clean.slice(2, 4)
      );

    const seconds =
      Number(
        clean.slice(4, 6)
      );

    if (
      minutes > 59 ||
      seconds > 59
    ) {
      return null;
    }

    return (
      (
        hours * 3600 +
        minutes * 60 +
        seconds
      ) * 1000
    );
  }

  function setTimerDurationManualValue(
    node,
    key,
    durationMs
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    const nextDurationMs =
      Math.max(
        0,
        Number(durationMs) || 0
      );

    const currentElapsedMs =
      getTimerElapsedMs(
        state
      );

    const nextElapsedMs =
      Math.min(
        currentElapsedMs,
        nextDurationMs
      );

    const shouldKeepRunning =
      state.running &&
      nextElapsedMs <
        nextDurationMs;

    setTimerState(
      node,
      key,
      {
        ...state,

        durationMs:
          nextDurationMs,

        elapsedMs:
          nextElapsedMs,

        running:
          shouldKeepRunning,

        startedAt:
          shouldKeepRunning
            ? Date.now()
            : null,
      }
    );

    rerender();
  }

    function openTimerDurationEditorFromCell(
    td
  ) {
    if (!td) {
      return false;
    }

    const value =
      td.querySelector(
        ".table-timer-duration-value"
      );

    const id =
      td.dataset.id;

    const key =
      td.dataset.prop ||
      "timer";

    if (
      !value ||
      !id ||
      !key
    ) {
      return false;
    }

    if (
      value.classList.contains(
        "table-duration-mask-editor"
      )
    ) {
      value.focus({
        preventScroll: true,
      });

      return true;
    }

    const node =
      getNodeById(id);

    if (!node) {
      return false;
    }

    selectNode(node);

    openTableTimerDurationMaskEditor(
      value,
      node,
      key
    );

    return true;
  }

  function openTableTimerDurationMaskEditor(
    valueEl,
    node,
    key
  ) {
    if (
      !valueEl ||
      !node ||
      !key
    ) {
      return;
    }

    const input =
      document.createElement(
        "input"
      );

    input.type =
      "text";

    input.inputMode =
      "numeric";

    input.autocomplete =
      "off";

    input.spellcheck =
      false;

    input.className =
      "table-timer-duration-value " +
      "table-duration-mask-editor";

    input.dataset.timerControl =
      "value";

    input.title =
      "Введите 6 цифр: " +
      "233412 → 23:34:12";

    let digits = "";
    let finished = false;

    function syncInput() {
      input.value =
        formatTableTimerDurationMask(
          digits
        );

      requestAnimationFrame(() => {
        const end =
          input.value.length;

        input.setSelectionRange?.(
          end,
          end
        );
      });
    }

    function markInvalid() {
      input.classList.add(
        "is-invalid"
      );

      requestAnimationFrame(() => {
        input.focus({
          preventScroll: true,
        });
      });
    }

    function clearInvalid() {
      input.classList.remove(
        "is-invalid"
      );
    }

    function cancel() {
      if (finished) return;

      finished = true;

      rerender();
    }

    function commit() {
      if (finished) return;

      if (!digits.length) {
        cancel();
        return;
      }

      const nextMs =
        parseTableTimerDurationMask(
          digits
        );

      if (nextMs === null) {
        markInvalid();
        return;
      }

      finished = true;

      setTimerDurationManualValue(
        node,
        key,
        nextMs
      );
    }

    function addDigit(digit) {
      if (
        !canAddTableTimerDurationDigit(
          digits,
          digit
        )
      ) {
        markInvalid();
        return;
      }

      clearInvalid();

      digits += digit;

      syncInput();
    }

    input.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
      }
    );

    input.addEventListener(
      "dblclick",
      (e) => {
        e.stopPropagation();
      }
    );

    input.addEventListener(
      "keydown",
      (e) => {
        e.stopPropagation();

        if (
          /^\d$/.test(e.key)
        ) {
          e.preventDefault();

          addDigit(e.key);

          return;
        }

        if (
          e.key === "Backspace"
        ) {
          e.preventDefault();

          clearInvalid();

          digits =
            digits.slice(0, -1);

          syncInput();

          return;
        }

        if (
          e.key === "Delete"
        ) {
          e.preventDefault();

          clearInvalid();

          digits = "";

          syncInput();

          return;
        }

        if (
          e.key === "Enter" ||
          e.code ===
            "NumpadEnter"
        ) {
          e.preventDefault();

          commit();

          return;
        }

        if (
          e.key === "Escape"
        ) {
          e.preventDefault();

          cancel();

          return;
        }

        if (
          e.key === "Tab" ||
          e.key ===
            "ArrowLeft" ||
          e.key ===
            "ArrowRight" ||
          e.key === "Home" ||
          e.key === "End"
        ) {
          return;
        }

        if (
          e.key &&
          e.key.length === 1
        ) {
          e.preventDefault();

          clearInvalid();
        }
      }
    );

    input.addEventListener(
      "paste",
      (e) => {
        e.preventDefault();

        clearInvalid();

        const pasted =
          e.clipboardData
            ?.getData("text") ||
          "";

        const nextDigits =
          pasted
            .replace(/\D/g, "")
            .slice(0, 6);

        let result = "";

        for (
          const digit of nextDigits
        ) {
          if (
            !canAddTableTimerDurationDigit(
              result,
              digit
            )
          ) {
            markInvalid();
            break;
          }

          result += digit;
        }

        digits = result;

        syncInput();
      }
    );

    input.addEventListener(
      "blur",
      () => {
        commit();
      }
    );

    valueEl.replaceWith(input);

    syncInput();

    requestAnimationFrame(() => {
      input.focus({
        preventScroll: true,
      });
    });
  }

  function makeTableTimerDurationControl(
    node,
    key
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    const wrap =
      document.createElement(
        "div"
      );

    wrap.className =
      "table-timer-duration";

    wrap.dataset.id =
      node.id;

    wrap.dataset.key =
      key;

    wrap.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        selectNode(node);
      }
    );

    const minusBtn =
      document.createElement(
        "button"
      );

    minusBtn.type =
      "button";

    minusBtn.className =
      "table-timer-btn";

    minusBtn.dataset.timerControl =
      "minus";

    minusBtn.textContent =
      "−";

    minusBtn.title =
      "Уменьшить на 5 минут";

    minusBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        changeTimerDuration(
          node,
          key,
          -TIMER_STEP_MS
        );
      }
    );

    const value =
      document.createElement(
        "span"
      );

    value.className =
      "table-timer-duration-value";

    value.dataset.timerControl =
      "value";

    value.textContent =
      formatDurationMs(
        state.durationMs
      );

    value.tabIndex = 0;

    value.setAttribute(
      "role",
      "button"
    );

    value.title =
      "Ввести время вручную";

    value.addEventListener(
      "click",
      (e) => {
        const td =
          value.closest("td");

        if (
          !td ||
          !td.classList.contains(
            "table-cell-selected"
          )
        ) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        openTableTimerDurationMaskEditor(
          value,
          node,
          key
        );
      }
    );

    const plusBtn =
      document.createElement(
        "button"
      );

    plusBtn.type =
      "button";

    plusBtn.className =
      "table-timer-btn";

    plusBtn.dataset.timerControl =
      "plus";

    plusBtn.textContent =
      "+";

    plusBtn.title =
      "Увеличить на 5 минут";

    plusBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        changeTimerDuration(
          node,
          key,
          TIMER_STEP_MS
        );
      }
    );

    wrap.appendChild(
      minusBtn
    );

    wrap.appendChild(
      value
    );

    wrap.appendChild(
      plusBtn
    );

    return wrap;
  }

  function makeTableTimerRemainingControl(
    node,
    key
  ) {
    const state =
      getTimerState(
        node,
        key
      );

    const remainingMs =
      getTimerRemainingMs(
        state
      );

    const wrap =
      document.createElement(
        "div"
      );

    wrap.className =
      "table-timer-countdown";

    wrap.dataset.id =
      node.id;

    wrap.dataset.key =
      key;

    wrap.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();

        selectNode(node);
      }
    );

    const top =
      document.createElement(
        "div"
      );

    top.className =
      "table-timer-countdown-main";

    const playBtn =
      document.createElement(
        "button"
      );

    playBtn.type =
      "button";

    playBtn.className =
      "table-timer-countdown-btn " +
      "table-timer-countdown-play";

    playBtn.dataset.timerControl =
      "play";

    playBtn.textContent =
      state.running
        ? "⏸"
        : "▶";

    playBtn.title =
      state.running
        ? "Пауза и записать сессию"
        : "Старт";

    playBtn.disabled =
      !state.running &&
      remainingMs <= 0;

    playBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        const current =
          getTimerState(
            node,
            key
          );

        if (current.running) {
          pauseTimerRemaining(
            node,
            key
          );
        } else {
          startTimerRemaining(
            node,
            key
          );
        }
      }
    );

    const timeBtn =
      document.createElement(
        "button"
      );

    timeBtn.type =
      "button";

    timeBtn.className =
      "table-timer-countdown-value";

    timeBtn.dataset.timerControl =
      "value";

    timeBtn.textContent =
      formatDurationMs(
        remainingMs
      );

    timeBtn.title =
      "Показать / скрыть сессии";

bindSessionsTimeControl(
  timeBtn,
  "timer",
  node
);

    const resetBtn =
      document.createElement(
        "button"
      );

    resetBtn.type =
      "button";

    resetBtn.className =
      "table-timer-countdown-btn " +
      "table-timer-countdown-reset";

    resetBtn.dataset.timerControl =
      "reset";

    resetBtn.textContent =
      "◀◀";

    resetBtn.title =
      "Сбросить остаток таймера";

    /*
  Сброс доступен только после того,
  как таймер хотя бы один раз был запущен.

  До первого запуска:
  - время задано;
  - оставшееся время равно полному времени;
  - кнопка сброса неактивна.
*/

const timerHasStarted =
  state.running ||
  Number(state.elapsedMs) > 0 ||
  (
    Array.isArray(state.sessions) &&
    state.sessions.length > 0
  );

resetBtn.disabled =
  !timerHasStarted;

    resetBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        selectNode(node);

        resetTimerRemaining(
          node,
          key
        );
      }
    );

    top.appendChild(
      playBtn
    );

    top.appendChild(
      timeBtn
    );

    top.appendChild(
      resetBtn
    );

    wrap.appendChild(top);

    if (
      tableTimerSessionsOpenIds
        .has(node.id)
    ) {
      const currentSession =
        state.running &&
        state.startedAt
          ? {
              startAt:
                Number(
                  state.startedAt
                ),
            }
          : null;

      wrap.appendChild(
        makeSessionsBlock(
          state.sessions,
          currentSession
        )
      );
    }

    ensureTableTimeTicker();

    return wrap;
  }

    /* =========================================================
     Обновление видимых значений
  ========================================================= */

  function updateVisibleTimeCounters() {
    const host =
      document.getElementById(
        "tree"
      );

    if (!host) return;

    host
      .querySelectorAll(
        ".table-time-counter[data-id]"
      )
      .forEach((wrap) => {
        const id =
          wrap.dataset.id;

        const key =
          wrap.dataset.key ||
          "timeCounter";

        const node =
          getNodeById(id);

        if (!node) return;

        const state =
          getTimeCounterState(
            node,
            key
          );

        const value =
          wrap.querySelector(
            ".table-time-value"
          );

        if (value) {
          value.textContent =
            formatDurationMs(
              getTimeCounterElapsedMs(
                state
              )
            );
        }

        const play =
          wrap.querySelector(
            ".table-time-play"
          );

        if (play) {
          play.textContent =
            state.running
              ? "⏸"
              : "▶";

          play.title =
            state.running
              ? "Пауза и записать сессию"
              : "Старт";
        }

        const currentRange =
          wrap.querySelector(
            ".table-time-session-current-range"
          );

        if (
          currentRange &&
          state.running &&
          state.startedAt
        ) {
          currentRange.textContent =
            formatCurrentSessionRange(
              state.startedAt
            );
        }
      });

    host
      .querySelectorAll(
        ".table-timer-countdown[data-id]"
      )
      .forEach((wrap) => {
        const id =
          wrap.dataset.id;

        const key =
          wrap.dataset.key ||
          "timer";

        const node =
          getNodeById(id);

        if (!node) return;

        const state =
          getTimerState(
            node,
            key
          );

        const remainingMs =
          getTimerRemainingMs(
            state
          );

        if (
          state.running &&
          remainingMs <= 0
        ) {
          finishTimerAtZero(
            node,
            key
          );

          return;
        }

        const value =
          wrap.querySelector(
            ".table-timer-countdown-value"
          );

        if (value) {
          value.textContent =
            formatDurationMs(
              remainingMs
            );
        }

        const play =
          wrap.querySelector(
            ".table-timer-countdown-play"
          );

        if (play) {
          play.textContent =
            state.running
              ? "⏸"
              : "▶";

          play.title =
            state.running
              ? "Пауза и записать сессию"
              : "Старт";

          play.disabled =
            !state.running &&
            remainingMs <= 0;
        }

        const currentRange =
          wrap.querySelector(
            ".table-time-session-current-range"
          );

        if (
          currentRange &&
          state.running &&
          state.startedAt
        ) {
          currentRange.textContent =
            formatCurrentSessionRange(
              state.startedAt
            );
        }
      });
  }

  function ensureTableTimeTicker() {
    if (tableTimeTicker) {
      return;
    }

    tableTimeTicker =
      setInterval(() => {
        try {
          updateVisibleTimeCounters();
        } catch (error) {
          console.error(
            "Ошибка обновления " +
              "таймеров таблицы:",
            error
          );
        }
      }, 1000);
  }

  /* =========================================================
     Hotkey / Enter внутри timer-ячеек
  ========================================================= */

  function getSelectedTableTimerCell() {
    const host =
      document.getElementById(
        "tree"
      );

    if (!host) {
      return null;
    }

    return host.querySelector(
      [
        "td.table-cell-selected" +
          ".table-time-cell",

        "td.table-cell-selected" +
          ".table-timer-duration-cell",

        "td.table-cell-selected" +
          ".table-timer-remaining-cell",
      ].join(",")
    );
  }

  function isTableTimerTypingTarget(
    el
  ) {
    if (!el) {
      return false;
    }

    const tag =
      (
        el.tagName || ""
      ).toLowerCase();

    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      el.isContentEditable
    );
  }

  function isTableTimerActionElement(
    el
  ) {
    if (!el) {
      return false;
    }

    const tag =
      (
        el.tagName || ""
      ).toLowerCase();

    return (
      tag === "button" ||

      el.classList?.contains(
        "table-time-value"
      ) ||

      el.classList?.contains(
        "table-timer-duration-value"
      ) ||

      el.classList?.contains(
        "table-timer-countdown-value"
      ) ||

      el.getAttribute?.(
        "role"
      ) === "button"
    );
  }

  function isTableCellActivateHotkey(
    e
  ) {
    return !!window.tableCellNav
      ?.isCellActivateHotkey?.(e);
  }

  function isNativeTableActionKey(
    e
  ) {
    return (
      e.key === "Enter" ||
      e.code ===
        "NumpadEnter" ||
      e.key === " " ||
      e.code === "Space"
    );
  }

  function stopTableActionKey(e) {
    e.preventDefault();
    e.stopPropagation();

    e.stopImmediatePropagation?.();
  }

  function handleTableTimerCellsEnter(
    e
  ) {
    const selectedCell =
      getSelectedTableTimerCell();

    if (!selectedCell) {
      return;
    }

    const active =
      document.activeElement;

    if (
      !active ||
      !selectedCell.contains(
        active
      )
    ) {
      return;
    }

    if (
      isTableTimerTypingTarget(
        active
      ) ||
      isTableTimerTypingTarget(
        e.target
      )
    ) {
      return;
    }

    if (
      !isTableTimerActionElement(
        active
      )
    ) {
      return;
    }

    if (
      isNativeTableActionKey(e) &&
      !isTableCellActivateHotkey(e)
    ) {
      stopTableActionKey(e);
      return;
    }

    if (
      !isTableCellActivateHotkey(e)
    ) {
      return;
    }

    stopTableActionKey(e);

    active.click();
  }

  function ensureTableTimerCellsEnterHotkey() {
    if (
      document
        .__tableTimerCellsEnterHotkeyBound
    ) {
      return;
    }

    document
      .__tableTimerCellsEnterHotkeyBound =
        true;

    document.addEventListener(
      "keydown",
      handleTableTimerCellsEnter,
      true
    );
  }

  ensureTableSessionsOutsideClick();

  window.tableTimerCells = {
    makeTimeCounterControl:
      makeTableTimeCounterControl,

    makeTimerDurationControl:
      makeTableTimerDurationControl,

    makeTimerRemainingControl:
      makeTableTimerRemainingControl,

    toggleTimeCounterFromCell,

    toggleTimerRemainingFromCell,

    openTimerDurationEditorFromCell,

    /*
      Управление окнами сессий.
    */
    hasOpenSessions:
      hasOpenTableSessionsWindow,

    closeSessions:
      closeAllTableSessionsWindows,

    updateVisible:
      updateVisibleTimeCounters,

    ensureTicker:
      ensureTableTimeTicker,

    ensureHotkey:
      ensureTableTimerCellsEnterHotkey,

    formatDurationMs,
  };

  window.makeTableTimeCounterControl =
    makeTableTimeCounterControl;

  window.makeTableTimerDurationControl =
    makeTableTimerDurationControl;

  window.makeTableTimerRemainingControl =
    makeTableTimerRemainingControl;

  window.toggleTimeCounterFromCell =
    toggleTimeCounterFromCell;

  window.toggleTimerRemainingFromCell =
    toggleTimerRemainingFromCell;

  window.openTimerDurationEditorFromCell =
    openTimerDurationEditorFromCell;

  window.updateVisibleTimeCounters =
    updateVisibleTimeCounters;

  window.ensureTableTimeTicker =
    ensureTableTimeTicker;

  window.ensureTableTimerCellsEnterHotkey =
    ensureTableTimerCellsEnterHotkey;

  window.formatDurationMs =
    formatDurationMs;
})();