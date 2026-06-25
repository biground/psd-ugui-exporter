use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::project_io::{read_json_file, write_json_file};
use crate::python_worker::open_psd_with_worker;

#[tauri::command]
pub fn open_psd(source_path: String, cache_dir: Option<String>) -> Result<Value, String> {
    let source_path = PathBuf::from(source_path);
    let cache_dir = resolve_cache_dir(&source_path, cache_dir.as_deref());

    open_psd_with_worker(source_path, cache_dir)
}

#[tauri::command]
pub fn save_project(project_path: String, project: Value) -> Result<(), String> {
    write_json_file(&PathBuf::from(project_path), &project)
}

#[tauri::command]
pub fn read_project(project_path: String) -> Result<Value, String> {
    read_json_file(&PathBuf::from(project_path))
}

#[tauri::command]
pub fn export_layout(layout_path: String, layout: Value) -> Result<(), String> {
    write_json_file(&PathBuf::from(layout_path), &layout)
}

fn resolve_cache_dir(source_path: &Path, cache_dir: Option<&str>) -> PathBuf {
    match cache_dir.map(str::trim).filter(|value| !value.is_empty()) {
        Some(cache_dir) => PathBuf::from(cache_dir),
        None => default_cache_dir(source_path),
    }
}

fn default_cache_dir(source_path: &Path) -> PathBuf {
    let mut hasher = DefaultHasher::new();
    source_path.hash(&mut hasher);

    let stem = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(sanitize_path_segment)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "document".to_string());

    std::env::temp_dir()
        .join("psdui-editor-cache")
        .join(format!("{stem}-{:016x}", hasher.finish()))
}

fn sanitize_path_segment(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '_'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{default_cache_dir, resolve_cache_dir};
    use std::path::{Path, PathBuf};

    #[test]
    fn resolve_cache_dir_uses_explicit_non_empty_path() {
        let cache_dir = resolve_cache_dir(Path::new("/source/menu.psd"), Some("/tmp/custom-cache"));

        assert_eq!(cache_dir, PathBuf::from("/tmp/custom-cache"));
    }

    #[test]
    fn default_cache_dir_lives_under_system_temp_and_sanitizes_stem() {
        let cache_dir = default_cache_dir(Path::new("/source/main menu.psb"));

        assert!(cache_dir.starts_with(std::env::temp_dir().join("psdui-editor-cache")));
        assert!(cache_dir
            .file_name()
            .and_then(|value| value.to_str())
            .expect("cache dir name")
            .starts_with("main_menu-"));
    }
}
