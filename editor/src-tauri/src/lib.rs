pub mod commands;
pub mod project_io;
pub mod python_worker;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_psd,
            commands::save_project,
            commands::export_layout,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run psdui editor");
}
