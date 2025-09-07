const initialModel = {
  events: [],
  filter: "All",
  loading: true,
  options: {},
};

export const elements = {
  calendar: () =>
    document.querySelector(".field_guide_events_calendar #calendar"),
  campaigns: () =>
    document.querySelector(".field_guide_events_calendar .campaigns"),
  container: () => document.querySelector(".field_guide_events_calendar"),
  loading: () =>
    document.querySelector(".field_guide_events_calendar .loading"),
};

let currentModel = { ...initialModel };

export const dispatch = (action) => {
  const [newModel, command] = update(action, currentModel);
  currentModel = newModel;
  command(dispatch);
  view(currentModel, dispatch);
};

// eslint-disable-next-line unicorn/no-null
let _calendar = null;
export const init = (dispatch) => {
  const el = elements.container();
  const options = { ...el.dataset };
  _calendar = new FullCalendar.Calendar(elements.calendar(), calendarOptions);
  _calendar.render();
  dispatch({ options, type: "INIT" });
};

export const commands = {
  fetchEvents:
    ({ start, end }) =>
    async (dispatch) => {
      const url = new URL(
        `${field_guide_events_calendar.rest_url}/neon/events`,
      );
      url.searchParams.append("start", start);
      url.searchParams.append("end", end);
      const response = await fetch(url.toString());
      const { events } = await response.json();
      dispatch({ events, type: "EVENTS_FETCHED" });
    },
  noop: () => () => {},
  onEventClick:
    ({ id }) =>
    (_dispatch) => {
      const url = `https://${field_guide_events_calendar.org_id}.app.neoncrm.com/np/clients/${field_guide_events_calendar.org_id}/event.jsp?event=${id}`;
      window.open(url, "_blank");
    },
};

export const update = (msg, model) => {
  switch (msg.type) {
    case "INIT": {
      return [{ ...model, options: msg.options }, commands.noop()];
    }

    case "DATES_SET": {
      const start = msg.info.startStr.slice(0, 10);
      const end = msg.info.endStr.slice(0, 10);
      return [
        { ...model, end, loading: true, start },
        commands.fetchEvents({ end, start }),
      ];
    }

    case "EVENTS_FETCHED": {
      const events = formatEvents({
        events: msg.events,
        options: model.options,
      });
      let { filter } = model;
      if (!getCampaignNames(events).includes(model.filter)) {
        filter = "All";
      }
      return [{ ...model, events, filter, loading: false }, commands.noop()];
    }

    case "CAMPAIGN_FILTER_CHANGED": {
      const { filter } = msg;
      return [{ ...model, filter }, commands.noop()];
    }

    case "ON_EVENT_CLICK": {
      return [model, commands.onEventClick({ id: msg.id })];
    }

    default: {
      throw new Error(`Unhandled message: ${JSON.stringify(msg)}`);
    }
  }
};

export const view = (model, dispatch) => {
  const calendar = getCalendar();
  calendar?.removeAllEvents();
  model.events
    .filter((event) => ["All", event.campaignName].includes(model.filter))
    .map((event) =>
      calendar?.addEvent({
        ...event,
        allDay: event.startDate !== event.endDate,
      }),
    );

  const loadingEl = elements.loading();
  if (model.loading) {
    loadingEl.style.display = "block";
  } else {
    loadingEl.style.display = "none";
  }

  if (model.options.filter_campaigns !== "true") {
    return;
  }
  const campaignNames = getCampaignNames(model.events);
  const container = elements.campaigns();
  container.innerHTML = "";
  campaignNames.forEach((campaignName) => {
    const div = document.createElement("div");
    let checkedAttribute = "";
    if (campaignName === model.filter) {
      checkedAttribute = "checked='true'";
    }
    div.innerHTML = `
            <input id="field_guide_events_calendar_campaign_name_${campaignName}" type="radio" name="field_guide_events_calendar_campaign_name" value="${campaignName}" ${checkedAttribute}/>
            <label for="field_guide_events_calendar_campaign_name_${campaignName}">
              ${campaignName}
            </label>
          `;
    div.addEventListener("change", (event) =>
      dispatch({ filter: event.target.value, type: "CAMPAIGN_FILTER_CHANGED" }),
    );
    container.append(div);
  });
};

// Helpers
// -------

const getCalendar = () => _calendar;
const calendarOptions = {
  datesSet: (info) => {
    dispatch({ info, type: "DATES_SET" });
  },
  eventClassNames: ["field_guide_events_calendar-event"],
  eventClick: (info) => dispatch({ id: info.event.id, type: "ON_EVENT_CLICK" }),
  headerToolbar: {
    left: "title",
    right: "prev,next today",
  },
  height: "auto",
  initialView: "dayGridMonth",
};

export const getCampaignNames = (events) => [
  "All",
  ...Object.keys(
    events.reduce((camps, ev) => {
      if (ev.campaignName) {
        camps[ev.campaignName] = true;
      }
      return camps; // 🏕️
    }, {}),
  ).sort(),
];

export const formatEvents = ({ events, options }) =>
  events.map((event) => {
    const { endTime, startDate, startTime } = event;
    let { endDate } = event;
    if (options.multi_day_events === "false") {
      endDate = startDate;
    }
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    return {
      campaignName: event.campaignName,
      end,
      endDate,
      id: event.id,
      start,
      startDate,
      title: event.name,
    };
  });
