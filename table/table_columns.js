// table/table_columns.js
// Описание колонок табличного отображения.
//
// Здесь лежат только конфиги колонок:
// - текст
// - даты / время
// - select-поля
// - иконка
// - изображения / файлы
// - счётчик времени / таймер

(function () {
  if (typeof window === "undefined") return;

  const TABLE_TEXT_COLUMN = {
    key: "text",
    title: "Текст",
    inputType: "text",
    placeholder: "",
  };

  /* =========================================================
     Date / time columns
  ========================================================= */

  const TABLE_START_DATE_COLUMN = {
    key: "startDate",
    title: "Дата начала",
    inputType: "date",
  };

  const TABLE_START_TIME_COLUMN = {
    key: "startTime",
    title: "Время начала",
    inputType: "time",
  };

  const TABLE_END_DATE_COLUMN = {
    key: "endDate",
    title: "Дата завершения",
    inputType: "date",
  };

  const TABLE_END_TIME_COLUMN = {
    key: "endTime",
    title: "Время завершения",
    inputType: "time",
  };

  const TABLE_DATE_TIME_PROPERTY_COLUMNS = [
    TABLE_START_DATE_COLUMN,
    TABLE_START_TIME_COLUMN,
    TABLE_END_DATE_COLUMN,
    TABLE_END_TIME_COLUMN,
  ];

  const TABLE_DATE_RANGE_COLUMN = {
    key: "dateRange",
    title: "Дата начала и дата завершения",
    inputType: "dateRange",
    startKey: "startDate",
    endKey: "endDate",
  };

  const TABLE_TIME_RANGE_COLUMN = {
    key: "timeRange",
    title: "Время начала и время завершения",
    inputType: "timeRange",
    startKey: "startTime",
    endKey: "endTime",
  };

  const TABLE_START_DATETIME_COLUMN = {
    key: "startDateTime",
    title: "Дата и время начала",
    inputType: "dateTimePair",
    dateKey: "startDate",
    timeKey: "startTime",
  };

  const TABLE_END_DATETIME_COLUMN = {
    key: "endDateTime",
    title: "Дата и время завершения",
    inputType: "dateTimePair",
    dateKey: "endDate",
    timeKey: "endTime",
  };

  const TABLE_FULL_DATETIME_RANGE_COLUMN = {
    key: "fullDateTimeRange",
    title: "Дата, время начала и завершения",
    inputType: "dateTimeRangePair",
    startDateKey: "startDate",
    startTimeKey: "startTime",
    endDateKey: "endDate",
    endTimeKey: "endTime",
  };

  const TABLE_PROPERTY_COLUMNS = [
    TABLE_TEXT_COLUMN,
    ...TABLE_DATE_TIME_PROPERTY_COLUMNS,
  ];

  /* =========================================================
     Select columns
  ========================================================= */

  const TABLE_TAG_ADD_VALUE = "__add_tag__";

  const TABLE_SELECT_PROPERTY_COLUMNS = [
    {
      key: "priority",
      title: "Приоритет",
      inputType: "select",
      options: [
        { value: "", label: "нет" },
        { value: "высокий", label: "высокий" },
        { value: "средний", label: "средний" },
        { value: "низкий", label: "низкий" },
      ],
    },
    {
      key: "focus",
      title: "Фокус",
      inputType: "select",
      options: [
        { value: "", label: "нет" },
        { value: "план", label: "план" },
        { value: "подготовка", label: "подготовка" },
        { value: "фокус", label: "фокус" },
        { value: "скрыт", label: "скрыт" },
      ],
    },
    {
      key: "status",
      title: "Статус",
      inputType: "select",
      options: [
        { value: "", label: "нет" },
        { value: "очередь", label: "очередь" },
        { value: "в работе", label: "в работе" },
        { value: "на проверке", label: "на проверке" },
        { value: "на доработке", label: "на доработке" },
        { value: "завершено", label: "завершено" },
      ],
    },
    {
      key: "tag",
      title: "Тег",
      inputType: "select",

      /*
        Важно:
        getTableTagOptions пока остаётся в table_view.js.
        Поэтому здесь не пишем options: getTableTagOptions напрямую,
        иначе новый файл может выполниться раньше и словить ошибку.
      */
      options(node) {
        return window.getTableTagOptions?.(node) || [];
      },
    },
  ];

  const TABLE_ICON_COLUMN = {
    key: "icon",
    title: "Иконка",
    inputType: "select",
    options: [
      { value: "", label: "сбросить" },
      { value: "circle", label: "● круг" },
      { value: "diamond", label: "◆ ромб" },
      { value: "star", label: "★ звезда" },
      { value: "flag", label: "⚑ флаг" },
      { value: "spark", label: "✦ искра" },
    ],
  };

  /* =========================================================
     Upload columns
  ========================================================= */

  const TABLE_EXTRA_IMAGE_COLUMN = {
    key: "extraImage",
    title: "Доп изображение",
    inputType: "image",
  };

  const TABLE_FILE_COLUMN = {
    key: "file",
    title: "Файл",
    inputType: "file",
  };

  /* =========================================================
     Time / timer columns
  ========================================================= */

  const TABLE_TIME_COUNTER_COLUMN = {
    key: "timeCounter",
    title: "Счётчик времени",
    inputType: "timeCounter",
  };

  const TABLE_TIMER_DURATION_COLUMN = {
    key: "timer",
    title: "Время таймера",
    inputType: "timerDuration",
  };

  const TABLE_TIMER_REMAINING_COLUMN = {
    key: "timer",
    title: "Оставшееся время",
    inputType: "timerRemaining",
  };

  function getAllTablePropertyColumns() {
    return [
      ...TABLE_PROPERTY_COLUMNS,

      TABLE_START_DATETIME_COLUMN,
      TABLE_END_DATETIME_COLUMN,

      TABLE_DATE_RANGE_COLUMN,
      TABLE_TIME_RANGE_COLUMN,

      TABLE_FULL_DATETIME_RANGE_COLUMN,

      ...TABLE_SELECT_PROPERTY_COLUMNS,

      TABLE_EXTRA_IMAGE_COLUMN,
      TABLE_FILE_COLUMN,

      TABLE_TIME_COUNTER_COLUMN,
      TABLE_TIMER_DURATION_COLUMN,
      TABLE_TIMER_REMAINING_COLUMN,
    ];
  }

  window.tableColumns = {
    getAll: getAllTablePropertyColumns,

    text: TABLE_TEXT_COLUMN,
    icon: TABLE_ICON_COLUMN,

    propertyColumns: TABLE_PROPERTY_COLUMNS,
    dateTimePropertyColumns: TABLE_DATE_TIME_PROPERTY_COLUMNS,
    selectPropertyColumns: TABLE_SELECT_PROPERTY_COLUMNS,

    tagAddValue: TABLE_TAG_ADD_VALUE,
  };

  /*
    Совместимость со старым table_view.js:
    пока он ещё обращается к этим именам напрямую.
  */
  window.TABLE_TEXT_COLUMN = TABLE_TEXT_COLUMN;

  window.TABLE_START_DATE_COLUMN = TABLE_START_DATE_COLUMN;
  window.TABLE_START_TIME_COLUMN = TABLE_START_TIME_COLUMN;
  window.TABLE_END_DATE_COLUMN = TABLE_END_DATE_COLUMN;
  window.TABLE_END_TIME_COLUMN = TABLE_END_TIME_COLUMN;

  window.TABLE_DATE_TIME_PROPERTY_COLUMNS = TABLE_DATE_TIME_PROPERTY_COLUMNS;
  window.TABLE_DATE_RANGE_COLUMN = TABLE_DATE_RANGE_COLUMN;
  window.TABLE_TIME_RANGE_COLUMN = TABLE_TIME_RANGE_COLUMN;
  window.TABLE_START_DATETIME_COLUMN = TABLE_START_DATETIME_COLUMN;
  window.TABLE_END_DATETIME_COLUMN = TABLE_END_DATETIME_COLUMN;
  window.TABLE_FULL_DATETIME_RANGE_COLUMN = TABLE_FULL_DATETIME_RANGE_COLUMN;

  window.TABLE_PROPERTY_COLUMNS = TABLE_PROPERTY_COLUMNS;
  window.TABLE_SELECT_PROPERTY_COLUMNS = TABLE_SELECT_PROPERTY_COLUMNS;

  window.TABLE_TAG_ADD_VALUE = TABLE_TAG_ADD_VALUE;

  window.TABLE_ICON_COLUMN = TABLE_ICON_COLUMN;
  window.TABLE_EXTRA_IMAGE_COLUMN = TABLE_EXTRA_IMAGE_COLUMN;
  window.TABLE_FILE_COLUMN = TABLE_FILE_COLUMN;

  window.TABLE_TIME_COUNTER_COLUMN = TABLE_TIME_COUNTER_COLUMN;
  window.TABLE_TIMER_DURATION_COLUMN = TABLE_TIMER_DURATION_COLUMN;
  window.TABLE_TIMER_REMAINING_COLUMN = TABLE_TIMER_REMAINING_COLUMN;

  window.getAllTablePropertyColumns = getAllTablePropertyColumns;
})();