-- =========================================================
-- FILE NAME: 01_container_latest_state.sql
-- MUC DICH:
--   Dinh nghia view latest-known state cho scope container theo
--   huong policy-driven, doc semantic contract tu dict_metric_profile.
-- TANG DU LIEU PHUC VU:
--   07_container_service_serving / latest-known container state
-- PHU THUOC:
--   - telemetry_db.v_latest_state_by_scope
--   - telemetry_db.dict_metric_profile
--   - 03_reference_policy/01_metric_profile.sql
-- DAU RA CHINH:
--   - telemetry_db.container_latest_state
-- GHI CHU:
--   - View nay la lop latest-known cho container, chua ap severity.
--   - Muc dich la giu metric-series level de current-live va summary
--     co the dien giai theo operator semantics o lop tren.
-- =========================================================

USE telemetry_db;

DROP VIEW IF EXISTS telemetry_db.container_latest_state;

-- View nay chi doc latest-known state cua scope container.
CREATE VIEW telemetry_db.container_latest_state AS
SELECT
    scope_id AS container_id,
    metric_key,
    series_key,

    tags_json,

    unit,
    source,
    source_metric,

    latest_ts,
    latest_value_numeric,
    latest_value_text,
    sample_count,

    dictGetStringOrDefault(
        'dict_metric_profile',
        'semantic_class',
        tuple(scope_type, metric_key),
        'inventory'
    ) AS semantic_class,

    dictGetUInt8OrDefault(
        'dict_metric_profile',
        'is_operational_metric',
        tuple(scope_type, metric_key),
        0
    ) AS is_operational_metric

FROM telemetry_db.v_latest_state_by_scope
WHERE scope_type = 'container'
  AND dictGetUInt8OrDefault(
        'dict_metric_profile',
        'is_enabled',
        tuple(scope_type, metric_key),
        0
      ) = 1;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra latest-known container state da doc dung
-- metric policy va khong can hardcode danh sach metric trong SQL.
-- =========================================================

-- SELECT
--     container_id,
--     metric_key,
--     tags_json,
--     latest_value_numeric,
--     latest_value_text,
--     latest_ts,
--     semantic_class,
--     is_operational_metric
-- FROM telemetry_db.container_latest_state
-- ORDER BY container_id, metric_key, tags_json;
