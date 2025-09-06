<?php
defined("ABSPATH") || exit();

/**
 * Admin settings, sanitization and settings page.
 */

function field_guide_events_calendar_register_settings_link($links)
{
    $links[] =
        '<a href="' .
        admin_url(
            "options-general.php?page=field_guide_events_calendar-settings",
        ) .
        '">' .
        __("Settings", "field-guide-events-calendar") .
        "</a>";
    return $links;
}
add_filter(
    "plugin_action_links_" .
        plugin_basename(
            FIELD_GUIDE_EVENTS_CALENDAR_DIR . "field-guide-events-calendar.php",
        ),
    "field_guide_events_calendar_register_settings_link",
);

function field_guide_events_calendar_settings_init()
{
    register_setting(
        "field_guide_events_calendar",
        "field_guide_events_calendar_options",
        "field_guide_events_calendar_sanitize_options",
    );

    add_settings_section(
        "field_guide_events_calendar_section",
        "",
        "field_guide_events_calendar_settings_header",
        "field_guide_events_calendar",
    );

    add_settings_field(
        "neon_crm_org_id",
        __("Org ID", "field-guide-events-calendar"),
        "field_guide_events_calendar_text_input",
        "field_guide_events_calendar",
        "field_guide_events_calendar_section",
        [
            "label_for" => "neon_crm_org_id",
        ],
    );

    add_settings_field(
        "neon_crm_api_key",
        __("API Key", "field-guide-events-calendar"),
        "field_guide_events_calendar_text_input",
        "field_guide_events_calendar",
        "field_guide_events_calendar_section",
        [
            "label_for" => "neon_crm_api_key",
            "type" => "password",
            "description" => __(
                "Enter your Neon CRM API key. Leave blank to keep the current key.",
                "field-guide-events-calendar",
            ),
        ],
    );
}
add_action("admin_init", "field_guide_events_calendar_settings_init");

function field_guide_events_calendar_options_scripts($hook)
{
    if ($hook !== "settings_page_field_guide_events_calendar-settings") {
        return;
    }

    $style_options = field_guide_events_calendar_script_options(
        "assets/css/admin.css",
    );
    wp_enqueue_style(
        "field-guide-events-calendar-admin",
        $style_options["url"],
        [],
        $style_options["version"],
    );

    $script_options = field_guide_events_calendar_script_options(
        "assets/js/admin.js",
    );
    wp_enqueue_script(
        "field-guide-events-calendar-admin",
        $script_options["url"],
        [],
        $script_options["version"],
        true,
    );
}
add_action(
    "admin_enqueue_scripts",
    "field_guide_events_calendar_options_scripts",
);

function field_guide_events_calendar_sanitize_options($input)
{
    $options = get_option("field_guide_events_calendar_options", []);
    $output = $options;

    if (isset($input["neon_crm_org_id"])) {
        $output["neon_crm_org_id"] = sanitize_text_field(
            $input["neon_crm_org_id"],
        );
    }

    // For API key: only update if a non-empty value was submitted; otherwise preserve existing key.
    if (isset($input["neon_crm_api_key"])) {
        $submitted = trim($input["neon_crm_api_key"]);
        if ("" !== $submitted) {
            $output["neon_crm_api_key"] = sanitize_text_field($submitted);
        } elseif (isset($options["neon_crm_api_key"])) {
            $output["neon_crm_api_key"] = $options["neon_crm_api_key"];
        }
    }
    return $output;
}

function field_guide_events_calendar_settings_header($args)
{
    ?>
	<p id="<?php echo esc_attr($args["id"]); ?>">
		<a href="https://developer.neoncrm.com/api/getting-started/api-keys/" target="_blank" rel="noopener noreferrer"><?php esc_html_e(
      "View Neon API Keys Documentation",
      "field-guide-events-calendar",
  ); ?></a>
	</p>
	<?php
}

function field_guide_events_calendar_text_input($args)
{
    $options = get_option("field_guide_events_calendar_options", []);
    $value = "";
    if (isset($options[$args["label_for"]])) {
        $value = $options[$args["label_for"]];
    }

    $type = isset($args["type"]) ? $args["type"] : "text";

    // For password fields, do not prefill the value attribute.
    $value_attr = "password" === $type ? "" : $value;
    ?>
	<input type="<?php echo esc_attr($type); ?>"
		   id="<?php echo esc_attr($args["label_for"]); ?>"
		   name="field_guide_events_calendar_options[<?php echo esc_attr(
         $args["label_for"],
     ); ?>]"
		   value="<?php echo esc_attr($value_attr); ?>" />
	<?php if ("password" === $type && !empty($value)) {
     $len = strlen($value);
     $last4 = $len > 4 ? substr($value, -4) : "";

     if ($len > 4) {
         $masked = str_repeat("*", max(0, $len - 4)) . $last4;
     } else {
         $masked = str_repeat("*", $len);
     }

     echo '<p class="description">' .
         sprintf(
             /* translators: %s is the masked API key (asterisks + last 4 chars) */
             esc_html__(
                 "Current key: %s — leave blank to keep existing key.",
                 "field-guide-events-calendar",
             ),
             esc_html($masked),
         ) .
         "</p>";
 }
}

function field_guide_events_calendar_settings_html()
{
    if (!current_user_can("manage_options")) {
        return;
    } ?>
	<div class="wrap">
		<h1><?php echo esc_html(get_admin_page_title()); ?></h1>
		<form action="options.php" method="post">
			<?php
   settings_fields("field_guide_events_calendar");
   do_settings_sections("field_guide_events_calendar");
   submit_button(__("Save Settings", "field-guide-events-calendar"));?>
		</form>
	</div>
	<?php
}

function field_guide_events_calendar_options_page()
{
    add_options_page(
        __(
            "Field Guide Events Calendar Settings",
            "field-guide-events-calendar",
        ),
        __("Field Guide Events Calendar", "field-guide-events-calendar"),
        "manage_options",
        "field_guide_events_calendar-settings",
        "field_guide_events_calendar_settings_html",
    );
}
add_action("admin_menu", "field_guide_events_calendar_options_page");
