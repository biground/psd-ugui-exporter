use std::fs;
use std::path::Path;

use serde::Serialize;
use serde_json::Value;

pub fn write_json_file(path: &Path, value: &impl Serialize) -> Result<(), String> {
    if let Some(parent) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to create parent directory {}: {error}",
                parent.display()
            )
        })?;
    }

    let mut content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("Failed to serialize JSON for {}: {error}", path.display()))?;
    content.push('\n');

    fs::write(path, content)
        .map_err(|error| format!("Failed to write JSON file {}: {error}", path.display()))
}

pub fn read_json_file(path: &Path) -> Result<Value, String> {
    let content = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read JSON file {}: {error}", path.display()))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse JSON file {}: {error}", path.display()))
}
