use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::Value;

const WORKER_OUTPUT_LIMIT: usize = 2000;

pub fn open_psd_with_worker(source_path: PathBuf, cache_dir: PathBuf) -> Result<Value, String> {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = Command::new("python3")
        .arg(worker_script_path())
        .arg("--source")
        .arg(&source_path)
        .arg("--out")
        .arg(&cache_dir)
        .arg("--assets-dir")
        .arg("layers")
        .env(
            "PYTHONPATH",
            resolve_python_path_env(env::var("PYTHONPATH").ok().as_deref(), manifest_dir),
        )
        .output()
        .map_err(|error| format!("Failed to start PSD worker: {error}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    if !output.status.success() {
        return Err(worker_error_message(
            output.status.code(),
            &output.stdout,
            &output.stderr,
        ));
    }

    serde_json::from_str(stdout.trim()).map_err(|error| {
        format!(
            "Failed to parse PSD worker JSON output: {error}. stdout: {}",
            stdout.trim()
        )
    })
}

fn worker_script_path() -> PathBuf {
    // MVP commands run against the source-tree worker. `tauri.conf.json` declares the
    // worker as a bundle resource; packaged resource lookup can be wired through
    // AppHandle once commands accept app state.
    Path::new(env!("CARGO_MANIFEST_DIR")).join("python/psd_worker.py")
}

fn resolve_python_path_env(existing: Option<&str>, manifest_dir: &Path) -> String {
    let repo_python = manifest_dir
        .parent()
        .and_then(Path::parent)
        .unwrap_or(manifest_dir)
        .join(".python");

    let mut paths = vec![repo_python.clone()];
    if let Some(existing) = existing.filter(|value| !value.is_empty()) {
        paths.extend(env::split_paths(existing));
    }

    match env::join_paths(paths) {
        Ok(value) => value.to_string_lossy().into_owned(),
        Err(_) => repo_python.to_string_lossy().into_owned(),
    }
}

fn worker_error_message(code: Option<i32>, stdout: &[u8], stderr: &[u8]) -> String {
    let stderr = trim_and_truncate_output(stderr);
    let stdout = trim_and_truncate_output(stdout);

    let details = match (stderr.is_empty(), stdout.is_empty()) {
        (true, true) => "worker exited without output".to_string(),
        (false, true) => format!("stderr: {stderr}"),
        (true, false) => format!("stdout: {stdout}"),
        (false, false) => format!("stderr: {stderr}\nstdout: {stdout}"),
    };

    match code {
        Some(code) => format!("PSD worker failed with exit code {code}: {details}"),
        None => format!("PSD worker terminated by signal: {details}"),
    }
}

fn trim_and_truncate_output(output: &[u8]) -> String {
    let output = String::from_utf8_lossy(output).trim().to_string();
    if output.len() <= WORKER_OUTPUT_LIMIT {
        return output;
    }

    let mut end = WORKER_OUTPUT_LIMIT;
    while !output.is_char_boundary(end) {
        end -= 1;
    }

    format!("{}... [truncated]", &output[..end])
}

#[cfg(test)]
mod tests {
    use super::{resolve_python_path_env, worker_error_message};
    use std::env;
    use std::path::Path;

    #[test]
    fn python_path_env_prepends_repo_python_and_keeps_existing_paths() {
        let manifest_dir = Path::new("/repo/editor/src-tauri");
        let existing = env::join_paths([Path::new("/custom/one"), Path::new("/custom/two")])
            .expect("join existing paths");

        let python_path = resolve_python_path_env(existing.to_str(), manifest_dir);
        let paths = env::split_paths(&python_path).collect::<Vec<_>>();

        assert_eq!(paths[0], Path::new("/repo/.python"));
        assert_eq!(paths[1], Path::new("/custom/one"));
        assert_eq!(paths[2], Path::new("/custom/two"));
    }

    #[test]
    fn worker_error_message_keeps_stdout_and_stderr_with_truncation() {
        let stdout = format!("stdout start {}", "o".repeat(5000));
        let stderr = format!("stderr start {}", "e".repeat(5000));

        let message = worker_error_message(Some(2), stdout.as_bytes(), stderr.as_bytes());

        assert!(message.contains("exit code 2"));
        assert!(message.contains("stderr: stderr start"));
        assert!(message.contains("stdout: stdout start"));
        assert!(message.contains("truncated"));
        assert!(message.len() < 5000);
    }
}
