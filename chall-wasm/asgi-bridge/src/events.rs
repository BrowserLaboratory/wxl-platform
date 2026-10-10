use serde::{Deserialize, Serialize};

/// Incoming ASGI event from the `receive` callable
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsgiRequest {
    #[serde(rename = "type")]
    pub event_type: String,
    pub body: Vec<u8>,
    pub more_body: bool,
}

/// Single ASGI response event (from the `send` callable)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AsgiSendEvent {
    #[serde(rename = "http.response.start")]
    Start { status: u16, headers: Vec<(String, String)> },
    #[serde(rename = "http.response.body")]
    Body { body: Vec<u8>, more_body: bool },
}

/// Assembled HTTP response after collecting all ASGI send events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsgiResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

/// Collect ASGI send events into a final HTTP response.
/// Events must be: exactly one Start, then one or more Body events.
pub fn collect_response(events: Vec<AsgiSendEvent>) -> Result<AsgiResponse, String> {
    let mut status = None;
    let mut headers = None;
    let mut body = Vec::new();

    for event in events {
        match event {
            AsgiSendEvent::Start { status: s, headers: h } => {
                status = Some(s);
                headers = Some(h);
            }
            AsgiSendEvent::Body { body: chunk, .. } => {
                body.extend_from_slice(&chunk);
            }
        }
    }

    Ok(AsgiResponse {
        status: status.ok_or("missing http.response.start event")?,
        headers: headers.unwrap_or_default(),
        body,
    })
}

/// Build the `receive` callable payload for an HTTP request body
pub fn make_receive_event(body: Vec<u8>) -> AsgiRequest {
    AsgiRequest {
        event_type: "http.request".to_string(),
        body,
        more_body: false,
    }
}
