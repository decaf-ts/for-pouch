![Banner](./workdocs/assets/decaf-logo.svg)

# decaf-ts / for-pouch

## Purpose at a Glance
A PouchDB-backed adapter and repository integration for the decaf-ts ecosystem. It provides a Repository implementation powered by PouchDB/CouchDB features (Mango queries, indexes, bulk ops, and relations), along with configuration types and constants to wire models to a PouchDB database (local or remote) using decorators.

This package targets the current PouchDB 9.x plugin line. The only exception is `pouchdb-adapter-websql`, which remains on its separate 7.x plugin track because WebSQL was split out of the default PouchDB distribution.

> Release docs refreshed on 2025-11-26. See [workdocs/reports/RELEASE_NOTES.md](./workdocs/reports/RELEASE_NOTES.md) for ticket summaries.
