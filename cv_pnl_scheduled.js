/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/file', 'N/log', 'N/runtime'],
    (search, file, log, runtime) => {

        
        const FOLDER_ID = 13983;
        const FILE_NAME = 'pnl_data.json';

        const execute = (context) => {
            log.audit('PnL Data Builder', 'Starting data build...');
            const startTime = Date.now();

            try {
                // Step 1: Load all transactions
                const transactions = loadAllTransactions();
                log.audit('PnL Data Builder', 'Loaded ' + transactions.length + ' transactions');

                // Step 2: Load filter options
                const filterOptions = loadAllFilterOptions();

                // Step 3: Build the JSON payload
                const payload = JSON.stringify({
                    generatedAt: new Date().toISOString(),
                    transactionCount: transactions.length,
                    transactions: transactions,
                    filterOptions: filterOptions
                });

                // Step 4: Check if file already exists → delete it
                try {
                    const existingSearch = search.create({
                        type: 'file',
                        filters: [
                            ['name', 'is', FILE_NAME], 'AND',
                            ['folder', 'anyof', FOLDER_ID]
                        ],
                        columns: ['internalid']
                    });
                    existingSearch.run().each(result => {
                        file.delete({ id: result.id });
                        log.debug('PnL Data Builder', 'Deleted old file ID: ' + result.id);
                        return true;
                    });
                } catch (e) {
                    log.debug('PnL Data Builder', 'No existing file to delete: ' + e.message);
                }

                // Step 5: Create new file
                const jsonFile = file.create({
                    name: FILE_NAME,
                    fileType: file.Type.JSON,
                    contents: payload,
                    folder: FOLDER_ID,
                    isOnline: false
                });

                const fileId = jsonFile.save();
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                log.audit('PnL Data Builder',
                    'SUCCESS — File ID: ' + fileId +
                    ' | Transactions: ' + transactions.length +
                    ' | Size: ' + (payload.length / 1024).toFixed(0) + ' KB' +
                    ' | Time: ' + elapsed + 's'
                );

            } catch (e) {
                log.error('PnL Data Builder', 'FAILED: ' + e.message + '\n' + e.stack);
            }
        };

        /* ══════════════════════════════════════════════════════
           LOAD ALL TRANSACTIONS — line-level with all details
           ══════════════════════════════════════════════════════ */
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
                    search.createColumn({ name: 'entity' }),
                    search.createColumn({ name: 'memo' }),
                    search.createColumn({ name: 'account' }),
                    search.createColumn({ name: 'accounttype' }),
                    search.createColumn({ name: 'classnohierarchy' }),
                    search.createColumn({ name: 'amount' }),
                    search.createColumn({ name: 'custcol_cv_project' }),
                    search.createColumn({ name: 'recordtype' }),
                    search.createColumn({ name: 'custbody_cv_projectmgrso' }),
                    search.createColumn({ name: 'locationnohierarchy' })
                ]
            });

            const paged = s.runPaged({ pageSize: 1000 });
            paged.pageRanges.forEach(pr => {
                // Check governance
                const remaining = runtime.getCurrentScript().getRemainingUsage();
                if (remaining < 200) {
                    log.audit('PnL Data Builder', 'Low governance (' + remaining + '), stopping at ' + results.length + ' results');
                    return;
                }

                paged.fetch({ index: pr.index }).data.forEach(r => {
                    results.push({
                        id: r.id,
                        ti: r.getValue('tranid') || '',
                        dt: r.getValue('trandate') || '',
                        tp: r.getText('type') || '',
                        en: r.getText('entity') || '',
                        me: r.getValue('memo') || '',
                        ac: r.getText('account') || '',
                        at: r.getText('accounttype') || '',
                        cn: r.getText('classnohierarchy') || '',
                        ci: r.getValue('classnohierarchy') || '',
                        am: r.getValue('amount') || 0,
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
            const r = { projects: [], classnohierarchyes: [], projectManagers: [], jobTypes: [] };

            try {
                search.create({ type: 'customrecord_cv_project', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.projects.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) {
                try {
                    search.create({ type: 'job', filters: [['isinactive', 'is', 'F']],
                        columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                    }).run().each(res => { r.projects.push({ id: res.id, name: res.getValue('entityid') }); return true; });
                } catch (e2) { log.debug('proj', e2); }
            }

            try {
                search.create({ type: 'classnohierarchyification', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.classnohierarchyes.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) { log.debug('cls', e); }

            try {
                search.create({ type: 'employee', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'entityid', sort: search.Sort.ASC })]
                }).run().each(res => { r.projectManagers.push({ id: res.id, name: res.getValue('entityid') }); return true; });
            } catch (e) { log.debug('pm', e); }

            try {
                search.create({ type: 'customlist_job_type',
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.jobTypes.push({ id: res.id, name: res.getValue('name') }); return true; });
            } catch (e) { log.debug('jt', e); }

            return r;
        };

        return { execute };
    });
