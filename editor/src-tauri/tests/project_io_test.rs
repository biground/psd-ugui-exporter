use psdui_editor::project_io::{read_json_file, write_json_file};
use serde_json::json;

#[test]
fn writes_pretty_json_and_reads_it_back() {
    let temp_dir = tempfile::tempdir().expect("create temp dir");
    let project_path = temp_dir.path().join("nested").join("sample.psdui");
    let project = json!({
        "version": 1,
        "exportTree": [],
    });

    write_json_file(&project_path, &project).expect("write project json");
    let restored = read_json_file(&project_path).expect("read project json");

    assert_eq!(restored, project);
}
