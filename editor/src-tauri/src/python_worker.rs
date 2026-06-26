use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::Value;
use tauri::{AppHandle, Manager};

const WORKER_OUTPUT_LIMIT: usize = 2000;

pub fn open_psd_with_worker(
    app: &AppHandle,
    source_path: PathBuf,
    cache_dir: PathBuf,
) -> Result<Value, String> {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let resource_dir = app.path().resource_dir().ok();
    let runtime = resolve_worker_runtime(
        manifest_dir,
        resource_dir.as_deref(),
        env::var("PYTHONPATH").ok().as_deref(),
        env::var("PSDUI_EDITOR_PYTHON").ok().as_deref(),
    );

    let mut command = Command::new(&runtime.python_command);
    command
        .arg(&runtime.worker_script)
        .arg("--source")
        .arg(&source_path)
        .arg("--out")
        .arg(&cache_dir)
        .arg("--assets-dir")
        .arg("layers")
        .env("PYTHONPATH", &runtime.python_path);

    if let Some(python_home) = &runtime.python_home {
        command.env("PYTHONHOME", python_home);
    }

    let output = command
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

    let mut payload: Value = serde_json::from_str(stdout.trim()).map_err(|error| {
        format!(
            "Failed to parse PSD worker JSON output: {error}. stdout: {}",
            stdout.trim()
        )
    })?;

    if let Some(object) = payload.as_object_mut() {
        object.insert(
            "assetsDir".to_string(),
            Value::String(cache_dir.to_string_lossy().into_owned()),
        );
    }

    Ok(payload)
}

struct WorkerRuntime {
    python_command: PathBuf,
    worker_script: PathBuf,
    python_path: String,
    python_home: Option<PathBuf>,
}

fn resolve_worker_runtime(
    manifest_dir: &Path,
    resource_dir: Option<&Path>,
    existing_python_path: Option<&str>,
    python_override: Option<&str>,
) -> WorkerRuntime {
    let worker_script = worker_script_path(manifest_dir, resource_dir);
    let python_runtime_dir = resolve_python_runtime_dir(resource_dir, python_override);
    let python_command = resolve_python_command(resource_dir, python_override);
    let python_path =
        resolve_python_path_env(existing_python_path, manifest_dir, resource_dir);

    WorkerRuntime {
        python_command,
        worker_script,
        python_path,
        python_home: python_runtime_dir,
    }
}

fn worker_script_path(manifest_dir: &Path, resource_dir: Option<&Path>) -> PathBuf {
    if let Some(worker_script) = resource_dir
        .map(|resource_dir| resource_dir.join("python/psd_worker.py"))
        .filter(|worker_script| worker_script.exists())
    {
        return worker_script;
    }

    manifest_dir.join("python/psd_worker.py")
}

fn resolve_python_command(resource_dir: Option<&Path>, python_override: Option<&str>) -> PathBuf {
    if let Some(python_override) = python_override
        .map(str::trim)
        .filter(|python_override| !python_override.is_empty())
    {
        return PathBuf::from(python_override);
    }

    if let Some(python_command) = resource_dir
        .map(|resource_dir| resource_dir.join("python-runtime/bin/python3"))
        .filter(|python_command| python_command.exists())
    {
        return python_command;
    }

    PathBuf::from("python3")
}

fn resolve_python_runtime_dir(
    resource_dir: Option<&Path>,
    python_override: Option<&str>,
) -> Option<PathBuf> {
    if python_override
        .map(str::trim)
        .is_some_and(|python_override| !python_override.is_empty())
    {
        return None;
    }

    resource_dir
        .map(|resource_dir| resource_dir.join("python-runtime"))
        .filter(|python_runtime| python_runtime.join("bin/python3").exists())
}

fn resolve_python_path_env(
    existing: Option<&str>,
    manifest_dir: &Path,
    resource_dir: Option<&Path>,
) -> String {
    let repo_python = manifest_dir
        .parent()
        .and_then(Path::parent)
        .unwrap_or(manifest_dir)
        .join(".python");

    let mut paths = Vec::new();
    if let Some(bundled_packages) = resource_dir
        .map(|resource_dir| resource_dir.join("python-packages"))
        .filter(|bundled_packages| bundled_packages.exists())
    {
        paths.push(bundled_packages);
    }

    paths.push(repo_python.clone());
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
    use super::{resolve_python_path_env, resolve_worker_runtime, worker_error_message};
    use std::env;
    use std::path::Path;

    #[test]
    fn python_path_env_prepends_repo_python_and_keeps_existing_paths() {
        let manifest_dir = Path::new("/repo/editor/src-tauri");
        let existing = env::join_paths([Path::new("/custom/one"), Path::new("/custom/two")])
            .expect("join existing paths");

        let python_path = resolve_python_path_env(existing.to_str(), manifest_dir, None);
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

    #[test]
    fn worker_runtime_prefers_bundled_resource_python_and_packages() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let resource_dir = temp_dir.path();
        let bundled_python = resource_dir.join("python-runtime/bin/python3");
        let bundled_packages = resource_dir.join("python-packages");
        let bundled_worker = resource_dir.join("python/psd_worker.py");

        std::fs::create_dir_all(bundled_python.parent().expect("python parent"))
            .expect("python dir");
        std::fs::create_dir_all(&bundled_packages).expect("packages dir");
        std::fs::create_dir_all(bundled_worker.parent().expect("worker parent"))
            .expect("worker dir");
        std::fs::write(&bundled_python, b"python").expect("python executable");
        std::fs::write(&bundled_worker, b"worker").expect("worker script");

        let manifest_dir = Path::new("/repo/editor/src-tauri");
        let runtime = resolve_worker_runtime(
            manifest_dir,
            Some(resource_dir),
            Some("/custom/pythonpath"),
            None,
        );

        assert_eq!(runtime.python_command, bundled_python);
        assert_eq!(runtime.worker_script, bundled_worker);
        assert_eq!(runtime.python_home, Some(resource_dir.join("python-runtime")));

        let paths = env::split_paths(&runtime.python_path).collect::<Vec<_>>();
        assert_eq!(paths[0], bundled_packages);
        assert_eq!(paths[1], Path::new("/repo/.python"));
        assert_eq!(paths[2], Path::new("/custom/pythonpath"));
    }
}
