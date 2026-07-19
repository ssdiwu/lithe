use serde::Deserialize;
use std::sync::Mutex;
use tauri::{AppHandle, State};

#[cfg(target_os = "macos")]
use tauri::{
    menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu, HELP_SUBMENU_ID, WINDOW_SUBMENU_ID},
    Runtime,
};

#[derive(Default)]
pub struct NativeMenuState(Mutex<Option<String>>);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub(crate) struct NativeMenuLabels {
    file: String,
    edit: String,
    view: String,
    window: String,
    help: String,
    about: String,
    services: String,
    hide: String,
    hide_others: String,
    quit: String,
    close_window: String,
    undo: String,
    redo: String,
    cut: String,
    copy: String,
    paste: String,
    select_all: String,
    enter_full_screen: String,
    minimize: String,
    zoom: String,
}

#[tauri::command]
pub fn set_native_menu(
    app: AppHandle,
    state: State<'_, NativeMenuState>,
    locale: String,
    labels: NativeMenuLabels,
) -> Result<(), String> {
    let mut active_locale = state
        .0
        .lock()
        .map_err(|_| "native menu locale lock poisoned".to_string())?;
    if active_locale.as_deref() == Some(locale.as_str()) {
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let menu = build_menu(&app, &labels).map_err(|error| error.to_string())?;
        app.set_menu(menu).map_err(|error| error.to_string())?;
        log::info!("native menu language changed to {locale}");
    }

    #[cfg(not(target_os = "macos"))]
    let _ = (app, labels);

    *active_locale = Some(locale);
    Ok(())
}

#[cfg(target_os = "macos")]
fn build_menu<R: Runtime>(app: &AppHandle<R>, labels: &NativeMenuLabels) -> tauri::Result<Menu<R>> {
    let package = app.package_info();
    let config = app.config();
    let about_metadata = AboutMetadata {
        name: Some(package.name.clone()),
        version: Some(package.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config
            .bundle
            .publisher
            .clone()
            .map(|publisher| vec![publisher]),
        ..Default::default()
    };

    let window_menu = Submenu::with_id_and_items(
        app,
        WINDOW_SUBMENU_ID,
        &labels.window,
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some(&labels.minimize))?,
            &PredefinedMenuItem::maximize(app, Some(&labels.zoom))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, Some(&labels.close_window))?,
        ],
    )?;

    let help_menu = Submenu::with_id_and_items(app, HELP_SUBMENU_ID, &labels.help, true, &[])?;

    Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                package.name.clone(),
                true,
                &[
                    &PredefinedMenuItem::about(app, Some(&labels.about), Some(about_metadata))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, Some(&labels.services))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, Some(&labels.hide))?,
                    &PredefinedMenuItem::hide_others(app, Some(&labels.hide_others))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some(&labels.quit))?,
                ],
            )?,
            &Submenu::with_items(
                app,
                &labels.file,
                true,
                &[&PredefinedMenuItem::close_window(
                    app,
                    Some(&labels.close_window),
                )?],
            )?,
            &Submenu::with_items(
                app,
                &labels.edit,
                true,
                &[
                    &PredefinedMenuItem::undo(app, Some(&labels.undo))?,
                    &PredefinedMenuItem::redo(app, Some(&labels.redo))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some(&labels.cut))?,
                    &PredefinedMenuItem::copy(app, Some(&labels.copy))?,
                    &PredefinedMenuItem::paste(app, Some(&labels.paste))?,
                    &PredefinedMenuItem::select_all(app, Some(&labels.select_all))?,
                ],
            )?,
            &Submenu::with_items(
                app,
                &labels.view,
                true,
                &[&PredefinedMenuItem::fullscreen(
                    app,
                    Some(&labels.enter_full_screen),
                )?],
            )?,
            &window_menu,
            &help_menu,
        ],
    )
}
