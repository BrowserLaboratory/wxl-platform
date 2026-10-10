use wasm_bindgen::prelude::*;
use crate::crypto::{decrypt, encrypt};
use crate::idb::FsStore;
use crate::key_derive::derive_key;
use crate::payload::parse_payload;
use crate::flag_verify::verify_flag;
use std::cell::RefCell;

/// Internal state: the FS store plus the derived key and payload data.
struct ChallengeState {
    store: FsStore,
    /// Derived AES-256 key (after XOR decode). None if not yet initialized.
    key: Option<[u8; 32]>,
    /// Challenge slug from the payload.
    slug: Option<String>,
    /// Flag verifier hash from the payload.
    verifier: Option<Vec<u8>>,
    /// Raw payload data (kept for reset).
    payload_data: Option<Vec<u8>>,
}

impl ChallengeState {
    fn new() -> Self {
        Self {
            store: FsStore::new(),
            key: None,
            slug: None,
            verifier: None,
            payload_data: None,
        }
    }
}

thread_local! {
    static STATE: RefCell<ChallengeState> = RefCell::new(ChallengeState::new());
}

/// Initialize the virtual FS from a custom section payload.
///
/// `slug` — the challenge identifier (must match the slug in the payload).
/// `payload_bytes` — the raw bytes of the "chall-data" WASM custom section.
///
/// Skips if already populated.
#[wasm_bindgen]
pub fn wasm_fs_init(slug: &str, payload_bytes: &[u8]) -> Result<(), JsValue> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();

        // Skip if already initialized for this slug
        if let Some(ref existing_slug) = state.slug {
            if existing_slug == slug && !state.store.is_empty() {
                return Ok(());
            }
        }

        init_from_payload(&mut state, slug, payload_bytes)
    })
}

/// Reset the store: delete all entries and re-initialize from the stored payload.
#[wasm_bindgen]
pub fn wasm_fs_reset(slug: &str) -> Result<(), JsValue> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.store.delete_all();

        // Re-initialize from the stored payload data
        let payload_data = state.payload_data.clone()
            .ok_or_else(|| JsValue::from_str("no payload data stored; call wasm_fs_init first"))?;

        init_from_payload(&mut state, slug, &payload_data)
    })
}

/// Decrypt a stored blob and return the plaintext bytes.
/// Key is held internally — no external key parameter needed.
#[wasm_bindgen]
pub fn wasm_fs_read(path: &str) -> Result<Vec<u8>, JsValue> {
    STATE.with(|s| {
        let state = s.borrow();
        let key = state.key.as_ref()
            .ok_or_else(|| JsValue::from_str("not initialized; call wasm_fs_init first"))?;
        let raw = state.store.read(path)
            .ok_or_else(|| JsValue::from_str("path not found"))?;
        decrypt(key, raw).map_err(|e| JsValue::from_str(&e))
    })
}

/// Encrypt plaintext and write to the in-memory store.
/// Key is held internally — no external key parameter needed.
#[wasm_bindgen]
pub fn wasm_fs_write(path: &str, plaintext: &[u8]) -> Result<(), JsValue> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let key = state.key.as_ref()
            .ok_or_else(|| JsValue::from_str("not initialized; call wasm_fs_init first"))?;
        let blob = encrypt(key, plaintext).map_err(|e| JsValue::from_str(&e))?;
        state.store.write(path, blob.data);
        Ok(())
    })
}

/// Verify a submitted flag against the stored verifier hash.
/// Returns true if the flag is correct.
#[wasm_bindgen]
pub fn wasm_verify_flag(flag_bytes: &[u8]) -> Result<bool, JsValue> {
    STATE.with(|s| {
        let state = s.borrow();
        let slug = state.slug.as_ref()
            .ok_or_else(|| JsValue::from_str("not initialized; call wasm_fs_init first"))?;
        let verifier = state.verifier.as_ref()
            .ok_or_else(|| JsValue::from_str("no verifier stored"))?;
        Ok(verify_flag(flag_bytes, slug, verifier))
    })
}

/// List all entry paths in the virtual FS store.
/// Returns a JSON-serialized string array, e.g. `["__app__", "/flag.txt"]`.
#[wasm_bindgen]
pub fn wasm_fs_list() -> Result<String, JsValue> {
    STATE.with(|s| {
        let state = s.borrow();
        if state.key.is_none() {
            return Err(JsValue::from_str("not initialized; call wasm_fs_init first"));
        }
        let keys = state.store.keys();
        serde_json::to_string(&keys)
            .map_err(|e| JsValue::from_str(&format!("JSON serialize error: {e}")))
    })
}

/// Internal: parse payload, derive key, populate store.
fn init_from_payload(state: &mut ChallengeState, slug: &str, payload_bytes: &[u8]) -> Result<(), JsValue> {
    let payload = parse_payload(payload_bytes)
        .map_err(|e| JsValue::from_str(&format!("payload parse error: {e}")))?;

    // Verify slug matches
    if payload.slug != slug {
        return Err(JsValue::from_str(&format!(
            "slug mismatch: expected '{}', got '{}'", slug, payload.slug
        )));
    }

    // Derive key from obfuscated key material
    let key = derive_key(&payload.key_material)
        .map_err(|e| JsValue::from_str(e))?;

    // Populate store with encrypted entries
    for entry in &payload.entries {
        state.store.write(&entry.path, entry.data.clone());
    }

    // Store state for later use
    state.key = Some(key);
    state.slug = Some(payload.slug);
    state.verifier = Some(payload.verifier);
    state.payload_data = Some(payload_bytes.to_vec());

    Ok(())
}
