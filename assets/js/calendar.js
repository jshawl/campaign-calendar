let store = {};

export const set = (key, value) => {
  store[key] = value;
  return store[key];
};

const get = (key) => store[key];

export const formatEvents = (unformattedEvents) =>
  unformattedEvents.map((unformattedEvent) => {
    const startDate =
      unformattedEvent["Event Start Date"] || unformattedEvent.startDate;
    const startTime =
      unformattedEvent["Event Start Time"] || unformattedEvent.startTime;
    const start = new Date(`${startDate}T${startTime}`);
    const options = get("options") || {};
    let endDate =
      unformattedEvent["Event End Date"] || unformattedEvent.endDate;
    if (options.multi_day_events === "false") {
      endDate = startDate;
    }
    const endTime =
      unformattedEvent["Event End Time"] || unformattedEvent.endTime;
    const end = new Date(`${endDate}T${endTime}`);
    return {
      category: unformattedEvent["Event Category Name"],
      end,
      endDate,
      id: unformattedEvent["Event ID"] || unformattedEvent.id,
      start,
      startDate,
      title: unformattedEvent["Event Name"] || unformattedEvent.name,
    };
  });

export const getCategories = (events) =>
  Object.keys(
    events.reduce((cats, ev) => {
      if (ev.category) {
        cats[ev.category] = true;
      }
      return cats; // 😸
    }, {}),
  ).sort();

export const renderCalendar = (calendarEl) => {
  const calendar = new FullCalendar.Calendar(calendarEl, {
    eventClassNames: ["neon-crm-calendar-event"],
    eventClick: (info) => {
      const url = `https://${neon_crm_calendar.org_id}.app.neoncrm.com/np/clients/${neon_crm_calendar.org_id}/event.jsp?event=${info.event.id}`;
      window.open(url, "_blank");
    },
    headerToolbar: {
      left: "title",
      right: "prev,next today",
    },
    height: "auto",
    initialView: "dayGridMonth",
  });
  calendar.render();
  return calendar;
};

export const getEvents = async () => {
  const eventsResponse = await fetch(
    `${neon_crm_calendar.rest_url}/listEvents`,
  );
  const eventsData = await eventsResponse.json();
  if (!eventsData.events) {
    // oxlint-disable-next-line no-console
    console.error("neon-crm-calendar: error fetching events", eventsData);
    return [];
  }
  return formatEvents(eventsData.events);
};

export const getEventsWithCategories = async () => {
  const eventsResponse = await fetch(`${neon_crm_calendar.rest_url}/events`);
  const eventsData = await eventsResponse.json();
  if (!eventsData.searchResults) {
    // oxlint-disable-next-line no-console
    console.error("neon-crm-calendar: error fetching events", eventsData);
    return [];
  }
  return formatEvents(eventsData.searchResults);
};

export const addEvent = (calendar, event) =>
  calendar.addEvent({
    ...event,
    allDay: event.startDate !== event.endDate,
  });

const renderCategory = (container, category) => {
  const div = document.createElement("div");
  let checkedAttribute = "";
  if (category === "All") {
    checkedAttribute = "checked='true'";
  }
  div.innerHTML = `
    <input id="neon_crm_calendar_category_${category}" type="radio" name="neon_crm_calendar_category" value="${category}" ${checkedAttribute}/>
    <label for="neon_crm_calendar_category_${category}">
      ${category}
    </label>
  `;
  container.append(div);
  return div;
};

export const renderCategories = async (categoriesEl, calendar) => {
  if (!categoriesEl) {
    return;
  }
  const eventsWithCategories = await getEventsWithCategories();
  setFetchedEvents(eventsWithCategories);
  getCalendarEvents().map((calendarEvent) => calendarEvent.remove());
  setCalendarEvents(
    getFetchedEvents().map((event) => addEvent(calendar, event)),
  );
  const categories = getCategories(getFetchedEvents());
  categoriesEl.innerHTML = "";
  renderCategory(categoriesEl, "All");
  categories.map((category) => renderCategory(categoriesEl, category));
  categoriesEl.addEventListener("change", (event) => {
    const category = event.target.value;

    getCalendarEvents().map((calendarEvent) => calendarEvent.remove());
    setCalendarEvents(
      getFetchedEvents()
        .filter((event) => ["All", event.category].includes(category))
        .map((event) => addEvent(calendar, event)),
    );
  });
};

export const setFetchedEvents = (events) => set("fetchedEvents", events);
const getFetchedEvents = () => get("fetchedEvents");

export const setCalendarEvents = (calendarEvents) =>
  set("calendarEvents", calendarEvents);
export const getCalendarEvents = () => get("calendarEvents");

setFetchedEvents([]);
setCalendarEvents([]);

export const renderEventsWithoutCategories = (events, calendar) => {
  document.querySelector(".neon-crm-calendar .loading").remove();
  if (getCalendarEvents().length > 0) {
    // if the events with categories already rendered, don't overwrite
    return;
  }
  setFetchedEvents(events);
  setCalendarEvents(events.map((event) => addEvent(calendar, event)));
};

export const main = () => {
  const container = document.querySelector(".neon-crm-calendar");
  const options = container.dataset;
  set("options", options);
  const calendarEl = document.querySelector(".neon-crm-calendar #calendar");
  const calendar = renderCalendar(calendarEl);
  getEvents().then((events) => renderEventsWithoutCategories(events, calendar));
  if (options.filter_categories !== "true") {
    return;
  }
  const categoriesEl = document.querySelector(".neon-crm-calendar .categories");
  // not awaited, so categories can start fetching
  renderCategories(categoriesEl, calendar);
};
