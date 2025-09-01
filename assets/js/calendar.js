export const formatEvents = (unformattedEvents) =>
  unformattedEvents.map((unformattedEvent) => {
    const start = new Date(
      `${unformattedEvent["Event Start Date"]}T${unformattedEvent["Event Start Time"]}`
    );
    const end = new Date(
      `${unformattedEvent["Event End Date"]}T${unformattedEvent["Event End Time"]}`
    );
    return {
      id: unformattedEvent["Event ID"],
      title: unformattedEvent["Event Name"],
      start,
      end,
      startDate: unformattedEvent["Event Start Date"],
      endDate: unformattedEvent["Event End Date"],
      category: unformattedEvent["Event Category Name"],
    };
  });

export const getCategories = (events) =>
  Object.keys(
    events.reduce((cats, ev) => {
      return { ...cats, ...(ev.category ? { [ev.category]: true } : {}) };
    }, {})
  ).sort((a, b) => a.localeCompare(b));

export const renderCalendar = (calendarEl) => {
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    eventClassNames: ["neoncrm-calendar-event"],
    headerToolbar: {
      right: "prev,next today",
      left: "title",
    },
    eventClick: (info) => {
      const url = `https://${neoncrm_calendar.org_id}.app.neoncrm.com/np/clients/${neoncrm_calendar.org_id}/eventRegistration.jsp?event=${info.event.id}`;
      window.open(url, "_blank");
    },
  });
  calendar.render();
  return calendar;
};

export const getEvents = async () => {
  const eventsResponse = await fetch(neoncrm_calendar.rest_url);
  const eventsData = await eventsResponse.json();
  if (!eventsData.searchResults) {
    console.error("neoncrm-calendar: error fetching events", eventsData);
    return [];
  }
  return formatEvents(eventsData.searchResults);
};

export const addEvent = (calendar, event) => {
  return calendar.addEvent({
    ...event,
    allDay: event.startDate !== event.endDate,
  });
};

const renderCategory = (container, category, opts) => {
  const button = document.createElement("button");
  button.innerHTML = category;
  button.addEventListener("click", () => {
    opts.onChange(category);
  });
  container.appendChild(button);
  return button;
};

export const renderCategories = (categoriesEl, categories, opts) => {
  if (!categoriesEl) return;
  categoriesEl.innerHTML = "";
  const button = renderCategory(categoriesEl, "All", opts);
  button.classList.add("active");
  categories.map((category) => {
    renderCategory(categoriesEl, category, opts);
  });
  categoriesEl.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    categoriesEl.querySelector(".active")?.classList.remove("active");
    e.target.classList.add("active");
  });
};

export const main = async () => {
  const calendarEl = document.querySelector(".neoncrm-calendar #calendar");
  const categoriesEl = document.querySelector(".neoncrm-calendar .categories");
  const calendar = renderCalendar(calendarEl);
  const events = await getEvents();
  document.querySelector(".neoncrm-calendar .loading").remove();

  let calendarEvents = events.map((event) => addEvent(calendar, event));

  renderCategories(categoriesEl, getCategories(events), {
    onChange: (category) => {
      calendarEvents.map((calendarEvent) => calendarEvent.remove());
      calendarEvents = events
        .filter((event) => ["All", event.category].includes(category))
        .map((event) => addEvent(calendar, event));
    },
  });
};
