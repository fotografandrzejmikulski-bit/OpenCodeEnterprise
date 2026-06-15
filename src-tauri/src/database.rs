use rusqlite::{Connection as SqliteConnection, Result as SqliteResult};
use duckdb::{Connection as DuckDbConnection, Result as DuckDbResult};
use std::path::Path;

pub struct DatabaseManager {
    sqlcipher_conn: SqliteConnection,
    duckdb_conn: DuckDbConnection,
}

impl DatabaseManager {
    pub fn new<P: AsRef<Path>>(sqlite_path: P, duckdb_path: P, encryption_key: &str) -> Result<Self, Box<dyn std::error::Error>> {
        // Inicjalizacja SQLCipher (rusqlite z włączonymi opcjami szyfrowania)
        let sqlcipher_conn = SqliteConnection::open(sqlite_path)?;
        
        // Wymuszenie klucza szyfrowania dla SQLCipher
        sqlcipher_conn.pragma_update(None, "key", encryption_key)?;
        
        // Optymalizacje wydajnościowe i WAL (Write-Ahead Logging)
        sqlcipher_conn.pragma_update(None, "journal_mode", "WAL")?;
        sqlcipher_conn.pragma_update(None, "synchronous", "NORMAL")?;
        
        // Utworzenie przykładowej tabeli dla agentów
        sqlcipher_conn.execute(
            "CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                knowledge BLOB NOT NULL
            )",
            [],
        )?;

        // Inicjalizacja DuckDB dla analityki i Local RAG (Vector Similarity Search)
        let duckdb_conn = DuckDbConnection::open(duckdb_path)?;
        
        // Zezwól na instalację i ładowanie niepodpisanych rozszerzeń (dla VSS, jeśli potrzebne)
        duckdb_conn.execute("SET custom_extension_repository='vss.duckdb.org';", [])?;
        duckdb_conn.execute("INSTALL vss;", []).unwrap_or_else(|e| { println!("Info: Instalacja vss zignorowana (może być już wbudowana): {}", e); 0 });
        duckdb_conn.execute("LOAD vss;", []).unwrap_or_else(|e| { println!("Info: Błąd ładowania vss: {}", e); 0 });
        
        duckdb_conn.execute(
            "CREATE TABLE IF NOT EXISTS agent_analytics (
                task_id VARCHAR,
                execution_time_ms INTEGER,
                tokens_used INTEGER
            )",
            [],
        )?;

        // Tabela wektorowa dla Local RAG
        // Reprezentuje embedding wektorowy kontekstu, ułatwiając Retrieval-Augmented Generation
        duckdb_conn.execute(
            "CREATE TABLE IF NOT EXISTS memory_vectors (
                context_id VARCHAR,
                content TEXT,
                embedding FLOAT[1536]
            )",
            [],
        ).unwrap_or_else(|e| { println!("Info: Typ wektorowy FLOAT[] wymaga vss: {}", e); 0 });

        Ok(DatabaseManager {
            sqlcipher_conn,
            duckdb_conn,
        })
    }

    pub fn insert_analytics(&self, task_id: &str, exec_time: i32, tokens: i32) -> DuckDbResult<usize> {
        self.duckdb_conn.execute(
            "INSERT INTO agent_analytics (task_id, execution_time_ms, tokens_used) VALUES (?, ?, ?)",
            [task_id, &exec_time.to_string(), &tokens.to_string()],
        )
    }

    pub fn search_similar_context(&self, embedding_str: &str, limit: i32) -> DuckDbResult<Vec<String>> {
        // Wyszukiwanie wektorowe HNSW Euclidean / Cosine (wymaga extension VSS)
        // Ze względu na parametryzację wektorów, tworzymy surowe query lub parsowanie.
        let query = format!(
            "SELECT content FROM memory_vectors ORDER BY array_distance(embedding, {}::FLOAT[1536]) ASC LIMIT {}",
            embedding_str, limit
        );
        let mut stmt = self.duckdb_conn.prepare(&query)?;
        
        let context_iter = stmt.query_map([], |row| {
            row.get(0)
        })?;

        let mut results = Vec::new();
        for ctx in context_iter {
            results.push(ctx.unwrap());
        }
        Ok(results)
    }
}
