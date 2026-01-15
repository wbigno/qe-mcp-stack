-- ============================================================
-- Comprehensive Database Schema Extraction Script
-- Run this in Azure Data Studio after connecting to your database
-- Results can be saved as JSON for analysis
-- ============================================================

-- ============================================================
-- PART 1: TABLES AND COLUMNS
-- ============================================================
SELECT
    'COLUMNS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    c.name as column_name,
    c.column_id as ordinal_position,
    ty.name as data_type,
    c.max_length,
    c.precision,
    c.scale,
    c.is_nullable,
    c.is_identity,
    OBJECT_DEFINITION(c.default_object_id) as default_value,
    ep.value as column_description
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
LEFT JOIN sys.extended_properties ep
    ON ep.major_id = t.object_id
    AND ep.minor_id = c.column_id
    AND ep.name = 'MS_Description'
ORDER BY s.name, t.name, c.column_id;

-- ============================================================
-- PART 2: PRIMARY KEYS
-- ============================================================
SELECT
    'PRIMARY_KEYS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    i.name as constraint_name,
    c.name as column_name,
    ic.key_ordinal as key_order
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.is_primary_key = 1
ORDER BY s.name, t.name, ic.key_ordinal;

-- ============================================================
-- PART 3: FOREIGN KEYS
-- ============================================================
SELECT
    'FOREIGN_KEYS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    fk.name as constraint_name,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as column_name,
    OBJECT_SCHEMA_NAME(fkc.referenced_object_id) as referenced_schema,
    OBJECT_NAME(fkc.referenced_object_id) as referenced_table,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as referenced_column,
    fk.delete_referential_action_desc as on_delete,
    fk.update_referential_action_desc as on_update
FROM sys.foreign_keys fk
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
ORDER BY s.name, t.name, fk.name;

-- ============================================================
-- PART 4: INDEXES
-- ============================================================
SELECT
    'INDEXES' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    i.name as index_name,
    i.type_desc as index_type,
    i.is_unique,
    i.is_primary_key,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) as columns
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.name IS NOT NULL
GROUP BY s.name, t.name, i.name, i.type_desc, i.is_unique, i.is_primary_key
ORDER BY s.name, t.name, i.name;

-- ============================================================
-- PART 5: CHECK CONSTRAINTS
-- ============================================================
SELECT
    'CHECK_CONSTRAINTS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    cc.name as constraint_name,
    cc.definition as constraint_definition
FROM sys.check_constraints cc
INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
ORDER BY s.name, t.name, cc.name;

-- ============================================================
-- PART 6: UNIQUE CONSTRAINTS
-- ============================================================
SELECT
    'UNIQUE_CONSTRAINTS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    i.name as constraint_name,
    STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) as columns
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.is_unique = 1 AND i.is_primary_key = 0
GROUP BY s.name, t.name, i.name
ORDER BY s.name, t.name, i.name;

-- ============================================================
-- PART 7: TABLE DESCRIPTIONS
-- ============================================================
SELECT
    'TABLE_DESCRIPTIONS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    t.name as table_name,
    ep.value as table_description
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
LEFT JOIN sys.extended_properties ep
    ON ep.major_id = t.object_id
    AND ep.minor_id = 0
    AND ep.name = 'MS_Description'
ORDER BY s.name, t.name;

-- ============================================================
-- PART 8: STORED PROCEDURES (Names Only)
-- ============================================================
SELECT
    'STORED_PROCEDURES' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    p.name as procedure_name,
    p.create_date,
    p.modify_date
FROM sys.procedures p
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
ORDER BY s.name, p.name;

-- ============================================================
-- PART 9: VIEWS
-- ============================================================
SELECT
    'VIEWS' as extraction_type,
    DB_NAME() as database_name,
    s.name as schema_name,
    v.name as view_name,
    v.create_date,
    v.modify_date
FROM sys.views v
INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
ORDER BY s.name, v.name;

-- ============================================================
-- PART 10: DATABASE SUMMARY
-- ============================================================
SELECT
    'SUMMARY' as extraction_type,
    DB_NAME() as database_name,
    (SELECT COUNT(*) FROM sys.tables) as total_tables,
    (SELECT COUNT(*) FROM sys.columns c INNER JOIN sys.tables t ON c.object_id = t.object_id) as total_columns,
    (SELECT COUNT(*) FROM sys.foreign_keys) as total_foreign_keys,
    (SELECT COUNT(*) FROM sys.indexes WHERE is_primary_key = 0 AND name IS NOT NULL) as total_indexes,
    (SELECT COUNT(*) FROM sys.procedures) as total_procedures,
    (SELECT COUNT(*) FROM sys.views) as total_views;
