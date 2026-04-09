/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 *
 * Scheduled Script: Project P&L Data Builder
 * Runs the transaction search, builds JSON, saves to File Cabinet.
 * Schedule this to run every 15/30/60 mins or as needed.
 *
 * SETUP:
 *   1. Create a folder in File Cabinet called "Project PnL Data" (note the Folder ID)
 *   2. Set the FOLDER_ID constant below to that folder's internal ID
 *   3. Deploy as Scheduled Script with desired frequency
 */
define(['N/search', 'N/file', 'N/log', 'N/runtime'],
    (search, file, log, runtime) => {

        // ─── CONFIG: Set this to your File Cabinet folder ID ───
        const FOLDER_ID = 1234; // <-- CHANGE THIS to your folder internal ID
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
                    search.createColumn({ name: 'class' }),
                    search.createColumn({ name: 'department' }),
                    search.createColumn({ name: 'amount' }),
                    search.createColumn({ name: 'custcol_cv_project' }),
                    search.createColumn({ name: 'recordtype' }),
                    search.createColumn({ name: 'custbody_cv_project_mgr' }),
                    search.createColumn({ name: 'location' })
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
                        cn: r.getText('class') || '',
                        ci: r.getValue('class') || '',
                        dp: r.getText('department') || '',
                        am: r.getValue('amount') || 0,
                        pi: r.getValue('custcol_cv_project') || '',
                        pn: r.getText('custcol_cv_project') || '',
                        rt: r.getValue('recordtype') || 'transaction',
                        pm: r.getValue('custbody_cv_project_mgr') || ''
                    });
                });
            });

            return results;
        };

        /* ═══════ FILTER OPTIONS ═══════ */
        const loadAllFilterOptions = () => {
            const r = { projects: [], classes: [], projectManagers: [], jobTypes: [] };

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
                search.create({ type: 'classification', filters: [['isinactive', 'is', 'F']],
                    columns: [search.createColumn({ name: 'name', sort: search.Sort.ASC })]
                }).run().each(res => { r.classes.push({ id: res.id, name: res.getValue('name') }); return true; });
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
