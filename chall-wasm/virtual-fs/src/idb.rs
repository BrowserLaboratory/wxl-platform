/// Virtual in-memory FS store used during tests and WASM execution.
/// In production WASM, this is backed by IndexedDB via JS interop.
/// For unit tests (non-WASM target), we use a HashMap.
use std::collections::HashMap;

pub struct FsStore {
    entries: HashMap<String, Vec<u8>>,
}

impl FsStore {
    pub fn new() -> Self {
        Self { entries: HashMap::new() }
    }

    pub fn write(&mut self, path: &str, data: Vec<u8>) {
        self.entries.insert(path.to_string(), data);
    }

    pub fn read(&self, path: &str) -> Option<&Vec<u8>> {
        self.entries.get(path)
    }

    pub fn delete_all(&mut self) {
        self.entries.clear();
    }

    pub fn contains(&self, path: &str) -> bool {
        self.entries.contains_key(path)
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn keys(&self) -> Vec<String> {
        self.entries.keys().cloned().collect()
    }
}

impl Default for FsStore {
    fn default() -> Self {
        Self::new()
    }
}
