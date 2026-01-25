# Dependencies

## Dependency tree
```sh
npm warn Expanding --prod to --production. This will stop working in the next major version of npm.
npm warn config production Use `--omit=dev` instead.
@decaf-ts/for-pouch@0.3.19 /home/tvenceslau/local-workspace/decaf-ts/for-pouch
├─┬ @decaf-ts/core@0.8.26
│ ├── @decaf-ts/db-decorators@0.8.16 deduped
│ ├── @decaf-ts/decoration@0.8.7 deduped
│ ├── @decaf-ts/decorator-validation@1.11.16 deduped
│ ├── @decaf-ts/injectable-decorators@1.9.10 deduped
│ └── @decaf-ts/transactional-decorators@0.3.5 deduped
├─┬ @decaf-ts/db-decorators@0.8.16
│ ├── @decaf-ts/decoration@0.8.7 deduped
│ ├── @decaf-ts/decorator-validation@1.11.16 deduped
│ ├── @decaf-ts/injectable-decorators@1.9.10 deduped
│ └── @decaf-ts/logging@0.10.8 deduped
├─┬ @decaf-ts/decoration@0.8.7
│ └── reflect-metadata@0.2.2
├─┬ @decaf-ts/decorator-validation@1.11.16
│ └── @decaf-ts/decoration@0.8.7 deduped
├─┬ @decaf-ts/for-couchdb@0.4.32
│ ├── @decaf-ts/core@0.8.26 deduped
│ ├── @decaf-ts/db-decorators@0.8.16 deduped
│ ├── @decaf-ts/decoration@0.8.7 deduped
│ ├── @decaf-ts/decorator-validation@1.11.16 deduped
│ ├── @decaf-ts/injectable-decorators@1.9.10 deduped
│ ├── @decaf-ts/logging@0.10.8 deduped
│ └── @decaf-ts/transactional-decorators@0.3.5 deduped
├─┬ @decaf-ts/injectable-decorators@1.9.10
│ └── @decaf-ts/decoration@0.8.7 deduped
├─┬ @decaf-ts/logging@0.10.8
│ ├─┬ pino@10.1.0
│ │ ├── @pinojs/redact@0.4.0
│ │ ├── atomic-sleep@1.0.0
│ │ ├── on-exit-leak-free@2.1.2
│ │ ├─┬ pino-abstract-transport@2.0.0
│ │ │ └── split2@4.2.0
│ │ ├── pino-std-serializers@7.0.0
│ │ ├── process-warning@5.0.0
│ │ ├── quick-format-unescaped@4.0.4
│ │ ├── real-require@0.2.0
│ │ ├── safe-stable-stringify@2.5.0
│ │ ├─┬ sonic-boom@4.2.0
│ │ │ └── atomic-sleep@1.0.0 deduped
│ │ └─┬ thread-stream@3.1.0
│ │   └── real-require@0.2.0 deduped
│ ├── styled-string-builder@1.5.1
│ ├── typed-object-accumulator@0.1.5
│ └─┬ winston@3.18.3
│   ├── @colors/colors@1.6.0
│   ├─┬ @dabh/diagnostics@2.0.8
│   │ ├─┬ @so-ric/colorspace@1.1.6
│   │ │ ├─┬ color@5.0.3
│   │ │ │ ├─┬ color-convert@3.1.3
│   │ │ │ │ └── color-name@2.1.0
│   │ │ │ └─┬ color-string@2.1.4
│   │ │ │   └── color-name@2.1.0
│   │ │ └── text-hex@1.0.0
│   │ ├── enabled@2.0.0
│   │ └── kuler@2.0.0
│   ├── async@3.2.6
│   ├── is-stream@2.0.1
│   ├─┬ logform@2.7.0
│   │ ├── @colors/colors@1.6.0 deduped
│   │ ├── @types/triple-beam@1.3.5
│   │ ├── fecha@4.2.3
│   │ ├── ms@2.1.3
│   │ ├── safe-stable-stringify@2.5.0 deduped
│   │ └── triple-beam@1.4.1 deduped
│   ├─┬ one-time@1.0.0
│   │ └── fn.name@1.1.0
│   ├─┬ readable-stream@3.6.2
│   │ ├── inherits@2.0.4 deduped
│   │ ├─┬ string_decoder@1.3.0
│   │ │ └── safe-buffer@5.2.1
│   │ └── util-deprecate@1.0.2
│   ├── safe-stable-stringify@2.5.0 deduped
│   ├── stack-trace@0.0.10
│   ├── triple-beam@1.4.1
│   └─┬ winston-transport@4.9.0
│     ├── logform@2.7.0 deduped
│     ├── readable-stream@3.6.2 deduped
│     └── triple-beam@1.4.1 deduped
├─┬ @decaf-ts/transactional-decorators@0.3.5
│ ├── @decaf-ts/db-decorators@0.8.16 deduped
│ ├── @decaf-ts/decoration@0.8.7 deduped
│ ├── @decaf-ts/decorator-validation@1.11.16 deduped
│ └── @decaf-ts/injectable-decorators@1.9.10 deduped
├─┬ pouchdb-adapter-http@9.0.0
│ ├── pouchdb-binary-utils@9.0.0
│ ├── pouchdb-errors@9.0.0
│ ├─┬ pouchdb-fetch@9.0.0
│ │ ├─┬ fetch-cookie@2.2.0
│ │ │ ├── set-cookie-parser@2.7.1
│ │ │ └─┬ tough-cookie@4.1.4
│ │ │   ├─┬ psl@1.15.0
│ │ │   │ └── punycode@2.3.1 deduped
│ │ │   ├── punycode@2.3.1
│ │ │   ├── universalify@0.2.0
│ │ │   └─┬ url-parse@1.5.10
│ │ │     ├── querystringify@2.2.0
│ │ │     └── requires-port@1.0.0
│ │ └─┬ node-fetch@2.6.9
│ │   ├── UNMET OPTIONAL DEPENDENCY encoding@^0.1.0
│ │   └─┬ whatwg-url@5.0.0
│ │     ├── tr46@0.0.3
│ │     └── webidl-conversions@3.0.1
│ └─┬ pouchdb-utils@9.0.0
│   ├── pouchdb-errors@9.0.0 deduped
│   ├── pouchdb-md5@9.0.0 deduped
│   └── uuid@8.3.2 deduped
├─┬ pouchdb-adapter-idb@9.0.0
│ ├─┬ pouchdb-adapter-utils@9.0.0
│ │ ├── pouchdb-binary-utils@9.0.0 deduped
│ │ ├── pouchdb-errors@9.0.0 deduped
│ │ ├── pouchdb-md5@9.0.0 deduped
│ │ ├── pouchdb-merge@9.0.0 deduped
│ │ └── pouchdb-utils@9.0.0 deduped
│ ├── pouchdb-binary-utils@9.0.0 deduped
│ ├── pouchdb-errors@9.0.0 deduped
│ ├─┬ pouchdb-json@9.0.0
│ │ └── vuvuzela@1.0.3
│ ├─┬ pouchdb-merge@9.0.0
│ │ └── pouchdb-utils@9.0.0 deduped
│ └── pouchdb-utils@9.0.0 deduped
├─┬ pouchdb-adapter-leveldb@9.0.0
│ ├─┬ level-write-stream@1.0.0
│ │ └─┬ end-stream@0.1.0
│ │   └─┬ write-stream@0.4.3
│ │     └── readable-stream@0.0.4
│ ├─┬ level@6.0.1
│ │ ├─┬ level-js@5.0.2
│ │ │ ├─┬ abstract-leveldown@6.2.3
│ │ │ │ ├── buffer@5.7.1 deduped
│ │ │ │ ├── immediate@3.3.0 deduped
│ │ │ │ ├── level-concat-iterator@2.0.1
│ │ │ │ ├── level-supports@1.0.1 deduped
│ │ │ │ └── xtend@4.0.2 deduped
│ │ │ ├─┬ buffer@5.7.1
│ │ │ │ ├── base64-js@1.5.1
│ │ │ │ └── ieee754@1.2.1
│ │ │ ├── inherits@2.0.4 deduped
│ │ │ └── ltgt@2.2.1 deduped
│ │ ├─┬ level-packager@5.1.1
│ │ │ ├─┬ encoding-down@6.3.0
│ │ │ │ ├── abstract-leveldown@6.2.3 deduped
│ │ │ │ ├── inherits@2.0.4 deduped
│ │ │ │ ├── level-codec@9.0.2 deduped
│ │ │ │ └── level-errors@2.0.1 deduped
│ │ │ └─┬ levelup@4.4.0 deduped
│ │ └─┬ leveldown@5.6.0
│ │   ├── abstract-leveldown@6.2.3 deduped
│ │   ├── napi-macros@2.0.0 deduped
│ │   └── node-gyp-build@4.1.1
│ ├─┬ leveldown@6.1.1
│ │ ├─┬ abstract-leveldown@7.2.0
│ │ │ ├─┬ buffer@6.0.3
│ │ │ │ ├── base64-js@1.5.1 deduped
│ │ │ │ └── ieee754@1.2.1 deduped
│ │ │ ├── catering@2.1.1
│ │ │ ├── is-buffer@2.0.5
│ │ │ ├─┬ level-concat-iterator@3.1.0
│ │ │ │ └── catering@2.1.1 deduped
│ │ │ ├── level-supports@2.1.0
│ │ │ └── queue-microtask@1.2.3
│ │ ├─┬ napi-macros@2.0.0
│ │ └── node-gyp-build@4.8.4
│ ├─┬ pouchdb-adapter-leveldb-core@9.0.0
│ │ ├── double-ended-queue@2.1.0-0
│ │ ├─┬ levelup@4.4.0
│ │ │ ├─┬ deferred-leveldown@5.3.0
│ │ │ │ ├── abstract-leveldown@6.2.3 deduped
│ │ │ │ └── inherits@2.0.4 deduped
│ │ │ ├─┬ level-errors@2.0.1
│ │ │ │ └─┬ errno@0.1.8
│ │ │ │   └── prr@1.0.1
│ │ │ ├─┬ level-iterator-stream@4.0.2
│ │ │ │ ├── inherits@2.0.4 deduped
│ │ │ │ ├── readable-stream@3.6.2 deduped
│ │ │ │ └── xtend@4.0.2 deduped
│ │ │ ├─┬ level-supports@1.0.1
│ │ │ │ └── xtend@4.0.2 deduped
│ │ │ └── xtend@4.0.2
│ │ ├── pouchdb-adapter-utils@9.0.0 deduped
│ │ ├── pouchdb-binary-utils@9.0.0 deduped
│ │ ├── pouchdb-core@9.0.0 deduped
│ │ ├── pouchdb-errors@9.0.0 deduped
│ │ ├── pouchdb-json@9.0.0 deduped
│ │ ├── pouchdb-md5@9.0.0 deduped
│ │ ├── pouchdb-merge@9.0.0 deduped
│ │ ├── pouchdb-utils@9.0.0 deduped
│ │ ├─┬ sublevel-pouchdb@9.0.0
│ │ │ ├─┬ level-codec@9.0.2
│ │ │ │ └── buffer@5.7.1 deduped
│ │ │ ├── ltgt@2.2.1 deduped
│ │ │ └─┬ readable-stream@1.1.14
│ │ │   ├── core-util-is@1.0.3
│ │ │   ├── inherits@2.0.4 deduped
│ │ │   ├── isarray@0.0.1
│ │ │   └── string_decoder@0.10.31
│ │ └── through2@3.0.2 deduped
│ ├── pouchdb-merge@9.0.0 deduped
│ └─┬ through2@3.0.2
│   ├── inherits@2.0.4
│   └── readable-stream@3.6.2 deduped
├─┬ pouchdb-adapter-localstorage@9.0.0
│ ├─┬ localstorage-down@0.6.7
│ │ ├─┬ abstract-leveldown@0.12.3
│ │ │ └── xtend@3.0.0
│ │ ├── argsarray@0.0.1
│ │ ├── buffer-from@0.1.2
│ │ ├── d64@1.0.0
│ │ ├─┬ humble-localstorage@1.4.2
│ │ │ ├── has-localstorage@1.0.1
│ │ │ └── localstorage-memory@1.0.3
│ │ ├── inherits@2.0.4 deduped
│ │ └── tiny-queue@0.2.0
│ └── pouchdb-adapter-leveldb-core@9.0.0 deduped
├─┬ pouchdb-adapter-memory@9.0.0
│ ├─┬ memdown@1.4.1
│ │ ├─┬ abstract-leveldown@2.7.2
│ │ │ └── xtend@4.0.2 deduped
│ │ ├── functional-red-black-tree@1.0.1
│ │ ├── immediate@3.3.0
│ │ ├── inherits@2.0.4 deduped
│ │ ├── ltgt@2.2.1
│ │ └── safe-buffer@5.1.2
│ └── pouchdb-adapter-leveldb-core@9.0.0 deduped
├─┬ pouchdb-adapter-websql@7.0.0
│ ├─┬ pouchdb-adapter-websql-core@7.0.0
│ │ ├─┬ pouchdb-adapter-utils@7.0.0
│ │ │ ├── pouchdb-binary-utils@7.0.0 deduped
│ │ │ ├── pouchdb-collections@7.0.0 deduped
│ │ │ ├── pouchdb-errors@7.0.0 deduped
│ │ │ ├─┬ pouchdb-md5@7.0.0
│ │ │ │ ├── pouchdb-binary-utils@7.0.0 deduped
│ │ │ │ └── spark-md5@3.0.0
│ │ │ ├── pouchdb-merge@7.0.0 deduped
│ │ │ └── pouchdb-utils@7.0.0 deduped
│ │ ├─┬ pouchdb-binary-utils@7.0.0
│ │ │ └── buffer-from@1.1.0
│ │ ├── pouchdb-collections@7.0.0
│ │ ├─┬ pouchdb-errors@7.0.0
│ │ │ └── inherits@2.0.3
│ │ ├─┬ pouchdb-json@7.0.0
│ │ │ └── vuvuzela@1.0.3 deduped
│ │ ├─┬ pouchdb-merge@7.0.0
│ │ │ └── pouchdb-utils@7.0.0 deduped
│ │ └─┬ pouchdb-utils@7.0.0
│ │   ├── argsarray@0.0.1 deduped
│ │   ├── clone-buffer@1.0.0 deduped
│ │   ├── immediate@3.0.6
│ │   ├── inherits@2.0.3 deduped
│ │   ├── pouchdb-collections@7.0.0 deduped
│ │   ├─┬ pouchdb-errors@7.0.0
│ │   │ └── inherits@2.0.3 deduped
│ │   ├─┬ pouchdb-md5@7.0.0
│ │   │ ├─┬ pouchdb-binary-utils@7.0.0
│ │   │ │ └── buffer-from@1.1.0
│ │   │ └── spark-md5@3.0.0
│ │   └── uuid@3.2.1
├─┬ pouchdb-core@9.0.0
│ ├─┬ pouchdb-changes-filter@9.0.0
│ │ ├── pouchdb-errors@9.0.0 deduped
│ │ ├── pouchdb-selector-core@9.0.0 deduped
│ │ └── pouchdb-utils@9.0.0 deduped
│ ├── pouchdb-errors@9.0.0 deduped
│ ├── pouchdb-fetch@9.0.0 deduped
│ ├── pouchdb-merge@9.0.0 deduped
│ ├── pouchdb-utils@9.0.0 deduped
│ └── uuid@8.3.2
├─┬ pouchdb-find@9.0.0
│ ├─┬ pouchdb-abstract-mapreduce@9.0.0
│ │ ├── pouchdb-binary-utils@9.0.0 deduped
│ │ ├── pouchdb-collate@9.0.0 deduped
│ │ ├── pouchdb-errors@9.0.0 deduped
│ │ ├── pouchdb-fetch@9.0.0 deduped
│ │ ├── pouchdb-mapreduce-utils@9.0.0 deduped
│ │ ├── pouchdb-md5@9.0.0 deduped
│ │ └── pouchdb-utils@9.0.0 deduped
│ ├── pouchdb-collate@9.0.0
│ ├── pouchdb-errors@9.0.0 deduped
│ ├── pouchdb-fetch@9.0.0 deduped
│ ├─┬ pouchdb-md5@9.0.0
│ │ ├── pouchdb-binary-utils@9.0.0 deduped
│ │ └── spark-md5@3.0.2
│ ├─┬ pouchdb-selector-core@9.0.0
│ │ ├── pouchdb-collate@9.0.0 deduped
│ │ └── pouchdb-utils@9.0.0 deduped
│ └── pouchdb-utils@9.0.0 deduped
├─┬ pouchdb-mapreduce@9.0.0
│ ├── pouchdb-abstract-mapreduce@9.0.0 deduped
│ ├─┬ pouchdb-mapreduce-utils@9.0.0
│ │ └── pouchdb-utils@9.0.0 deduped
│ └── pouchdb-utils@9.0.0 deduped
└─┬ pouchdb-replication@9.0.0
  ├─┬ pouchdb-checkpointer@9.0.0
  │ ├── pouchdb-collate@9.0.0 deduped
  │ └── pouchdb-utils@9.0.0 deduped
  ├── pouchdb-errors@9.0.0 deduped
  ├─┬ pouchdb-generate-replication-id@9.0.0
  │ ├── pouchdb-collate@9.0.0 deduped
  │ └── pouchdb-md5@9.0.0 deduped
  └── pouchdb-utils@9.0.0 deduped
```
## Audit report
```sh
npm audit --production
npm warn config production Use `--omit=dev` instead.
found 0 vulnerabilities
```
