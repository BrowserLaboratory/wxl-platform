use super::scope::{build_http_scope, HttpRequest};
use super::events::{AsgiSendEvent, collect_response, make_receive_event};
use std::collections::HashMap;

fn get_request(url: &str) -> HttpRequest {
    HttpRequest {
        method: "GET".to_string(),
        url: url.to_string(),
        headers: HashMap::new(),
        body: None,
    }
}

// ─── 6.1 scope dict for GET request ─────────────────────────────────────────

#[test]
fn scope_has_correct_type_method_path_query() {
    let req = get_request("https://challenge-sqli.localhost/api/users?page=1");
    let scope = build_http_scope(&req).expect("scope build failed");

    assert_eq!(scope.scope_type, "http");
    assert_eq!(scope.method, "GET");
    assert_eq!(scope.path, "/api/users");
    assert_eq!(scope.query_string, "page=1");
}

#[test]
fn scope_method_is_uppercased() {
    let mut req = get_request("https://challenge-test.localhost/");
    req.method = "post".to_string();
    let scope = build_http_scope(&req).expect("scope build failed");
    assert_eq!(scope.method, "POST");
}

// ─── 6.3 receive callable: POST body → http.request event ───────────────────

#[test]
fn receive_event_contains_body_and_more_body_false() {
    let body = b"username=admin&password=test".to_vec();
    let event = make_receive_event(body.clone());

    assert_eq!(event.event_type, "http.request");
    assert_eq!(event.body, body);
    assert!(!event.more_body);
}

// ─── 6.5 collect response events ────────────────────────────────────────────

#[test]
fn single_body_chunk_assembled_correctly() {
    let events = vec![
        AsgiSendEvent::Start {
            status: 200,
            headers: vec![("content-type".to_string(), "text/plain".to_string())],
        },
        AsgiSendEvent::Body {
            body: b"Hello, World!".to_vec(),
            more_body: false,
        },
    ];

    let response = collect_response(events).expect("collect failed");

    assert_eq!(response.status, 200);
    assert_eq!(response.body, b"Hello, World!");
    assert_eq!(response.headers, vec![("content-type".to_string(), "text/plain".to_string())]);
}

#[test]
fn multiple_body_chunks_are_concatenated() {
    let events = vec![
        AsgiSendEvent::Start { status: 200, headers: vec![] },
        AsgiSendEvent::Body { body: b"chunk1".to_vec(), more_body: true },
        AsgiSendEvent::Body { body: b"chunk2".to_vec(), more_body: true },
        AsgiSendEvent::Body { body: b"chunk3".to_vec(), more_body: false },
    ];

    let response = collect_response(events).expect("collect failed");
    assert_eq!(response.body, b"chunk1chunk2chunk3");
}

#[test]
fn missing_start_event_returns_err() {
    let events = vec![
        AsgiSendEvent::Body { body: b"orphan".to_vec(), more_body: false },
    ];
    assert!(collect_response(events).is_err());
}
