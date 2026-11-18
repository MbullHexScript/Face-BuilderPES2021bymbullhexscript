pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Failed to start PES 2021 Face Studio");
}
