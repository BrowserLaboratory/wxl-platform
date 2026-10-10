/// Flag verification using PBKDF2-HMAC-SHA256.
///
/// The verifier hash is stored in the WASM custom section.
/// Submitted flags are hashed with the challenge slug as salt
/// and compared using constant-time equality.
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;

const ITERATIONS: u32 = 100_000;
const HASH_LEN: usize = 32;

/// Compute PBKDF2-HMAC-SHA256 hash of the flag with the slug as salt.
pub fn hash_flag(flag: &[u8], slug: &str) -> Vec<u8> {
    let mut hash = vec![0u8; HASH_LEN];
    pbkdf2_hmac::<Sha256>(flag, slug.as_bytes(), ITERATIONS, &mut hash);
    hash
}

/// Verify a submitted flag against a stored verifier hash.
/// Uses constant-time comparison to prevent timing attacks.
pub fn verify_flag(submitted: &[u8], slug: &str, verifier: &[u8]) -> bool {
    let computed = hash_flag(submitted, slug);
    constant_time_eq(&computed, verifier)
}

/// Constant-time byte comparison.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn correct_flag_verifies() {
        let flag = b"FLAG{test_secret}";
        let slug = "sqli-demo";
        let verifier = hash_flag(flag, slug);
        assert!(verify_flag(flag, slug, &verifier));
    }

    #[test]
    fn wrong_flag_fails() {
        let flag = b"FLAG{test_secret}";
        let slug = "sqli-demo";
        let verifier = hash_flag(flag, slug);
        assert!(!verify_flag(b"FLAG{wrong}", slug, &verifier));
    }

    #[test]
    fn different_slug_fails() {
        let flag = b"FLAG{test_secret}";
        let verifier = hash_flag(flag, "sqli-demo");
        assert!(!verify_flag(flag, "other-challenge", &verifier));
    }

    #[test]
    fn hash_is_deterministic() {
        let h1 = hash_flag(b"FLAG{x}", "test");
        let h2 = hash_flag(b"FLAG{x}", "test");
        assert_eq!(h1, h2);
    }

    #[test]
    fn hash_is_32_bytes() {
        let h = hash_flag(b"anything", "slug");
        assert_eq!(h.len(), 32);
    }

    #[test]
    fn constant_time_eq_works() {
        assert!(constant_time_eq(b"hello", b"hello"));
        assert!(!constant_time_eq(b"hello", b"world"));
        assert!(!constant_time_eq(b"hello", b"hell"));
    }
}
