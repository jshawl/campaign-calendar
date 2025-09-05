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

export const getCampaignNames = (events) =>
  Object.keys(
    events.reduce((camps, ev) => {
      if (ev.campaignName) {
        camps[ev.campaignName] = true;
      }
      return camps; // 🏕️
    }, {}),
  ).sort();

export const renderCalendar = (calendarEl) => {
  const calendar = new FullCalendar.Calendar(calendarEl, {
    eventClassNames: ["field_guide_events_calendar-event"],
    eventClick: (info) => {
      const url = `https://${field_guide_events_calendar.org_id}.app.neoncrm.com/np/clients/${field_guide_events_calendar.org_id}/event.jsp?event=${info.event.id}`;
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

export const getEvents = async ({ options }) => {
  const eventsResponse = await fetch(
    `${field_guide_events_calendar.rest_url}/listEvents`,
  );
  const eventsData = await eventsResponse.json();
  if (!eventsData.events) {
    // oxlint-disable-next-line no-console
    console.error(
      "field_guide_events_calendar: error fetching events",
      eventsData,
    );
    return [];
  }
  return formatEvents({ events: eventsData.events, options });
};

const renderCampaignButton = ({ container, campaignName }) => {
  const div = document.createElement("div");
  let checkedAttribute = "";
  if (campaignName === "All") {
    checkedAttribute = "checked='true'";
  }
  div.innerHTML = `
    <input id="field_guide_events_calendar_campaign_name_${campaignName}" type="radio" name="field_guide_events_calendar_campaign_name" value="${campaignName}" ${checkedAttribute}/>
    <label for="field_guide_events_calendar_campaign_name_${campaignName}">
      ${campaignName}
    </label>
  `;
  container.append(div);
  return div;
};

export const renderCampaigns = ({ calendar, events, container, options }) => {
  if (options.filter_campaigns !== "true") {
    return;
  }
  const campaignNames = getCampaignNames(events);
  container.innerHTML = "";
  renderCampaignButton({ campaignName: "All", container });
  campaignNames.map((campaignName) =>
    renderCampaignButton({ campaignName, container }),
  );
  container.addEventListener("change", (event) => {
    const campaignName = event.target.value;
    render({ calendar, campaignName, events });
  });
};

export const render = ({ calendar, events, campaignName }) => {
  document.querySelector(".field_guide_events_calendar .loading")?.remove();
  calendar.getEvents().map((calendarEvent) => calendarEvent.remove());
  events
    .filter((event) => ["All", event.campaignName].includes(campaignName))
    .map((event) =>
      calendar.addEvent({
        ...event,
        allDay: event.startDate !== event.endDate,
      }),
    );
};

export const main = async () => {
  const container = document.querySelector(".field_guide_events_calendar");
  const calendarEl = document.querySelector(
    ".field_guide_events_calendar #calendar",
  );
  const campaignsEl = document.querySelector(
    ".field_guide_events_calendar .campaigns",
  );
  const options = container.dataset;
  const calendar = renderCalendar(calendarEl);
  const events = await getEvents({ options });
  render({ calendar, campaignName: "All", events });
  renderCampaigns({ calendar, container: campaignsEl, events, options });
};
