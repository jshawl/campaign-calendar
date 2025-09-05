<?php
defined("ABSPATH") || exit();

add_action("rest_api_init", function () {
    register_rest_route("field_guide_events_calendar/v1", "/neon/events", [
        "methods" => "GET",
        "callback" => "field_guide_events_calendar_rest_neon_events",
        "permission_callback" => "__return_true",
    ]);
});

add_filter(
    "rest_request_before_callbacks",
    "field_guide_events_calendar_authorize",
    10,
    3,
);

function field_guide_events_calendar_get_from_cache($cache_key, $url, $args)
{
    $key =
        "field_guide_events_calendar_" .
        $cache_key .
        "_" .
        md5(json_encode($args));
    $cached = get_transient($key);
    $ttl = 60 * 60; // 1 hour
    if (false !== $cached) {
        return $cached;
    }

    $resp = wp_remote_get($url, $args);

    if (is_wp_error($resp)) {
        return new WP_Error("http_error", $resp->get_error_message(), [
            "status" => 500,
        ]);
    }

    $code = wp_remote_retrieve_response_code($resp);
    $body = wp_remote_retrieve_body($resp);
    $decoded = json_decode($body, true);
    if ($code >= 200 && $code < 300) {
        set_transient($key, $decoded, $ttl);
        return $decoded;
    }
    return new WP_Error("neon_error", $decoded, ["status" => $code]);
}

function field_guide_events_calendar_authorize($response, $handler, $request)
{
    $route = $request->get_route();
    if (strpos($route, "/field_guide_events_calendar/v1/neon") !== 0) {
        return $response;
    }
    $api_key = field_guide_events_calendar_get_option("neon_crm_api_key", "");
    $org_id = field_guide_events_calendar_get_option("neon_crm_org_id", "");
    if (empty($api_key)) {
        return new WP_Error("no_api_key", "API key not configured", [
            "status" => 500,
        ]);
    }
    if (empty($org_id)) {
        return new WP_Error("no_org_id", "Org ID not configured", [
            "status" => 500,
        ]);
    }

    $request->set_param("_headers", [
        "Authorization" => "Basic " . base64_encode($org_id . ":" . $api_key),
        "Content-Type" => "application/json",
        "NEON-API-VERSION" => "2.10",
    ]);
    return $response;
}

function field_guide_events_calendar_rest_neon_events(WP_REST_Request $request)
{
    $headers = $request->get_param("_headers");
    $base = "https://api.neoncrm.com/v2/events";
    $args = [
        "headers" => $headers,
        "timeout" => 15,
    ];
    $start_date = gmdate("Y-m-d", strtotime("-1 month"));
    $end_date = gmdate("Y-m-d", strtotime("+3 month"));
    $params = [
        "startDateAfter=" . rawurlencode($start_date),
        "endDateBefore=" . rawurlencode($end_date),
        "pageSize=200",
    ];
    $neon_events_url = $base . "?" . implode("&", $params);
    $events = field_guide_events_calendar_get_from_cache(
        "listEvents",
        $neon_events_url,
        $args,
    );
    if (empty($events)) {
        return new WP_Error("no_events", "Could not get events from Neon CRM", [
            "status" => 500,
        ]);
    }
    return rest_ensure_response($events);
}
