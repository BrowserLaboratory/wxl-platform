use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};

pub struct EncryptedBlob {
    /// 12-byte nonce prepended to the ciphertext
    pub data: Vec<u8>,
}

/// Encrypt plaintext with AES-GCM-256.
/// Returns nonce (12 bytes) || ciphertext (includes 16-byte auth tag).
pub fn encrypt(key_bytes: &[u8; 32], plaintext: &[u8]) -> Result<EncryptedBlob, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| format!("encrypt error: {e}"))?;

    let mut data = Vec::with_capacity(12 + ciphertext.len());
    data.extend_from_slice(&nonce);
    data.extend_from_slice(&ciphertext);

    Ok(EncryptedBlob { data })
}

/// Decrypt AES-GCM-256 blob (nonce || ciphertext).
/// Returns Err on auth failure or bad key.
pub fn decrypt(key_bytes: &[u8; 32], blob: &[u8]) -> Result<Vec<u8>, String> {
    if blob.len() < 12 {
        return Err("blob too short".into());
    }
    let (nonce_bytes, ciphertext) = blob.split_at(12);
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "decryption failed (wrong key or corrupted data)".into())
}
