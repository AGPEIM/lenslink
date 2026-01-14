use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::BufReader;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExifData {
    pub shutter_speed: Option<String>,
    pub aperture: Option<String>,
    pub iso: Option<String>,
    pub focal_length: Option<String>,
    pub date_time: Option<String>,
    pub model: Option<String>,
    pub lens: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoFileInfo {
    pub name: String,
    pub extension: String,
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoGroupInfo {
    pub id: String,
    pub jpg: Option<PhotoFileInfo>,
    pub raw: Option<PhotoFileInfo>,
    pub status: String,
    pub exif: Option<ExifData>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn read_exif(file_path: String) -> Result<ExifData, String> {
    let path = Path::new(&file_path);
    
    // Open the file
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut bufreader = BufReader::new(file);
    
    // Read EXIF data
    let exifreader = exif::Reader::new();
    let exif = exifreader
        .read_from_container(&mut bufreader)
        .map_err(|e| format!("Failed to read EXIF: {}", e))?;
    
    // Extract commonly used EXIF fields
    let mut exif_data = ExifData {
        shutter_speed: None,
        aperture: None,
        iso: None,
        focal_length: None,
        date_time: None,
        model: None,
        lens: None,
    };
    
    // Extract exposure time (shutter speed)
    if let Some(field) = exif.get_field(exif::Tag::ExposureTime, exif::In::PRIMARY) {
        match &field.value {
            exif::Value::Rational(ref vals) => {
                if let Some(val) = vals.first() {
                    if val.denom != 0 {
                        let speed = val.num as f64 / val.denom as f64;
                        if speed >= 1.0 {
                            exif_data.shutter_speed = Some(format!("{:.1}s", speed));
                        } else {
                            // For speeds less than 1 second, display as fraction
                            let reciprocal = (val.denom as f64 / val.num as f64).round() as u32;
                            exif_data.shutter_speed = Some(format!("1/{}", reciprocal));
                        }
                    }
                }
            },
            _ => {
                // Fallback to display value if not a rational
                let display = field.display_value().with_unit(&exif).to_string();
                exif_data.shutter_speed = Some(display.trim_matches('"').to_string());
            }
        }
    }
    
    // Extract aperture (F-number)
    if let Some(field) = exif.get_field(exif::Tag::FNumber, exif::In::PRIMARY) {
        if let exif::Value::Rational(ref vals) = field.value {
            if let Some(val) = vals.first() {
                if val.denom != 0 {
                    let aperture = val.num as f64 / val.denom as f64;
                    exif_data.aperture = Some(format!("f/{:.1}", aperture));
                }
            }
        }
    }
    
    // Extract ISO
    if let Some(field) = exif.get_field(exif::Tag::PhotographicSensitivity, exif::In::PRIMARY) {
        let iso_str = field.display_value().with_unit(&exif).to_string();
        exif_data.iso = Some(iso_str.trim_matches('"').to_string());
    }
    
    // Extract focal length
    if let Some(field) = exif.get_field(exif::Tag::FocalLength, exif::In::PRIMARY) {
        if let exif::Value::Rational(ref vals) = field.value {
            if let Some(val) = vals.first() {
                if val.denom != 0 {
                    let focal = val.num as f64 / val.denom as f64;
                    exif_data.focal_length = Some(format!("{:.0}mm", focal));
                }
            }
        }
    }
    
    // Extract date time
    if let Some(field) = exif.get_field(exif::Tag::DateTime, exif::In::PRIMARY) {
        let datetime_str = field.display_value().with_unit(&exif).to_string();
        exif_data.date_time = Some(datetime_str.trim_matches('"').to_string());
    }
    
    // Extract camera model
    if let Some(field) = exif.get_field(exif::Tag::Model, exif::In::PRIMARY) {
        let model_str = field.display_value().with_unit(&exif).to_string();
        exif_data.model = Some(model_str.trim_matches('"').to_string());
    }
    
    // Extract lens model
    if let Some(field) = exif.get_field(exif::Tag::LensModel, exif::In::PRIMARY) {
        match &field.value {
            exif::Value::Ascii(ref vec) => {
                // Handle ASCII value - join all non-empty strings
                let lens_parts: Vec<String> = vec.iter()
                    .filter_map(|bytes| {
                        let s = std::str::from_utf8(bytes).ok()?
                            .trim_matches('\0')
                            .trim()
                            .trim_matches('"');
                        if !s.is_empty() {
                            Some(s.to_string())
                        } else {
                            None
                        }
                    })
                    .collect();
                
                if !lens_parts.is_empty() {
                    exif_data.lens = Some(lens_parts[0].clone());
                }
            },
            _ => {
                // Fallback to display value
                let lens_str = field.display_value().with_unit(&exif).to_string();
                let cleaned = lens_str.trim_matches('"').trim().to_string();
                // Remove any trailing empty quoted strings like ","",""
                let final_lens = cleaned.split(',').next()
                    .unwrap_or(&cleaned)
                    .trim()
                    .trim_matches('"')
                    .to_string();
                    
                if !final_lens.is_empty() {
                    exif_data.lens = Some(final_lens);
                }
            }
        }
    }
    
    Ok(exif_data)
}

#[tauri::command]
fn scan_folder(folder_path: String) -> Result<Vec<PhotoGroupInfo>, String> {
    let path = Path::new(&folder_path);
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let raw_extensions = vec!["ARW", "CR2", "NEF", "DNG", "ORF", "RAF", "SRW"];
    let mut groups: std::collections::HashMap<String, PhotoGroupInfo> = std::collections::HashMap::new();
    
    // Read all files in directory
    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_path = entry.path();
        
        if !file_path.is_file() {
            continue;
        }
        
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid file name")?;
        
        let extension = file_path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_uppercase())
            .unwrap_or_default();
        
        // Only process image files
        if extension != "JPG" && extension != "JPEG" && !raw_extensions.contains(&extension.as_str()) {
            continue;
        }
        
        let base_name = file_path.file_stem()
            .and_then(|n| n.to_str())
            .ok_or("Invalid base name")?
            .to_string();
        
        let file_size = entry.metadata()
            .map(|m| m.len())
            .unwrap_or(0);
        
        let photo_file = PhotoFileInfo {
            name: file_name.to_string(),
            extension: extension.clone(),
            path: file_path.to_str().unwrap_or("").to_string(),
            size: file_size,
        };
        
        // Get or create group
        let group = groups.entry(base_name.clone()).or_insert_with(|| PhotoGroupInfo {
            id: base_name.clone(),
            jpg: None,
            raw: None,
            status: String::from("UNMARKED"),
            exif: None,
        });
        
        // Assign file to appropriate slot
        if extension == "JPG" || extension == "JPEG" {
            group.jpg = Some(photo_file);
        } else if raw_extensions.contains(&extension.as_str()) {
            group.raw = Some(photo_file);
        }
    }
    
    // Determine status and read EXIF for each group
    let mut result: Vec<PhotoGroupInfo> = Vec::new();
    
    for (_, mut group) in groups {
        // Determine status
        group.status = match (&group.jpg, &group.raw) {
            (Some(_), Some(_)) => "COMPLETE".to_string(),
            (Some(_), None) => "JPG_ONLY".to_string(),
            (None, Some(_)) => "RAW_ONLY".to_string(),
            _ => continue, // Skip empty groups
        };
        
        // Try to read EXIF from JPG first, then RAW
        if let Some(jpg) = &group.jpg {
            group.exif = read_exif(jpg.path.clone()).ok();
        } else if let Some(raw) = &group.raw {
            group.exif = read_exif(raw.path.clone()).ok();
        }
        
        result.push(group);
    }
    
    // Sort by ID (filename)
    result.sort_by(|a, b| a.id.cmp(&b.id));
    
    Ok(result)
}

#[tauri::command]
fn scan_files(file_paths: Vec<String>) -> Result<Vec<PhotoGroupInfo>, String> {
    let raw_extensions = vec!["ARW", "CR2", "NEF", "DNG", "ORF", "RAF", "SRW"];
    let mut groups: std::collections::HashMap<String, PhotoGroupInfo> = std::collections::HashMap::new();
    
    for file_path_str in file_paths {
        let file_path = Path::new(&file_path_str);
        
        if !file_path.is_file() {
            continue;
        }
        
        let file_name = file_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");
        
        let extension = file_path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_uppercase())
            .unwrap_or_default();
        
        // Only process image files
        if extension != "JPG" && extension != "JPEG" && !raw_extensions.contains(&extension.as_str()) {
            continue;
        }
        
        let base_name = file_path.file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        
        let file_size = fs::metadata(file_path)
            .map(|m| m.len())
            .unwrap_or(0);
        
        let photo_file = PhotoFileInfo {
            name: file_name.to_string(),
            extension: extension.clone(),
            path: file_path_str.clone(),
            size: file_size,
        };
        
        // Get or create group
        let group = groups.entry(base_name.clone()).or_insert_with(|| PhotoGroupInfo {
            id: base_name.clone(),
            jpg: None,
            raw: None,
            status: String::from("UNMARKED"),
            exif: None,
        });
        
        // Assign file to appropriate slot
        if extension == "JPG" || extension == "JPEG" {
            group.jpg = Some(photo_file);
        } else if raw_extensions.contains(&extension.as_str()) {
            group.raw = Some(photo_file);
        }
    }
    
    // Determine status and read EXIF for each group
    let mut result: Vec<PhotoGroupInfo> = Vec::new();
    
    for (_, mut group) in groups {
        // Determine status
        group.status = match (&group.jpg, &group.raw) {
            (Some(_), Some(_)) => "COMPLETE".to_string(),
            (Some(_), None) => "JPG_ONLY".to_string(),
            (None, Some(_)) => "RAW_ONLY".to_string(),
            _ => continue, // Skip empty groups
        };
        
        // Try to read EXIF from JPG first, then RAW
        if let Some(jpg) = &group.jpg {
            group.exif = read_exif(jpg.path.clone()).ok();
        } else if let Some(raw) = &group.raw {
            group.exif = read_exif(raw.path.clone()).ok();
        }
        
        result.push(group);
    }
    
    // Sort by ID (filename)
    result.sort_by(|a, b| a.id.cmp(&b.id));
    
    Ok(result)
}

#[tauri::command]
fn move_to_trash(groups: Vec<PhotoGroupInfo>) -> Result<Vec<String>, String> {
    let mut moved_files = Vec::new();
    let mut failed_files = Vec::new();
    
    for group in groups {
        // Move JPG file to trash if it exists
        if let Some(jpg) = &group.jpg {
            let path = Path::new(&jpg.path);
            if path.exists() {
                match trash::delete(path) {
                    Ok(_) => {
                        moved_files.push(jpg.path.clone());
                    }
                    Err(e) => {
                        failed_files.push(format!("Failed to move {} to trash: {}", jpg.path, e));
                    }
                }
            }
        }
        
        // Move RAW file to trash if it exists
        if let Some(raw) = &group.raw {
            let path = Path::new(&raw.path);
            if path.exists() {
                match trash::delete(path) {
                    Ok(_) => {
                        moved_files.push(raw.path.clone());
                    }
                    Err(e) => {
                        failed_files.push(format!("Failed to move {} to trash: {}", raw.path, e));
                    }
                }
            }
        }
    }
    
    if !failed_files.is_empty() {
        Err(format!(
            "Some files failed to move to trash:\n{}",
            failed_files.join("\n")
        ))
    } else {
        Ok(moved_files)
    }
}

#[tauri::command]
fn export_files(
    groups: Vec<PhotoGroupInfo>,
    export_mode: String,
    operation: String,
    destination_folder: String,
) -> Result<Vec<String>, String> {
    let dest_path = Path::new(&destination_folder);
    
    if !dest_path.exists() {
        return Err("Destination folder does not exist".to_string());
    }
    
    if !dest_path.is_dir() {
        return Err("Destination path is not a directory".to_string());
    }
    
    let mut processed_files = Vec::new();
    let mut failed_files = Vec::new();
    
    for group in groups {
        // Determine which files to export based on export_mode
        let files_to_export: Vec<&PhotoFileInfo> = match export_mode.as_str() {
            "JPG" => {
                if let Some(ref jpg) = group.jpg {
                    vec![jpg]
                } else {
                    continue;
                }
            }
            "RAW" => {
                if let Some(ref raw) = group.raw {
                    vec![raw]
                } else {
                    continue;
                }
            }
            "BOTH" => {
                let mut files = Vec::new();
                if let Some(ref jpg) = group.jpg {
                    files.push(jpg);
                }
                if let Some(ref raw) = group.raw {
                    files.push(raw);
                }
                if files.is_empty() {
                    continue;
                }
                files
            }
            _ => {
                failed_files.push(format!("Unknown export mode: {}", export_mode));
                continue;
            }
        };
        
        // Process each file
        for file_info in files_to_export {
            let source_path = Path::new(&file_info.path);
            
            if !source_path.exists() {
                failed_files.push(format!("Source file not found: {}", file_info.path));
                continue;
            }
            
            let file_name = source_path.file_name()
                .and_then(|n| n.to_str())
                .ok_or_else(|| format!("Invalid file name: {}", file_info.path))?;
            
            let dest_file_path = dest_path.join(file_name);
            
            // Check if destination file already exists
            if dest_file_path.exists() {
                failed_files.push(format!(
                    "Destination file already exists: {}",
                    dest_file_path.display()
                ));
                continue;
            }
            
            // Perform the operation (copy or move)
            let result = match operation.as_str() {
                "COPY" => fs::copy(source_path, &dest_file_path)
                    .map(|_| ())
                    .map_err(|e| format!("Failed to copy {}: {}", file_name, e)),
                "MOVE" => fs::rename(source_path, &dest_file_path)
                    .map_err(|e| format!("Failed to move {}: {}", file_name, e)),
                _ => Err(format!("Unknown operation: {}", operation)),
            };
            
            match result {
                Ok(_) => {
                    processed_files.push(format!(
                        "{} {} to {}",
                        if operation == "COPY" { "Copied" } else { "Moved" },
                        file_name,
                        dest_file_path.display()
                    ));
                }
                Err(e) => {
                    failed_files.push(e);
                }
            }
        }
    }
    
    if !failed_files.is_empty() {
        Err(format!(
            "Export completed with errors:\n{}\n\nSuccessfully processed {} files",
            failed_files.join("\n"),
            processed_files.len()
        ))
    } else if processed_files.is_empty() {
        Err("No files were exported".to_string())
    } else {
        Ok(processed_files)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, read_exif, scan_folder, scan_files, move_to_trash, export_files])
        .setup(|app| {
            // Ensure window decorations are disabled at runtime
            #[cfg(desktop)]
            {
                use tauri::Manager;
                let window = app.get_webview_window("main").unwrap();
                window.set_decorations(false).unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
