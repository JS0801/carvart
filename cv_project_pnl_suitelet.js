/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/file', 'N/log', 'N/runtime'],
    (search, file, log, runtime) => {

        const FOLDER_ID = 13983;
        const MAX_FILE_BYTES = 9 * 1024 * 1024;
        const MEMO_MAX_LEN = 100;
        const GEN_FILE = 'pnl_gen.json';

        const execute = (context) => {
            const t0 = Date.now();
            log.audit('PnL Builder', 'Starting...');

            try {
                // Step 1: Read current generation
                const currentGen = readCurrentGen();
                const newGen = currentGen + 1;
                log.audit('PnL Builder', 'Current gen: ' + currentGen + ' → Building gen: ' + newGen);

                // Step 2: Run search
                const raw = loadAllTransactions();
                log.audit('PnL Builder', 'Loaded ' + raw.length + ' transactions');

                // Step 3: Group and sum by Document + Type + Project
                const grouped = groupTransactions(raw);
                log.audit('PnL Builder', 'Grouped into ' + grouped.length + ' transactions');

                // Step 4: Compress + load filters
                const compressed = compressData(grouped);
                const filterOptions = loadAllFilterOptions();

                // Step 5: Write ALL new generation files
                const meta = {
                    v: 3,
                    gen: newGen,
                    generatedAt: new Date().toISOString(),
                    count: grouped.length,
                    dict: compressed.dict,
                    filterOptions: filterOptions,
                    chunks: 0
                };

                const chunks = chunkArray(compressed.rows);
                meta.chunks = chunks.length;

                const metaStr = JSON.stringify(meta);
                saveFile('pnl_v' + newGen + '_meta.json', metaStr);
                log.debug('PnL Builder', 'Saved pnl_v' + newGen + '_meta.json (' + (metaStr.length / 1024).toFixed(0) + ' KB)');

                for (let i = 0; i < chunks.length; i++) {
                    const chunkStr = JSON.stringify(chunks[i]);
                    saveFile('pnl_v' + newGen + '_chunk_' + i + '.json', chunkStr);
                    log.debug('PnL Builder', 'Saved pnl_v' + newGen + '_chunk_' + i + '.json (' + chunks[i].length + ' rows, ' + (chunkStr.length / 1024).toFixed(0) + ' KB)');
                }

                // Step 6: Swap pointer only after all files are saved
                writeGenPointer(newGen);
                log.audit('PnL Builder', 'Pointer updated to gen ' + newGen);

                // Step 7: Delete old generation files
                if (currentGen > 0) {
                    deleteGenFiles(currentGen);
                    log.audit('PnL Builder', 'Deleted old gen ' + currentGen + ' files');
                }

                const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
                log.audit(
                    'PnL Builder',
                    'SUCCESS | Gen ' + newGen + ' | ' + grouped.length + ' grouped txns | ' +
                    chunks.length + ' chunk(s) | ' + elapsed + 's'
                );

            } catch (e) {
                log.error('PnL Builder', 'FAILED: ' + e.message + '\n' + e.stack);
            }
        };

        /* ══════════════════════════════
           GENERATION POINTER
           ══════════════════════════════ */
        const readCurrentGen = () => {
            try {
                const results = findFiles(GEN_FILE);
                if (results.length > 0) {
                    const f = file.load({ id: results[0].id });
                    const data = JSON.parse(f.getContents());
                    return data.gen || 0;
                }
            } catch (e) {
                log.debug('PnL Builder', 'No gen file found, starting at 0');
            }
            return 0;
        };

        const writeGenPointer = (gen) => {
            const existing = findFiles(GEN_FILE);
            existing.forEach(f => {
                try {
                    file.delete({ id: f.id });
                } catch (e) {}
            });

            const f = file.create({
                name: GEN_FILE,
                fileType: file.Type.JSON,
                contents: JSON.stringify({
                    gen: gen,
                    updatedAt: new Date().toISOString()
                }),
                folder: FOLDER_ID,
                isOnline: false
            });
            f.save();
        };

        /* ══════════════════════════════
           DELETE OLD GEN FILES
           ══════════════════════════════ */
        const deleteGenFiles = (gen) => {
            const prefix = 'pnl_v' + gen + '_';

            try {
                search.create({
                    type: 'file',
                    filters: [
                        ['folder', 'anyof', FOLDER_ID], 'AND',
                        ['name', 'startswith', prefix]
                    ],
                    columns: ['internalid', 'name']
                }).run().each(result => {
                    try {
                        file.delete({ id: result.id });
                        log.debug('PnL Builder', 'Deleted: ' + result.getValue('name'));
                    } catch (e) {
                        log.debug('PnL Builder', 'Could not delete ' + result.getValue('name') + ': ' + e.message);
                    }
                    return true;
                });
            } catch (e) {
                log.debug('PnL Builder', 'Delete gen ' + gen + ' error: ' + e.message);
            }

            if (gen > 1) {
                cleanupOrphans(gen);
            }
        };

        const cleanupOrphans = (currentGen) => {
            try {
                search.create({
                    type: 'file',
                    filters: [
                        ['folder', 'anyof', FOLDER_ID], 'AND',
                        ['name', 'startswith', 'pnl_v']
                    ],
                    columns: ['internalid', 'name']
                }).run().each(result => {
                    const name = result.getValue('name');
                    const match = name.match(/^pnl_v(\d+)_/);

                    if (match) {
                        const fileGen = parseInt(match[1], 10);
                        if (fileGen < currentGen) {
                            try {
                                file.delete({ id: result.id });
                                log.debug('PnL Builder', 'Orphan cleanup: ' + name);
                            } catch (e) {}
                        }
                    }
                    return true;
                });
            } catch (e) {}
        };

        /* ══════════════════════════════
           FILE HELPERS
           ══════════════════════════════ */
        const findFiles = (name) => {
            const results = [];
            try {
                search.create({
                    type: 'file',
                    filters: [
                        ['name', 'is', name], 'AND',
                        ['folder', 'anyof', FOLDER_ID]
                    ],
                    columns: ['internalid', 'name']
                }).run().each(result => {
                    results.push({
                        id: result.id,
                        name: result.getValue('name')
                    });
                    return true;
                });
            } catch (e) {}
            return results;
        };

        const saveFile = (name, contents) => {
            const f = file.create({
                name: name,
                fileType: file.Type.JSON,
                contents: contents,
                folder: FOLDER_ID,
                isOnline: false
            });
            f.save();
        };

        /* ══════════════════════════════
           GROUP AND SUM
           Document + Type + Project
           ══════════════════════════════ */
        const groupTransactions = (raw) => {
            const grouped = {};
            const output = [];
            let i, key, row;

            for (i = 0; i < raw.length; i++) {
                row = raw[i];

                key =
                    (row.ti || '') + '|' +
                    (row.tp || '') + '|' +
                    (row.pi || '');

                if (!grouped[key]) {
                    grouped[key] = {
                        id: row.id,
                        ti: row.ti || '',
                        dt: row.dt || '',
                        tp: row.tp || '',
                        en: row.en || '',
                        me: row.me || '',
                        ac: row.ac || '',
                        at: row.at || '',
                        cn: row.cn || '',
                        ci: row.ci || '',
                        am: parseFloat(row.am) || 0,
                        pi: row.pi || '',
                        pn: row.pn || '',
                        rt: row.rt || 'transaction',
                        pm: row.pm || ''
                    };
                } else {
                    grouped[key].am += parseFloat(row.am) || 0;
                }
            }

            for (key in grouped) {
                output.push(grouped[key]);
            }

            return output;
        };

        /* ══════════════════════════════
           DICTIONARY COMPRESSION
           ══════════════════════════════ */
        const compressData = (raw) => {
            const dicts = { P:{}, E:{}, A:{}, AT:{}, C:{}, D:{}, T:{}, RT:{} };
            const arrays = { P:[], E:[], A:[], AT:[], C:[], D:[], T:[], RT:[] };

            const getIdx = (k, val) => {
                if (!val && val !== 0) return -1;

                const s = String(val);
                if (dicts[k][s] !== undefined) return dicts[k][s];

                const idx = arrays[k].length;
                dicts[k][s] = idx;
                arrays[k].push(s);
                return idx;
            };

            const rows = raw.map(r => [
                r.id,
                r.ti,
                r.dt,
                getIdx('T', r.tp),
                getIdx('E', r.en),
                r.me ? String(r.me).substring(0, MEMO_MAX_LEN) : '',
                getIdx('A', r.ac),
                getIdx('AT', r.at),
                getIdx('C', r.cn),
                r.ci,
                r.am,
                r.pi,
                getIdx('P', r.pn),
                getIdx('RT', r.rt),
                r.pm
            ]);

            return {
                dict: arrays,
                rows: rows
            };
        };

        /* ══════════════════════════════
           CHUNK ROWS
           ══════════════════════════════ */
        const chunkArray = (rows) => {
            const fullStr = JSON.stringify(rows);

            if (fullStr.length <= MAX_FILE_BYTES) {
                return [rows];
            }

            const bytesPerRow = fullStr.length / rows.length;
            const rowsPerChunk = Math.floor((MAX_FILE_BYTES / bytesPerRow) * 0.85);
            const chunks = [];

            for (let i = 0; i < rows.length; i += rowsPerChunk) {
                chunks.push(rows.slice(i, i + rowsPerChunk));
            }

            return chunks;
        };

        /* ══════════════════════════════
           LOAD ALL TRANSACTIONS
           Uses HEADER MEMO via memomain
           ══════════════════════════════ */
        const loadAllTransactions = () => {
            const results = [];

            const s = search.create({
                type: 'transaction',
                filters: [
                    ['posting', 'is', 'T'], 'AND',
                    ['accounttype', 'noneof', 'OthCurrAsset', 'FixedAsset', 'OthAsset', 'OthCurrLiab'], 'AND',
                    ['class', 'anyof', '1', '2'], 'AND',
                    ['custcol_cv_project', 'noneof', '@NONE@']
                ],
                columns: [
                    search.createColumn({ name: 'tranid' }),
                    search.createColumn({ name: 'trandate', sort: search.Sort.DESC }),
                    search.createColumn({ name: 'type' }),
                    search.createColumn({ name: 'mainname' }),
                    search.createColumn({ name: 'memomain' }), // header memo
                    search.createColumn({ name: 'account' }),
                    search.createColumn({ name: 'accounttype' }),
                    search.createColumn({ name: 'class' }),
                    search.createColumn({ name: 'amount' }),
                    search.createColumn({ name: 'custcol_cv_project' }),
                    search.createColumn({ name: 'recordtype' }),
                    search.createColumn({ name: 'custbody_cv_projectmgrso' }),
                    search.createColumn({ name: 'location' })
                ]
            });

            const paged = s.runPaged({ pageSize: 1000 });

            paged.pageRanges.forEach(pr => {
                if (runtime.getCurrentScript().getRemainingUsage() < 200) {
                    log.audit('PnL Builder', 'Low governance, stopping at ' + results.length);
                    return;
                }

                paged.fetch({ index: pr.index }).data.forEach(r => {
                    results.push({
                        id: r.id,
                        ti: r.getValue('tranid') || '',
                        dt: r.getValue('trandate') || '',
                        tp: r.getText('type') || '',
                        en: r.getText('mainname') || '',
                        me: r.getValue('memomain') || '',
                        ac: r.getText('account') || '',
                        at: r.getText('accounttype') || '',
                        cn: r.getText('class') || '',
                        ci: r.getValue('class') || '',
                        am: parseFloat(r.getValue('amount')) || 0,
                        pi: r.getValue('custcol_cv_project') || '',
                        pn: r.getText('custcol_cv_project') || '',
                        rt: r.getValue('recordtype') || 'transaction',
                        pm: r.getValue('custbody_cv_projectmgrso') || ''
                    });
                });
            });

            return results;
        };

        /* ═══════ FILTER OPTIONS ═══════ */
        const loadAllFilterOptions = () => {
            const r = {
                projects: [],
                classes: [],
                projectManagers: [],
                jobTypes: []
            };

            try {
                search.create({
                    type: 'customrecord_cv_project',
                    filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => {
                    r.projects.push({
                        id: res.id,
                        name: res.getValue('name')
                    });
                    return true;
                });
            } catch (e) {
                try {
                    search.create({
                        type: 'job',
                        filters: [['isinactive', 'is', 'F']],
                        columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                    }).run().each(res => {
                        r.projects.push({
                            id: res.id,
                            name: res.getValue('entityid')
                        });
                        return true;
                    });
                } catch (e2) {}
            }

            try {
                search.create({
                    type: 'classification',
                    filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => {
                    r.classes.push({
                        id: res.id,
                        name: res.getValue('name')
                    });
                    return true;
                });
            } catch (e) {}

            try {
                search.create({
                    type: 'employee',
                    filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                }).run().each(res => {
                    r.projectManagers.push({
                        id: res.id,
                        name: res.getValue('entityid')
                    });
                    return true;
                });
            } catch (e) {}

            try {
                search.create({
                    type: 'customlist_cv_company',
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => {
                    r.jobTypes.push({
                        id: res.id,
                        name: res.getValue('name')
                    });
                    return true;
                });
            } catch (e) {}

            return r;
        };

        return { execute };
    });