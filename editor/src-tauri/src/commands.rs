use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Component, Path, PathBuf};

use image::{ImageBuffer, RgbaImage};
use serde::Deserialize;
use serde_json::Value;

use crate::project_io::{read_json_file, write_json_file};
use crate::python_worker::open_psd_with_worker;

#[tauri::command]
pub fn open_psd(
    app: tauri::AppHandle,
    source_path: String,
    cache_dir: Option<String>,
) -> Result<Value, String> {
    let source_path = PathBuf::from(source_path);
    let cache_dir = resolve_cache_dir(&source_path, cache_dir.as_deref());

    open_psd_with_worker(&app, source_path, cache_dir)
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
pub fn export_layout(
    layout_path: String,
    layout: Value,
    assets: Option<Vec<LayoutExportAsset>>,
) -> Result<(), String> {
    let layout_path = PathBuf::from(layout_path);
    copy_layout_assets(&layout_path, assets.unwrap_or_default())?;
    write_json_file(&layout_path, &layout)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LayoutExportAsset {
    pub source_path: String,
    pub output_path: String,
    pub scale9_crop: Option<Scale9Crop>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scale9Crop {
    pub border: Scale9Border,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scale9Border {
    pub top: u32,
    pub right: u32,
    pub bottom: u32,
    pub left: u32,
}

fn copy_layout_assets(layout_path: &Path, assets: Vec<LayoutExportAsset>) -> Result<(), String> {
    let layout_dir = layout_path.parent().unwrap_or_else(|| Path::new(""));

    for asset in assets {
        let output_path = resolve_asset_output_path(layout_dir, &asset.output_path)?;

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "Failed to create asset directory {}: {error}",
                    parent.display()
                )
            })?;
        }

        match &asset.scale9_crop {
            Some(scale9_crop) => {
                write_compact_scale9_png(&asset.source_path, &output_path, &scale9_crop.border)?
            }
            None => {
                fs::copy(&asset.source_path, &output_path).map_err(|error| {
                    format!(
                        "Failed to copy asset {} to {}: {error}",
                        asset.source_path,
                        output_path.display()
                    )
                })?;
            }
        }
    }

    Ok(())
}

fn write_compact_scale9_png(
    source_path: &str,
    output_path: &Path,
    border: &Scale9Border,
) -> Result<(), String> {
    let source = image::open(source_path)
        .map_err(|error| format!("Failed to read scale9 asset {source_path}: {error}"))?
        .into_rgba8();
    let (source_width, source_height) = source.dimensions();

    validate_scale9_border(source_path, source_width, source_height, border)?;

    let compact_width = border.left + 1 + border.right;
    let compact_height = border.top + 1 + border.bottom;
    let mut compact: RgbaImage = ImageBuffer::new(compact_width, compact_height);

    for y in 0..compact_height {
        for x in 0..compact_width {
            let source_x = map_compact_axis(x, border.left, border.right, source_width);
            let source_y = map_compact_axis(y, border.top, border.bottom, source_height);
            compact.put_pixel(x, y, *source.get_pixel(source_x, source_y));
        }
    }

    compact.save(output_path).map_err(|error| {
        format!(
            "Failed to write compact scale9 asset {}: {error}",
            output_path.display()
        )
    })
}

fn validate_scale9_border(
    source_path: &str,
    source_width: u32,
    source_height: u32,
    border: &Scale9Border,
) -> Result<(), String> {
    if border.left + border.right >= source_width {
        return Err(format!(
            "Invalid scale9 horizontal border for {}: left + right must be smaller than source width",
            source_path
        ));
    }

    if border.top + border.bottom >= source_height {
        return Err(format!(
            "Invalid scale9 vertical border for {}: top + bottom must be smaller than source height",
            source_path
        ));
    }

    Ok(())
}

fn map_compact_axis(position: u32, start_border: u32, end_border: u32, source_length: u32) -> u32 {
    if position < start_border {
        return position;
    }

    if position == start_border {
        let stretch_length = source_length - start_border - end_border;
        return start_border + stretch_length / 2;
    }

    source_length - end_border + (position - start_border - 1)
}

fn resolve_asset_output_path(layout_dir: &Path, output_path: &str) -> Result<PathBuf, String> {
    let output_path = Path::new(output_path);

    if output_path.is_absolute()
        || output_path
            .components()
            .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(format!(
            "Asset output path must be relative and stay inside the layout directory: {}",
            output_path.display()
        ));
    }

    Ok(layout_dir.join(output_path))
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
    use super::{default_cache_dir, export_layout, resolve_cache_dir, LayoutExportAsset};
    use image::{ImageBuffer, Rgba};
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

    #[test]
    fn export_layout_copies_image_assets_next_to_layout_json() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let source_path = temp_dir.path().join("cache").join("dialog-bg.png");
        let layout_path = temp_dir.path().join("out").join("ui.layout.json");
        std::fs::create_dir_all(source_path.parent().expect("source parent")).expect("source dir");
        std::fs::write(&source_path, b"png-bytes").expect("source asset");

        export_layout(
            layout_path.to_string_lossy().to_string(),
            serde_json::json!({ "version": 1, "nodes": [] }),
            Some(vec![LayoutExportAsset {
                source_path: source_path.to_string_lossy().to_string(),
                output_path: "images/dialog-bg.png".to_string(),
                scale9_crop: None,
            }]),
        )
        .expect("export layout");

        assert_eq!(
            std::fs::read(
                temp_dir
                    .path()
                    .join("out")
                    .join("images")
                    .join("dialog-bg.png")
            )
            .expect("exported asset"),
            b"png-bytes"
        );
        assert!(layout_path.exists());
    }

    #[test]
    fn export_layout_writes_compact_scale9_image_asset() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let source_path = temp_dir.path().join("cache").join("panel.png");
        let layout_path = temp_dir.path().join("out").join("ui.layout.json");
        std::fs::create_dir_all(source_path.parent().expect("source parent")).expect("source dir");

        let image = ImageBuffer::from_fn(7, 7, |x, y| Rgba([x as u8, y as u8, 0, 255]));
        image.save(&source_path).expect("source png");

        export_layout(
            layout_path.to_string_lossy().to_string(),
            serde_json::json!({ "version": 1, "nodes": [] }),
            Some(vec![LayoutExportAsset {
                source_path: source_path.to_string_lossy().to_string(),
                output_path: "images/panel.png".to_string(),
                scale9_crop: Some(super::Scale9Crop {
                    border: super::Scale9Border {
                        top: 2,
                        right: 2,
                        bottom: 2,
                        left: 2,
                    },
                }),
            }]),
        )
        .expect("export layout");

        let compact = image::open(temp_dir.path().join("out").join("images").join("panel.png"))
            .expect("compact png")
            .into_rgba8();

        assert_eq!(compact.dimensions(), (5, 5));

        for y in 0..5 {
            for x in 0..5 {
                let source_x = [0, 1, 3, 5, 6][x as usize];
                let source_y = [0, 1, 3, 5, 6][y as usize];
                assert_eq!(*compact.get_pixel(x, y), Rgba([source_x, source_y, 0, 255]));
            }
        }
    }
}
