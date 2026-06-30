-- =========================================================
-- FILE NAME: 01_node_latest_state.sql
-- MUC DICH:
--   Refactor view node_latest_state theo huong modular.
--   View nay la node-focused latest-known state, doc tu
--   v_latest_state_by_scope va tra cuu semantic policy qua
--   dict_metric_profile thay vi hardcode multiIf.
-- TANG DU LIEU PHUC VU:
--   04_node_serving / latest-known node state
-- PHU THUOC:
--   - telemetry_db.v_latest_state_by_scope
--   - telemetry_db.dict_metric_profile
--   - 03_reference_policy/01_metric_profile.sql
-- DAU RA CHINH:
--   - telemetry_db.node_latest_state
-- GHI CHU:
--   - Giu nguyen schema output chinh cua view goc de de thay the
--     sau nay khi can chuyen dan tu clickhouse.sql sang module.
--   - Khong sua file clickhouse.sql; file do van la source-of-truth
--     doi chieu logic trong giai doan refactor.
-- =========================================================

USE telemetry_db;

-- Xoa view cu neu ton tai de tao lai theo version modular.
DROP VIEW IF EXISTS telemetry_db.node_latest_state;

-- View nay chi doc latest-known state cua scope node.
-- Policy nhu semantic_class va is_operational_metric duoc tra cuu
-- tu dict_metric_profile bang (scope_type, metric_key).
CREATE VIEW telemetry_db.node_latest_state AS
SELECT
    scope_id AS node_id,
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
WHERE scope_type = 'node'
  AND dictGetUInt8OrDefault(
        'dict_metric_profile',
        'is_enabled',
        tuple(scope_type, metric_key),
        0
      ) = 1;

-- =========================================================
-- TEST GOI Y
-- Muc dich: kiem tra view node_latest_state da doc dung policy
-- tu dictionary va khong con hardcode metric list trong SQL.
-- =========================================================

-- Lay current/latest operational metrics cua mot node.
-- SELECT
--     node_id,
--     metric_key,
--     tags_json,
--     latest_value_numeric,
--     latest_value_text,
--     latest_ts,
--     semantic_class
-- FROM telemetry_db.node_latest_state
-- WHERE node_id = 'node-msi-838958db'
--   AND is_operational_metric = 1
-- ORDER BY metric_key, tags_json;

-- Lay disk metrics cua toan bo node.
-- SELECT
--     node_id,
--     metric_key,
--     tags_json,
--     latest_value_numeric,
--     latest_ts
-- FROM telemetry_db.node_latest_state
-- WHERE metric_key LIKE 'node.disk%'
-- ORDER BY node_id, metric_key, tags_json;

-- Lay symptom metrics.
-- SELECT
--     node_id,
--     metric_key,
--     tags_json,
--     latest_value_numeric,
--     latest_ts
-- FROM telemetry_db.node_latest_state
-- WHERE semantic_class = 'symptom'
-- ORDER BY node_id, metric_key;
