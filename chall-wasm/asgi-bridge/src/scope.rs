use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AsgiScope {
    #[serde(rename = "type")]
    pub scope_type: String,
    pub method: String,
    pub path: String,
    pub query_string: String,
    pub headers: Vec<(String, String)>,
    pub server: (String, u16),
}

pub fn build_http_scope(req: &HttpRequest) -> Result<AsgiScope, String> {
    let url = req.url.parse::<url::Url>()
        .or_else(|_| format!("https://localhost{}", req.url).parse::<url::Url>())
        .map_err(|e| format!("invalid URL: {e}"))?;

    let path = url.path().to_string();
    let query_string = url.query().unwrap_or("").to_string();
    let host = url.host_str().unwrap_or("localhost").to_string();
    let port = url.port().unwrap_or(443);

    let headers = req.headers.iter()
        .map(|(k, v)| (k.to_lowercase(), v.clone()))
        .collect();

    Ok(AsgiScope {
        scope_type: "http".to_string(),
        method: req.method.to_uppercase(),
        path,
        query_string,
        headers,
        server: (host, port),
    })
}
