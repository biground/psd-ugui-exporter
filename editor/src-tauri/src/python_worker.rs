use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::Value;

pub fn open_psd_with_worker(source_path: PathBuf, cache_dir: PathBuf) -> Result<Value, String> {
    let output = Command::new("python3")
        .arg(worker_script_path())
        .arg("--source")
        .arg(&source_path)
        .arg("--out")
        .arg(&cache_dir)
        .arg("--assets-dir")
        .arg("layers")
        .output()
        .map_err(|error| format!("Failed to start PSD worker: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if !output.status.success() {
        return Err(worker_error_message(output.status.code(), &stdout, &stderr));
    }

    serde_json::from_str(stdout.trim()).map_err(|error| {
        format!(
            "Failed to parse PSD worker JSON output: {error}. stdout: {}",
            stdout.trim()
        )
    })
}

fn worker_script_path() -> PathBuf {
    let repo_relative = Path::new("editor/src-tauri/python/psd_worker.py");
    if repo_relative.exists() {
        return repo_relative.to_path_buf();
    }

    Path::new(env!("CARGO_MANIFEST_DIR")).join("python/psd_worker.py")
}

fn worker_error_message(code: Option<i32>, stdout: &str, stderr: &str) -> String {
    let stderr = stderr.trim();
    let stdout = stdout.trim();
    let details = if !stderr.is_empty() {
        stderr
    } else if !stdout.is_empty() {
        stdout
    } else {
        "worker exited without output"
    };

    match code {
        Some(code) => format!("PSD worker failed with exit code {code}: {details}"),
        None => format!("PSD worker terminated by signal: {details}"),
    }
}
