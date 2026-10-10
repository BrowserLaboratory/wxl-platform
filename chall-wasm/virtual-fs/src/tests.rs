use super::crypto::{decrypt, encrypt};
use super::idb::FsStore;
use super::key_derive::{derive_key, encode_key};
use super::payload::{serialize_payload, parse_payload, ChallengePayload, FsEntry};
use super::flag_verify::{hash_flag, verify_flag};

fn test_key() -> [u8; 32] {
    [0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe, 0xba, 0xbe,
     0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
     0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
     0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11, 0x22]
}

fn wrong_key() -> [u8; 32] {
    [0x00u8; 32]
}

// ─── Crypto: stored value ≠ plaintext ──────────────────────────────────

#[test]
fn write_stores_encrypted_not_plaintext() {
    let key = test_key();
    let plaintext = b"FLAG{secret_flag}";

    let blob = encrypt(&key, plaintext).expect("encrypt failed");

    assert_ne!(&blob.data, plaintext);
    assert!(blob.data.len() > plaintext.len());
}

// ─── Crypto: correct key decrypts; wrong key errors ────────────────────

#[test]
fn read_with_correct_key_returns_plaintext() {
    let key = test_key();
    let plaintext = b"hello from FS";

    let blob = encrypt(&key, plaintext).expect("encrypt");
    let recovered = decrypt(&key, &blob.data).expect("decrypt");

    assert_eq!(recovered, plaintext);
}

#[test]
fn read_with_wrong_key_returns_err() {
    let key = test_key();
    let bad_key = wrong_key();
    let plaintext = b"secret data";

    let blob = encrypt(&key, plaintext).expect("encrypt");
    let result = decrypt(&bad_key, &blob.data);

    assert!(result.is_err(), "expected Err with wrong key, got Ok");
}

// ─── FsStore: init and reset ───────────────────────────────────────────

#[test]
fn init_populates_store_when_empty() {
    let mut store = FsStore::new();
    let key = test_key();

    let entries: Vec<(&str, &[u8])> = vec![
        ("/flag.txt", b"FLAG{secret}"),
        ("/app.py", b"from flask import Flask"),
    ];

    fs_init(&mut store, &key, &entries);

    assert!(!store.is_empty());
    assert!(store.contains("/flag.txt"));
    assert!(store.contains("/app.py"));
}

#[test]
fn init_skips_when_store_already_populated() {
    let mut store = FsStore::new();
    let key = test_key();
    let entries: Vec<(&str, &[u8])> = vec![("/flag.txt", b"FLAG{secret}")];

    fs_init(&mut store, &key, &entries);

    let marker = b"MARKER_SHOULD_NOT_BE_OVERWRITTEN";
    let blob = encrypt(&key, marker).expect("encrypt");
    store.write("/flag.txt", blob.data);

    fs_init_if_empty(&mut store, &key, &entries);

    let raw = store.read("/flag.txt").expect("entry exists");
    let recovered = decrypt(&key, raw).expect("decrypt");
    assert_eq!(recovered, marker as &[u8]);
}

#[test]
fn reset_clears_and_repopulates() {
    let mut store = FsStore::new();
    let key = test_key();
    let entries: Vec<(&str, &[u8])> = vec![("/flag.txt", b"FLAG{original}")];

    fs_init(&mut store, &key, &entries);

    let mutated = encrypt(&key, b"MUTATED").expect("encrypt");
    store.write("/flag.txt", mutated.data);

    store.delete_all();
    fs_init(&mut store, &key, &entries);

    let raw = store.read("/flag.txt").expect("entry exists");
    let recovered = decrypt(&key, raw).expect("decrypt");
    assert_eq!(recovered, b"FLAG{original}" as &[u8]);
}

// ─── Payload + key_derive integration ──────────────────────────────────

#[test]
fn payload_with_xor_key_roundtrip() {
    let real_key = test_key();
    let encoded_key = encode_key(&real_key);
    let flag_content = b"FLAG{integration_test}";
    let slug = "test-challenge";

    // Build payload with encoded key and encrypted entries
    let encrypted_flag = encrypt(&real_key, flag_content).expect("encrypt");
    let encrypted_app = encrypt(&real_key, b"print('hello')").expect("encrypt");
    let verifier = hash_flag(flag_content, slug);

    let payload = ChallengePayload {
        slug: slug.to_string(),
        key_material: encoded_key.to_vec(),
        verifier: verifier.clone(),
        entries: vec![
            FsEntry { path: "/flag.txt".to_string(), data: encrypted_flag.data },
            FsEntry { path: "__app__".to_string(), data: encrypted_app.data },
        ],
        metadata: b"{\"backend\":\"flask\"}".to_vec(),
    };

    // Serialize → parse → derive key → decrypt
    let bytes = serialize_payload(&payload);
    let parsed = parse_payload(&bytes).expect("parse");

    let derived_key = derive_key(&parsed.key_material).expect("derive");
    assert_eq!(derived_key, real_key);

    // Decrypt the flag entry
    let flag_plaintext = decrypt(&derived_key, &parsed.entries[0].data).expect("decrypt flag");
    assert_eq!(flag_plaintext, flag_content);

    // Verify flag
    assert!(verify_flag(flag_content, slug, &parsed.verifier));
    assert!(!verify_flag(b"wrong flag", slug, &parsed.verifier));
}

#[test]
fn payload_init_store_and_read() {
    let real_key = test_key();
    let flag_content = b"FLAG{store_test}";
    let app_content = b"from flask import Flask\napp = Flask(__name__)";

    // Encrypt entries
    let encrypted_flag = encrypt(&real_key, flag_content).expect("encrypt flag");
    let encrypted_app = encrypt(&real_key, app_content).expect("encrypt app");

    // Populate store from payload entries
    let mut store = FsStore::new();
    store.write("/flag.txt", encrypted_flag.data);
    store.write("__app__", encrypted_app.data);

    // Read and decrypt using derived key
    let flag_raw = store.read("/flag.txt").expect("flag exists");
    let flag_decrypted = decrypt(&real_key, flag_raw).expect("decrypt flag");
    assert_eq!(flag_decrypted, flag_content);

    let app_raw = store.read("__app__").expect("app exists");
    let app_decrypted = decrypt(&real_key, app_raw).expect("decrypt app");
    assert_eq!(app_decrypted, app_content);
}

// ─── helpers ───────────────────────────────────────────────────────────

fn fs_init(store: &mut FsStore, key: &[u8; 32], entries: &[(&str, &[u8])]) {
    for (path, plaintext) in entries {
        let blob = encrypt(key, plaintext).expect("encrypt");
        store.write(path, blob.data);
    }
}

fn fs_init_if_empty(store: &mut FsStore, key: &[u8; 32], entries: &[(&str, &[u8])]) {
    if !store.is_empty() {
        return;
    }
    fs_init(store, key, entries);
}
