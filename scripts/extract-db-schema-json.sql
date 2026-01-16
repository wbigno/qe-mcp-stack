-- ============================================================
-- Database Schema Extraction - JSON Output
-- Run this in Azure Data Studio and save the single result
-- ============================================================

SELECT (
    SELECT
        DB_NAME() as database_name,
        GETDATE() as extracted_at,

        -- Tables with columns
        (
            SELECT
                s.name as [schema],
                t.name as name,
                (
                    SELECT
                        c.name as name,
                        c.column_id as ordinal,
                        ty.name as dataType,
                        c.max_length as maxLength,
                        c.precision,
                        c.scale,
                        c.is_nullable as nullable,
                        c.is_identity as isIdentity,
                        OBJECT_DEFINITION(c.default_object_id) as defaultValue,
                        ep.value as description
                    FROM sys.columns c
                    INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
                    LEFT JOIN sys.extended_properties ep
                        ON ep.major_id = t.object_id
                        AND ep.minor_id = c.column_id
                        AND ep.name = 'MS_Description'
                    WHERE c.object_id = t.object_id
                    ORDER BY c.column_id
                    FOR JSON PATH
                ) as columns,

                -- Primary key for this table
                (
                    SELECT
                        i.name as constraintName,
                        (
                            SELECT c.name
                            FROM sys.index_columns ic
                            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
                            ORDER BY ic.key_ordinal
                            FOR JSON PATH
                        ) as columns
                    FROM sys.indexes i
                    WHERE i.object_id = t.object_id AND i.is_primary_key = 1
                    FOR JSON PATH
                ) as primaryKey,

                -- Foreign keys from this table
                (
                    SELECT
                        fk.name as constraintName,
                        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as columnName,
                        OBJECT_SCHEMA_NAME(fkc.referenced_object_id) as referencedSchema,
                        OBJECT_NAME(fkc.referenced_object_id) as referencedTable,
                        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as referencedColumn,
                        fk.delete_referential_action_desc as onDelete,
                        fk.update_referential_action_desc as onUpdate
                    FROM sys.foreign_keys fk
                    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                    WHERE fk.parent_object_id = t.object_id
                    FOR JSON PATH
                ) as foreignKeys,

                -- Indexes on this table
                (
                    SELECT
                        i.name as name,
                        i.type_desc as type,
                        i.is_unique as isUnique,
                        (
                            SELECT c.name
                            FROM sys.index_columns ic
                            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
                            ORDER BY ic.key_ordinal
                            FOR JSON PATH
                        ) as columns
                    FROM sys.indexes i
                    WHERE i.object_id = t.object_id
                        AND i.is_primary_key = 0
                        AND i.name IS NOT NULL
                    FOR JSON PATH
                ) as indexes

            FROM sys.tables t
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            ORDER BY s.name, t.name
            FOR JSON PATH
        ) as tables,

        -- All relationships (for diagram generation)
        (
            SELECT
                OBJECT_SCHEMA_NAME(fk.parent_object_id) + '.' + OBJECT_NAME(fk.parent_object_id) as fromTable,
                COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as fromColumn,
                OBJECT_SCHEMA_NAME(fkc.referenced_object_id) + '.' + OBJECT_NAME(fkc.referenced_object_id) as toTable,
                COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as toColumn,
                fk.name as constraintName
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            FOR JSON PATH
        ) as relationships,

        -- Summary stats
        (
            SELECT
                (SELECT COUNT(*) FROM sys.tables) as tables,
                (SELECT COUNT(*) FROM sys.columns c INNER JOIN sys.tables t ON c.object_id = t.object_id) as columns,
                (SELECT COUNT(*) FROM sys.foreign_keys) as foreignKeys,
                (SELECT COUNT(*) FROM sys.indexes WHERE is_primary_key = 0 AND name IS NOT NULL) as indexes,
                (SELECT COUNT(*) FROM sys.procedures) as storedProcedures,
                (SELECT COUNT(*) FROM sys.views) as [views]
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as summary

    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
) as schema_json;
