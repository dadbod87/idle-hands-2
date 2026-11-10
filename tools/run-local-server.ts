// Convenience launcher: the database URL is a documented local fixture, never a production credential.
process.env.IH2_SYNTHETIC_MODE='1';process.env.IH2_DATABASE_URL??='postgres://ih2:local-synthetic-only@127.0.0.1:55432/ih2_preview';await import('../server/index.ts');
