use std::path::PathBuf;

use serde_json::Value;

use crate::project_io::write_json_file;
use crate::python_worker::open_psd_with_worker;

#[tauri::command]
pub fn open_psd(source_path: String, cache_dir: String) -> Result<Value, String> {
    open_psd_with_worker(PathBuf::from(source_path), PathBuf::from(cache_dir))
}

#[tauri::command]
pub fn save_project(project_path: String, project: Value) -> Result<(), String> {
    write_json_file(&PathBuf::from(project_path), &project)
}

#[tauri::command]
pub fn export_layout(layout_path: String, layout: Value) -> Result<(), String> {
    write_json_file(&PathBuf::from(layout_path), &layout)
}
