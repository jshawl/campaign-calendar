<?php

class RestTest extends WP_UnitTestCase
{
    private WP_Rest_Request $neon_request;

    public function setUp(): void
    {
        parent::setUp();
        update_option("field_guide_events_calendar_options", [
            "neon_crm_api_key" => "secret",
            "neon_crm_org_id" => "org123",
        ]);
        $this->neon_request = new WP_REST_Request(
            "GET",
            "/field_guide_events_calendar/v1/neon/events",
        );
        $this->neon_request->set_query_params([
            "start" => "2024-01-01",
            "end" => "2024-01-31",
        ]);
    }

    public function tearDown(): void
    {
        delete_option("field_guide_events_calendar_options");
        parent::tearDown();
    }

    public function mock_events_response($events): void
    {
        add_filter(
            "pre_http_request",
            function ($response, $args, $url) use ($events) {
                if (strpos($url, "events") !== false) {
                    return $events;
                }
                return new WP_Error(
                    "unexpected_url",
                    "Unexpected URL: " . $url,
                );
            },
            10,
            3,
        );
    }

    public function test_happy_path_list_events()
    {
        $this->mock_events_response([
            "response" => ["code" => 200],
            "body" => json_encode([
                "events" => [
                    [
                        "id" => 1,
                        "name" => "Event 1",
                        "startDate" => "2024-06-01",
                        "endDate" => "2024-06-01",
                    ],
                ],
            ]),
        ]);
        $response = rest_do_request($this->neon_request);
        $this->assertIsArray($response->data["events"]);
        $this->assertCount(1, $response->data["events"]);
    }

    public function test_transient()
    {
        $this->mock_events_response([
            "response" => ["code" => 200],
            "body" => json_encode([
                "events" => [
                    [
                        "id" => 1,
                        "name" => "Event 1",
                        "startDate" => "2024-06-01",
                        "endDate" => "2024-06-01",
                    ],
                ],
            ]),
        ]);

        $response = rest_do_request($this->neon_request);
        $this->assertIsArray($response->data["events"]);
        $this->assertCount(1, $response->data["events"]);
        $this->mock_events_response([
            "response" => ["code" => 500],
            "body" => json_encode([]),
        ]);
        $response2 = rest_do_request($this->neon_request);
        $this->assertIsArray($response2->data["events"]);
        $this->assertCount(1, $response2->data["events"]);
    }

    public function test_http_error()
    {
        $this->mock_events_response(
            new WP_Error("http_failure", "HTTP request failed"),
        );
        $response = rest_do_request($this->neon_request);
        $this->assertEquals("http_error", $response->data["code"]);
    }

    public function test_neon_error()
    {
        $this->mock_events_response([
            "response" => ["code" => 400],
            "body" => json_encode([]),
        ]);
        $response = rest_do_request($this->neon_request);
        $this->assertEquals("neon_error", $response->data["code"]);
    }

    public function test_api_key_error()
    {
        $options = update_option("field_guide_events_calendar_options", [
            "neon_crm_api_key" => "",
            "neon_crm_org_id" => "org123",
        ]);
        $response = rest_do_request($this->neon_request);
        $this->assertEquals("no_api_key", $response->data["code"]);
    }

    public function test_org_id_error()
    {
        $options = update_option("field_guide_events_calendar_options", [
            "neon_crm_api_key" => "secret",
            "neon_crm_org_id" => "",
        ]);
        $response = rest_do_request($this->neon_request);
        $this->assertEquals("no_org_id", $response->data["code"]);
    }
}
