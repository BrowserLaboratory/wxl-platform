/// Parser for the "chall-data" WASM custom section binary format.
///
/// Binary layout:
/// ```text
/// magic:            [u8; 4]       "CHWD"
/// version:          u8            1
/// slug_len:         u16 LE
/// slug:             [u8; slug_len]
/// key_material_len: u16 LE
/// key_material:     [u8; key_material_len]   (XOR-encoded key)
/// verifier_len:     u16 LE
/// verifier:         [u8; verifier_len]       (PBKDF2 hash hex)
/// entry_count:      u16 LE
/// entries:          [Entry; entry_count]
///   path_len:       u16 LE
///   path:           [u8; path_len]
///   data_len:       u32 LE
///   data:           [u8; data_len]           (AES-GCM encrypted)
/// metadata_len:     u16 LE
/// metadata:         [u8; metadata_len]       (JSON)
/// ```

pub const MAGIC: &[u8; 4] = b"CHWD";
pub const VERSION: u8 = 1;

#[derive(Debug, Clone)]
pub struct FsEntry {
    pub path: String,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct ChallengePayload {
    pub slug: String,
    pub key_material: Vec<u8>,
    pub verifier: Vec<u8>,
    pub entries: Vec<FsEntry>,
    pub metadata: Vec<u8>,
}

#[derive(Debug)]
pub enum PayloadError {
    TooShort,
    InvalidMagic,
    UnsupportedVersion(u8),
    UnexpectedEof(&'static str),
    InvalidUtf8(&'static str),
}

impl core::fmt::Display for PayloadError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            PayloadError::TooShort => write!(f, "payload too short"),
            PayloadError::InvalidMagic => write!(f, "invalid magic (expected CHWD)"),
            PayloadError::UnsupportedVersion(v) => write!(f, "unsupported version: {v}"),
            PayloadError::UnexpectedEof(field) => write!(f, "unexpected EOF reading {field}"),
            PayloadError::InvalidUtf8(field) => write!(f, "invalid UTF-8 in {field}"),
        }
    }
}

struct Cursor<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Cursor<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, pos: 0 }
    }

    fn remaining(&self) -> usize {
        self.data.len().saturating_sub(self.pos)
    }

    fn read_bytes(&mut self, n: usize, field: &'static str) -> Result<&'a [u8], PayloadError> {
        if self.remaining() < n {
            return Err(PayloadError::UnexpectedEof(field));
        }
        let slice = &self.data[self.pos..self.pos + n];
        self.pos += n;
        Ok(slice)
    }

    fn read_u8(&mut self, field: &'static str) -> Result<u8, PayloadError> {
        let b = self.read_bytes(1, field)?;
        Ok(b[0])
    }

    fn read_u16_le(&mut self, field: &'static str) -> Result<u16, PayloadError> {
        let b = self.read_bytes(2, field)?;
        Ok(u16::from_le_bytes([b[0], b[1]]))
    }

    fn read_u32_le(&mut self, field: &'static str) -> Result<u32, PayloadError> {
        let b = self.read_bytes(4, field)?;
        Ok(u32::from_le_bytes([b[0], b[1], b[2], b[3]]))
    }

    fn read_len_prefixed_u16(&mut self, field: &'static str) -> Result<Vec<u8>, PayloadError> {
        let len = self.read_u16_le(field)? as usize;
        let data = self.read_bytes(len, field)?;
        Ok(data.to_vec())
    }

    fn read_string_u16(&mut self, field: &'static str) -> Result<String, PayloadError> {
        let bytes = self.read_len_prefixed_u16(field)?;
        String::from_utf8(bytes).map_err(|_| PayloadError::InvalidUtf8(field))
    }
}

/// Parse a "chall-data" custom section payload.
pub fn parse_payload(data: &[u8]) -> Result<ChallengePayload, PayloadError> {
    if data.len() < 5 {
        return Err(PayloadError::TooShort);
    }

    let mut cur = Cursor::new(data);

    // Magic
    let magic = cur.read_bytes(4, "magic")?;
    if magic != MAGIC {
        return Err(PayloadError::InvalidMagic);
    }

    // Version
    let version = cur.read_u8("version")?;
    if version != VERSION {
        return Err(PayloadError::UnsupportedVersion(version));
    }

    // Slug
    let slug = cur.read_string_u16("slug")?;

    // Key material
    let key_material = cur.read_len_prefixed_u16("key_material")?;

    // Verifier
    let verifier = cur.read_len_prefixed_u16("verifier")?;

    // Entries
    let entry_count = cur.read_u16_le("entry_count")? as usize;
    let mut entries = Vec::with_capacity(entry_count);
    for _ in 0..entry_count {
        let path = cur.read_string_u16("entry_path")?;
        let data_len = cur.read_u32_le("entry_data_len")? as usize;
        let data = cur.read_bytes(data_len, "entry_data")?.to_vec();
        entries.push(FsEntry { path, data });
    }

    // Metadata
    let metadata = cur.read_len_prefixed_u16("metadata")?;

    Ok(ChallengePayload {
        slug,
        key_material,
        verifier,
        entries,
        metadata,
    })
}

/// Serialize a ChallengePayload into the binary format (used by build tools and tests).
pub fn serialize_payload(payload: &ChallengePayload) -> Vec<u8> {
    let mut buf = Vec::new();

    // Magic + version
    buf.extend_from_slice(MAGIC);
    buf.push(VERSION);

    // Slug
    let slug_bytes = payload.slug.as_bytes();
    buf.extend_from_slice(&(slug_bytes.len() as u16).to_le_bytes());
    buf.extend_from_slice(slug_bytes);

    // Key material
    buf.extend_from_slice(&(payload.key_material.len() as u16).to_le_bytes());
    buf.extend_from_slice(&payload.key_material);

    // Verifier
    buf.extend_from_slice(&(payload.verifier.len() as u16).to_le_bytes());
    buf.extend_from_slice(&payload.verifier);

    // Entries
    buf.extend_from_slice(&(payload.entries.len() as u16).to_le_bytes());
    for entry in &payload.entries {
        let path_bytes = entry.path.as_bytes();
        buf.extend_from_slice(&(path_bytes.len() as u16).to_le_bytes());
        buf.extend_from_slice(path_bytes);
        buf.extend_from_slice(&(entry.data.len() as u32).to_le_bytes());
        buf.extend_from_slice(&entry.data);
    }

    // Metadata
    buf.extend_from_slice(&(payload.metadata.len() as u16).to_le_bytes());
    buf.extend_from_slice(&payload.metadata);

    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_payload() -> ChallengePayload {
        ChallengePayload {
            slug: "sqli-demo".to_string(),
            key_material: vec![0xAA; 32],
            verifier: b"abcdef1234567890".to_vec(),
            entries: vec![
                FsEntry {
                    path: "/flag.txt".to_string(),
                    data: vec![0x01, 0x02, 0x03],
                },
                FsEntry {
                    path: "__app__".to_string(),
                    data: vec![0x04, 0x05],
                },
            ],
            metadata: b"{\"backend\":\"flask\"}".to_vec(),
        }
    }

    #[test]
    fn roundtrip_serialize_parse() {
        let original = sample_payload();
        let bytes = serialize_payload(&original);
        let parsed = parse_payload(&bytes).expect("parse should succeed");

        assert_eq!(parsed.slug, original.slug);
        assert_eq!(parsed.key_material, original.key_material);
        assert_eq!(parsed.verifier, original.verifier);
        assert_eq!(parsed.entries.len(), original.entries.len());
        assert_eq!(parsed.entries[0].path, "/flag.txt");
        assert_eq!(parsed.entries[0].data, vec![0x01, 0x02, 0x03]);
        assert_eq!(parsed.entries[1].path, "__app__");
        assert_eq!(parsed.metadata, original.metadata);
    }

    #[test]
    fn parse_validates_magic() {
        let mut bytes = serialize_payload(&sample_payload());
        bytes[0] = b'X'; // corrupt magic
        let result = parse_payload(&bytes);
        assert!(matches!(result, Err(PayloadError::InvalidMagic)));
    }

    #[test]
    fn parse_validates_version() {
        let mut bytes = serialize_payload(&sample_payload());
        bytes[4] = 99; // unsupported version
        let result = parse_payload(&bytes);
        assert!(matches!(result, Err(PayloadError::UnsupportedVersion(99))));
    }

    #[test]
    fn parse_rejects_too_short() {
        let result = parse_payload(b"CHW");
        assert!(matches!(result, Err(PayloadError::TooShort)));
    }

    #[test]
    fn parse_rejects_truncated_data() {
        let bytes = serialize_payload(&sample_payload());
        // Truncate to just past the magic+version
        let result = parse_payload(&bytes[..6]);
        assert!(result.is_err());
    }

    #[test]
    fn parse_empty_entries() {
        let payload = ChallengePayload {
            slug: "test".to_string(),
            key_material: vec![0x00; 32],
            verifier: vec![],
            entries: vec![],
            metadata: b"{}".to_vec(),
        };
        let bytes = serialize_payload(&payload);
        let parsed = parse_payload(&bytes).expect("parse should succeed");
        assert_eq!(parsed.entries.len(), 0);
        assert_eq!(parsed.slug, "test");
    }
}
