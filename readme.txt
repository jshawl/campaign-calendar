=== Field Guide Events Calendar ===
Contributors: jshawl
Stable tag: 1.1.0
Tested up to: 6.8
Requires at least: 6.0
License: GPLv2 or later

== Description ==

A plugin to display a filterable calendar of events with initial support for Neon CRM.

== Usage ==

Add a short code to any page or post to display a calendar of upcoming events:

`[field_guide_events_calendar]`

Additional attributes are available:
- `filter_campaigns="true"`
  - filters events by campaign name
- `multi_day_events="false"`
  - uses the start date only for dates that span multiple days

== Installation ==

Install the plugin and configure the Org ID and Api Key in Settings > Field Guide Events Calendar.

Information about the Org ID and Api Key are available on [Neon's developer site](https://developer.neoncrm.com/api/getting-started/api-keys/).

== Changelog ==

= [1.1.0] 2025-09-04 =

* Added `multi_day_events` attribute 
* Uses campaign names for filtering instead of categories

= [1.0.0] 2025-09-01 =

* Initial release 