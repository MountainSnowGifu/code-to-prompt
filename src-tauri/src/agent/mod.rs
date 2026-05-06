pub mod executor;
pub use executor::{execute_json, ActionResult};

pub fn init_workspace(root: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(root.join("ai_workspace"))?;
    std::fs::create_dir_all(root.join("ai_log"))?;
    std::fs::create_dir_all(root.join("cmd_log"))?;
    std::fs::create_dir_all(root.join("ai_readonly"))?;
    Ok(())
}
