/// Level 2 key obfuscation: XOR chain with compile-time constants.
///
/// The actual AES-256 key is never stored in plaintext.
/// At build time: stored_key = real_key XOR MASK_A XOR MASK_B XOR MASK_C
/// At runtime:    real_key   = stored_key XOR MASK_A XOR MASK_B XOR MASK_C
///
/// The 3 masks are compile-time constants embedded in the WASM code section,
/// making them harder to extract than data section values.

/// XOR mask A — embedded as a compile-time constant in the code section.
const MASK_A: [u8; 32] = [
    0x7a, 0x3f, 0xb1, 0x92, 0xe4, 0x58, 0x0d, 0xc6,
    0xa3, 0x17, 0x6b, 0xf0, 0x2e, 0x89, 0xd4, 0x53,
    0x91, 0x46, 0xfc, 0x28, 0x7d, 0xe5, 0x0a, 0xb3,
    0xc7, 0x64, 0x1f, 0x8e, 0x39, 0xa2, 0xd0, 0x5b,
];

/// XOR mask B — embedded as a compile-time constant in the code section.
const MASK_B: [u8; 32] = [
    0xd5, 0x4e, 0x23, 0xa7, 0x1b, 0x96, 0xf8, 0x42,
    0x0c, 0xe1, 0x5a, 0x3d, 0xb7, 0x60, 0x89, 0xc4,
    0x2f, 0x73, 0x18, 0xe6, 0x4a, 0x9d, 0x51, 0x0e,
    0xb2, 0xd8, 0x65, 0xf3, 0x47, 0x1c, 0xa9, 0x84,
];

/// XOR mask C — embedded as a compile-time constant in the code section.
const MASK_C: [u8; 32] = [
    0x38, 0xc2, 0x67, 0x15, 0x9e, 0xab, 0xd3, 0x4f,
    0x71, 0x86, 0x2c, 0xe9, 0x54, 0x0b, 0xf7, 0xa1,
    0x63, 0xbd, 0x40, 0x95, 0xd2, 0x1e, 0x78, 0xc6,
    0x09, 0x4a, 0xf1, 0x27, 0x8c, 0xe3, 0x5d, 0xb0,
];

/// Derive the real AES-256 key from XOR-encoded key material.
/// `key_material` must be exactly 32 bytes.
pub fn derive_key(key_material: &[u8]) -> Result<[u8; 32], &'static str> {
    if key_material.len() != 32 {
        return Err("key_material must be 32 bytes");
    }

    let mut key = [0u8; 32];
    for i in 0..32 {
        key[i] = key_material[i] ^ MASK_A[i] ^ MASK_B[i] ^ MASK_C[i];
    }
    Ok(key)
}

/// Encode a real AES-256 key into XOR-obfuscated key material for storage.
/// Used by the build script to prepare key_material for the custom section.
pub fn encode_key(real_key: &[u8; 32]) -> [u8; 32] {
    let mut encoded = [0u8; 32];
    for i in 0..32 {
        encoded[i] = real_key[i] ^ MASK_A[i] ^ MASK_B[i] ^ MASK_C[i];
    }
    encoded
}

/// Return the 3 XOR masks as byte arrays (for the build script to use).
pub fn masks() -> ([u8; 32], [u8; 32], [u8; 32]) {
    (MASK_A, MASK_B, MASK_C)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_then_derive_roundtrips() {
        let real_key: [u8; 32] = [
            0xde, 0xad, 0xbe, 0xef, 0xca, 0xfe, 0xba, 0xbe,
            0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
            0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11, 0x22,
        ];

        let encoded = encode_key(&real_key);
        // Encoded must differ from original
        assert_ne!(encoded, real_key);

        let recovered = derive_key(&encoded).expect("derive should succeed");
        assert_eq!(recovered, real_key);
    }

    #[test]
    fn derive_rejects_wrong_length() {
        assert!(derive_key(&[0u8; 16]).is_err());
        assert!(derive_key(&[0u8; 0]).is_err());
        assert!(derive_key(&[0u8; 33]).is_err());
    }

    #[test]
    fn encoded_key_is_not_plaintext() {
        let key = [0x42u8; 32];
        let encoded = encode_key(&key);
        // Every byte should differ (statistically certain with random-looking masks)
        let same_count = key.iter().zip(encoded.iter()).filter(|(a, b)| a == b).count();
        assert!(same_count < 8, "too many bytes unchanged after encoding");
    }

    #[test]
    fn different_keys_produce_different_encodings() {
        let key_a = [0x11u8; 32];
        let key_b = [0x22u8; 32];
        let enc_a = encode_key(&key_a);
        let enc_b = encode_key(&key_b);
        assert_ne!(enc_a, enc_b);
    }

    #[test]
    fn xor_is_symmetric() {
        // encode and derive use the same operation (XOR is self-inverse)
        let key = [0xFFu8; 32];
        let encoded = encode_key(&key);
        let derived = derive_key(&encoded).unwrap();
        assert_eq!(derived, key);
    }
}
