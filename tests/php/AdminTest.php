<?php

class AdminTest extends WP_UnitTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        update_option("field_guide_events_calendar_options", [
            "neon_crm_api_key" => "secret",
            "neon_crm_org_id" => "org123",
        ]);
    }

    public function tearDown(): void
    {
        delete_option("field_guide_events_calendar_options");
        parent::tearDown();
    }

    public function test_sanitize_options_ignores_empty_api_key()
    {
        $options = field_guide_events_calendar_sanitize_options([
            "neon_crm_org_id" => "org123",
            "neon_crm_api_key" => "",
        ]);
        $this->assertStringContainsString(
            $options["neon_crm_api_key"],
            "secret",
        );
        $other_options = field_guide_events_calendar_sanitize_options([
            "neon_crm_org_id" => "org123",
            "neon_crm_api_key" => "newkey",
        ]);
        $this->assertStringContainsString(
            $other_options["neon_crm_api_key"],
            "newkey",
        );
    }

    public function test_text_input_does_not_expose_api_key()
    {
        ob_start();
        field_guide_events_calendar_text_input([
            "label_for" => "neon_crm_api_key",
            "type" => "password",
        ]);
        $output = ob_get_clean();
        $this->assertStringContainsString('value=""', $output);
        $this->assertStringContainsString("**cret", $output);
    }

    public function test_admin_init_integration()
    {
        wp_set_current_user(
            $this->factory->user->create(["role" => "administrator"]),
        );
        $this->assertNotFalse(
            has_action(
                "admin_init",
                "field_guide_events_calendar_settings_init",
            ),
        );
        ob_start();
        field_guide_events_calendar_settings_init();
        do_settings_sections("field_guide_events_calendar");
        $output = ob_get_clean();
        $this->assertStringContainsString(
            'name="field_guide_events_calendar_options[neon_crm_api_key]"',
            $output,
        );
        $this->assertStringContainsString(
            'name="field_guide_events_calendar_options[neon_crm_org_id]"',
            $output,
        );
    }

    public function test_options_page_enqueues_assets()
    {
        wp_set_current_user(
            $this->factory->user->create(["role" => "administrator"]),
        );
        set_current_screen(
            "settings_page_field_guide_events_calendar-settings",
        );
        do_action(
            "admin_enqueue_scripts",
            "settings_page_field_guide_events_calendar-settings",
        );
        $this->assertTrue(
            wp_script_is("field-guide-events-calendar-admin", "enqueued"),
        );
    }
}
