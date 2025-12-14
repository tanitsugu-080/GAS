// ===== 設定（スクリプトプロパティ版） =====
const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const SHARED_TOKEN = SCRIPT_PROPS.getProperty('SHARED_TOKEN') || '';
const DEFAULT_PARENT_FOLDER_ID = SCRIPT_PROPS.getProperty('DEFAULT_PARENT_FOLDER_ID') || '';
